import React, { useState } from 'react';
import { Bell, User, Lock, LogOut, RefreshCw, Grid, Moon, Database, ChevronRight, Globe, Check } from 'lucide-react';
import { authAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

export default function SettingsScreen({ user, onLogout }) {
  const { language, setLanguage, t } = useLanguage();
  const [currency, setCurrency] = useState('INR (₹)');
  const [notifications, setNotifications] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMsg('');
    try {
      await authAPI.changePassword(oldPassword, newPassword);
      setPasswordMsg(t('passwordChangedSuccess'));
      setTimeout(() => setShowPasswordModal(false), 1500);
    } catch (err) {
      setPasswordMsg(err.message || t('passwordChangeFailed'));
    }
  };

  const handleSelectLanguage = (langCode) => {
    setLanguage(langCode);
    setShowLanguageModal(false);
  };

  return (
    <div className="screen-container">
      {/* Header */}
      <div className="app-header">
        <div className="app-header-left">
          <div className="app-avatar-circle">
            {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'S'}
          </div>
          <span className="app-title-text">{t('appTitle')}</span>
        </div>
        <div className="app-header-icon">
          <Bell size={18} />
        </div>
      </div>

      <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--navy-primary)' }}>
        {t('settings')}
      </h1>

      {/* Account Section */}
      <div className="stitch-card" style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--navy-primary)', padding: '12px 0 8px 0', borderBottom: '1px solid var(--border-color)' }}>
          | {t('account')}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'var(--text-main)', fontWeight: '600' }}>
            <User size={18} color="var(--text-secondary)" /> {t('profile')}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            {user?.fullName} <ChevronRight size={16} />
          </div>
        </div>

        <div
          onClick={() => setShowPasswordModal(true)}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'var(--text-main)', fontWeight: '600' }}>
            <Lock size={18} color="var(--text-secondary)" /> {t('changePassword')}
          </div>
          <ChevronRight size={16} color="var(--text-secondary)" />
        </div>

        <div
          onClick={onLogout}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 0', color: 'var(--red-expense)', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}
        >
          <LogOut size={18} /> {t('logout')}
        </div>
      </div>

      {/* Money Section */}
      <div className="stitch-card" style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--green-income)', padding: '12px 0 8px 0', borderBottom: '1px solid var(--border-color)' }}>
          | {t('money')}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'var(--text-main)', fontWeight: '600' }}>
            <RefreshCw size={18} color="var(--text-secondary)" /> {t('currency')}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            {currency} <ChevronRight size={16} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'var(--text-main)', fontWeight: '600' }}>
            <Grid size={18} color="var(--text-secondary)" /> {t('categories')}
          </div>
          <ChevronRight size={16} color="var(--text-secondary)" />
        </div>
      </div>

      {/* Application Section */}
      <div className="stitch-card" style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: '14px', fontWeight: '800', color: '#B45309', padding: '12px 0 8px 0', borderBottom: '1px solid var(--border-color)' }}>
          | {t('application')}
        </div>

        {/* Language Switcher Option */}
        <div
          onClick={() => setShowLanguageModal(true)}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'var(--text-main)', fontWeight: '600' }}>
            <Globe size={18} color="var(--navy-primary)" /> {t('language')} / Language
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--navy-primary)', fontWeight: '700' }}>
            {language === 'ta' ? 'தமிழ் (Tamil)' : 'English'} <ChevronRight size={16} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'var(--text-main)', fontWeight: '600' }}>
            <Bell size={18} color="var(--text-secondary)" /> {t('notifications')}
          </div>
          <input
            type="checkbox"
            checked={notifications}
            onChange={(e) => setNotifications(e.target.checked)}
            style={{ width: '20px', height: '20px', accentColor: 'var(--navy-primary)' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'var(--text-main)', fontWeight: '600' }}>
            <Moon size={18} color="var(--text-secondary)" /> {t('appearance')}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{t('lightSystemDefault')}</div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'var(--text-main)', fontWeight: '600' }}>
            <Database size={18} color="var(--text-secondary)" /> {t('dataBackup')}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t('lastBackup')}</div>
        </div>
      </div>

      {/* Language Selection Modal */}
      {showLanguageModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="stitch-card" style={{ width: '100%', maxWidth: '340px', display: 'flex', flexDirection: 'column', gap: '14px', padding: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--navy-primary)' }}>
              {t('selectLanguage')}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={() => handleSelectLanguage('en')}
                style={{
                  display: 'flex',
                  justify: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: language === 'en' ? '2px solid var(--navy-primary)' : '1px solid var(--border-color)',
                  backgroundColor: language === 'en' ? 'rgba(30, 58, 138, 0.05)' : 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: language === 'en' ? '700' : '500',
                  color: 'var(--text-main)'
                }}
              >
                <span>English</span>
                {language === 'en' && <Check size={18} color="var(--navy-primary)" />}
              </button>

              <button
                onClick={() => handleSelectLanguage('ta')}
                style={{
                  display: 'flex',
                  justify: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: language === 'ta' ? '2px solid var(--navy-primary)' : '1px solid var(--border-color)',
                  backgroundColor: language === 'ta' ? 'rgba(30, 58, 138, 0.05)' : 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: language === 'ta' ? '700' : '500',
                  color: 'var(--text-main)'
                }}
              >
                <span>தமிழ் (Tamil)</span>
                {language === 'ta' && <Check size={18} color="var(--navy-primary)" />}
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button className="btn-outline-navy" onClick={() => setShowLanguageModal(false)}>
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="stitch-card" style={{ width: '100%', maxWidth: '340px', display: 'flex', flexDirection: 'column', gap: '14px', padding: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--navy-primary)' }}>{t('changePassword')}</h3>

            {passwordMsg && (
              <div style={{ fontSize: '13px', fontWeight: '600', color: passwordMsg.includes('success') || passwordMsg.includes('வெற்றிகரமாக') ? 'var(--green-income)' : 'var(--red-expense)' }}>
                {passwordMsg}
              </div>
            )}

            <input
              type="password"
              className="input-control"
              placeholder={t('currentPassword')}
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
            />

            <input
              type="password"
              className="input-control"
              placeholder={t('newPassword')}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />

            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button className="btn-primary-navy" onClick={handleChangePassword}>{t('save')}</button>
              <button className="btn-outline-navy" onClick={() => setShowPasswordModal(false)}>{t('cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
