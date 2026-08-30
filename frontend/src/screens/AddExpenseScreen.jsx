import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Bell, Save, Calendar, Mic, X, AlertTriangle } from 'lucide-react';
import { transactionsAPI, bankAccountsAPI } from '../services/api';
import { useDataCache } from '../context/DataContext';
import { useLanguage } from '../context/LanguageContext';
import { useRegisterModal } from '../context/NavigationContext';
import VoiceEntryModal from '../components/VoiceEntryModal';
import TransactionNameAutocomplete from '../components/TransactionNameAutocomplete';

export default function AddExpenseScreen({ onBack, onSuccess, initialDate, editTx }) {
  const { clearCache } = useDataCache();
  const { t } = useLanguage();

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

  // Unsaved changes tracking
  const [showConfirmDiscard, setShowConfirmDiscard] = useState(false);
  const initialValuesRef = useRef({
    name: editTx ? (editTx.transactionName || editTx.name || '').trim() : '',
    amount: editTx ? String(editTx.amount || '').trim() : '',
    note: editTx ? (editTx.description === 'string' ? '' : (editTx.description || '')).trim() : '',
    paymentMethod: editTx ? editTx.paymentMethod : 'CASH',
    accountId: editTx?.accountId && editTx.accountId !== 'CASH' ? editTx.accountId : ''
  });

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

  const isFormDirty = () => {
    const init = initialValuesRef.current;
    if (!init) return false;
    return (
      name.trim() !== init.name ||
      String(amount).trim() !== init.amount ||
      note.trim() !== init.note ||
      paymentMethod !== init.paymentMethod ||
      accountId !== init.accountId
    );
  };

  const handleDismiss = () => {
    if (showConfirmDiscard) {
      setShowConfirmDiscard(false);
      return true;
    }
    if (showAddBankModal) {
      setShowAddBankModal(false);
      return true;
    }
    if (isVoiceModalOpen) {
      setIsVoiceModalOpen(false);
      return true;
    }
    if (isFormDirty()) {
      setShowConfirmDiscard(true);
      return true;
    }
    onBack();
    return true;
  };

  useRegisterModal(true, handleDismiss);

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
        type: 'EXPENSE',
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
          <div className="app-header-icon" onClick={handleDismiss} style={{ cursor: 'pointer' }}>
            <ArrowLeft size={20} />
          </div>
          <span className="app-title-text">{t('expense')}</span>
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
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <Mic size={14} />
            Voice
          </button>
        </div>
      </div>

      <div className="main-content">
        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* 1. Transaction Name */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label">{t('transactionName')}</label>
            <TransactionNameAutocomplete
              value={name}
              onChange={setName}
              type="EXPENSE"
              placeholder={t('transactionNamePlaceholder') || 'e.g. Vegetables, Petrol, Tea'}
              required
            />
          </div>

          {/* 2. Amount */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label">{t('amount')} (₹)</label>
            <input
              type="number"
              className="form-input"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              step="any"
              required
            />
          </div>

          {/* 3. Description (Optional) */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label">{t('descriptionOptional')}</label>
            <input
              type="text"
              className="form-input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('descriptionOptional')}
            />
          </div>

          {/* 4. Payment Method */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label">{t('paymentMethod')}</label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: `1.5px solid ${paymentMethod === 'CASH' ? '#16A34A' : '#CBD5E1'}`,
                  background: paymentMethod === 'CASH' ? '#DCFCE7' : '#FFF',
                  color: paymentMethod === 'CASH' ? '#16A34A' : '#64748B',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                💵 {t('cash')} ({t('cashAtHome') || 'Cash at Home'})
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('UPI')}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: `1.5px solid ${paymentMethod === 'UPI' ? '#4338CA' : '#CBD5E1'}`,
                  background: paymentMethod === 'UPI' ? '#EEF2FF' : '#FFF',
                  color: paymentMethod === 'UPI' ? '#4338CA' : '#64748B',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                📱 {t('upi') || 'UPI'}
              </button>
            </div>

            {/* Bank Account Selector when UPI is chosen */}
            {paymentMethod === 'UPI' && (
              <div style={{ marginTop: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#1E293B' }}>
                    {t('selectBankAccount')} *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddBankModal(true)}
                    style={{ background: 'none', border: 'none', color: '#16247B', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    + {t('addBankAccount')}
                  </button>
                </div>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    background: '#FFF',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: accountId ? '#1E293B' : '#64748B',
                    outline: 'none'
                  }}
                  required
                >
                  <option value="">-- {t('selectBankAccount')} --</option>
                  {bankAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 5. Date */}
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label">{t('date')}</label>
            <input
              type="date"
              className="form-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', backgroundColor: '#DC2626', borderColor: '#DC2626' }}
          >
            <Save size={18} />
            {loading ? '...' : (editTx ? t('saveChanges') : t('saveExpense'))}
          </button>
        </form>
      </div>

      <VoiceEntryModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        initialType="EXPENSE"
        onSuccess={() => {
          clearCache();
          onSuccess();
        }}
      />

      {/* Quick Add Bank Account Dialog */}
      {showAddBankModal && (
        <div className="confirm-backdrop" onClick={() => setShowAddBankModal(false)} style={{ zIndex: 100002 }}>
          <div className="confirm-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px', width: '90%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>
              <div style={{ fontSize: '17px', fontWeight: '800', color: '#1E293B' }}>
                {t('addBankAccount')}
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
                  {t('bankName')} *
                </label>
                <input
                  type="text"
                  placeholder={t('enterBankName')}
                  value={quickBankName}
                  onChange={(e) => setQuickBankName(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', fontSize: '14px', borderRadius: '8px', border: '1.5px solid #CBD5E1', outline: 'none', background: '#FAFAFA' }}
                  required
                  autoFocus
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#1E293B', marginBottom: '4px', display: 'block' }}>
                  {t('openingBalance')} (₹)
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
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={quickBankLoading}
                  style={{ flex: 1, padding: '10px', background: '#16247B', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
                >
                  {quickBankLoading ? '...' : (t('save') || 'Save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Discard Confirmation Dialog */}
      {showConfirmDiscard && (
        <div className="confirm-backdrop" onClick={() => setShowConfirmDiscard(false)} style={{ zIndex: 100003 }}>
          <div className="confirm-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '380px', width: '90%', textAlign: 'center' }}>
            <AlertTriangle size={40} color="#DC2626" style={{ margin: '0 auto 10px' }} />
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#1E293B', marginBottom: '6px' }}>
              {t('discardTransaction')}
            </div>
            <div style={{ fontSize: '14px', color: '#64748B', marginBottom: '18px', lineHeight: '1.4' }}>
              {t('unsavedChangesMessage')}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowConfirmDiscard(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#F1F5F9',
                  color: '#334155',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmDiscard(false);
                  onBack();
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#DC2626',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                {t('discard')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
