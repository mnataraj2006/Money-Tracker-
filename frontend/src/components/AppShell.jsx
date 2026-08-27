import React from 'react';
import AppHeader from './AppHeader';
import BottomNav from './BottomNav';

export default function AppShell({ user, onNavigate, activeTab, onTabChange, headerSubtitle, showNav = true, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', position: 'relative', overflow: 'hidden' }}>
      {/* 1. Shared Fixed Header */}
      <AppHeader user={user} onNavigate={onNavigate} subtitle={headerSubtitle} />

      {/* 2. Scrollable Content Area */}
      <div className="main-content-scroll">
        {children}
      </div>

      {/* 3. Shared Fixed Bottom Navigation */}
      {showNav && <BottomNav activeTab={activeTab} onTabChange={onTabChange} />}
    </div>
  );
}
