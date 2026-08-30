import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Mic, RefreshCw, X, Save, Plus, AlertCircle, Volume2 } from 'lucide-react';
import { speechService } from '../services/speechRecognitionService';
import { parseTransactionFromSpeech } from '../utils/transactionParser';
import { transactionsAPI, bankAccountsAPI } from '../services/api';
import { useDataCache } from '../context/DataContext';
import { useLanguage } from '../context/LanguageContext';
import { useRegisterModal } from '../context/NavigationContext';
import TransactionNameAutocomplete from './TransactionNameAutocomplete';

export default function VoiceEntryModal({ isOpen, onClose, onSuccess, initialType = null }) {
  const { clearCache } = useDataCache();
  const { t, language } = useLanguage();

  // Register with modal back stack
  useRegisterModal(isOpen, () => {
    onClose();
    return true;
  });

  const [step, setStep] = useState('listening'); // 'listening', 'review'
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');

  // Form State for Review & Confirmation
  const [type, setType] = useState(initialType || 'EXPENSE');
  const [amount, setAmount] = useState('');
  const [name, setName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [accountId, setAccountId] = useState('');
  const [bankAccounts, setBankAccounts] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Quick Add Bank Account modal state inside voice entry
  const [showAddBankModal, setShowAddBankModal] = useState(false);
  const [quickBankName, setQuickBankName] = useState('');
  const [quickOpeningBalance, setQuickOpeningBalance] = useState('');
  const [quickBankLoading, setQuickBankLoading] = useState(false);
  const [quickBankError, setQuickBankError] = useState('');

  // Voice speech language preference (defaulting to current language)
  const [voiceLang, setVoiceLang] = useState(() => {
    return localStorage.getItem('cashly_voice_lang') || (language === 'en' ? 'en-IN' : 'ta-IN');
  });

  const latestTextRef = useRef('');

  useEffect(() => {
    if (isOpen) {
      loadBankAccounts();
      startVoiceRecognition();
    } else {
      speechService.stopListening();
      resetState();
    }
  }, [isOpen]);

  const loadBankAccounts = async () => {
    try {
      const res = await bankAccountsAPI.getAll();
      setBankAccounts(res.bankAccounts || []);
    } catch (err) {
      console.error('Failed to load bank accounts for voice modal:', err);
    }
  };

  const resetState = () => {
    setStep('listening');
    setTranscript('');
    latestTextRef.current = '';
    setIsListening(false);
    setVoiceError('');
    setType(initialType || 'EXPENSE');
    setAmount('');
    setName('');
    setPaymentMethod('CASH');
    setAccountId('');
    setDate(new Date().toISOString().split('T')[0]);
    setDescription('');
    setSaveLoading(false);
    setSaveError('');
    setShowAddBankModal(false);
  };

  const startVoiceRecognition = async (overrideLang = null) => {
    setVoiceError('');
    setTranscript('');
    latestTextRef.current = '';
    setStep('listening');

    const targetLang = overrideLang || voiceLang;

    const success = await speechService.startListening({
      language: targetLang,
      onResult: (text, isFinal) => {
        latestTextRef.current = text;
        setTranscript(text);
      },
      onError: (err) => {
        setIsListening(false);
        setVoiceError(err);
      },
      onEnd: () => {
        setIsListening(false);
        if (latestTextRef.current && latestTextRef.current.trim()) {
          processTranscript(latestTextRef.current);
        }
      }
    });

    setIsListening(success);
  };

  const handleStopListening = () => {
    speechService.stopListening();
    setIsListening(false);
    const textToProcess = latestTextRef.current || transcript;
    if (textToProcess && textToProcess.trim()) {
      processTranscript(textToProcess);
    } else {
      setVoiceError(t('couldNotUnderstand') || 'Could not understand speech. Please try again.');
    }
  };

  const processTranscript = (text) => {
    speechService.stopListening();
    setIsListening(false);

    const parsed = parseTransactionFromSpeech(text);

    // Apply parsed values
    if (parsed.type) {
      setType(parsed.type);
    } else if (initialType) {
      setType(initialType);
    }

    if (parsed.amount) {
      setAmount(parsed.amount.toString());
    } else {
      setAmount('');
    }

    if (parsed.transactionName) {
      setName(parsed.transactionName);
    } else {
      setName('');
    }

    if (parsed.paymentMethod) {
      setPaymentMethod(parsed.paymentMethod);
    } else {
      setPaymentMethod('CASH');
    }

    if (parsed.date) {
      setDate(parsed.date);
    }

    if (parsed.description) {
      setDescription(parsed.description);
    } else {
      setDescription('');
    }

    setStep('review');
  };

  const handleQuickAddBank = async (e) => {
    e.preventDefault();
    setQuickBankError('');
    const clean = quickBankName.trim();
    if (!clean) {
      setQuickBankError('Bank name is required');
      return;
    }
    const numOpening = parseFloat(quickOpeningBalance || '0');
    if (isNaN(numOpening)) {
      setQuickBankError('Opening balance must be a number');
      return;
    }

    try {
      setQuickBankLoading(true);
      const res = await bankAccountsAPI.create({
        name: clean,
        openingBalance: numOpening
      });
      const created = res.bankAccount;
      if (created) {
        setBankAccounts(prev => [...prev, created]);
        setAccountId(created.id);
      }
      setQuickBankName('');
      setQuickOpeningBalance('');
      setShowAddBankModal(false);
    } catch (err) {
      setQuickBankError(err.message || 'Failed to create bank account');
    } finally {
      setQuickBankLoading(false);
    }
  };

  const handleSaveTransaction = async (e) => {
    if (e) e.preventDefault();
    setSaveError('');

    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setSaveError(language === 'ta' ? 'தயவுசெய்து சரியான தொகையை உள்ளிடவும்' : 'Please enter a valid amount greater than 0');
      return;
    }

    if (!name.trim()) {
      setSaveError(t('pleaseEnterTxName') || 'Please enter a transaction name');
      return;
    }

    if (paymentMethod === 'UPI' && (!accountId || accountId === 'CASH')) {
      setSaveError(language === 'ta' ? 'வங்கி கணக்கைத் தேர்ந்தெடுக்கவும்' : 'Please select a Bank Account for UPI transaction');
      return;
    }

    setSaveLoading(true);

    try {
      await transactionsAPI.create({
        type,
        amount: numAmount,
        transactionName: name.trim(),
        name: name.trim(),
        paymentMethod,
        accountId: paymentMethod === 'CASH' ? 'CASH' : accountId,
        description: description.trim(),
        date
      });

      clearCache();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to save voice transaction:', err);
      setSaveError(err.message || 'Failed to save transaction');
    } finally {
      setSaveLoading(false);
    }
  };

  if (!isOpen) return null;

  const isIncome = type === 'INCOME';
  const themeColor = isIncome ? '#16A34A' : '#DC2626';

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
          backgroundColor: '#FFFFFF',
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px',
          padding: '20px 18px',
          boxShadow: '0 -8px 30px rgba(0,0,0,0.25)',
          animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '14px',
            borderBottom: '1px solid #E2E8F0',
            marginBottom: '14px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: '#EEF2FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Mic size={20} color="#4F46E5" />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A', margin: 0 }}>
              {t('voiceEntry')}
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Voice Language Toggle (Tamil / English) */}
            <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: '8px', padding: '2px' }}>
              <button
                type="button"
                onClick={() => {
                  setVoiceLang('ta-IN');
                  localStorage.setItem('cashly_voice_lang', 'ta-IN');
                  if (step === 'listening') startVoiceRecognition('ta-IN');
                }}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  backgroundColor: voiceLang.startsWith('ta') ? '#4F46E5' : 'transparent',
                  color: voiceLang.startsWith('ta') ? '#FFFFFF' : '#64748B'
                }}
              >
                தமிழ்
              </button>
              <button
                type="button"
                onClick={() => {
                  setVoiceLang('en-IN');
                  localStorage.setItem('cashly_voice_lang', 'en-IN');
                  if (step === 'listening') startVoiceRecognition('en-IN');
                }}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  backgroundColor: voiceLang.startsWith('en') ? '#4F46E5' : 'transparent',
                  color: voiceLang.startsWith('en') ? '#FFFFFF' : '#64748B'
                }}
              >
                English
              </button>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              style={{
                background: '#F1F5F9',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#334155'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* STEP 1: LISTENING VIEW */}
        {step === 'listening' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 12px 16px', textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => isListening ? handleStopListening() : startVoiceRecognition()}
              aria-label={isListening ? t('tapToStop') : t('tapToSpeak')}
              style={{
                width: '96px',
                height: '96px',
                borderRadius: '50%',
                backgroundColor: isListening ? '#FEE2E2' : '#EEF2FF',
                border: isListening ? '3px solid #DC2626' : '3px solid #6366F1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '18px',
                boxShadow: isListening ? '0 0 0 14px rgba(239, 68, 68, 0.2)' : '0 8px 24px rgba(79, 70, 229, 0.15)',
                transition: 'all 0.25s ease',
                cursor: 'pointer',
                outline: 'none',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              <Mic size={44} color={isListening ? '#DC2626' : '#4F46E5'} />
            </button>

            <div style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A', marginBottom: '8px' }}>
              {isListening ? t('listening') : t('tapToSpeak')}
            </div>

            {transcript ? (
              <div
                style={{
                  background: '#F8FAFC',
                  border: '1.5px solid #E2E8F0',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  width: '100%',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#1E293B',
                  minHeight: '60px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '18px'
                }}
              >
                "{transcript}"
              </div>
            ) : (
              <div style={{ color: '#64748B', fontSize: '13px', marginBottom: '24px', lineHeight: '1.4' }}>
                {language === 'ta'
                  ? 'எ.கா: "பெட்ரோல் 500 செலவு" அல்லது "அப்பா 5000 வரவு"'
                  : 'e.g. "Petrol 500 expense" or "Salary 5000 income"'}
              </div>
            )}

            {voiceError && (
              <div style={{ background: '#FEE2E2', color: '#DC2626', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', marginBottom: '16px', width: '100%' }}>
                {voiceError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
              {isListening ? (
                <button
                  type="button"
                  onClick={handleStopListening}
                  style={{
                    flex: 1,
                    padding: '14px',
                    backgroundColor: '#DC2626',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: '800',
                    cursor: 'pointer'
                  }}
                >
                  {t('tapToStop')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => startVoiceRecognition()}
                  style={{
                    flex: 1,
                    padding: '14px',
                    backgroundColor: '#4F46E5',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: '800',
                    cursor: 'pointer'
                  }}
                >
                  {t('tapToSpeak')}
                </button>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: REVIEW TRANSACTION FORM (Matches Add Transaction structure exactly) */}
        {step === 'review' && (
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', paddingRight: '2px' }}>
            {/* Top Speech Transcript Box */}
            <div
              style={{
                backgroundColor: '#F8FAFC',
                border: '1.5px solid #E2E8F0',
                borderRadius: '14px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '12px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {t('speechTranscript')}
                </div>
                <button
                  type="button"
                  onClick={() => startVoiceRecognition()}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#4F46E5',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <RefreshCw size={12} />
                  {t('recordAgain')}
                </button>
              </div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#0F172A', fontStyle: 'italic' }}>
                "{transcript || latestTextRef.current}"
              </div>
            </div>

            {/* Error Alert */}
            {saveError && (
              <div style={{ background: '#FEE2E2', color: '#DC2626', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '600' }}>
                {saveError}
              </div>
            )}

            {/* Income / Expense Switcher */}
            <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: '10px', padding: '4px' }}>
              <button
                type="button"
                onClick={() => setType('INCOME')}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  backgroundColor: isIncome ? '#16A34A' : 'transparent',
                  color: isIncome ? '#FFFFFF' : '#64748B'
                }}
              >
                {t('income')}
              </button>
              <button
                type="button"
                onClick={() => setType('EXPENSE')}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  backgroundColor: !isIncome ? '#DC2626' : 'transparent',
                  color: !isIncome ? '#FFFFFF' : '#64748B'
                }}
              >
                {t('expense')}
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* 1. Transaction Name */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#1E293B', marginBottom: '6px' }}>
                  {t('transactionName')} *
                </label>
                <TransactionNameAutocomplete
                  value={name}
                  onChange={setName}
                  type={type}
                  placeholder={t('transactionNamePlaceholder') || 'e.g. Petrol, Groceries, Salary'}
                  required
                />
              </div>

              {/* 2. Amount */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#1E293B', marginBottom: '6px' }}>
                  {t('amount')} (₹) *
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px', fontWeight: '800', color: themeColor }}>
                    ₹
                  </span>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 36px',
                      fontSize: '18px',
                      fontWeight: '800',
                      borderRadius: '10px',
                      border: '1.5px solid #CBD5E1',
                      outline: 'none',
                      color: themeColor,
                      backgroundColor: '#FAFAFA'
                    }}
                    required
                  />
                </div>
              </div>

              {/* 3. Description (Optional) */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#1E293B', marginBottom: '6px' }}>
                  {t('descriptionOptional')}
                </label>
                <input
                  type="text"
                  placeholder={t('descriptionOptional') || 'Enter description'}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    fontSize: '14px',
                    fontWeight: '600',
                    borderRadius: '10px',
                    border: '1.5px solid #CBD5E1',
                    outline: 'none',
                    color: '#1E293B',
                    backgroundColor: '#FAFAFA'
                  }}
                />
              </div>

              {/* 4. Payment Method */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#1E293B', marginBottom: '6px' }}>
                  {t('paymentMethod')}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CASH')}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: `1.5px solid ${paymentMethod === 'CASH' ? '#16A34A' : '#CBD5E1'}`,
                      backgroundColor: paymentMethod === 'CASH' ? '#DCFCE7' : '#FFFFFF',
                      color: paymentMethod === 'CASH' ? '#16A34A' : '#64748B',
                      fontSize: '13px',
                      fontWeight: '800',
                      cursor: 'pointer'
                    }}
                  >
                    💵 {t('cash')} ({t('cashAtHome') || 'Cash at Home'})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('UPI')}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: `1.5px solid ${paymentMethod === 'UPI' ? '#4338CA' : '#CBD5E1'}`,
                      backgroundColor: paymentMethod === 'UPI' ? '#EEF2FF' : '#FFFFFF',
                      color: paymentMethod === 'UPI' ? '#4338CA' : '#64748B',
                      fontSize: '13px',
                      fontWeight: '800',
                      cursor: 'pointer'
                    }}
                  >
                    📱 {t('upi') || 'UPI'}
                  </button>
                </div>

                {/* Bank Account Dropdown for UPI */}
                {paymentMethod === 'UPI' && (
                  <div style={{ marginTop: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '700', color: '#1E293B' }}>
                        {t('selectBankAccount')} *
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowAddBankModal(true)}
                        style={{ background: 'none', border: 'none', color: '#16247B', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                      >
                        + {t('addBankAccount')}
                      </button>
                    </div>
                    <select
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1.5px solid #CBD5E1',
                        background: '#FFF',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: accountId ? '#1E293B' : '#64748B',
                        outline: 'none'
                      }}
                      required
                    >
                      <option value="">-- {t('selectBankAccount')} --</option>
                      {bankAccounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* 5. Date */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#1E293B', marginBottom: '6px' }}>
                  {t('date')}
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    fontSize: '14px',
                    fontWeight: '600',
                    borderRadius: '10px',
                    border: '1.5px solid #CBD5E1',
                    outline: 'none',
                    color: '#1E293B',
                    backgroundColor: '#FAFAFA'
                  }}
                  required
                />
              </div>

              {/* Save & Cancel Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                <button
                  type="submit"
                  disabled={saveLoading}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '12px',
                    border: 'none',
                    backgroundColor: themeColor,
                    color: '#FFFFFF',
                    fontSize: '16px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <Save size={18} />
                  {saveLoading ? '...' : (isIncome ? t('saveIncome') : t('saveExpense'))}
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  disabled={saveLoading}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'transparent',
                    color: '#64748B',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    textAlign: 'center'
                  }}
                >
                  {t('cancel')}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Quick Add Bank Account Dialog */}
      {showAddBankModal && (
        <div className="confirm-backdrop" onClick={() => setShowAddBankModal(false)} style={{ zIndex: 100002 }}>
          <div className="confirm-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px', width: '90%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>
              <div style={{ fontSize: '17px', fontWeight: '800', color: '#1E293B' }}>
                {t('addBankAccount')}
              </div>
              <button
                type="button"
                onClick={() => setShowAddBankModal(false)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {quickBankError && (
              <div style={{ background: '#FEE2E2', color: '#DC2626', padding: '8px 12px', borderRadius: '8px', marginBottom: '12px', fontSize: '13px', fontWeight: '600' }}>
                {quickBankError}
              </div>
            )}

            <form onSubmit={handleQuickAddBank} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#1E293B', marginBottom: '4px', display: 'block' }}>
                  {t('bankName')} *
                </label>
                <input
                  type="text"
                  placeholder={t('enterBankName')}
                  value={quickBankName}
                  onChange={(e) => setQuickBankName(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', fontSize: '14px', borderRadius: '8px', border: '1.5px solid #CBD5E1', outline: 'none', background: '#FAFAFA' }}
                  required
                  autoFocus
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#1E293B', marginBottom: '4px', display: 'block' }}>
                  {t('openingBalance')} (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={quickOpeningBalance}
                  onChange={(e) => setQuickOpeningBalance(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', fontSize: '15px', fontWeight: '700', borderRadius: '8px', border: '1.5px solid #CBD5E1', outline: 'none', background: '#FAFAFA' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddBankModal(false)}
                  disabled={quickBankLoading}
                  style={{ flex: 1, padding: '10px', background: '#F1F5F9', color: '#334155', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={quickBankLoading}
                  style={{ flex: 1, padding: '10px', background: '#16247B', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
                >
                  {quickBankLoading ? '...' : (t('save') || 'Save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
