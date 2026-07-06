import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { AppError } from '@core/errors/app-error';
import { colors, spacing, typography } from '@presentation/shared/theme';

interface EnrollmentModalProps {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
  isLoading: boolean;
  error: AppError | null;
}

export function EnrollmentModal({
  visible,
  onAccept,
  onDecline,
  isLoading,
  error,
}: EnrollmentModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      accessibilityViewIsModal={true}
    >
      <View style={styles.backdrop}>
        <View
          style={styles.container}
          accessibilityRole="alert"
          accessibilityLabel="Configurar autenticación biométrica"
        >
          <Text style={styles.title}>Activar login biométrico</Text>
          <Text style={styles.description}>
            Permite iniciar sesión usando tu huella o rostro. Tus datos
            biométricos nunca salen del dispositivo.
          </Text>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error.message}</Text>
            </View>
          )}

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator
                size="large"
                color={colors.primary}
                accessibilityLabel="Procesando inscripción biométrica"
              />
            </View>
          ) : (
            <View style={styles.actions}>
              <TouchableOpacity
                onPress={onAccept}
                style={styles.acceptButton}
                accessibilityRole="button"
                accessibilityLabel="Activar autenticación biométrica"
              >
                <Text style={styles.acceptLabel}>Activar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onDecline}
                style={styles.declineButton}
                accessibilityRole="button"
                accessibilityLabel="Rechazar autenticación biométrica permanentemente"
              >
                <Text style={styles.declineLabel}>No, gracias</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  container: {
    backgroundColor: colors.background,
    borderRadius: spacing.md,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 360,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: spacing.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  actions: {
    gap: spacing.sm,
  },
  acceptButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: spacing.sm,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  acceptLabel: {
    ...typography.body,
    color: colors.background,
    fontWeight: '600',
  },
  declineButton: {
    paddingVertical: spacing.md,
    borderRadius: spacing.sm,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  declineLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
