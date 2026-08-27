import React, { useState, useEffect } from 'react';
import { Bell, ArrowDown, ArrowUp, CheckCircle, Calculator, Moon } from 'lucide-react';
import { cashAPI } from '../services/api';
import { useDataCache } from '../context/DataContext';

import PageContainer from '../components/PageContainer';

export default function CashAtHomeScreen({ user, onNavigate }) {
  const { cache, updateCache } = useDataCache();
  const [cashData, setCashData] = useState(cache.cash || null);
  const [loading, setLoading] = useState(!cache.cash);

  useEffect(() => {
    loadCashData();
  }, []);

  const loadCashData = async () => {
    try {
      if (!cache.cash) setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const res = await cashAPI.getExpected(today);
      setCashData(res);
      updateCache('cash', res);
    } catch (err) {
      console.error('Failed to load cash data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) => `₹${(val || 0).toLocaleString('en-IN')}`;

  const expectedCash = cashData?.expectedCash ?? 0;
  const previousCash = cashData?.previousDayCash ?? 0;
  const cashIncome = cashData?.todayCashIncome ?? 0;
  const cashExpense = cashData?.todayCashExpense ?? 0;
  const status = cashData?.status || 'TALLIED';

  return (
    <PageContainer>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">
            Cash at Home
          </h1>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Last check: Today
          </div>
        </div>

        <div className={`badge-pill ${status.toLowerCase()}`}>
          <CheckCircle size={12} />
          <span>✓ {status}</span>
        </div>
      </div>

      {/* Main Cash Flow Breakdown Card */}
      <div className="stitch-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>
            Previous Day Cash
          </span>
          <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)' }}>
            {formatCurrency(previousCash)}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--green-income)', fontWeight: '600' }}>
            <ArrowDown size={16} /> Today's Cash Income
          </div>
          <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--green-income)' }}>
            + {formatCurrency(cashIncome)}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--red-expense)', fontWeight: '600' }}>
            <ArrowUp size={16} /> Today's Cash Expense
          </div>
          <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--red-expense)' }}>
            - {formatCurrency(cashExpense)}
          </span>
        </div>

        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
            EXPECTED CASH
          </span>
          <span style={{ fontSize: '34px', fontWeight: '800', color: 'var(--navy-primary)', letterSpacing: '-0.5px' }}>
            {formatCurrency(expectedCash)}
          </span>
        </div>
      </div>

      {/* Primary Action Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
        <button className="btn-primary-navy" onClick={() => onNavigate('count-cash')}>
          <Calculator size={18} /> Count Cash
        </button>

        <button className="btn-outline-navy" onClick={() => onNavigate('close-day')}>
          <Moon size={18} /> Daily Closing
        </button>
      </div>
    </PageContainer>
  );
}
