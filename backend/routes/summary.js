const express = require('express');
const router = express.Router();
const { User, Transaction, DailyClosing, CashCount } = require('../db_mongo');
const { authenticateToken } = require('../middleware/auth');
const CashCalculationService = require('../services/cashCalculationService');
const BankAccountService = require('../services/bankAccountService');

// 1. DASHBOARD SUMMARY — OPTIMIZED WITH MONGODB AGGREGATION & CASH SERVICE
router.get('/dashboard', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const today = req.query.date || new Date().toISOString().split('T')[0];

  try {
    const [user, cashData, todayAgg, recentTransactions, bankAccounts] = await Promise.all([
      User.findOne({ id: userId }).select('id fullName email profileImage').lean(),
      CashCalculationService.getExpectedCash(userId, today),
      Transaction.aggregate([
        { $match: { userId, date: today } },
        {
          $group: {
            _id: '$type',
            total: { $sum: '$amount' }
          }
        }
      ]),
      Transaction.find({ userId, date: today })
        .sort({ createdAt: -1 })
        .select('id type amount name transactionName category paymentMethod accountId description date createdAt')
        .lean(),
      BankAccountService.getAllAccountsSummary(userId)
    ]);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let todayIncome = 0;
    let todayExpense = 0;

    todayAgg.forEach(item => {
      if (item._id === 'INCOME') todayIncome = item.total;
      if (item._id === 'EXPENSE') todayExpense = item.total;
    });

    const todayBalance = todayIncome - todayExpense;

    return res.json({
      user,
      today,
      todayIncome,
      todayExpense,
      todayBalance,
      todayCashIncome: cashData.todayCashIncome,
      todayCashExpense: cashData.todayCashExpense,
      todayCashWithdrawal: cashData.todayCashWithdrawal || 0,
      previousDayCash: cashData.previousDayCash,
      expectedCash: cashData.expectedCash,
      physicalCash: cashData.physicalCash,
      difference: cashData.difference,
      status: cashData.status,
      hasCounted: cashData.hasCounted,
      counts: cashData.counts,
      isClosed: cashData.isClosed,
      bankAccounts: bankAccounts || [],
      recentTransactions
    });
  } catch (err) {
    console.error('Error loading dashboard summary:', err);
    return res.status(500).json({ error: 'Failed to load dashboard summary' });
  }
});

