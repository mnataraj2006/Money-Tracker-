const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { Transaction, BankAccount } = require('../db_mongo');
const { authenticateToken } = require('../middleware/auth');
const { recalculateDailyClosingsFrom } = require('./cash');
const BankAccountService = require('../services/bankAccountService');

// GET ALL TRANSACTIONS WITH OPTIONAL PAGINATION AND FILTERS
router.get('/', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { date, type, category, search, month, accountId, page, limit } = req.query;

  try {
    const query = { userId };

    if (date) {
      query.date = date;
    } else if (month) {
      query.date = { $regex: `^${month}` };
    }

    if (type && ['INCOME', 'EXPENSE', 'CASH_WITHDRAWAL'].includes(type)) {
      query.type = type;
    }

    if (category) {
      query.category = category;
    }

    if (accountId) {
      query.accountId = accountId;
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { transactionName: searchRegex },
        { name: searchRegex },
        { description: searchRegex },
        { paymentMethod: searchRegex }
      ];
    }

    // Pagination logic
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .select('id type amount name transactionName category paymentMethod accountId description date createdAt')
        .lean(),
      Transaction.countDocuments(query)
    ]);

    return res.json({
      transactions,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    console.error('Error fetching transactions:', err);
    return res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// GET TRANSACTION BY ID
router.get('/:id', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;

  try {
    const tx = await Transaction.findOne({ id, userId });
    if (!tx) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    return res.json({ transaction: tx });
  } catch (err) {
    return res.status(500).json({ error: 'Error fetching transaction' });
  }
});

// CREATE TRANSACTION
router.post('/', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { type, amount, name, transactionName, category, paymentMethod, accountId, description, date } = req.body;

  if (!type || !['INCOME', 'EXPENSE', 'CASH_WITHDRAWAL'].includes(type)) {
    return res.status(400).json({ error: 'Valid transaction type (INCOME, EXPENSE, or CASH_WITHDRAWAL) is required' });
  }

  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number greater than 0' });
  }

  if (type === 'CASH_WITHDRAWAL') {
    if (!accountId) {
      return res.status(400).json({ error: 'Please select a bank account for cash withdrawal' });
    }
    const bankAcc = await BankAccount.findOne({ id: accountId, userId });
    if (!bankAcc) {
      return res.status(400).json({ error: 'Selected bank account was not found' });
    }
    const summary = await BankAccountService.getAccountSummary(userId, accountId);
    if (summary && numericAmount > summary.expectedBalance) {
      return res.status(400).json({ error: 'Insufficient bank balance' });
    }
  } else {
    if (!paymentMethod || !['CASH', 'UPI', 'BANK', 'CARD', 'OTHER'].includes(paymentMethod)) {
      return res.status(400).json({ error: 'Valid payment method is required' });
    }
  }

  let targetAccountId = null;
  if (type === 'CASH_WITHDRAWAL') {
    targetAccountId = accountId;
  } else if (paymentMethod === 'CASH') {
    targetAccountId = 'CASH';
  } else if (paymentMethod === 'UPI') {
    if (!accountId) {
      return res.status(400).json({ error: 'Please select a bank account for UPI transaction' });
    }
    const bankAcc = await BankAccount.findOne({ id: accountId, userId });
    if (!bankAcc) {
      return res.status(400).json({ error: 'Selected bank account was not found' });
    }
    targetAccountId = accountId;
  } else {
    targetAccountId = accountId || null;
  }

  const txDate = date || new Date().toISOString().split('T')[0];
  const txId = crypto.randomUUID();

  // Sanitize description string and extract name
  const cleanDescription = (description && description.trim() !== 'string') ? description.trim() : '';
  const cleanName = type === 'CASH_WITHDRAWAL'
    ? 'Cash Withdrawal'
    : (transactionName !== undefined ? transactionName : (name || '')).trim();

  try {
    const newTx = new Transaction({
      id: txId,
      userId,
      type,
      amount: numericAmount,
      transactionName: cleanName,
      name: cleanName,
      category: type === 'CASH_WITHDRAWAL' ? '' : (category || '').trim(),
      paymentMethod: type === 'CASH_WITHDRAWAL' ? 'BANK' : paymentMethod,
      accountId: targetAccountId,
      description: cleanDescription,
      date: txDate
    });

    await newTx.save();
    recalculateDailyClosingsFrom(userId, txDate).catch(err => console.error('Background closing recalculation error:', err));

    return res.json({
      message: 'Transaction saved successfully',
      transaction: newTx
    });
  } catch (err) {
    console.error('Error saving transaction:', err);
    return res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// UPDATE TRANSACTION
router.put('/:id', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;
  const { type, amount, name, transactionName, category, paymentMethod, accountId, description, date } = req.body;

  try {
    const existing = await Transaction.findOne({ id, userId });
    if (!existing) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const effectiveType = type || existing.type;
    const oldDate = existing.date;
    const oldAmount = existing.amount;
    const oldAccountId = existing.accountId;

    if (effectiveType === 'CASH_WITHDRAWAL') {
      const targetAccId = accountId !== undefined ? accountId : existing.accountId;
      if (!targetAccId) {
        return res.status(400).json({ error: 'Please select a bank account' });
      }
      const bankAcc = await BankAccount.findOne({ id: targetAccId, userId });
      if (!bankAcc) {
        return res.status(400).json({ error: 'Selected bank account was not found' });
      }

      const newAmount = amount !== undefined ? parseFloat(amount) : existing.amount;
      if (isNaN(newAmount) || newAmount <= 0) {
        return res.status(400).json({ error: 'Amount must be a positive number' });
      }

      // Check sufficient balance restoring previous transaction amount
      const summary = await BankAccountService.getAccountSummary(userId, targetAccId);
      const available = (summary ? summary.expectedBalance : 0) + (oldAccountId === targetAccId ? oldAmount : 0);
      if (newAmount > available) {
        return res.status(400).json({ error: 'Insufficient bank balance' });
      }

      existing.amount = newAmount;
      existing.accountId = targetAccId;
      existing.paymentMethod = 'BANK';
      existing.transactionName = 'Cash Withdrawal';
      existing.name = 'Cash Withdrawal';
      existing.category = '';
      if (description !== undefined) {
        existing.description = (description && description.trim() !== 'string') ? description.trim() : '';
      }
      if (date) existing.date = date;
    } else {
      const effectivePaymentMethod = paymentMethod || existing.paymentMethod;
      if (effectivePaymentMethod === 'CASH') {
        existing.accountId = 'CASH';
      } else if (effectivePaymentMethod === 'UPI') {
        const targetAccId = accountId !== undefined ? accountId : existing.accountId;
        if (!targetAccId || targetAccId === 'CASH') {
          return res.status(400).json({ error: 'Please select a bank account for UPI transaction' });
        }
        const bankAcc = await BankAccount.findOne({ id: targetAccId, userId });
        if (!bankAcc) {
          return res.status(400).json({ error: 'Selected bank account was not found' });
        }
        existing.accountId = targetAccId;
      } else if (accountId !== undefined) {
        existing.accountId = accountId;
      }

      if (type) existing.type = type;
      if (amount) {
        const num = parseFloat(amount);
        if (isNaN(num) || num <= 0) return res.status(400).json({ error: 'Amount must be a positive number' });
        existing.amount = num;
      }
      if (transactionName !== undefined || name !== undefined) {
        const updatedName = (transactionName !== undefined ? transactionName : name).trim();
        existing.transactionName = updatedName;
        existing.name = updatedName;
      }
      if (category !== undefined) existing.category = (category || '').trim();
      if (paymentMethod) existing.paymentMethod = paymentMethod;
      if (description !== undefined) {
        existing.description = (description && description.trim() !== 'string') ? description.trim() : '';
      }
      if (date) existing.date = date;
    }

    existing.updatedAt = new Date();
    await existing.save();

    const minDate = oldDate < existing.date ? oldDate : existing.date;
    recalculateDailyClosingsFrom(userId, minDate).catch(err => console.error('Background closing recalculation error:', err));

    return res.json({
      message: 'Transaction updated successfully',
      transaction: existing
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to update transaction' });
  }
});

// DELETE TRANSACTION
router.delete('/:id', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;

  try {
    const deleted = await Transaction.findOneAndDelete({ id, userId });
    if (!deleted) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    recalculateDailyClosingsFrom(userId, deleted.date).catch(err => console.error('Background closing recalculation error:', err));
    return res.json({ message: 'Transaction deleted successfully', id });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

module.exports = router;
