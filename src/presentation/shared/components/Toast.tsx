import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, typography } from '@presentation/shared/theme';

export type ToastVariant = 'success' | 'error' | 'info';

interface Props {
  visible: boolean;
  message: string;
  variant?: ToastVariant;
  duration?: number;
  onHide?: () => void;
}

export function Toast({
  visible,
  message,
  variant = 'info',
  duration = 2500,
  onHide,
}: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: -20,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => onHide?.());
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, duration, onHide, opacity, translateY]);

  if (!visible) {
    return null;
  }

  const containerStyle: ViewStyle = {
    ...styles.container,
    ...getVariantStyle(variant),
  };

  return (
    <Animated.View
      style={[containerStyle, { opacity, transform: [{ translateY }] }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
    >
      <Text style={[styles.icon]}>{getVariantIcon(variant)}</Text>
      <Text style={styles.message}>{message}</Text>
    </Animated.View>
  );
}

function getVariantStyle(variant: ToastVariant): ViewStyle {
  switch (variant) {
    case 'success':
      return { backgroundColor: colors.success };
    case 'error':
      return { backgroundColor: colors.error };
    case 'info':
    default:
      return { backgroundColor: colors.primaryDark };
  }
}

function getVariantIcon(variant: ToastVariant): string {
  switch (variant) {
    case 'success':
      return '✓';
    case 'error':
      return '✗';
    case 'info':
    default:
      return 'ℹ';
  }
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: spacing.lg,
    right: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 9999,
  },
  icon: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  message: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '500',
    flex: 1,
  },
});
