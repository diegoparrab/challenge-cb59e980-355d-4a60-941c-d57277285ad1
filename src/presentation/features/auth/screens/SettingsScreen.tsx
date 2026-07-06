import React, {useCallback, useEffect, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {isOk} from '@core/types/result';
import {AuthSession} from '@domain/auth/entities';
import {container} from '@di/container';
import {colors, spacing, typography} from '@presentation/shared/theme';

interface Props {
  session: AuthSession | null;
  isEnrolled: boolean;
  isLoading: boolean;
  onEnrollBiometrics: () => void;
  onDisableBiometrics: () => void;
  onExpireSession: () => void;
}

function formatTimestamp(issuedAt: number): string {
  const date = new Date(issuedAt);
  return date.toLocaleString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMethod(method: string): string {
  switch (method) {
    case 'PASSWORD':
      return 'Contraseña';
    case 'BIOMETRIC':
      return 'Biométrico';
    default:
      return method;
  }
}

function truncateKey(key: string): string {
  if (key.length <= 20) {
    return key;
  }
  return `${key.substring(0, 20)}...`;
}

export function SettingsScreen({
  session,
  isEnrolled,
  isLoading,
  onEnrollBiometrics,
  onDisableBiometrics,
  onExpireSession,
}: Props) {
  const [publicKey, setPublicKey] = useState<string | null>(null);

  useEffect(() => {
    const loadPublicKey = async () => {
      const result =
        await container.biometricEnrollmentRepository.getPublicKey();
      if (isOk(result) && result.value) {
        setPublicKey(result.value);
      } else {
        setPublicKey(null);
      }
    };
    loadPublicKey();
  }, [isEnrolled]);

  const handleBiometricToggle = useCallback(
    (value: boolean) => {
      if (value) {
        onEnrollBiometrics();
      } else {
        onDisableBiometrics();
      }
    },
    [onEnrollBiometrics, onDisableBiometrics],
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sesión activa</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Usuario</Text>
            <Text style={styles.value}>{session?.userId ?? '—'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Método</Text>
            <Text style={styles.value}>
              {session ? formatMethod(session.method) : '—'}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Inicio de sesión</Text>
            <Text style={styles.value}>
              {session ? formatTimestamp(session.issuedAt) : '—'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Biometría</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Login biométrico</Text>
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Switch
                value={isEnrolled}
                onValueChange={handleBiometricToggle}
                trackColor={{false: colors.border, true: colors.primary}}
                accessibilityRole="switch"
                accessibilityLabel="Activar o desactivar login biométrico"
                accessibilityState={{checked: isEnrolled}}
              />
            )}
          </View>
          {isEnrolled && publicKey && (
            <View style={styles.publicKeyContainer}>
              <Text style={styles.label}>Clave pública</Text>
              <Text
                style={styles.publicKeyValue}
                accessibilityLabel={`Clave pública: ${truncateKey(publicKey)}`}
              >
                {truncateKey(publicKey)}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Acciones</Text>
        <TouchableOpacity
          style={styles.dangerButton}
          onPress={onExpireSession}
          accessibilityRole="button"
          accessibilityLabel="Simular expiración de sesión"
        >
          <Text style={styles.dangerButtonText}>
            Simular expiración de sesión
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: spacing.sm,
    padding: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  label: {
    ...typography.body,
    color: colors.text,
    fontSize: 14,
  },
  value: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 14,
  },
  publicKeyContainer: {
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    marginTop: spacing.xs,
  },
  publicKeyValue: {
    ...typography.caption,
    color: colors.textSecondary,
    fontFamily: 'Courier',
    marginTop: spacing.xs,
  },
  dangerButton: {
    backgroundColor: colors.error,
    paddingVertical: spacing.md,
    borderRadius: spacing.sm,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  dangerButtonText: {
    ...typography.body,
    color: colors.background,
    fontWeight: '600',
  },
});
