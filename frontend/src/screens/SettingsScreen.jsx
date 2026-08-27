import React, { useState, useEffect } from 'react';
import { Bell, User, Lock, LogOut, RefreshCw, Grid, Moon, Database, ChevronRight, Globe, Check, Download, Upload, Edit2 } from 'lucide-react';
import { authAPI, settingsAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import PageContainer from '../components/PageContainer';

export default function SettingsScreen({ user, onLogout, onUpdateUser }) {
  const { language, setLanguage, t } = useLanguage();
  const [currency, setCurrency] = useState('INR (₹)');
  const [notifications, setNotifications] = useState(true);

  // Modals
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Profile Edit State
  const [editName, setEditName] = useState(user?.fullName || '');
  const [profileMsg, setProfileMsg] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  // Password Edit State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');

  // Backup State
  const [backupStatus, setBackupStatus] = useState('');
  const [backupLoading, setBackupLoading] = useState(false);

  useEffect(() => {
    if (user?.fullName) {
      setEditName(user.fullName);
    }
  }, [user]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!editName.trim()) return;

    try {
      setProfileLoading(true);
      setProfileMsg('');
      const res = await authAPI.updateProfile(editName.trim());
      setProfileMsg(t('profileUpdatedSuccess') || 'Profile updated successfully!');
      if (onUpdateUser) {
        onUpdateUser({ fullName: editName.trim() });
      }
      setTimeout(() => {
        setShowProfileModal(false);
        setProfileMsg('');
      }, 1200);
    } catch (err) {
      console.error('Failed to update profile name:', err);
      setProfileMsg(err.message || 'Failed to update profile name');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      setBackupLoading(true);
      setBackupStatus('Generating backup...');
      const data = await settingsAPI.exportBackup();
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MoneyTracker_Backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setBackupStatus('Backup exported successfully!');
    } catch (err) {
      console.error('Backup export error:', err);
      setBackupStatus('Failed to export backup.');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestoreBackup = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setBackupLoading(true);
      setBackupStatus('Restoring backup...');
      const text = await file.text();
      const backupData = JSON.parse(text);

      await settingsAPI.restoreBackup(backupData);
      setBackupStatus('Backup restored successfully! Reloading...');
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err) {
      console.error('Restore error:', err);
      setBackupStatus('Invalid backup file or restore failed.');
    } finally {
      setBackupLoading(false);
    }
  };

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
    <PageContainer>
      <h1 className="page-title">
        {t('settings')}
      </h1>

      {/* Account Section */}
      <div className="stitch-card" style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--navy-primary)', padding: '12px 0 8px 0', borderBottom: '1px solid var(--border-color)' }}>
          | {t('account')}
        </div>

        {/* Interactive Profile Option */}
        <div
          onClick={() => {
            setEditName(user?.fullName || '');
            setProfileMsg('');
            setShowProfileModal(true);
          }}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'var(--text-main)', fontWeight: '600' }}>
            <User size={18} color="var(--navy-primary)" /> {t('profile')}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--navy-primary)', fontWeight: '700' }}>
            {user?.fullName} <Edit2 size={15} />
          </div>
        </div>

        <div
          onClick={() => setShowLogoutModal(true)}
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '14px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'var(--text-main)', fontWeight: '600' }}>
              <Database size={18} color="var(--navy-primary)" /> {t('dataBackup')} / Cloud
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {backupStatus || 'JSON / Google Drive'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button
              className="btn-outline-navy"
              onClick={handleExportBackup}
              disabled={backupLoading}
              style={{ flex: 1, padding: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <Download size={14} /> Export Backup
            </button>

            <label
              className="btn-primary-navy"
              style={{ flex: 1, padding: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer', textAlign: 'center' }}
            >
              <Upload size={14} /> Restore Backup
              <input
                type="file"
                accept=".json"
                onChange={handleRestoreBackup}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Edit Profile Name Modal */}
      {showProfileModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="stitch-card" style={{ width: '100%', maxWidth: '360px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--navy-primary)' }}>
              {t('editProfile') || 'Edit Profile Name'}
            </h3>

            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                  {t('fullName') || 'Full Name'}
                </label>
                <input
                  type="text"
                  className="input-control"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder={t('enterFullName') || 'Enter full name'}
                  required
                  autoFocus
                />
              </div>

              {profileMsg && (
                <div style={{
                  fontSize: '13px',
                  fontWeight: '700',
                  color: profileMsg.includes('successfully') || profileMsg.includes('வெற்றிகரமாக') ? 'var(--green-income)' : 'var(--red-expense)',
                  textAlign: 'center'
                }}>
                  {profileMsg}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  className="btn-outline-navy"
                  style={{ flex: 1 }}
                  onClick={() => setShowProfileModal(false)}
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="btn-primary-navy"
                  style={{ flex: 1 }}
                  disabled={profileLoading || !editName.trim()}
                >
                  {profileLoading ? 'Saving...' : (t('saveChanges') || 'Save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Language Selection Modal */}
      {showLanguageModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          zIndex: 1000,
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
                  justifyContent: 'space-between',
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
                  justifyContent: 'space-between',
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

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="stitch-card" style={{ width: '100%', maxWidth: '340px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--navy-primary)' }}>
              Log Out
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              Are you sure you want to log out?
            </p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button className="btn-outline-navy" style={{ flex: 1 }} onClick={() => setShowLogoutModal(false)}>
                Cancel
              </button>
              <button
                style={{ flex: 1, padding: '12px', backgroundColor: 'var(--red-expense)', color: '#FFF', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}
                onClick={() => {
                  setShowLogoutModal(false);
                  onLogout();
                }}
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
