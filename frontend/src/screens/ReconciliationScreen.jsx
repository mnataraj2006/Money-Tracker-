import React from 'react';
import { CheckCircle, AlertTriangle, Info, ArrowLeft, RefreshCw, Moon } from 'lucide-react';

export default function ReconciliationScreen({ reconciliation, onRecount, onCloseDay, onBackHome }) {
  const rec = reconciliation || {
    expectedCash: 15600,
    physicalCash: 15600,
    difference: 0,
    status: 'TALLIED'
  };

  const formatCurrency = (val) => `₹${Math.abs(val || 0).toLocaleString('en-IN')}`;

  const isTallied = rec.difference === 0;
  const isShort = rec.difference < 0;
  const isExtra = rec.difference > 0;

  return (
    <div className="screen-container">
      {/* Header */}
      <div className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="app-header-icon" onClick={onBackHome}>
            <ArrowLeft size={20} />
          </div>
          <span className="app-title-text">Reconciliation</span>
        </div>
      </div>

      {/* Top Banner Card */}
      <div style={{
        backgroundColor: isTallied ? '#BBF7D0' : (isShort ? '#FEE2E2' : '#FEF3C7'),
        borderRadius: 'var(--radius-lg)',
        padding: '24px 16px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px'
      }}>
        <div style={{
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          backgroundColor: isTallied ? '#16A34A' : (isShort ? '#DC2626' : '#D97706'),
          color: '#FFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {isTallied && <CheckCircle size={32} />}
          {isShort && <AlertTriangle size={32} />}
          {isExtra && <Info size={32} />}
        </div>

        <h2 style={{
          fontSize: '22px',
          fontWeight: '800',
          color: isTallied ? '#14532D' : (isShort ? '#7F1D1D' : '#78350F')
        }}>
          {isTallied && '✓ CASH TALLIED'}
          {isShort && `⚠ CASH SHORT BY ${formatCurrency(rec.difference)}`}
          {isExtra && `ℹ CASH EXTRA BY ${formatCurrency(rec.difference)}`}
        </h2>

        <p style={{
          fontSize: '13px',
          fontWeight: '600',
          color: isTallied ? '#15803D' : (isShort ? '#991B1B' : '#92400E')
        }}>
          {isTallied && 'Reconciliation completed successfully'}
          {isShort && 'Physical cash is lower than recorded expected cash'}
          {isExtra && 'Physical cash is higher than recorded expected cash'}
        </p>
      </div>

      {/* Expected Cash Card */}
      <div className="stitch-card">
        <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '0.8px' }}>
          EXPECTED CASH
        </div>
        <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-main)', marginTop: '4px' }}>
          {formatCurrency(rec.expectedCash)}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
          Based on recorded transactions
        </div>
      </div>

      {/* Physical Cash Card */}
      <div className="stitch-card">
        <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '0.8px' }}>
          PHYSICAL CASH
        </div>
        <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-main)', marginTop: '4px' }}>
          {formatCurrency(rec.physicalCash)}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
          @ Amount entered manually
        </div>
      </div>

      {/* Difference Card */}
      <div className="stitch-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '0.8px' }}>
            DIFFERENCE
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: isTallied ? 'var(--text-main)' : (isShort ? 'var(--red-expense)' : 'var(--green-income)'), marginTop: '4px' }}>
            ₹{rec.difference.toLocaleString('en-IN')}
          </div>
        </div>

        <div className={`badge-pill ${isTallied ? 'tallied' : (isShort ? 'short' : 'extra')}`}>
          {isTallied ? 'Perfectly Balanced' : (isShort ? 'Cash Shortage' : 'Cash Surplus')}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
        <button className="btn-primary-navy" onClick={onCloseDay}>
          <Moon size={18} /> Proceed to Daily Closing
        </button>

        <button className="btn-outline-navy" onClick={onRecount}>
          <RefreshCw size={18} /> Recount Cash
        </button>
      </div>
    </div>
  );
}
