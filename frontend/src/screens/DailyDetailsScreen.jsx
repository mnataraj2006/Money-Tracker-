import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Plus,
  Minus,
  Briefcase,
  Utensils,
  ShoppingBag,
  Coffee,
  CreditCard,
  Trash2,
  Edit3,
  Moon,
  RefreshCw,
  Calculator,
  X,
  Clock
} from 'lucide-react';
import { transactionsAPI, summaryAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import PageContainer from '../components/PageContainer';

export default function DailyDetailsScreen({ initialDate, onBack, onNavigate, user }) {
  const { t, language } = useLanguage();
  const [currentDate, setCurrentDate] = useState(
    initialDate || new Date().toISOString().split('T')[0]
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [transactions, setTransactions] = useState([]);
  const [cashData, setCashData] = useState(null);

  // Edit / Delete Modal State
  const [selectedTx, setSelectedTx] = useState(null);
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
      setCashData(res);
    } catch (err) {
      console.error('Failed to load daily details:', err);
      setError('Unable to load daily details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrevDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    setCurrentDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    setCurrentDate(d.toISOString().split('T')[0]);
  };

  const handleDeleteTransaction = async () => {
    if (!selectedTx) return;
    setActionLoading(true);
    try {
      await transactionsAPI.delete(selectedTx.id);
      setShowConfirmDelete(false);
      setSelectedTx(null);
      loadDailyDetails();
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

  const getCategoryIcon = (category) => {
    const cat = (category || '').toLowerCase();
    if (cat.includes('salary') || cat.includes('income')) return <Briefcase size={16} color="#16A34A" />;
    if (cat.includes('food') || cat.includes('breakfast')) return <Utensils size={16} color="#DC2626" />;
    if (cat.includes('grocery') || cat.includes('shopping')) return <ShoppingBag size={16} color="#DC2626" />;
    if (cat.includes('coffee')) return <Coffee size={16} color="#DC2626" />;
    return <CreditCard size={16} color="var(--navy-primary)" />;
  };

  // Compute daily totals
  const incomeTxs = transactions.filter(t => t.type === 'INCOME');
  const expenseTxs = transactions.filter(t => t.type === 'EXPENSE');
  const withdrawalTxs = transactions.filter(t => t.type === 'CASH_WITHDRAWAL');

  const totalIncome = incomeTxs.reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = expenseTxs.reduce((sum, t) => sum + t.amount, 0);
  const totalWithdrawals = withdrawalTxs.reduce((sum, t) => sum + t.amount, 0);
  const netBalance = totalIncome - totalExpense;

  const cashIncome = incomeTxs.filter(t => t.paymentMethod === 'CASH').reduce((sum, t) => sum + t.amount, 0);
  const cashExpense = expenseTxs.filter(t => t.paymentMethod === 'CASH').reduce((sum, t) => sum + t.amount, 0);
  const cashWithdrawal = cashData?.cashWithdrawal ?? totalWithdrawals;
  const netCashChange = cashIncome - cashExpense + cashWithdrawal;

  const nonCashIncome = totalIncome - cashIncome;
  const nonCashExpense = totalExpense - cashExpense;
  const nonCashTotal = nonCashIncome + nonCashExpense;

  const previousDayCash = cashData?.previousDayCash ?? 0;
  const expectedClosing = cashData?.expectedCash ?? (previousDayCash + netCashChange);
  const physicalCash = cashData?.physicalCash;
  const difference = physicalCash !== null && physicalCash !== undefined ? physicalCash - expectedClosing : 0;
  const status = cashData?.status || 'UNCHECKED';

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

  return (
    <div className="screen-container">
      {/* 1. PAGE HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2px' }}>
        <button
          onClick={onBack}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--navy-primary)',
            cursor: 'pointer'
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="page-title" style={{ margin: 0, fontSize: '20px' }}>Daily Details</h1>
      </div>

      {/* 2. DATE NAVIGATION */}
      <div className="stitch-card" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={handlePrevDay}
          style={{ width: '36px', height: '36px', border: 'none', background: 'var(--bg-app)', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ChevronLeft size={22} color="var(--navy-primary)" />
        </button>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--navy-primary)' }}>
            {formattedDate}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>
            {dayName}
          </div>
        </div>

        <button
          onClick={handleNextDay}
          style={{ width: '36px', height: '36px', border: 'none', background: 'var(--bg-app)', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ChevronRight size={22} color="var(--navy-primary)" />
        </button>
      </div>

      {/* 3. CASH STATUS — HIGH PRIORITY CARD */}
      <div style={{ marginTop: '2px' }}>
        {!hasCountData ? (
          <div className="badge-pill" style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '13px', background: '#F1F5F9', color: '#475569', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={16} />
            <span>○ CASH NOT COUNTED YET</span>
          </div>
        ) : isTallied ? (
          <div className="badge-pill tallied" style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '13px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={18} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontWeight: '800' }}>✓ CASH TALLIED</span>
              <span style={{ fontSize: '11px', opacity: 0.9 }}>Physical cash matches expected cash perfectly</span>
            </div>
          </div>
        ) : isShort ? (
          <div className="badge-pill short" style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '13px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontWeight: '800' }}>⚠ CASH SHORT BY {formatCurrency(diffAbs)}</span>
              <span style={{ fontSize: '11px', opacity: 0.9 }}>Physical cash is less than expected</span>
            </div>
          </div>
        ) : (
          <div className="badge-pill extra" style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '13px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
        <>
          {/* 4. DAILY FINANCIAL SUMMARY */}
          <div className="stitch-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              DAILY FINANCIAL SUMMARY
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', textAlign: 'center', background: 'var(--bg-app)', padding: '12px', borderRadius: '10px' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--green-income)', fontWeight: '700' }}>Income</div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--green-income)', marginTop: '2px' }}>
                  {formatCurrency(totalIncome)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: 'var(--red-expense)', fontWeight: '700' }}>Expense</div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--red-expense)', marginTop: '2px' }}>
                  {formatCurrency(totalExpense)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: netBalance >= 0 ? 'var(--navy-primary)' : 'var(--red-expense)', fontWeight: '700' }}>Net</div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: netBalance >= 0 ? 'var(--navy-primary)' : 'var(--red-expense)', marginTop: '2px' }}>
                  {formatCurrency(netBalance, true)}
                </div>
              </div>
            </div>
          </div>

          {/* 5. INCOME RECORDS */}
          <div className="stitch-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--green-income)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ArrowDown size={16} /> Income Records ({incomeTxs.length})
              </div>
              <button
                className="btn-outline-navy"
                onClick={() => onNavigate('add-income', { date: currentDate, from: 'daily-details' })}
                style={{ padding: '4px 12px', fontSize: '11px', height: '32px', borderRadius: '6px' }}
              >
                + Add
              </button>
            </div>

            {incomeTxs.length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '12px 0', textAlign: 'center' }}>
                No income recorded for this day.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {incomeTxs.map(tx => {
                  const isCash = tx.paymentMethod === 'CASH';
                  return (
                    <div
                      key={tx.id}
                      onClick={() => setSelectedTx(tx)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-app)',
                        display: 'flex',
                        justify: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: 'var(--green-income-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {getCategoryIcon(tx.category)}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>
                            {(tx.description && tx.description.trim()) ? tx.description.trim() : tx.category}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            {tx.paymentMethod} • {tx.category}
                          </div>
                        </div>
                      </div>

                      <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--green-income)' }}>
                        +{formatCurrency(tx.amount)}
                      </div>
                    </div>
                  );
                })}

                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border-color)', paddingTop: '8px', fontSize: '13px', fontWeight: '800' }}>
                  <span>Total Income</span>
                  <span style={{ color: 'var(--green-income)' }}>{formatCurrency(totalIncome)}</span>
                </div>
              </div>
            )}
          </div>

          {/* 6. EXPENSE RECORDS */}
          <div className="stitch-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--red-expense)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ArrowUp size={16} /> Expense Records ({expenseTxs.length})
              </div>
              <button
                className="btn-outline-navy"
                onClick={() => onNavigate('add-expense', { date: currentDate, from: 'daily-details' })}
                style={{ padding: '4px 12px', fontSize: '11px', height: '32px', borderRadius: '6px' }}
              >
                + Add
              </button>
            </div>

            {expenseTxs.length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '12px 0', textAlign: 'center' }}>
                No expenses recorded for this day.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {expenseTxs.map(tx => {
                  const isCash = tx.paymentMethod === 'CASH';
                  return (
                    <div
                      key={tx.id}
                      onClick={() => setSelectedTx(tx)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-app)',
                        display: 'flex',
                        justify: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: 'var(--red-expense-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {getCategoryIcon(tx.category)}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>
                            {(tx.description && tx.description.trim()) ? tx.description.trim() : tx.category}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            {tx.paymentMethod} • {tx.category}
                          </div>
                        </div>
                      </div>

                      <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--red-expense)' }}>
                        -{formatCurrency(tx.amount)}
                      </div>
                    </div>
                  );
                })}

                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border-color)', paddingTop: '8px', fontSize: '13px', fontWeight: '800' }}>
                  <span>Total Expense</span>
                  <span style={{ color: 'var(--red-expense)' }}>{formatCurrency(totalExpense)}</span>
                </div>
              </div>
            )}
          </div>

          {/* 7. CASH VS NON-CASH ACTIVITY */}
          <div className="stitch-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              CASH VS NON-CASH ACTIVITY
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
              {/* Cash Movement Card */}
              <div style={{ backgroundColor: 'var(--bg-app)', padding: '12px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--navy-primary)' }}>CASH MOVEMENT</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Cash In</span>
                  <span style={{ fontWeight: '700', color: 'var(--green-income)' }}>{formatCurrency(cashIncome)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Cash Out</span>
                  <span style={{ fontWeight: '700', color: 'var(--red-expense)' }}>{formatCurrency(cashExpense)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '800', borderTop: '1px dashed var(--border-color)', paddingTop: '4px', marginTop: '2px' }}>
                  <span>Net Cash</span>
                  <span style={{ color: 'var(--navy-primary)' }}>{formatCurrency(netCashChange, true)}</span>
                </div>
              </div>

              {/* Non-Cash Card */}
              <div style={{ backgroundColor: 'var(--bg-app)', padding: '12px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)' }}>NON-CASH (UPI/BANK/CARD)</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>UPI/Bank In</span>
                  <span style={{ fontWeight: '700', color: 'var(--green-income)' }}>{formatCurrency(nonCashIncome)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>UPI/Bank Out</span>
                  <span style={{ fontWeight: '700', color: 'var(--red-expense)' }}>{formatCurrency(nonCashExpense)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '800', borderTop: '1px dashed var(--border-color)', paddingTop: '4px', marginTop: '2px' }}>
                  <span>Total Non-Cash</span>
                  <span style={{ color: 'var(--text-main)' }}>{formatCurrency(nonCashTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 8. HOME CASH CALCULATION */}
          <div className="stitch-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              HOME CASH CALCULATION
            </div>

            <div style={{ backgroundColor: 'var(--bg-app)', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Previous Day Cash</span>
                <span style={{ fontWeight: '700' }}>{formatCurrency(previousDayCash)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--green-income)', fontWeight: '600' }}>+ Today's Cash Income</span>
                <span style={{ fontWeight: '700', color: 'var(--green-income)' }}>+{formatCurrency(cashIncome)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--red-expense)', fontWeight: '600' }}>− Today's Cash Expense</span>
                <span style={{ fontWeight: '700', color: 'var(--red-expense)' }}>-{formatCurrency(cashExpense)}</span>
              </div>
              {cashWithdrawal > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#4338CA', fontWeight: '600' }}>+ Cash Withdrawals (Bank → Cash)</span>
                  <span style={{ fontWeight: '700', color: '#4338CA' }}>+{formatCurrency(cashWithdrawal)}</span>
                </div>
              )}
              <div style={{ borderTop: '1.5px solid var(--border-color)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: '800', fontSize: '15px' }}>
                <span style={{ color: 'var(--navy-primary)' }}>EXPECTED CASH</span>
                <span style={{ color: 'var(--navy-primary)' }}>{formatCurrency(expectedClosing)}</span>
              </div>
            </div>
          </div>

          {/* 9. PHYSICAL CASH COUNT */}
          <div className="stitch-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                  PHYSICAL CASH COUNT
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Cash counted at home</div>
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
              <div style={{ textAlign: 'center', padding: '20px', backgroundColor: 'var(--bg-app)', borderRadius: '10px' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                  <span>Denomination</span>
                  <span style={{ textAlign: 'center' }}>Quantity</span>
                  <span style={{ textAlign: 'right' }}>Total</span>
                </div>

                {denominations.map(d => {
                  const subtotal = d.value * d.qty;
                  return (
                    <div key={d.label} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', fontSize: '13px', alignItems: 'center', padding: '3px 0' }}>
                      <span style={{ fontWeight: '700', color: 'var(--navy-primary)' }}>{d.label}</span>
                      <span style={{ textAlign: 'center', color: 'var(--text-main)', fontWeight: '600' }}>× {d.qty}</span>
                      <span style={{ textAlign: 'right', fontWeight: '700', color: 'var(--text-main)' }}>{formatCurrency(subtotal)}</span>
                    </div>
                  );
                })}

                <div style={{ borderTop: '1.5px solid var(--border-color)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>PHYSICAL CASH</span>
                  <span style={{ fontSize: '18px', fontWeight: '800', color: 'var(--navy-primary)' }}>{formatCurrency(physicalCash)}</span>
                </div>
              </div>
            )}
          </div>

          {/* 10. CASH RECONCILIATION */}
          <div className="stitch-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              CASH RECONCILIATION
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Expected Cash:</span>
                <span style={{ fontWeight: '700' }}>{formatCurrency(expectedClosing)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Physical Cash:</span>
                <span style={{ fontWeight: '700' }}>{hasCountData ? formatCurrency(physicalCash) : 'Not counted'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Difference:</span>
                <span style={{ fontWeight: '800', color: isShort ? 'var(--red-expense)' : (isExtra ? '#B45309' : 'var(--green-income)') }}>
                  {formatCurrency(difference, true)}
                </span>
              </div>
            </div>

            {/* Reconciliation Banner */}
            {isTallied ? (
              <div style={{ backgroundColor: 'var(--green-income-bg)', border: '1px solid rgba(22,163,74,0.3)', borderRadius: '10px', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle size={20} color="var(--green-income)" />
                <div>
                  <div style={{ color: 'var(--green-income)', fontWeight: '800', fontSize: '13px' }}>
                    ✓ CASH TALLIED
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Physical cash matches expected cash perfectly.
                  </div>
                </div>
              </div>
            ) : isShort ? (
              <div style={{ backgroundColor: 'var(--red-expense-bg)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--red-expense)', fontWeight: '800', fontSize: '13px' }}>
                  <AlertTriangle size={16} />
                  <span>⚠ CASH SHORT BY {formatCurrency(diffAbs)}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn-outline-navy"
                    onClick={() => onNavigate('count-cash', { targetDate: currentDate, from: 'daily-details' })}
                    style={{ flex: 1, padding: '6px', fontSize: '11px', height: 'auto', borderColor: 'var(--red-expense)', color: 'var(--red-expense)' }}
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

          {/* 11. DAILY CLOSING STATUS */}
          <div className="stitch-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              DAILY CLOSING STATUS
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>
                  {cashData?.isClosed ? 'Day Closed' : 'Day Not Closed'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
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
        </>
      )}

      {/* Transaction Edit/Delete Options Modal */}
      {selectedTx && !showConfirmDelete && (
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
          <div className="stitch-card" style={{ width: '100%', maxWidth: '320px', display: 'flex', flexDirection: 'column', gap: '14px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--navy-primary)' }}>
                Transaction Options
              </h3>
              <div onClick={() => setSelectedTx(null)} style={{ cursor: 'pointer' }}>
                <X size={18} color="var(--text-secondary)" />
              </div>
            </div>

            <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' }}>
              {selectedTx.category} ({selectedTx.type})
            </div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: selectedTx.type === 'INCOME' ? 'var(--green-income)' : 'var(--red-expense)' }}>
              {selectedTx.type === 'INCOME' ? '+' : '-'}{formatCurrency(selectedTx.amount)}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              <button
                className="btn-outline-navy"
                onClick={() => {
                  const targetScreen = selectedTx.type === 'INCOME' ? 'add-income' : 'add-expense';
                  onNavigate(targetScreen, { txId: selectedTx.id, date: currentDate, from: 'daily-details' });
                  setSelectedTx(null);
                }}
                style={{ padding: '10px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Edit3 size={16} /> Edit Transaction
              </button>

              <button
                className="btn-outline-navy"
                onClick={() => setShowConfirmDelete(true)}
                style={{ padding: '10px', fontSize: '13px', borderColor: 'var(--red-expense)', color: 'var(--red-expense)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Trash2 size={16} /> Delete Transaction
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Delete */}
      {showConfirmDelete && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          zIndex: 110,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="stitch-card" style={{ width: '100%', maxWidth: '320px', display: 'flex', flexDirection: 'column', gap: '14px', padding: '20px', textAlign: 'center' }}>
            <Trash2 size={32} color="var(--red-expense)" style={{ margin: '0 auto' }} />
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)' }}>
              Delete this transaction?
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              This action cannot be undone and will automatically recalculate your cash balances.
            </p>

            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button
                className="btn-primary-navy"
                onClick={handleDeleteTransaction}
                disabled={actionLoading}
                style={{ flex: 1, backgroundColor: 'var(--red-expense)', borderColor: 'var(--red-expense)' }}
              >
                {actionLoading ? 'Deleting...' : 'Delete'}
              </button>

              <button
                className="btn-outline-navy"
                onClick={() => setShowConfirmDelete(false)}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
