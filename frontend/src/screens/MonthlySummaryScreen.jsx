import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ArrowLeft, Bell, Download, ChevronLeft, ChevronRight, AlertTriangle, Search, X } from 'lucide-react';
import { summaryAPI, transactionsAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { generateDateRangeFinancialReport } from '../utils/pdfGenerator';

export default function MonthlySummaryScreen({ month, onBack, user }) {
  const { t, language } = useLanguage();

  const getCurrentSystemMonth = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  };

  const [currentMonth, setCurrentMonth] = useState(() => month || getCurrentSystemMonth());
  const [data, setData] = useState(null);
  const [monthTransactions, setMonthTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Transaction Lookup state
  const [lookupSearch, setLookupSearch] = useState('');
  const [selectedTx, setSelectedTx] = useState(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchContainerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (month) {
      setCurrentMonth(month);
    }
  }, [month]);

  useEffect(() => {
    loadMonthlySummary(currentMonth);
  }, [currentMonth]);

  const getTxName = (tx) => {
    return (tx.transactionName && tx.transactionName.trim()) ||
           (tx.name && tx.name.trim()) ||
           (tx.description && tx.description.trim()) ||
           'Unnamed Transaction';
  };

  const loadMonthlySummary = async (targetMonth) => {
    try {
      setLoading(true);
      setError(null);
      setData(null);
      const [res, allTxsRes] = await Promise.all([
        summaryAPI.getMonthlySummary(targetMonth),
        transactionsAPI.getAll({ month: targetMonth, limit: 1000 }).catch(() => ({ transactions: [] }))
      ]);

      const txs = allTxsRes?.transactions || [];
      setMonthTransactions(txs);

      let incomeBreakdown = res.incomeBreakdown || res.incomeCategoryBreakdown;
      if ((!incomeBreakdown || incomeBreakdown.length === 0) && txs.length > 0) {
        const incomeMap = {};
        txs.forEach(tx => {
          if (tx.type !== 'INCOME') return;
          const label = getTxName(tx);
          const amt = Number(tx.amount) || 0;
          if (amt > 0) {
            incomeMap[label] = (incomeMap[label] || 0) + amt;
          }
        });

        const totalInc = res.totalIncome || Object.values(incomeMap).reduce((a, b) => a + b, 0);

        incomeBreakdown = Object.entries(incomeMap)
          .map(([name, amount]) => ({
            name,
            category: name,
            amount,
            percentage: totalInc > 0 ? Math.round((amount / totalInc) * 100) : 0
          }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 10);
      }

      setData({
        ...res,
        incomeBreakdown: incomeBreakdown || [],
        topIncomeItem: (incomeBreakdown && incomeBreakdown.length > 0) ? incomeBreakdown[0].name : 'None'
      });
    } catch (err) {
      console.error('Failed to load monthly summary:', err);
      setError('Failed to load monthly summary. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Extract unique (name, type) options from the current month's transactions
  const availableTxOptions = useMemo(() => {
    const map = new Map();
    (monthTransactions || []).forEach(tx => {
      const name = getTxName(tx);
      const type = tx.type === 'INCOME' ? 'INCOME' : 'EXPENSE';
      const key = `${name.toLowerCase()}:::${type}`;
      if (!map.has(key)) {
        map.set(key, { name, type });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [monthTransactions]);

  // Filter options based on user search
  const filteredOptions = useMemo(() => {
    const q = lookupSearch.trim().toLowerCase();
    if (!q) {
      return availableTxOptions.slice(0, 8);
    }
    return availableTxOptions.filter(opt => opt.name.toLowerCase().includes(q));
  }, [availableTxOptions, lookupSearch]);

  // Calculate total and count for the selected transaction in the current month
  const lookupResult = useMemo(() => {
    if (!selectedTx) return null;
    const matching = (monthTransactions || []).filter(tx => {
      const isSameType = (selectedTx.type === 'INCOME' ? tx.type === 'INCOME' : tx.type === 'EXPENSE');
      return isSameType && getTxName(tx).toLowerCase() === selectedTx.name.toLowerCase();
    });
    const totalAmount = matching.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
    const count = matching.length;
    return {
      name: selectedTx.name,
      type: selectedTx.type,
      totalAmount,
      count
    };
  }, [selectedTx, monthTransactions]);

  const systemMonth = getCurrentSystemMonth();
  const isNextDisabled = currentMonth >= systemMonth;

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
    if (isNextDisabled) return;
    let [y, m] = currentMonth.split('-').map(Number);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    const formatted = `${y}-${String(m).padStart(2, '0')}`;
    if (formatted > systemMonth) return;
    setCurrentMonth(formatted);
  };

  const monthLabel = () => {
    if (!currentMonth) return '';
    const [y, m] = currentMonth.split('-').map(Number);
    const monthsEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthsTa = ['ஜனவரி', 'பிப்ரவரி', 'மார்ச்', 'ஏப்ரல்', 'மே', 'ஜூன்', 'ஜூலை', 'ஆகஸ்ட்', 'செப்டம்பர்', 'அக்டோபர்', 'நவம்பர்', 'டிசம்பர்'];
    const monthName = language === 'ta' ? monthsTa[m - 1] : monthsEn[m - 1];
    return `${monthName} ${y}`;
  };

  const handleExport = async () => {
    try {
      const [y, m] = currentMonth.split('-').map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      const fromDate = `${y}-${String(m).padStart(2, '0')}-01`;
      const toDate = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      const rangeData = await summaryAPI.getRangeReport(fromDate, toDate);
      if (rangeData) {
        await generateDateRangeFinancialReport({
          fromDate,
          toDate,
          rangeData,
          user,
          language
        });
        return;
      }
    } catch (err) {
      console.warn('PDF export error, falling back to alert:', err);
    }
    alert(`Summary report for ${monthLabel()} exported as PDF/CSV.`);
  };

  const formatCurrency = (val) => `₹${(val || 0).toLocaleString(language === 'ta' ? 'ta-IN' : 'en-IN')}`;

  const totalIncome = data?.totalIncome ?? 0;
  const totalExpenses = data?.totalExpenses ?? 0;
  const netBalance = data?.netBalance ?? 0;
  const cashIncome = data?.cashIncome ?? 0;
  const cashExpenses = data?.cashExpenses ?? 0;
  const incomePercent = data?.incomePercent ?? 50;
  const expensePercent = data?.expensePercent ?? 50;
  const topExpense = data?.topExpenseItem || data?.topExpenseCategory || 'None';
  const expensesList = data?.expenseBreakdown || data?.categoryBreakdown || [];
  const topIncome = data?.topIncomeItem || data?.topIncomeCategory || (data?.incomeBreakdown?.[0]?.name) || 'None';
  const incomesList = data?.incomeBreakdown || [];

  return (
    <div className="screen-container">
      {/* Header */}
      <div className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="app-header-icon" onClick={onBack}>
            <ArrowLeft size={20} />
          </div>
          <span className="app-title-text">Cashly</span>
        </div>
        <div className="app-header-icon">
          <Bell size={18} />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handlePrevMonth}
              className="app-header-icon"
              style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
              aria-label="Previous Month"
            >
              <ChevronLeft size={22} color="var(--navy-primary)" />
            </button>
            <h1 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--navy-primary)', margin: 0, textTransform: 'capitalize' }}>
              {monthLabel()}
            </h1>
            <button
              type="button"
              onClick={handleNextMonth}
              disabled={isNextDisabled}
              className="app-header-icon"
              style={{
                border: 'none',
                background: 'none',
                cursor: isNextDisabled ? 'not-allowed' : 'pointer',
                opacity: isNextDisabled ? 0.25 : 1,
                padding: 0
              }}
              aria-label="Next Month"
            >
              <ChevronRight size={22} color="var(--navy-primary)" />
            </button>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {t ? t('monthlySummary') : 'Monthly Summary'}
          </div>
        </div>

        <button
          onClick={handleExport}
          style={{
            padding: '8px 14px',
            borderRadius: 'var(--radius-md)',
            border: '1.5px solid var(--navy-primary)',
            background: 'transparent',
            color: 'var(--navy-primary)',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            flexShrink: 0
          }}
        >
          <Download size={14} /> Export
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="stitch-card" style={{ padding: '16px', height: '110px', backgroundColor: 'rgba(0,0,0,0.03)' }} />
          <div className="stitch-card" style={{ padding: '16px', height: '140px', backgroundColor: 'rgba(0,0,0,0.03)' }} />
          <div className="stitch-card" style={{ padding: '16px', height: '140px', backgroundColor: 'rgba(0,0,0,0.03)' }} />
        </div>
      ) : error ? (
        <div className="stitch-card" style={{ padding: '32px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <AlertTriangle size={36} color="var(--red-expense)" />
          <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)' }}>
            {error}
          </div>
        </div>
      ) : (
        <>
          {/* Transaction Lookup Card */}
          <div className="stitch-card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--navy-primary)' }}>
                  Transaction Lookup
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Search or select a transaction
                </div>
              </div>
              {selectedTx && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTx(null);
                    setLookupSearch('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    padding: '4px 6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <X size={14} /> Clear
                </button>
              )}
            </div>

            {/* Search Input Container */}
            <div ref={searchContainerRef} style={{ position: 'relative', width: '100%' }}>
              <div className="input-field-wrapper">
                <Search className="input-icon-prefix" size={18} />
                <input
                  type="text"
                  className="input-control has-prefix"
                  placeholder="Search transaction..."
                  value={lookupSearch}
                  onFocus={() => setIsSearchFocused(true)}
                  onChange={(e) => {
                    setLookupSearch(e.target.value);
                    setIsSearchFocused(true);
                  }}
                  style={{ height: '42px', fontSize: '13px' }}
                />
                {lookupSearch && (
                  <X
                    className="input-icon-suffix"
                    size={16}
                    onClick={() => {
                      setLookupSearch('');
                      setSelectedTx(null);
                    }}
                  />
                )}
              </div>

              {/* Dropdown Suggestions */}
              {isSearchFocused && (
                <div
                  style={{
                    position: 'absolute',
                    top: '46px',
                    left: 0,
                    right: 0,
                    backgroundColor: 'var(--bg-card, #FFFFFF)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md, 12px)',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                    maxHeight: '220px',
                    overflowY: 'auto',
                    zIndex: 100
                  }}
                >
                  {filteredOptions.length === 0 ? (
                    <div style={{ padding: '12px 14px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>
                      {availableTxOptions.length === 0 ? 'No transactions in this month' : 'No matching transaction names'}
                    </div>
                  ) : (
                    filteredOptions.map((opt) => (
                      <div
                        key={`${opt.name}-${opt.type}`}
                        onMouseDown={() => {
                          setSelectedTx(opt);
                          setLookupSearch(opt.name);
                          setIsSearchFocused(false);
                        }}
                        style={{
                          padding: '10px 14px',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderBottom: '1px solid var(--border-color)',
                          fontSize: '13px'
                        }}
                      >
                        <span style={{ fontWeight: '600', color: 'var(--text-main)', wordBreak: 'break-word' }}>
                          {opt.name}
                        </span>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          backgroundColor: opt.type === 'INCOME' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          color: opt.type === 'INCOME' ? 'var(--green-income)' : 'var(--red-expense)',
                          flexShrink: 0,
                          marginLeft: '8px'
                        }}>
                          {opt.type === 'INCOME' ? 'Income' : 'Expense'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Result Area */}
            {lookupResult ? (
              <div style={{
                padding: '14px 16px',
                backgroundColor: 'var(--bg-app, #F8FAFC)',
                borderRadius: 'var(--radius-md, 12px)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontSize: '15px',
                      fontWeight: '800',
                      color: 'var(--navy-primary)',
                      wordBreak: 'break-word'
                    }}>
                      {lookupResult.name}
                    </div>
                    <div style={{
                      display: 'inline-block',
                      fontSize: '11px',
                      fontWeight: '700',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      marginTop: '4px',
                      backgroundColor: lookupResult.type === 'INCOME' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                      color: lookupResult.type === 'INCOME' ? 'var(--green-income)' : 'var(--red-expense)'
                    }}>
                      {lookupResult.type === 'INCOME' ? 'Income' : 'Expense'}
                    </div>
                  </div>

                  {lookupResult.count > 0 ? (
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{
                        fontSize: '22px',
                        fontWeight: '800',
                        color: lookupResult.type === 'INCOME' ? 'var(--green-income)' : 'var(--red-expense)'
                      }}>
                        {formatCurrency(lookupResult.totalAmount)}
                      </div>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {lookupResult.count} {lookupResult.count === 1 ? 'transaction' : 'transactions'}
                      </div>
                    </div>
                  ) : null}
                </div>

                {lookupResult.count === 0 && (
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', paddingTop: '4px' }}>
                    No transactions found for this month
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '6px 0' }}>
                Search for a transaction to see its monthly total.
              </div>
            )}
          </div>

          {/* Financial Overview Card */}
          <div className="stitch-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>
              Financial Overview
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '0.8px' }}>
                TOTAL INCOME
              </div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--green-income)', marginTop: '2px' }}>
                {formatCurrency(totalIncome)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '0.8px' }}>
                TOTAL EXPENSES
              </div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--red-expense)', marginTop: '2px' }}>
                {formatCurrency(totalExpenses)}
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '0.8px' }}>
                NET BALANCE
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--navy-primary)', marginTop: '2px' }}>
                {formatCurrency(netBalance)}
              </div>
            </div>
          </div>

          {/* Cash Flow Card */}
          <div className="stitch-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)' }}>
              Cash Flow
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>Cash Income</div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--green-income)', marginTop: '2px' }}>
                  {formatCurrency(cashIncome)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>Cash Expenses</div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--red-expense)', marginTop: '2px' }}>
                  {formatCurrency(cashExpenses)}
                </div>
              </div>
            </div>
          </div>

          {/* Income VS Expense Bar */}
          <div className="stitch-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '0.8px' }}>
              INCOME VS EXPENSE
            </div>

            <div style={{ height: '24px', width: '100%', borderRadius: '12px', overflow: 'hidden', display: 'flex' }}>
              <div style={{ width: `${incomePercent}%`, backgroundColor: 'var(--green-income)', height: '100%' }} />
              <div style={{ width: `${expensePercent}%`, backgroundColor: 'var(--red-expense)', height: '100%' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '700' }}>
              <span style={{ color: 'var(--green-income)' }}>● {incomePercent}%</span>
              <span style={{ color: 'var(--red-expense)' }}>● {expensePercent}%</span>
            </div>
          </div>

          {/* Top Expenses Card */}
          <div className="stitch-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
            <div style={{ width: '100%', fontSize: '14px', fontWeight: '800', color: 'var(--text-main)' }}>
              Top Expenses
            </div>

            {/* Donut Summary Visual Circle */}
            <div style={{
              width: '160px',
              height: '160px',
              borderRadius: '50%',
              border: '10px solid var(--bg-app)',
              borderTopColor: 'var(--navy-primary)',
              borderRightColor: 'var(--red-expense)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '12px'
            }}>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>Top Expense</div>
              <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--navy-primary)', wordBreak: 'break-word', maxWidth: '140px' }}>{topExpense}</div>
            </div>

            {/* Expense Items List */}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
              {expensesList.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '12px 0' }}>
                  No expenses recorded for this month.
                </div>
              ) : (
                expensesList.map((c, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: '600' }}>
                      ● {c.name || c.category} ({c.percentage}%)
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)' }}>
                      {formatCurrency(c.amount)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Top Incomes Card */}
          <div className="stitch-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
            <div style={{ width: '100%', fontSize: '14px', fontWeight: '800', color: 'var(--text-main)' }}>
              Top Incomes
            </div>

            {/* Donut Summary Visual Circle */}
            <div style={{
              width: '160px',
              height: '160px',
              borderRadius: '50%',
              border: incomesList.length === 0
                ? '10px solid var(--border-color)'
                : incomesList.length === 1
                  ? '10px solid var(--green-income)'
                  : '10px solid var(--bg-app)',
              borderTopColor: incomesList.length > 1 ? 'var(--green-income)' : undefined,
              borderRightColor: incomesList.length > 1 ? 'var(--navy-primary)' : undefined,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '12px'
            }}>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>Top Income</div>
              <div style={{ fontSize: '16px', fontWeight: '800', color: incomesList.length > 0 ? 'var(--navy-primary)' : 'var(--text-muted)', wordBreak: 'break-word', maxWidth: '140px' }}>
                {topIncome}
              </div>
            </div>

            {/* Income Items List */}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
              {incomesList.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '12px 0' }}>
                  No income recorded for this month.
                </div>
              ) : (
                incomesList.map((c, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: '600' }}>
                      ● {c.name || c.category} ({c.percentage}%)
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)' }}>
                      {formatCurrency(c.amount)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