// 2. DAILY HISTORY LIST — LIGHTWEIGHT DAILY SUMMARIES ONLY
router.get('/history', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const month = req.query.month || new Date().toISOString().substring(0, 7);

  try {
    const monthPrefix = `${month}-`;
    const monthRegex = new RegExp(`^${month}`);

    // Parallel MongoDB queries with lean() and projection
    const [monthTxsAgg, closingRows, countRows, prevClosingDoc] = await Promise.all([
      Transaction.aggregate([
        { $match: { userId, date: monthRegex } },
        {
          $group: {
            _id: { date: '$date', type: '$type', paymentMethod: '$paymentMethod' },
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]),
      DailyClosing.find({ userId, date: monthRegex }).lean(),
      CashCount.find({ userId, date: monthRegex }).sort({ createdAt: -1 }).lean(),
      DailyClosing.findOne({ userId, date: { $lt: monthPrefix }, isClosed: true }).sort({ date: -1 }).lean()
    ]);

    let defaultOpeningCash = 0;
    if (prevClosingDoc) {
      defaultOpeningCash = prevClosingDoc.physicalCash !== undefined && prevClosingDoc.physicalCash !== null
        ? prevClosingDoc.physicalCash
        : prevClosingDoc.expectedClosingCash;
    } else {
      const prevCountDoc = await CashCount.findOne({ userId, date: { $lt: monthPrefix } }).sort({ date: -1, createdAt: -1 }).lean();
      if (prevCountDoc) defaultOpeningCash = prevCountDoc.physicalCash;
    }

    const datesMap = {};

    monthTxsAgg.forEach(item => {
      const date = item._id.date;
      const type = item._id.type;
      const paymentMethod = item._id.paymentMethod;
      const amount = item.totalAmount;

      if (!datesMap[date]) {
        datesMap[date] = {
          date,
          income: 0,
          expense: 0,
          cashIncome: 0,
          cashExpense: 0,
          cashWithdrawal: 0,
          status: 'TALLIED',
          openingCash: 0,
          expectedCash: 0,
          physicalCash: null,
          difference: 0,
          txCount: 0
        };
      }

      datesMap[date].txCount += item.count;
      if (type === 'INCOME') {
        datesMap[date].income += amount;
        if (paymentMethod === 'CASH') datesMap[date].cashIncome += amount;
      }
      if (type === 'EXPENSE') {
        datesMap[date].expense += amount;
        if (paymentMethod === 'CASH') datesMap[date].cashExpense += amount;
      }
      if (type === 'CASH_WITHDRAWAL') {
        datesMap[date].cashWithdrawal = (datesMap[date].cashWithdrawal || 0) + amount;
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
          cashWithdrawal: c.cashWithdrawal || 0,
          status: c.status,
          openingCash: c.openingCash || 0,
          expectedCash: c.expectedClosingCash || 0,
          physicalCash: c.physicalCash,
          difference: c.difference || 0,
          txCount: 0
        };
      } else {
        datesMap[c.date].status = c.status;
        datesMap[c.date].openingCash = c.openingCash || datesMap[c.date].openingCash;
        datesMap[c.date].expectedCash = c.expectedClosingCash || datesMap[c.date].expectedCash;
        datesMap[c.date].cashWithdrawal = c.cashWithdrawal || datesMap[c.date].cashWithdrawal || 0;
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
          cashWithdrawal: 0,
          status: 'TALLIED',
          openingCash: 0,
          expectedCash: cnt.physicalCash,
          physicalCash: cnt.physicalCash,
          difference: 0,
          txCount: 0
        };
      } else if (datesMap[cnt.date].physicalCash === null || datesMap[cnt.date].physicalCash === undefined) {
        datesMap[cnt.date].physicalCash = cnt.physicalCash;
      }
    });

    const sortedDates = Object.keys(datesMap).sort();
    let currentOpening = defaultOpeningCash;

    for (let d of sortedDates) {
      const item = datesMap[d];
      item.net = item.income - item.expense;
      if (!item.openingCash) {
        item.openingCash = currentOpening;
      }
      if (!item.expectedCash) {
        item.expectedCash = item.openingCash + item.cashIncome - item.cashExpense + (item.cashWithdrawal || 0);
      }
      if (item.physicalCash === null || item.physicalCash === undefined) {
        item.physicalCash = item.expectedCash;
      }
      item.difference = item.physicalCash - item.expectedCash;
      if (item.difference === 0) item.status = 'TALLIED';
      else if (item.difference < 0) item.status = 'SHORT';
      else if (item.difference > 0) item.status = 'EXTRA';

      currentOpening = item.physicalCash;
    }

    const dailyHistory = Object.values(datesMap).sort((a, b) => b.date.localeCompare(a.date));
    return res.json({ month, history: dailyHistory });
  } catch (err) {
    console.error('Error fetching history list:', err);
    return res.status(500).json({ error: 'Database error fetching history' });
  }
});

// 3. DEDICATED DAILY DETAILS ENDPOINT — FETCH TRANSACTIONS FOR SPECIFIC DATE ONLY
router.get('/daily-details', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const targetDate = req.query.date || new Date().toISOString().split('T')[0];

  try {
    const [cashData, dateTxs, countRow, closingRow, bankAccounts] = await Promise.all([
      CashCalculationService.getExpectedCash(userId, targetDate),
      Transaction.find({ userId, date: targetDate })
        .sort({ createdAt: -1 })
        .select('id type amount name transactionName category paymentMethod accountId description date createdAt')
        .lean(),
      CashCount.findOne({ userId, date: targetDate }).sort({ createdAt: -1 }).lean(),
      DailyClosing.findOne({ userId, date: targetDate }).lean(),
      BankAccountService.getAllAccountsSummary(userId)
    ]);

    const bankMap = {};
    (bankAccounts || []).forEach(b => { bankMap[b.id] = b.name; });

    const enrichedTransactions = dateTxs.map(tx => ({
      ...tx,
      transactionName: (tx.transactionName && tx.transactionName.trim())
        ? tx.transactionName.trim()
        : ((tx.name && tx.name.trim()) ? tx.name.trim() : (tx.type === 'CASH_WITHDRAWAL' ? 'Cash Withdrawal' : 'Unnamed Transaction')),
      accountName: tx.accountId && tx.accountId !== 'CASH' ? (bankMap[tx.accountId] || 'Bank') : (tx.paymentMethod === 'CASH' ? 'Cash' : '')
    }));

    let dayIncome = 0;
    let dayExpense = 0;

    enrichedTransactions.forEach(t => {
      if (t.type === 'INCOME') dayIncome += t.amount;
      if (t.type === 'EXPENSE') dayExpense += t.amount;
    });

    return res.json({
      date: targetDate,
      income: dayIncome,
      expense: dayExpense,
      net: dayIncome - dayExpense,
      openingCash: cashData.previousDayCash,
      cashIncome: cashData.todayCashIncome,
      cashExpense: cashData.todayCashExpense,
      cashWithdrawal: cashData.todayCashWithdrawal || 0,
      expectedCash: cashData.expectedCash,
      physicalCash: cashData.physicalCash,
      difference: cashData.difference,
      status: cashData.status,
      isClosed: cashData.isClosed,
      counts: countRow || null,
      closingRow: closingRow || null,
      bankAccounts: bankAccounts || [],
      transactions: enrichedTransactions
    });
  } catch (err) {
    console.error('Error fetching daily details:', err);
    return res.status(500).json({ error: 'Failed to fetch daily details' });
  }
});

