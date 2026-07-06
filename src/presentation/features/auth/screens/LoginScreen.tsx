import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@presentation/navigation/types';
import { AuthLayout } from '@presentation/shared/components/AuthLayout';
import { Toast, ToastVariant } from '@presentation/shared/components/Toast';
import { BiometricErrorBanner } from '@presentation/shared/components/BiometricErrorBanner';
import { colors, spacing, typography } from '@presentation/shared/theme';
import { useBiometricLogin } from '../hooks/useBiometricLogin';
import { BiometricButton } from '../components/BiometricButton';
import { EventFeedback } from '../components/EventFeedback';

type LoginNav = NativeStackNavigationProp<RootStackParamList, 'Login'>;

const SUCCESS_TOAST_DURATION = 1500;

export function LoginScreen() {
  const navigation = useNavigation<LoginNav>();
  const {
    status,
    capability,
    biometricError,
    biometricDisabled,
    login,
    clearError,
  } = useBiometricLogin();

  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    variant: ToastVariant;
    duration: number;
  }>({ visible: false, message: '', variant: 'info', duration: 2500 });

  useEffect(() => {
    if (status === 'success') {
      setToast({
        visible: true,
        message: 'Autenticación exitosa',
        variant: 'success',
        duration: SUCCESS_TOAST_DURATION,
      });
    }
  }, [status]);

  const handleToastHide = useCallback(() => {
    setToast(prev => ({ ...prev, visible: false }));
    if (status === 'success') {
      navigation.replace('Home');
    }
  }, [status, navigation]);

  return (
    <View style={styles.root}>
      <Toast
        visible={toast.visible}
        message={toast.message}
        variant={toast.variant}
        duration={toast.duration}
        onHide={handleToastHide}
      />
      <AuthLayout>
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>🔐</Text>
          <Text style={styles.title}>Biometrics Auth</Text>
          <Text style={styles.subtitle}>
            Autenticación biométrica segura
          </Text>
        </View>

        <View style={styles.actionContainer}>
          <BiometricButton
            capability={capability}
            status={status}
            onPress={login}
            disabled={biometricDisabled}
          />
          <EventFeedback status={status} />
        </View>
      </AuthLayout>
      <BiometricErrorBanner
        error={biometricError}
        onRetry={login}
        onEnroll={() => {}}
        onDismiss={clearError}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logo: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  actionContainer: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.md,
  },
});
