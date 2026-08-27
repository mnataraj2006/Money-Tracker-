const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { Transaction, CashCount, DailyClosing } = require('../db_mongo');
const { authenticateToken } = require('../middleware/auth');

// Helper to get previous day closing cash
async function getPreviousClosingCash(userId, targetDate) {
  try {
    // 1. Look for latest closed day STRICTLY BEFORE targetDate
    const prevClosing = await DailyClosing.findOne({
      userId,
      date: { $lt: targetDate },
      isClosed: true
    }).sort({ date: -1 });

    if (prevClosing) {
      return prevClosing.physicalCash !== undefined && prevClosing.physicalCash !== null
        ? prevClosing.physicalCash
        : prevClosing.expectedClosingCash;
    }

    // 2. Look for latest cash count STRICTLY BEFORE targetDate
    const latestCount = await CashCount.findOne({
      userId,
      date: { $lt: targetDate }
    }).sort({ date: -1, createdAt: -1 });

    if (latestCount) return latestCount.physicalCash;

    return 0;
  } catch (err) {
    return 0;
  }
}

// Auto-close past unclosed days at midnight
async function autoClosePastDays(userId) {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const txDates = await Transaction.distinct('date', { userId, date: { $lt: todayStr } });
    const countDates = await CashCount.distinct('date', { userId, date: { $lt: todayStr } });
    const allPastDates = Array.from(new Set([...txDates, ...countDates])).sort();
    
    if (allPastDates.length === 0) return;

    const existingClosed = await DailyClosing.distinct('date', { userId, date: { $lt: todayStr }, isClosed: true });
    const closedSet = new Set(existingClosed);
    const unclosedDates = allPastDates.filter(d => !closedSet.has(d));

    if (unclosedDates.length === 0) return;

    for (let d of unclosedDates) {
      let closing = await DailyClosing.findOne({ userId, date: d });
      if (!closing) {
        const openingCash = await getPreviousClosingCash(userId, d);
        const cashTxs = await Transaction.find({ userId, date: d, paymentMethod: 'CASH' });
        let cashIncome = 0;
        let cashExpense = 0;
        cashTxs.forEach(t => {
          if (t.type === 'INCOME') cashIncome += t.amount;
          if (t.type === 'EXPENSE') cashExpense += t.amount;
        });
        const expectedClosingCash = openingCash + cashIncome - cashExpense;
        const countRow = await CashCount.findOne({ userId, date: d }).sort({ createdAt: -1 });
        const physicalCash = countRow ? countRow.physicalCash : expectedClosingCash;
        const difference = physicalCash - expectedClosingCash;
        let status = 'TALLIED';
        if (difference < 0) status = 'SHORT';
        if (difference > 0) status = 'EXTRA';

        await DailyClosing.create({
          userId,
          date: d,
          openingCash,
          cashIncome,
          cashExpense,
          expectedClosingCash,
          physicalCash,
          difference,
          status,
          isClosed: true,
          closedAt: new Date(`${d}T23:59:59.999Z`)
        });
      }
    }
  } catch (err) {
    console.error('Error auto-closing past days:', err);
  }
}

// GET EXPECTED CASH AND TODAY'S CASH SUMMARY
router.get('/expected', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const targetDate = req.query.date || new Date().toISOString().split('T')[0];

  try {
    await autoClosePastDays(userId);
    const previousDayCash = await getPreviousClosingCash(userId, targetDate);

    // Sum today's cash income and cash expense strictly where paymentMethod = 'CASH'
    const cashTxs = await Transaction.find({
      userId,
      date: targetDate,
      paymentMethod: 'CASH'
    });

    let todayCashIncome = 0;
    let todayCashExpense = 0;

    cashTxs.forEach(t => {
      if (t.type === 'INCOME') todayCashIncome += t.amount;
      if (t.type === 'EXPENSE') todayCashExpense += t.amount;
    });

    const expectedCash = previousDayCash + todayCashIncome - todayCashExpense;

    const countRow = await CashCount.findOne({ userId, date: targetDate }).sort({ createdAt: -1 });
    const closingRow = await DailyClosing.findOne({ userId, date: targetDate });

    let physicalCash = countRow ? countRow.physicalCash : (closingRow ? closingRow.physicalCash : null);
    let difference = physicalCash !== null ? physicalCash - expectedCash : null;
    let status = 'UNCHECKED';

    if (physicalCash !== null) {
      if (difference === 0) status = 'TALLIED';
      else if (difference < 0) status = 'SHORT';
      else status = 'EXTRA';
    }

    return res.json({
      date: targetDate,
      previousDayCash,
      todayCashIncome,
      todayCashExpense,
      expectedCash,
      physicalCash,
      difference,
      status,
      isClosed: closingRow ? closingRow.isClosed : false,
      lastCheckDate: countRow ? countRow.createdAt : null,
      counts: countRow || null
    });
  } catch (err) {
    console.error('Error fetching cash calculation:', err);
    return res.status(500).json({ error: 'Failed to compute cash logic' });
  }
});

