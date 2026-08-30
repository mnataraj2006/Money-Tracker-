import React, { useState, useEffect } from 'react';
import { Landmark, Plus, ArrowRight, ShieldCheck, AlertCircle, RefreshCw, X, Check, ArrowDownToLine } from 'lucide-react';
import PageContainer from '../components/PageContainer';
import CashWithdrawalModal from '../components/CashWithdrawalModal';
import { bankAccountsAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useDataCache } from '../context/DataContext';
import { useRegisterModal } from '../context/NavigationContext';

export default function BanksScreen({ user, onNavigate }) {
  const { t } = useLanguage();
  const { cache, updateCache, clearCache } = useDataCache();

  // Cache-first instant rendering
  const [bankAccounts, setBankAccounts] = useState(cache.bankAccounts || []);
  const [loading, setLoading] = useState(!cache.bankAccounts || cache.bankAccounts.length === 0);
  const [error, setError] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);

  // Register Add Bank modal with back button manager
  useRegisterModal(isAddModalOpen, () => {
    setIsAddModalOpen(false);
    return true;
  });

  const [newBankName, setNewBankName] = useState('');
  const [newOpeningBalance, setNewOpeningBalance] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  useEffect(() => {
    const hasCache = !!(cache.bankAccounts && cache.bankAccounts.length > 0);
    loadBankAccounts(hasCache);
  }, []);

  const loadBankAccounts = async (isBackground = false) => {
    try {
      if (!isBackground && (!cache.bankAccounts || cache.bankAccounts.length === 0)) {
        setLoading(true);
      }
      setError('');
      const data = await bankAccountsAPI.getAll();
      const accounts = data.bankAccounts || [];
      setBankAccounts(accounts);
      updateCache('bankAccounts', accounts);
    } catch (err) {
      console.error('Failed to load bank accounts:', err);
      if (!cache.bankAccounts || cache.bankAccounts.length === 0) {
        setError(err.message || 'Failed to load bank accounts');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddAccount = async (e) => {
    e.preventDefault();
    setAddError('');

    const cleanName = newBankName.trim();
    if (!cleanName) {
      setAddError(t('enterBankName') || 'Please enter bank name');
      return;
    }

    const openingVal = parseFloat(newOpeningBalance || '0');
    if (isNaN(openingVal)) {
      setAddError('Opening balance must be a valid number');
      return;
    }

    try {
      setAddLoading(true);
      await bankAccountsAPI.create({
        name: cleanName,
        openingBalance: openingVal
      });

      setNewBankName('');
      setNewOpeningBalance('');
      setIsAddModalOpen(false);
      clearCache();
      await loadBankAccounts(false);
    } catch (err) {
      setAddError(err.message || 'Failed to add bank account');
    } finally {
      setAddLoading(false);
    }
  };

  const formatCurrency = (val) => `₹${Math.round(val || 0).toLocaleString('en-IN')}`;

  const totalBankBalance = bankAccounts.reduce((sum, acc) => sum + (acc.expectedBalance || 0), 0);

  return (
    <PageContainer>
      {/* 1. Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
            {t('bankAccounts')}
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600', marginTop: '2px' }}>
            {bankAccounts.length} {bankAccounts.length === 1 ? t('bankAccount') : t('bankAccounts')}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setIsWithdrawModalOpen(true)}
            style={{
              padding: '10px 14px',
              fontSize: '13px',
              fontWeight: '700',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#EEF2FF',
              color: '#4338CA',
              border: '1px solid #C7D2FE',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <ArrowDownToLine size={16} /> {t('cashWithdrawal') || 'Cash Withdrawal'}
          </button>

          <button
            onClick={() => {
              setAddError('');
              setIsAddModalOpen(true);
            }}
            className="btn-primary-navy"
            style={{
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: '700',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              width: 'auto'
            }}
          >
            <Plus size={16} /> {t('addBankAccount')}
          </button>
        </div>
      </div>

      {/* 2. Total Bank Balance Hero Card */}
      <div
        className="navy-card"
        style={{
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          borderRadius: '16px',
          marginBottom: '16px'
        }}
      >
        <div style={{ fontSize: '12px', fontWeight: '700', opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
          {t('totalBankBalance') || 'Total Expected Balance (Banks)'}
        </div>

        <div style={{ fontSize: '32px', fontWeight: '800', color: '#FFFFFF', letterSpacing: '-0.5px' }}>
          {loading && bankAccounts.length === 0 ? '...' : formatCurrency(totalBankBalance)}
        </div>

        <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '2px' }}>
          {t('sumAcrossAllAccounts') || 'Calculated from all active bank accounts'}
        </div>
      </div>

      {/* 3. Error Banner if any */}
      {error && (
        <div style={{
          background: '#FEE2E2',
          color: '#DC2626',
          padding: '12px 16px',
          borderRadius: '12px',
          marginBottom: '16px',
          fontSize: '14px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span>{error}</span>
          <button onClick={() => loadBankAccounts(false)} style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer' }}>
            <RefreshCw size={16} />
          </button>
        </div>
      )}

      {/* 4. Bank Accounts List */}
      {loading && bankAccounts.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2].map((k) => (
            <div
              key={k}
              className="stitch-card"
              style={{
                padding: '20px',
                height: '76px',
                background: '#FFFFFF',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#E2E8F0', animation: 'pulse 1.5s infinite' }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ width: '100px', height: '16px', background: '#E2E8F0', borderRadius: '4px' }} />
                <div style={{ width: '60px', height: '12px', background: '#F1F5F9', borderRadius: '4px' }} />
              </div>
              <div style={{ width: '80px', height: '20px', background: '#E2E8F0', borderRadius: '4px' }} />
            </div>
          ))}
        </div>
      ) : bankAccounts.length === 0 ? (
        <div
          className="stitch-card"
          style={{
            padding: '36px 20px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '14px'
          }}
        >
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: '#F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748B'
          }}>
            <Landmark size={28} />
          </div>
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>
              {t('noBankAccounts') || 'No Bank Accounts Added'}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
              {t('tapToAddBankAccount') || 'Tap below to add your first bank account.'}
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="btn-primary-navy"
            style={{ width: 'auto', padding: '10px 20px', marginTop: '6px' }}
          >
            <Plus size={16} /> {t('addBankAccount')}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {bankAccounts.map((account) => {
            const hasCheck = !!account.lastCheck;
            const diff = hasCheck ? account.lastCheck.difference : 0;
            const checkDateStr = hasCheck && account.lastCheck.checkedAt
              ? new Date(account.lastCheck.checkedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
              : null;

            return (
              <div
                key={account.id}
                className="stitch-card"
                onClick={() => onNavigate('bank-account-details', { accountId: account.id })}
                style={{
                  padding: '16px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  borderRadius: '14px',
                  border: '1px solid #E2E8F0',
                  background: '#FFFFFF',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: '#F1F5F9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#1E293B'
                  }}>
                    <Landmark size={22} />
                  </div>

                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '800', color: '#1E293B' }}>
                      {account.name}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '12px' }}>
                      {hasCheck ? (
                        diff === 0 ? (
                          <span style={{ color: '#16A34A', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <ShieldCheck size={13} /> {t('verified') || 'Verified'} {checkDateStr && `(${checkDateStr})`}
                          </span>
                        ) : diff > 0 ? (
                          <span style={{ color: '#D97706', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <AlertCircle size={13} /> +{formatCurrency(diff)} {t('extra') || 'Extra'}
                          </span>
                        ) : (
                          <span style={{ color: '#DC2626', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <AlertCircle size={13} /> -{formatCurrency(diff)} {t('short') || 'Short'}
                          </span>
                        )
                      ) : (
                        <span style={{ color: '#94A3B8', fontWeight: '600' }}>
                          {t('notVerifiedYet') || 'Not verified yet'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>
                      {t('expected') || 'Expected'}
                    </div>
                    <div style={{ fontSize: '17px', fontWeight: '800', color: 'var(--navy-primary)' }}>
                      {formatCurrency(account.expectedBalance)}
                    </div>
                  </div>

                  <ArrowRight size={18} color="#94A3B8" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Add Bank Account Modal */}
      {isAddModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px',
          backdropFilter: 'blur(2px)'
        }}>
          <div
            className="stitch-card"
            style={{
              width: '100%',
              maxWidth: '400px',
              padding: '24px',
              borderRadius: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)' }}>
                {t('addBankAccount')}
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {addError && (
              <div style={{
                background: '#FEE2E2',
                color: '#DC2626',
                padding: '10px 14px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: '600'
              }}>
                {addError}
              </div>
            )}

            <form onSubmit={handleAddAccount} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  {t('bankName')} *
                </label>
                <input
                  type="text"
                  placeholder={t('enterBankName') || 'e.g. SBI, HDFC, Indian Bank'}
                  value={newBankName}
                  onChange={(e) => setNewBankName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1.5px solid var(--border-color)',
                    fontSize: '15px',
                    fontWeight: '600',
                    outline: 'none',
                    backgroundColor: 'var(--bg-input)',
                    color: 'var(--text-main)'
                  }}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  {t('openingBalance') || 'Opening Balance (₹)'}
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={newOpeningBalance}
                  onChange={(e) => setNewOpeningBalance(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1.5px solid var(--border-color)',
                    fontSize: '15px',
                    fontWeight: '600',
                    outline: 'none',
                    backgroundColor: 'var(--bg-input)',
                    color: 'var(--text-main)'
                  }}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  {t('openingBalanceHelper') || 'Current actual balance in this account'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="btn-outline-navy"
                  style={{ flex: 1 }}
                >
                  {t('cancel')}
                </button>

                <button
                  type="submit"
                  disabled={addLoading}
                  className="btn-primary-navy"
                  style={{ flex: 1 }}
                >
                  {addLoading ? (t('saving') || 'Saving...') : (t('save') || 'Save Account')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Cash Withdrawal Modal */}
      <CashWithdrawalModal
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        onSuccess={() => {
          clearCache();
          loadBankAccounts(false);
        }}
      />
    </PageContainer>
  );
}
