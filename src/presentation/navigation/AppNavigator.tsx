import React, {useCallback, useState} from 'react';
import {LoginScreen} from '@presentation/features/auth/screens/LoginScreen';
import {HomeScreen} from '@presentation/features/auth/screens/HomeScreen';

type Route = 'login' | 'home';

export function AppNavigator() {
  const [route, setRoute] = useState<Route>('login');

  const handleLoginSuccess = useCallback(() => {
    setRoute('home');
  }, []);

  const handleLogout = useCallback(() => {
    setRoute('login');
  }, []);

  switch (route) {
    case 'login':
      return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
    case 'home':
      return <HomeScreen onLogout={handleLogout} />;
  }
}