async function recalculateDailyClosingsFrom(userId, startDate) {
  try {
    await autoClosePastDays(userId);

    const affectedClosings = await DailyClosing.find({
      userId,
      date: { $gte: startDate }
    }).sort({ date: 1 });

    for (let closing of affectedClosings) {
      const openingCash = await getPreviousClosingCash(userId, closing.date);
      const cashTxs = await Transaction.find({
        userId,
        date: closing.date,
        paymentMethod: 'CASH'
      });

      let cashIncome = 0;
      let cashExpense = 0;
      cashTxs.forEach(t => {
        if (t.type === 'INCOME') cashIncome += t.amount;
        if (t.type === 'EXPENSE') cashExpense += t.amount;
      });

      const expectedClosingCash = openingCash + cashIncome - cashExpense;
      const countRow = await CashCount.findOne({ userId, date: closing.date }).sort({ createdAt: -1 });
      const physicalCash = countRow ? countRow.physicalCash : expectedClosingCash;
      const difference = physicalCash - expectedClosingCash;

      let status = 'TALLIED';
      if (difference < 0) status = 'SHORT';
      if (difference > 0) status = 'EXTRA';

      closing.openingCash = openingCash;
      closing.cashIncome = cashIncome;
      closing.cashExpense = cashExpense;
      closing.expectedClosingCash = expectedClosingCash;
      closing.physicalCash = physicalCash;
      closing.difference = difference;
      closing.status = status;
      await closing.save();
    }
  } catch (err) {
    console.error('Error recalculating daily closings:', err);
  }
}

// SAVE DENOMINATION COUNT
router.post('/count', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { date, n500, n200, n100, n50, n20, n10, n5, n2, n1 } = req.body;

  const targetDate = date || new Date().toISOString().split('T')[0];

  const q500 = parseInt(n500) || 0;
  const q200 = parseInt(n200) || 0;
  const q100 = parseInt(n100) || 0;
  const q50 = parseInt(n50) || 0;
  const q20 = parseInt(n20) || 0;
  const q10 = parseInt(n10) || 0;
  const q5 = parseInt(n5) || 0;
  const q2 = parseInt(n2) || 0;
  const q1 = parseInt(n1) || 0;

  const physicalCash = (q500 * 500) + (q200 * 200) + (q100 * 100) + (q50 * 50) + (q20 * 20) + (q10 * 10) + (q5 * 5) + (q2 * 2) + (q1 * 1);

  try {
    const previousDayCash = await getPreviousClosingCash(userId, targetDate);

    const cashTxs = await Transaction.find({ userId, date: targetDate, paymentMethod: 'CASH' });
    let todayCashIncome = 0;
    let todayCashExpense = 0;
    cashTxs.forEach(t => {
      if (t.type === 'INCOME') todayCashIncome += t.amount;
      if (t.type === 'EXPENSE') todayCashExpense += t.amount;
    });

    const expectedCash = previousDayCash + todayCashIncome - todayCashExpense;
    const difference = physicalCash - expectedCash;
    let status = 'TALLIED';
    if (difference < 0) status = 'SHORT';
    if (difference > 0) status = 'EXTRA';

    const countId = crypto.randomUUID();

    const newCount = new CashCount({
      id: countId,
      userId,
      date: targetDate,
      n500: q500,
      n200: q200,
      n100: q100,
      n50: q50,
      n20: q20,
      n10: q10,
      n5: q5,
      n2: q2,
      n1: q1,
      physicalCash
    });

    await newCount.save();
    await recalculateDailyClosingsFrom(userId, targetDate);

    return res.json({
      message: 'Cash count saved',
      reconciliation: {
        date: targetDate,
        expectedCash,
        physicalCash,
        difference,
        status,
        counts: { n500: q500, n200: q200, n100: q100, n50: q50, n20: q20, n10: q10, n5: q5, n2: q2, n1: q1 }
      }
    });
  } catch (err) {
    console.error('Error saving count:', err);
    return res.status(500).json({ error: 'Failed to save denomination count' });
  }
});

// CLOSE DAY
router.post('/close-day', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const targetDate = req.body.date || new Date().toISOString().split('T')[0];

  try {
    const openingCash = await getPreviousClosingCash(userId, targetDate);

    const cashTxs = await Transaction.find({ userId, date: targetDate, paymentMethod: 'CASH' });
    let cashIncome = 0;
    let cashExpense = 0;
    cashTxs.forEach(t => {
      if (t.type === 'INCOME') cashIncome += t.amount;
      if (t.type === 'EXPENSE') cashExpense += t.amount;
    });

    const expectedClosingCash = openingCash + cashIncome - cashExpense;

    const countRow = await CashCount.findOne({ userId, date: targetDate }).sort({ createdAt: -1 });
    const physicalCash = countRow ? countRow.physicalCash : expectedClosingCash;
    const difference = physicalCash - expectedClosingCash;
    let status = 'TALLIED';
    if (difference < 0) status = 'SHORT';
    if (difference > 0) status = 'EXTRA';

    const closeId = crypto.randomUUID();

    const closing = await DailyClosing.findOneAndUpdate(
      { userId, date: targetDate },
      {
        id: closeId,
        userId,
        date: targetDate,
        openingCash,
        cashIncome,
        cashExpense,
        expectedClosingCash,
        physicalCash,
        difference,
        status,
        isClosed: true,
        createdAt: new Date()
      },
      { upsert: true, new: true }
    );

    await recalculateDailyClosingsFrom(userId, targetDate);

    return res.json({
      message: `Day ${targetDate} closed successfully`,
      closing: {
        date: targetDate,
        openingCash,
        cashIncome,
        cashExpense,
        expectedClosingCash,
        physicalCash,
        difference,
        status
      }
    });
  } catch (err) {
    console.error('Error closing day:', err);
    return res.status(500).json({ error: 'Failed to perform daily closing' });
  }
});

module.exports = {
  router,
  recalculateDailyClosingsFrom,
  autoClosePastDays
};
