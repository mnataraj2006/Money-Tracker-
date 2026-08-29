import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, Save, Plus } from 'lucide-react';
import { transactionsAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useDataCache } from '../context/DataContext';

const DEFAULT_CATEGORIES = [
  'General',
  'Groceries',
  'Vegetables',
  'Food',
  'Medical',
  'Petrol',
  'Rent',
  'Salary',
  'Bills',
  'Transport',
  'Others'
];

export default function SimpleTransactionSheet({
  isOpen,
  onClose,
  onSuccess,
  initialDate,
  editTx = null,
  presetType = 'EXPENSE',
  presetName = '',
  presetAmount = '',
  presetNote = ''
}) {
  const { t, language } = useLanguage();
  const { clearCache } = useDataCache();
  const todayDateStr = new Date().toISOString().split('T')[0];

  const [type, setType] = useState('EXPENSE');
  const [amount, setAmount] = useState('');
  const [name, setName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [date, setDate] = useState(todayDateStr);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');

  // Custom User Categories (Persisted across sessions)
  const [userCategories, setUserCategories] = useState(() => {
    try {
      const saved = localStorage.getItem('money_tracker_user_categories');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Modal State for + Add Category
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editTx) {
        setType(editTx.type === 'INCOME' ? 'INCOME' : 'EXPENSE');
        setAmount(editTx.amount ? String(editTx.amount) : '');
        setName(editTx.transactionName || editTx.name || '');
        setPaymentMethod(editTx.paymentMethod || 'CASH');
        setDate(editTx.date ? editTx.date.split('T')[0] : (initialDate || todayDateStr));
        const rawDesc = editTx.description || editTx.note || '';
        setDescription(rawDesc === 'string' ? '' : rawDesc);
        setCategory(editTx.category || 'General');
      } else {
        setType(presetType || 'EXPENSE');
        setAmount(presetAmount ? String(presetAmount) : '');
        setName(presetName || '');
        setPaymentMethod('CASH');
        setDate(initialDate || todayDateStr);
        const rawNote = presetNote || '';
        setDescription(rawNote === 'string' ? '' : rawNote);
        setCategory('General');
      }
      setErrorMsg('');
      setShowConfirmDelete(false);
    }
  }, [isOpen, editTx, presetType, presetName, presetAmount, presetNote, initialDate]);

  // Ensure 'General' is permanently available at index 0, followed by user-created categories
  const baseCategories = ['General', ...userCategories.filter(c => c && c !== 'General')];
  if (editTx && editTx.category && !baseCategories.includes(editTx.category)) {
    baseCategories.push(editTx.category);
  }
  const allCategories = baseCategories;

  const handleSaveCategory = (e) => {
    e?.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed || trimmed === 'General') {
      setNewCatName('');
      setShowAddCategoryModal(false);
      return;
    }

    if (!userCategories.includes(trimmed)) {
      const updated = [...userCategories, trimmed];
      setUserCategories(updated);
      try {
        localStorage.setItem('money_tracker_user_categories', JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to save user categories:', err);
      }
    }
    // New category is now available in dropdown; keep selected category as-is (e.g. General)
    setNewCatName('');
    setShowAddCategoryModal(false);
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    setErrorMsg('');

    const numericAmount = parseFloat(amount);
    if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMsg(t('pleaseEnterValidAmount'));
      return;
    }

    if (!name.trim()) {
      setErrorMsg(t('pleaseEnterTxName'));
      return;
    }

    if (!date) {
      setErrorMsg(t('pleaseSelectDate'));
      return;
    }

    const payload = {
      type: type,
      category: category.trim() || 'General',
      amount: numericAmount,
      description: description.trim(),
      date: date,
      paymentMethod: paymentMethod || 'CASH',
      transactionName: name.trim(),
      name: name.trim()
    };

    try {
      setLoading(true);
      if (editTx && editTx.id) {
        await transactionsAPI.update(editTx.id, payload);
      } else {
        await transactionsAPI.create(payload);
      }
      clearCache();
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to save transaction:', err);
      setErrorMsg(err.message || 'Failed to save. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!editTx || !editTx.id) return;
    try {
      setLoading(true);
      await transactionsAPI.delete(editTx.id);
      setShowConfirmDelete(false);
      clearCache();
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to delete transaction:', err);
      setErrorMsg(err.message || 'Failed to delete. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <>
      <div className="sheet-backdrop" onClick={onClose} style={{ zIndex: 99999 }}>
        <div className="sheet-container" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="sheet-header" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            paddingBottom: '8px',
            borderBottom: '1px solid #E2E8F0',
            width: '100%'
          }}>
            <div style={{ width: '40px' }} />
            
            <h3 className="sheet-title" style={{
              fontSize: '20px',
              fontWeight: '800',
              margin: 0,
              color: '#1E293B',
              textAlign: 'center',
              flex: 1
            }}>
              {editTx ? t('editTransaction') : t('newTransaction')}
            </h3>

            <button
              type="button"
              className="sheet-close-btn"
              onClick={(e) => {
                e.stopPropagation();
                if (onClose) onClose();
              }}
              aria-label="Close"
              style={{
                background: '#F1F5F9',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#334155',
                cursor: 'pointer',
                flexShrink: 0,
                outline: 'none',
                WebkitTapHighlightColor: 'transparent',
                zIndex: 9999
              }}
            >
              <X size={24} style={{ pointerEvents: 'none' }} />
            </button>
          </div>

          {/* Error Alert */}
          {errorMsg && (
            <div style={{
              background: '#FEE2E2',
              color: '#DC2626',
              padding: '10px 14px',
              borderRadius: '8px',
              marginBottom: '14px',
              fontSize: '14px',
              fontWeight: '600'
            }}>
              {errorMsg}
            </div>
          )}

          {/* Income / Expense Toggle Switch */}
          <div className="type-toggle-bar" style={{ display: 'flex', background: '#F1F5F9', borderRadius: '10px', padding: '4px', marginBottom: '20px' }}>
            <button
              type="button"
              className={`type-toggle-btn ${type === 'INCOME' ? 'active income' : ''}`}
              onClick={() => setType('INCOME')}
              style={{
                flex: 1,
                padding: '12px 0',
                border: 'none',
                borderRadius: '8px',
                fontSize: '17px',
                fontWeight: '800',
                cursor: 'pointer',
                background: type === 'INCOME' ? '#16A34A' : 'transparent',
                color: type === 'INCOME' ? '#FFFFFF' : '#64748B'
              }}
            >
              {t('income')}
            </button>
            <button
              type="button"
              className={`type-toggle-btn ${type === 'EXPENSE' ? 'active expense' : ''}`}
              onClick={() => setType('EXPENSE')}
              style={{
                flex: 1,
                padding: '12px 0',
                border: 'none',
                borderRadius: '8px',
                fontSize: '17px',
                fontWeight: '800',
                cursor: 'pointer',
                background: type === 'EXPENSE' ? '#DC2626' : 'transparent',
                color: type === 'EXPENSE' ? '#FFFFFF' : '#64748B'
              }}
            >
              {t('expense')}
            </button>
          </div>

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* 1. Amount Field */}
            <div className="sheet-field-group">
              <label className="sheet-field-label" style={{ fontSize: '14px', fontWeight: '700', color: '#1E293B' }}>
                1 &nbsp; {t('amount')}
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{ position: 'absolute', left: '16px', fontSize: '24px', fontWeight: '800', color: '#1E293B' }}>₹</span>
                <input
                  type="number"
                  step="any"
                  className="sheet-input amount"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '14px 16px 14px 40px',
                    fontSize: '24px',
                    fontWeight: '800',
                    borderRadius: '10px',
                    border: '1.5px solid #CBD5E1',
                    outline: 'none',
                    background: '#FAFAFA'
                  }}
                  required
                />
              </div>
            </div>

            {/* 2. Transaction Name Field */}
            <div className="sheet-field-group">
              <label className="sheet-field-label" style={{ fontSize: '14px', fontWeight: '700', color: '#1E293B' }}>
                2 &nbsp; {t('transactionName')}
              </label>
              <input
                type="text"
                className="sheet-input"
                placeholder={t('enterTransactionName')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  fontSize: '16px',
                  borderRadius: '10px',
                  border: '1.5px solid #CBD5E1',
                  outline: 'none',
                  background: '#FAFAFA'
                }}
                required
              />
            </div>

            {/* 3. Payment Method Field */}
            <div className="sheet-field-group">
              <label className="sheet-field-label" style={{ fontSize: '14px', fontWeight: '700', color: '#1E293B' }}>
                3 &nbsp; {t('paymentMethod')}
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  fontSize: '15px',
                  fontWeight: '600',
                  borderRadius: '10px',
                  border: '1.5px solid #CBD5E1',
                  outline: 'none',
                  background: '#FAFAFA',
                  color: '#1E293B'
                }}
              >
                <option value="CASH">Cash (Modifies Cash at Home)</option>
                <option value="UPI">UPI</option>
                <option value="BANK">Bank</option>
                <option value="CARD">Card</option>
              </select>
            </div>

            {/* 4. Date Field */}
            <div className="sheet-field-group">
              <label className="sheet-field-label" style={{ fontSize: '14px', fontWeight: '700', color: '#1E293B' }}>
                4 &nbsp; {t('date')}
              </label>
              <input
                type="date"
                className="sheet-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  fontSize: '15px',
                  fontWeight: '600',
                  borderRadius: '10px',
                  border: '1.5px solid #CBD5E1',
                  outline: 'none',
                  background: '#FAFAFA',
                  color: '#1E293B'
                }}
                required
              />
            </div>

            {/* 5. Description Field (Optional) */}
            <div className="sheet-field-group">
              <label className="sheet-field-label" style={{ fontSize: '14px', fontWeight: '700', color: '#1E293B' }}>
                5 &nbsp; {t('descriptionOptional')}
              </label>
              <input
                type="text"
                className="sheet-input"
                placeholder={t('enterDescription')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  fontSize: '15px',
                  borderRadius: '10px',
                  border: '1.5px solid #CBD5E1',
                  outline: 'none',
                  background: '#FAFAFA'
                }}
              />
            </div>

            {/* 6. Category Field */}
            <div className="sheet-field-group">
              <label className="sheet-field-label" style={{ fontSize: '14px', fontWeight: '700', color: '#1E293B' }}>
                6 &nbsp; {t('category')}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  fontSize: '15px',
                  fontWeight: '600',
                  borderRadius: '10px',
                  border: '1.5px solid #CBD5E1',
                  outline: 'none',
                  background: '#FAFAFA',
                  color: '#1E293B'
                }}
              >
                {allCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === 'General' ? t('generalCategory') : cat}
                  </option>
                ))}
              </select>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                <span style={{ fontSize: '12px', color: '#64748B' }}>
                  {t('changeLaterNote')}
                </span>

                <button
                  type="button"
                  onClick={() => setShowAddCategoryModal(true)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#16247B',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Plus size={14} /> {t('addCategory')}
                </button>
              </div>
            </div>

            {/* Primary Save Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '16px',
                background: '#16247B',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '12px',
                fontSize: '17px',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '8px'
              }}
            >
              <Save size={20} />
              {loading ? '...' : (type === 'INCOME' ? t('saveIncome') : t('saveExpense'))}
            </button>

            {/* Cancel Button */}
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                width: '100%',
                padding: '10px',
                background: 'transparent',
                color: '#64748B',
                border: 'none',
                fontSize: '15px',
                fontWeight: '700',
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              {t('cancel')}
            </button>
          </form>

          {/* Delete Option (When editing an existing entry) */}
          {editTx && (
            <button
              type="button"
              onClick={() => setShowConfirmDelete(true)}
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                background: '#FEE2E2',
                color: '#DC2626',
                border: '1px solid #FECDD3',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: '700',
                cursor: 'pointer',
                marginTop: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Trash2 size={18} />
              {t('delete')}
            </button>
          )}
        </div>
      </div>

      {/* Add Category Modal */}
      {showAddCategoryModal && (
        <div className="confirm-backdrop" onClick={() => setShowAddCategoryModal(false)} style={{ zIndex: 100001 }}>
          <div className="confirm-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '360px', width: '90%' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: '800', color: '#1E293B', textAlign: 'center' }}>
              {t('addCategoryTitle')}
            </h4>
            <form onSubmit={handleSaveCategory}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#64748B', marginBottom: '6px' }}>
                  {t('categoryNameLabel')}
                </label>
                <input
                  type="text"
                  placeholder={t('enterCategoryName')}
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    fontSize: '15px',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  autoFocus
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="confirm-btn cancel"
                  onClick={() => setShowAddCategoryModal(false)}
                  style={{ flex: 1 }}
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: '#16247B',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showConfirmDelete && (
        <div className="confirm-backdrop" onClick={() => setShowConfirmDelete(false)} style={{ zIndex: 100001 }}>
          <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-text">{t('confirmDeleteTx')}</div>
            <div className="confirm-actions">
              <button
                className="confirm-btn cancel"
                onClick={() => setShowConfirmDelete(false)}
                disabled={loading}
              >
                {t('cancel')}
              </button>
              <button
                className="confirm-btn delete"
                onClick={handleDelete}
                disabled={loading}
              >
                {loading ? '...' : t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}