// 4. MONTHLY SUMMARY — MONGODB AGGREGATION PIPELINE
router.get('/monthly-summary', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const month = req.query.month || new Date().toISOString().substring(0, 7);

  try {
    const monthRegex = new RegExp(`^${month}`);

    // Single aggregation pipeline for totals and category breakdown
    const [totalsAgg, categoriesAgg] = await Promise.all([
      Transaction.aggregate([
        { $match: { userId, date: monthRegex } },
        {
          $group: {
            _id: null,
            totalIncome: {
              $sum: { $cond: [{ $eq: ['$type', 'INCOME'] }, '$amount', 0] }
            },
            totalExpenses: {
              $sum: { $cond: [{ $eq: ['$type', 'EXPENSE'] }, '$amount', 0] }
            },
            cashIncome: {
              $sum: {
                $cond: [
                  { $and: [{ $eq: ['$type', 'INCOME'] }, { $eq: ['$paymentMethod', 'CASH'] }] },
                  '$amount',
                  0
                ]
              }
            },
            cashExpenses: {
              $sum: {
                $cond: [
                  { $and: [{ $eq: ['$type', 'EXPENSE'] }, { $eq: ['$paymentMethod', 'CASH'] }] },
                  '$amount',
                  0
                ]
              }
            }
          }
        }
      ]),
      Transaction.aggregate([
        { $match: { userId, date: monthRegex, type: 'EXPENSE' } },
        {
          $group: {
            _id: {
              $cond: [
                { $gt: [{ $strLenCP: { $ifNull: ['$transactionName', ''] } }, 0] },
                '$transactionName',
                { $ifNull: ['$name', 'Expense'] }
              ]
            },
            amount: { $sum: '$amount' }
          }
        },
        { $sort: { amount: -1 } },
        { $limit: 10 }
      ])
    ]);

    const totals = totalsAgg.length > 0 ? totalsAgg[0] : { totalIncome: 0, totalExpenses: 0, cashIncome: 0, cashExpenses: 0 };
    const totalIncome = totals.totalIncome;
    const totalExpenses = totals.totalExpenses;
    const cashIncome = totals.cashIncome;
    const cashExpenses = totals.cashExpenses;

    const netBalance = totalIncome - totalExpenses;
    const totalFlow = totalIncome + totalExpenses;
    const incomePercent = totalFlow > 0 ? Math.round((totalIncome / totalFlow) * 100) : 50;
    const expensePercent = totalFlow > 0 ? 100 - incomePercent : 50;

    const expenseBreakdown = categoriesAgg.map(cat => ({
      name: cat._id || 'Expense',
      category: cat._id || 'Expense',
      amount: cat.amount,
      percentage: totalExpenses > 0 ? Math.round((cat.amount / totalExpenses) * 100) : 0
    }));

    return res.json({
      month,
      totalIncome,
      totalExpenses,
      netBalance,
      cashIncome,
      cashExpenses,
      incomePercent,
      expensePercent,
      expenseBreakdown,
      categoryBreakdown: expenseBreakdown,
      topExpenseItem: expenseBreakdown.length > 0 ? expenseBreakdown[0].name : 'None',
      topExpenseCategory: expenseBreakdown.length > 0 ? expenseBreakdown[0].name : 'None'
    });
  } catch (err) {
    console.error('Error generating monthly summary:', err);
    return res.status(500).json({ error: 'Failed to generate monthly summary' });
  }
});

