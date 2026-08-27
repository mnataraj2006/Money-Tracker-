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

module.exports = router;
