import React, { useState } from 'react';
import { ArrowLeft, Bell, Save, Mic } from 'lucide-react';
import { transactionsAPI } from '../services/api';
import { useDataCache } from '../context/DataContext';
import VoiceEntryModal from '../components/VoiceEntryModal';
import TransactionNameAutocomplete from '../components/TransactionNameAutocomplete';

export default function AddExpenseScreen({ onBack, onSuccess, initialDate, editTx }) {
  const { clearCache } = useDataCache();
  const [amount, setAmount] = useState(editTx ? editTx.amount : '');
  const [name, setName] = useState(editTx ? (editTx.transactionName || editTx.name || '') : '');
  const [paymentMethod, setPaymentMethod] = useState(editTx ? editTx.paymentMethod : 'CASH');
  const [date, setDate] = useState(editTx ? editTx.date : (initialDate || new Date().toISOString().split('T')[0]));
  const [note, setNote] = useState(editTx ? (editTx.description === 'string' ? '' : (editTx.description || '')) : '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    if (!name.trim()) {
      setError('Please enter a transaction name');
      return;
    }

    setLoading(true);
    try {
      if (editTx && editTx.id) {
        await transactionsAPI.update(editTx.id, {
          type: 'EXPENSE',
          amount: numAmount,
          transactionName: name.trim(),
          name: name.trim(),
          paymentMethod,
          description: note,
          date
        });
      } else {
        await transactionsAPI.create({
          type: 'EXPENSE',
          amount: numAmount,
          transactionName: name.trim(),
          name: name.trim(),
          paymentMethod,
          description: note,
          date
        });
      }
      clearCache();
      onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to save expense transaction');
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
          <span className="app-title-text">Add Expense</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setIsVoiceModalOpen(true)}
            style={{
              padding: '6px 12px',
              borderRadius: '20px',
              backgroundColor: '#021A1A',
              color: '#FFF',
              border: 'none',
              fontSize: '12px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer'
            }}
          >
            <Mic size={14} /> Voice
          </button>
          <div className="app-header-icon">
            <Bell size={18} />
          </div>
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

        {/* Big Amount Card */}
        <div className="stitch-card" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            Amount
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <span style={{ fontSize: '28px', fontWeight: '800', color: 'var(--red-expense)' }}>₹</span>
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

        {/* Transaction Name Input with Autocomplete */}
        <div className="input-group">
          <label className="input-label">Transaction Name</label>
          <TransactionNameAutocomplete
            placeholder="e.g. Juice, Vegetables, காய்கறி"
            value={name}
            onChange={(val) => setName(val)}
            required
          />
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

        {/* Transaction Name / Description Input */}
        <div className="input-group">
          <label className="input-label">Description / Note (Optional)</label>
          <textarea
            className="input-control"
            placeholder="What was this for? (e.g. Peanut Candy, House Rent)"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <button type="submit" className="btn-primary-navy" disabled={loading} style={{ marginTop: '8px' }}>
          <Save size={18} /> {loading ? 'Saving...' : 'Save Expense'}
        </button>
      </form>

      <VoiceEntryModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onSuccess={onSuccess}
        initialType="EXPENSE"
      />
    </div>
  );
}
