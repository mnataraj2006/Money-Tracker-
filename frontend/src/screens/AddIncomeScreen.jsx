import React, { useState, useEffect } from 'react';
import { ArrowLeft, Bell, Save, Calendar, Mic, X } from 'lucide-react';
import { transactionsAPI, bankAccountsAPI } from '../services/api';
import { useDataCache } from '../context/DataContext';
import VoiceEntryModal from '../components/VoiceEntryModal';
import TransactionNameAutocomplete from '../components/TransactionNameAutocomplete';

export default function AddIncomeScreen({ onBack, onSuccess, initialDate, editTx }) {
  const { clearCache } = useDataCache();
  const [amount, setAmount] = useState(editTx ? editTx.amount : '');
  const [name, setName] = useState(editTx ? (editTx.transactionName || editTx.name || '') : '');
  const [paymentMethod, setPaymentMethod] = useState(editTx ? editTx.paymentMethod : 'CASH');
  const [accountId, setAccountId] = useState(editTx?.accountId && editTx.accountId !== 'CASH' ? editTx.accountId : '');
  const [bankAccounts, setBankAccounts] = useState([]);
  const [date, setDate] = useState(editTx ? editTx.date : (initialDate || new Date().toISOString().split('T')[0]));
  const [note, setNote] = useState(editTx ? (editTx.description === 'string' ? '' : (editTx.description || '')) : '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  // Quick add bank modal
  const [showAddBankModal, setShowAddBankModal] = useState(false);
  const [quickBankName, setQuickBankName] = useState('');
  const [quickOpeningBalance, setQuickOpeningBalance] = useState('');
  const [quickBankLoading, setQuickBankLoading] = useState(false);
  const [quickBankError, setQuickBankError] = useState('');

  useEffect(() => {
    loadBankAccounts();
  }, []);

  const loadBankAccounts = async () => {
    try {
      const res = await bankAccountsAPI.getAll();
      setBankAccounts(res.bankAccounts || []);
    } catch (err) {
      console.error('Failed to load bank accounts:', err);
    }
  };

  const handleQuickAddBank = async (e) => {
    e.preventDefault();
    setQuickBankError('');
    const clean = quickBankName.trim();
    if (!clean) {
      setQuickBankError('Bank name is required');
      return;
    }
    const numOpening = parseFloat(quickOpeningBalance || '0');
    if (isNaN(numOpening)) {
      setQuickBankError('Opening balance must be a number');
      return;
    }

    try {
      setQuickBankLoading(true);
      const res = await bankAccountsAPI.create({
        name: clean,
        openingBalance: numOpening
      });
      const created = res.bankAccount;
      if (created) {
        setBankAccounts(prev => [...prev, created]);
        setAccountId(created.id);
      }
      setQuickBankName('');
      setQuickOpeningBalance('');
      setShowAddBankModal(false);
    } catch (err) {
      setQuickBankError(err.message || 'Failed to create bank account');
    } finally {
      setQuickBankLoading(false);
    }
  };

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

    if (paymentMethod === 'UPI' && (!accountId || accountId === 'CASH')) {
      setError('Please select a Bank Account for UPI transaction');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        type: 'INCOME',
        amount: numAmount,
        transactionName: name.trim(),
        name: name.trim(),
        paymentMethod,
        accountId: paymentMethod === 'CASH' ? 'CASH' : accountId,
        description: note,
        date
      };

      if (editTx && editTx.id) {
        await transactionsAPI.update(editTx.id, payload);
      } else {
        await transactionsAPI.create(payload);
      }
      clearCache();
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

        {/* Transaction Name Input with Autocomplete */}
        <div className="input-group">
          <label className="input-label">Transaction Name</label>
          <TransactionNameAutocomplete
            placeholder="e.g. Salary, Client Payment, சம்பளம்"
            value={name}
            onChange={(val) => setName(val)}
            required
            autoFocus
          />
        </div>

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
            />
          </div>
        </div>

        {/* Transaction Name / Description Input */}
        <div className="input-group">
          <label className="input-label">Description / Note (Optional)</label>
          <textarea
            className="input-control"
            placeholder="What was this for? (e.g. Salary, Freelance)"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {/* Payment Method Input */}
        <div className="input-group">
          <label className="input-label">Payment Method</label>
          <select
            className="input-control"
            value={paymentMethod}
            onChange={(e) => {
              const val = e.target.value;
              setPaymentMethod(val);
              if (val === 'CASH') {
                setAccountId('CASH');
              } else if (val === 'UPI' && (!accountId || accountId === 'CASH')) {
                if (bankAccounts.length > 0) {
                  setAccountId(bankAccounts[0].id);
                } else {
                  setAccountId('');
                }
              }
            }}
          >
            <option value="CASH">Cash (Modifies Cash at Home)</option>
            <option value="UPI">UPI</option>
          </select>

          {/* Bank Account Selector for UPI */}
          {paymentMethod === 'UPI' && (
            <div style={{ marginTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="input-label" style={{ margin: 0 }}>Bank Account *</label>
                <button
                  type="button"
                  onClick={() => setShowAddBankModal(true)}
                  style={{ background: 'none', border: 'none', color: 'var(--blue-navy)', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                >
                  + Add Bank
                </button>
              </div>

              <select
                className="input-control"
                value={accountId}
                onChange={(e) => {
                  if (e.target.value === '__ADD_NEW__') {
                    setShowAddBankModal(true);
                  } else {
                    setAccountId(e.target.value);
                  }
                }}
                required
              >
                <option value="" disabled>-- Select Bank Account --</option>
                {bankAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} (₹{Math.round(acc.expectedBalance || 0).toLocaleString('en-IN')})
                  </option>
                ))}
                <option value="__ADD_NEW__">+ Add Bank Account</option>
              </select>
            </div>
          )}
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

        <button type="submit" className="btn-primary-navy" disabled={loading} style={{ marginTop: '8px' }}>
          <Save size={18} /> {loading ? 'Saving...' : 'Save Income'}
        </button>
      </form>

      <VoiceEntryModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onSuccess={onSuccess}
        initialType="INCOME"
      />

      {/* Quick Add Bank Account Dialog */}
      {showAddBankModal && (
        <div className="confirm-backdrop" onClick={() => setShowAddBankModal(false)} style={{ zIndex: 100002 }}>
          <div className="confirm-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px', width: '90%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>
              <div style={{ fontSize: '17px', fontWeight: '800', color: '#1E293B' }}>
                Add Bank Account
              </div>
              <button
                type="button"
                onClick={() => setShowAddBankModal(false)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {quickBankError && (
              <div style={{ background: '#FEE2E2', color: '#DC2626', padding: '8px 12px', borderRadius: '8px', marginBottom: '12px', fontSize: '13px', fontWeight: '600' }}>
                {quickBankError}
              </div>
            )}

            <form onSubmit={handleQuickAddBank} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#1E293B', marginBottom: '4px', display: 'block' }}>
                  Bank Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. SBI, HDFC"
                  value={quickBankName}
                  onChange={(e) => setQuickBankName(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', fontSize: '14px', borderRadius: '8px', border: '1.5px solid #CBD5E1', outline: 'none', background: '#FAFAFA' }}
                  required
                  autoFocus
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#1E293B', marginBottom: '4px', display: 'block' }}>
                  Opening Balance (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={quickOpeningBalance}
                  onChange={(e) => setQuickOpeningBalance(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', fontSize: '15px', fontWeight: '700', borderRadius: '8px', border: '1.5px solid #CBD5E1', outline: 'none', background: '#FAFAFA' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddBankModal(false)}
                  disabled={quickBankLoading}
                  style={{ flex: 1, padding: '10px', background: '#F1F5F9', color: '#334155', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={quickBankLoading}
                  style={{ flex: 1, padding: '10px', background: '#16247B', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
                >
                  {quickBankLoading ? '...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
