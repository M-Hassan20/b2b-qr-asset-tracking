import React, { useState, useEffect } from 'react';
import { apiClient } from './api/apiClient';
import { ScanPage } from './pages/ScanPage';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';

export function App() {
  const [user, setUser] = useState(null);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const savedUser = apiClient.getUser();
    if (savedUser) {
      setUser(savedUser);
    }

    const onPopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    window.history.pushState({}, '', '/dashboard');
    setCurrentPath('/dashboard');
  };

  const handleLogout = () => {
    apiClient.clearAuth();
    setUser(null);
    window.history.pushState({}, '', '/login');
    setCurrentPath('/login');
  };

  // Route 1: Public Scan Landing (/scan/:qrToken)
  if (currentPath.startsWith('/scan/')) {
    return <ScanPage />;
  }

  // Route 2: Staff Dashboard (Requires Auth)
  if (user && currentPath === '/dashboard') {
    return <DashboardPage user={user} onLogout={handleLogout} />;
  }

  // Route 3: Login Page (Default fallback for staff portal)
  return <LoginPage onLoginSuccess={handleLoginSuccess} />;
}
