import React, { useState, useEffect } from 'react';
import { Landmark, Plus, ArrowRight, ShieldCheck, AlertCircle, RefreshCw, X, Check } from 'lucide-react';
import PageContainer from '../components/PageContainer';
import { bankAccountsAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

export default function BanksScreen({ user, onNavigate }) {
  const { t } = useLanguage();
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newBankName, setNewBankName] = useState('');
  const [newOpeningBalance, setNewOpeningBalance] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  useEffect(() => {
    loadBankAccounts();
  }, []);

  const loadBankAccounts = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await bankAccountsAPI.getAll();
      setBankAccounts(data.bankAccounts || []);
    } catch (err) {
      console.error('Failed to load bank accounts:', err);
      setError(err.message || 'Failed to load bank accounts');
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
      const res = await bankAccountsAPI.create({
        name: cleanName,
        openingBalance: openingVal
      });

      setNewBankName('');
      setNewOpeningBalance('');
      setIsAddModalOpen(false);
      await loadBankAccounts();
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
            {t('bankAccounts')}
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600', marginTop: '2px' }}>
            {bankAccounts.length} {bankAccounts.length === 1 ? t('bankAccount') : t('bankAccounts')}
          </div>
        </div>

        <button
          onClick={() => {
            setAddError('');
            setIsAddModalOpen(true);
          }}
          className="btn-primary-navy"
          style={{
            padding: '10px 16px',
            fontSize: '14px',
            fontWeight: '700',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            width: 'auto'
          }}
        >
          <Plus size={18} /> {t('addBankAccount')}
        </button>
      </div>

      {/* 2. Total Bank Balance Hero Card */}
      <div
        className="navy-card"
        style={{
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          marginBottom: '16px',
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          color: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.15)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.85, fontSize: '13px', fontWeight: '600' }}>
          <Landmark size={18} /> {t('expectedBalance')} (Total)
        </div>
        <div style={{ fontSize: '30px', fontWeight: '800', letterSpacing: '-0.5px' }}>
          {formatCurrency(totalBankBalance)}
        </div>
      </div>

      {/* 3. Error Alert */}
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
          <button onClick={loadBankAccounts} style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer' }}>
            <RefreshCw size={16} />
          </button>
        </div>
      )}

      {/* 4. Bank Accounts List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
          Loading bank accounts...
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
              {t('noBankAccounts')}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
              {t('tapToAddBankAccount')}
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
                            <ShieldCheck size={13} /> {t('lastChecked')}: {checkDateStr} (✓)
                          </span>
                        ) : (
                          <span style={{ color: diff > 0 ? '#16A34A' : '#DC2626', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <AlertCircle size={13} /> {t('difference')}: {diff > 0 ? `+₹${diff}` : `-₹${Math.abs(diff)}`}
                          </span>
                        )
                      ) : (
                        <span style={{ color: '#94A3B8', fontWeight: '600' }}>
                          {t('notCheckedYet')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: '#1E293B' }}>
                      {formatCurrency(account.expectedBalance)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '600' }}>
                      {t('expectedBalance')}
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
        <div
          className="sheet-backdrop"
          onClick={() => setIsAddModalOpen(false)}
          style={{ zIndex: 100000 }}
        >
          <div
            className="sheet-container"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '440px' }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid #E2E8F0' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1E293B', margin: 0 }}>
                {t('addBankAccount')}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
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
                  color: '#475569'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {addError && (
              <div style={{
                background: '#FEE2E2',
                color: '#DC2626',
                padding: '10px 14px',
                borderRadius: '8px',
                marginBottom: '14px',
                fontSize: '13px',
                fontWeight: '600'
              }}>
                {addError}
              </div>
            )}

            <form onSubmit={handleAddAccount} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#1E293B', marginBottom: '6px', display: 'block' }}>
                  {t('bankName')} *
                </label>
                <input
                  type="text"
                  placeholder={t('enterBankName')}
                  value={newBankName}
                  onChange={(e) => setNewBankName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    fontSize: '15px',
                    borderRadius: '10px',
                    border: '1.5px solid #CBD5E1',
                    outline: 'none',
                    background: '#FAFAFA'
                  }}
                  required
                  autoFocus
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#1E293B', marginBottom: '6px', display: 'block' }}>
                  {t('openingBalance')} (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={newOpeningBalance}
                  onChange={(e) => setNewOpeningBalance(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    fontSize: '16px',
                    fontWeight: '700',
                    borderRadius: '10px',
                    border: '1.5px solid #CBD5E1',
                    outline: 'none',
                    background: '#FAFAFA'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={addLoading}
                className="btn-primary-navy"
                style={{ marginTop: '8px', padding: '14px' }}
              >
                {addLoading ? 'Saving...' : (t('saveBankAccount') || 'Save Bank Account')}
              </button>

              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                disabled={addLoading}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748B',
                  fontSize: '14px',
                  fontWeight: '700',
                  padding: '8px',
                  cursor: 'pointer'
                }}
              >
                {t('cancel')}
              </button>
            </form>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
