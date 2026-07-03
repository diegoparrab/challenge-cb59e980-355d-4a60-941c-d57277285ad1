import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { BiometricCapability } from '@domain/biometrics/entities/biometric-capability';

interface Props {
  capability: BiometricCapability;
}

export function ExplanationPanel({ capability }: Props) {
  const apiName = Platform.OS === 'ios'
    ? 'LAContext.canEvaluatePolicy'
    : 'BiometricManager.canAuthenticate';

  const responseDescription = getResponseDescription(capability.reason);

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>¿Qué acaba de pasar?</Text>
      <Text style={styles.body}>
        Se consultó <Text style={styles.code}>{apiName}</Text> del sistema operativo.
      </Text>
      <Text style={styles.body}>Respuesta: {responseDescription}</Text>
    </View>
  );
}

function getResponseDescription(reason: string): string {
  switch (reason) {
    case 'AVAILABLE':
      return 'El sensor biométrico está disponible y tiene datos biométricos registrados.';
    case 'NOT_ENROLLED':
      return 'Se detectó hardware biométrico, pero no hay biometría registrada en el dispositivo.';
    case 'NO_HARDWARE':
      return 'No se detectó hardware biométrico en este dispositivo.';
    default:
      return 'Estado desconocido.';
  }
}

const styles = StyleSheet.create({
  panel: { padding: 16, borderRadius: 10, backgroundColor: '#e9ecef', marginBottom: 16 },
  title: { fontSize: 16, fontWeight: '600', color: '#212529', marginBottom: 8 },
  body: { fontSize: 14, color: '#495057', marginBottom: 4, lineHeight: 20 },
  code: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: '#0d6efd' },
});
