import React from 'react';
import {Text, TouchableOpacity, StyleSheet, View} from 'react-native';
import {AuthLayout} from '@presentation/shared/components/AuthLayout';
import {colors, spacing, typography} from '@presentation/shared/theme';

interface Props {
  onLoginSuccess: () => void;
}

export function LoginScreen({onLoginSuccess}: Props) {
  return (
    <AuthLayout>
      <View style={styles.logoContainer}>
        <Text style={styles.logo}>🔐</Text>
        <Text style={styles.title}>Biometrics Auth</Text>
        <Text style={styles.subtitle}>
          Autenticación biométrica segura
        </Text>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={onLoginSuccess}
        accessibilityRole="button"
        accessibilityLabel="Iniciar sesión">
        <Text style={styles.buttonText}>Iniciar sesión</Text>
      </TouchableOpacity>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
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
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
