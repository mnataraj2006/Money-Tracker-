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
  const { Transaction, CashCount, DailyClosing, Settings } = require('../db_mongo');

  try {
    const transactions = await Transaction.find({ userId });
    const cashCounts = await CashCount.find({ userId });
    const dailyClosings = await DailyClosing.find({ userId });
    const settings = await Settings.findOne({ userId });

    return res.json({
      appName: 'Money Tracker',
      version: '1.0',
      exportDate: new Date().toISOString(),
      userId,
      data: {
        transactions,
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
  const { Transaction, CashCount, DailyClosing, Settings } = require('../db_mongo');
  const { recalculateDailyClosingsFrom } = require('./cash');
  const { backupData } = req.body;

  if (!backupData || !backupData.data) {
    return res.status(400).json({ error: 'Invalid backup file payload' });
  }

  try {
    const { transactions, cashCounts, dailyClosings, settings } = backupData.data;

    // Clear current data for this user
    await Transaction.deleteMany({ userId });
    await CashCount.deleteMany({ userId });
    await DailyClosing.deleteMany({ userId });

    // Restore transactions
    if (Array.isArray(transactions) && transactions.length > 0) {
      const restoredTxs = transactions.map(t => ({
        id: t.id || require('crypto').randomUUID(),
        userId,
        type: t.type,
        amount: t.amount,
        category: t.category,
        paymentMethod: t.paymentMethod,
        description: t.description || '',
        date: t.date,
        createdAt: t.createdAt || new Date()
      }));
      await Transaction.insertMany(restoredTxs);
    }

    // Restore cash counts
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

    // Restore daily closings
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

    // Recalculate closings sequentially to ensure consistency
    const earliestDate = '2020-01-01';
    await recalculateDailyClosingsFrom(userId, earliestDate);

    return res.json({ message: 'Backup restored successfully!' });
  } catch (err) {
    console.error('Error restoring backup:', err);
    return res.status(500).json({ error: 'Failed to restore backup data' });
  }
});

module.exports = router;
