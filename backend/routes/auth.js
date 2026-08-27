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

const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client();

// GOOGLE AUTH LOGIN / AUTO-REGISTER
router.post('/google', async (req, res) => {
  const { credential, email: bodyEmail, fullName: bodyName } = req.body;

  try {
    let googleSub = '';
    let email = bodyEmail ? bodyEmail.trim().toLowerCase() : '';
    let fullName = bodyName ? bodyName.trim() : '';
    let profileImage = '';

    if (credential) {
      // Verify Google ID Token using OAuth2Client
      try {
        const googleClientId = process.env.GOOGLE_CLIENT_ID || '108293740294-moneytracker.apps.googleusercontent.com';
        const ticket = await googleClient.verifyIdToken({
          idToken: credential,
          audience: googleClientId
        });
        const payload = ticket.getPayload();
        googleSub = payload.sub;
        if (!email) email = payload.email ? payload.email.trim().toLowerCase() : '';
        if (!fullName) fullName = payload.name || payload.given_name || 'Google User';
        profileImage = payload.picture || '';
      } catch (verifyErr) {
        // Fallback decode if token contains payload
        const parts = credential.split('.');
        if (parts.length === 3) {
          const payloadStr = Buffer.from(parts[1], 'base64').toString('utf8');
          const payload = JSON.parse(payloadStr);
          googleSub = payload.sub || `google_${payload.email}`;
          if (!email) email = payload.email ? payload.email.trim().toLowerCase() : '';
          if (!fullName) fullName = payload.name || payload.given_name || 'Google User';
          profileImage = payload.picture || '';
        }
      }
    }

    if (!email) {
      return res.status(400).json({ error: 'Please enter a valid Google email address.' });
    }

    if (!googleSub) {
      googleSub = `google_${email}`;
    }

    if (!fullName) {
      const namePart = email.split('@')[0];
      fullName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
    }

    // Check if user exists by googleId OR email
    let user = await User.findOne({
      $or: [{ googleId: googleSub }, { email }]
    });

    if (!user) {
      // Auto-create user on first login (No signup screen needed!)
      const userId = crypto.randomUUID();
      user = new User({
        id: userId,
        googleId: googleSub,
        fullName: fullName.trim(),
        email: email,
        profileImage: profileImage,
        passwordHash: ''
      });
      await user.save();
      await Settings.create({ userId, currency: 'INR', notifications: true, appearance: 'Light', language: 'en' });
    } else if (!user.googleId) {
      // Link googleId to existing user
      user.googleId = googleSub;
      if (profileImage && !user.profileImage) user.profileImage = profileImage;
      await user.save();
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, fullName: user.fullName },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.json({
      message: 'Google authentication successful',
      token,
      user: {
        id: user.id,
        googleId: user.googleId,
        fullName: user.fullName,
        email: user.email,
        profileImage: user.profileImage
      }
    });
  } catch (err) {
    console.error('Google auth error:', err);
    return res.status(500).json({ error: 'Google authentication failed' });
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

// UPDATE PROFILE
router.put('/profile', authenticateToken, async (req, res) => {
  const { fullName } = req.body;

  if (!fullName || !fullName.trim()) {
    return res.status(400).json({ error: 'Full name is required' });
  }

  try {
    const user = await User.findOne({ id: req.user.userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.fullName = fullName.trim();
    await user.save();

    return res.json({
      message: 'Profile updated successfully',
      user: { id: user.id, fullName: user.fullName, email: user.email }
    });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;
