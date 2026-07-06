import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import {
  BiometricError,
  SuggestedAction,
} from '@domain/biometrics/entities/biometric-error';
import { spacing } from '@presentation/shared/theme';

const AUTO_DISMISS_MS = 4000;

interface Props {
  error: BiometricError | null;
  onRetry?: () => void;
  onEnroll?: () => void;
  onDismiss?: () => void;
}

export function BiometricErrorBanner({
  error,
  onRetry,
  onEnroll,
  onDismiss,
}: Props) {
  const hasAction = error
    ? getActionLabel(error.metadata.suggestedAction) !== null
    : false;

  useEffect(() => {
    if (!error || hasAction) {
      return;
    }

    const timer = setTimeout(() => {
      onDismiss?.();
    }, AUTO_DISMISS_MS);

    return () => clearTimeout(timer);
  }, [error, hasAction, onDismiss]);

  if (!error) {
    return null;
  }

  const actionLabel = getActionLabel(error.metadata.suggestedAction);
  const actionHandler = getActionHandler(error.metadata.suggestedAction, {
    onRetry,
    onEnroll,
  });

  return (
    <View
      style={styles.container}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
    >
      <Text style={styles.message}>{error.metadata.message}</Text>
      {actionLabel && actionHandler && (
        <Pressable
          style={styles.actionButton}
          onPress={actionHandler}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

export function getActionLabel(action: SuggestedAction): string | null {
  switch (action) {
    case 'ENROLL':
      return 'Ir a Ajustes';
    case 'WAIT':
    case 'NONE':
    default:
      return null;
  }
}

function getActionHandler(
  action: SuggestedAction,
  handlers: {
    onRetry?: () => void;
    onEnroll?: () => void;
  },
): (() => void) | null {
  switch (action) {
    case 'ENROLL':
      return handlers.onEnroll ?? null;
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: '#FFF3CD',
    borderRadius: 12,
    padding: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 6,
  },
  message: {
    fontSize: 14,
    color: '#212529',
    lineHeight: 20,
  },
  actionButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
