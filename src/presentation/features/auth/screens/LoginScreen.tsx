import React, {useCallback, useState} from 'react';
import {View, Text, StyleSheet, TextInput, TouchableOpacity} from 'react-native';
import {AuthLayout} from '@presentation/shared/components/AuthLayout';
import {colors, spacing, typography} from '@presentation/shared/theme';
import {useAuth} from '../hooks/useAuth';
import {useSession} from '../hooks/useSession';
import {isOk} from '@core/types/result';

export function LoginScreen() {
  const {login, loginWithBiometrics, isEnrolled, isLoading, error} = useAuth();
  const {setSession} = useSession();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleCredentialLogin = useCallback(async () => {
    const result = await login({username, password});
    if (isOk(result)) {
      setSession(result.value);
    }
  }, [login, username, password, setSession]);

  const handleBiometricLogin = useCallback(async () => {
    const result = await loginWithBiometrics();
    if (isOk(result)) {
      setSession(result.value);
    }
  }, [loginWithBiometrics, setSession]);

  return (
    <View style={styles.root}>
      <AuthLayout>
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>🔐</Text>
          <Text style={styles.title}>Biometrics Auth</Text>
          <Text style={styles.subtitle}>
            Autenticación biométrica segura
          </Text>
        </View>

        <View style={styles.formContainer}>
          <TextInput
            style={styles.input}
            placeholder="Usuario"
            placeholderTextColor={colors.textSecondary}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Usuario"
          />
          <TextInput
            style={styles.input}
            placeholder="Contraseña"
            placeholderTextColor={colors.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            accessibilityLabel="Contraseña"
          />

          {error && (
            <Text style={styles.errorText}>{error.message}</Text>
          )}

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleCredentialLogin}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityLabel="Iniciar sesión">
            <Text style={styles.buttonText}>
              {isLoading ? 'Ingresando...' : 'Iniciar sesión'}
            </Text>
          </TouchableOpacity>

          {isEnrolled && (
            <TouchableOpacity
              style={[styles.biometricButton, isLoading && styles.buttonDisabled]}
              onPress={handleBiometricLogin}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel="Ingresar con biometría">
              <Text style={styles.biometricButtonText}>🔑 Ingresar con biometría</Text>
            </TouchableOpacity>
          )}
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
  formContainer: {
    width: '100%',
    gap: spacing.md,
  },
  input: {
    ...typography.body,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    backgroundColor: colors.background,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    textAlign: 'center',
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  biometricButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  biometricButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
});
