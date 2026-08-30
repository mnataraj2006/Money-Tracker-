import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, Save, Plus } from 'lucide-react';
import { transactionsAPI, bankAccountsAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useDataCache } from '../context/DataContext';
import TransactionNameAutocomplete from './TransactionNameAutocomplete';

export default function SimpleTransactionSheet({
  isOpen,
  onClose,
  onSuccess,
  initialDate,
  editTx = null,
  presetType = 'EXPENSE',
  presetName = '',
  presetAmount = '',
  presetNote = ''
}) {
  const { t, language } = useLanguage();
  const { clearCache } = useDataCache();
  const todayDateStr = new Date().toISOString().split('T')[0];

  const [type, setType] = useState('EXPENSE');
  const [amount, setAmount] = useState('');
  const [name, setName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [accountId, setAccountId] = useState('');
  const [bankAccounts, setBankAccounts] = useState([]);
  const [date, setDate] = useState(todayDateStr);
  const [description, setDescription] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // Quick Add Bank Account modal state
  const [showAddBankModal, setShowAddBankModal] = useState(false);
  const [quickBankName, setQuickBankName] = useState('');
  const [quickOpeningBalance, setQuickOpeningBalance] = useState('');
  const [quickBankLoading, setQuickBankLoading] = useState(false);
  const [quickBankError, setQuickBankError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadBankAccounts();
      if (editTx) {
        setType(editTx.type === 'INCOME' ? 'INCOME' : 'EXPENSE');
        setAmount(editTx.amount ? String(editTx.amount) : '');
        setName(editTx.transactionName || editTx.name || '');
        setPaymentMethod(editTx.paymentMethod || 'CASH');
        setAccountId(editTx.accountId && editTx.accountId !== 'CASH' ? editTx.accountId : '');
        setDate(editTx.date ? editTx.date.split('T')[0] : (initialDate || todayDateStr));
        const rawDesc = editTx.description || editTx.note || '';
        setDescription(rawDesc === 'string' ? '' : rawDesc);
      } else {
        setType(presetType || 'EXPENSE');
        setAmount(presetAmount ? String(presetAmount) : '');
        setName(presetName || '');
        setPaymentMethod('CASH');
        setAccountId('');
        setDate(initialDate || todayDateStr);
        const rawNote = presetNote || '';
        setDescription(rawNote === 'string' ? '' : rawNote);
      }
      setErrorMsg('');
      setShowConfirmDelete(false);
    }
  }, [isOpen, editTx, presetType, presetName, presetAmount, presetNote, initialDate]);

  const loadBankAccounts = async () => {
    try {
      const res = await bankAccountsAPI.getAll();
      setBankAccounts(res.bankAccounts || []);
    } catch (err) {
      console.error('Failed to load bank accounts for sheet:', err);
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
      const createdAcc = res.bankAccount;
      if (createdAcc) {
        setBankAccounts(prev => [...prev, createdAcc]);
        setAccountId(createdAcc.id);
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

  const handleSave = async (e) => {
    e?.preventDefault();
    setErrorMsg('');

    const numericAmount = parseFloat(amount);
    if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMsg(t('pleaseEnterValidAmount'));
      return;
    }

    if (!name.trim()) {
      setErrorMsg(t('pleaseEnterTxName'));
      return;
    }

    if (!date) {
      setErrorMsg(t('pleaseSelectDate'));
      return;
    }

    if (paymentMethod === 'UPI' && (!accountId || accountId === 'CASH')) {
      setErrorMsg('Please select a Bank Account for UPI transaction');
      return;
    }

    const payload = {
      type: type,
      amount: numericAmount,
      description: description.trim(),
      date: date,
      paymentMethod: paymentMethod || 'CASH',
      accountId: paymentMethod === 'CASH' ? 'CASH' : accountId,
      transactionName: name.trim(),
      name: name.trim()
    };

    try {
      setLoading(true);
      if (editTx && editTx.id) {
        await transactionsAPI.update(editTx.id, payload);
      } else {
        await transactionsAPI.create(payload);
      }
      clearCache();
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to save transaction:', err);
      setErrorMsg(err.message || 'Failed to save. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!editTx || !editTx.id) return;
    try {
      setLoading(true);
      await transactionsAPI.delete(editTx.id);
      setShowConfirmDelete(false);
      clearCache();
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to delete transaction:', err);
      setErrorMsg(err.message || 'Failed to delete. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <>
      <div className="sheet-backdrop" onClick={onClose} style={{ zIndex: 99999 }}>
        <div className="sheet-container" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="sheet-header" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            paddingBottom: '8px',
            borderBottom: '1px solid #E2E8F0',
            width: '100%'
          }}>
            <div style={{ width: '40px' }} />
            
            <h3 className="sheet-title" style={{
              fontSize: '20px',
              fontWeight: '800',
              margin: 0,
              color: '#1E293B',
              textAlign: 'center',
              flex: 1
            }}>
              {editTx ? t('editTransaction') : t('newTransaction')}
            </h3>

            <button
              type="button"
              className="sheet-close-btn"
              onClick={(e) => {
                e.stopPropagation();
                if (onClose) onClose();
              }}
              aria-label="Close"
              style={{
                background: '#F1F5F9',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#334155',
                cursor: 'pointer',
                flexShrink: 0,
                outline: 'none',
                WebkitTapHighlightColor: 'transparent',
                zIndex: 9999
              }}
            >
              <X size={24} style={{ pointerEvents: 'none' }} />
            </button>
          </div>

          {/* Error Alert */}
          {errorMsg && (
            <div style={{
              background: '#FEE2E2',
              color: '#DC2626',
              padding: '10px 14px',
              borderRadius: '8px',
              marginBottom: '14px',
              fontSize: '14px',
              fontWeight: '600'
            }}>
              {errorMsg}
            </div>
          )}

          {/* Income / Expense Toggle Switch */}
          <div className="type-toggle-bar" style={{ display: 'flex', background: '#F1F5F9', borderRadius: '10px', padding: '4px', marginBottom: '20px' }}>
            <button
              type="button"
              className={`type-toggle-btn ${type === 'INCOME' ? 'active income' : ''}`}
              onClick={() => setType('INCOME')}
              style={{
                flex: 1,
                padding: '12px 0',
                border: 'none',
                borderRadius: '8px',
                fontSize: '17px',
                fontWeight: '800',
                cursor: 'pointer',
                background: type === 'INCOME' ? '#16A34A' : 'transparent',
                color: type === 'INCOME' ? '#FFFFFF' : '#64748B'
              }}
            >
              {t('income')}
            </button>
            <button
              type="button"
              className={`type-toggle-btn ${type === 'EXPENSE' ? 'active expense' : ''}`}
              onClick={() => setType('EXPENSE')}
              style={{
                flex: 1,
                padding: '12px 0',
                border: 'none',
                borderRadius: '8px',
                fontSize: '17px',
                fontWeight: '800',
                cursor: 'pointer',
                background: type === 'EXPENSE' ? '#DC2626' : 'transparent',
                color: type === 'EXPENSE' ? '#FFFFFF' : '#64748B'
              }}
            >
              {t('expense')}
            </button>
          </div>

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* 1. Transaction Name Field with Autocomplete */}
            <div className="sheet-field-group">
              <label className="sheet-field-label" style={{ fontSize: '14px', fontWeight: '700', color: '#1E293B' }}>
                1 &nbsp; {t('transactionName')}
              </label>
              <TransactionNameAutocomplete
                className="sheet-input"
                placeholder={t('enterTransactionName')}
                value={name}
                onChange={(val) => setName(val)}
                inputStyle={{
                  width: '100%',
                  padding: '14px 16px',
                  fontSize: '16px',
                  borderRadius: '10px',
                  border: '1.5px solid #CBD5E1',
                  outline: 'none',
                  background: '#FAFAFA'
                }}
                required
              />
            </div>

            {/* 2. Amount Field */}
            <div className="sheet-field-group">
              <label className="sheet-field-label" style={{ fontSize: '14px', fontWeight: '700', color: '#1E293B' }}>
                2 &nbsp; {t('amount')}
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{ position: 'absolute', left: '16px', fontSize: '24px', fontWeight: '800', color: '#1E293B' }}>₹</span>
                <input
                  type="number"
                  step="any"
                  className="sheet-input amount"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '14px 16px 14px 40px',
                    fontSize: '24px',
                    fontWeight: '800',
                    borderRadius: '10px',
                    border: '1.5px solid #CBD5E1',
                    outline: 'none',
                    background: '#FAFAFA'
                  }}
                  required
                />
              </div>
            </div>

            {/* 3. Description Field (Optional) */}
            <div className="sheet-field-group">
              <label className="sheet-field-label" style={{ fontSize: '14px', fontWeight: '700', color: '#1E293B' }}>
                3 &nbsp; {t('descriptionOptional')}
              </label>
              <input
                type="text"
                className="sheet-input"
                placeholder={t('enterDescription')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  fontSize: '15px',
                  borderRadius: '10px',
                  border: '1.5px solid #CBD5E1',
                  outline: 'none',
                  background: '#FAFAFA'
                }}
              />
            </div>

            {/* 4. Payment Method Field */}
            <div className="sheet-field-group">
              <label className="sheet-field-label" style={{ fontSize: '14px', fontWeight: '700', color: '#1E293B' }}>
                4 &nbsp; {t('paymentMethod')}
              </label>
              <select
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
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  fontSize: '15px',
                  fontWeight: '600',
                  borderRadius: '10px',
                  border: '1.5px solid #CBD5E1',
                  outline: 'none',
                  background: '#FAFAFA',
                  color: '#1E293B'
                }}
              >
                <option value="CASH">Cash (Modifies Cash at Home)</option>
                <option value="UPI">UPI</option>
              </select>

              {/* Conditional Bank Account Selector when UPI is chosen */}
              {paymentMethod === 'UPI' && (
                <div style={{ marginTop: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '700', color: '#1E293B' }}>
                      {t('bankAccount')} *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setQuickBankError('');
                        setQuickBankName('');
                        setQuickOpeningBalance('');
                        setShowAddBankModal(true);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#16247B',
                        fontSize: '13px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}
                    >
                      <Plus size={14} /> {t('addBankAccount')}
                    </button>
                  </div>

                  <select
                    value={accountId}
                    onChange={(e) => {
                      if (e.target.value === '__ADD_NEW__') {
                        setQuickBankError('');
                        setQuickBankName('');
                        setQuickOpeningBalance('');
                        setShowAddBankModal(true);
                      } else {
                        setAccountId(e.target.value);
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      fontSize: '15px',
                      fontWeight: '600',
                      borderRadius: '10px',
                      border: !accountId ? '2px solid #F59E0B' : '1.5px solid #CBD5E1',
                      outline: 'none',
                      background: '#FAFAFA',
                      color: '#1E293B'
                    }}
                    required
                  >
                    <option value="" disabled>-- {t('selectBankAccount')} --</option>
                    {bankAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} (₹{Math.round(acc.expectedBalance || 0).toLocaleString('en-IN')})
                      </option>
                    ))}
                    <option value="__ADD_NEW__">+ {t('addBankAccount')}</option>
                  </select>

                  {!accountId && (
                    <div style={{ fontSize: '12px', color: '#D97706', marginTop: '4px', fontWeight: '600' }}>
                      ⚠️ Please select or add a bank account for this UPI transaction.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 5. Date Field */}
            <div className="sheet-field-group">
              <label className="sheet-field-label" style={{ fontSize: '14px', fontWeight: '700', color: '#1E293B' }}>
                5 &nbsp; {t('date')}
              </label>
              <input
                type="date"
                className="sheet-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  fontSize: '15px',
                  fontWeight: '600',
                  borderRadius: '10px',
                  border: '1.5px solid #CBD5E1',
                  outline: 'none',
                  background: '#FAFAFA',
                  color: '#1E293B'
                }}
                required
              />
            </div>

            {/* Primary Save Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '16px',
                background: '#16247B',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '12px',
                fontSize: '17px',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '8px'
              }}
            >
              <Save size={20} />
              {loading ? '...' : (type === 'INCOME' ? t('saveIncome') : t('saveExpense'))}
            </button>

            {/* Cancel Button */}
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                width: '100%',
                padding: '10px',
                background: 'transparent',
                color: '#64748B',
                border: 'none',
                fontSize: '15px',
                fontWeight: '700',
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              {t('cancel')}
            </button>
          </form>

          {/* Delete Option (When editing an existing entry) */}
          {editTx && (
            <button
              type="button"
              onClick={() => setShowConfirmDelete(true)}
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                background: '#FEE2E2',
                color: '#DC2626',
                border: '1px solid #FECDD3',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: '700',
                cursor: 'pointer',
                marginTop: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Trash2 size={18} />
              {t('delete')}
            </button>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showConfirmDelete && (
        <div className="confirm-backdrop" onClick={() => setShowConfirmDelete(false)} style={{ zIndex: 100001 }}>
          <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-text">{t('confirmDeleteTx')}</div>
            <div className="confirm-actions">
              <button
                className="confirm-btn cancel"
                onClick={() => setShowConfirmDelete(false)}
                disabled={loading}
              >
                {t('cancel')}
              </button>
              <button
                className="confirm-btn delete"
                onClick={handleDelete}
                disabled={loading}
              >
                {loading ? '...' : t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}
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
    </>,
    document.body
  );
}
