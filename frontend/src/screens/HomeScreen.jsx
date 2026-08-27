import React, { useState, useEffect } from 'react';
import { Plus, Minus, ArrowDown, ArrowUp, CheckCircle, AlertTriangle, ChevronRight, ShoppingBag, Coffee, Briefcase, Utensils, Landmark, Smartphone, CreditCard } from 'lucide-react';
import { summaryAPI, cashAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useDataCache } from '../context/DataContext';

export default function HomeScreen({ user, onNavigate }) {
  const { t, language } = useLanguage();
  const { cache, updateCache } = useDataCache();

  const [data, setData] = useState(cache.dashboard || null);
  const [cashData, setCashData] = useState(cache.cash || null);
  const [loading, setLoading] = useState(!cache.dashboard);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      if (!cache.dashboard) setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const [dash, cash] = await Promise.all([
        summaryAPI.getDashboard(today),
        cashAPI.getExpected(today)
      ]);
      setData(dash);
      setCashData(cash);
      updateCache('dashboard', dash);
      updateCache('cash', cash);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) => {
    const num = val || 0;
    return `₹${num.toLocaleString('en-IN')}`;
  };

  const getCategoryIcon = (category) => {
    const cat = (category || '').toLowerCase();
    if (cat.includes('salary') || cat.includes('income')) return <Briefcase size={18} color="#16A34A" />;
    if (cat.includes('food') || cat.includes('breakfast')) return <Utensils size={18} color="#DC2626" />;
    if (cat.includes('grocery') || cat.includes('shopping')) return <ShoppingBag size={18} color="#DC2626" />;
    if (cat.includes('coffee')) return <Coffee size={18} color="#DC2626" />;
    return <CreditCard size={18} color="var(--navy-primary)" />;
  };

  const firstName = user?.fullName ? user.fullName.split(' ')[0] : 'Alex';
  const expectedCash = cashData?.expectedCash ?? 0;
  const status = cashData?.status || 'TALLIED';

  const getFormattedTodayDate = () => {
    const d = new Date();
    return d.toLocaleDateString(language === 'ta' ? 'ta-IN' : 'en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="screen-container">
      {/* App Header */}
      <div className="app-header">
        <div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>
            {getFormattedTodayDate()}
          </div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)' }}>
            {t('welcomeBack')}, {firstName}
          </div>
        </div>
        <div
          className="app-avatar-circle"
          onClick={() => onNavigate('settings')}
          style={{ cursor: 'pointer' }}
        >
          {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'A'}
        </div>
      </div>

      {/* Main Navy Expected Cash Card */}
      <div className="navy-card">
        <div className="navy-card-label">{t('physicalCashAtHome')}</div>
        <div className="navy-card-amount">{formatCurrency(expectedCash)}</div>

        <div style={{ fontSize: '12px', opacity: 0.85, marginTop: '-4px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
          Opening Cash (Yesterday): <span style={{ fontWeight: '800' }}>{formatCurrency(data?.previousDayCash ?? 0)}</span>
        </div>

        <div className="navy-card-footer">
          <div className={`badge-pill ${status.toLowerCase()}`}>
            <CheckCircle size={12} />
            <span>✓ {status}</span>
          </div>

          <button
            onClick={() => onNavigate('cash')}
            style={{
              background: 'none',
              border: 'none',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            {t('countCash')} <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Income & Expense Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div className="stitch-card" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--green-income)', fontWeight: '700' }}>
            <ArrowDown size={14} /> {t('income')}
          </div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--green-income)' }}>
            {formatCurrency(data?.todayIncome ?? 0)}
          </div>
        </div>

        <div className="stitch-card" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--red-expense)', fontWeight: '700' }}>
            <ArrowUp size={14} /> {t('expense')}
          </div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--red-expense)' }}>
            {formatCurrency(data?.todayExpense ?? 0)}
          </div>
        </div>
      </div>

      {/* Today's Balance Card */}
      <div className="stitch-card" style={{ padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>{t('netBalance')}</div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', marginTop: '2px' }}>
            {formatCurrency(data?.todayBalance ?? 0)}
          </div>
        </div>
      </div>

      {/* Primary Action Buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <button className="btn-primary-navy" onClick={() => onNavigate('add-income')}>
          <Plus size={18} /> {t('addIncome')}
        </button>
        <button className="btn-outline-navy" onClick={() => onNavigate('add-expense')}>
          <Minus size={18} /> {t('addExpense')}
        </button>
      </div>

      {/* Recent Transactions */}
      <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)' }}>
            {t('todaysTransactions')}
          </span>
          <span
            onClick={() => onNavigate('transactions')}
            style={{ fontSize: '12px', fontWeight: '700', color: 'var(--navy-primary)', cursor: 'pointer' }}
          >
            {t('viewAll')}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {!data?.recentTransactions || data.recentTransactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
              {t('noTransactionsToday')}
            </div>
          ) : (
            data.recentTransactions.map((tx) => (
              <div
                key={tx.id}
                className="stitch-card"
                onClick={() => onNavigate('transaction-details', { txId: tx.id })}
                style={{
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: tx.type === 'INCOME' ? 'var(--green-income-bg)' : 'var(--red-expense-bg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {getCategoryIcon(tx.category)}
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' }}>{tx.category}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{tx.paymentMethod}</div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontSize: '15px',
                    fontWeight: '800',
                    color: tx.type === 'INCOME' ? 'var(--green-income)' : 'var(--red-expense)'
                  }}>
                    {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{tx.date}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
