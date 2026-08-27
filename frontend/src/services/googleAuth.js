import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Browser } from '@capacitor/browser';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '760935628306-adaehnvi7ktav0u2hsq0kr0mt4fheife.apps.googleusercontent.com';

let isPluginInitialized = false;

export async function initGoogleAuth() {
  if (Capacitor.isNativePlatform() && !isPluginInitialized) {
    try {
      await GoogleAuth.initialize({
        clientId: CLIENT_ID,
        scopes: ['profile', 'email'],
        grantOfflineAccess: false,
      });
      isPluginInitialized = true;
    } catch (e) {
      console.warn('GoogleAuth native initialization warning:', e);
    }
  }
}

export async function signInWithGoogle() {
  await initGoogleAuth();

  // 1. Android / Capacitor Native Flow
  if (Capacitor.isNativePlatform()) {
    try {
      const googleUser = await GoogleAuth.signIn();
      const idToken = googleUser?.authentication?.idToken || googleUser?.idToken;
      
      if (!idToken) {
        throw new Error('Google Sign-In did not return a valid ID token.');
      }
      
      return {
        credential: idToken,
        email: googleUser.email,
        fullName: googleUser.name || `${googleUser.givenName || ''} ${googleUser.familyName || ''}`.trim()
      };
    } catch (err) {
      console.error('Native Google Sign-In error:', err);
      if (err?.message?.includes('popup_closed') || err?.message?.includes('12501') || err?.code === '12501') {
        throw new Error('Sign-in cancelled.');
      }
      throw new Error(err?.message || 'Native Google Sign-In failed.');
    }
  }

  // 2. Web Browser Flow
  if (window.google?.accounts?.id) {
    return new Promise((resolve, reject) => {
      try {
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (response) => {
            if (response && response.credential) {
              resolve({ credential: response.credential });
            } else {
              reject(new Error('No credential received from Google Identity Services.'));
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true
        });

        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            triggerDirectWebGoogleOAuth();
          }
        });
      } catch (err) {
        console.error('Web GIS error:', err);
        triggerDirectWebGoogleOAuth();
      }
    });
  }

  // Fallback direct OAuth web redirect if GIS script is missing
  triggerDirectWebGoogleOAuth();
}

function triggerDirectWebGoogleOAuth() {
  const redirectUri = window.location.origin;
  const scope = 'openid profile email';
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(CLIENT_ID)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token%20id_token&scope=${encodeURIComponent(scope)}&nonce=moneytracker_${Date.now()}`;
  
  if (Capacitor.isNativePlatform()) {
    Browser.open({ url: authUrl });
  } else {
    window.location.href = authUrl;
  }
}
