import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowDownToLine, AlertCircle, Building, CheckCircle } from 'lucide-react';
import { bankAccountsAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useDataCache } from '../context/DataContext';
import { useRegisterModal } from '../context/NavigationContext';

export default function CashWithdrawalModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedBankId = null
}) {
  const { t } = useLanguage();
  const { clearCache } = useDataCache();

  useRegisterModal(isOpen, onClose, 'CashWithdrawalModal');

  const todayStr = new Date().toISOString().split('T')[0];

  const [bankAccounts, setBankAccounts] = useState([]);
  const [bankAccountId, setBankAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(todayStr);

  const [loading, setLoading] = useState(false);
  const [fetchingAccounts, setFetchingAccounts] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successToast, setSuccessToast] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadAccounts();
      setAmount('');
      setDescription('');
      setDate(todayStr);
      setErrorMsg('');
      setSuccessToast(false);
    }
  }, [isOpen]);

  const loadAccounts = async () => {
    try {
      setFetchingAccounts(true);
      const res = await bankAccountsAPI.getAll();
      const accounts = res.bankAccounts || [];
      setBankAccounts(accounts);

      if (preselectedBankId && accounts.some(a => a.id === preselectedBankId)) {
        setBankAccountId(preselectedBankId);
      } else if (accounts.length > 0) {
        setBankAccountId(accounts[0].id);
      } else {
        setBankAccountId('');
      }
    } catch (err) {
      console.error('Failed to load bank accounts for withdrawal:', err);
      setErrorMsg('Failed to load bank accounts');
    } finally {
      setFetchingAccounts(false);
    }
  };

  if (!isOpen) return null;

  const selectedAccount = bankAccounts.find(a => a.id === bankAccountId);
  const selectedBalance = selectedAccount ? (selectedAccount.expectedBalance || 0) : 0;
  const numAmount = parseFloat(amount) || 0;
  const isOverdrawn = numAmount > selectedBalance;

  const formatCurrency = (val) => `₹${Math.round(val || 0).toLocaleString('en-IN')}`;

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    if (!bankAccountId) {
      setErrorMsg(t('selectBankAccount') || 'Please select a bank account');
      return;
    }

    if (!amount || numAmount <= 0) {
      setErrorMsg('Please enter a valid amount greater than 0');
      return;
    }

    if (isOverdrawn) {
      setErrorMsg(t('insufficientBankBalance') || 'Insufficient bank balance');
      return;
    }

    try {
      setLoading(true);
      await bankAccountsAPI.withdrawCash({
        bankAccountId,
        amount: numAmount,
        description: description.trim(),
        date: date || todayStr
      });

      clearCache();
      setSuccessToast(true);

      if (onSuccess) {
        onSuccess();
      }

      setTimeout(() => {
        onClose();
      }, 350);
    } catch (err) {
      console.error('Failed to record cash withdrawal:', err);
      setErrorMsg(err.message || t('cashWithdrawalFailed') || 'Failed to record cash withdrawal');
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          backgroundColor: '#FFFFFF',
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px',
          padding: '24px 20px',
          boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.2)',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxSizing: 'border-box'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                backgroundColor: 'var(--navy-primary, #1E293B)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF'
              }}
            >
              <ArrowDownToLine size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main, #0F172A)', margin: 0 }}>
                {t('cashWithdrawal') || 'Cash Withdrawal'}
              </h2>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary, #64748B)', fontWeight: '600' }}>
                {t('cashWithdrawalSubtitle') || 'Bank Account → Physical Cash'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#F1F5F9',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#475569'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Error / Success Alerts */}
        {errorMsg && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#FEE2E2',
              color: '#DC2626',
              padding: '12px 14px',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: '700',
              marginBottom: '16px'
            }}
          >
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successToast && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#DCFCE7',
              color: '#16A34A',
              padding: '12px 14px',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: '700',
              marginBottom: '16px'
            }}
          >
            <CheckCircle size={18} />
            <span>{t('cashWithdrawalSuccess') || 'Cash withdrawal recorded successfully'}</span>
          </div>
        )}

        {/* Form */}
        {bankAccounts.length === 0 && !fetchingAccounts ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748B' }}>
            <Building size={36} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
            <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' }}>
              {t('noBankAccountsAvailable') || 'No bank accounts available'}
            </div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>
              {t('addBankFirst') || 'Please add a bank account first to withdraw cash.'}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* 1. BANK ACCOUNT FIELD */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-main, #0F172A)', marginBottom: '6px' }}>
                {t('selectBankAccount') || '1. Bank Account'} *
              </label>
              <select
                value={bankAccountId}
                onChange={(e) => {
                  setBankAccountId(e.target.value);
                  setErrorMsg('');
                }}
                disabled={loading}
                className="input-control"
                style={{
                  width: '100%',
                  height: '46px',
                  borderRadius: '12px',
                  border: '1px solid #CBD5E1',
                  padding: '0 12px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'var(--text-main)',
                  backgroundColor: '#F8FAFC',
                  outline: 'none'
                }}
              >
                {bankAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({formatCurrency(acc.expectedBalance)})
                  </option>
                ))}
              </select>
              {selectedAccount && (
                <div style={{ fontSize: '12px', color: '#64748B', fontWeight: '600', marginTop: '4px' }}>
                  Available Balance: <strong style={{ color: selectedBalance >= 0 ? '#16A34A' : '#DC2626' }}>{formatCurrency(selectedBalance)}</strong>
                </div>
              )}
            </div>

            {/* 2. AMOUNT FIELD */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-main, #0F172A)', marginBottom: '6px' }}>
                {t('amount') || '2. Amount'} *
              </label>
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '18px',
                    fontWeight: '800',
                    color: isOverdrawn ? '#DC2626' : 'var(--text-main)'
                  }}
                >
                  ₹
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setErrorMsg('');
                  }}
                  disabled={loading}
                  autoFocus
                  className="input-control"
                  style={{
                    width: '100%',
                    height: '52px',
                    borderRadius: '12px',
                    border: isOverdrawn ? '2px solid #DC2626' : '1px solid #CBD5E1',
                    padding: '0 14px 0 34px',
                    fontSize: '20px',
                    fontWeight: '800',
                    color: isOverdrawn ? '#DC2626' : 'var(--text-main)',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>
              {isOverdrawn && (
                <div style={{ fontSize: '12px', color: '#DC2626', fontWeight: '700', marginTop: '4px' }}>
                  ⚠ {t('insufficientBankBalance') || 'Insufficient bank balance'} (Max: {formatCurrency(selectedBalance)})
                </div>
              )}
            </div>

            {/* 3. DESCRIPTION FIELD (OPTIONAL) */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-main, #0F172A)', marginBottom: '6px' }}>
                {t('descriptionOptional') || '3. Description (Optional)'}
              </label>
              <input
                type="text"
                placeholder="e.g. ATM withdrawal / Petty cash"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
                className="input-control"
                style={{
                  width: '100%',
                  height: '46px',
                  borderRadius: '12px',
                  border: '1px solid #CBD5E1',
                  padding: '0 14px',
                  fontSize: '14px',
                  fontWeight: '600',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              />
            </div>

            {/* 4. DATE FIELD */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-main, #0F172A)', marginBottom: '6px' }}>
                {t('date') || '4. Date'} *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={loading}
                className="input-control"
                style={{
                  width: '100%',
                  height: '46px',
                  borderRadius: '12px',
                  border: '1px solid #CBD5E1',
                  padding: '0 14px',
                  fontSize: '14px',
                  fontWeight: '600',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              />
            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={loading || !bankAccountId || !amount || numAmount <= 0 || isOverdrawn}
              className="btn-primary-navy"
              style={{
                width: '100%',
                height: '50px',
                borderRadius: '14px',
                fontSize: '15px',
                fontWeight: '800',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: (loading || isOverdrawn || !amount) ? 'not-allowed' : 'pointer',
                opacity: (loading || isOverdrawn || !amount) ? 0.6 : 1,
                marginTop: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              <ArrowDownToLine size={18} />
              {loading ? (t('withdrawing') || 'Withdrawing...') : (t('withdrawCash') || 'Withdraw Cash')}
            </button>
          </form>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
