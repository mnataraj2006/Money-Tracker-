import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calculator } from 'lucide-react';
import { cashAPI } from '../services/api';

export default function CountCashScreen({ onBack, onReconciliationSuccess, targetDate }) {
  const [counts, setCounts] = useState({
    n500: '',
    n200: '',
    n100: '',
    n50: '',
    n20: '',
    n10: '',
    n5: '',
    n2: '',
    n1: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPreviousCounts();
  }, [targetDate]);

  const loadPreviousCounts = async () => {
    try {
      const dateToUse = targetDate || new Date().toISOString().split('T')[0];
      const res = await cashAPI.getExpected(dateToUse);
      if (res && res.counts) {
        setCounts({
          n500: res.counts.n500 ? String(res.counts.n500) : '',
          n200: res.counts.n200 ? String(res.counts.n200) : '',
          n100: res.counts.n100 ? String(res.counts.n100) : '',
          n50: res.counts.n50 ? String(res.counts.n50) : '',
          n20: res.counts.n20 ? String(res.counts.n20) : '',
          n10: res.counts.n10 ? String(res.counts.n10) : '',
          n5: res.counts.n5 ? String(res.counts.n5) : '',
          n2: res.counts.n2 ? String(res.counts.n2) : '',
          n1: res.counts.n1 ? String(res.counts.n1) : ''
        });
      }
    } catch (err) {
      console.error('Failed to load previous count log:', err);
    }
  };

  const denominations = [
    { key: 'n500', value: 500, label: '₹ 500' },
    { key: 'n200', value: 200, label: '₹ 200' },
    { key: 'n100', value: 100, label: '₹ 100' },
    { key: 'n50', value: 50, label: '₹ 50' },
    { key: 'n20', value: 20, label: '₹ 20' },
    { key: 'n10', value: 10, label: '₹ 10' },
    { key: 'n5', value: 5, label: '₹ 5' },
    { key: 'n2', value: 2, label: '₹ 2' },
    { key: 'n1', value: 1, label: '₹ 1' }
  ];

  const handleQtyChange = (key, val) => {
    const qty = val === '' ? '' : Math.max(0, parseInt(val) || 0);
    setCounts((prev) => ({ ...prev, [key]: qty }));
  };

  const calculateSubtotal = (denomValue, qtyStr) => {
    const qty = parseInt(qtyStr) || 0;
    return denomValue * qty;
  };

  const totalPhysicalCash = denominations.reduce((sum, denom) => {
    return sum + calculateSubtotal(denom.value, counts[denom.key]);
  }, 0);

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      const payload = {
        date: targetDate || new Date().toISOString().split('T')[0],
        n500: parseInt(counts.n500) || 0,
        n200: parseInt(counts.n200) || 0,
        n100: parseInt(counts.n100) || 0,
        n50: parseInt(counts.n50) || 0,
        n20: parseInt(counts.n20) || 0,
        n10: parseInt(counts.n10) || 0,
        n5: parseInt(counts.n5) || 0,
        n2: parseInt(counts.n2) || 0,
        n1: parseInt(counts.n1) || 0
      };

      const res = await cashAPI.saveCount(payload);
      onReconciliationSuccess(res.reconciliation);
    } catch (err) {
      setError(err.message || 'Failed to check cash reconciliation');
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
          <span className="app-title-text">Count Cash</span>
        </div>
      </div>

      <div style={{ textAlign: 'center', margin: '4px 0 12px 0' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-main)' }}>
          Count Cash
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
          Enter how many notes and coins you have.
        </p>
      </div>

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

      {/* Denominations List */}
      <div className="stitch-card" style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {denominations.map((denom) => {
          const subtotal = calculateSubtotal(denom.value, counts[denom.key]);
          return (
            <div
              key={denom.key}
              style={{
                display: 'grid',
                gridTemplateColumns: '80px 1fr 90px',
                alignItems: 'center',
                padding: '8px 0',
                borderBottom: denom.key !== 'n1' ? '1px solid var(--border-color)' : 'none'
              }}
            >
              <span style={{ fontSize: '15px', fontWeight: '800', color: 'var(--navy-primary)' }}>
                {denom.label}
              </span>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>×</span>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={counts[denom.key]}
                  onChange={(e) => handleQtyChange(denom.key, e.target.value)}
                  style={{
                    width: '64px',
                    height: '38px',
                    textAlign: 'center',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '700',
                    outline: 'none',
                    backgroundColor: 'var(--bg-input)'
                  }}
                />
              </div>

              <span style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)', textAlign: 'right' }}>
                = ₹{subtotal.toLocaleString('en-IN')}
              </span>
            </div>
          );
        })}
      </div>

      {/* Sticky Physical Cash Bottom Bar */}
      <div className="stitch-card" style={{ marginTop: '12px', padding: '16px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '0.8px' }}>
            PHYSICAL CASH
          </div>
          <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--navy-primary)', marginTop: '2px' }}>
            ₹{totalPhysicalCash.toLocaleString('en-IN')}
          </div>
        </div>

        <button className="btn-primary-navy" onClick={handleSubmit} disabled={loading}>
          <Calculator size={18} /> {loading ? 'Calculating...' : 'Check Cash'}
        </button>
      </div>
    </div>
  );
}
