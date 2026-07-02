import React from 'react';
import { useIsBiometricAvailable, useBiometricAuth } from 'react-native-biometrics';

const BiometricAuth = ({ onAuthSuccess }) => {
  const isBiometricAvailable = useIsBiometricAvailable();
  const { authenticate } = useBiometricAuth();

  const handleAuth = async () => {
    if (isBiometricAvailable) {
      try {
        await authenticate();
        onAuthSuccess();
      } catch (error) {
        console.error('Authentication error:', error);
      }
    }
  };

  return (
    <button onPress={handleAuth}>
      Authenticate
    </button>
  );
};

export default BiometricAuth;