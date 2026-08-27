import React, { useState, useEffect } from 'react';
import './styles/tokens.css';
import BottomNav from './components/BottomNav';

import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
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
import { authAPI } from './services/api';
import { LanguageProvider } from './context/LanguageContext';

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

    // Auto-login to default account for Father's single-user phone access
    try {
      const defaultEmail = 'father@moneytracker.local';
      const defaultPassword = 'fatherpassword123';
      
      let data;
      try {
        data = await authAPI.login(defaultEmail, defaultPassword);
      } catch (e) {
        // Create account if first time
        data = await authAPI.register('Manoharan', defaultEmail, defaultPassword);
      }

      localStorage.setItem('money_tracker_token', data.token);
      setUser(data.user);
      setCurrentScreen('home');
      setActiveTab('home');
    } catch (err) {
      console.error('Auto-login error:', err);
      setCurrentScreen('login');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setCurrentScreen('home');
    setActiveTab('home');
  };

  const handleLogout = () => {
    localStorage.removeItem('money_tracker_token');
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

  const showBottomNav = user && ['home', 'transactions', 'cash', 'history', 'settings'].includes(currentScreen);

  return (
    <div className="mobile-app-shell">
      {!user ? (
        currentScreen === 'register' ? (
          <RegisterScreen
            onRegisterSuccess={handleLoginSuccess}
            onNavigateToLogin={() => setCurrentScreen('login')}
          />
        ) : (
          <LoginScreen
            onLoginSuccess={handleLoginSuccess}
            onNavigateToRegister={() => setCurrentScreen('register')}
          />
        )
      ) : (
        <>
          {currentScreen === 'home' && <HomeScreen user={user} onNavigate={navigateTo} />}
          {currentScreen === 'transactions' && <TransactionsScreen user={user} onNavigate={navigateTo} />}
          {currentScreen === 'cash' && <CashAtHomeScreen user={user} onNavigate={navigateTo} />}
          {currentScreen === 'history' && <HistoryScreen user={user} onNavigate={navigateTo} />}
          {currentScreen === 'settings' && <SettingsScreen user={user} onLogout={handleLogout} />}

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

          {showBottomNav && <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />}
        </>
      )}
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}
