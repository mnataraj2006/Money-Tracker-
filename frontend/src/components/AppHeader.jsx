import React from 'react';
import { Bell } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function AppHeader({ user, onNavigate, subtitle }) {
  const { t } = useLanguage();

  const initial = user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'M';

  return (
    <header className="app-header">
      <div className="app-header-left">
        <div
          className="app-avatar-circle"
          onClick={() => onNavigate && onNavigate('settings')}
          style={{ cursor: 'pointer' }}
          title={user?.fullName || 'Profile'}
        >
          {user?.profileImage ? (
            <img src={user.profileImage} alt="User Avatar" className="app-avatar-img" />
          ) : (
            <span>{initial}</span>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="app-title-text">{t('appTitle') || 'Money Tracker'}</span>
          {subtitle && (
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', marginTop: '-2px' }}>
              {subtitle}
            </span>
          )}
        </div>
      </div>

      <div
        className="app-header-icon"
        onClick={() => onNavigate && onNavigate('settings')}
        title="Notifications"
      >
        <Bell size={18} />
      </div>
    </header>
  );
}
