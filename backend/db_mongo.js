const mongoose = require('mongoose');

const LOCAL_MONGODB_URI = 'mongodb://127.0.0.1:27017/money_tracker';
const ATLAS_MONGODB_URI = 'mongodb+srv://mnataraj2108_db_user:EadQO806Fjthna6U@cluster0.yg26isx.mongodb.net/money_tracker?retryWrites=true&w=majority&appName=Cluster0';

const connectDB = async (uri) => {
  const targetUri = uri || process.env.MONGODB_URI || LOCAL_MONGODB_URI;
  try {
    await mongoose.connect(targetUri, { serverSelectionTimeoutMS: 5000 });
    console.log(`MongoDB connected successfully! (${targetUri.includes('127.0.0.1') || targetUri.includes('localhost') ? 'Local MongoDB' : 'MongoDB Atlas'})`);
  } catch (err) {
    console.warn(`Primary MongoDB connection failed: ${err.message}`);
    if (!targetUri.includes('127.0.0.1') && !targetUri.includes('localhost')) {
      console.log(`Attempting fallback to local MongoDB (${LOCAL_MONGODB_URI})...`);
      try {
        await mongoose.connect(LOCAL_MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
        console.log('Connected to local MongoDB successfully!');
        return;
      } catch (fallbackErr) {
        console.error('Local MongoDB fallback failed:', fallbackErr.message);
      }
    } else {
      console.log(`Attempting connection to MongoDB Atlas fallback...`);
      try {
        await mongoose.connect(ATLAS_MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
        console.log('Connected to MongoDB Atlas successfully!');
        return;
      } catch (atlasErr) {
        console.error('MongoDB Atlas connection failed:', atlasErr.message);
      }
    }
  }
};

// User Schema
const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  googleId: { type: String, unique: true, sparse: true, index: true },
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  profileImage: { type: String, default: '' },
  passwordHash: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Transaction Schema
const transactionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  type: { type: String, enum: ['INCOME', 'EXPENSE'], required: true },
  amount: { type: Number, required: true, min: 0.01 },
  transactionName: { type: String, default: '' },
  name: { type: String, default: '' },
  category: { type: String, default: '' },
  paymentMethod: { type: String, enum: ['CASH', 'UPI', 'BANK', 'CARD', 'OTHER'], required: true },
  accountId: { type: String, default: null, index: true },
  description: { type: String, default: '' },
  date: { type: String, required: true, index: true }, // YYYY-MM-DD
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

transactionSchema.pre('save', function (next) {
  const val = (this.transactionName || this.name || '').trim();
  this.transactionName = val;
  this.name = val;
  next();
});

transactionSchema.index({ userId: 1, date: -1, createdAt: -1 });
transactionSchema.index({ userId: 1, type: 1 });
transactionSchema.index({ userId: 1, accountId: 1 });

// Bank Account Schema
const bankAccountSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true, trim: true },
  openingBalance: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

bankAccountSchema.index({ userId: 1, name: 1 });

// Account Balance Check (Verification) Schema
const accountBalanceCheckSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  accountId: { type: String, required: true, index: true },
  expectedBalance: { type: Number, required: true },
  actualBalance: { type: Number, required: true },
  difference: { type: Number, required: true },
  checkedAt: { type: Date, default: Date.now }
});

accountBalanceCheckSchema.index({ userId: 1, accountId: 1, checkedAt: -1 });

// Cash Count Schema
const cashCountSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  date: { type: String, required: true, index: true },
  n500: { type: Number, default: 0 },
  n200: { type: Number, default: 0 },
  n100: { type: Number, default: 0 },
  n50: { type: Number, default: 0 },
  n20: { type: Number, default: 0 },
  n10: { type: Number, default: 0 },
  n5: { type: Number, default: 0 },
  n2: { type: Number, default: 0 },
  n1: { type: Number, default: 0 },
  physicalCash: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

cashCountSchema.index({ userId: 1, date: -1, createdAt: -1 });

// Daily Closing Schema
const dailyClosingSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  date: { type: String, required: true, index: true },
  openingCash: { type: Number, default: 0 },
  cashIncome: { type: Number, default: 0 },
  cashExpense: { type: Number, default: 0 },
  expectedClosingCash: { type: Number, default: 0 },
  physicalCash: { type: Number, default: 0 },
  difference: { type: Number, default: 0 },
  status: { type: String, enum: ['TALLIED', 'SHORT', 'EXTRA'], default: 'TALLIED' },
  isClosed: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

dailyClosingSchema.index({ userId: 1, date: 1 }, { unique: true });

// Settings Schema
const settingsSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  currency: { type: String, default: 'INR' },
  notifications: { type: Boolean, default: true },
  appearance: { type: String, default: 'Light' },
  language: { type: String, default: 'en' }
});

const User = mongoose.model('User', userSchema);
const Transaction = mongoose.model('Transaction', transactionSchema);
const BankAccount = mongoose.model('BankAccount', bankAccountSchema);
const AccountBalanceCheck = mongoose.model('AccountBalanceCheck', accountBalanceCheckSchema);
const CashCount = mongoose.model('CashCount', cashCountSchema);
const DailyClosing = mongoose.model('DailyClosing', dailyClosingSchema);
const Settings = mongoose.model('Settings', settingsSchema);

module.exports = {
  connectDB,
  User,
  Transaction,
  BankAccount,
  AccountBalanceCheck,
  CashCount,
  DailyClosing,
  Settings
};
