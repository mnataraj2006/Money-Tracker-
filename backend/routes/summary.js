const express = require('express');
const router = express.Router();
const { User, Transaction, DailyClosing, CashCount } = require('../db_mongo');
const { authenticateToken } = require('../middleware/auth');
const { autoClosePastDays } = require('./cash');

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

// DASHBOARD SUMMARY
router.get('/dashboard', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const today = req.query.date || new Date().toISOString().split('T')[0];

  try {
    const user = await User.findOne({ id: userId }).select('id fullName email');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const todayTxs = await Transaction.find({ userId, date: today });

    let todayIncome = 0;
    let todayExpense = 0;
    let todayCashIncome = 0;
    let todayCashExpense = 0;

    todayTxs.forEach(r => {
      if (r.type === 'INCOME') {
        todayIncome += r.amount;
        if (r.paymentMethod === 'CASH') todayCashIncome += r.amount;
      } else if (r.type === 'EXPENSE') {
        todayExpense += r.amount;
        if (r.paymentMethod === 'CASH') todayCashExpense += r.amount;
      }
    });

    const todayBalance = todayIncome - todayExpense;

    const previousDayCash = await getPreviousClosingCash(userId, today);
    const expectedCash = previousDayCash + todayCashIncome - todayCashExpense;

    const recentTransactions = await Transaction.find({ userId, date: today }).sort({ createdAt: -1 }).limit(5);

    return res.json({
      user,
      today,
      todayIncome,
      todayExpense,
      todayBalance,
      todayCashIncome,
      todayCashExpense,
      previousDayCash,
      expectedCash,
      recentTransactions
    });
  } catch (err) {
    console.error('Error loading dashboard summary:', err);
    return res.status(500).json({ error: 'Failed to load dashboard summary' });
  }
});

// DAILY HISTORY LIST
router.get('/history', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const month = req.query.month || new Date().toISOString().substring(0, 7);

  try {
    await autoClosePastDays(userId);
    const monthRegex = new RegExp(`^${month}`);
    const monthTxs = await Transaction.find({ userId, date: monthRegex }).sort({ date: -1, createdAt: -1 });
    const closingRows = await DailyClosing.find({ userId, date: monthRegex });
    const countRows = await CashCount.find({ userId, date: monthRegex }).sort({ createdAt: -1 });

    const datesMap = {};

    monthTxs.forEach(r => {
      if (!datesMap[r.date]) {
        datesMap[r.date] = {
          date: r.date,
          income: 0,
          expense: 0,
          cashIncome: 0,
          cashExpense: 0,
          status: 'TALLIED',
          cash: 0,
          openingCash: 0,
          expectedCash: 0,
          physicalCash: null,
          difference: 0,
          transactions: []
        };
      }
      datesMap[r.date].transactions.push({
        id: r.id,
        type: r.type,
        amount: r.amount,
        category: r.category,
        paymentMethod: r.paymentMethod,
        description: r.description
      });

      if (r.type === 'INCOME') {
        datesMap[r.date].income += r.amount;
        if (r.paymentMethod === 'CASH') datesMap[r.date].cashIncome += r.amount;
      }
      if (r.type === 'EXPENSE') {
        datesMap[r.date].expense += r.amount;
        if (r.paymentMethod === 'CASH') datesMap[r.date].cashExpense += r.amount;
      }
    });

    closingRows.forEach(c => {
      if (!datesMap[c.date]) {
        datesMap[c.date] = {
          date: c.date,
          income: 0,
          expense: 0,
          cashIncome: c.cashIncome || 0,
          cashExpense: c.cashExpense || 0,
          status: c.status,
          cash: c.physicalCash,
          openingCash: c.openingCash || 0,
          expectedCash: c.expectedClosingCash || 0,
          physicalCash: c.physicalCash,
          difference: c.difference || 0,
          transactions: []
        };
      } else {
        datesMap[c.date].status = c.status;
        datesMap[c.date].cash = c.physicalCash;
        datesMap[c.date].openingCash = c.openingCash || datesMap[c.date].openingCash;
        datesMap[c.date].expectedCash = c.expectedClosingCash || datesMap[c.date].expectedCash;
        datesMap[c.date].physicalCash = c.physicalCash;
        datesMap[c.date].difference = c.difference || 0;
      }
    });

    countRows.forEach(cnt => {
      if (!datesMap[cnt.date]) {
        datesMap[cnt.date] = {
          date: cnt.date,
          income: 0,
          expense: 0,
          cashIncome: 0,
          cashExpense: 0,
          status: 'TALLIED',
          cash: cnt.physicalCash,
          openingCash: 0,
          expectedCash: cnt.physicalCash,
          physicalCash: cnt.physicalCash,
          difference: 0,
          transactions: []
        };
      } else {
        if (!datesMap[cnt.date].cash || datesMap[cnt.date].cash === 0) {
          datesMap[cnt.date].cash = cnt.physicalCash;
        }
        if (datesMap[cnt.date].physicalCash === null || datesMap[cnt.date].physicalCash === undefined) {
          datesMap[cnt.date].physicalCash = cnt.physicalCash;
        }
      }
    });

    for (let d of Object.keys(datesMap)) {
      const item = datesMap[d];
      item.net = item.income - item.expense;
      if (!item.openingCash) {
        item.openingCash = await getPreviousClosingCash(userId, item.date);
      }
      if (!item.expectedCash) {
        item.expectedCash = item.openingCash + item.cashIncome - item.cashExpense;
      }
      if (item.physicalCash === null || item.physicalCash === undefined) {
        item.physicalCash = item.cash || item.expectedCash;
      }
      item.difference = item.physicalCash - item.expectedCash;
      if (item.difference === 0) item.status = 'TALLIED';
      else if (item.difference < 0) item.status = 'SHORT';
      else if (item.difference > 0) item.status = 'EXTRA';
    }

    const dailyHistory = Object.values(datesMap).sort((a, b) => b.date.localeCompare(a.date));
    return res.json({ month, history: dailyHistory });
  } catch (err) {
    console.error('Error fetching history:', err);
    return res.status(500).json({ error: 'Database error fetching history' });
  }
});

