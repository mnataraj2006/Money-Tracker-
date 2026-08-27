import React, { useState } from 'react';
import { ArrowLeft, Bell, Save, Calendar } from 'lucide-react';
import { transactionsAPI } from '../services/api';

export default function AddIncomeScreen({ onBack, onSuccess, initialDate }) {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Salary');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [date, setDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    setLoading(true);
    try {
      await transactionsAPI.create({
        type: 'INCOME',
        amount: numAmount,
        category,
        paymentMethod,
        description: note,
        date
      });
      onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to save income transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen-container">
      {/* Header */}
      <div className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="app-header-icon" onClick={onBack}>
            <ArrowLeft size={20} />
          </div>
          <span className="app-title-text">Add Income</span>
        </div>
        <div className="app-header-icon">
          <Bell size={18} />
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error && (
          <div style={{
            padding: '12px',
            backgroundColor: 'var(--badge-short-bg)',
            color: 'var(--badge-short-text)',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: '600'
          }}>
            {error}
          </div>
        )}

        {/* Big Amount Input Card */}
        <div className="stitch-card" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            Amount
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <span style={{ fontSize: '28px', fontWeight: '800', color: 'var(--green-income)' }}>₹</span>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                fontSize: '34px',
                fontWeight: '800',
                color: 'var(--text-main)',
                width: '180px',
                textAlign: 'left'
              }}
              required
              autoFocus
            />
          </div>
        </div>

        {/* Category Input */}
        <div className="input-group">
          <label className="input-label">Category</label>
          <select
            className="input-control"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="Salary">Salary</option>
            <option value="Business">Business</option>
            <option value="Bonus">Bonus</option>
            <option value="Investments">Investments</option>
            <option value="Freelance">Freelance</option>
            <option value="Other Income">Other Income</option>
          </select>
        </div>

        {/* Payment Method Input */}
        <div className="input-group">
          <label className="input-label">Payment Method</label>
          <select
            className="input-control"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
          >
            <option value="CASH">Cash (Modifies Cash at Home)</option>
            <option value="UPI">UPI / GPay / PhonePe</option>
            <option value="BANK">Bank Transfer</option>
            <option value="CARD">Credit / Debit Card</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        {/* Date Input */}
        <div className="input-group">
          <label className="input-label">Date</label>
          <div className="input-field-wrapper">
            <input
              type="date"
              className="input-control"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        {/* Note Input */}
        <div className="input-group">
          <label className="input-label">Notes (Optional)</label>
          <textarea
            className="input-control"
            placeholder="Add a note..."
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <button type="submit" className="btn-primary-navy" disabled={loading} style={{ marginTop: '8px' }}>
          <Save size={18} /> {loading ? 'Saving...' : 'Save Income'}
        </button>
      </form>
    </div>
  );
}
