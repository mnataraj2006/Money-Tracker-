import React, { useState, useEffect } from 'react';
import { Plus, Minus, Mic, ArrowDown, ArrowUp, CheckCircle, AlertTriangle, ChevronRight, ShoppingBag, Coffee, Briefcase, Utensils, CreditCard, RotateCcw, Landmark } from 'lucide-react';
import { summaryAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useDataCache } from '../context/DataContext';

import PageContainer from '../components/PageContainer';
import VoiceEntryModal from '../components/VoiceEntryModal';
import SimpleTransactionSheet from '../components/SimpleTransactionSheet';

export default function HomeScreen({ user, onNavigate, viewMode = 'normal' }) {
  const { t, language } = useLanguage();
  const { cache, updateCache } = useDataCache();

  const [data, setData] = useState(cache.dashboard || null);
  const [loading, setLoading] = useState(!cache.dashboard);
  const [error, setError] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  // Simple Passbook Entry Sheet State
  const [isSimpleSheetOpen, setIsSimpleSheetOpen] = useState(false);
  const [simplePresetType, setSimplePresetType] = useState('EXPENSE');
  const [selectedEditTx, setSelectedEditTx] = useState(null);

  const handleOpenAddIncome = () => {
    if (viewMode === 'simple') {
      setSelectedEditTx(null);
      setSimplePresetType('INCOME');
      setIsSimpleSheetOpen(true);
    } else {
      onNavigate('add-income');
    }
  };

  const handleOpenAddExpense = () => {
    if (viewMode === 'simple') {
      setSelectedEditTx(null);
      setSimplePresetType('EXPENSE');
      setIsSimpleSheetOpen(true);
    } else {
      onNavigate('add-expense');
    }
  };

  const handleOpenEditTx = (tx) => {
    if (viewMode === 'simple') {
      setSelectedEditTx(tx);
      setIsSimpleSheetOpen(true);
    } else {
      onNavigate('transaction-details', { txId: tx.id });
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Reload when cache is cleared (e.g. after adding/editing a transaction)
  useEffect(() => {
    if (!cache.dashboard) {
      loadData();
    }
  }, [cache.dashboard]);

  const loadData = async () => {
    try {
      if (!cache.dashboard) setLoading(true);
      setError(false);
      const today = new Date().toISOString().split('T')[0];
      const dash = await summaryAPI.getDashboard(today);

      setData(dash);
      updateCache('dashboard', dash);
    } catch (err) {
      console.error('Failed to load dashboard summary:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) => {
    const num = Math.abs(val || 0);
    return `₹${num.toLocaleString('en-IN')}`;
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good morning 👋';
    if (hour >= 12 && hour < 17) return 'Good afternoon 👋';
    return 'Good evening 👋';
  };

  const getFormattedTodayDate = () => {
    const d = new Date();
    return d.toLocaleDateString(language === 'ta' ? 'ta-IN' : 'en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getTransactionIcon = (tx) => {
    if (tx?.type === 'INCOME') return <ArrowDown size={18} color="#16A34A" />;
    return <ArrowUp size={18} color="#DC2626" />;
  };

  // Extract Cash & Count Status
  const expectedCash = data?.expectedCash ?? 0;
  const physicalCash = data?.physicalCash;
  const difference = data?.difference ?? 0;
  
  // Determine whether cash has been counted today
  const hasCounted = data?.hasCounted ?? (data?.counts !== null && data?.counts !== undefined);
  const status = hasCounted ? (data?.status || 'TALLIED') : 'NOT_COUNTED';

  // Render Tally Badge & Guidance
  const renderTallyStatus = () => {
    if (!hasCounted) {
      return {
        badgeClass: 'not-counted',
        badgeStyle: { background: '#F1F5F9', color: '#475569' },
        badgeText: '○ NOT COUNTED',
        guidanceText: 'Daily cash check pending',
        showCountButton: true
      };
    }

    if (status === 'SHORT' || difference < 0) {
      return {
        badgeClass: 'short',
        badgeStyle: { background: '#FEE2E2', color: '#B91C1C' },
        badgeText: '⚠ CASH SHORT',
        guidanceText: `⚠ Cash is short by ${formatCurrency(difference)}`,
        showCountButton: false
      };
    }

    if (status === 'EXTRA' || difference > 0) {
      return {
        badgeClass: 'extra',
        badgeStyle: { background: '#FEF3C7', color: '#B45309' },
        badgeText: '⚠ CASH EXTRA',
        guidanceText: `⚠ Cash is extra by ${formatCurrency(difference)}`,
        showCountButton: false
      };
    }

    return {
      badgeClass: 'tallied',
      badgeStyle: { background: '#DCFCE7', color: '#15803D' },
      badgeText: '✓ TALLIED',
      guidanceText: '✓ Cash is tallied',
      showCountButton: false
    };
  };

  const tallyInfo = renderTallyStatus();

  // Skeleton Loader Component
  if (loading && !data) {
    return (
      <PageContainer>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Header Skeleton */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ width: '140px', height: '22px', background: '#E2E8F0', borderRadius: '6px', animation: 'pulse 1.5s infinite' }}></div>
            <div style={{ width: '180px', height: '14px', background: '#F1F5F9', borderRadius: '4px' }}></div>
          </div>

          {/* Today Summary Skeleton */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="stitch-card" style={{ height: '90px', background: '#FFFFFF', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '10px' }}>
              <div style={{ width: '60px', height: '12px', background: '#E2E8F0', borderRadius: '4px' }}></div>
              <div style={{ width: '90px', height: '24px', background: '#DCFCE7', borderRadius: '6px' }}></div>
            </div>
            <div className="stitch-card" style={{ height: '90px', background: '#FFFFFF', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '10px' }}>
              <div style={{ width: '60px', height: '12px', background: '#E2E8F0', borderRadius: '4px' }}></div>
              <div style={{ width: '90px', height: '24px', background: '#FEE2E2', borderRadius: '6px' }}></div>
            </div>
          </div>

          {/* Cash At Home Card Skeleton */}
          <div className="navy-card" style={{ height: '180px', opacity: 0.85 }}></div>

          {/* Quick Actions Skeleton */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ height: '52px', background: '#E2E8F0', borderRadius: '12px' }}></div>
            <div style={{ height: '52px', background: '#E2E8F0', borderRadius: '12px' }}></div>
          </div>
        </div>
      </PageContainer>
    );
  }

  // Error State Component
  if (error && !data) {
    return (
      <PageContainer>
        <div className="stitch-card" style={{ padding: '32px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginTop: '40px' }}>
          <AlertTriangle size={36} color="#DC2626" />
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)' }}>Unable to load today's data</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>Please check your network connection and try again.</p>
          </div>
          <button className="btn-primary-navy" onClick={loadData} style={{ width: 'auto', padding: '0 24px' }}>
            <RotateCcw size={16} /> Retry
          </button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* 1. Header (Greeting & Date) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>
          {getGreeting()}
        </h1>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>
          {getFormattedTodayDate()}
        </div>
      </div>

      {/* 2. Today's Summary (Equal Income & Expense Cards, NO Net Today) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
          Today's Summary
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {/* Income Card */}
          <div className="stitch-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--green-income)', fontWeight: '700', textTransform: 'uppercase' }}>
              <ArrowDown size={14} /> {t('income')}
            </div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--green-income)', letterSpacing: '-0.3px' }}>
              {formatCurrency(data?.todayIncome)}
            </div>
          </div>

          {/* Expense Card */}
          <div className="stitch-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--red-expense)', fontWeight: '700', textTransform: 'uppercase' }}>
              <ArrowUp size={14} /> {t('expense')}
            </div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--red-expense)', letterSpacing: '-0.3px' }}>
              {formatCurrency(data?.todayExpense)}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Cash At Home (Most Important Section) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
          💵 Cash At Home
        </div>

        <div className="navy-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Expected & Physical Cash Rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', opacity: 0.85, fontWeight: '600' }}>Expected Cash</span>
              <span style={{ fontSize: '18px', fontWeight: '800', color: '#FFFFFF' }}>{formatCurrency(expectedCash)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', opacity: 0.85, fontWeight: '600' }}>Physical Cash</span>
              <span style={{ fontSize: '18px', fontWeight: '800', color: hasCounted ? '#FFFFFF' : '#CBD5E1' }}>
                {hasCounted ? formatCurrency(physicalCash) : 'Not counted'}
              </span>
            </div>

            {/* Show Difference row if Short or Extra */}
            {hasCounted && difference !== 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px', borderTop: '1px dashed rgba(255,255,255,0.2)' }}>
                <span style={{ fontSize: '13px', opacity: 0.85, fontWeight: '600' }}>Difference</span>
                <span style={{ fontSize: '16px', fontWeight: '800', color: difference < 0 ? '#FCA5A5' : '#FDE047' }}>
                  {difference > 0 ? '+' : '-'}{formatCurrency(difference)}
                </span>
              </div>
            )}
          </div>

          {/* Tally Status Badge & Guidance Footer */}
          <div style={{ paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="badge-pill" style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '700', borderRadius: '20px', ...tallyInfo.badgeStyle }}>
              {tallyInfo.badgeText}
            </div>

            <div style={{ fontSize: '12px', opacity: 0.9, fontWeight: '600' }}>
              {tallyInfo.guidanceText}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Quick Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
          Quick Actions
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Row 1: Add Income & Add Expense */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <button
              onClick={handleOpenAddIncome}
              style={{
                height: '52px',
                background: '#16A34A',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)'
              }}
            >
              <Plus size={18} /> {t('addIncome')}
            </button>

            <button
              onClick={handleOpenAddExpense}
              style={{
                height: '52px',
                background: '#DC2626',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(220, 38, 38, 0.25)'
              }}
            >
              <Minus size={18} /> {t('addExpense')}
            </button>
          </div>

          {/* Row 2: Voice Entry & Count Cash */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <button
              onClick={() => setIsVoiceModalOpen(true)}
              style={{
                height: '52px',
                background: '#021A1A',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(2, 26, 26, 0.25)'
              }}
            >
              <Mic size={18} /> {t('voiceEntry') || 'Voice Entry'}
            </button>

            <button
              className="btn-primary-navy"
              onClick={() => onNavigate('cash')}
              style={{
                height: '52px',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: '700'
              }}
            >
              💵 {t('countCash')}
            </button>
          </div>
        </div>
      </div>

      {/* 5. Recent Transactions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
            {viewMode === 'simple' ? "QUICK'S TRANSACTIONS" : t('todaysTransactions')}
          </span>
          <span
            onClick={() => onNavigate('transactions')}
            style={{ fontSize: '13px', fontWeight: '700', color: 'var(--navy-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
          >
            {t('viewAll')} <ChevronRight size={16} />
          </span>
        </div>

        {viewMode === 'simple' ? (
          /* Simple Passbook Mode Transactions Area */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* INCOME CARD */}
            <div className="stitch-card" style={{ padding: 0, overflow: 'hidden', border: '1px solid #C8E6C9' }}>
              <div style={{
                background: '#DCFCE7',
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #BBF7D0'
              }}>
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#16A34A', letterSpacing: '0.5px' }}>
                  {t('income').toUpperCase()}
                </span>
                <span style={{ fontSize: '14px', fontWeight: '800', color: '#16A34A' }}>
                  {t('totalIncome')} {formatCurrency(data?.todayIncome)}
                </span>
              </div>

              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {!data?.recentTransactions || data.recentTransactions.filter(t => t.type === 'INCOME').length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '12px 0', color: '#16A34A', fontSize: '13px', fontWeight: '600' }}>
                    {t('noIncomeEntries')}<br />
                    <span style={{ fontSize: '12px', opacity: 0.8 }}>{t('tapToAddIncome')}</span>
                  </div>
                ) : (
                  data.recentTransactions.filter(t => t.type === 'INCOME').map((tx) => (
                    <div
                      key={tx.id}
                      onClick={() => handleOpenEditTx(tx)}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F1F5F9', cursor: 'pointer' }}
                    >
                      <div style={{ flex: 1, minWidth: 0, paddingRight: '12px' }}>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#1E293B', wordBreak: 'break-word' }}>
                          {tx.transactionName || tx.name || t('unnamedTransaction')}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                          {tx.createdAt ? new Date(tx.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : t('today')}
                        </div>
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: '800', color: '#16A34A', flexShrink: 0, textAlign: 'right' }}>
                        +{formatCurrency(tx.amount)}
                      </div>
                    </div>
                  ))
                )}

                <button
                  onClick={handleOpenAddIncome}
                  style={{
                    width: '100%',
                    height: '42px',
                    background: '#FFFFFF',
                    color: '#16A34A',
                    border: '1.5px solid #16A34A',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    marginTop: '4px'
                  }}
                >
                  <Plus size={16} /> {t('addIncome')}
                </button>
              </div>
            </div>

            {/* EXPENSE CARD */}
            <div className="stitch-card" style={{ padding: 0, overflow: 'hidden', border: '1px solid #FECDD3' }}>
              <div style={{
                background: '#FEE2E2',
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #FCA5A5'
              }}>
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#DC2626', letterSpacing: '0.5px' }}>
                  {t('expense').toUpperCase()}
                </span>
                <span style={{ fontSize: '14px', fontWeight: '800', color: '#DC2626' }}>
                  {t('totalExpense')} {formatCurrency(data?.todayExpense)}
                </span>
              </div>

              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {!data?.recentTransactions || data.recentTransactions.filter(t => t.type === 'EXPENSE').length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '12px 0', color: '#DC2626', fontSize: '13px', fontWeight: '600' }}>
                    {t('noExpenseEntries')}<br />
                    <span style={{ fontSize: '12px', opacity: 0.8 }}>{t('tapToAddExpense')}</span>
                  </div>
                ) : (
                  data.recentTransactions.filter(t => t.type === 'EXPENSE').map((tx) => (
                    <div
                      key={tx.id}
                      onClick={() => handleOpenEditTx(tx)}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F1F5F9', cursor: 'pointer' }}
                    >
                      <div style={{ flex: 1, minWidth: 0, paddingRight: '12px' }}>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#1E293B', wordBreak: 'break-word' }}>
                          {tx.transactionName || tx.name || t('unnamedTransaction')}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                          {tx.createdAt ? new Date(tx.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : t('today')}
                        </div>
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: '800', color: '#DC2626', flexShrink: 0, textAlign: 'right' }}>
                        -{formatCurrency(tx.amount)}
                      </div>
                    </div>
                  ))
                )}

                <button
                  onClick={handleOpenAddExpense}
                  style={{
                    width: '100%',
                    height: '42px',
                    background: '#FFFFFF',
                    color: '#DC2626',
                    border: '1.5px solid #DC2626',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    marginTop: '4px'
                  }}
                >
                  <Minus size={16} /> {t('addExpense')}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Normal Mode Recent Transactions List */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {!data?.recentTransactions || data.recentTransactions.length === 0 ? (
              /* Empty State */
              <div className="stitch-card" style={{ padding: '24px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShoppingBag size={22} color="var(--text-secondary)" />
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)' }}>No transactions today</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>Start by adding your first income or expense.</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%', marginTop: '6px' }}>
                  <button
                    onClick={() => onNavigate('add-income')}
                    style={{
                      height: '44px',
                      background: '#16A34A',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '13px',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    <Plus size={16} /> {t('addIncome')}
                  </button>
                  <button
                    onClick={() => onNavigate('add-expense')}
                    style={{
                      height: '44px',
                      background: '#DC2626',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '13px',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    <Minus size={16} /> {t('addExpense')}
                  </button>
                </div>
              </div>
            ) : (
              /* Recent Transactions List (All Today's Transactions) */
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0, paddingRight: '12px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: tx.type === 'INCOME' ? 'var(--green-income-bg)' : 'var(--red-expense-bg)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {getTransactionIcon(tx)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', wordBreak: 'break-word' }}>
                        {tx.transactionName || tx.name || t('unnamedTransaction')}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Today • {tx.paymentMethod}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{
                      fontSize: '15px',
                      fontWeight: '800',
                      color: tx.type === 'INCOME' ? 'var(--green-income)' : 'var(--red-expense)'
                    }}>
                      {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <VoiceEntryModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onSuccess={loadData}
      />

      <SimpleTransactionSheet
        isOpen={isSimpleSheetOpen}
        onClose={() => {
          setIsSimpleSheetOpen(false);
          setSelectedEditTx(null);
        }}
        onSuccess={loadData}
        initialDate={new Date().toISOString().split('T')[0]}
        editTx={selectedEditTx}
        presetType={simplePresetType}
      />
    </PageContainer>
  );
}
