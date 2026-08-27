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
      </form>

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
