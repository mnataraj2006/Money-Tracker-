const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { BankAccount, Transaction, AccountBalanceCheck } = require('../db_mongo');
const { authenticateToken } = require('../middleware/auth');
const BankAccountService = require('../services/bankAccountService');

// Helper to escape regex special characters
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 1. GET ALL BANK ACCOUNTS WITH BALANCES & RECENT CHECKS
router.get('/', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  try {
    const accounts = await BankAccountService.getAllAccountsSummary(userId);
    return res.json({ bankAccounts: accounts });
  } catch (err) {
    console.error('Error fetching bank accounts:', err);
    return res.status(500).json({ error: 'Failed to fetch bank accounts' });
  }
});

// 2. CREATE NEW BANK ACCOUNT
router.post('/', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { name, openingBalance } = req.body;

  const cleanName = (name || '').trim();
  if (!cleanName) {
    return res.status(400).json({ error: 'Bank account name is required' });
  }

  const numericOpening = openingBalance !== undefined && openingBalance !== '' ? parseFloat(openingBalance) : 0;
  if (isNaN(numericOpening)) {
    return res.status(400).json({ error: 'Opening balance must be a valid number' });
  }

  try {
    // Prevent duplicate bank account with same name for this user (case-insensitive)
    const existing = await BankAccount.findOne({
      userId,
      name: { $regex: new RegExp(`^${escapeRegex(cleanName)}$`, 'i') }
    });

    if (existing) {
      return res.status(400).json({ error: 'A bank account with this name already exists' });
    }

    const newAccount = new BankAccount({
      id: crypto.randomUUID(),
      userId,
      name: cleanName,
      openingBalance: numericOpening
    });

    await newAccount.save();

    const summary = await BankAccountService.getAccountSummary(userId, newAccount.id);
    return res.json({
      message: 'Bank account created successfully',
      bankAccount: summary || newAccount
    });
  } catch (err) {
    console.error('Error creating bank account:', err);
    return res.status(500).json({ error: 'Failed to create bank account' });
  }
});

// 3. GET SINGLE BANK ACCOUNT DETAILS
router.get('/:id', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;

  try {
    const account = await BankAccountService.getAccountSummary(userId, id);
    if (!account) {
      return res.status(404).json({ error: 'Bank account not found' });
    }
    return res.json({ bankAccount: account });
  } catch (err) {
    console.error('Error fetching bank account:', err);
    return res.status(500).json({ error: 'Failed to fetch bank account' });
  }
});

// 4. UPDATE BANK ACCOUNT
router.put('/:id', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;
  const { name, openingBalance } = req.body;

  try {
    const account = await BankAccount.findOne({ id, userId });
    if (!account) {
      return res.status(404).json({ error: 'Bank account not found' });
    }

    if (name !== undefined) {
      const cleanName = name.trim();
      if (!cleanName) {
        return res.status(400).json({ error: 'Bank account name cannot be empty' });
      }

      // Check duplicate name on another account
      const duplicate = await BankAccount.findOne({
        userId,
        id: { $ne: id },
        name: { $regex: new RegExp(`^${escapeRegex(cleanName)}$`, 'i') }
      });
      if (duplicate) {
        return res.status(400).json({ error: 'Another bank account with this name already exists' });
      }
      account.name = cleanName;
    }

    if (openingBalance !== undefined && openingBalance !== '') {
      const num = parseFloat(openingBalance);
      if (isNaN(num)) {
        return res.status(400).json({ error: 'Opening balance must be a valid number' });
      }
      account.openingBalance = num;
    }

    account.updatedAt = new Date();
    await account.save();

    const summary = await BankAccountService.getAccountSummary(userId, id);
    return res.json({
      message: 'Bank account updated successfully',
      bankAccount: summary
    });
  } catch (err) {
    console.error('Error updating bank account:', err);
    return res.status(500).json({ error: 'Failed to update bank account' });
  }
});

// 5. DELETE BANK ACCOUNT WITH TRANSACTION SAFETY CHECK
router.delete('/:id', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;

  try {
    const account = await BankAccount.findOne({ id, userId });
    if (!account) {
      return res.status(404).json({ error: 'Bank account not found' });
    }

    const txCount = await Transaction.countDocuments({ userId, accountId: id });
    if (txCount > 0) {
      return res.status(400).json({
        error: `Cannot delete "${account.name}". This account contains ${txCount} transaction(s). Please reassign or delete them first.`,
        transactionCount: txCount
      });
    }

    await BankAccount.deleteOne({ id, userId });
    await AccountBalanceCheck.deleteMany({ accountId: id, userId });

    return res.json({ message: 'Bank account deleted successfully', id });
  } catch (err) {
    console.error('Error deleting bank account:', err);
    return res.status(500).json({ error: 'Failed to delete bank account' });
  }
});

// 6. RECORD BALANCE VERIFICATION (ACTUAL VS EXPECTED)
router.post('/:id/verify', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;
  const { actualBalance } = req.body;

  const numActual = parseFloat(actualBalance);
  if (actualBalance === undefined || actualBalance === '' || isNaN(numActual)) {
    return res.status(400).json({ error: 'Please enter a valid actual balance amount' });
  }

  try {
    const summary = await BankAccountService.getAccountSummary(userId, id);
    if (!summary) {
      return res.status(404).json({ error: 'Bank account not found' });
    }

    const expectedBalance = summary.expectedBalance;
    const difference = numActual - expectedBalance;

    const checkRecord = new AccountBalanceCheck({
      id: crypto.randomUUID(),
      userId,
      accountId: id,
      expectedBalance,
      actualBalance: numActual,
      difference,
      checkedAt: new Date()
    });

    await checkRecord.save();

    return res.json({
      message: 'Balance verification recorded successfully',
      check: checkRecord,
      expectedBalance,
      actualBalance: numActual,
      difference,
      matches: difference === 0
    });
  } catch (err) {
    console.error('Error recording balance check:', err);
    return res.status(500).json({ error: 'Failed to verify balance' });
  }
});

module.exports = router;
