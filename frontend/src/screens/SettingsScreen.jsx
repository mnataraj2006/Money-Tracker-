import React, { useState, useEffect } from 'react';
import { Bell, User, Lock, LogOut, RefreshCw, Grid, Moon, Database, ChevronRight, Globe, Check, Download, Upload, Edit2, Mic, Cloud, UploadCloud, DownloadCloud, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { authAPI, settingsAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useDataCache } from '../context/DataContext';
import { useRegisterModal } from '../context/NavigationContext';
import { googleDriveService } from '../services/googleDriveService';
import {
  getBackupFrequency,
  setBackupFrequency,
  getLastBackupTime,
  setLastBackupTime,
  performCloudBackup
} from '../services/backupScheduler';
import PageContainer from '../components/PageContainer';

export default function SettingsScreen({ user, onLogout, onUpdateUser, viewMode = 'normal', onViewModeChange }) {
  const { language, setLanguage, t } = useLanguage();
  const { clearCache } = useDataCache();
  const [currency, setCurrency] = useState('INR (₹)');
  const [notifications, setNotifications] = useState(true);
  const [voiceLang, setVoiceLang] = useState(() => localStorage.getItem('cashly_voice_lang') || 'auto');
  const [activeViewMode, setActiveViewMode] = useState(viewMode);

  useEffect(() => {
    setActiveViewMode(viewMode);
  }, [viewMode]);

  const handleModeToggle = (newMode) => {
    setActiveViewMode(newMode);
    localStorage.setItem('money_tracker_app_view', newMode);
    if (onViewModeChange) {
      onViewModeChange(newMode);
    }
  };

  // Modals
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showConfirmRestore, setShowConfirmRestore] = useState(false);

  // Profile Edit State
  const [editName, setEditName] = useState(user?.fullName || '');
  const [profileMsg, setProfileMsg] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  // Password Edit State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Cloud Backup State
  const [cloudFrequency, setCloudFrequencyState] = useState(getBackupFrequency);
  const [lastBackup, setLastBackup] = useState(getLastBackupTime);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudStatus, setCloudStatus] = useState('');
  const [cloudError, setCloudError] = useState('');

  // Google Drive Connection State (Synchronized via backend)
  const [isDriveConnected, setIsDriveConnected] = useState(() => googleDriveService.isConnected());
  const [driveAccountEmail, setDriveAccountEmail] = useState(() => googleDriveService.getConnectedAccount() || user?.email || '');
  const [driveConnecting, setDriveConnecting] = useState(false);
  const [driveStatusLoading, setDriveStatusLoading] = useState(true);
  const [driveNeedsReauth, setDriveNeedsReauth] = useState(false);

  // Restore Modal State
  const [driveBackups, setDriveBackups] = useState([]);
  const [fetchBackupsLoading, setFetchBackupsLoading] = useState(false);
  const [selectedBackupFile, setSelectedBackupFile] = useState(null);
  const [restoringLoading, setRestoringLoading] = useState(false);

  // Local JSON Backup State
  const [backupStatus, setBackupStatus] = useState('');
  const [backupLoading, setBackupLoading] = useState(false);

  // Register Modals with Back Button manager
  useRegisterModal(showRestoreModal, () => {
    if (showConfirmRestore) {
      setShowConfirmRestore(false);
      return true;
    }
    setShowRestoreModal(false);
    return true;
  });

  useRegisterModal(showProfileModal, () => {
    setShowProfileModal(false);
    return true;
  });

  useRegisterModal(showPasswordModal, () => {
    setShowPasswordModal(false);
    return true;
  });

  useRegisterModal(showLanguageModal, () => {
    setShowLanguageModal(false);
    return true;
  });

  useRegisterModal(showLogoutModal, () => {
    setShowLogoutModal(false);
    return true;
  });

  useEffect(() => {
    if (user?.fullName) {
      setEditName(user.fullName);
    }
    if (user?.email && !driveAccountEmail) {
      setDriveAccountEmail(user.email);
    }
    loadDriveStatus();
  }, [user]);

  const loadDriveStatus = async () => {
    try {
      setDriveStatusLoading(true);
      const res = await settingsAPI.getDriveStatus();
      if (res) {
        setIsDriveConnected(!!res.connected);
        if (res.googleEmail) {
          setDriveAccountEmail(res.googleEmail);
        }
        if (res.lastBackupAt) {
          setLastBackup(res.lastBackupAt);
          setLastBackupTime(res.lastBackupAt);
        }
        if (res.backupFrequency) {
          setCloudFrequencyState(res.backupFrequency);
          setBackupFrequency(res.backupFrequency);
        }
        googleDriveService.syncWithBackendStatus(res);
      }
    } catch (err) {
      console.warn('Failed to load drive status from backend:', err);
    } finally {
      setDriveStatusLoading(false);
    }
  };

  const handleFrequencyChange = async (freq) => {
    setCloudFrequencyState(freq);
    setBackupFrequency(freq);
    try {
      await settingsAPI.updateDriveFrequency(freq);
    } catch (e) {
      console.warn('Failed to persist frequency to backend:', e);
    }
  };

  // Direct Gesture-Safe Google Drive Connect
  const handleConnectDrive = async () => {
    try {
      setDriveConnecting(true);
      setCloudError('');
      setCloudStatus(t('driveConnecting') || 'Connecting to Google Drive...');
      const hintEmail = user?.email || driveAccountEmail;
      const token = await googleDriveService.requestFreshToken(true, hintEmail);
      if (token) {
        const email = googleDriveService.getConnectedAccount() || hintEmail || '';
        try {
          await settingsAPI.connectDrive({ email });
        } catch (backendErr) {
          console.warn('Failed to record connection at backend:', backendErr);
        }
        setIsDriveConnected(true);
        setDriveNeedsReauth(false);
        setDriveAccountEmail(email);
        setCloudStatus(t('driveConnectedSuccess') || '✓ Google Drive connected successfully!');
        setTimeout(() => setCloudStatus(''), 4000);
      }
    } catch (err) {
      console.error('Google Drive connection failed:', err);
      setCloudError(err.message || 'Failed to connect Google Drive.');
      setCloudStatus('');
    } finally {
      setDriveConnecting(false);
    }
  };

  const handleDisconnectDrive = async () => {
    try {
      await settingsAPI.disconnectDrive();
    } catch (e) {
      console.warn('Backend disconnect error:', e);
    }
    googleDriveService.disconnect();
    setIsDriveConnected(false);
    setDriveNeedsReauth(false);
    setCloudStatus(t('driveDisconnectedSuccess') || 'Google Drive disconnected.');
    setTimeout(() => setCloudStatus(''), 3000);
  };

  const handleManualCloudBackup = async () => {
    if (!isDriveConnected) {
      await handleConnectDrive();
      return;
    }

    try {
      setCloudLoading(true);
      setCloudStatus(t('backingUp') || 'Backing up to Google Drive...');
      setCloudError('');
      setDriveNeedsReauth(false);

      const res = await performCloudBackup();
      setLastBackup(res.timestamp);
      setCloudStatus(t('backupSuccess') || '✓ Backup completed successfully!');
      setTimeout(() => setCloudStatus(''), 4000);
    } catch (err) {
      console.error('Manual Drive backup failed:', err);
      if (err?.code === 'GOOGLE_DRIVE_REAUTH_REQUIRED' || err?.message?.includes('expired') || err?.message?.includes('reauth')) {
        setDriveNeedsReauth(true);
        setCloudError(t('driveSessionExpired') || 'Google Drive connection expired. Please reconnect.');
      } else {
        setCloudError(err.message || t('backupFailed') || 'Failed to backup to Google Drive.');
      }
    } finally {
      setCloudLoading(false);
    }
  };

  const handleOpenRestoreModal = async () => {
    if (!isDriveConnected) {
      setCloudError(t('driveSessionExpired') || 'Please connect Google Drive first.');
      return;
    }
    setShowRestoreModal(true);
    setFetchBackupsLoading(true);
    setDriveBackups([]);
    setCloudError('');
    setDriveNeedsReauth(false);
    try {
      const files = await googleDriveService.listBackups();
      setDriveBackups(files);
    } catch (err) {
      console.error('Failed to list backups:', err);
      if (err?.code === 'GOOGLE_DRIVE_REAUTH_REQUIRED' || err?.message?.includes('expired')) {
        setDriveNeedsReauth(true);
        setShowRestoreModal(false);
        setCloudError(t('driveSessionExpired') || 'Google Drive connection expired. Please reconnect.');
      } else {
        setCloudError(err.message || 'Could not fetch backups from Google Drive.');
      }
    } finally {
      setFetchBackupsLoading(false);
    }
  };

  const handleConfirmRestore = async () => {
    if (!selectedBackupFile) return;

    try {
      setRestoringLoading(true);
      const backupData = await googleDriveService.downloadBackup(selectedBackupFile.id);
      await settingsAPI.restoreBackup(backupData);
      clearCache();
      setShowConfirmRestore(false);
      setShowRestoreModal(false);
      alert(t('restoreSuccess') || 'Data restored successfully! Refreshing...');
      window.location.reload();
    } catch (err) {
      console.error('Restore failed:', err);
      alert('Failed to restore backup: ' + err.message);
    } finally {
      setRestoringLoading(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!editName.trim()) return;

    try {
      setProfileLoading(true);
      setProfileMsg('');
      await authAPI.updateProfile(editName.trim());
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
      a.download = `Cashly_Backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setBackupStatus('Backup exported successfully!');
      setTimeout(() => setBackupStatus(''), 3000);
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
      clearCache();
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
    setPasswordLoading(true);
    try {
      await authAPI.changePassword(oldPassword, newPassword);
      setPasswordMsg(t('passwordChangedSuccess') || 'Password changed successfully!');
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordMsg('');
        setOldPassword('');
        setNewPassword('');
      }, 1500);
    } catch (err) {
      setPasswordMsg(err.message || t('passwordChangeFailed') || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSelectLanguage = (langCode) => {
    setLanguage(langCode);
    setShowLanguageModal(false);
  };

  const formatLastBackupDate = (isoStr) => {
    if (!isoStr) return t('notCheckedYet') || 'Not backed up yet';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ' at ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return isoStr;
    }
  };

  return (
    <PageContainer>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--navy-primary)', letterSpacing: '-0.3px' }}>
            {t('settings')}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px', fontWeight: '500' }}>
            {t('managePreferences') || 'Preferences & Data'}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '30px' }}>
        {/* Profile Section */}
        <div className="stitch-card" style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '14px', fontWeight: '800', color: '#16A34A', padding: '12px 0 8px 0', borderBottom: '1px solid var(--border-color)' }}>
            | {t('profile')}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'var(--text-main)', fontWeight: '600' }}>
              <User size={18} color="var(--text-secondary)" /> {t('user')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--navy-primary)' }}>
                {user?.fullName || 'User'}
              </span>
              <button
                onClick={() => {
                  setEditName(user?.fullName || '');
                  setProfileMsg('');
                  setShowProfileModal(true);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--navy-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px'
                }}
              >
                <Edit2 size={15} />
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'var(--text-main)', fontWeight: '600' }}>
              <Lock size={18} color="var(--text-secondary)" /> {t('password')}
            </div>
            <button
              onClick={() => {
                setPasswordMsg('');
                setOldPassword('');
                setNewPassword('');
                setShowPasswordModal(true);
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--navy-primary)',
                fontSize: '13px',
                fontWeight: '700'
              }}
            >
              {t('change') || 'Change'}
            </button>
          </div>
        </div>

        {/* Money Section */}
        <div className="stitch-card" style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--navy-primary)', padding: '12px 0 8px 0', borderBottom: '1px solid var(--border-color)' }}>
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

          {/* App View Mode Selection */}
          <div style={{ padding: '14px 0', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '15px', color: 'var(--text-main)', fontWeight: '700', marginBottom: '4px' }}>
              App View
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              Choose how you want to use the app.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label
                onClick={() => handleModeToggle('normal')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: activeViewMode === 'normal' ? '2px solid #16A34A' : '1px solid #CBD5E1',
                  background: activeViewMode === 'normal' ? '#F0FDF4' : '#FFFFFF',
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '14px',
                  color: activeViewMode === 'normal' ? '#166534' : '#334155'
                }}
              >
                <input
                  type="radio"
                  name="appViewMode"
                  checked={activeViewMode === 'normal'}
                  onChange={() => handleModeToggle('normal')}
                  style={{ accentColor: '#16A34A', width: '18px', height: '18px' }}
                />
                Normal Mode
              </label>

              <label
                onClick={() => handleModeToggle('simple')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: activeViewMode === 'simple' ? '2px solid #16A34A' : '1px solid #CBD5E1',
                  background: activeViewMode === 'simple' ? '#F0FDF4' : '#FFFFFF',
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '14px',
                  color: activeViewMode === 'simple' ? '#166534' : '#334155'
                }}
              >
                <input
                  type="radio"
                  name="appViewMode"
                  checked={activeViewMode === 'simple'}
                  onChange={() => handleModeToggle('simple')}
                  style={{ accentColor: '#16A34A', width: '18px', height: '18px' }}
                />
                Simple Passbook Mode
              </label>
            </div>
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

          {/* Voice Language Preference */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'var(--text-main)', fontWeight: '600' }}>
              <Mic size={18} color="#021A1A" /> {t('voiceLanguage') || 'Voice Language'}
            </div>
            <select
              value={voiceLang}
              onChange={(e) => {
                const val = e.target.value;
                setVoiceLang(val);
                localStorage.setItem('cashly_voice_lang', val);
              }}
              style={{
                padding: '6px 10px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                fontWeight: '700',
                backgroundColor: '#FFF',
                color: '#021A1A'
              }}
            >
              <option value="auto">Auto ({t('autoDetect') || 'Auto'})</option>
              <option value="ta">தமிழ் (Tamil)</option>
              <option value="en">English</option>
            </select>
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

          {/* GOOGLE DRIVE & DATA BACKUP SECTION */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px 0', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '15px', color: 'var(--navy-primary)', fontWeight: '800' }}>
                <Cloud size={20} color="#4F46E5" /> {t('googleDriveBackup')}
              </div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: driveStatusLoading ? '#64748B' : (isDriveConnected ? '#16A34A' : '#64748B') }}>
                {driveStatusLoading ? 'Checking connection...' : (isDriveConnected ? (t('googleDriveConnected') || 'Connected ✓') : (t('googleDriveNotConnected') || 'Not Connected'))}
              </div>
            </div>

            {/* Connection Status Card */}
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '12px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748B' }}>
                  {t('lastCloudBackup')}:
                </span>
                <span style={{ fontSize: '12px', fontWeight: '800', color: lastBackup ? '#16A34A' : '#64748B' }}>
                  {formatLastBackupDate(lastBackup)}
                </span>
              </div>

              {isDriveConnected && driveAccountEmail && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748B' }}>
                    Account:
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#1E293B' }}>
                    {driveAccountEmail}
                  </span>
                </div>
              )}

              {/* Frequency Selector */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#1E293B' }}>
                  {t('autoBackupFrequency')}:
                </label>
                <select
                  value={cloudFrequency}
                  onChange={(e) => handleFrequencyChange(e.target.value)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    background: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#1E293B',
                    outline: 'none'
                  }}
                >
                  <option value="weekly">{t('weekly')}</option>
                  <option value="daily">{t('daily')}</option>
                  <option value="manual">{t('manualOnly')}</option>
                </select>
              </div>
            </div>

            {cloudStatus && (
              <div style={{ background: '#DCFCE7', color: '#15803D', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', textAlign: 'center' }}>
                {cloudStatus}
              </div>
            )}

            {cloudError && (
              <div style={{ background: '#FEE2E2', color: '#DC2626', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', textAlign: 'center' }}>
                {cloudError}
              </div>
            )}

            {/* If Re-Auth is Needed */}
            {driveNeedsReauth && (
              <button
                className="btn-primary-navy"
                onClick={handleConnectDrive}
                disabled={driveConnecting}
                style={{ width: '100%', padding: '10px 8px', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <RefreshCw size={15} className={driveConnecting ? 'animate-spin' : ''} />
                {driveConnecting ? (t('driveConnecting') || 'Connecting...') : (t('reconnectDrive') || 'Reconnect Google Drive')}
              </button>
            )}

            {/* Cloud Buttons */}
            {!isDriveConnected && !driveNeedsReauth ? (
              <button
                className="btn-primary-navy"
                onClick={handleConnectDrive}
                disabled={driveConnecting}
                style={{ width: '100%', padding: '10px 8px', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Cloud size={15} />
                {driveConnecting ? (t('driveConnecting') || 'Connecting...') : (t('connectDrive') || 'Connect Google Drive')}
              </button>
            ) : !driveNeedsReauth ? (
              <>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn-primary-navy"
                    onClick={handleManualCloudBackup}
                    disabled={cloudLoading || driveConnecting}
                    style={{ flex: 1, padding: '10px 8px', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <UploadCloud size={15} />
                    {cloudLoading ? (t('backingUp') || 'Backing up...') : t('backupNow')}
                  </button>

                  <button
                    className="btn-outline-navy"
                    onClick={handleOpenRestoreModal}
                    disabled={cloudLoading || driveConnecting}
                    style={{ flex: 1, padding: '10px 8px', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <DownloadCloud size={15} />
                    {t('restoreFromDrive')}
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={handleDisconnectDrive}
                    type="button"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#94A3B8',
                      fontSize: '11px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      padding: '2px 4px',
                      textDecoration: 'underline'
                    }}
                  >
                    {t('disconnectDrive') || 'Disconnect'}
                  </button>
                </div>
              </>
            ) : null}

            {/* Local Offline JSON Backup Fallback */}
            <div style={{ marginTop: '6px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Offline JSON Backup
              </div>
              {backupStatus && (
                <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--navy-primary)', textAlign: 'center', marginBottom: '6px' }}>
                  {backupStatus}
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn-outline-navy"
                  onClick={handleExportBackup}
                  disabled={backupLoading}
                  style={{ flex: 1, padding: '8px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                >
                  <Download size={13} /> Export File
                </button>

                <label
                  className="btn-outline-navy"
                  style={{ flex: 1, padding: '8px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', cursor: 'pointer', textAlign: 'center' }}
                >
                  <Upload size={13} /> Import File
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

          {/* Logout */}
          <div style={{ padding: '14px 0 6px 0' }}>
            <button
              onClick={() => setShowLogoutModal(true)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                border: '1.5px solid #FEE2E2',
                backgroundColor: '#FEF2F2',
                color: '#DC2626',
                fontSize: '14px',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <LogOut size={16} /> {t('logout') || 'Log Out'}
            </button>
          </div>
        </div>
      </div>

      {/* CLOUD RESTORE MODAL */}
      {showRestoreModal && (
        <div className="sheet-backdrop" onClick={() => setShowRestoreModal(false)} style={{ zIndex: 100000 }}>
          <div className="sheet-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <DownloadCloud size={20} color="#4F46E5" />
                <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#1E293B', margin: 0 }}>
                  {t('availableBackups')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRestoreModal(false)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {fetchBackupsLoading ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: '#64748B', fontSize: '14px', fontWeight: '600' }}>
                <RefreshCw size={24} className="spin" style={{ margin: '0 auto 10px', display: 'block' }} />
                Fetching cloud backups from Google Drive...
              </div>
            ) : driveBackups.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 20px', color: '#64748B' }}>
                <Cloud size={36} color="#94A3B8" style={{ margin: '0 auto 10px' }} />
                <p style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>
                  No Google Drive backups found for Cashly yet.
                </p>
                <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#94A3B8' }}>
                  Tap "Backup Now" to create your first cloud snapshot.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '320px', overflowY: 'auto' }}>
                <p style={{ fontSize: '13px', fontWeight: '600', color: '#475569', margin: '0 0 4px 0' }}>
                  {t('selectBackupToRestore')}
                </p>
                {driveBackups.map((file) => (
                  <div
                    key={file.id}
                    onClick={() => {
                      setSelectedBackupFile(file);
                      setShowConfirmRestore(true);
                    }}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: '1.5px solid #E2E8F0',
                      background: '#F8FAFC',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: '#1E293B' }}>
                        {formatLastBackupDate(file.createdTime || file.modifiedTime)}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                        Size: {file.size ? `${(Number(file.size) / 1024).toFixed(1)} KB` : 'Cloud Backup'}
                      </div>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#4F46E5' }}>
                      Select →
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONFIRM RESTORE MODAL */}
      {showConfirmRestore && selectedBackupFile && (
        <div className="sheet-backdrop" onClick={() => setShowConfirmRestore(false)} style={{ zIndex: 100001 }}>
          <div className="sheet-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', textAlign: 'center', padding: '24px 20px' }}>
            <AlertTriangle size={44} color="#D97706" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1E293B', margin: 0 }}>
              {t('restoreConfirmTitle')}
            </h3>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '8px 0 18px 0', lineHeight: '1.5' }}>
              {t('restoreConfirmDesc')}
            </p>
            <div style={{ background: '#F1F5F9', padding: '10px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '18px' }}>
              Backup: {formatLastBackupDate(selectedBackupFile.createdTime || selectedBackupFile.modifiedTime)}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowConfirmRestore(false)}
                disabled={restoringLoading}
                style={{ flex: 1, padding: '12px', background: '#F1F5F9', color: '#334155', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={restoringLoading}
                style={{ flex: 1, padding: '12px', background: '#4F46E5', color: '#FFFFFF', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}
              >
                {restoringLoading ? t('restoring') : 'Confirm Restore'}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Change Password Modal */}
      {showPasswordModal && (
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
              {t('changePassword') || 'Change Password'}
            </h3>

            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                  {t('oldPassword') || 'Old Password'}
                </label>
                <input
                  type="password"
                  className="input-control"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                  {t('newPassword') || 'New Password'}
                </label>
                <input
                  type="password"
                  className="input-control"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              {passwordMsg && (
                <div style={{
                  fontSize: '13px',
                  fontWeight: '700',
                  color: passwordMsg.includes('successfully') || passwordMsg.includes('வெற்றிகரமாக') ? 'var(--green-income)' : 'var(--red-expense)',
                  textAlign: 'center'
                }}>
                  {passwordMsg}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  className="btn-outline-navy"
                  style={{ flex: 1 }}
                  onClick={() => setShowPasswordModal(false)}
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="btn-primary-navy"
                  style={{ flex: 1 }}
                  disabled={passwordLoading || !oldPassword || !newPassword}
                >
                  {passwordLoading ? 'Saving...' : (t('saveChanges') || 'Save')}
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
              {t('logout') || 'Log Out'}
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              Are you sure you want to log out?
            </p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button className="btn-outline-navy" style={{ flex: 1 }} onClick={() => setShowLogoutModal(false)}>
                {t('cancel')}
              </button>
              <button
                style={{ flex: 1, padding: '12px', backgroundColor: 'var(--red-expense)', color: '#FFF', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}
                onClick={() => {
                  setShowLogoutModal(false);
                  onLogout();
                }}
              >
                {t('logout') || 'Log Out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
