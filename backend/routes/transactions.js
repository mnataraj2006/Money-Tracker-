const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { Transaction } = require('../db_mongo');
const { authenticateToken } = require('../middleware/auth');
const { recalculateDailyClosingsFrom } = require('./cash');

// GET ALL TRANSACTIONS WITH OPTIONAL PAGINATION AND FILTERS
router.get('/', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { date, type, category, search, month, page, limit } = req.query;

  try {
    const query = { userId };

    if (date) {
      query.date = date;
    } else if (month) {
      query.date = { $regex: `^${month}` };
    }

    if (type && ['INCOME', 'EXPENSE'].includes(type)) {
      query.type = type;
    }

    if (category) {
      query.category = category;
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { transactionName: searchRegex },
        { name: searchRegex },
        { category: searchRegex },
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
        .select('id type amount name transactionName category paymentMethod description date createdAt')
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
  const { type, amount, name, transactionName, category, paymentMethod, description, date } = req.body;

  if (!type || !['INCOME', 'EXPENSE'].includes(type)) {
    return res.status(400).json({ error: 'Valid transaction type (INCOME or EXPENSE) is required' });
  }

  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number greater than 0' });
  }

  if (!category || !category.trim()) {
    return res.status(400).json({ error: 'Category is required' });
  }

  if (!paymentMethod || !['CASH', 'UPI', 'BANK', 'CARD', 'OTHER'].includes(paymentMethod)) {
    return res.status(400).json({ error: 'Valid payment method is required' });
  }

  const txDate = date || new Date().toISOString().split('T')[0];
  const txId = crypto.randomUUID();

  // Sanitize description string and extract name
  const cleanDescription = (description && description.trim() !== 'string') ? description.trim() : '';
  const cleanName = (transactionName !== undefined ? transactionName : (name || '')).trim();

  try {
    const newTx = new Transaction({
      id: txId,
      userId,
      type,
      amount: numericAmount,
      transactionName: cleanName,
      name: cleanName,
      category: category.trim(),
      paymentMethod,
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
  const { type, amount, name, transactionName, category, paymentMethod, description, date } = req.body;

  try {
    const existing = await Transaction.findOne({ id, userId });
    if (!existing) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const oldDate = existing.date;
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
    if (category) existing.category = category.trim();
    if (paymentMethod) existing.paymentMethod = paymentMethod;
    if (description !== undefined) {
      existing.description = (description && description.trim() !== 'string') ? description.trim() : '';
    }
    if (date) existing.date = date;
    existing.updatedAt = new Date();

    await existing.save();
    recalculateDailyClosingsFrom(userId, oldDate < existing.date ? oldDate : existing.date).catch(err => console.error('Background closing recalculation error:', err));

    return res.json({
      message: 'Transaction updated successfully',
      transaction: existing
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update transaction' });
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
