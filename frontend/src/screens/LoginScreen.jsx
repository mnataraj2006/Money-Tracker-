import React, { useState, useEffect, useRef } from 'react';
import { Wallet, RefreshCw, ShieldCheck } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { authAPI } from '../services/api';
import { signInWithGoogle, initGoogleAuth } from '../services/googleAuth';

export default function LoginScreen({ onLoginSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [gisLoaded, setGisLoaded] = useState(false);
  const googleBtnRef = useRef(null);

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '760935628306-adaehnvi7ktav0u2hsq0kr0mt4fheife.apps.googleusercontent.com';

  useEffect(() => {
    initGoogleAuth();

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

    // 2. On Web, attempt to render Google Identity Services button if available
    if (!Capacitor.isNativePlatform()) {
      const initGoogleGIS = () => {
        if (window.google?.accounts?.id && googleBtnRef.current) {
          try {
            googleBtnRef.current.innerHTML = '';
            window.google.accounts.id.initialize({
              client_id: clientId,
              callback: handleGoogleCredentialResponse,
              auto_select: false,
              cancel_on_tap_outside: true
            });

            window.google.accounts.id.renderButton(googleBtnRef.current, {
              type: 'standard',
              theme: 'outline',
              size: 'large',
              text: 'continue_with',
              shape: 'rectangular',
              logo_alignment: 'left',
              width: 320
            });

            if (googleBtnRef.current.children.length > 0) {
              setGisLoaded(true);
            }
          } catch (e) {
            console.error('Google GIS initialization error:', e);
          }
        }
      };

      initGoogleGIS();
      const timer = setTimeout(initGoogleGIS, 600);
      return () => clearTimeout(timer);
    }
  }, [clientId]);

  const handleGoogleCredentialResponse = async (googleRes) => {
    if (!googleRes || !googleRes.credential) return;
    setError('');
    setLoading(true);
    try {
      const data = await authAPI.googleLogin({
        credential: googleRes.credential,
        email: googleRes.email,
        fullName: googleRes.fullName
      });
      localStorage.setItem('money_tracker_token', data.token);
      onLoginSuccess(data.user);
    } catch (err) {
      console.error('Google Auth Error:', err);
      setError(err?.message || 'Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignInClick = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await signInWithGoogle();
      if (res && res.credential) {
        await handleGoogleCredentialResponse(res);
      }
    } catch (err) {
      console.error('Sign-in error:', err);
      if (err?.message !== 'Sign-in cancelled.') {
        setError(err?.message || 'Unable to sign in with Google.');
      }
    } finally {
      setLoading(false);
    }
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
            onClick={handleGoogleSignInClick}
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
            {/* GIS container for web */}
            {!Capacitor.isNativePlatform() && (
              <div ref={googleBtnRef} style={{ width: '100%', minHeight: gisLoaded ? '50px' : '0px', display: gisLoaded ? 'flex' : 'none', justifyContent: 'center' }} />
            )}

            {/* Always visible Google button for Android or Web fallback */}
            {(Capacitor.isNativePlatform() || !gisLoaded) && (
              <button
                onClick={handleGoogleSignInClick}
                type="button"
                style={{
                  width: '100%',
                  maxWidth: '320px',
                  height: '50px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #747775',
                  borderRadius: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                  padding: '0 16px',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.08)',
                  transition: 'background-color 0.2s, box-shadow 0.2s',
                  outline: 'none'
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" style={{ display: 'block', flexShrink: 0 }}>
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span style={{ fontSize: '15px', fontWeight: '600', color: '#1F1F1F', fontFamily: 'inherit' }}>
                  Continue with Google
                </span>
              </button>
            )}
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

