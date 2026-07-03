import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AuthStatus } from '../hooks/useBiometricLogin';
import { colors, spacing, typography } from '@presentation/shared/theme';

interface Props {
  status: AuthStatus;
}

export function EventFeedback({ status }: Props) {
  if (status !== 'authenticating') {
    return null;
  }

  return (
    <View accessibilityLiveRegion="polite" style={styles.container}>
      <Text style={styles.message}>Verificando identidad...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
