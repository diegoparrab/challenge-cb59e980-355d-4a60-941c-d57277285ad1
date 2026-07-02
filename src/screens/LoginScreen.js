import React from 'react';
import { View, Text } from 'react-native';
import BiometricAuth from '../components/BiometricAuth';
import AuthService from '../services/AuthService';
import { handleError } from '../utils/errorHandler';

const LoginScreen = () => {
  const authService = AuthService();

  const handleAuthSuccess = () => {
    console.log('Authentication successful!');
    // Aquí puedes redirigir al usuario a la pantalla principal
  };

  const handleAuthError = (error) => {
    handleError(error);
  };

  return (
    <View>
      <Text>Login Screen</Text>
      <BiometricAuth onAuthSuccess={handleAuthSuccess} onAuthError={handleAuthError} />
    </View>
  );
};

export default LoginScreen;