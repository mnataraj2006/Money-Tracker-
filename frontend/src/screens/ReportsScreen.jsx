import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  FileText,
  Download,
  Calendar,
  CheckCircle,
  AlertCircle,
  Clock,
  Sparkles,
  Landmark,
  Wallet
} from 'lucide-react';
import { summaryAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { generateDailyFinancialReport } from '../utils/pdfGenerator';
import PageContainer from '../components/PageContainer';

export default function ReportsScreen({ onBack, onNavigate, user }) {
  const { t, language } = useLanguage();

  const [mode, setMode] = useState('SINGLE_DAY'); // 'SINGLE_DAY' | 'DATE_RANGE'
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  
  // Date Range state
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (mode === 'SINGLE_DAY') {
      loadDaySummary();
    }
  }, [selectedDate, mode]);

  const loadDaySummary = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await summaryAPI.getDailyDetails(selectedDate);
      setSummaryData(res);
    } catch (err) {
      console.error('Failed to load day details for report:', err);
      setErrorMsg('Failed to load financial details for the selected date.');
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
    setSelectedDate(prev => shiftDate(prev, -1));
  };

  const handleNextDay = () => {
    setSelectedDate(prev => shiftDate(prev, 1));
  };

  const formatCurrency = (val) => {
    const num = Math.abs(val || 0);
    return `₹${num.toLocaleString(language === 'ta' ? 'ta-IN' : 'en-IN')}`;
  };

  const formatLongDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      return dateObj.toLocaleDateString(language === 'ta' ? 'ta-IN' : 'en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  };

  const handleGeneratePDF = async () => {
    if (!summaryData) return;
    try {
      setGenerating(true);
      setSuccessMsg(null);
      setErrorMsg(null);

      const filename = await generateDailyFinancialReport({
        date: selectedDate,
        summaryData,
        user,
        language
      });

      setSuccessMsg(`PDF Generated: ${filename}`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      console.error('PDF Generation failed:', err);
      setErrorMsg('Failed to generate PDF. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const incomeCount = summaryData?.transactions?.filter(t => t.type === 'INCOME').length || 0;
  const expenseCount = summaryData?.transactions?.filter(t => t.type === 'EXPENSE').length || 0;
  const withdrawalCount = summaryData?.transactions?.filter(t => t.type === 'CASH_WITHDRAWAL').length || 0;
  const totalTxCount = summaryData?.transactions?.length || 0;

  return (
    <PageContainer>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '40px' }}>
        {/* 1. Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
          <div>
            <h1 className="page-title" style={{ margin: 0, fontSize: '20px', fontWeight: '800' }}>
              {t('reports') || 'Reports'}
            </h1>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary, #64748B)', fontWeight: '600' }}>
              Download PDF statements
            </div>
          </div>
        </div>

        {/* 2. Mode Toggle (Single Day vs Date Range) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px',
          background: 'var(--bg-app, #F8FAFC)',
          padding: '4px',
          borderRadius: '12px',
          border: '1px solid var(--border-color, #E2E8F0)'
        }}>
          <button
            onClick={() => setMode('SINGLE_DAY')}
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              border: 'none',
              background: mode === 'SINGLE_DAY' ? 'var(--navy-primary, #1E293B)' : 'transparent',
              color: mode === 'SINGLE_DAY' ? '#FFFFFF' : 'var(--text-secondary, #64748B)',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            <Calendar size={15} /> Single Day
          </button>

          <button
            onClick={() => setMode('DATE_RANGE')}
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              border: 'none',
              background: mode === 'DATE_RANGE' ? 'var(--navy-primary, #1E293B)' : 'transparent',
              color: mode === 'DATE_RANGE' ? '#FFFFFF' : 'var(--text-secondary, #64748B)',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            <Clock size={15} /> Date Range
          </button>
        </div>

        {/* 3. Success / Error Feedback */}
        {successMsg && (
          <div style={{
            backgroundColor: '#DCFCE7',
            border: '1px solid #BBF7D0',
            color: '#15803D',
            padding: '12px 14px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div style={{
            backgroundColor: '#FEE2E2',
            border: '1px solid #FECACA',
            color: '#DC2626',
            padding: '12px 14px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 4. SINGLE DAY MODE */}
        {mode === 'SINGLE_DAY' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Date Selector Card */}
            <div className="stitch-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary, #64748B)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                Select Statement Date
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  onClick={handlePrevDay}
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    border: '1px solid var(--border-color, #E2E8F0)',
                    background: 'var(--bg-app, #F8FAFC)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <ChevronLeft size={20} color="var(--navy-primary, #1E293B)" />
                </button>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--navy-primary, #1E293B)' }}>
                    {formatLongDate(selectedDate)}
                  </div>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    style={{
                      marginTop: '4px',
                      fontSize: '12px',
                      padding: '2px 8px',
                      border: '1px solid var(--border-color, #CBD5E1)',
                      borderRadius: '6px',
                      color: 'var(--text-secondary, #64748B)'
                    }}
                  />
                </div>

                <button
                  onClick={handleNextDay}
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    border: '1px solid var(--border-color, #E2E8F0)',
                    background: 'var(--bg-app, #F8FAFC)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <ChevronRight size={20} color="var(--navy-primary, #1E293B)" />
                </button>
              </div>
            </div>

            {/* Quick Preview Card */}
            <div className="stitch-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary, #64748B)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                  Report Contents Preview
                </div>
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--navy-primary, #1E293B)' }}>
                  {totalTxCount} {totalTxCount === 1 ? 'Transaction' : 'Transactions'}
                </span>
              </div>

              {loading ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary, #64748B)', fontSize: '13px' }}>
                  Loading preview...
                </div>
              ) : summaryData ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', textAlign: 'center' }}>
                    <div style={{ background: '#F0FDF4', padding: '10px', borderRadius: '8px', border: '1px solid #DCFCE7' }}>
                      <div style={{ fontSize: '11px', color: '#16A34A', fontWeight: '700' }}>Income ({incomeCount})</div>
                      <div style={{ fontSize: '15px', fontWeight: '800', color: '#16A34A', marginTop: '2px' }}>
                        {formatCurrency(summaryData.income)}
                      </div>
                    </div>

                    <div style={{ background: '#FEF2F2', padding: '10px', borderRadius: '8px', border: '1px solid #FEE2E2' }}>
                      <div style={{ fontSize: '11px', color: '#DC2626', fontWeight: '700' }}>Expense ({expenseCount})</div>
                      <div style={{ fontSize: '15px', fontWeight: '800', color: '#DC2626', marginTop: '2px' }}>
                        {formatCurrency(summaryData.expense)}
                      </div>
                    </div>

                    <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: '11px', color: '#1E293B', fontWeight: '700' }}>Net</div>
                      <div style={{ fontSize: '15px', fontWeight: '800', color: summaryData.net >= 0 ? '#1E293B' : '#DC2626', marginTop: '2px' }}>
                        {formatCurrency(summaryData.net)}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                    <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Wallet size={16} color="var(--navy-primary, #1E293B)" />
                      <div>
                        <div style={{ color: 'var(--text-secondary, #64748B)', fontSize: '11px' }}>Expected Cash</div>
                        <div style={{ fontWeight: '800', color: 'var(--text-main, #0F172A)' }}>{formatCurrency(summaryData.expectedCash)}</div>
                      </div>
                    </div>

                    <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Landmark size={16} color="var(--navy-primary, #1E293B)" />
                      <div>
                        <div style={{ color: 'var(--text-secondary, #64748B)', fontSize: '11px' }}>Bank Accounts</div>
                        <div style={{ fontWeight: '800', color: 'var(--text-main, #0F172A)' }}>
                          {summaryData.bankAccounts?.length || 0} Accounts
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Generate Button */}
            <button
              className="btn-primary-navy"
              onClick={handleGeneratePDF}
              disabled={loading || generating || !summaryData}
              style={{
                padding: '16px',
                fontSize: '16px',
                fontWeight: '800',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow: '0 4px 12px rgba(30, 41, 59, 0.15)',
                cursor: (loading || generating) ? 'not-allowed' : 'pointer'
              }}
            >
              {generating ? (
                <>
                  <div className="spinner" style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} />
                  Generating Statement...
                </>
              ) : (
                <>
                  <Download size={20} />
                  <span>Generate Single-Page PDF</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* 5. DATE RANGE MODE (PREPARED ARCHITECTURE) */}
        {mode === 'DATE_RANGE' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="stitch-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary, #64748B)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                Select Date Range
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary, #64748B)', display: 'block', marginBottom: '4px' }}>
                    From Date
                  </label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #CBD5E1)',
                      fontSize: '13px',
                      fontWeight: '600'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary, #64748B)', display: 'block', marginBottom: '4px' }}>
                    To Date
                  </label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #CBD5E1)',
                      fontSize: '13px',
                      fontWeight: '600'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Coming Soon Notice Card */}
            <div style={{
              backgroundColor: '#EEF2FF',
              border: '1px solid #C7D2FE',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px'
            }}>
              <Sparkles size={28} color="#4338CA" />
              <div>
                <div style={{ fontSize: '15px', fontWeight: '800', color: '#312E81' }}>
                  Multi-Day Date Range Reports Coming Soon
                </div>
                <div style={{ fontSize: '12px', color: '#4338CA', marginTop: '4px', maxWidth: '300px' }}>
                  Comprehensive multi-day statements and monthly trend PDFs will be available in the next release.
                </div>
              </div>
            </div>

            <button
              className="btn-outline-navy"
              onClick={() => setMode('SINGLE_DAY')}
              style={{ padding: '14px', fontSize: '14px', fontWeight: '700' }}
            >
              Switch to Single Day PDF
            </button>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
