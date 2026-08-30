import React from 'react';
import { Home, Receipt, Landmark, History, Settings } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function BottomNav({ activeTab, onTabChange }) {
  const { t } = useLanguage();

  const tabs = [
    { id: 'home', labelKey: 'home', icon: Home },
    { id: 'transactions', labelKey: 'transactions', icon: Receipt },
    { id: 'banks', labelKey: 'banks', icon: Landmark },
    { id: 'history', labelKey: 'history', icon: History },
    { id: 'settings', labelKey: 'settings', icon: Settings },
  ];

  return (
    <nav className="bottom-nav">
      {tabs.map((tab) => {
        const IconComponent = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            className={`nav-item ${isActive ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
            type="button"
          >
            <div className="nav-icon-box">
              <IconComponent size={20} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span>{t(tab.labelKey)}</span>
          </button>
        );
      })}
    </nav>
  );
}
