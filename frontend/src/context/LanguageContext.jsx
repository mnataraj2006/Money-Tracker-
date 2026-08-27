import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../utils/translations';
import { settingsAPI } from '../services/api';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('money_tracker_language') || 'en';
  });

  useEffect(() => {
    // Sync language from backend settings if available
    async function fetchLanguageSetting() {
      const token = localStorage.getItem('money_tracker_token');
      if (!token) return;
      try {
        const res = await settingsAPI.get();
        if (res.language && res.language !== language) {
          setLanguage(res.language);
          localStorage.setItem('money_tracker_language', res.language);
        }
      } catch (e) {
        // Silently catch error if not authenticated or offline
      }
    }
    fetchLanguageSetting();
  }, []);

  const changeLanguage = async (newLang) => {
    setLanguage(newLang);
    localStorage.setItem('money_tracker_language', newLang);
    const token = localStorage.getItem('money_tracker_token');
    if (token) {
      try {
        await settingsAPI.update({ language: newLang });
      } catch (e) {
        console.error('Failed to persist language setting to server:', e);
      }
    }
  };

  const t = (key) => {
    const langDict = translations[language] || translations.en;
    return langDict[key] || translations.en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
