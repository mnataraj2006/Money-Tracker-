const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { Transaction, CashCount, DailyClosing } = require('../db_mongo');
const { authenticateToken } = require('../middleware/auth');
const CashCalculationService = require('../services/cashCalculationService');

// Helper to get previous day closing cash
async function getPreviousClosingCash(userId, targetDate) {
  return await CashCalculationService.getPreviousClosingCash(userId, targetDate);
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
        const cashTxs = await Transaction.find({
          userId,
          date: d,
          $or: [
            { paymentMethod: 'CASH', type: { $in: ['INCOME', 'EXPENSE'] } },
            { type: 'CASH_WITHDRAWAL' }
          ]
        });

        let cashIncome = 0;
        let cashExpense = 0;
        let cashWithdrawal = 0;

        cashTxs.forEach(t => {
          if (t.type === 'INCOME') cashIncome += t.amount;
          if (t.type === 'EXPENSE') cashExpense += t.amount;
          if (t.type === 'CASH_WITHDRAWAL') cashWithdrawal += t.amount;
        });

        const expectedClosingCash = openingCash + cashIncome - cashExpense + cashWithdrawal;
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
          cashWithdrawal,
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

// GET EXPECTED CASH AND TODAY'S CASH SUMMARY — OPTIMIZED FAST READ
router.get('/expected', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const targetDate = req.query.date || new Date().toISOString().split('T')[0];

  try {
    const cashData = await CashCalculationService.getExpectedCash(userId, targetDate);
    return res.json(cashData);
  } catch (err) {
    console.error('Error fetching cash calculation:', err);
    return res.status(500).json({ error: 'Failed to compute cash logic' });
  }
});

async function recalculateDailyClosingsFrom(userId, startDate) {
  await CashCalculationService.recalculateDailyClosingsFrom(userId, startDate);
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
    const cashData = await CashCalculationService.getExpectedCash(userId, targetDate);
    const expectedCash = cashData.expectedCash;
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
    const cashData = await CashCalculationService.getExpectedCash(userId, targetDate);
    const openingCash = cashData.previousDayCash;
    const cashIncome = cashData.todayCashIncome;
    const cashExpense = cashData.todayCashExpense;
    const cashWithdrawal = cashData.todayCashWithdrawal || 0;
    const expectedClosingCash = cashData.expectedCash;

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
        cashWithdrawal,
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
        cashWithdrawal,
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
