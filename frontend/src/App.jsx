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
import SimplePassbookView from './screens/SimplePassbookView';
import BanksScreen from './screens/BanksScreen';
import BankAccountDetailsScreen from './screens/BankAccountDetailsScreen';
import ReportsScreen from './screens/ReportsScreen';
import SplashScreen from './components/SplashScreen';
import { authAPI, settingsAPI } from './services/api';
import { checkAndRunScheduledBackup } from './services/backupScheduler';
import { LanguageProvider } from './context/LanguageContext';
import { DataProvider } from './context/DataContext';
import { NavigationProvider, useNavigation } from './context/NavigationContext';

function AppContent() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('money_tracker_app_view') || 'normal');

  const {
    currentScreen,
    setCurrentScreen,
    screenParams,
    activeTab,
    navigateTo,
    handleTabChange,
    goBack
  } = useNavigation();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    let token = localStorage.getItem('money_tracker_token');
    
    if (token) {
      try {
        const data = await authAPI.getMe();
        setUser(data.user);
        navigateTo('home');
        setLoading(false);
        checkAndRunScheduledBackup();
        return;
      } catch (err) {
        localStorage.removeItem('money_tracker_token');
      }
    }

    setUser(null);
    setCurrentScreen('login');
    setLoading(false);
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    navigateTo('home');
    checkAndRunScheduledBackup();
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

  if (loading) {
    return <SplashScreen />;
  }

  const isMainTabScreen = user && ['home', 'transactions', 'banks', 'history', 'settings'].includes(currentScreen);

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
          {currentScreen === 'home' && <HomeScreen user={user} onNavigate={navigateTo} viewMode={viewMode} />}
          {currentScreen === 'transactions' && <TransactionsScreen user={user} onNavigate={navigateTo} />}
          {currentScreen === 'banks' && <BanksScreen user={user} onNavigate={navigateTo} />}
          {currentScreen === 'history' && <HistoryScreen user={user} onNavigate={navigateTo} />}
          {currentScreen === 'settings' && (
            <SettingsScreen
              user={user}
              onLogout={handleLogout}
              onUpdateUser={handleUpdateUser}
              viewMode={viewMode}
              onViewModeChange={(mode) => setViewMode(mode)}
            />
          )}
        </AppShell>
      ) : (
        <>
          {currentScreen === 'cash' && (
            <CashAtHomeScreen user={user} onNavigate={navigateTo} onBack={goBack} />
          )}

          {currentScreen === 'bank-account-details' && (
            <BankAccountDetailsScreen
              accountId={screenParams.accountId}
              onBack={goBack}
              onNavigate={navigateTo}
            />
          )}

          {currentScreen === 'add-income' && (
            <AddIncomeScreen
              initialDate={screenParams.date}
              editTx={screenParams.editTx}
              onBack={goBack}
              onSuccess={() => navigateTo(screenParams.from || 'transactions')}
            />
          )}

          {currentScreen === 'add-expense' && (
            <AddExpenseScreen
              initialDate={screenParams.date}
              editTx={screenParams.editTx}
              onBack={goBack}
              onSuccess={() => navigateTo(screenParams.from || 'transactions')}
            />
          )}

          {currentScreen === 'transaction-details' && (
            <TransactionDetailsScreen
              txId={screenParams.txId}
              onBack={goBack}
              onNavigate={navigateTo}
            />
          )}

          {currentScreen === 'count-cash' && (
            <CountCashScreen
              targetDate={screenParams.targetDate || screenParams.date}
              onBack={goBack}
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
              onBack={goBack}
              onCloseSuccess={() => navigateTo('home')}
            />
          )}

          {currentScreen === 'monthly-summary' && (
            <MonthlySummaryScreen
              month={screenParams.month}
              onBack={goBack}
              user={user}
            />
          )}

          {currentScreen === 'daily-details' && (
            <DailyDetailsScreen
              initialDate={screenParams.date}
              onBack={goBack}
              onNavigate={navigateTo}
              user={user}
            />
          )}

          {currentScreen === 'reports' && (
            <ReportsScreen
              onBack={goBack}
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
        <NavigationProvider>
          <AppContent />
        </NavigationProvider>
      </DataProvider>
    </LanguageProvider>
  );
}
