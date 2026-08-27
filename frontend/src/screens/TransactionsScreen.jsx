import React, { useState, useEffect } from 'react';
import { Search, Bell, Filter, ShoppingBag, Coffee, Utensils, Briefcase, CreditCard, Plus } from 'lucide-react';
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
  const [loading, setLoading] = useState(!cache.transactions);

  useEffect(() => {
    loadTransactions();
  }, [typeFilter, search]);

  const loadTransactions = async () => {
    try {
      if (!cache.transactions && !search.trim() && typeFilter === 'ALL') setLoading(true);
      const params = {};
      if (typeFilter !== 'ALL') params.type = typeFilter;
      if (search.trim()) params.search = search.trim();

      const data = await transactionsAPI.getAll(params);
      const txs = data.transactions || [];
      setTransactions(txs);
      if (typeFilter === 'ALL' && !search.trim()) {
        updateCache('transactions', txs);
      }
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) => `₹${(val || 0).toLocaleString('en-IN')}`;

  const getCategoryIcon = (category, type) => {
    const cat = (category || '').toLowerCase();
    if (cat.includes('salary') || cat.includes('income')) return <Briefcase size={18} color="#16A34A" />;
    if (cat.includes('food') || cat.includes('breakfast')) return <Utensils size={18} color="#DC2626" />;
    if (cat.includes('grocery') || cat.includes('shopping')) return <ShoppingBag size={18} color="#DC2626" />;
    if (cat.includes('coffee')) return <Coffee size={18} color="#DC2626" />;
    return <CreditCard size={18} color={type === 'INCOME' ? '#16A34A' : '#DC2626'} />;
  };

  // Group transactions by Date
  const grouped = transactions.reduce((acc, tx) => {
    const d = tx.date || 'Today';
    if (!acc[d]) acc[d] = [];
    acc[d].push(tx);
    return acc;
  }, {});

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

      {/* Filter Pills */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
        <button
          onClick={() => setTypeFilter('ALL')}
          style={{
            padding: '6px 14px',
            borderRadius: 'var(--radius-pill)',
            border: 'none',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer',
            backgroundColor: typeFilter === 'ALL' ? 'var(--navy-primary)' : 'var(--bg-card)',
            color: typeFilter === 'ALL' ? '#FFF' : 'var(--text-secondary)',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          {t('all')}
        </button>

        <button
          onClick={() => setTypeFilter('INCOME')}
          style={{
            padding: '6px 14px',
            borderRadius: 'var(--radius-pill)',
            border: 'none',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer',
            backgroundColor: typeFilter === 'INCOME' ? 'var(--green-income-bg)' : 'var(--bg-card)',
            color: typeFilter === 'INCOME' ? 'var(--green-income)' : 'var(--text-secondary)',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          {t('income')}
        </button>

        <button
          onClick={() => setTypeFilter('EXPENSE')}
          style={{
            padding: '6px 14px',
            borderRadius: 'var(--radius-pill)',
            border: 'none',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer',
            backgroundColor: typeFilter === 'EXPENSE' ? 'var(--red-expense-bg)' : 'var(--bg-card)',
            color: typeFilter === 'EXPENSE' ? 'var(--red-expense)' : 'var(--text-secondary)',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          {t('expense')}
        </button>
      </div>

      {/* Grouped Transaction Lists */}
      {Object.keys(grouped).length === 0 ? (
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
                        {getCategoryIcon(tx.category, tx.type)}
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' }}>
                          {tx.category}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {tx.paymentMethod} {tx.description ? `• ${tx.description}` : ''}
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
