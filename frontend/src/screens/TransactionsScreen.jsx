import React, { useState, useEffect } from 'react';
import { Search, ShoppingBag, Coffee, Utensils, Briefcase, CreditCard, Calendar, X, Filter } from 'lucide-react';
import { transactionsAPI } from '../services/api';
import { useDataCache } from '../context/DataContext';
import { useLanguage } from '../context/LanguageContext';
import PageContainer from '../components/PageContainer';

export default function TransactionsScreen({ onNavigate, user }) {
  const { t } = useLanguage();
  const { cache, updateCache } = useDataCache();
  const [transactions, setTransactions] = useState(cache.transactions || []);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [dateFilterMode, setDateFilterMode] = useState('ALL'); // 'ALL' | 'TODAY' | 'YESTERDAY' | 'THIS_MONTH' | 'CUSTOM'
  const [customDate, setCustomDate] = useState('');
  const [loading, setLoading] = useState(!cache.transactions);

  useEffect(() => {
    loadTransactions();
  }, [typeFilter, search, dateFilterMode, customDate]);

  const loadTransactions = async () => {
    try {
      if (!cache.transactions && !search.trim() && typeFilter === 'ALL' && dateFilterMode === 'ALL') {
        setLoading(true);
      }
      const params = {};
      if (typeFilter !== 'ALL') params.type = typeFilter;
      if (search.trim()) params.search = search.trim();

      // Apply date filters
      const todayStr = new Date().toISOString().split('T')[0];
      if (dateFilterMode === 'TODAY') {
        params.date = todayStr;
      } else if (dateFilterMode === 'YESTERDAY') {
        const yesterday = new Date(Date.now() - 86400000);
        params.date = yesterday.toISOString().split('T')[0];
      } else if (dateFilterMode === 'THIS_MONTH') {
        params.month = todayStr.substring(0, 7);
      } else if (dateFilterMode === 'CUSTOM' && customDate) {
        params.date = customDate;
      }

      const data = await transactionsAPI.getAll(params);
      const txs = data.transactions || [];
      setTransactions(txs);

      if (typeFilter === 'ALL' && !search.trim() && dateFilterMode === 'ALL') {
        updateCache('transactions', txs);
      }
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomDateChange = (e) => {
    const val = e.target.value;
    setCustomDate(val);
    if (val) {
      setDateFilterMode('CUSTOM');
    } else {
      setDateFilterMode('ALL');
    }
  };

  const clearDateFilter = () => {
    setDateFilterMode('ALL');
    setCustomDate('');
  };

  const formatCurrency = (val) => `₹${(val || 0).toLocaleString('en-IN')}`;

  const getTransactionIcon = (tx) => {
    if (tx?.type === 'INCOME') return <Briefcase size={18} color="#16A34A" />;
    return <CreditCard size={18} color="#DC2626" />;
  };

  // Group transactions by Date
  const grouped = transactions.reduce((acc, tx) => {
    const d = tx.date || 'Today';
    if (!acc[d]) acc[d] = [];
    acc[d].push(tx);
    return acc;
  }, {});

  const getDateFilterLabel = () => {
    if (dateFilterMode === 'TODAY') return 'Today';
    if (dateFilterMode === 'YESTERDAY') return 'Yesterday';
    if (dateFilterMode === 'THIS_MONTH') return 'This Month';
    if (dateFilterMode === 'CUSTOM' && customDate) return customDate;
    return null;
  };

  const activeDateLabel = getDateFilterLabel();

  return (
    <PageContainer>
      <h1 className="page-title">{t('transactions')}</h1>

      {/* Search Input */}
      <div className="input-field-wrapper">
        <Search className="input-icon-prefix" size={18} />
        <input
          type="text"
          className="input-control has-prefix"
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Type Filter Segmented Control */}
      <div style={{
        display: 'flex',
        width: '100%',
        backgroundColor: 'var(--bg-card)',
        borderRadius: '12px',
        padding: '4px',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-sm)',
        minHeight: '44px',
        boxSizing: 'border-box'
      }}>
        <button
          type="button"
          onClick={() => setTypeFilter('ALL')}
          style={{
            flex: 1,
            minHeight: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            border: 'none',
            fontSize: '14px',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            backgroundColor: typeFilter === 'ALL' ? 'var(--navy-primary)' : 'transparent',
            color: typeFilter === 'ALL' ? '#FFFFFF' : 'var(--text-secondary)'
          }}
        >
          {t('all')}
        </button>

        <button
          type="button"
          onClick={() => setTypeFilter('INCOME')}
          style={{
            flex: 1,
            minHeight: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            border: 'none',
            fontSize: '14px',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            backgroundColor: typeFilter === 'INCOME' ? 'var(--green-income-bg)' : 'transparent',
            color: typeFilter === 'INCOME' ? 'var(--green-income)' : 'var(--text-secondary)'
          }}
        >
          {t('income')}
        </button>

        <button
          type="button"
          onClick={() => setTypeFilter('EXPENSE')}
          style={{
            flex: 1,
            minHeight: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            border: 'none',
            fontSize: '14px',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            backgroundColor: typeFilter === 'EXPENSE' ? 'var(--red-expense-bg)' : 'transparent',
            color: typeFilter === 'EXPENSE' ? 'var(--red-expense)' : 'var(--text-secondary)'
          }}
        >
          {t('expense')}
        </button>
      </div>

      {/* Date Filter Bar & Quick Pills */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--bg-card)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>
            <Calendar size={14} color="var(--navy-primary)" />
            <span>{t('filterByDate')}</span>
          </div>

          {activeDateLabel && (
            <button
              onClick={clearDateFilter}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--red-expense)',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px'
              }}
            >
              <X size={12} /> {t('clearFilter')}
            </button>
          )}
        </div>

        {/* Date Presets Row */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
          <button
            onClick={clearDateFilter}
            style={{
              padding: '5px 10px',
              borderRadius: '6px',
              border: dateFilterMode === 'ALL' ? '1px solid var(--navy-primary)' : '1px solid var(--border-color)',
              fontSize: '11px',
              fontWeight: '700',
              cursor: 'pointer',
              backgroundColor: dateFilterMode === 'ALL' ? 'var(--navy-primary)' : '#FFF',
              color: dateFilterMode === 'ALL' ? '#FFF' : 'var(--text-secondary)',
              whiteSpace: 'nowrap'
            }}
          >
            {t('allDates')}
          </button>

          <button
            onClick={() => { setDateFilterMode('TODAY'); setCustomDate(''); }}
            style={{
              padding: '5px 10px',
              borderRadius: '6px',
              border: dateFilterMode === 'TODAY' ? '1px solid var(--navy-primary)' : '1px solid var(--border-color)',
              fontSize: '11px',
              fontWeight: '700',
              cursor: 'pointer',
              backgroundColor: dateFilterMode === 'TODAY' ? 'var(--navy-primary)' : '#FFF',
              color: dateFilterMode === 'TODAY' ? '#FFF' : 'var(--text-secondary)',
              whiteSpace: 'nowrap'
            }}
          >
            {t('today')}
          </button>

          <button
            onClick={() => { setDateFilterMode('YESTERDAY'); setCustomDate(''); }}
            style={{
              padding: '5px 10px',
              borderRadius: '6px',
              border: dateFilterMode === 'YESTERDAY' ? '1px solid var(--navy-primary)' : '1px solid var(--border-color)',
              fontSize: '11px',
              fontWeight: '700',
              cursor: 'pointer',
              backgroundColor: dateFilterMode === 'YESTERDAY' ? 'var(--navy-primary)' : '#FFF',
              color: dateFilterMode === 'YESTERDAY' ? '#FFF' : 'var(--text-secondary)',
              whiteSpace: 'nowrap'
            }}
          >
            {t('yesterday')}
          </button>

          <button
            onClick={() => { setDateFilterMode('THIS_MONTH'); setCustomDate(''); }}
            style={{
              padding: '5px 10px',
              borderRadius: '6px',
              border: dateFilterMode === 'THIS_MONTH' ? '1px solid var(--navy-primary)' : '1px solid var(--border-color)',
              fontSize: '11px',
              fontWeight: '700',
              cursor: 'pointer',
              backgroundColor: dateFilterMode === 'THIS_MONTH' ? 'var(--navy-primary)' : '#FFF',
              color: dateFilterMode === 'THIS_MONTH' ? '#FFF' : 'var(--text-secondary)',
              whiteSpace: 'nowrap'
            }}
          >
            {t('thisMonth')}
          </button>
        </div>

        {/* Custom Date Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
          <input
            type="date"
            className="input-control"
            value={customDate}
            onChange={handleCustomDateChange}
            style={{
              height: '38px',
              fontSize: '12px',
              padding: '0 10px',
              borderColor: dateFilterMode === 'CUSTOM' ? 'var(--navy-primary)' : 'var(--border-color)'
            }}
          />
        </div>
      </div>

      {/* Active Filter Indicator Badge */}
      {activeDateLabel && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--navy-primary)', fontWeight: '700', background: '#EEF2FF', padding: '6px 12px', borderRadius: '8px' }}>
          <Calendar size={13} />
          <span>Filtered: {activeDateLabel}</span>
        </div>
      )}

      {/* Grouped Transaction Lists */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
          Loading transactions...
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
          {t('noTransactionsFound')}
        </div>
      ) : (
        Object.keys(grouped).map((dateStr) => {
          const txs = grouped[dateStr];
          const dayTotal = txs.reduce((sum, item) => {
            return item.type === 'INCOME' ? sum + item.amount : sum - item.amount;
          }, 0);

          return (
            <div key={dateStr} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
              {/* Group Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>
                  {dateStr.toUpperCase()}
                </span>
                <span style={{
                  fontSize: '12px',
                  fontWeight: '700',
                  color: dayTotal >= 0 ? 'var(--green-income)' : 'var(--red-expense)'
                }}>
                  {dayTotal >= 0 ? '+' : ''}{formatCurrency(dayTotal)}
                </span>
              </div>

              {/* Transactions List */}
              <div className="stitch-card" style={{ padding: '0 14px', display: 'flex', flexDirection: 'column' }}>
                {txs.map((tx, idx) => (
                  <div
                    key={tx.id}
                    onClick={() => onNavigate('transaction-details', { txId: tx.id })}
                    style={{
                      padding: '14px 0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: idx < txs.length - 1 ? '1px solid var(--border-color)' : 'none',
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
                        {getTransactionIcon(tx)}
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' }}>
                          {tx.transactionName || tx.name || t('unnamedTransaction')}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {dateStr} • {tx.paymentMethod}{tx.description ? ` • ${tx.description}` : ''}
                        </div>
                      </div>
                    </div>

                    <div style={{
                      fontSize: '15px',
                      fontWeight: '800',
                      color: tx.type === 'INCOME' ? 'var(--green-income)' : 'var(--red-expense)'
                    }}>
                      {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </PageContainer>
  );
}
