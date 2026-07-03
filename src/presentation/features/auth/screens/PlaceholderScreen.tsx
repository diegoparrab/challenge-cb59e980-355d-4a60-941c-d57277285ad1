import React from 'react';
import { StyleSheet, Text, View, useColorScheme } from 'react-native';
import { colors } from '@presentation/shared/theme';
import { spacing } from '@presentation/shared/theme';

export function PlaceholderScreen() {
  const isDarkMode = useColorScheme() === 'dark';

  const backgroundColor = isDarkMode ? colors.backgroundDark : colors.background;
  const textColor = isDarkMode ? colors.textDark : colors.text;
  const secondaryColor = isDarkMode ? colors.textSecondaryDark : colors.textSecondary;

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Text style={[styles.title, { color: textColor }]}>
        Biometrics Auth
      </Text>
      <Text style={[styles.subtitle, { color: secondaryColor }]}>
        Clean Architecture + Feature Namespacing
      </Text>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>Spec 01 ✓</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  badge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});
