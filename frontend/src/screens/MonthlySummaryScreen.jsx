import React, { useState, useEffect } from 'react';
import { ArrowLeft, Bell, Download } from 'lucide-react';
import { summaryAPI } from '../services/api';

export default function MonthlySummaryScreen({ month = '2026-08', onBack, user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMonthlySummary();
  }, [month]);

  const loadMonthlySummary = async () => {
    try {
      setLoading(true);
      const res = await summaryAPI.getMonthlySummary(month);
      setData(res);
    } catch (err) {
      console.error('Failed to load monthly summary:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) => `₹${(val || 0).toLocaleString('en-IN')}`;

  const totalIncome = data?.totalIncome ?? 0;
  const totalExpenses = data?.totalExpenses ?? 0;
  const netBalance = data?.netBalance ?? 0;
  const cashIncome = data?.cashIncome ?? 0;
  const cashExpenses = data?.cashExpenses ?? 0;
  const incomePercent = data?.incomePercent ?? 50;
  const expensePercent = data?.expensePercent ?? 50;
  const topExpense = data?.topExpenseItem || data?.topExpenseCategory || 'None';
  const expensesList = data?.expenseBreakdown || data?.categoryBreakdown || [];

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
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--navy-primary)' }}>
            August 2026
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Monthly Summary</div>
        </div>

        <button
          onClick={() => alert('Summary report exported as PDF/CSV.')}
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
            gap: '6px'
          }}
        >
          <Download size={14} /> Export
        </button>
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
    </div>
  );
}
