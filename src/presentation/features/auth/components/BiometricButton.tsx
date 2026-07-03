import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';
import { BiometricCapability } from '@domain/biometrics/entities/biometric-capability';
import { AuthStatus } from '../hooks/useBiometricLogin';
import { colors, spacing, typography } from '@presentation/shared/theme';

interface Props {
  capability: BiometricCapability | null;
  status: AuthStatus;
  onPress: () => void;
}

export function BiometricButton({ capability, status, onPress }: Props) {
  const isDisabled = !capability?.available || status === 'authenticating';
  const label = getButtonLabel(capability);

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      style={[styles.button, isDisabled && styles.buttonDisabled]}
    >
      {status === 'authenticating' ? (
        <ActivityIndicator color={colors.background} />
      ) : (
        <Text style={[styles.label, isDisabled && styles.labelDisabled]}>
          {label}
        </Text>
      )}
      {!capability?.available && capability && (
        <View style={styles.explanationContainer}>
          <Text style={styles.explanation}>
            {getDisabledExplanation(capability.reason)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function getButtonLabel(capability: BiometricCapability | null): string {
  if (!capability || !capability.available) {
    return 'Login biométrico no disponible';
  }
  if (capability.biometryType === 'FaceID') {
    return 'Login with Face ID';
  }
  return 'Login with fingerprint';
}

function getDisabledExplanation(reason: string): string {
  switch (reason) {
    case 'NO_HARDWARE':
      return 'Este dispositivo no tiene sensor biométrico';
    case 'NOT_ENROLLED':
      return 'No hay biometría configurada en el dispositivo';
    default:
      return 'Biometría no disponible';
  }
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonDisabled: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    ...typography.body,
    color: colors.background,
    fontWeight: '600',
  },
  labelDisabled: {
    color: colors.textSecondary,
  },
  explanationContainer: {
    marginTop: spacing.xs,
  },
  explanation: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
