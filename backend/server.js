const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDB } = require('./db_mongo');

const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const cashRoutes = require('./routes/cash');
const summaryRoutes = require('./routes/summary');
const settingsRoutes = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/money_tracker';

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/cash', cashRoutes.router || cashRoutes);
app.use('/api/summary', summaryRoutes);
app.use('/api/settings', settingsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: 'MongoDB Atlas', timestamp: new Date().toISOString() });
});

// Connect DB & Start Server
connectDB(MONGODB_URI).then(() => {
  app.listen(PORT, () => {
    console.log(`Money Tracker Backend API connected to MongoDB Atlas on port ${PORT}`);
  });
});
