import React, { useState, useEffect } from 'react';
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Filter,
  Plus,
  Minus,
  Briefcase,
  Utensils,
  ShoppingBag,
  Coffee,
  CreditCard,
  PieChart,
  RefreshCw,
  X,
  ChevronDown
} from 'lucide-react';
import { summaryAPI, cashAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useDataCache } from '../context/DataContext';

import PageContainer from '../components/PageContainer';

export default function HistoryScreen({ user, onNavigate }) {
  const { t, language } = useLanguage();
  const { cache, updateCache } = useDataCache();

  const getCurrentMonthStr = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  };

  const [currentMonth, setCurrentMonth] = useState(getCurrentMonthStr);
  const [history, setHistory] = useState(cache.history?.history || []);
  const [monthlySummary, setMonthlySummary] = useState(cache.history?.monthlySummary || null);
  const [cashData, setCashData] = useState(cache.history?.cashData || null);
  const [loading, setLoading] = useState(!cache.history);
  const [error, setError] = useState(null);

  // Selected Day Detail State
  const [selectedDay, setSelectedDay] = useState(null);

  // Filter Modal State
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterType, setFilterType] = useState('ALL'); // ALL, INCOME, EXPENSE
  const [filterPayment, setFilterPayment] = useState('ALL'); // ALL, CASH, UPI, BANK, CARD

  useEffect(() => {
    loadHistoryAndSummary();
  }, [currentMonth]);

  const loadHistoryAndSummary = async () => {
    try {
      if (!cache.history) setLoading(true);
      setError(null);
      const [histRes, sumRes, cashRes] = await Promise.all([
        summaryAPI.getHistory(currentMonth),
        summaryAPI.getMonthlySummary(currentMonth),
        cashAPI.getExpected(new Date().toISOString().split('T')[0])
      ]);
      setHistory(histRes.history || []);
      setMonthlySummary(sumRes);
      setCashData(cashRes);
      updateCache('history', {
        history: histRes.history || [],
        monthlySummary: sumRes,
        cashData: cashRes
      });
    } catch (err) {
      console.error('Failed to load month-wise history:', err);
      setError(t('unableToLoadHistory'));
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = () => {
    let [y, m] = currentMonth.split('-').map(Number);
    m -= 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    const formatted = `${y}-${String(m).padStart(2, '0')}`;
    setCurrentMonth(formatted);
  };

  const handleNextMonth = () => {
    let [y, m] = currentMonth.split('-').map(Number);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    const formatted = `${y}-${String(m).padStart(2, '0')}`;
    setCurrentMonth(formatted);
  };

  const formatCurrency = (val) => {
    const num = val || 0;
    const formatted = Math.abs(num).toLocaleString(language === 'ta' ? 'ta-IN' : 'en-IN');
    if (num < 0) return `-₹${formatted}`;
    if (num > 0 && arguments[1] === true) return `+₹${formatted}`;
    return `₹${formatted}`;
  };

  const monthLabel = () => {
    const [y, m] = currentMonth.split('-').map(Number);
    const monthsEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthsTa = ['ஜனவரி', 'பிப்ரவரி', 'மார்ச்', 'ஏப்ரல்', 'மே', 'ஜூன்', 'ஜூலை', 'ஆகஸ்ட்', 'செப்டம்பர்', 'அக்டோபர்', 'நவம்பர்', 'டிசம்பர்'];
    const monthName = language === 'ta' ? monthsTa[m - 1] : monthsEn[m - 1];
    return `${monthName} ${y}`;
  };

  const formatDayDate = (dateStr) => {
    if (!dateStr) return '';
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterdayObj = new Date();
    yesterdayObj.setDate(yesterdayObj.getDate() - 1);
    const yesterdayStr = yesterdayObj.toISOString().split('T')[0];

    const parts = dateStr.split('-');
    if (parts.length < 3) return dateStr;
    const year = parts[0];
    const monthIdx = parseInt(parts[1]) - 1;
    const day = parseInt(parts[2]);
    const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthsTa = ['ஜனவரி', 'பிப்ரவரி', 'மார்ச்', 'ஏப்ரல்', 'மே', 'ஜூன்', 'ஜூலை', 'ஆகஸ்ட்', 'செப்டம்பர்', 'அக்டோபர்', 'நவம்பர்', 'டிசம்பர்'];
    const monthName = language === 'ta' ? monthsTa[monthIdx] : monthsEn[monthIdx];

    if (dateStr === todayStr) {
      return `${t('today')}, ${day} ${monthName}`;
    }
    if (dateStr === yesterdayStr) {
      return `${t('yesterday')}, ${day} ${monthName}`;
    }
    return `${day} ${monthName} ${year}`;
  };

  const getCategoryIcon = (category) => {
    const cat = (category || '').toLowerCase();
    if (cat.includes('salary') || cat.includes('income')) return <Briefcase size={16} color="#16A34A" />;
    if (cat.includes('food') || cat.includes('breakfast')) return <Utensils size={16} color="#DC2626" />;
    if (cat.includes('grocery') || cat.includes('shopping')) return <ShoppingBag size={16} color="#DC2626" />;
    if (cat.includes('coffee')) return <Coffee size={16} color="#DC2626" />;
    return <CreditCard size={16} color="var(--navy-primary)" />;
  };

  // Filter history records
  const filteredHistory = history.filter(item => {
    if (filterType === 'INCOME' && item.income === 0) return false;
    if (filterType === 'EXPENSE' && item.expense === 0) return false;
    if (filterPayment !== 'ALL' && item.transactions) {
      const hasPayment = item.transactions.some(tx => tx.paymentMethod === filterPayment);
      if (!hasPayment) return false;
    }
    return true;
  });

  const netBalance = monthlySummary?.netBalance ?? 0;
  const currentCash = cashData?.expectedCash ?? 0;

  // ----------------------------------------------------
  // DAILY DETAILS SCREEN VIEW
  // ----------------------------------------------------
  if (selectedDay) {
    const dayIncome = selectedDay.income || 0;
    const dayExpense = selectedDay.expense || 0;
    const dayNet = dayIncome - dayExpense;
    const incomeTxs = (selectedDay.transactions || []).filter(t => t.type === 'INCOME');
    const expenseTxs = (selectedDay.transactions || []).filter(t => t.type === 'EXPENSE');

    const isShort = selectedDay.status === 'SHORT' || (selectedDay.difference < 0);
    const isExtra = selectedDay.status === 'EXTRA' || (selectedDay.difference > 0);
    const diffAbs = Math.abs(selectedDay.difference || 0);

    return (
      <div className="screen-container">
        {/* Detail View Header */}
        <div className="app-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="app-header-icon" onClick={() => setSelectedDay(null)} style={{ cursor: 'pointer' }}>
              <ChevronLeft size={20} />
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)' }}>
                {formatDayDate(selectedDay.date)}
              </div>
            </div>
          </div>
        </div>

        {/* Daily Financial Summary */}
        <div className="stitch-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--navy-primary)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
            | {t('dailySummary')}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--green-income)', fontWeight: '700' }}>{t('income')}</div>
              <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--green-income)', marginTop: '2px' }}>
                {formatCurrency(dayIncome)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: 'var(--red-expense)', fontWeight: '700' }}>{t('expense')}</div>
              <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--red-expense)', marginTop: '2px' }}>
                {formatCurrency(dayExpense)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: dayNet >= 0 ? 'var(--green-income)' : 'var(--red-expense)', fontWeight: '700' }}>{t('net')}</div>
              <div style={{ fontSize: '16px', fontWeight: '800', color: dayNet >= 0 ? 'var(--green-income)' : 'var(--red-expense)', marginTop: '2px' }}>
                {formatCurrency(dayNet, true)}
              </div>
            </div>
          </div>
        </div>

        {/* Income Transactions */}
        <div className="stitch-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--green-income)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ArrowDown size={16} /> {t('income')} ({incomeTxs.length})
          </div>

          {incomeTxs.length === 0 ? (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '6px 0' }}>
              No income transactions for this day.
            </div>
          ) : (
            incomeTxs.map(tx => (
              <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--green-income-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {getCategoryIcon(tx.category)}
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>{tx.category}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{tx.description || tx.paymentMethod} • <span style={{ fontWeight: '600' }}>{tx.paymentMethod}</span></div>
                  </div>
                </div>
                <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--green-income)' }}>
                  +{formatCurrency(tx.amount)}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Expense Transactions */}
        <div className="stitch-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--red-expense)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ArrowUp size={16} /> {t('expense')} ({expenseTxs.length})
          </div>

          {expenseTxs.length === 0 ? (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '6px 0' }}>
              No expense transactions for this day.
            </div>
          ) : (
            expenseTxs.map(tx => (
              <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--red-expense-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {getCategoryIcon(tx.category)}
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>{tx.category}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{tx.description || tx.paymentMethod} • <span style={{ fontWeight: '600' }}>{tx.paymentMethod}</span></div>
                  </div>
                </div>
                <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--red-expense)' }}>
                  -{formatCurrency(tx.amount)}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cash Calculation Section */}
        <div className="stitch-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--navy-primary)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
            | {t('cashCalculation')}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: 'var(--text-main)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{t('openingCash')}</span>
              <span style={{ fontWeight: '700' }}>{formatCurrency(selectedDay.openingCash || 0)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--green-income)' }}>+ {t('cashIncome')}</span>
              <span style={{ fontWeight: '700', color: 'var(--green-income)' }}>{formatCurrency(selectedDay.cashIncome || 0)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--red-expense)' }}>− {t('cashExpense')}</span>
              <span style={{ fontWeight: '700', color: 'var(--red-expense)' }}>{formatCurrency(selectedDay.cashExpense || 0)}</span>
            </div>

            <div style={{ borderTop: '1.5px dashed var(--border-color)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: '800', fontSize: '14px' }}>
              <span>{t('expectedClosingCash')}</span>
              <span style={{ color: 'var(--navy-primary)' }}>{formatCurrency(selectedDay.expectedCash || 0)}</span>
            </div>
          </div>
        </div>

        {/* Physical Cash & Reconciliation Status Section */}
        <div className="stitch-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
            | {t('physicalCash')}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{t('expectedClosingCash')}:</span>
              <span style={{ fontWeight: '700' }}>{formatCurrency(selectedDay.expectedCash || 0)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{t('physicalCashCounted')}:</span>
              <span style={{ fontWeight: '700' }}>{formatCurrency(selectedDay.physicalCash || selectedDay.cash || 0)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{t('difference')}:</span>
              <span style={{ fontWeight: '800', color: isShort ? 'var(--red-expense)' : (isExtra ? '#B45309' : 'var(--green-income)') }}>
                {formatCurrency(selectedDay.difference || 0, true)}
              </span>
            </div>
          </div>

          {/* Reconciliation Callout Box */}
          {isShort ? (
            <div style={{ backgroundColor: 'var(--red-expense-bg)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '12px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--red-expense)', fontWeight: '800', fontSize: '13px' }}>
                <AlertTriangle size={16} />
                <span>⚠ {t('cashShort')} {formatCurrency(diffAbs)}</span>
              </div>
              <button
                className="btn-outline-navy"
                onClick={() => onNavigate('count-cash', { targetDate: selectedDay.date, from: 'history' })}
                style={{ width: '100%', padding: '8px', fontSize: '12px', borderColor: 'var(--red-expense)', color: 'var(--red-expense)' }}
              >
                <RefreshCw size={14} /> {t('recountCash')}
              </button>
            </div>
          ) : isExtra ? (
            <div style={{ backgroundColor: 'rgba(217, 119, 6, 0.1)', border: '1px solid rgba(217,119,6,0.3)', borderRadius: '12px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#B45309', fontWeight: '800', fontSize: '13px' }}>
                <AlertTriangle size={16} />
                <span>⚠ {t('cashExtra')} {formatCurrency(diffAbs)}</span>
              </div>
              <button
                className="btn-outline-navy"
                onClick={() => onNavigate('count-cash', { targetDate: selectedDay.date, from: 'history' })}
                style={{ width: '100%', padding: '8px', fontSize: '12px', borderColor: '#B45309', color: '#B45309' }}
              >
                <RefreshCw size={14} /> {t('recountCash')}
              </button>
            </div>
          ) : (
            <div style={{ backgroundColor: 'var(--green-income-bg)', border: '1px solid rgba(22,163,74,0.3)', borderRadius: '12px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle size={20} color="var(--green-income)" />
              <div>
                <div style={{ color: 'var(--green-income)', fontWeight: '800', fontSize: '13px' }}>
                  ✓ {t('cashTallied')}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Physical cash matches expected cash perfectly.
                </div>
              </div>
            </div>
          )}

          {/* Direct Action Buttons for Past Date */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button
              className="btn-outline-navy"
              onClick={() => onNavigate('add-expense', { date: selectedDay.date, from: 'history' })}
              style={{ flex: 1, padding: '10px', fontSize: '12px' }}
            >
              <Minus size={14} /> Add Expense for Date
            </button>
            <button
              className="btn-primary-navy"
              onClick={() => onNavigate('add-income', { date: selectedDay.date, from: 'history' })}
              style={{ flex: 1, padding: '10px', fontSize: '12px' }}
            >
              <Plus size={14} /> Add Income for Date
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // MAIN HISTORY SCREEN VIEW
  // ----------------------------------------------------
  return (
    <PageContainer>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title">
          {t('history')}
        </h1>
        <div
          className="app-header-icon"
          onClick={() => setShowFilterModal(true)}
          style={{ cursor: 'pointer', position: 'relative' }}
        >
          <Filter size={18} />
          {(filterType !== 'ALL' || filterPayment !== 'ALL') && (
            <span style={{ position: 'absolute', top: '2px', right: '2px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--navy-primary)' }} />
          )}
        </div>
      </div>

        <button
          onClick={() => onNavigate('monthly-summary', { month: currentMonth })}
          style={{
            background: 'none',
            color: 'var(--navy-primary)',
            border: 'none',
            fontSize: '13px',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          {t('viewMonthlyReport')} <ChevronRight size={14} />
        </button>

      {/* 4. Month Selector */}
      <div className="stitch-card" style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={handlePrevMonth}
          className="app-header-icon"
          style={{ border: 'none', background: 'none', cursor: 'pointer' }}
        >
          <ChevronLeft size={22} color="var(--navy-primary)" />
        </button>

        <span style={{ fontSize: '16px', fontWeight: '800', color: 'var(--navy-primary)', textTransform: 'capitalize' }}>
          {monthLabel()}
        </span>

        <button
          onClick={handleNextMonth}
          className="app-header-icon"
          style={{ border: 'none', background: 'none', cursor: 'pointer' }}
        >
          <ChevronRight size={22} color="var(--navy-primary)" />
        </button>
      </div>

      {/* 22. Loading State (Skeleton) */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="stitch-card" style={{ padding: '16px', height: '110px', backgroundColor: 'rgba(0,0,0,0.03)' }} />
          <div className="stitch-card" style={{ padding: '16px', height: '140px', backgroundColor: 'rgba(0,0,0,0.03)' }} />
          <div className="stitch-card" style={{ padding: '16px', height: '140px', backgroundColor: 'rgba(0,0,0,0.03)' }} />
        </div>
      ) : error ? (
        /* 23. Error State */
        <div className="stitch-card" style={{ padding: '32px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <AlertTriangle size={36} color="var(--red-expense)" />
          <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)' }}>
            {error}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {t('checkConnectionRetry')}
          </div>
          <button className="btn-primary-navy" onClick={loadHistoryAndSummary} style={{ marginTop: '8px', padding: '10px 24px' }}>
            <RefreshCw size={16} /> {t('tryAgain')}
          </button>
        </div>
      ) : (
        <>
          {/* 5. Monthly Summary Card */}
          <div className="stitch-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', backgroundColor: 'var(--bg-card)' }}>
            <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--navy-primary)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              | {monthLabel()} {t('monthlySummary')}
            </div>

            {/* Income, Expense, Net */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--green-income)', fontWeight: '700' }}>
                  {t('income')}
                </div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--green-income)', marginTop: '2px' }}>
                  {formatCurrency(monthlySummary?.totalIncome)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: 'var(--red-expense)', fontWeight: '700' }}>
                  {t('expense')}
                </div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--red-expense)', marginTop: '2px' }}>
                  {formatCurrency(monthlySummary?.totalExpenses)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: netBalance >= 0 ? 'var(--navy-primary)' : 'var(--red-expense)', fontWeight: '700' }}>
                  {t('net')}
                </div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: netBalance >= 0 ? 'var(--navy-primary)' : 'var(--red-expense)', marginTop: '2px' }}>
                  {formatCurrency(netBalance, true)}
                </div>
              </div>
            </div>

            {/* 6. Cash at Home Summary */}
            <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700' }}>
                  {t('currentCashAtHome')}
                </div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--navy-primary)', marginTop: '2px' }}>
                  {formatCurrency(currentCash)}
                </div>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', maxWidth: '140px', textAlign: 'right' }}>
                Physical cash position
              </div>
            </div>
          </div>

          {/* 7. Daily Records Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
              <span style={{ fontSize: '15px', fontWeight: '800', color: 'var(--navy-primary)' }}>
                {t('dailyRecords')}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                {filteredHistory.length} {filteredHistory.length === 1 ? 'day' : 'days'}
              </span>
            </div>

            {/* 21. Empty History State */}
            {filteredHistory.length === 0 ? (
              <div className="stitch-card" style={{ padding: '32px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)' }}>
                  {t('noRecordsFor')} {monthLabel()}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '260px' }}>
                  {t('noRecordsSubtitle')}
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px', width: '100%', maxWidth: '280px' }}>
                  <button className="btn-primary-navy" onClick={() => onNavigate('add-income')} style={{ flex: 1, padding: '10px', fontSize: '12px' }}>
                    <Plus size={14} /> {t('addIncome')}
                  </button>
                  <button className="btn-outline-navy" onClick={() => onNavigate('add-expense')} style={{ flex: 1, padding: '10px', fontSize: '12px' }}>
                    <Minus size={14} /> {t('addExpense')}
                  </button>
                </div>
              </div>
            ) : (
              /* 8. Daily Record Cards List */
              filteredHistory.map((item) => {
                const isShort = item.status === 'SHORT' || (item.difference < 0);
                const isExtra = item.status === 'EXTRA' || (item.difference > 0);
                const diffAbs = Math.abs(item.difference || 0);
                const todayStr = new Date().toISOString().split('T')[0];
                const isToday = item.date === todayStr;

                return (
                  <div
                    key={item.date}
                    className="stitch-card"
                    onClick={() => onNavigate('daily-details', { date: item.date })}
                    style={{
                      padding: '14px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      cursor: 'pointer',
                      borderLeft: isToday ? '4px solid var(--navy-primary)' : undefined,
                      transition: 'transform 0.1s ease, box-shadow 0.1s ease'
                    }}
                  >
                    {/* 9. Daily Card Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)' }}>
                        {formatDayDate(item.date)}
                      </span>

                      {/* Reconciliation Status Badge */}
                      <div className={`badge-pill ${isShort ? 'short' : (isExtra ? 'extra' : 'tallied')}`}>
                        {isShort ? <AlertTriangle size={12} /> : (isExtra ? <AlertTriangle size={12} /> : <CheckCircle size={12} />)}
                        <span>
                          {isShort ? `${t('short')} ${formatCurrency(diffAbs)}` : (isExtra ? `${t('extra')} ${formatCurrency(diffAbs)}` : `✓ ${t('tallied')}`)}
                        </span>
                      </div>
                    </div>

                    {/* 10. Daily Financial Summary */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', textAlign: 'center', backgroundColor: 'var(--bg-app)', padding: '10px', borderRadius: '12px' }}>
                      <div>
                        <div style={{ fontSize: '10px', color: 'var(--green-income)', fontWeight: '700' }}>
                          {t('income')}
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--green-income)', marginTop: '2px' }}>
                          {formatCurrency(item.income)}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '10px', color: 'var(--red-expense)', fontWeight: '700' }}>
                          {t('expense')}
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--red-expense)', marginTop: '2px' }}>
                          {formatCurrency(item.expense)}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '10px', color: (item.net ?? (item.income - item.expense)) >= 0 ? 'var(--navy-primary)' : 'var(--red-expense)', fontWeight: '700' }}>
                          {t('net')}
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: '800', color: (item.net ?? (item.income - item.expense)) >= 0 ? 'var(--navy-primary)' : 'var(--red-expense)', marginTop: '2px' }}>
                          {formatCurrency(item.net ?? (item.income - item.expense), true)}
                        </div>
                      </div>
                    </div>

                    {/* 11 & 12. Cash at Home & View Details Action */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '2px', gap: '8px' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                        {isShort || isExtra ? (
                          <>
                            Counted: <span style={{ fontWeight: '800', color: isShort ? 'var(--red-expense)' : '#B45309' }}>{formatCurrency(item.physicalCash)}</span>{' '}
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>(Expected: {formatCurrency(item.expectedCash)})</span>
                          </>
                        ) : (
                          <>
                            {t('cashAtHome')}: <span style={{ fontWeight: '800', color: 'var(--text-main)' }}>{formatCurrency(item.physicalCash || item.cash || item.expectedCash || 0)}</span>
                          </>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '12px', fontWeight: '700', color: 'var(--navy-primary)', flexShrink: 0 }}>
                        {t('viewDetails')} <ChevronRight size={14} />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Filter Modal */}
      {showFilterModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="stitch-card" style={{ width: '100%', maxWidth: '340px', display: 'flex', flexDirection: 'column', gap: '14px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--navy-primary)' }}>
                Filter History
              </h3>
              <div onClick={() => setShowFilterModal(false)} style={{ cursor: 'pointer' }}>
                <X size={18} color="var(--text-secondary)" />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>Type</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['ALL', 'INCOME', 'EXPENSE'].map(type => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '8px',
                      border: filterType === type ? '2px solid var(--navy-primary)' : '1px solid var(--border-color)',
                      backgroundColor: filterType === type ? 'rgba(30,58,138,0.05)' : 'white',
                      fontWeight: filterType === type ? '700' : '500',
                      fontSize: '12px',
                      color: 'var(--text-main)',
                      cursor: 'pointer'
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>Payment Method</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {['ALL', 'CASH', 'UPI', 'BANK', 'CARD'].map(pm => (
                  <button
                    key={pm}
                    onClick={() => setFilterPayment(pm)}
                    style={{
                      padding: '8px',
                      borderRadius: '8px',
                      border: filterPayment === pm ? '2px solid var(--navy-primary)' : '1px solid var(--border-color)',
                      backgroundColor: filterPayment === pm ? 'rgba(30,58,138,0.05)' : 'white',
                      fontWeight: filterPayment === pm ? '700' : '500',
                      fontSize: '12px',
                      color: 'var(--text-main)',
                      cursor: 'pointer'
                    }}
                  >
                    {pm}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button
                className="btn-primary-navy"
                onClick={() => setShowFilterModal(false)}
                style={{ flex: 1, padding: '10px' }}
              >
                Apply Filters
              </button>
              <button
                className="btn-outline-navy"
                onClick={() => { setFilterType('ALL'); setFilterPayment('ALL'); setShowFilterModal(false); }}
                style={{ flex: 1, padding: '10px' }}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
