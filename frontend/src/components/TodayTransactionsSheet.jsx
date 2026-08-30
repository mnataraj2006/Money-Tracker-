import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowDown, ArrowUp } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useRegisterModal } from '../context/NavigationContext';

export default function TodayTransactionsSheet({
  isOpen,
  onClose,
  type = 'INCOME',
  totalAmount = 0,
  transactions = [],
  bankAccounts = [],
  onSelectTransaction
}) {
  const { t, language } = useLanguage();

  // Register with modal back stack
  useRegisterModal(isOpen, () => {
    onClose();
    return true;
  });

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isIncome = type === 'INCOME';
  const themeColor = isIncome ? '#16A34A' : '#DC2626';
  const themeBgLight = isIncome ? '#F0FDF4' : '#FEF2F2';
  const themeBorder = isIncome ? '#BBF7D0' : '#FECACA';

  // Bank name lookup map
  const bankMap = (bankAccounts || []).reduce((acc, bank) => {
    acc[bank.id] = bank.name;
    return acc;
  }, {});

  // Helper to format currency
  const formatCurrency = (val) => {
    const num = Math.abs(val || 0);
    return `₹${num.toLocaleString('en-IN')}`;
  };

  // Helper to extract time
  const formatTime = (createdAt) => {
    if (!createdAt) return '';
    try {
      const d = new Date(createdAt);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString(language === 'ta' ? 'ta-IN' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return '';
    }
  };

  // Filter transactions for this type
  const typeTransactions = transactions.filter((tx) => tx.type === type);

  // Separate CASH vs UPI transactions, sorted newest first
  const cashTransactions = typeTransactions
    .filter((tx) => tx.paymentMethod === 'CASH')
    .sort((a, b) => {
      const timeA = new Date(a.createdAt || a.date || 0).getTime();
      const timeB = new Date(b.createdAt || b.date || 0).getTime();
      return timeB - timeA;
    });

  const upiTransactions = typeTransactions
    .filter((tx) => tx.paymentMethod === 'UPI')
    .sort((a, b) => {
      const timeA = new Date(a.createdAt || a.date || 0).getTime();
      const timeB = new Date(b.createdAt || b.date || 0).getTime();
      return timeB - timeA;
    });

  // Calculate section subtotals
  const totalCash = cashTransactions.reduce((sum, tx) => sum + (parseFloat(tx.amount) || 0), 0);
  const totalUpi = upiTransactions.reduce((sum, tx) => sum + (parseFloat(tx.amount) || 0), 0);
  const calculatedTotal = totalCash + totalUpi;
  const grandTotal = totalAmount !== undefined && totalAmount !== null ? totalAmount : calculatedTotal;

  // Labels
  const headerTitle = isIncome ? t('todaysIncome') : t('todaysExpense');
  const totalLabel = isIncome ? t('totalIncome') : t('totalExpense');
  const cashSectionTitle = isIncome ? `💵 ${t('cashIncome')}` : `💵 ${t('cashExpense')}`;
  const upiSectionTitle = isIncome ? `📱 ${t('upiIncome')}` : `📱 ${t('upiExpense')}`;
  const totalCashLabel = isIncome ? t('totalCashIncome') : t('totalCashExpense');
  const totalUpiLabel = isIncome ? t('totalUpiIncome') : t('totalUpiExpense');
  const emptyCashText = isIncome ? t('noCashIncomeToday') : t('noCashExpenseToday');
  const emptyUpiText = isIncome ? t('noUpiIncomeToday') : t('noUpiExpenseToday');

  // Render a single transaction card
  const renderTransactionCard = (tx, isUpi = false) => {
    const txTitle = tx.transactionName || tx.name || t('unnamedTransaction');
    const txTime = formatTime(tx.createdAt);
    const hasDescription = tx.description && typeof tx.description === 'string' && tx.description.trim() !== '' && tx.description !== 'string';

    // Determine payment / bank label
    let paymentLabel = 'CASH';
    if (isUpi) {
      const bankName = tx.accountId ? bankMap[tx.accountId] : null;
      if (bankName) {
        paymentLabel = `${bankName} • UPI`;
      } else {
        paymentLabel = `UPI • ${t('accountNotSelected')}`;
      }
    }

    return (
      <div
        key={tx.id || tx._id}
        onClick={() => {
          if (onSelectTransaction) {
            onSelectTransaction(tx);
          }
        }}
        style={{
          backgroundColor: '#FFFFFF',
          border: '1.5px solid #E2E8F0',
          borderRadius: '14px',
          padding: '14px 16px',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          transition: 'all 0.15s ease'
        }}
      >
        {/* Row 1: Transaction Name & Time */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
          <div
            style={{
              fontSize: '16px',
              fontWeight: '800',
              color: '#0F172A',
              wordBreak: 'break-word',
              lineHeight: '1.3'
            }}
          >
            {txTitle}
          </div>

          {txTime && (
            <div
              style={{
                fontSize: '13px',
                fontWeight: '700',
                color: '#64748B',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
            >
              {txTime}
            </div>
          )}
        </div>

        {/* Row 2: Optional Description */}
        {hasDescription && (
          <div
            style={{
              fontSize: '13px',
              color: '#64748B',
              fontWeight: '500',
              lineHeight: '1.3',
              wordBreak: 'break-word'
            }}
          >
            {tx.description.trim()}
          </div>
        )}

        {/* Row 3: Amount & Payment / Bank Method */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
          <div
            style={{
              fontSize: '18px',
              fontWeight: '800',
              color: themeColor
            }}
          >
            {isIncome ? '+ ' : '- '}{formatCurrency(tx.amount)}
          </div>

          <div
            style={{
              fontSize: '12px',
              fontWeight: '700',
              color: isUpi ? '#4338CA' : '#047857',
              backgroundColor: isUpi ? '#EEF2FF' : '#ECFDF5',
              border: `1px solid ${isUpi ? '#C7D2FE' : '#A7F3D0'}`,
              padding: '4px 10px',
              borderRadius: '8px',
              letterSpacing: '0.2px'
            }}
          >
            {paymentLabel}
          </div>
        </div>
      </div>
    );
  };

  return createPortal(
    <div
      className="sheet-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        zIndex: 100000,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-end',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <div
        className="sheet-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '480px',
          backgroundColor: '#F8FAFC',
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px',
          padding: '20px 18px',
          boxShadow: '0 -8px 30px rgba(0,0,0,0.25)',
          animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* 1. Header with Title and Close Button */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '12px',
            borderBottom: '1px solid #E2E8F0'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                backgroundColor: isIncome ? '#DCFCE7' : '#FEE2E2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {isIncome ? <ArrowDown size={20} color="#16A34A" /> : <ArrowUp size={20} color="#DC2626" />}
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0F172A', margin: 0 }}>
              {headerTitle}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: '#FFFFFF',
              border: '1.5px solid #CBD5E1',
              borderRadius: '50%',
              width: '38px',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#334155',
              transition: 'background-color 0.15s'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* 2. Top Summary Overview Card with Split Breakdown */}
        <div
          style={{
            margin: '14px 0',
            padding: '16px',
            borderRadius: '16px',
            backgroundColor: themeBgLight,
            border: `1.5px solid ${themeBorder}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '800', color: themeColor, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                {totalLabel}
              </div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: themeColor, marginTop: '2px', letterSpacing: '-0.5px' }}>
                {formatCurrency(grandTotal)}
              </div>
            </div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#64748B' }}>
              {typeTransactions.length} {typeTransactions.length === 1 ? 'entry' : 'entries'}
            </div>
          </div>

          {/* Split Pill Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', paddingTop: '10px', borderTop: `1px dashed ${themeBorder}` }}>
            <div style={{ background: '#FFFFFF', padding: '8px 12px', borderRadius: '10px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#047857' }}>💵 Cash</span>
              <span style={{ fontSize: '14px', fontWeight: '800', color: '#047857' }}>{formatCurrency(totalCash)}</span>
            </div>
            <div style={{ background: '#FFFFFF', padding: '8px 12px', borderRadius: '10px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#4338CA' }}>📱 UPI</span>
              <span style={{ fontSize: '14px', fontWeight: '800', color: '#4338CA' }}>{formatCurrency(totalUpi)}</span>
            </div>
          </div>
        </div>

        {/* 3. Scrollable Content Divided into CASH and UPI Sections */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            paddingRight: '2px',
            marginBottom: '6px'
          }}
        >
          {/* ==================== 1. CASH SECTION ==================== */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Section Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '4px 2px'
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {cashSectionTitle}
              </div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#047857' }}>
                {formatCurrency(totalCash)}
              </div>
            </div>

            {/* Cash Transactions List */}
            {cashTransactions.length === 0 ? (
              <div
                style={{
                  padding: '24px 16px',
                  textAlign: 'center',
                  color: '#64748B',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px dashed #CBD5E1',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                {emptyCashText}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {cashTransactions.map((tx) => renderTransactionCard(tx, false))}
              </div>
            )}

            {/* Cash Section Total Footer */}
            {cashTransactions.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  backgroundColor: '#ECFDF5',
                  borderRadius: '10px',
                  border: '1px solid #A7F3D0'
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#047857' }}>
                  {totalCashLabel}
                </span>
                <span style={{ fontSize: '15px', fontWeight: '800', color: '#047857' }}>
                  {formatCurrency(totalCash)}
                </span>
              </div>
            )}
          </div>

          {/* ==================== 2. UPI SECTION ==================== */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Section Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '4px 2px'
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {upiSectionTitle}
              </div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#4338CA' }}>
                {formatCurrency(totalUpi)}
              </div>
            </div>

            {/* UPI Transactions List */}
            {upiTransactions.length === 0 ? (
              <div
                style={{
                  padding: '24px 16px',
                  textAlign: 'center',
                  color: '#64748B',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px dashed #CBD5E1',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                {emptyUpiText}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {upiTransactions.map((tx) => renderTransactionCard(tx, true))}
              </div>
            )}

            {/* UPI Section Total Footer */}
            {upiTransactions.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  backgroundColor: '#EEF2FF',
                  borderRadius: '10px',
                  border: '1px solid #C7D2FE'
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#4338CA' }}>
                  {totalUpiLabel}
                </span>
                <span style={{ fontSize: '15px', fontWeight: '800', color: '#4338CA' }}>
                  {formatCurrency(totalUpi)}
                </span>
              </div>
            )}
          </div>

          {/* ==================== 3. GRAND TOTAL FOOTER ==================== */}
          <div
            style={{
              padding: '14px 16px',
              backgroundColor: '#0F172A',
              color: '#FFFFFF',
              borderRadius: '14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '4px'
            }}
          >
            <span style={{ fontSize: '14px', fontWeight: '800', letterSpacing: '0.5px' }}>
              {totalLabel}
            </span>
            <span style={{ fontSize: '20px', fontWeight: '800' }}>
              {formatCurrency(grandTotal)}
            </span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
