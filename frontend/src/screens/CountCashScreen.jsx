import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, AlertTriangle, AlertCircle, Calculator } from 'lucide-react';
import { cashAPI } from '../services/api';
import { useDataCache } from '../context/DataContext';
import { useLanguage } from '../context/LanguageContext';

export default function CountCashScreen({ onBack, onReconciliationSuccess, targetDate }) {
  const { t } = useLanguage();
  const { clearCache } = useDataCache();

  const [expectedCash, setExpectedCash] = useState(0);
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
  const [fetchingExpected, setFetchingExpected] = useState(true);
  const [error, setError] = useState('');

  const dateToUse = targetDate || new Date().toISOString().split('T')[0];

  useEffect(() => {
    loadCashData();
  }, [dateToUse]);

  const loadCashData = async () => {
    try {
      setFetchingExpected(true);
      setError('');
      const res = await cashAPI.getExpected(dateToUse);
      if (res) {
        setExpectedCash(res.expectedCash ?? 0);
        if (res.counts) {
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
      }
    } catch (err) {
      console.error('Failed to load cash data:', err);
      setError(err.message || 'Failed to load expected cash');
    } finally {
      setFetchingExpected(false);
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
    // Only accept non-negative integer or empty string
    if (val === '') {
      setCounts((prev) => ({ ...prev, [key]: '' }));
      return;
    }
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      setCounts((prev) => ({ ...prev, [key]: String(parsed) }));
    }
  };

  const calculateSubtotal = (denomValue, qtyStr) => {
    const qty = parseInt(qtyStr, 10) || 0;
    return denomValue * qty;
  };

  const totalPhysicalCash = denominations.reduce((sum, denom) => {
    return sum + calculateSubtotal(denom.value, counts[denom.key]);
  }, 0);

  const difference = totalPhysicalCash - expectedCash;

  const formatCurrency = (val) => `₹${Math.abs(val || 0).toLocaleString('en-IN')}`;

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      const payload = {
        date: dateToUse,
        n500: parseInt(counts.n500, 10) || 0,
        n200: parseInt(counts.n200, 10) || 0,
        n100: parseInt(counts.n100, 10) || 0,
        n50: parseInt(counts.n50, 10) || 0,
        n20: parseInt(counts.n20, 10) || 0,
        n10: parseInt(counts.n10, 10) || 0,
        n5: parseInt(counts.n5, 10) || 0,
        n2: parseInt(counts.n2, 10) || 0,
        n1: parseInt(counts.n1, 10) || 0
      };

      const res = await cashAPI.saveCount(payload);
      clearCache();

      if (onReconciliationSuccess) {
        onReconciliationSuccess(res.reconciliation);
      } else {
        onBack();
      }
    } catch (err) {
      setError(err.message || 'Failed to save cash count');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen-container">
      {/* Header */}
      <div className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="app-header-icon" onClick={onBack} style={{ cursor: 'pointer' }}>
            <ArrowLeft size={20} />
          </div>
          <span className="app-title-text">{t('countCash')}</span>
        </div>
      </div>

      {/* Prominent Expected Cash Header Card */}
      <div className="navy-card" style={{ padding: '20px', borderRadius: '16px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ fontSize: '12px', fontWeight: '800', opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          {t('expectedCash')}
        </div>
        <div style={{ fontSize: '32px', fontWeight: '800', color: '#FFFFFF', letterSpacing: '-0.5px' }}>
          {fetchingExpected ? '...' : `₹${expectedCash.toLocaleString('en-IN')}`}
        </div>
        <div style={{ fontSize: '13px', opacity: 0.9, marginTop: '2px' }}>
          {t('enterNotesAndCoins')}
        </div>
      </div>

      {error && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#FEE2E2',
          color: '#DC2626',
          borderRadius: '12px',
          fontSize: '13px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Denominations List Card */}
      <div className="stitch-card" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {denominations.map((denom) => {
          const subtotal = calculateSubtotal(denom.value, counts[denom.key]);
          return (
            <div
              key={denom.key}
              style={{
                display: 'grid',
                gridTemplateColumns: '70px 1fr 100px',
                alignItems: 'center',
                padding: '10px 0',
                borderBottom: denom.key !== 'n1' ? '1px solid var(--border-color)' : 'none'
              }}
            >
              <span style={{ fontSize: '16px', fontWeight: '800', color: 'var(--navy-primary)' }}>
                {denom.label}
              </span>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span style={{ fontSize: '15px', color: 'var(--text-muted)', fontWeight: '600' }}>×</span>
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min="0"
                  placeholder="0"
                  value={counts[denom.key]}
                  onChange={(e) => handleQtyChange(denom.key, e.target.value)}
                  style={{
                    width: '72px',
                    height: '42px',
                    textAlign: 'center',
                    border: '1.5px solid var(--border-color)',
                    borderRadius: '10px',
                    fontSize: '16px',
                    fontWeight: '800',
                    outline: 'none',
                    backgroundColor: 'var(--bg-input)',
                    color: 'var(--text-main)'
                  }}
                />
              </div>

              <span style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', textAlign: 'right' }}>
                = ₹{subtotal.toLocaleString('en-IN')}
              </span>
            </div>
          );
        })}
      </div>

      {/* Physical Cash Summary & Real-time Validation Card */}
      <div className="stitch-card" style={{ padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Physical Cash Total */}
        <div style={{ textAlign: 'center', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
            {t('physicalCash')}
          </div>
          <div style={{ fontSize: '34px', fontWeight: '800', color: 'var(--navy-primary)', marginTop: '2px', letterSpacing: '-0.5px' }}>
            ₹{totalPhysicalCash.toLocaleString('en-IN')}
          </div>
        </div>

        {/* Real-time Validation Comparison (3 States) */}
        <div style={{
          backgroundColor: difference === 0 ? '#DCFCE7' : (difference < 0 ? '#FEE2E2' : '#FEF3C7'),
          borderRadius: '12px',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '14px',
              fontWeight: '800',
              color: difference === 0 ? '#15803D' : (difference < 0 ? '#B91C1C' : '#B45309')
            }}>
              {difference === 0 && <CheckCircle size={18} />}
              {difference < 0 && <AlertTriangle size={18} />}
              {difference > 0 && <AlertCircle size={18} />}
              <span>
                {difference === 0 ? (t('cashMatched') || '✓ CASH MATCHED') : (difference < 0 ? (t('cashShort') || '⚠ CASH SHORT') : (t('cashExtra') || '⚠ CASH EXTRA'))}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-main)', fontWeight: '600' }}>
            <span>{t('expectedCash')}</span>
            <span style={{ fontWeight: '700' }}>₹{expectedCash.toLocaleString('en-IN')}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-main)', fontWeight: '600' }}>
            <span>{t('physicalCash')}</span>
            <span style={{ fontWeight: '700' }}>₹{totalPhysicalCash.toLocaleString('en-IN')}</span>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '14px',
            fontWeight: '800',
            paddingTop: '6px',
            borderTop: '1px dashed rgba(0,0,0,0.15)',
            color: difference === 0 ? '#15803D' : (difference < 0 ? '#B91C1C' : '#B45309')
          }}>
            <span>{t('difference')}</span>
            <span>
              {difference === 0 ? '₹0' : (difference < 0 ? `-${formatCurrency(difference)}` : `+${formatCurrency(difference)}`)}
            </span>
          </div>
        </div>

        {/* Confirm Button */}
        <button
          className="btn-primary-navy"
          onClick={handleSubmit}
          disabled={loading || fetchingExpected}
          style={{
            height: '52px',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: '800',
            marginTop: '4px'
          }}
        >
          {loading ? (t('saving') || 'Saving...') : (t('confirmCashCount') || '✓ Confirm Cash Count')}
        </button>
      </div>
    </div>
  );
}
