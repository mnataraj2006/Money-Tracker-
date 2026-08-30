import React from 'react';
import { Wallet } from 'lucide-react';

export default function SplashScreen() {
  return (
    <div className="cashly-splash-screen" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#F8FAFC',
      backgroundImage: 'radial-gradient(rgba(22, 36, 123, 0.03) 1.5px, transparent 1.5px)',
      backgroundSize: '24px 24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '24px 20px',
      userSelect: 'none',
      fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>
      {/* Centered Brand Content */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        maxWidth: '320px',
        width: '100%',
        animation: 'splashFadeIn 0.3s ease-out'
      }}>
        {/* Logo Badge */}
        <div style={{
          width: '92px',
          height: '92px',
          borderRadius: '28px',
          backgroundColor: '#16247B',
          background: 'linear-gradient(135deg, #1E3A8A 0%, #16247B 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFFFFF',
          boxShadow: '0 16px 36px rgba(22, 36, 123, 0.22), 0 4px 12px rgba(22, 36, 123, 0.12)',
          marginBottom: '22px'
        }}>
          <Wallet size={48} strokeWidth={2.2} />
        </div>

        {/* App Title */}
        <h1 style={{
          fontSize: '34px',
          fontWeight: '800',
          color: '#0F172A',
          letterSpacing: '-0.6px',
          margin: '0 0 8px 0',
          lineHeight: 1.15
        }}>
          Cashly
        </h1>

        {/* Tagline */}
        <p style={{
          fontSize: '15px',
          fontWeight: '500',
          color: '#64748B',
          margin: '0 0 36px 0',
          letterSpacing: '-0.1px'
        }}>
          Your money, simply managed.
        </p>

        {/* Subtle Animated Loading Dots */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#16247B',
            opacity: 0.8,
            animation: 'splashPulse 1.2s infinite ease-in-out',
            animationDelay: '0s'
          }} />
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#16247B',
            opacity: 0.8,
            animation: 'splashPulse 1.2s infinite ease-in-out',
            animationDelay: '0.2s'
          }} />
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#16247B',
            opacity: 0.8,
            animation: 'splashPulse 1.2s infinite ease-in-out',
            animationDelay: '0.4s'
          }} />
        </div>
      </div>

      <style>{`
        @keyframes splashFadeIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes splashPulse {
          0%, 80%, 100% { transform: scale(0.65); opacity: 0.3; }
          40% { transform: scale(1.15); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
