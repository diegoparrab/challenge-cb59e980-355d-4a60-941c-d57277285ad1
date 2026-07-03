import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors, spacing, typography} from '@presentation/shared/theme';

interface Props {
  title: string;
  children: React.ReactNode;
  onLogout?: () => void;
}

export function MainLayout({title, children, onLogout}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <View style={[styles.header, {paddingTop: insets.top + spacing.sm}]}>
        <Text style={styles.headerTitle}>{title}</Text>
        {onLogout && (
          <TouchableOpacity
            onPress={onLogout}
            accessibilityRole="button"
            accessibilityLabel="Cerrar sesión"
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <Text style={styles.logoutText}>Salir</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text,
  },
  logoutText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
});
