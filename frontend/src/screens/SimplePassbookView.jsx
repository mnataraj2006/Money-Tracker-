import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Mic, Settings } from 'lucide-react';
import { summaryAPI, transactionsAPI, bankAccountsAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import SimpleTransactionSheet from '../components/SimpleTransactionSheet';
import VoiceEntryModal from '../components/VoiceEntryModal';
import TodayTransactionsSheet from '../components/TodayTransactionsSheet';
import '../styles/SimplePassbookView.css';

export default function SimplePassbookView({ user, onSwitchMode, onNavigate }) {
  const { t, language } = useLanguage();
  const [currentDate, setCurrentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [transactions, setTransactions] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [currentBalance, setCurrentBalance] = useState(0);

  // Bottom Sheet State
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);

  // Today's Income / Expense Details Sheet State
  const [detailsSheetOpen, setDetailsSheetOpen] = useState(false);
  const [detailsSheetType, setDetailsSheetType] = useState('INCOME');

  // Voice State
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [voicePreset, setVoicePreset] = useState(null);

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    loadDailyData();
  }, [currentDate]);

  const loadDailyData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [data, bankRes] = await Promise.all([
        summaryAPI.getDailyDetails(currentDate),
        bankAccountsAPI.getAll().catch(() => ({ bankAccounts: [] }))
      ]);
      
      const txs = data.transactions || [];
      setTransactions(txs);
      setBankAccounts(bankRes.bankAccounts || []);

      const inc = txs.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);
      const exp = txs.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);
      
      setTotalIncome(inc);
      setTotalExpense(exp);
      
      if (data.closingBalance !== undefined && data.closingBalance !== null) {
        setCurrentBalance(data.closingBalance);
      } else if (data.dashboard && data.dashboard.totalBalance !== undefined) {
        setCurrentBalance(data.dashboard.totalBalance);
      } else {
        setCurrentBalance(inc - exp);
      }
    } catch (err) {
      console.error('Failed to load passbook daily details:', err);
      setError(t('unableToLoadHistory'));
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

  const handleTodayClick = () => {
    setCurrentDate(todayStr);
  };

  const formatDateDisplay = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    if (language === 'ta') {
      const monthNamesTa = [
        'ஜனவரி', 'பிப்ரவரி', 'மார்ச்', 'ஏப்ரல்', 'மே', 'ஜூன்',
        'ஜூலை', 'ஆகஸ்ட்', 'செப்டம்பர்', 'அக்டோபர்', 'நவம்பர்', 'டிசம்பர்'
      ];
      return `${d.getDate()} ${monthNamesTa[d.getMonth()]} ${d.getFullYear()}`;
    } else {
      return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    }
  };

  const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    return `₹ ${num.toLocaleString(language === 'ta' ? 'ta-IN' : 'en-IN')}`;
  };

  const handleOpenNewSheet = () => {
    setSelectedTx(null);
    setVoicePreset(null);
    setSheetOpen(true);
  };

  const handleOpenEditSheet = (tx) => {
    setSelectedTx(tx);
    setVoicePreset(null);
    setSheetOpen(true);
  };

  const handleVoiceSuccess = (parsedData) => {
    setShowVoiceModal(false);
    if (parsedData) {
      setSelectedTx(null);
      setVoicePreset({
        type: parsedData.type || 'EXPENSE',
        amount: parsedData.amount || '',
        note: parsedData.note || ''
      });
      setSheetOpen(true);
    }
  };

  const incomeTxs = transactions.filter(t => t.type === 'INCOME');
  const expenseTxs = transactions.filter(t => t.type === 'EXPENSE');

  return (
    <div className="passbook-container">
      {/* 1. Top Header */}
      <div className="passbook-header">
        <div className="passbook-title-area">
          <h2 className="passbook-title">{t('income')} / {t('expense')}</h2>
          <span className="passbook-mode-badge">{t('simplePassbookMode')}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="passbook-switch-btn" onClick={onSwitchMode}>
            {t('normalMode')}
          </button>
          {onNavigate && (
            <button className="passbook-switch-btn" onClick={() => onNavigate('settings')}>
              <Settings size={16} style={{ verticalAlign: 'middle' }} />
            </button>
          )}
        </div>
      </div>

      {/* 2. Date Navigator */}
      <div className="passbook-date-nav">
        <button className="passbook-arrow-btn" onClick={handlePrevDay} aria-label="Previous day">
          <ChevronLeft size={24} />
        </button>

        <div className="passbook-date-display">
          <div className="passbook-date-text">
            {formatDateDisplay(currentDate)}
          </div>
          {currentDate !== todayStr && (
            <button className="passbook-today-chip" onClick={handleTodayClick}>
              {t('today')}
            </button>
          )}
        </div>

        <button className="passbook-arrow-btn" onClick={handleNextDay} aria-label="Next day">
          <ChevronRight size={24} />
        </button>
      </div>

      {/* 3. Balance Banner */}
      <div className="passbook-balance-banner">
        <span className="passbook-balance-label">{t('todaysBalance')}</span>
        <span className="passbook-balance-amount">{formatCurrency(currentBalance)}</span>
      </div>

      {/* 4. Ledger Content */}
      <div className="passbook-ledger">
        {/* Voice Quick Assistant Entry */}
        <div className="passbook-voice-bar" onClick={() => setShowVoiceModal(true)}>
          <div className="passbook-voice-info">
            <div className="passbook-voice-mic-icon">
              <Mic size={20} />
            </div>
            <span>{t('speakToRecord')}</span>
          </div>
        </div>

        {error && (
          <div style={{ color: '#c62828', background: '#ffebee', padding: '12px', borderRadius: '8px', textAlign: 'center', fontSize: '15px' }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textTransform: 'uppercase', textAlign: 'center', padding: '30px', color: '#666', fontWeight: 'bold' }}>
            {t('loading')}
          </div>
        ) : (
          <>
            {/* Income Section */}
            <div className="passbook-section">
              <div
                className="passbook-section-header income"
                onClick={() => {
                  setDetailsSheetType('INCOME');
                  setDetailsSheetOpen(true);
                }}
                style={{ cursor: 'pointer' }}
              >
                <span className="passbook-section-title income">{t('income')}</span>
                <span className="passbook-section-total income">
                  {t('totalIncome')} {formatCurrency(totalIncome)}
                </span>
              </div>

              {incomeTxs.length === 0 ? (
                <div className="passbook-empty">
                  {t('noIncomeEntries')}
                </div>
              ) : (
                <div className="passbook-row-list">
                  {incomeTxs.map((tx) => (
                    <div
                      key={tx.id || tx._id}
                      className="passbook-row"
                      onClick={() => handleOpenEditSheet(tx)}
                    >
                      <div className="passbook-row-left">
                        <span className="passbook-row-title">
                          {tx.transactionName || tx.name || t('unnamedTransaction')}
                        </span>
                        {tx.description && (
                          <span className="passbook-row-desc">{tx.description}</span>
                        )}
                      </div>
                      <div className="passbook-row-right income">
                        {formatCurrency(tx.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Expense Section */}
            <div className="passbook-section">
              <div
                className="passbook-section-header expense"
                onClick={() => {
                  setDetailsSheetType('EXPENSE');
                  setDetailsSheetOpen(true);
                }}
                style={{ cursor: 'pointer' }}
              >
                <span className="passbook-section-title expense">{t('expense')}</span>
                <span className="passbook-section-total expense">
                  {t('totalExpense')} {formatCurrency(totalExpense)}
                </span>
              </div>

              {expenseTxs.length === 0 ? (
                <div className="passbook-empty">
                  {t('noExpenseEntries')}
                </div>
              ) : (
                <div className="passbook-row-list">
                  {expenseTxs.map((tx) => (
                    <div
                      key={tx.id || tx._id}
                      className="passbook-row"
                      onClick={() => handleOpenEditSheet(tx)}
                    >
                      <div className="passbook-row-left">
                        <span className="passbook-row-title">
                          {tx.transactionName || tx.name || t('unnamedTransaction')}
                        </span>
                        {tx.description && (
                          <span className="passbook-row-desc">{tx.description}</span>
                        )}
                      </div>
                      <div className="passbook-row-right expense">
                        {formatCurrency(tx.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* General Empty State if both are 0 */}
            {incomeTxs.length === 0 && expenseTxs.length === 0 && (
              <div className="passbook-empty" style={{ background: '#e8f5e9', border: '1px dashed #a5d6a7', color: '#1b5e20' }}>
                <strong>{t('noRecordsToday')}</strong>
                <div style={{ marginTop: '4px', fontSize: '14px' }}>
                  {t('tapPlusToAddRecord')}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating Action Button (+) */}
      <button className="passbook-fab" onClick={handleOpenNewSheet} aria-label="Add transaction">
        <Plus size={36} />
      </button>

      {/* Transaction Bottom Sheet */}
      <SimpleTransactionSheet
        isOpen={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
          setSelectedTx(null);
          setVoicePreset(null);
        }}
        onSuccess={loadDailyData}
        initialDate={currentDate}
        editTx={selectedTx}
        presetType={voicePreset?.type}
        presetAmount={voicePreset?.amount}
        presetNote={voicePreset?.note}
      />

      {/* Voice Entry Modal */}
      {showVoiceModal && (
        <VoiceEntryModal
          isOpen={showVoiceModal}
          onClose={() => setShowVoiceModal(false)}
          onSuccess={handleVoiceSuccess}
          initialDate={currentDate}
        />
      )}

      {/* Today's Income / Expense Details Bottom Sheet */}
      <TodayTransactionsSheet
        isOpen={detailsSheetOpen}
        onClose={() => setDetailsSheetOpen(false)}
        type={detailsSheetType}
        totalAmount={detailsSheetType === 'INCOME' ? totalIncome : totalExpense}
        transactions={transactions}
        bankAccounts={bankAccounts}
        onSelectTransaction={(tx) => {
          setDetailsSheetOpen(false);
          handleOpenEditSheet(tx);
        }}
      />
    </div>
  );
}
