/**
 * Google Drive Cloud Backup Service for Cashly
 * Interacts with the private Google Drive appDataFolder (least-privileged scope)
 * to store and restore encrypted financial snapshots seamlessly.
 */

import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '760935628306-adaehnvi7ktav0u2hsq0kr0mt4fheife.apps.googleusercontent.com';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';

const STORAGE_KEY_TOKEN = 'cashly_drive_access_token';
const STORAGE_KEY_EXPIRES = 'cashly_drive_token_expires';
const STORAGE_KEY_EMAIL = 'cashly_drive_connected_email';

class GoogleDriveService {
  constructor() {
    this.accessToken = null;
    this.tokenExpiresAt = 0;
    this.connectedEmail = null;
    this._loadFromStorage();
  }

  _loadFromStorage() {
    try {
      const storedToken = localStorage.getItem(STORAGE_KEY_TOKEN);
      const storedExpires = Number(localStorage.getItem(STORAGE_KEY_EXPIRES)) || 0;
      const storedEmail = localStorage.getItem(STORAGE_KEY_EMAIL);

      if (storedToken && storedExpires > Date.now()) {
        this.accessToken = storedToken;
        this.tokenExpiresAt = storedExpires;
      }
      if (storedEmail) {
        this.connectedEmail = storedEmail;
      }
    } catch (e) {
      console.warn('Failed to load Google Drive token from storage:', e);
    }
  }

  _saveToStorage(token, expiresInSec = 3600, email = '') {
    this.accessToken = token;
    // Buffer expiration by 2 minutes to prevent edge-case 401s
    const expirationMs = Date.now() + Math.max(300, expiresInSec - 120) * 1000;
    this.tokenExpiresAt = expirationMs;

    try {
      localStorage.setItem(STORAGE_KEY_TOKEN, token);
      localStorage.setItem(STORAGE_KEY_EXPIRES, String(expirationMs));
      if (email) {
        this.connectedEmail = email;
        localStorage.setItem(STORAGE_KEY_EMAIL, email);
      }
    } catch (e) {
      console.warn('Failed to save Google Drive token to storage:', e);
    }
  }

  /**
   * Check whether Google Drive is connected
   */
  isConnected() {
    const hasEmail = Boolean(this.connectedEmail || localStorage.getItem(STORAGE_KEY_EMAIL));
    const hasToken = Boolean(this.accessToken || localStorage.getItem(STORAGE_KEY_TOKEN));
    return hasEmail || hasToken;
  }

  /**
   * Get connected Google Drive email if available
   */
  getConnectedAccount() {
    return this.connectedEmail || localStorage.getItem(STORAGE_KEY_EMAIL) || '';
  }

  /**
   * Sync in-memory state with backend account-level status
   */
  syncWithBackendStatus(status) {
    if (status?.connected) {
      if (status.googleEmail) {
        this.connectedEmail = status.googleEmail;
        localStorage.setItem(STORAGE_KEY_EMAIL, status.googleEmail);
      }
    } else if (status && status.connected === false) {
      this.connectedEmail = null;
      try {
        localStorage.removeItem(STORAGE_KEY_EMAIL);
      } catch (e) {}
    }
  }

  /**
   * Disconnect Google Drive and clear local tokens
   */
  disconnect() {
    this.accessToken = null;
    this.tokenExpiresAt = 0;
    this.connectedEmail = null;
    try {
      localStorage.removeItem(STORAGE_KEY_TOKEN);
      localStorage.removeItem(STORAGE_KEY_EXPIRES);
      localStorage.removeItem(STORAGE_KEY_EMAIL);
    } catch (e) {}
  }

