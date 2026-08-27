const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User, Settings } = require('../db_mongo');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

// REGISTER
router.post('/register', async (req, res) => {
  const { fullName, email, password } = req.body;

  if (!fullName || !email || !password) {
    return res.status(400).json({ error: 'Full name, email/mobile, and password are required' });
  }

  try {
    const cleanEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({ error: 'User with this email or mobile already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();

    const newUser = new User({
      id: userId,
      fullName: fullName.trim(),
      email: cleanEmail,
      passwordHash
    });

    await newUser.save();

    // Create user settings
    await Settings.create({ userId, currency: 'INR', notifications: true, appearance: 'Light' });

    const token = jwt.sign({ userId, email: cleanEmail, fullName: fullName.trim() }, JWT_SECRET, { expiresIn: '30d' });

    return res.json({
      message: 'Account created successfully',
      token,
      user: { id: userId, fullName: fullName.trim(), email: cleanEmail }
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Server error during registration' });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email/mobile and password are required' });
  }

  try {
    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id, email: user.email, fullName: user.fullName }, JWT_SECRET, { expiresIn: '30d' });

    return res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, fullName: user.fullName, email: user.email }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Database error during login' });
  }
});

// GOOGLE AUTH LOGIN / REGISTER
router.post('/google', async (req, res) => {
  const { credential, email, fullName } = req.body;

  try {
    let userEmail = email ? email.trim().toLowerCase() : '';
    let userFullName = fullName ? fullName.trim() : 'Google User';

    if (credential) {
      const parts = credential.split('.');
      if (parts.length === 3) {
        const payloadStr = Buffer.from(parts[1], 'base64').toString('utf8');
        const payload = JSON.parse(payloadStr);
        if (payload.email) userEmail = payload.email.trim().toLowerCase();
        if (payload.name) userFullName = payload.name.trim();
      }
    }

    if (!userEmail) {
      return res.status(400).json({ error: 'Google login failed: Email not provided' });
    }

    let user = await User.findOne({ email: userEmail });
    if (!user) {
      const userId = crypto.randomUUID();
      const passwordHash = await bcrypt.hash(`google_${userId}`, 10);
      user = new User({
        id: userId,
        fullName: userFullName,
        email: userEmail,
        passwordHash
      });
      await user.save();
      await Settings.create({ userId, currency: 'INR', notifications: true, appearance: 'Light', language: 'en' });
    }

    const token = jwt.sign({ userId: user.id, email: user.email, fullName: user.fullName }, JWT_SECRET, { expiresIn: '30d' });

    return res.json({
      message: 'Google login successful',
      token,
      user: { id: user.id, fullName: user.fullName, email: user.email }
    });
  } catch (err) {
    console.error('Google auth error:', err);
    return res.status(500).json({ error: 'Google sign-in failed' });
  }
});

// GET CURRENT USER
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.userId }).select('id fullName email createdAt');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({ user });
  } catch (err) {
    return res.status(500).json({ error: 'Error fetching user' });
  }
});

// CHANGE PASSWORD
router.post('/change-password', authenticateToken, async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Old password and new password are required' });
  }

  try {
    const user = await User.findOne({ id: req.user.userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.json({ message: 'Password updated successfully' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update password' });
  }
});

module.exports = router;
