const express = require('express');
const router = express.Router();
const { Settings } = require('../db_mongo');
const { authenticateToken } = require('../middleware/auth');

// GET USER SETTINGS
router.get('/', authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    let settings = await Settings.findOne({ userId });
    if (!settings) {
      settings = await Settings.create({ userId, currency: 'INR', notifications: true, appearance: 'Light', language: 'en' });
    }
    return res.json({
      currency: settings.currency || 'INR',
      notifications: settings.notifications,
      appearance: settings.appearance || 'Light',
      language: settings.language || 'en'
    });
  } catch (err) {
    return res.status(500).json({ error: 'Database error fetching settings' });
  }
});

// UPDATE USER SETTINGS
router.put('/', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { currency, notifications, appearance, language } = req.body;

  try {
    const updated = await Settings.findOneAndUpdate(
      { userId },
      {
        userId,
        ...(currency ? { currency } : {}),
        ...(notifications !== undefined ? { notifications } : {}),
        ...(appearance ? { appearance } : {}),
        ...(language ? { language } : {})
      },
      { upsert: true, new: true }
    );

    return res.json({
      message: 'Settings saved',
      settings: updated
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to save settings' });
  }
});

// EXPORT COMPLETE USER DATA BACKUP
router.get('/export', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { Transaction, BankAccount, CashCount, DailyClosing, Settings } = require('../db_mongo');

  try {
    const transactions = await Transaction.find({ userId }).lean();
    const bankAccounts = await BankAccount.find({ userId }).lean();
    const cashCounts = await CashCount.find({ userId }).lean();
    const dailyClosings = await DailyClosing.find({ userId }).lean();
    const settings = await Settings.findOne({ userId }).lean();

    return res.json({
      appName: 'Cashly',
      version: '2.0',
      exportDate: new Date().toISOString(),
      userId,
      data: {
        transactions,
        bankAccounts,
        cashCounts,
        dailyClosings,
        settings
      }
    });
  } catch (err) {
    console.error('Error exporting backup data:', err);
    return res.status(500).json({ error: 'Failed to generate backup export' });
  }
});

// RESTORE USER DATA FROM BACKUP
router.post('/restore', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { Transaction, BankAccount, CashCount, DailyClosing, Settings } = require('../db_mongo');
  const { recalculateDailyClosingsFrom } = require('./cash');
  const { backupData } = req.body;

  if (!backupData || !backupData.data) {
    return res.status(400).json({ error: 'Invalid backup file payload' });
  }

  try {
    const { transactions, bankAccounts, cashCounts, dailyClosings, settings } = backupData.data;

    // 1. Clear current data for this user
    await Transaction.deleteMany({ userId });
    await BankAccount.deleteMany({ userId });
    await CashCount.deleteMany({ userId });
    await DailyClosing.deleteMany({ userId });

    // 2. Restore Bank Accounts
    if (Array.isArray(bankAccounts) && bankAccounts.length > 0) {
      const restoredBanks = bankAccounts.map(b => ({
        id: b.id || require('crypto').randomUUID(),
        userId,
        name: b.name,
        openingBalance: Number(b.openingBalance) || 0,
        createdAt: b.createdAt || new Date(),
        updatedAt: b.updatedAt || new Date()
      }));
      await BankAccount.insertMany(restoredBanks);
    }

    // 3. Restore Transactions (including transactionName and accountId)
    if (Array.isArray(transactions) && transactions.length > 0) {
      const restoredTxs = transactions.map(t => ({
        id: t.id || require('crypto').randomUUID(),
        userId,
        type: t.type,
        amount: Number(t.amount) || 0,
        transactionName: t.transactionName || t.name || t.category || 'Transaction',
        category: t.category || t.transactionName || '',
        paymentMethod: t.paymentMethod || 'CASH',
        accountId: t.accountId || null,
        description: t.description || '',
        date: t.date,
        createdAt: t.createdAt || new Date(),
        updatedAt: t.updatedAt || new Date()
      }));
      await Transaction.insertMany(restoredTxs);
    }

    // 4. Restore Cash Counts
    if (Array.isArray(cashCounts) && cashCounts.length > 0) {
      const restoredCounts = cashCounts.map(c => ({
        userId,
        date: c.date,
        n500: c.n500 || 0,
        n200: c.n200 || 0,
        n100: c.n100 || 0,
        n50: c.n50 || 0,
        n20: c.n20 || 0,
        n10: c.n10 || 0,
        n5: c.n5 || 0,
        n2: c.n2 || 0,
        n1: c.n1 || 0,
        physicalCash: c.physicalCash || 0,
        createdAt: c.createdAt || new Date()
      }));
      await CashCount.insertMany(restoredCounts);
    }

    // 5. Restore Daily Closings
    if (Array.isArray(dailyClosings) && dailyClosings.length > 0) {
      const restoredClosings = dailyClosings.map(cl => ({
        userId,
        date: cl.date,
        openingCash: cl.openingCash || 0,
        cashIncome: cl.cashIncome || 0,
        cashExpense: cl.cashExpense || 0,
        expectedClosingCash: cl.expectedClosingCash || 0,
        physicalCash: cl.physicalCash || 0,
        difference: cl.difference || 0,
        status: cl.status || 'TALLIED',
        isClosed: cl.isClosed !== undefined ? cl.isClosed : true,
        closedAt: cl.closedAt || new Date()
      }));
      await DailyClosing.insertMany(restoredClosings);
    }

    // 6. Recalculate daily closings sequentially to ensure total mathematical consistency
    const earliestDate = '2020-01-01';
    await recalculateDailyClosingsFrom(userId, earliestDate);

    return res.json({ message: 'Backup restored successfully!' });
  } catch (err) {
    console.error('Error restoring backup:', err);
    return res.status(500).json({ error: 'Failed to restore backup data: ' + err.message });
  }
});

module.exports = router;
