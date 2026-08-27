import React, { useState } from 'react';
import { Wallet, Eye, EyeOff } from 'lucide-react';
import { authAPI } from '../services/api';

export default function LoginScreen({ onLoginSuccess, onNavigateToRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Please enter your email/mobile and password');
      return;
    }

    setLoading(true);
    try {
      const data = await authAPI.login(email, password);
      localStorage.setItem('money_tracker_token', data.token);
      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen-container no-nav" style={{ justifyContent: 'center', minHeight: '100%', gap: '28px' }}>
      {/* Brand Header */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '12px' }}>
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '20px',
          backgroundColor: 'var(--navy-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFF',
          boxShadow: '0 8px 20px rgba(22, 36, 123, 0.25)'
        }}>
          <Wallet size={36} />
        </div>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', color: 'var(--navy-primary)', letterSpacing: '-0.3px' }}>
            Money Tracker
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Simple daily money tracking
          </p>
        </div>
      </div>

      {/* Form Card */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
          <label className="input-label">Email or Mobile</label>
          <input
            type="text"
            className="input-control"
            placeholder="Enter your email or mobile"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="input-group">
          <label className="input-label">Password</label>
          <div className="input-field-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              className="input-control has-suffix"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <div className="input-icon-suffix" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => alert('Please use your registered email/mobile to login or create a new account.')}
            style={{ border: 'none', background: 'none', color: 'var(--navy-primary)', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
          >
            Forgot password?
          </button>
        </div>

        <button type="submit" className="btn-primary-navy" disabled={loading} style={{ marginTop: '8px' }}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      {/* Footer Link */}
      <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
        Don't have an account?{' '}
        <span
          onClick={onNavigateToRegister}
          style={{ color: 'var(--navy-primary)', fontWeight: '700', cursor: 'pointer', textDecoration: 'none' }}
        >
          Create account
        </span>
      </div>
    </div>
  );
}
