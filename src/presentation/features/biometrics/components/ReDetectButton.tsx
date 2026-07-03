import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';

interface Props {
  onPress: () => void;
  loading: boolean;
}

export function ReDetectButton({ onPress, loading }: Props) {
  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel="Volver a detectar capacidades biométricas"
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.text}>Volver a detectar</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: { backgroundColor: '#0d6efd', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 8, alignItems: 'center', marginVertical: 16 },
  text: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
