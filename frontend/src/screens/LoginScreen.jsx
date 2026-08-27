import React, { useState, useEffect, useRef } from 'react';
import { Wallet, RefreshCw, ShieldCheck } from 'lucide-react';
import { authAPI } from '../services/api';

export default function LoginScreen({ onLoginSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const googleBtnRef = useRef(null);

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '760935628306-adaehnvi7ktav0u2hsq0kr0mt4fheife.apps.googleusercontent.com';

  useEffect(() => {
    // 1. Check if returning from Google OAuth redirect with id_token
    const hash = window.location.hash;
    if (hash && (hash.includes('id_token=') || hash.includes('access_token='))) {
      const params = new URLSearchParams(hash.replace('#', '?'));
      const idToken = params.get('id_token');
      if (idToken) {
        window.history.replaceState(null, null, window.location.pathname);
        handleGoogleCredentialResponse({ credential: idToken });
        return;
      }
    }

    // 2. Initialize Google Identity Services
    const initGoogleGIS = () => {
      if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleGoogleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true
          });

          if (googleBtnRef.current) {
            googleBtnRef.current.innerHTML = '';
            window.google.accounts.id.renderButton(googleBtnRef.current, {
              type: 'standard',
              theme: 'outline',
              size: 'large',
              text: 'continue_with',
              shape: 'rectangular',
              logo_alignment: 'left',
              width: 320
            });
          }
        } catch (e) {
          console.error('Google GIS initialization error:', e);
        }
      }
    };

    initGoogleGIS();
    const timer = setTimeout(initGoogleGIS, 800);
    return () => clearTimeout(timer);
  }, [clientId]);

  const handleGoogleCredentialResponse = async (response) => {
    if (!response || !response.credential) return;
    setError('');
    setLoading(true);
    try {
      const data = await authAPI.googleLogin({ credential: response.credential });
      localStorage.setItem('money_tracker_token', data.token);
      onLoginSuccess(data.user);
    } catch (err) {
      console.error('Google Auth Error:', err);
      setError('Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleOAuthRedirect = () => {
    setError('');
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // Fallback to standard Google OAuth popup/redirect
          triggerDirectGoogleOAuth();
        }
      });
    } else {
      triggerDirectGoogleOAuth();
    }
  };

  const triggerDirectGoogleOAuth = () => {
    const redirectUri = window.location.origin;
    const scope = 'openid profile email';
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token%20id_token&scope=${encodeURIComponent(scope)}&nonce=moneytracker_${Date.now()}`;
    window.location.href = authUrl;
  };

  return (
    <div className="screen-container no-nav" style={{ justifyContent: 'center', minHeight: '100%', gap: '32px', padding: '32px 20px', alignItems: 'center' }}>
      {/* 1. App Header & Logo */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '14px' }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '24px',
          backgroundColor: 'var(--navy-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFF',
          boxShadow: '0 10px 25px rgba(22, 36, 123, 0.25)'
        }}>
          <Wallet size={42} />
        </div>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--navy-primary)', letterSpacing: '-0.4px' }}>
            Money Tracker
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary)', marginTop: '6px', fontWeight: '500' }}>
            Simple daily money tracking
          </p>
        </div>
      </div>

      {/* Error State Banner */}
      {error && (
        <div style={{
          width: '100%',
          maxWidth: '340px',
          padding: '14px 16px',
          backgroundColor: '#FEE2E2',
          border: '1px solid #FCA5A5',
          color: '#991B1B',
          borderRadius: '14px',
          fontSize: '14px',
          fontWeight: '600',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          textAlign: 'center'
        }}>
          <span>{error}</span>
          <button
            onClick={handleGoogleOAuthRedirect}
            style={{
              padding: '6px 14px',
              backgroundColor: '#991B1B',
              color: '#FFF',
              border: 'none',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Try Again
          </button>
        </div>
      )}

      {/* 2. Official Google OAuth Button Container */}
      <div style={{ width: '100%', maxWidth: '340px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--navy-primary)', fontWeight: '700', fontSize: '16px', height: '52px' }}>
            <RefreshCw className="animate-spin" size={24} />
            <span>Signing in...</span>
          </div>
        ) : (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            {/* Google Identity Services native rendered button */}
            <div ref={googleBtnRef} style={{ width: '100%', minHeight: '50px', display: 'flex', justifyContent: 'center' }} />
          </div>
        )}

        {/* Subtext */}
        <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>
          Sign in securely with your Google account.
        </div>
      </div>

      {/* 3. Security Footnote */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)', marginTop: '20px' }}>
        <ShieldCheck size={16} color="var(--green-income)" />
        <span>Your account is secured with Google.</span>
      </div>
    </div>
  );
}
