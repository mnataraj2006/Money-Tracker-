import React, { useState } from 'react';
import { User, Mail, Lock, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { authAPI } from '../services/api';

export default function RegisterScreen({ onRegisterSuccess, onNavigateToLogin }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim() || !email.trim() || !password) {
      setError('Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!agreeTerms) {
      setError('Please accept the Terms of Service');
      return;
    }

    setLoading(true);
    try {
      const data = await authAPI.register(fullName, email, password);
      localStorage.setItem('money_tracker_token', data.token);
      onRegisterSuccess(data.user);
    } catch (err) {
      setError(err.message || 'Registration failed. Try a different email.');
    } finally {
      setLoading(false);
    }
  };

  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');

  const handleGoogleSignInClick = () => {
    setShowGoogleModal(true);
  };

  const handleSelectGoogleAccount = async (selectedEmail, selectedName) => {
    setShowGoogleModal(false);
    setError('');
    setLoading(true);
    try {
      const data = await authAPI.googleLogin({
        email: selectedEmail,
        fullName: selectedName
      });
      localStorage.setItem('money_tracker_token', data.token);
      onRegisterSuccess(data.user);
    } catch (err) {
      setError(err.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen-container no-nav" style={{ gap: '20px', padding: '24px 16px' }}>
      {/* Title Header */}
      <div style={{ textAlign: 'center', marginTop: '12px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '800', color: 'var(--navy-primary)' }}>
          Create Account
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Join Money Tracker for practical financial management.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {error && (
          <div style={{
            padding: '12px',
            backgroundColor: 'var(--badge-short-bg)',
            color: 'var(--badge-short-text)',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: '600'
          }}>
            {error}
          </div>
        )}

        <div className="input-group">
          <label className="input-label">Full Name</label>
          <div className="input-field-wrapper">
            <User className="input-icon-prefix" size={18} />
            <input
              type="text"
              className="input-control has-prefix"
              placeholder="Jane Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="input-group">
          <label className="input-label">Email or Mobile</label>
          <div className="input-field-wrapper">
            <Mail className="input-icon-prefix" size={18} />
            <input
              type="text"
              className="input-control has-prefix"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="input-group">
          <label className="input-label">Password</label>
          <div className="input-field-wrapper">
            <Lock className="input-icon-prefix" size={18} />
            <input
              type={showPassword ? 'text' : 'password'}
              className="input-control has-prefix has-suffix"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <div className="input-icon-suffix" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </div>
          </div>
        </div>

        <div className="input-group">
          <label className="input-label">Confirm Password</label>
          <div className="input-field-wrapper">
            <RotateCcw className="input-icon-prefix" size={18} />
            <input
              type={showPassword ? 'text' : 'password'}
              className="input-control has-prefix"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginTop: '4px' }}>
          <input
            type="checkbox"
            id="terms"
            checked={agreeTerms}
            onChange={(e) => setAgreeTerms(e.target.checked)}
            style={{ marginTop: '3px', accentColor: 'var(--navy-primary)' }}
          />
          <label htmlFor="terms" style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
            I agree to the <span style={{ color: 'var(--navy-primary)', fontWeight: '600' }}>Terms of Service</span> and{' '}
            <span style={{ color: 'var(--navy-primary)', fontWeight: '600' }}>Privacy Policy</span>.
          </label>
        </div>

        <button type="submit" className="btn-primary-navy" disabled={loading} style={{ marginTop: '8px' }}>
          {loading ? 'Creating account...' : 'Create Account'}
        </button>

        {/* Google Auth Divider & Button */}
        <div style={{ display: 'flex', alignItems: 'center', margin: '4px 0', color: 'var(--text-muted)', fontSize: '12px' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }} />
          <span style={{ padding: '0 10px', fontWeight: '600' }}>OR</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }} />
        </div>

        <button
          type="button"
          onClick={handleGoogleSignInClick}
          disabled={loading}
          style={{
            width: '100%',
            height: '46px',
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            fontSize: '14px',
            fontWeight: '700',
            color: 'var(--text-main)',
            cursor: 'pointer',
            boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          Continue with Google
        </button>
      </form>

      {/* Google Account Chooser Modal */}
      {showGoogleModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          zIndex: 999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="stitch-card" style={{ width: '100%', maxWidth: '360px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--navy-primary)' }}>Sign in with Google</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Choose an account to continue to Money Tracker</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                onClick={() => handleSelectGoogleAccount('manoharan@gmail.com', 'Manoharan')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: '#FFFFFF',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--navy-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '15px' }}>M</div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' }}>Manoharan</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>manoharan@gmail.com</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectGoogleAccount('father@gmail.com', 'Father')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: '#FFFFFF',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#059669', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '15px' }}>F</div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' }}>Father</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>father@gmail.com</div>
                </div>
              </button>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Or enter another Google Email:</label>
              <input
                type="email"
                className="input-control"
                placeholder="your.email@gmail.com"
                value={customGoogleEmail}
                onChange={(e) => setCustomGoogleEmail(e.target.value)}
              />
              <button
                type="button"
                className="btn-primary-navy"
                onClick={() => handleSelectGoogleAccount(customGoogleEmail.trim(), customGoogleEmail.split('@')[0])}
                disabled={!customGoogleEmail.trim()}
              >
                Sign in with {customGoogleEmail.trim() || 'this email'}
              </button>
              <button type="button" className="btn-outline-navy" onClick={() => setShowGoogleModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px' }}>
        Already have an account?{' '}
        <span
          onClick={onNavigateToLogin}
          style={{ color: 'var(--navy-primary)', fontWeight: '700', cursor: 'pointer' }}
        >
          Login
        </span>
      </div>
    </div>
  );
}
