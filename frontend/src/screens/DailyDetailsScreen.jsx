import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowDownToLine,
  CreditCard,
  Wallet,
  Trash2,
  Edit3,
  Moon,
  RefreshCw,
  Calculator,
  X,
  Clock,
  Landmark
} from 'lucide-react';
import { transactionsAPI, summaryAPI, bankAccountsAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useDataCache } from '../context/DataContext';
import CashWithdrawalModal from '../components/CashWithdrawalModal';
import SimpleTransactionSheet from '../components/SimpleTransactionSheet';

export default function DailyDetailsScreen({ initialDate, onBack, onNavigate, user }) {
  const { t, language } = useLanguage();
  const { clearCache } = useDataCache();

  const [currentDate, setCurrentDate] = useState(
    initialDate || new Date().toISOString().split('T')[0]
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [transactions, setTransactions] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [cashData, setCashData] = useState(null);

  // Edit / Delete / Sheet State
  const [selectedTx, setSelectedTx] = useState(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadDailyDetails();
  }, [currentDate]);

  const loadDailyDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await summaryAPI.getDailyDetails(currentDate);
      setTransactions(res.transactions || []);
      setBankAccounts(res.bankAccounts || []);
      setCashData(res);
    } catch (err) {
      console.error('Failed to load daily details:', err);
      setError('Unable to load daily details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const shiftDate = (dateStr, days) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d + days);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handlePrevDay = () => {
    setCurrentDate(prev => shiftDate(prev, -1));
  };

  const handleNextDay = () => {
    setCurrentDate(prev => shiftDate(prev, 1));
  };

  const handleDeleteTransaction = async () => {
    if (!selectedTx) return;
    setActionLoading(true);
    try {
      await transactionsAPI.delete(selectedTx.id);
      setShowConfirmDelete(false);
      setSelectedTx(null);
      clearCache();
      await loadDailyDetails();
    } catch (err) {
      alert(err.message || 'Failed to delete transaction');
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (val, showPlus = false) => {
    const num = val || 0;
    const formatted = Math.abs(num).toLocaleString(language === 'ta' ? 'ta-IN' : 'en-IN');
    if (num < 0) return `-₹${formatted}`;
    if (num > 0 && showPlus) return `+₹${formatted}`;
    return `₹${formatted}`;
  };

  const formatLongDate = (dateStr) => {
    if (!dateStr) return { formattedDate: '', dayName: '' };
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayName = dateObj.toLocaleDateString(language === 'ta' ? 'ta-IN' : 'en-US', { weekday: 'long' });
    const formattedDate = dateObj.toLocaleDateString(language === 'ta' ? 'ta-IN' : 'en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    return { formattedDate, dayName };
  };

  // 1. Transaction Classification
  const incomeTxs = transactions.filter(t => t.type === 'INCOME');
  const expenseTxs = transactions.filter(t => t.type === 'EXPENSE');
  const withdrawalTxs = transactions.filter(t => t.type === 'CASH_WITHDRAWAL');

  // 2. Financial Totals (Income & Expense Only)
  const totalIncome = incomeTxs.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  const totalExpense = expenseTxs.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  const totalWithdrawals = withdrawalTxs.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  const netBalance = totalIncome - totalExpense;

  // 3. Physical Cash Breakdown
  const cashIncome = incomeTxs.filter(t => t.paymentMethod === 'CASH').reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  const cashExpense = expenseTxs.filter(t => t.paymentMethod === 'CASH').reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  const cashWithdrawal = cashData?.cashWithdrawal ?? totalWithdrawals;
  const netCashChange = cashIncome - cashExpense + cashWithdrawal;

  // 4. Non-Cash (UPI / Bank) Breakdown
  const nonCashIncome = totalIncome - cashIncome;
  const nonCashExpense = totalExpense - cashExpense;
  const nonCashNet = nonCashIncome - nonCashExpense;

  // 5. Cash Reconciliation
  const previousDayCash = cashData?.previousDayCash ?? 0;
  const expectedClosing = cashData?.expectedCash ?? (previousDayCash + netCashChange);
  const physicalCash = cashData?.physicalCash;
  const difference = physicalCash !== null && physicalCash !== undefined ? (physicalCash - expectedClosing) : 0;
  const status = cashData?.status || (physicalCash !== null && physicalCash !== undefined ? (difference === 0 ? 'TALLIED' : (difference < 0 ? 'SHORT' : 'EXTRA')) : 'NOT_COUNTED');

  const isShort = status === 'SHORT' || (physicalCash !== null && physicalCash !== undefined && difference < 0);
  const isExtra = status === 'EXTRA' || (physicalCash !== null && physicalCash !== undefined && difference > 0);
  const isTallied = status === 'TALLIED' || (physicalCash !== null && physicalCash !== undefined && difference === 0);
  const diffAbs = Math.abs(difference);

  const countsObj = cashData?.counts || {};
  const denominations = [
    { label: '₹500', value: 500, qty: countsObj.n500 || 0 },
    { label: '₹200', value: 200, qty: countsObj.n200 || 0 },
    { label: '₹100', value: 100, qty: countsObj.n100 || 0 },
    { label: '₹50', value: 50, qty: countsObj.n50 || 0 },
    { label: '₹20', value: 20, qty: countsObj.n20 || 0 },
    { label: '₹10', value: 10, qty: countsObj.n10 || 0 },
    { label: '₹5', value: 5, qty: countsObj.n5 || 0 },
    { label: '₹2', value: 2, qty: countsObj.n2 || 0 },
    { label: '₹1', value: 1, qty: countsObj.n1 || 0 }
  ];

  const hasCountData = physicalCash !== null && physicalCash !== undefined;
  const { formattedDate, dayName } = formatLongDate(currentDate);

  const handleOpenTx = (tx) => {
    setSelectedTx(tx);
    setIsEditSheetOpen(true);
  };

  return (
    <div className="screen-container" style={{ paddingBottom: '80px' }}>
      {/* 1. PAGE HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <button
          onClick={onBack}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'var(--bg-card, #FFFFFF)',
            border: '1px solid var(--border-color, #E2E8F0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--navy-primary, #1E293B)',
            cursor: 'pointer'
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="page-title" style={{ margin: 0, fontSize: '20px', fontWeight: '800' }}>
          Daily Details
        </h1>
      </div>

      {/* 2. DATE NAVIGATION */}
      <div className="stitch-card" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <button
          onClick={handlePrevDay}
          style={{ width: '36px', height: '36px', border: 'none', background: 'var(--bg-app, #F8FAFC)', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ChevronLeft size={22} color="var(--navy-primary, #1E293B)" />
        </button>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--navy-primary, #1E293B)' }}>
            {formattedDate}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary, #64748B)', fontWeight: '600' }}>
            {dayName}
          </div>
        </div>

        <button
          onClick={handleNextDay}
          style={{ width: '36px', height: '36px', border: 'none', background: 'var(--bg-app, #F8FAFC)', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ChevronRight size={22} color="var(--navy-primary, #1E293B)" />
        </button>
      </div>

      {/* 3. CASH STATUS BADGE */}
      <div style={{ marginBottom: '16px' }}>
        {!hasCountData ? (
          <div className="badge-pill" style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '13px', background: '#F1F5F9', color: '#475569', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={16} />
            <span>○ CASH NOT COUNTED YET</span>
          </div>
        ) : isTallied ? (
          <div className="badge-pill tallied" style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '13px', background: '#DCFCE7', color: '#16A34A', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={18} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontWeight: '800' }}>✓ CASH TALLIED</span>
              <span style={{ fontSize: '11px', opacity: 0.9 }}>Physical cash matches expected cash perfectly</span>
            </div>
          </div>
        ) : isShort ? (
          <div className="badge-pill short" style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '13px', background: '#FEE2E2', color: '#DC2626', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontWeight: '800' }}>⚠ CASH SHORT BY {formatCurrency(diffAbs)}</span>
              <span style={{ fontSize: '11px', opacity: 0.9 }}>Physical cash is less than expected</span>
            </div>
          </div>
        ) : (
          <div className="badge-pill extra" style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '13px', background: '#FEF3C7', color: '#B45309', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontWeight: '800' }}>⚠ CASH EXTRA BY {formatCurrency(diffAbs)}</span>
              <span style={{ fontSize: '11px', opacity: 0.9 }}>Physical cash is more than expected</span>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="stitch-card" style={{ height: '90px', backgroundColor: 'rgba(0,0,0,0.03)' }} />
          <div className="stitch-card" style={{ height: '140px', backgroundColor: 'rgba(0,0,0,0.03)' }} />
        </div>
      ) : error ? (
        <div className="stitch-card" style={{ padding: '24px', textAlign: 'center', color: 'var(--red-expense)' }}>
          {error}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* 4. DAILY FINANCIAL SUMMARY (INCOME - EXPENSE = NET) */}
          <div className="stitch-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary, #64748B)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              DAILY FINANCIAL SUMMARY
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', textAlign: 'center', background: 'var(--bg-app, #F8FAFC)', padding: '12px', borderRadius: '12px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#16A34A', fontWeight: '700' }}>Total Income</div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#16A34A', marginTop: '2px' }}>
                  {formatCurrency(totalIncome)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: '#DC2626', fontWeight: '700' }}>Total Expense</div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#DC2626', marginTop: '2px' }}>
                  {formatCurrency(totalExpense)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: netBalance >= 0 ? '#1E293B' : '#DC2626', fontWeight: '700' }}>Net</div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: netBalance >= 0 ? '#1E293B' : '#DC2626', marginTop: '2px' }}>
                  {formatCurrency(netBalance, true)}
                </div>
              </div>
            </div>
          </div>

          {/* 5. INCOME RECORDS */}
          <div className="stitch-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#16A34A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ArrowDown size={18} /> Income Records ({incomeTxs.length})
              </div>
              <button
                className="btn-outline-navy"
                onClick={() => onNavigate('add-income', { date: currentDate, from: 'daily-details' })}
                style={{ padding: '4px 12px', fontSize: '12px', height: '32px', borderRadius: '8px', fontWeight: '700' }}
              >
                + Add Income
              </button>
            </div>

            {incomeTxs.length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--text-muted, #94A3B8)', fontStyle: 'italic', padding: '12px 0', textAlign: 'center' }}>
                No income recorded for this day.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {incomeTxs.map(tx => {
                  const isCash = tx.paymentMethod === 'CASH';
                  const title = tx.transactionName || tx.name || 'Unnamed Transaction';
                  const accountLabel = tx.accountName || 'Bank';
                  const subtitle = isCash
                    ? `CASH${tx.description ? ` • ${tx.description}` : ''}`
                    : `${accountLabel} • UPI${tx.description ? ` • ${tx.description}` : ''}`;

                  return (
                    <div
                      key={tx.id}
                      onClick={() => handleOpenTx(tx)}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color, #E2E8F0)',
                        backgroundColor: 'var(--bg-app, #F8FAFC)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          backgroundColor: '#DCFCE7',
                          color: '#16A34A',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {isCash ? <Wallet size={18} /> : <CreditCard size={18} />}
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main, #0F172A)' }}>
                            {title}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary, #64748B)', fontWeight: '600', marginTop: '2px' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: '800',
                              marginRight: '6px',
                              backgroundColor: isCash ? '#DCFCE7' : '#EEF2FF',
                              color: isCash ? '#15803D' : '#4338CA'
                            }}>
                              {isCash ? 'CASH' : 'UPI'}
                            </span>
                            {subtitle}
                          </div>
                        </div>
                      </div>

                      <div style={{ fontSize: '15px', fontWeight: '800', color: '#16A34A' }}>
                        +{formatCurrency(tx.amount)}
                      </div>
                    </div>
                  );
                })}

                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border-color, #CBD5E1)', paddingTop: '8px', fontSize: '13px', fontWeight: '800' }}>
                  <span>Total Income</span>
                  <span style={{ color: '#16A34A' }}>{formatCurrency(totalIncome)}</span>
                </div>
              </div>
            )}
          </div>

          {/* 6. EXPENSE RECORDS */}
          <div className="stitch-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#DC2626', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ArrowUp size={18} /> Expense Records ({expenseTxs.length})
              </div>
              <button
                className="btn-outline-navy"
                onClick={() => onNavigate('add-expense', { date: currentDate, from: 'daily-details' })}
                style={{ padding: '4px 12px', fontSize: '12px', height: '32px', borderRadius: '8px', fontWeight: '700' }}
              >
                + Add Expense
              </button>
            </div>

            {expenseTxs.length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--text-muted, #94A3B8)', fontStyle: 'italic', padding: '12px 0', textAlign: 'center' }}>
                No expenses recorded for this day.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {expenseTxs.map(tx => {
                  const isCash = tx.paymentMethod === 'CASH';
                  const title = tx.transactionName || tx.name || 'Unnamed Transaction';
                  const accountLabel = tx.accountName || 'Bank';
                  const subtitle = isCash
                    ? `CASH${tx.description ? ` • ${tx.description}` : ''}`
                    : `${accountLabel} • UPI${tx.description ? ` • ${tx.description}` : ''}`;

                  return (
                    <div
                      key={tx.id}
                      onClick={() => handleOpenTx(tx)}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color, #E2E8F0)',
                        backgroundColor: 'var(--bg-app, #F8FAFC)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          backgroundColor: '#FEE2E2',
                          color: '#DC2626',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {isCash ? <Wallet size={18} /> : <CreditCard size={18} />}
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main, #0F172A)' }}>
                            {title}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary, #64748B)', fontWeight: '600', marginTop: '2px' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: '800',
                              marginRight: '6px',
                              backgroundColor: isCash ? '#DCFCE7' : '#EEF2FF',
                              color: isCash ? '#15803D' : '#4338CA'
                            }}>
                              {isCash ? 'CASH' : 'UPI'}
                            </span>
                            {subtitle}
                          </div>
                        </div>
                      </div>

                      <div style={{ fontSize: '15px', fontWeight: '800', color: '#DC2626' }}>
                        -{formatCurrency(tx.amount)}
                      </div>
                    </div>
                  );
                })}

                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border-color, #CBD5E1)', paddingTop: '8px', fontSize: '13px', fontWeight: '800' }}>
                  <span>Total Expense</span>
                  <span style={{ color: '#DC2626' }}>{formatCurrency(totalExpense)}</span>
                </div>
              </div>
            )}
          </div>

          {/* 7. CASH MOVEMENTS (BANK → CASH TRANSFERS) */}
          <div className="stitch-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#4338CA', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ArrowDownToLine size={18} /> Cash Movements ({withdrawalTxs.length})
              </div>
              <button
                className="btn-outline-navy"
                onClick={() => setIsWithdrawModalOpen(true)}
                style={{ padding: '4px 12px', fontSize: '12px', height: '32px', borderRadius: '8px', fontWeight: '700', borderColor: '#C7D2FE', color: '#4338CA', backgroundColor: '#EEF2FF' }}
              >
                + Cash Withdrawal
              </button>
            </div>

            {withdrawalTxs.length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--text-muted, #94A3B8)', fontStyle: 'italic', padding: '12px 0', textAlign: 'center' }}>
                No cash withdrawals or transfers recorded for this day.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {withdrawalTxs.map(tx => {
                  const title = tx.transactionName || tx.name || 'Cash Withdrawal';
                  const accountLabel = tx.accountName || 'Bank';
                  const subtitle = `${accountLabel} → Cash${tx.description ? ` • ${tx.description}` : ''}`;

                  return (
                    <div
                      key={tx.id}
                      onClick={() => handleOpenTx(tx)}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '12px',
                        border: '1px solid #C7D2FE',
                        backgroundColor: '#F8FAFC',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          backgroundColor: '#EEF2FF',
                          color: '#4338CA',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <Landmark size={18} />
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main, #0F172A)' }}>
                            {title}
                          </div>
                          <div style={{ fontSize: '11px', color: '#4338CA', fontWeight: '600', marginTop: '2px' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: '800',
                              marginRight: '6px',
                              backgroundColor: '#EEF2FF',
                              color: '#4338CA'
                            }}>
                              TRANSFER
                            </span>
                            {subtitle}
                          </div>
                        </div>
                      </div>

                      <div style={{ fontSize: '15px', fontWeight: '800', color: '#4338CA' }}>
                        +{formatCurrency(tx.amount)}
                      </div>
                    </div>
                  );
                })}

                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border-color, #CBD5E1)', paddingTop: '8px', fontSize: '13px', fontWeight: '800' }}>
                  <span>Total Cash Withdrawn</span>
                  <span style={{ color: '#4338CA' }}>+{formatCurrency(totalWithdrawals)}</span>
                </div>
              </div>
            )}
          </div>

          {/* 8. CASH VS NON-CASH ACTIVITY */}
          <div className="stitch-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary, #64748B)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              CASH VS NON-CASH ACTIVITY
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
              {/* Cash Movement Card */}
              <div style={{ backgroundColor: 'var(--bg-app, #F8FAFC)', padding: '12px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--navy-primary, #1E293B)' }}>PHYSICAL CASH MOVEMENT</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-secondary, #64748B)' }}>Cash Income</span>
                  <span style={{ fontWeight: '700', color: '#16A34A' }}>+{formatCurrency(cashIncome)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-secondary, #64748B)' }}>Cash Expense</span>
                  <span style={{ fontWeight: '700', color: '#DC2626' }}>-{formatCurrency(cashExpense)}</span>
                </div>
                {cashWithdrawal > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: '#4338CA' }}>Withdrawals (Bank → Cash)</span>
                    <span style={{ fontWeight: '700', color: '#4338CA' }}>+{formatCurrency(cashWithdrawal)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '800', borderTop: '1px dashed var(--border-color, #CBD5E1)', paddingTop: '4px', marginTop: '2px' }}>
                  <span>Net Cash Change</span>
                  <span style={{ color: 'var(--navy-primary, #1E293B)' }}>{formatCurrency(netCashChange, true)}</span>
                </div>
              </div>

              {/* Non-Cash Card */}
              <div style={{ backgroundColor: 'var(--bg-app, #F8FAFC)', padding: '12px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary, #64748B)' }}>NON-CASH (UPI / BANK)</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-secondary, #64748B)' }}>UPI/Bank Income</span>
                  <span style={{ fontWeight: '700', color: '#16A34A' }}>+{formatCurrency(nonCashIncome)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-secondary, #64748B)' }}>UPI/Bank Expense</span>
                  <span style={{ fontWeight: '700', color: '#DC2626' }}>-{formatCurrency(nonCashExpense)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '800', borderTop: '1px dashed var(--border-color, #CBD5E1)', paddingTop: '4px', marginTop: '2px' }}>
                  <span>Net Non-Cash Flow</span>
                  <span style={{ color: 'var(--text-main, #0F172A)' }}>{formatCurrency(nonCashNet, true)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 9. HOME CASH CALCULATION */}
          <div className="stitch-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary, #64748B)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              HOME CASH CALCULATION
            </div>

            <div style={{ backgroundColor: 'var(--bg-app, #F8FAFC)', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary, #64748B)', fontWeight: '600' }}>Previous Day Cash (Opening)</span>
                <span style={{ fontWeight: '700' }}>{formatCurrency(previousDayCash)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#16A34A', fontWeight: '600' }}>+ Today's Cash Income</span>
                <span style={{ fontWeight: '700', color: '#16A34A' }}>+{formatCurrency(cashIncome)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#DC2626', fontWeight: '600' }}>− Today's Cash Expense</span>
                <span style={{ fontWeight: '700', color: '#DC2626' }}>-{formatCurrency(cashExpense)}</span>
              </div>
              {cashWithdrawal > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#4338CA', fontWeight: '600' }}>+ Cash Withdrawals (Bank → Cash)</span>
                  <span style={{ fontWeight: '700', color: '#4338CA' }}>+{formatCurrency(cashWithdrawal)}</span>
                </div>
              )}
              <div style={{ borderTop: '1.5px solid var(--border-color, #CBD5E1)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: '800', fontSize: '15px' }}>
                <span style={{ color: 'var(--navy-primary, #1E293B)' }}>EXPECTED CASH</span>
                <span style={{ color: 'var(--navy-primary, #1E293B)' }}>{formatCurrency(expectedClosing)}</span>
              </div>
            </div>
          </div>

          {/* 10. PHYSICAL CASH COUNT */}
          <div className="stitch-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary, #64748B)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                  PHYSICAL CASH COUNT
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary, #64748B)' }}>Cash counted at home</div>
              </div>

              <button
                className="btn-outline-navy"
                onClick={() => onNavigate('count-cash', { targetDate: currentDate, from: 'daily-details' })}
                style={{ padding: '6px 12px', fontSize: '11px', height: 'auto', borderRadius: '6px' }}
              >
                <Calculator size={14} /> {hasCountData ? 'Recount' : 'Count Cash'}
              </button>
            </div>

            {!hasCountData ? (
              <div style={{ textAlign: 'center', padding: '20px', backgroundColor: 'var(--bg-app, #F8FAFC)', borderRadius: '10px' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary, #64748B)', marginBottom: '10px' }}>
                  Physical cash has not been counted yet for this day.
                </div>
                <button
                  className="btn-primary-navy"
                  onClick={() => onNavigate('count-cash', { targetDate: currentDate, from: 'daily-details' })}
                  style={{ padding: '8px 16px', fontSize: '12px', height: 'auto', display: 'inline-flex', width: 'auto' }}
                >
                  <Calculator size={14} /> Count Cash Now
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary, #64748B)', borderBottom: '1px solid var(--border-color, #E2E8F0)', paddingBottom: '6px' }}>
                  <span>Denomination</span>
                  <span style={{ textAlign: 'center' }}>Quantity</span>
                  <span style={{ textAlign: 'right' }}>Total</span>
                </div>

                {denominations.map(d => {
                  const subtotal = d.value * d.qty;
                  return (
                    <div key={d.label} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', fontSize: '13px', alignItems: 'center', padding: '3px 0' }}>
                      <span style={{ fontWeight: '700', color: 'var(--navy-primary, #1E293B)' }}>{d.label}</span>
                      <span style={{ textAlign: 'center', color: 'var(--text-main, #0F172A)', fontWeight: '600' }}>× {d.qty}</span>
                      <span style={{ textAlign: 'right', fontWeight: '700', color: 'var(--text-main, #0F172A)' }}>{formatCurrency(subtotal)}</span>
                    </div>
                  );
                })}

                <div style={{ borderTop: '1.5px solid var(--border-color, #CBD5E1)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main, #0F172A)' }}>PHYSICAL CASH</span>
                  <span style={{ fontSize: '18px', fontWeight: '800', color: 'var(--navy-primary, #1E293B)' }}>{formatCurrency(physicalCash)}</span>
                </div>
              </div>
            )}
          </div>

          {/* 11. CASH RECONCILIATION */}
          <div className="stitch-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary, #64748B)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              CASH RECONCILIATION
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary, #64748B)' }}>Expected Cash:</span>
                <span style={{ fontWeight: '700' }}>{formatCurrency(expectedClosing)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary, #64748B)' }}>Physical Cash:</span>
                <span style={{ fontWeight: '700' }}>{hasCountData ? formatCurrency(physicalCash) : 'Not counted'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary, #64748B)' }}>Difference:</span>
                <span style={{ fontWeight: '800', color: isShort ? '#DC2626' : (isExtra ? '#B45309' : '#16A34A') }}>
                  {formatCurrency(difference, true)}
                </span>
              </div>
            </div>

            {/* Reconciliation Banner */}
            {isTallied ? (
              <div style={{ backgroundColor: '#DCFCE7', border: '1px solid rgba(22,163,74,0.3)', borderRadius: '10px', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle size={20} color="#16A34A" />
                <div>
                  <div style={{ color: '#16A34A', fontWeight: '800', fontSize: '13px' }}>
                    ✓ CASH TALLIED
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary, #64748B)' }}>
                    Physical cash matches expected cash perfectly.
                  </div>
                </div>
              </div>
            ) : isShort ? (
              <div style={{ backgroundColor: '#FEE2E2', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#DC2626', fontWeight: '800', fontSize: '13px' }}>
                  <AlertTriangle size={16} />
                  <span>⚠ CASH SHORT BY {formatCurrency(diffAbs)}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn-outline-navy"
                    onClick={() => onNavigate('count-cash', { targetDate: currentDate, from: 'daily-details' })}
                    style={{ flex: 1, padding: '6px', fontSize: '11px', height: 'auto', borderColor: '#DC2626', color: '#DC2626' }}
                  >
                    <RefreshCw size={12} /> Recount Cash
                  </button>
                  <button
                    className="btn-primary-navy"
                    onClick={() => onNavigate('add-expense', { date: currentDate, from: 'daily-details' })}
                    style={{ flex: 1, padding: '6px', fontSize: '11px', height: 'auto' }}
                  >
                    + Add Missing Expense
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ backgroundColor: 'rgba(217, 119, 6, 0.1)', border: '1px solid rgba(217,119,6,0.3)', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#B45309', fontWeight: '800', fontSize: '13px' }}>
                  <AlertTriangle size={16} />
                  <span>⚠ CASH EXTRA BY {formatCurrency(diffAbs)}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn-outline-navy"
                    onClick={() => onNavigate('count-cash', { targetDate: currentDate, from: 'daily-details' })}
                    style={{ flex: 1, padding: '6px', fontSize: '11px', height: 'auto', borderColor: '#B45309', color: '#B45309' }}
                  >
                    <RefreshCw size={12} /> Recount Cash
                  </button>
                  <button
                    className="btn-primary-navy"
                    onClick={() => onNavigate('add-income', { date: currentDate, from: 'daily-details' })}
                    style={{ flex: 1, padding: '6px', fontSize: '11px', height: 'auto' }}
                  >
                    + Add Missing Income
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 12. DAILY CLOSING STATUS */}
          <div className="stitch-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary, #64748B)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              DAILY CLOSING STATUS
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main, #0F172A)' }}>
                  {cashData?.isClosed ? 'Day Closed' : 'Day Not Closed'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary, #64748B)' }}>
                  {cashData?.isClosed ? `${formattedDate}` : 'Closing today\'s cash will lock the financial record for tomorrow.'}
                </div>
              </div>

              {!cashData?.isClosed && (
                <button
                  className="btn-primary-navy"
                  onClick={() => onNavigate('close-day', { date: currentDate })}
                  style={{ padding: '8px 14px', fontSize: '12px', height: 'auto' }}
                >
                  <Moon size={14} /> Close Day
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit / View Modal using SimpleTransactionSheet */}
      {isEditSheetOpen && selectedTx && (
        <SimpleTransactionSheet
          isOpen={isEditSheetOpen}
          editTx={selectedTx}
          onClose={() => {
            setIsEditSheetOpen(false);
            setSelectedTx(null);
          }}
          onSuccess={() => {
            setIsEditSheetOpen(false);
            setSelectedTx(null);
            clearCache();
            loadDailyDetails();
          }}
        />
      )}

      {/* Cash Withdrawal Modal */}
      <CashWithdrawalModal
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        onSuccess={() => {
          clearCache();
          loadDailyDetails();
        }}
      />
    </div>
  );
}
