/**
 * Automatic Cloud Backup Scheduler for Cashly
 * Runs non-blocking background checks on application launch.
 */

import { settingsAPI } from './api';
import { googleDriveService } from './googleDriveService';

const KEY_FREQUENCY = 'cashly_cloud_backup_frequency'; // 'daily' | 'weekly' | 'manual'
const KEY_LAST_BACKUP = 'cashly_last_cloud_backup'; // ISO string

export function getBackupFrequency() {
  return localStorage.getItem(KEY_FREQUENCY) || 'weekly';
}

export function setBackupFrequency(freq) {
  localStorage.setItem(KEY_FREQUENCY, freq);
}

export function getLastBackupTime() {
  return localStorage.getItem(KEY_LAST_BACKUP) || null;
}

export function setLastBackupTime(isoString) {
  localStorage.setItem(KEY_LAST_BACKUP, isoString);
}

/**
 * Perform a cloud backup to Google Drive
 * @param {string|null} explicitToken - optional pre-authorized token
 */
export async function performCloudBackup(explicitToken = null) {
  try {
    const token = explicitToken || await googleDriveService.ensureValidToken(false);
    const backupData = await settingsAPI.exportBackup();
    const result = await googleDriveService.uploadBackup(backupData, token);
    const nowIso = new Date().toISOString();
    setLastBackupTime(nowIso);
    try {
      await settingsAPI.recordDriveBackup({ status: 'SUCCESS' });
    } catch (recordErr) {
      console.warn('Failed to sync backup timestamp to backend:', recordErr);
    }
    return { success: true, timestamp: nowIso, result };
  } catch (err) {
    console.error('Cloud backup error:', err);
    try {
      await settingsAPI.recordDriveBackup({ status: 'FAILED' });
    } catch (e) {}
    throw err;
  }
}

/**
 * Check if a scheduled backup is due and run it silently in the background
 */
export async function checkAndRunScheduledBackup() {
  try {
    // Only attempt background backups if Google Drive is already connected
    if (!googleDriveService.isConnected()) {
      return;
    }

    const frequency = getBackupFrequency();
    if (frequency === 'manual' || frequency === 'disabled') {
      return;
    }

    const lastBackupStr = getLastBackupTime();
    const now = Date.now();
    let isDue = false;

    if (!lastBackupStr) {
      isDue = true;
    } else {
      const lastTime = new Date(lastBackupStr).getTime();
      const diffMs = now - lastTime;

      if (frequency === 'daily' && diffMs >= 24 * 60 * 60 * 1000) {
        isDue = true;
      } else if (frequency === 'weekly' && diffMs >= 7 * 24 * 60 * 60 * 1000) {
        isDue = true;
      }
    }

    if (isDue) {
      console.log(`[BackupScheduler] Triggering scheduled ${frequency} cloud backup...`);
      performCloudBackup()
        .then(() => console.log('[BackupScheduler] Scheduled cloud backup finished successfully!'))
        .catch(err => {
          if (err?.code === 'GOOGLE_DRIVE_REAUTH_REQUIRED') {
            console.info('[BackupScheduler] Background backup skipped - Google Drive re-authentication required.');
          } else {
            console.warn('[BackupScheduler] Scheduled backup deferred:', err.message);
          }
        });
    }
  } catch (e) {
    console.warn('[BackupScheduler] Check failed:', e);
  }
}
