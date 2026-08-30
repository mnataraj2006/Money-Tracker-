import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { useLanguage } from './LanguageContext';

const NavigationContext = createContext(null);

const MAIN_TABS = ['home', 'transactions', 'banks', 'history', 'settings'];

export function NavigationProvider({ children }) {
  const { t } = useLanguage();

  const [currentScreen, setCurrentScreen] = useState('login');
  const [screenParams, setScreenParams] = useState({});
  const [activeTab, setActiveTab] = useState('home');

  // Exit Toast state
  const [exitToast, setExitToast] = useState(null);
  const toastTimeoutRef = useRef(null);

  // History stack for screen navigation
  const historyStackRef = useRef([{ screen: 'home', params: {} }]);

  // Modal / Sheet / Overlay stack
  // Stored as: [{ id, handler }]
  const modalStackRef = useRef([]);

  // Double-back exit timer
  const lastBackPressTimeRef = useRef(0);

  // Refs for current state to avoid stale closures in event listeners
  const currentScreenRef = useRef(currentScreen);
  currentScreenRef.current = currentScreen;

  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  // Register a modal dismiss handler on the stack
  const registerModal = useCallback((handler) => {
    const id = Symbol('modal_handler');
    modalStackRef.current.push({ id, handler });

    return () => {
      modalStackRef.current = modalStackRef.current.filter((item) => item.id !== id);
    };
  }, []);

  // Show unobtrusive exit toast
  const showExitToast = useCallback(() => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setExitToast(t('pressBackAgainToExit') || 'Press back again to exit');
    toastTimeoutRef.current = setTimeout(() => {
      setExitToast(null);
    }, 2000);
  }, [t]);

  // Navigate to screen
  const navigateTo = useCallback((screen, params = {}) => {
    setCurrentScreen(screen);
    setScreenParams(params);

    if (MAIN_TABS.includes(screen)) {
      setActiveTab(screen);
      if (screen === 'home') {
        historyStackRef.current = [{ screen: 'home', params: {} }];
      } else {
        historyStackRef.current = [{ screen: 'home', params: {} }, { screen, params }];
      }
    } else {
      // Push child screen onto stack
      historyStackRef.current.push({ screen, params });
    }

    // Keep browser history trap alive
    try {
      window.history.pushState({ screen, params, time: Date.now() }, '');
    } catch {
      // Ignore
    }
  }, []);

  // Handle Tab Change
  const handleTabChange = useCallback((tabId) => {
    navigateTo(tabId);
  }, [navigateTo]);

  // Centralized Back Navigation Logic
  const goBack = useCallback(() => {
    // PRIORITY 1: Check if any modal / bottom sheet / overlay is open
    if (modalStackRef.current.length > 0) {
      const topModal = modalStackRef.current[modalStackRef.current.length - 1];
      if (topModal && typeof topModal.handler === 'function') {
        const handled = topModal.handler();
        // If the modal handler handled the close/cancel action, return true
        if (handled !== false) {
          return true;
        }
      }
    }

    // PRIORITY 2: Secondary / Child screen navigation
    if (historyStackRef.current.length > 1) {
      historyStackRef.current.pop();
      const prev = historyStackRef.current[historyStackRef.current.length - 1] || { screen: 'home', params: {} };
      setCurrentScreen(prev.screen);
      setScreenParams(prev.params || {});
      if (MAIN_TABS.includes(prev.screen)) {
        setActiveTab(prev.screen);
      }
      return true;
    }

    // PRIORITY 3: Bottom Navigation Root Tab (non-Home) -> Navigate to Home
    if (currentScreenRef.current !== 'home' && MAIN_TABS.includes(currentScreenRef.current)) {
      setCurrentScreen('home');
      setActiveTab('home');
      setScreenParams({});
      historyStackRef.current = [{ screen: 'home', params: {} }];
      return true;
    }

    // PRIORITY 4: Already on Home Screen -> Double-Back Exit
    if (currentScreenRef.current === 'home') {
      const now = Date.now();
      if (now - lastBackPressTimeRef.current < 2000) {
        // Double press within 2s -> Allow Exit
        if (Capacitor.isNativePlatform()) {
          CapacitorApp.exitApp();
        }
        return false;
      } else {
        // First press -> Show Toast
        lastBackPressTimeRef.current = now;
        showExitToast();
        return true;
      }
    }

    return false;
  }, [showExitToast]);

  // Set up event listeners (Native Android Back Button + Browser popstate)
  useEffect(() => {
    // 1. Initial history trap
    try {
      window.history.pushState({ app: 'cashly', initial: true }, '');
    } catch {
      // Ignore
    }

    // 2. Browser / PWA popstate listener
    const handlePopState = (e) => {
      const handled = goBack();
      if (handled) {
        // Re-push history entry so next back button press can also be intercepted
        try {
          window.history.pushState({ app: 'cashly', time: Date.now() }, '');
        } catch {
          // Ignore
        }
      }
    };

    window.addEventListener('popstate', handlePopState);

    // 3. Capacitor Native Android Back Button listener
    let nativeListenerHandle = null;
    if (Capacitor.isNativePlatform()) {
      CapacitorApp.addListener('backButton', () => {
        goBack();
      }).then((handle) => {
        nativeListenerHandle = handle;
      }).catch((err) => {
        console.error('Failed to register Capacitor backButton listener:', err);
      });
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (nativeListenerHandle) {
        nativeListenerHandle.remove();
      }
    };
  }, [goBack]);

  const value = {
    currentScreen,
    setCurrentScreen,
    screenParams,
    setScreenParams,
    activeTab,
    setActiveTab,
    navigateTo,
    handleTabChange,
    goBack,
    registerModal
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}

      {/* Unobtrusive Double-Back Exit Toast */}
      {exitToast && (
        <div
          style={{
            position: 'fixed',
            bottom: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(15, 23, 42, 0.92)',
            color: '#FFFFFF',
            padding: '10px 20px',
            borderRadius: '24px',
            fontSize: '13px',
            fontWeight: '700',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 999999,
            pointerEvents: 'none',
            animation: 'fadeIn 0.2s ease-out',
            whiteSpace: 'nowrap'
          }}
        >
          {exitToast}
        </div>
      )}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}

// Hook to register a modal/sheet/popup with the back button manager
export function useRegisterModal(isOpen, onDismiss) {
  const { registerModal } = useNavigation();

  useEffect(() => {
    if (isOpen && onDismiss) {
      return registerModal(onDismiss);
    }
  }, [isOpen, onDismiss, registerModal]);
}
