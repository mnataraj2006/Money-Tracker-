import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle, ArrowDown, ArrowUp, Moon } from 'lucide-react';
import { cashAPI } from '../services/api';

export default function CloseDayScreen({ user, onBack, onCloseSuccess }) {
  const [cashData, setCashData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const res = await cashAPI.getExpected(today);
      setCashData(res);
    } catch (err) {
      console.error('Failed to load close day details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmClose = async () => {
    setClosing(true);
    setError('');
    try {
      const today = new Date().toISOString().split('T')[0];
      await cashAPI.closeDay(today);
      onCloseSuccess();
    } catch (err) {
      setError(err.message || 'Failed to perform daily closing');
    } finally {
      setClosing(false);
    }
  };

  const formatCurrency = (val) => `₹${(val || 0).toLocaleString('en-IN')}`;

  const expectedClosing = cashData?.expectedCash ?? 0;
  const physicalCash = cashData?.physicalCash !== null ? cashData?.physicalCash : expectedClosing;
  const difference = physicalCash - expectedClosing;
  const openingCash = cashData?.previousDayCash ?? 0;
  const cashIncome = cashData?.todayCashIncome ?? 0;
  const cashExpense = cashData?.todayCashExpense ?? 0;
  const netCash = cashIncome - cashExpense;
  const status = cashData?.status || 'TALLIED';

  return (
    <div className="screen-container">
      {/* Header */}
      <div className="app-header">
        <div className="app-header-left">
          <div className="app-avatar-circle">
            {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'M'}
          </div>
          <span className="app-title-text">Money Tracker</span>
        </div>
        <div className="app-header-icon">
          <Bell size={18} />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-main)' }}>
          Close Today
        </h1>
        <div className={`badge-pill ${status.toLowerCase()}`}>
          <CheckCircle size={12} />
          <span>✓ {status}</span>
        </div>
      </div>

      <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
        Closing cash becomes starting cash for tomorrow.
      </p>

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

      {/* Main Closing Summary Card */}
      <div className="stitch-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '0.8px' }}>
            EXPECTED CLOSING
          </div>
          <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-main)', marginTop: '2px' }}>
            {formatCurrency(expectedClosing)}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '0.8px' }}>
            PHYSICAL CASH
          </div>
          <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-main)', marginTop: '2px' }}>
            {formatCurrency(physicalCash)}
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>DIFFERENCE</span>
          <span style={{
            fontSize: '16px',
            fontWeight: '800',
            color: difference === 0 ? 'var(--green-income)' : (difference < 0 ? 'var(--red-expense)' : 'var(--navy-primary)')
          }}>
            {difference >= 0 ? '+' : ''}₹{difference.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Today's Flow Section */}
      <div className="stitch-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)' }}>
          Today's Flow
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--green-income)', fontWeight: '700' }}>
            <ArrowDown size={16} /> Income
          </div>
          <span style={{ fontSize: '15px', fontWeight: '800', color: 'var(--green-income)' }}>
            +{formatCurrency(cashIncome)}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--red-expense)', fontWeight: '700' }}>
            <ArrowUp size={16} /> Expense
          </div>
          <span style={{ fontSize: '15px', fontWeight: '800', color: 'var(--red-expense)' }}>
            -{formatCurrency(cashExpense)}
          </span>
        </div>
      </div>

      {/* Cash Flow Section */}
      <div className="stitch-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)' }}>
          Cash Flow
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>Opening Cash</span>
          <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' }}>{formatCurrency(openingCash)}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>Net Cash (In/Out)</span>
          <span style={{ fontSize: '14px', fontWeight: '800', color: netCash >= 0 ? 'var(--green-income)' : 'var(--red-expense)' }}>
            {netCash >= 0 ? '+' : ''}{formatCurrency(netCash)}
          </span>
        </div>
      </div>

      <button className="btn-primary-navy" onClick={handleConfirmClose} disabled={closing} style={{ marginTop: '8px' }}>
        <Moon size={18} /> {closing ? 'Closing Day...' : 'Confirm Close Day'}
      </button>
    </div>
  );
}