// 5. DATE RANGE MULTI-DAY SUMMARY & DETAILED REPORT ENDPOINT
router.get('/range-report', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const fromDate = req.query.from || req.query.fromDate;
  const toDate = req.query.to || req.query.toDate || fromDate;

  if (!fromDate) {
    return res.status(400).json({ error: 'from date query parameter is required (YYYY-MM-DD)' });
  }

  try {
    const [rangeTxs, closingRows, countRows, bankAccounts] = await Promise.all([
      Transaction.find({
        userId,
        date: { $gte: fromDate, $lte: toDate }
      })
        .sort({ date: 1, createdAt: 1 })
        .select('id type amount name transactionName category paymentMethod accountId description date createdAt')
        .lean(),
      DailyClosing.find({
        userId,
        date: { $gte: fromDate, $lte: toDate }
      }).lean(),
      CashCount.find({
        userId,
        date: { $gte: fromDate, $lte: toDate }
      }).sort({ createdAt: -1 }).lean(),
      BankAccountService.getAllAccountsSummary(userId)
    ]);

    const bankMap = {};
    (bankAccounts || []).forEach(b => { bankMap[b.id] = b.name; });

    // Enrich transactions with resolved transactionName and accountName
    const enrichedTxs = rangeTxs.map(tx => ({
      ...tx,
      transactionName: (tx.transactionName && tx.transactionName.trim())
        ? tx.transactionName.trim()
        : ((tx.name && tx.name.trim()) ? tx.name.trim() : (tx.type === 'CASH_WITHDRAWAL' ? 'Cash Withdrawal' : 'Unnamed Transaction')),
      accountName: tx.accountId && tx.accountId !== 'CASH' ? (bankMap[tx.accountId] || 'Bank') : (tx.paymentMethod === 'CASH' ? 'Cash' : '')
    }));

    // Period Totals
    let totalIncome = 0;
    let totalExpense = 0;
    let cashIncome = 0;
    let cashExpense = 0;
    let cashWithdrawal = 0;
    let upiIncome = 0;
    let upiExpense = 0;

    enrichedTxs.forEach(t => {
      const amt = parseFloat(t.amount) || 0;
      if (t.type === 'INCOME') {
        totalIncome += amt;
        if (t.paymentMethod === 'CASH') cashIncome += amt;
        else upiIncome += amt;
      } else if (t.type === 'EXPENSE') {
        totalExpense += amt;
        if (t.paymentMethod === 'CASH') cashExpense += amt;
        else upiExpense += amt;
      } else if (t.type === 'CASH_WITHDRAWAL') {
        cashWithdrawal += amt;
      }
    });

    const netSavings = totalIncome - totalExpense;
    const netCashChange = cashIncome - cashExpense + cashWithdrawal;
    const netUpiChange = upiIncome - upiExpense - cashWithdrawal;

    // Group by Date
    const daysMap = {};
    enrichedTxs.forEach(t => {
      if (!daysMap[t.date]) {
        daysMap[t.date] = {
          date: t.date,
          income: 0,
          expense: 0,
          cashIncome: 0,
          cashExpense: 0,
          cashWithdrawal: 0,
          net: 0,
          transactions: []
        };
      }
      const day = daysMap[t.date];
      const amt = parseFloat(t.amount) || 0;
      day.transactions.push(t);
      if (t.type === 'INCOME') {
        day.income += amt;
        if (t.paymentMethod === 'CASH') day.cashIncome += amt;
      } else if (t.type === 'EXPENSE') {
        day.expense += amt;
        if (t.paymentMethod === 'CASH') day.cashExpense += amt;
      } else if (t.type === 'CASH_WITHDRAWAL') {
        day.cashWithdrawal += amt;
      }
      day.net = day.income - day.expense;
    });

    // Map Closings / Counts
    const closingMap = {};
    closingRows.forEach(c => { closingMap[c.date] = c; });
    const countMap = {};
    countRows.forEach(c => { if (!countMap[c.date]) countMap[c.date] = c; });

    const dailyBreakdown = Object.keys(daysMap)
      .sort((a, b) => a.localeCompare(b))
      .map(dateStr => {
        const d = daysMap[dateStr];
        const closing = closingMap[dateStr];
        const count = countMap[dateStr];
        return {
          ...d,
          isClosed: !!closing?.isClosed,
          physicalCash: count ? count.physicalCash : (closing ? closing.physicalCash : null),
          status: closing ? closing.status : (count ? 'COUNTED' : 'UNCHECKED')
        };
      });

    return res.json({
      fromDate,
      toDate,
      daysCount: dailyBreakdown.length,
      totalIncome,
      totalExpense,
      netSavings,
      cashIncome,
      cashExpense,
      cashWithdrawal,
      netCashChange,
      upiIncome,
      upiExpense,
      netUpiChange,
      bankAccounts: bankAccounts || [],
      dailyBreakdown,
      transactions: enrichedTxs
    });
  } catch (err) {
    console.error('Error generating range report:', err);
    return res.status(500).json({ error: 'Failed to generate date range report' });
  }
});

module.exports = router;
