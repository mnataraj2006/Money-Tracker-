import React, { useState, useEffect } from 'react';
import { ArrowLeft, Landmark, Plus, Edit2, Trash2, CheckCircle2, AlertTriangle, ShieldCheck, AlertCircle, RefreshCw, X, Check } from 'lucide-react';
import PageContainer from '../components/PageContainer';
import { bankAccountsAPI, transactionsAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import SimpleTransactionSheet from '../components/SimpleTransactionSheet';

export default function BankAccountDetailsScreen({ accountId, onBack, onNavigate }) {
  const { t } = useLanguage();
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Verification modal state
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [actualBalanceInput, setActualBalanceInput] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  // Edit / Rename modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editOpening, setEditOpening] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Transaction Sheet for editing a transaction
  const [selectedTx, setSelectedTx] = useState(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  useEffect(() => {
    if (accountId) {
      loadAccountData();
    }
  }, [accountId]);

  const loadAccountData = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await bankAccountsAPI.getById(accountId);
      setAccount(data.bankAccount);
      if (data.bankAccount) {
        setEditName(data.bankAccount.name);
        setEditOpening(String(data.bankAccount.openingBalance || 0));
      }
    } catch (err) {
      console.error('Failed to load bank account details:', err);
      setError(err.message || 'Failed to load bank account');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setVerifyError('');
    const num = parseFloat(actualBalanceInput);
    if (actualBalanceInput === '' || isNaN(num)) {
      setVerifyError('Please enter a valid actual balance amount');
      return;
    }

    try {
      setVerifyLoading(true);
      const res = await bankAccountsAPI.verifyBalance(accountId, num);
      setVerifyResult(res);
      await loadAccountData();
    } catch (err) {
      setVerifyError(err.message || 'Failed to verify balance');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError('');
    const cleanName = editName.trim();
    if (!cleanName) {
      setEditError('Bank name is required');
      return;
    }
    const numOpening = parseFloat(editOpening || '0');
    if (isNaN(numOpening)) {
      setEditError('Opening balance must be a valid number');
      return;
    }

    try {
      setEditLoading(true);
      await bankAccountsAPI.update(accountId, {
        name: cleanName,
        openingBalance: numOpening
      });
      setIsEditModalOpen(false);
      await loadAccountData();
    } catch (err) {
      setEditError(err.message || 'Failed to update bank account');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteError('');
    try {
      setDeleteLoading(true);
      await bankAccountsAPI.delete(accountId);
      setIsDeleteModalOpen(false);
      onBack();
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete bank account');
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatCurrency = (val) => `₹${Math.round(val || 0).toLocaleString('en-IN')}`;

  if (loading && !account) {
    return (
      <PageContainer>
        <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text-secondary)' }}>
          Loading bank details...
        </div>
      </PageContainer>
    );
  }

  if (error || !account) {
    return (
      <PageContainer>
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <AlertTriangle size={40} color="#DC2626" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)' }}>
            {error || 'Bank account not found'}
          </h3>
          <button className="btn-primary-navy" onClick={onBack} style={{ marginTop: '16px', width: 'auto', padding: '10px 24px' }}>
            <ArrowLeft size={16} /> Go Back
          </button>
        </div>
      </PageContainer>
    );
  }

  const lastCheck = account.lastCheck;
  const diff = lastCheck ? lastCheck.difference : 0;
  const checkDateStr = lastCheck && lastCheck.checkedAt
    ? new Date(lastCheck.checkedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : null;

  return (
    <PageContainer>
      {/* 1. Header with back and edit actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={onBack}
            style={{
              background: '#F1F5F9',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#334155'
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
              {account.name}
            </h1>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>
              {t('bankAccount')}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => {
              setEditError('');
              setIsEditModalOpen(true);
            }}
            style={{
              background: '#F1F5F9',
              border: 'none',
              borderRadius: '10px',
              padding: '8px 12px',
              fontSize: '13px',
              fontWeight: '700',
              color: '#334155',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer'
            }}
          >
            <Edit2 size={15} /> Edit
          </button>

          <button
            onClick={() => {
              setDeleteError('');
              setIsDeleteModalOpen(true);
            }}
            style={{
              background: '#FEE2E2',
              border: 'none',
              borderRadius: '10px',
              padding: '8px 12px',
              fontSize: '13px',
              fontWeight: '700',
              color: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer'
            }}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* 2. Expected Balance Card */}
      <div
        className="navy-card"
        style={{
          padding: '24px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '8px',
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          color: '#FFFFFF',
          borderRadius: '18px',
          marginBottom: '16px',
          boxShadow: '0 6px 20px rgba(15, 23, 42, 0.2)'
        }}
      >
        <div style={{ fontSize: '13px', fontWeight: '700', opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {t('expectedBalance')}
        </div>
        <div style={{ fontSize: '36px', fontWeight: '800', letterSpacing: '-0.5px' }}>
          {formatCurrency(account.expectedBalance)}
        </div>

        {/* Verification status badge */}
        <div style={{ marginTop: '4px' }}>
          {lastCheck ? (
            diff === 0 ? (
              <span style={{
                background: 'rgba(22, 163, 74, 0.25)',
                color: '#86EFAC',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '700',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <ShieldCheck size={14} /> {t('lastChecked')}: {checkDateStr} (✓ {t('balanceMatches')})
              </span>
            ) : (
              <span style={{
                background: 'rgba(220, 38, 38, 0.25)',
                color: '#FCA5A5',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '700',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <AlertCircle size={14} /> {t('lastChecked')}: {checkDateStr} ({diff > 0 ? `+₹${diff}` : `-₹${Math.abs(diff)}`} {t('difference')})
              </span>
            )
          ) : (
            <span style={{
              background: 'rgba(255, 255, 255, 0.15)',
              color: '#CBD5E1',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '600'
            }}>
              {t('notCheckedYet')}
            </span>
          )}
        </div>

        {/* Verify Balance Action Button */}
        <button
          onClick={() => {
            setVerifyError('');
            setVerifyResult(null);
            setActualBalanceInput(lastCheck ? String(lastCheck.actualBalance) : '');
            setIsVerifyModalOpen(true);
          }}
          style={{
            marginTop: '12px',
            background: '#FFFFFF',
            color: '#0F172A',
            border: 'none',
            borderRadius: '12px',
            padding: '12px 24px',
            fontSize: '15px',
            fontWeight: '800',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
          }}
        >
          <ShieldCheck size={18} color="#16A34A" /> {t('verifyBalance')}
        </button>
      </div>

      {/* 3. Account Financial Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '20px' }}>
        {/* Income */}
        <div className="stitch-card" style={{ padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#16A34A', textTransform: 'uppercase' }}>
            + {t('income')}
          </div>
          <div style={{ fontSize: '16px', fontWeight: '800', color: '#16A34A', marginTop: '4px' }}>
            {formatCurrency(account.totalIncome)}
          </div>
        </div>

        {/* Expense */}
        <div className="stitch-card" style={{ padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#DC2626', textTransform: 'uppercase' }}>
            - {t('expense')}
          </div>
          <div style={{ fontSize: '16px', fontWeight: '800', color: '#DC2626', marginTop: '4px' }}>
            {formatCurrency(account.totalExpense)}
          </div>
        </div>

        {/* Opening Balance */}
        <div className="stitch-card" style={{ padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>
            {t('openingBalance')}
          </div>
          <div style={{ fontSize: '16px', fontWeight: '800', color: '#1E293B', marginTop: '4px' }}>
            {formatCurrency(account.openingBalance)}
          </div>
        </div>
      </div>

      {/* 4. Transactions List */}
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '800', color: '#1E293B', margin: '0 0 12px 0' }}>
          {account.name} {t('transactions')} ({account.transactions?.length || 0})
        </h2>

        {!account.transactions || account.transactions.length === 0 ? (
          <div className="stitch-card" style={{ padding: '30px 20px', textAlign: 'center', color: '#64748B' }}>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>
              No UPI transactions recorded for {account.name} yet.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {account.transactions.map((tx) => (
              <div
                key={tx.id}
                className="stitch-card"
                onClick={() => {
                  setSelectedTx(tx);
                  setIsSheetOpen(true);
                }}
                style={{
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  borderRadius: '12px'
                }}
              >
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#1E293B' }}>
                    {tx.transactionName || tx.name || 'Unnamed Transaction'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px', fontWeight: '600' }}>
                    {tx.date} • {tx.paymentMethod} {tx.description ? `• ${tx.description}` : ''}
                  </div>
                </div>

                <div style={{
                  fontSize: '16px',
                  fontWeight: '800',
                  color: tx.type === 'INCOME' ? '#16A34A' : '#DC2626'
                }}>
                  {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. VERIFY BALANCE MODAL */}
      {isVerifyModalOpen && (
        <div className="sheet-backdrop" onClick={() => setIsVerifyModalOpen(false)} style={{ zIndex: 100000 }}>
          <div className="sheet-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid #E2E8F0' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1E293B', margin: 0 }}>
                {t('verifyBalance')} — {account.name}
              </h3>
              <button
                type="button"
                onClick={() => setIsVerifyModalOpen(false)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {verifyError && (
              <div style={{ background: '#FEE2E2', color: '#DC2626', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', fontSize: '13px', fontWeight: '600' }}>
                {verifyError}
              </div>
            )}

            {/* Expected Balance Info Box */}
            <div style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: '12px', padding: '14px', textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>
                {t('expectedBalance')} (Cashly)
              </div>
              <div style={{ fontSize: '26px', fontWeight: '800', color: '#1E293B', marginTop: '4px' }}>
                {formatCurrency(account.expectedBalance)}
              </div>
            </div>

            <form onSubmit={handleVerifySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#1E293B', marginBottom: '6px', display: 'block' }}>
                  {t('actualBalance')} (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder={t('enterActualBalance') || 'Enter actual balance from bank/passbook'}
                  value={actualBalanceInput}
                  onChange={(e) => {
                    setActualBalanceInput(e.target.value);
                    setVerifyResult(null);
                  }}
                  style={{
                    width: '100%',
                    padding: '14px',
                    fontSize: '18px',
                    fontWeight: '800',
                    borderRadius: '10px',
                    border: '1.5px solid #CBD5E1',
                    outline: 'none',
                    background: '#FAFAFA'
                  }}
                  required
                  autoFocus
                />
              </div>

              {/* Verification Comparison Result */}
              {verifyResult && (
                <div style={{
                  padding: '14px',
                  borderRadius: '12px',
                  background: verifyResult.matches ? '#DCFCE7' : '#FEE2E2',
                  border: `1.5px solid ${verifyResult.matches ? '#86EFAC' : '#FECDD3'}`,
                  color: verifyResult.matches ? '#15803D' : '#B91C1C'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '15px', fontWeight: '800' }}>
                    {verifyResult.matches ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                    {verifyResult.matches ? t('balanceMatches') : (
                      verifyResult.difference < 0
                        ? `₹${Math.abs(verifyResult.difference)} ${t('lessThanExpected')}`
                        : `₹${verifyResult.difference} ${t('moreThanExpected')}`
                    )}
                  </div>
                  <div style={{ fontSize: '12px', marginTop: '6px', fontWeight: '600', opacity: 0.9 }}>
                    Expected: {formatCurrency(verifyResult.expectedBalance)} | Actual: {formatCurrency(verifyResult.actualBalance)} | Diff: {verifyResult.difference >= 0 ? `+₹${verifyResult.difference}` : `-₹${Math.abs(verifyResult.difference)}`}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={verifyLoading}
                className="btn-primary-navy"
                style={{ padding: '14px', marginTop: '6px' }}
              >
                {verifyLoading ? 'Verifying...' : t('verifyBalance')}
              </button>

              <button
                type="button"
                onClick={() => setIsVerifyModalOpen(false)}
                disabled={verifyLoading}
                style={{ background: 'transparent', border: 'none', color: '#64748B', fontSize: '14px', fontWeight: '700', padding: '6px', cursor: 'pointer' }}
              >
                {t('cancel')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 6. EDIT / RENAME BANK ACCOUNT MODAL */}
      {isEditModalOpen && (
        <div className="sheet-backdrop" onClick={() => setIsEditModalOpen(false)} style={{ zIndex: 100000 }}>
          <div className="sheet-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid #E2E8F0' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1E293B', margin: 0 }}>
                Edit Bank Account
              </h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {editError && (
              <div style={{ background: '#FEE2E2', color: '#DC2626', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', fontSize: '13px', fontWeight: '600' }}>
                {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#1E293B', marginBottom: '6px', display: 'block' }}>
                  {t('bankName')} *
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={{ width: '100%', padding: '12px 14px', fontSize: '15px', borderRadius: '10px', border: '1.5px solid #CBD5E1', outline: 'none', background: '#FAFAFA' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#1E293B', marginBottom: '6px', display: 'block' }}>
                  {t('openingBalance')} (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  value={editOpening}
                  onChange={(e) => setEditOpening(e.target.value)}
                  style={{ width: '100%', padding: '12px 14px', fontSize: '16px', fontWeight: '700', borderRadius: '10px', border: '1.5px solid #CBD5E1', outline: 'none', background: '#FAFAFA' }}
                />
              </div>

              <button type="submit" disabled={editLoading} className="btn-primary-navy" style={{ padding: '14px', marginTop: '6px' }}>
                {editLoading ? 'Saving...' : 'Save Changes'}
              </button>

              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#64748B', fontSize: '14px', fontWeight: '700', padding: '6px', cursor: 'pointer' }}
              >
                {t('cancel')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 7. DELETE BANK ACCOUNT CONFIRMATION MODAL */}
      {isDeleteModalOpen && (
        <div className="sheet-backdrop" onClick={() => setIsDeleteModalOpen(false)} style={{ zIndex: 100000 }}>
          <div className="sheet-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <AlertTriangle size={44} color="#DC2626" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1E293B', margin: 0 }}>
                Delete "{account.name}"?
              </h3>
              <p style={{ fontSize: '14px', color: '#64748B', margin: '8px 0 16px 0' }}>
                Are you sure you want to delete this bank account? If this account has recorded transactions, deletion will be prevented to protect financial history.
              </p>

              {deleteError && (
                <div style={{ background: '#FEE2E2', color: '#DC2626', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', fontSize: '13px', fontWeight: '600', textAlign: 'left' }}>
                  {deleteError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  disabled={deleteLoading}
                  style={{ flex: 1, padding: '12px', background: '#F1F5F9', color: '#334155', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}
                >
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading}
                  style={{ flex: 1, padding: '12px', background: '#DC2626', color: '#FFFFFF', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}
                >
                  {deleteLoading ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. Edit Transaction Modal */}
      {isSheetOpen && selectedTx && (
        <SimpleTransactionSheet
          isOpen={isSheetOpen}
          onClose={() => {
            setIsSheetOpen(false);
            setSelectedTx(null);
          }}
          onSuccess={loadAccountData}
          editTx={selectedTx}
        />
      )}
    </PageContainer>
  );
}