// MONTHLY SUMMARY
router.get('/monthly-summary', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const month = req.query.month || new Date().toISOString().substring(0, 7);

  try {
    const monthRegex = new RegExp(`^${month}`);
    const rows = await Transaction.find({ userId, date: monthRegex });

    let totalIncome = 0;
    let totalExpenses = 0;
    let cashIncome = 0;
    let cashExpenses = 0;
    const expenseByCategory = {};

    rows.forEach(r => {
      if (r.type === 'INCOME') {
        totalIncome += r.amount;
        if (r.paymentMethod === 'CASH') cashIncome += r.amount;
      } else if (r.type === 'EXPENSE') {
        totalExpenses += r.amount;
        if (r.paymentMethod === 'CASH') cashExpenses += r.amount;

        if (!expenseByCategory[r.category]) {
          expenseByCategory[r.category] = 0;
        }
        expenseByCategory[r.category] += r.amount;
      }
    });

    const netBalance = totalIncome - totalExpenses;
    const totalFlow = totalIncome + totalExpenses;
    const incomePercent = totalFlow > 0 ? Math.round((totalIncome / totalFlow) * 100) : 50;
    const expensePercent = totalFlow > 0 ? 100 - incomePercent : 50;

    const categoryBreakdown = Object.keys(expenseByCategory).map(cat => {
      const amount = expenseByCategory[cat];
      const percentage = totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0;
      return { category: cat, amount, percentage };
    }).sort((a, b) => b.amount - a.amount);

    return res.json({
      month,
      totalIncome,
      totalExpenses,
      netBalance,
      cashIncome,
      cashExpenses,
      incomePercent,
      expensePercent,
      categoryBreakdown,
      topExpenseCategory: categoryBreakdown.length > 0 ? categoryBreakdown[0].category : 'None'
    });
  } catch (err) {
    console.error('Error generating monthly summary:', err);
    return res.status(500).json({ error: 'Failed to generate monthly summary' });
  }
});

module.exports = router;