  /**
   * Request a fresh OAuth token
   * @param {boolean} interactive - whether to show Google prompt / popup
   * @param {string} hintEmail - account email hint
   */
  async requestFreshToken(interactive = true, hintEmail = '') {
    const emailHint = hintEmail || this.getConnectedAccount();

    // 1. Native Capacitor / Android Flow
    if (Capacitor.isNativePlatform()) {
      try {
        const user = await GoogleAuth.signIn();
        const token = user?.authentication?.accessToken || user?.accessToken;
        const email = user?.email || emailHint;
        if (token) {
          this._saveToStorage(token, 3600, email);
          return token;
        }
        throw new Error('No access token returned from native Google Sign-In');
      } catch (err) {
        console.warn('Native Google Drive token error:', err);
        throw new Error(err?.message || 'Failed to authenticate with Google Drive on Android.');
      }
    }

    // 2. Web Browser Google Identity Services (GIS) Token Client Flow
    if (window.google?.accounts?.oauth2) {
      return new Promise((resolve, reject) => {
        try {
          const tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: DRIVE_SCOPE,
            hint: emailHint || undefined,
            callback: (tokenResponse) => {
              if (tokenResponse && tokenResponse.access_token) {
                const expiresIn = Number(tokenResponse.expires_in) || 3600;
                this._saveToStorage(tokenResponse.access_token, expiresIn, emailHint);
                resolve(tokenResponse.access_token);
              } else if (tokenResponse?.error) {
                const isSilentFail = tokenResponse.error === 'interaction_required' || tokenResponse.error === 'user_logged_out';
                const err = new Error(tokenResponse.error_description || tokenResponse.error);
                err.code = isSilentFail ? 'INTERACTION_REQUIRED' : tokenResponse.error;
                reject(err);
              } else {
                reject(new Error('Google Drive authorization was denied or closed.'));
              }
            },
            error_callback: (err) => {
              console.error('GIS token client error callback:', err);
              reject(new Error(err?.message || 'Google Drive authorization failed.'));
            }
          });

          tokenClient.requestAccessToken({
            prompt: interactive ? 'consent' : 'none',
            hint: emailHint || undefined
          });
        } catch (e) {
          console.error('Failed to initialize GIS Token Client:', e);
          reject(e);
        }
      });
    }

    throw new Error('Google Drive authorization service is unavailable.');
  }

  /**
   * Ensure a valid access token exists.
   * If cached & valid: returns token immediately (NO POPUP).
   * If expired: attempts silent refresh.
   * If silent refresh fails & interactive is allowed: triggers interactive flow.
   * Otherwise throws GOOGLE_DRIVE_REAUTH_REQUIRED.
   */
  async ensureValidToken(interactive = false, hintEmail = '') {
    // 1. Cached token is still valid
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    // Check storage again in case of multiple tabs
    this._loadFromStorage();
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    // 2. Attempt silent refresh without disturbing the user
    try {
      const silentToken = await this.requestFreshToken(false, hintEmail);
      if (silentToken) return silentToken;
    } catch (silentErr) {
      console.warn('Silent token refresh could not complete:', silentErr.message);
    }

    // 3. If interactive is explicitly allowed by caller (e.g. user clicked "Connect")
    if (interactive) {
      return await this.requestFreshToken(true, hintEmail);
    }

    const reauthErr = new Error('Google Drive authorization expired or not connected.');
    reauthErr.code = 'GOOGLE_DRIVE_REAUTH_REQUIRED';
    throw reauthErr;
  }

  /**
   * Upload a full backup snapshot to Google Drive appDataFolder
   */
  async uploadBackup(backupPayload, explicitToken = null) {
    let token = explicitToken;
    if (!token) {
      token = await this.ensureValidToken(false);
    }

    const now = new Date();
    const dateStr = now.toISOString().replace(/[:.]/g, '-');
    const fileName = `cashly_backup_${dateStr}.json`;

    const fileContent = JSON.stringify(backupPayload, null, 2);
    const metadata = {
      name: fileName,
      parents: ['appDataFolder'],
      mimeType: 'application/json',
      description: `Cashly Cloud Backup (${now.toLocaleString()})`
    };

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      fileContent +
      closeDelimiter;

    let response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartRequestBody
    });

    // Handle token expiration during active session
    if (response.status === 401) {
      console.warn('Drive upload returned 401; attempting silent refresh...');
      token = await this.ensureValidToken(false);
      response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: multipartRequestBody
      });
    }

    if (!response.ok) {
      const errText = await response.text();
      console.error('Drive upload failed:', response.status, errText);
      throw new Error('Failed to upload backup to Google Drive.');
    }

    const fileData = await response.json();

    // Auto-clean older backups, keeping the last 5
    try {
      await this.cleanOldBackups(5, token);
    } catch (e) {
      console.warn('Old backup cleanup warning:', e);
    }

    return {
      success: true,
      fileId: fileData.id,
      fileName,
      timestamp: now.toISOString()
    };
  }

  /**
   * List available backups from Google Drive
   */
  async listBackups(explicitToken = null) {
    let token = explicitToken;
    if (!token) {
      token = await this.ensureValidToken(false);
    }

    const url = 'https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&fields=files(id,name,size,createdTime,modifiedTime,description)&orderBy=createdTime desc&pageSize=20';

    let res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (res.status === 401) {
      console.warn('Drive list returned 401; attempting silent refresh...');
      token = await this.ensureValidToken(false);
      res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
    }

    if (!res.ok) {
      throw new Error('Failed to fetch backup list from Google Drive.');
    }

    const data = await res.json();
    const files = data.files || [];
    return files.filter(f => f.name && f.name.startsWith('cashly_backup_'));
  }

  /**
   * Download a specific backup JSON from Google Drive
   */
  async downloadBackup(fileId, explicitToken = null) {
    let token = explicitToken;
    if (!token) {
      token = await this.ensureValidToken(false);
    }

    let res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (res.status === 401) {
      token = await this.ensureValidToken(false);
      res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    }

    if (!res.ok) {
      throw new Error('Failed to download backup file from Google Drive.');
    }

    const backupData = await res.json();
    return backupData;
  }

  /**
   * Keep only the latest N backups in Google Drive
   */
  async cleanOldBackups(keepCount = 5, explicitToken = null) {
    try {
      const files = await this.listBackups(explicitToken);
      if (files.length > keepCount) {
        const toDelete = files.slice(keepCount);
        const token = explicitToken || this.accessToken;
        if (!token) return;

        for (const file of toDelete) {
          try {
            await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` }
            });
          } catch (e) {}
        }
      }
    } catch (err) {
      console.warn('Error during backup rotation:', err);
    }
  }
}

export const googleDriveService = new GoogleDriveService();
