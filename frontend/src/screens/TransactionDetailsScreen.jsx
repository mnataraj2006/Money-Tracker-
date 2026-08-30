import React, { useState, useEffect } from 'react';
import { ArrowLeft, Edit, Trash2, ShoppingBag, Coffee, Utensils, Briefcase, CreditCard } from 'lucide-react';
import { transactionsAPI, bankAccountsAPI } from '../services/api';
import { useDataCache } from '../context/DataContext';
import { useLanguage } from '../context/LanguageContext';

export default function TransactionDetailsScreen({ txId, onBack, onNavigate }) {
  const { clearCache } = useDataCache();
  const { t } = useLanguage();
  const [tx, setTx] = useState(null);
  const [bankName, setBankName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (txId) loadTransaction();
  }, [txId]);

  const loadTransaction = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await transactionsAPI.getById(txId);
      const loadedTx = data.transaction;
      setTx(loadedTx);

      if (loadedTx && loadedTx.accountId && loadedTx.accountId !== 'CASH') {
        try {
          const bankData = await bankAccountsAPI.getById(loadedTx.accountId);
          if (bankData?.bankAccount?.name) {
            setBankName(bankData.bankAccount.name);
          }
        } catch {
          // ignore if bank not found
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load transaction');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t('confirmDeleteTx') || 'Are you sure you want to delete this transaction?')) return;
    try {
      await transactionsAPI.delete(txId);
      clearCache();
      onBack();
    } catch (err) {
      alert(err.message || 'Failed to delete transaction');
    }
  };

  const formatCurrency = (val) => `₹${(val || 0).toLocaleString('en-IN')}`;

  const getCategoryIcon = (category, type) => {
    const cat = (category || '').toLowerCase();
    if (cat.includes('salary') || cat.includes('income')) return <Briefcase size={28} color="#16A34A" />;
    if (cat.includes('food') || cat.includes('breakfast')) return <Utensils size={28} color="#DC2626" />;
    if (cat.includes('grocery') || cat.includes('shopping')) return <ShoppingBag size={28} color="#DC2626" />;
    if (cat.includes('coffee')) return <Coffee size={28} color="#DC2626" />;
    return <CreditCard size={28} color={type === 'INCOME' ? '#16A34A' : '#DC2626'} />;
  };

  if (loading) {
    return (
      <div className="screen-container" style={{ justifyContent: 'center', textAlign: 'center' }}>
        {t('loading') || 'Loading details...'}
      </div>
    );
  }

  if (!tx) {
    return (
      <div className="screen-container" style={{ textAlign: 'center', padding: '40px 0' }}>
        {error || 'Transaction not found.'}
        <button className="btn-primary-navy" onClick={onBack} style={{ marginTop: '16px' }}>
          {t('back') || 'Back'}
        </button>
      </div>
    );
  }

  const txTitle = tx.transactionName || tx.name || t('unnamedTransaction');
  const hasDescription = tx.description && typeof tx.description === 'string' && tx.description.trim() !== '' && tx.description !== 'string';

  return (
    <div className="screen-container">
      {/* Header */}
      <div className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="app-header-icon" onClick={onBack} style={{ cursor: 'pointer' }}>
            <ArrowLeft size={20} />
          </div>
          <span className="app-title-text">{t('transactionDetails')}</span>
        </div>
      </div>

      {/* Main Details Header Card */}
      <div className="stitch-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '24px 16px' }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: tx.type === 'INCOME' ? 'var(--green-income-bg)' : 'var(--red-expense-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {getCategoryIcon(tx.category, tx.type)}
        </div>

        <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', textAlign: 'center', wordBreak: 'break-word' }}>
          {txTitle}
        </div>

        <div style={{
          fontSize: '32px',
          fontWeight: '800',
          color: tx.type === 'INCOME' ? 'var(--green-income)' : 'var(--red-expense)'
        }}>
          {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
        </div>

        <div style={{
          padding: '4px 14px',
          borderRadius: 'var(--radius-pill)',
          backgroundColor: 'var(--bg-app)',
          color: 'var(--text-secondary)',
          fontSize: '12px',
          fontWeight: '700'
        }}>
          {tx.date} • {tx.paymentMethod === 'CASH' ? t('cash') : 'UPI'} {bankName ? `• ${bankName}` : ''}
        </div>
      </div>

      {/* Metadata Rows Card */}
      <div className="stitch-card" style={{ padding: '8px 16px' }}>
        {/* 1. Transaction Name */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--border-color)', gap: '12px' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600', flexShrink: 0 }}>
            {t('transactionName')}
          </span>
          <span style={{ color: 'var(--text-main)', fontSize: '13px', fontWeight: '700', textAlign: 'right', wordBreak: 'break-word' }}>
            {txTitle}
          </span>
        </div>

        {/* 2. Description (Shown only when present) */}
        {hasDescription && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--border-color)', gap: '12px' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600', flexShrink: 0 }}>
              {t('description')}
            </span>
            <span style={{ color: 'var(--text-main)', fontSize: '13px', fontWeight: '700', textAlign: 'right', wordBreak: 'break-word' }}>
              {tx.description.trim()}
            </span>
          </div>
        )}

        {/* 3. Payment Method */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--border-color)' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>
            {t('paymentMethod')}
          </span>
          <span style={{ color: 'var(--text-main)', fontSize: '13px', fontWeight: '700' }}>
            {tx.paymentMethod === 'CASH' ? t('cash') : 'UPI'}
          </span>
        </div>

        {/* 4. Bank Account (If UPI) */}
        {bankName && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--border-color)' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>
              {t('bankAccount')}
            </span>
            <span style={{ color: 'var(--text-main)', fontSize: '13px', fontWeight: '700' }}>
              {bankName}
            </span>
          </div>
        )}

        {/* 5. Date */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--border-color)' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>
            {t('date')}
          </span>
          <span style={{ color: 'var(--text-main)', fontSize: '13px', fontWeight: '700' }}>
            {tx.date}
          </span>
        </div>

        {/* 6. Type */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>
            {t('type')}
          </span>
          <span style={{ color: tx.type === 'INCOME' ? 'var(--green-income)' : 'var(--red-expense)', fontSize: '13px', fontWeight: '700' }}>
            {tx.type === 'INCOME' ? t('income') : t('expense')}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
        <button
          className="btn-primary-navy"
          onClick={() => onNavigate(tx.type === 'INCOME' ? 'add-income' : 'add-expense', { editTx: tx })}
        >
          <Edit size={18} /> {t('editTransaction')}
        </button>

        <button className="btn-outline-red" onClick={handleDelete}>
          <Trash2 size={18} /> {t('delete')}
        </button>
      </div>
    </div>
  );
}
