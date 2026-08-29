import React, { useState, useEffect, useRef } from 'react';
import { Mic, RefreshCw, X, Check, ArrowRight, Calendar, AlertCircle } from 'lucide-react';
import { speechService } from '../services/speechRecognitionService';
import { parseTransactionFromSpeech } from '../utils/transactionParser';
import { transactionsAPI } from '../services/api';
import { useDataCache } from '../context/DataContext';
import { useLanguage } from '../context/LanguageContext';

export default function VoiceEntryModal({ isOpen, onClose, onSuccess, initialType = null }) {
  const { clearCache } = useDataCache();
  const { t, language } = useLanguage();

  const [step, setStep] = useState('listening'); // 'listening', 'review'
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');

  // Form State for Review & Confirmation
  const [type, setType] = useState(initialType || 'EXPENSE');
  const [amount, setAmount] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Groceries');
  const [paymentMethod, setPaymentMethod] = useState(''); // Empty if ambiguous
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Voice language preference from localStorage or default 'ta'
  const [voiceLang, setVoiceLang] = useState(() => localStorage.getItem('cashly_voice_lang') || 'ta');

  const latestTextRef = useRef('');

  const categories = [
    'Groceries', 'Petrol', 'Food', 'Bills', 'Salary', 'Medical',
    'Shopping', 'Transport', 'Rent', 'Peanut Candy', 'General'
  ];

  useEffect(() => {
    if (isOpen) {
      startVoiceRecognition();
    } else {
      speechService.stopListening();
      resetState();
    }
  }, [isOpen]);

  const resetState = () => {
    setStep('listening');
    setTranscript('');
    latestTextRef.current = '';
    setIsListening(false);
    setVoiceError('');
    setType(initialType || 'EXPENSE');
    setAmount('');
    setCategory('Groceries');
    setPaymentMethod('');
    setDate(new Date().toISOString().split('T')[0]);
    setDescription('');
    setSaveLoading(false);
    setSaveError('');
  };

  const startVoiceRecognition = () => {
    setVoiceError('');
    setTranscript('');
    latestTextRef.current = '';
    setStep('listening');

    const success = speechService.startListening({
      language: voiceLang,
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
        // Automatically transition to detail filling / review step if transcript exists
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
      setVoiceError(t('couldNotUnderstand') || 'No speech was detected. Please try again.');
    }
  };

  const processTranscript = (text) => {
    speechService.stopListening();
    setIsListening(false);

    const parsed = parseTransactionFromSpeech(text);

    // Apply parsed values
    if (parsed.type) setType(parsed.type);
    else if (initialType) setType(initialType);

    if (parsed.amount) setAmount(parsed.amount.toString());
    if (parsed.category) setCategory(parsed.category);
    if (parsed.paymentMethod) setPaymentMethod(parsed.paymentMethod);
    if (parsed.date) setDate(parsed.date);
    if (parsed.description) setDescription(parsed.description);
    if (parsed.name) setName(parsed.name);
    else if (parsed.description && parsed.description !== parsed.category) setName(parsed.description);
    else setName('');

    setStep('review');
  };

  const handleSaveTransaction = async (e) => {
    if (e) e.preventDefault();
    setSaveError('');

    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setSaveError(language === 'ta' ? 'தயவுசெய்து சரியான தொகையை உள்ளிடவும்' : 'Please enter a valid amount greater than 0');
      return;
    }

    if (!paymentMethod) {
      setSaveError(language === 'ta' ? 'தயவுசெய்து செலுத்தும் முறையைத் தேர்ந்தெடுக்கவும் (Cash, UPI, Bank, Card)' : 'Please select a Payment Method (Cash, UPI, Bank, Card)');
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
        description: description || '',
        date
      });

      clearCache();
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      setSaveError(err.message || (language === 'ta' ? 'சேமிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.' : 'Failed to save transaction. Please try again.'));
    } finally {
      setSaveLoading(false);
    }
  };

  const handleLangToggle = (lang) => {
    setVoiceLang(lang);
    localStorage.setItem('cashly_voice_lang', lang);
    if (isListening) {
      speechService.stopListening();
      setTimeout(() => startVoiceRecognition(), 200);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(5, 15, 12, 0.75)',
      backdropFilter: 'blur(6px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div className="mobile-app-shell" style={{
        width: '100%',
        maxWidth: '440px',
        maxHeight: '90vh',
        backgroundColor: '#FFFFFF',
        borderRadius: '24px',
        overflow: 'hidden',
        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#F8FAFC'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              backgroundColor: '#021A1A',
              color: '#FFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Mic size={18} />
            </div>
            <span style={{ fontWeight: '700', fontSize: '16px', color: 'var(--text-primary)' }}>
              {t('voiceTitle') || 'Voice Entry / குரல் பதிவு'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Language Selector Pills */}
            <div style={{ display: 'flex', backgroundColor: '#E2E8F0', borderRadius: '20px', padding: '2px' }}>
              <button
                type="button"
                onClick={() => handleLangToggle('ta')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '16px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: '700',
                  backgroundColor: voiceLang === 'ta' ? '#021A1A' : 'transparent',
                  color: voiceLang === 'ta' ? '#FFFFFF' : '#475569',
                  cursor: 'pointer'
                }}
              >
                தமிழ்
              </button>
              <button
                type="button"
                onClick={() => handleLangToggle('en')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '16px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: '700',
                  backgroundColor: voiceLang === 'en' ? '#021A1A' : 'transparent',
                  color: voiceLang === 'en' ? '#FFFFFF' : '#475569',
                  cursor: 'pointer'
                }}
              >
                English
              </button>
            </div>

            <button
              onClick={() => { speechService.stopListening(); onClose(); }}
              style={{
                background: 'none',
                border: 'none',
                padding: '6px',
                color: 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>

          {/* STEP 1: LISTENING STATE */}
          {step === 'listening' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '10px 0' }}>
              <div style={{ position: 'relative', margin: '16px 0' }}>
                <div style={{
                  width: '86px',
                  height: '86px',
                  borderRadius: '50%',
                  backgroundColor: isListening ? '#EF4444' : '#021A1A',
                  color: '#FFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: isListening ? '0 0 0 12px rgba(239, 68, 68, 0.2)' : '0 10px 25px rgba(2, 26, 26, 0.3)',
                  transition: 'all 0.3s ease'
                }}>
                  <Mic size={38} className={isListening ? 'pulse-icon' : ''} />
                </div>
              </div>

              <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
                {isListening ? (t('listening') || 'Listening... / கேட்கிறது...') : (t('speakNow') || 'Speak Now / பேசுங்கள்')}
              </h3>

              {/* Sample Hints */}
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '300px', marginBottom: '16px', lineHeight: '1.5' }}>
                {voiceLang === 'ta' ? (
                  <>
                    <div>💡 <i>"{t('voiceHint1') || 'காய்கறி 250 ரூபாய் செலவு'}"</i></div>
                    <div>💡 <i>"{t('voiceHint2') || 'பெட்ரோல் 600 ரூபாய் UPI செலவு'}"</i></div>
                  </>
                ) : (
                  <>
                    <div>💡 <i>"{t('voiceHint1') || '250 rupees vegetables cash expense'}"</i></div>
                    <div>💡 <i>"{t('voiceHint2') || '600 rupees petrol UPI expense'}"</i></div>
                  </>
                )}
              </div>

              {/* Transcript Display Box */}
              <div style={{
                width: '100%',
                minHeight: '70px',
                padding: '14px',
                backgroundColor: '#F1F5F9',
                borderRadius: '14px',
                fontSize: '15px',
                fontWeight: '600',
                color: transcript ? '#0F172A' : '#94A3B8',
                fontStyle: transcript ? 'normal' : 'italic',
                marginBottom: '16px',
                textAlign: 'left',
                border: '1px solid #E2E8F0'
              }}>
                {transcript || (t('listeningPlaceholder') || 'Speech will appear here as you speak...')}
              </div>

              {/* Voice Error Banner */}
              {voiceError && (
                <div style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#FEE2E2',
                  border: '1px solid #FCA5A5',
                  color: '#991B1B',
                  borderRadius: '12px',
                  fontSize: '13px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <AlertCircle size={16} />
                  <span>{voiceError}</span>
                </div>
              )}

              {/* Action Buttons with HIGH CONTRAST */}
              <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                {isListening ? (
                  <button
                    type="button"
                    onClick={handleStopListening}
                    style={{
                      flex: 1,
                      padding: '14px',
                      borderRadius: '14px',
                      fontWeight: '700',
                      fontSize: '15px',
                      backgroundColor: '#021A1A',
                      color: '#FFFFFF',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(2,26,26,0.2)'
                    }}
                  >
                    <Check size={18} /> {t('confirm') || 'Done Speaking / Fill Details'}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={startVoiceRecognition}
                      style={{
                        flex: 1,
                        padding: '14px',
                        borderRadius: '14px',
                        fontWeight: '700',
                        fontSize: '15px',
                        backgroundColor: '#F1F5F9',
                        color: '#0F172A',
                        border: '1.5px solid #CBD5E1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      <RefreshCw size={16} /> {t('tryAgain') || 'Try Again'}
                    </button>

                    {transcript.trim() && (
                      <button
                        type="button"
                        onClick={() => processTranscript(transcript)}
                        style={{
                          flex: 1,
                          padding: '14px',
                          borderRadius: '14px',
                          fontWeight: '700',
                          fontSize: '15px',
                          backgroundColor: '#021A1A',
                          color: '#FFFFFF',
                          border: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(2,26,26,0.2)'
                        }}
                      >
                        {t('confirm') || 'Fill Details'} <ArrowRight size={16} />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: REVIEW & CONFIRMATION CARD (NEVER AUTO-SAVES!) */}
          {step === 'review' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Speech Heard Box */}
              <div style={{
                padding: '12px 14px',
                backgroundColor: '#F8FAFC',
                borderRadius: '12px',
                borderLeft: '4px solid #021A1A'
              }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '2px' }}>
                  {language === 'ta' ? 'பேசப்பட்ட உரை' : 'Speech Transcript'}
                </div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#1E293B' }}>
                  "{transcript}"
                </div>
              </div>

              <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>
                {t('reviewTransaction') || 'Review & Confirm Transaction / விவரங்களை சரிபார்க்கவும்'}
              </div>

              {saveError && (
                <div style={{
                  padding: '10px 14px',
                  backgroundColor: '#FEE2E2',
                  border: '1px solid #FCA5A5',
                  color: '#991B1B',
                  borderRadius: '10px',
                  fontSize: '13px'
                }}>
                  {saveError}
                </div>
              )}

              <form onSubmit={handleSaveTransaction} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                
                {/* Type Selection Pills */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                    Transaction Type
                  </label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setType('EXPENSE')}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '12px',
                        border: type === 'EXPENSE' ? '2px solid #EF4444' : '1px solid #E2E8F0',
                        backgroundColor: type === 'EXPENSE' ? '#FEF2F2' : '#FFFFFF',
                        color: type === 'EXPENSE' ? '#991B1B' : '#64748B',
                        fontWeight: '700',
                        fontSize: '14px',
                        cursor: 'pointer'
                      }}
                    >
                      Expense (செலவு)
                    </button>
                    <button
                      type="button"
                      onClick={() => setType('INCOME')}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '12px',
                        border: type === 'INCOME' ? '2px solid #10B981' : '1px solid #E2E8F0',
                        backgroundColor: type === 'INCOME' ? '#ECFDF5' : '#FFFFFF',
                        color: type === 'INCOME' ? '#065F46' : '#64748B',
                        fontWeight: '700',
                        fontSize: '14px',
                        cursor: 'pointer'
                      }}
                    >
                      Income (வரவு)
                    </button>
                  </div>
                </div>

                {/* Amount Input */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                    Amount (தொகை) *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{
                      position: 'absolute',
                      left: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '18px',
                      fontWeight: '700',
                      color: '#021A1A'
                    }}>
                      ₹
                    </span>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '12px 14px 12px 34px',
                        borderRadius: '12px',
                        border: !amount ? '2px solid #F59E0B' : '1px solid #CBD5E1',
                        fontSize: '18px',
                        fontWeight: '700',
                        color: '#0F172A',
                        backgroundColor: !amount ? '#FFFBEB' : '#FFFFFF',
                        outline: 'none'
                      }}
                    />
                  </div>
                  {!amount && (
                    <div style={{ fontSize: '11px', color: '#D97706', marginTop: '4px', fontWeight: '600' }}>
                      ⚠️ Please enter amount if speech did not specify number
                    </div>
                  )}
                </div>

                {/* Transaction Name Input */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                    {t('transactionName') || 'Transaction Name (பதிவு பெயர்)'}
                  </label>
                  <input
                    type="text"
                    placeholder={t('enterTransactionName') || 'Enter transaction name'}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: '1px solid #CBD5E1',
                      fontSize: '15px',
                      fontWeight: '600',
                      color: '#0F172A',
                      backgroundColor: '#FFFFFF',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Payment Method Pills */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                    Payment Method (செலுத்தும் முறை) *
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                    {['CASH', 'UPI', 'BANK', 'CARD'].map((pm) => (
                      <button
                        key={pm}
                        type="button"
                        onClick={() => setPaymentMethod(pm)}
                        style={{
                          padding: '10px 4px',
                          borderRadius: '10px',
                          border: paymentMethod === pm ? '2px solid #021A1A' : '1px solid #CBD5E1',
                          backgroundColor: paymentMethod === pm ? '#021A1A' : '#FFFFFF',
                          color: paymentMethod === pm ? '#FFFFFF' : '#334155',
                          fontWeight: '700',
                          fontSize: '12px',
                          cursor: 'pointer',
                          textAlign: 'center'
                        }}
                      >
                        {pm}
                      </button>
                    ))}
                  </div>
                  {!paymentMethod && (
                    <div style={{ fontSize: '11px', color: '#D97706', marginTop: '4px', fontWeight: '600' }}>
                      ⚠️ Please select Cash, UPI, Bank or Card
                    </div>
                  )}
                </div>

                {/* Category Selection */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                    Category (வகை)
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '12px',
                      border: '1px solid #CBD5E1',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#0F172A',
                      backgroundColor: '#FFFFFF'
                    }}
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Selection */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                    Date (தேதி)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        border: '1px solid #CBD5E1',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#0F172A',
                        backgroundColor: '#FFFFFF'
                      }}
                    />
                  </div>
                </div>

                {/* Transaction Name / Description Input */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                    Transaction Name / Description (பொருளின் பெயர் / குறிப்பு)
                  </label>
                  <input
                    type="text"
                    placeholder="What was this for? (e.g. Peanut Candy, Salary)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '12px',
                      border: '1px solid #CBD5E1',
                      fontSize: '14px',
                      color: '#0F172A',
                      backgroundColor: '#FFFFFF'
                    }}
                  />
                </div>

                {/* Save Buttons */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={startVoiceRecognition}
                    style={{
                      padding: '14px',
                      borderRadius: '14px',
                      border: '1px solid #CBD5E1',
                      backgroundColor: '#F1F5F9',
                      color: '#334155',
                      fontWeight: '700',
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <RefreshCw size={16} /> {t('reSpeak') || 'Re-speak'}
                  </button>

                  <button
                    type="submit"
                    disabled={saveLoading}
                    style={{
                      flex: 1,
                      padding: '14px',
                      borderRadius: '14px',
                      border: 'none',
                      backgroundColor: type === 'EXPENSE' ? '#EF4444' : '#10B981',
                      color: '#FFFFFF',
                      fontWeight: '700',
                      fontSize: '15px',
                      cursor: saveLoading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                    }}
                  >
                    {saveLoading ? 'Saving...' : (
                      <>
                        <Check size={18} />
                        {type === 'EXPENSE' ? (t('saveExpense') || 'Save Expense') : (t('saveIncome') || 'Save Income')}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
