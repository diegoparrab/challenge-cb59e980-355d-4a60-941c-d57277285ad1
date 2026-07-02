import { useBiometricAuth } from 'react-native-biometrics';

const AuthService = () => {
  const { authenticate } = useBiometricAuth();

  const biometricLogin = async () => {
    try {
      await authenticate();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  return {
    biometricLogin,
  };
};

export default AuthService;