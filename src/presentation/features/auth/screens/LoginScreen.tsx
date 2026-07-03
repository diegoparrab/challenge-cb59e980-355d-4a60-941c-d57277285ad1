import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@presentation/navigation/types';
import { AuthLayout } from '@presentation/shared/components/AuthLayout';
import { Toast, ToastVariant } from '@presentation/shared/components/Toast';
import { colors, spacing, typography } from '@presentation/shared/theme';
import { useBiometricLogin } from '../hooks/useBiometricLogin';
import { BiometricButton } from '../components/BiometricButton';
import { EventFeedback } from '../components/EventFeedback';

type LoginNav = NativeStackNavigationProp<RootStackParamList, 'Login'>;

const SUCCESS_TOAST_DURATION = 1500;
const FAILURE_TOAST_DURATION = 3000;

export function LoginScreen() {
  const navigation = useNavigation<LoginNav>();
  const { status, capability, login, reset } = useBiometricLogin();

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

  useEffect(() => {
    if (status === 'failed') {
      setToast({
        visible: true,
        message: 'No se completó la autenticación. Intenta de nuevo.',
        variant: 'error',
        duration: FAILURE_TOAST_DURATION,
      });
    }
  }, [status]);

  const handleToastHide = useCallback(() => {
    setToast(prev => ({ ...prev, visible: false }));
    if (status === 'success') {
      navigation.replace('Home');
    } else if (status === 'failed') {
      reset();
    }
  }, [status, navigation, reset]);

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
          />
          <EventFeedback status={status} />
        </View>
      </AuthLayout>
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
