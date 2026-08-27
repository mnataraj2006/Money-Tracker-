import React, { useState, useEffect } from 'react';
import './styles/tokens.css';
import AppShell from './components/AppShell';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import AddIncomeScreen from './screens/AddIncomeScreen';
import AddExpenseScreen from './screens/AddExpenseScreen';
import TransactionsScreen from './screens/TransactionsScreen';
import TransactionDetailsScreen from './screens/TransactionDetailsScreen';
import CashAtHomeScreen from './screens/CashAtHomeScreen';
import CountCashScreen from './screens/CountCashScreen';
import ReconciliationScreen from './screens/ReconciliationScreen';
import CloseDayScreen from './screens/CloseDayScreen';
import HistoryScreen from './screens/HistoryScreen';
import MonthlySummaryScreen from './screens/MonthlySummaryScreen';
import SettingsScreen from './screens/SettingsScreen';
import DailyDetailsScreen from './screens/DailyDetailsScreen';
import { authAPI, settingsAPI } from './services/api';
import { LanguageProvider } from './context/LanguageContext';
import { DataProvider } from './context/DataContext';

function AppContent() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState('login');
  const [screenParams, setScreenParams] = useState({});
  const [activeTab, setActiveTab] = useState('home');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    let token = localStorage.getItem('money_tracker_token');
    
    if (token) {
      try {
        const data = await authAPI.getMe();
        setUser(data.user);
        setCurrentScreen('home');
        setActiveTab('home');
        setLoading(false);
        return;
      } catch (err) {
        localStorage.removeItem('money_tracker_token');
      }
    }

    setUser(null);
    setCurrentScreen('login');
    setLoading(false);
  };

  const checkAutomatedWeeklyBackup = async () => {
    try {
      const lastBackupStr = localStorage.getItem('money_tracker_last_weekly_backup');
      const now = new Date();
      let shouldBackup = true;

      if (lastBackupStr) {
        const lastDate = new Date(lastBackupStr);
        const diffDays = (now - lastDate) / (1000 * 60 * 60 * 24);
        if (diffDays < 7) {
          shouldBackup = false;
        }
      }

      if (shouldBackup) {
        const backupData = await settingsAPI.exportBackup();
        localStorage.setItem('money_tracker_weekly_backup_data', JSON.stringify(backupData));
        localStorage.setItem('money_tracker_last_weekly_backup', now.toISOString());
        console.log('Automated weekly backup completed successfully!');
      }
    } catch (err) {
      console.error('Automated weekly backup error:', err);
    }
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setCurrentScreen('home');
    setActiveTab('home');
    checkAutomatedWeeklyBackup();
  };

  const handleUpdateUser = (updatedFields) => {
    setUser((prev) => (prev ? { ...prev, ...updatedFields } : prev));
  };

  const handleLogout = () => {
    localStorage.removeItem('money_tracker_token');
    localStorage.removeItem('money_tracker_language');
    setUser(null);
    setCurrentScreen('login');
  };

  const navigateTo = (screen, params = {}) => {
    setCurrentScreen(screen);
    setScreenParams(params);
    if (['home', 'transactions', 'cash', 'history', 'settings'].includes(screen)) {
      setActiveTab(screen);
    }
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setCurrentScreen(tabId);
  };

  if (loading) {
    return (
      <div className="mobile-app-shell" style={{ justifyContent: 'center', alignItems: 'center', color: '#FFF' }}>
        <div style={{ fontSize: '18px', fontWeight: '700' }}>Money Tracker...</div>
      </div>
    );
  }

  const isMainTabScreen = user && ['home', 'transactions', 'cash', 'history', 'settings'].includes(currentScreen);

  return (
    <div className="mobile-app-shell">
      {!user ? (
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      ) : isMainTabScreen ? (
        <AppShell
          user={user}
          onNavigate={navigateTo}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        >
          {currentScreen === 'home' && <HomeScreen user={user} onNavigate={navigateTo} />}
          {currentScreen === 'transactions' && <TransactionsScreen user={user} onNavigate={navigateTo} />}
          {currentScreen === 'cash' && <CashAtHomeScreen user={user} onNavigate={navigateTo} />}
          {currentScreen === 'history' && <HistoryScreen user={user} onNavigate={navigateTo} />}
          {currentScreen === 'settings' && <SettingsScreen user={user} onLogout={handleLogout} onUpdateUser={handleUpdateUser} />}
        </AppShell>
      ) : (
        <>
          {currentScreen === 'add-income' && (
            <AddIncomeScreen
              initialDate={screenParams.date}
              onBack={() => navigateTo(screenParams.from || 'home')}
              onSuccess={() => navigateTo(screenParams.from || 'transactions')}
            />
          )}

          {currentScreen === 'add-expense' && (
            <AddExpenseScreen
              initialDate={screenParams.date}
              onBack={() => navigateTo(screenParams.from || 'home')}
              onSuccess={() => navigateTo(screenParams.from || 'transactions')}
            />
          )}

          {currentScreen === 'transaction-details' && (
            <TransactionDetailsScreen
              txId={screenParams.txId}
              onBack={() => navigateTo('transactions')}
              onNavigate={navigateTo}
            />
          )}

          {currentScreen === 'count-cash' && (
            <CountCashScreen
              targetDate={screenParams.targetDate || screenParams.date}
              onBack={() => navigateTo(screenParams.from || 'cash')}
              onReconciliationSuccess={(reconciliationData) =>
                navigateTo('reconciliation', { reconciliation: reconciliationData })
              }
            />
          )}

          {currentScreen === 'reconciliation' && (
            <ReconciliationScreen
              reconciliation={screenParams.reconciliation}
              onRecount={() => navigateTo('count-cash')}
              onCloseDay={() => navigateTo('close-day')}
              onBackHome={() => navigateTo('cash')}
            />
          )}

          {currentScreen === 'close-day' && (
            <CloseDayScreen
              user={user}
              onBack={() => navigateTo('cash')}
              onCloseSuccess={() => navigateTo('home')}
            />
          )}

          {currentScreen === 'monthly-summary' && (
            <MonthlySummaryScreen
              month={screenParams.month}
              onBack={() => navigateTo('history')}
              user={user}
            />
          )}

          {currentScreen === 'daily-details' && (
            <DailyDetailsScreen
              initialDate={screenParams.date}
              onBack={() => navigateTo('history')}
              onNavigate={navigateTo}
              user={user}
            />
          )}
        </>
      )}
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </LanguageProvider>
  );
}
