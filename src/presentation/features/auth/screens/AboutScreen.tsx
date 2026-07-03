import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {colors, spacing, typography} from '@presentation/shared/theme';

export function AboutScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🔐</Text>
      <Text style={styles.title}>Biometrics Auth</Text>
      <Text style={styles.description}>
        App de aprendizaje que explora cómo funciona la autenticación biométrica
        en iOS y Android a nivel de hardware.
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>¿Qué cubre?</Text>
        <Text style={styles.bullet}>• Detección de hardware biométrico</Text>
        <Text style={styles.bullet}>• Flujo challenge → firma → verificación</Text>
        <Text style={styles.bullet}>• Secure Enclave / TEE (claves en hardware)</Text>
        <Text style={styles.bullet}>• Manejo de errores y lockouts</Text>
        <Text style={styles.bullet}>• Protección anti-replay</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Arquitectura</Text>
        <Text style={styles.bullet}>• Clean Architecture + Feature Slices</Text>
        <Text style={styles.bullet}>• React Native 0.86 (New Architecture)</Text>
        <Text style={styles.bullet}>• TypeScript estricto + Result type</Text>
      </View>

      <Text style={styles.footer}>Pragma — Reto Advanced L2</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
  },
  icon: {
    fontSize: 56,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  section: {
    alignSelf: 'stretch',
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.sm,
    fontSize: 16,
  },
  bullet: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: spacing.xs,
    paddingLeft: spacing.sm,
  },
  footer: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.lg,
  },
});
