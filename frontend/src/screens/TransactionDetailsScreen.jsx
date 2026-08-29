import React, { useState, useEffect } from 'react';
import { ArrowLeft, Edit, Trash2, ShoppingBag, Coffee, Utensils, Briefcase, CreditCard } from 'lucide-react';
import { transactionsAPI } from '../services/api';
import { useDataCache } from '../context/DataContext';

export default function TransactionDetailsScreen({ txId, onBack, onNavigate }) {
  const { clearCache } = useDataCache();
  const [tx, setTx] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (txId) loadTransaction();
  }, [txId]);

  const loadTransaction = async () => {
    try {
      setLoading(true);
      const data = await transactionsAPI.getById(txId);
      setTx(data.transaction);
    } catch (err) {
      setError(err.message || 'Failed to load transaction');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;
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
        Loading details...
      </div>
    );
  }

  if (!tx) {
    return (
      <div className="screen-container" style={{ textAlign: 'center', padding: '40px 0' }}>
        Transaction not found.
        <button className="btn-primary-navy" onClick={onBack} style={{ marginTop: '16px' }}>Back</button>
      </div>
    );
  }

  return (
    <div className="screen-container">
      {/* Header */}
      <div className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="app-header-icon" onClick={onBack}>
            <ArrowLeft size={20} />
          </div>
          <span className="app-title-text">Transaction Details</span>
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

        <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', textAlign: 'center' }}>
          {tx.transactionName || tx.name || 'Unnamed Transaction'}
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
          {tx.date} • {tx.paymentMethod}
        </div>
      </div>

      {/* Metadata Rows Card */}
      <div className="stitch-card" style={{ padding: '8px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--border-color)' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Transaction Name</span>
          <span style={{ color: 'var(--text-main)', fontSize: '13px', fontWeight: '700' }}>
            {tx.transactionName || tx.name || '—'}
          </span>
        </div>


        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--border-color)' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Payment Method</span>
          <span style={{ color: 'var(--text-main)', fontSize: '13px', fontWeight: '700' }}>{tx.paymentMethod}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--border-color)' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Date</span>
          <span style={{ color: 'var(--text-main)', fontSize: '13px', fontWeight: '700' }}>{tx.date}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Type</span>
          <span style={{ color: tx.type === 'INCOME' ? 'var(--green-income)' : 'var(--red-expense)', fontSize: '13px', fontWeight: '700' }}>
            {tx.type}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
        <button
          className="btn-primary-navy"
          onClick={() => onNavigate(tx.type === 'INCOME' ? 'add-income' : 'add-expense', { editTx: tx })}
        >
          <Edit size={18} /> Edit Transaction
        </button>

        <button className="btn-outline-red" onClick={handleDelete}>
          <Trash2 size={18} /> Delete
        </button>
      </div>
    </div>
  );
}
