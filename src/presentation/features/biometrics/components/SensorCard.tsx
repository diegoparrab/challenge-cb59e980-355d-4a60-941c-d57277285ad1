import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {BiometricCapability} from '@domain/biometrics/entities/biometric-capability';

interface Props {
  capability: BiometricCapability;
}

export function SensorCard({capability}: Props) {
  const {reason, biometryType} = capability;

  const sensorName = biometryType
    ? getSensorDisplayName(biometryType)
    : 'Sin sensor';

  return (
    <View style={styles.card}>
      <Text style={styles.icon}>{getSensorIcon(reason, biometryType)}</Text>
      <Text style={styles.title}>{sensorName}</Text>
      <Text style={styles.status}>{getStatusMessage(reason)}</Text>
      {reason === 'NOT_ENROLLED' && (
        <Text style={styles.guidance}>
          Ve a Ajustes del sistema para registrar tu biometría.
        </Text>
      )}
    </View>
  );
}

export function getSensorDisplayName(type: string): string {
  switch (type) {
    case 'FaceID':
      return 'Face ID';
    case 'TouchID':
      return 'Touch ID';
    case 'Fingerprint':
      return 'Huella dactilar';
    case 'Face':
      return 'Reconocimiento facial';
    case 'Iris':
      return 'Iris';
    default:
      return 'Biometría desconocida';
  }
}

export function getSensorIcon(reason: string, type: string | null): string {
  if (reason === 'NO_HARDWARE') {
    return '🚫';
  }
  if (reason === 'NOT_ENROLLED') {
    return '⚠️';
  }
  switch (type) {
    case 'FaceID':
    case 'Face':
      return '🧑';
    case 'TouchID':
    case 'Fingerprint':
      return '👆';
    case 'Iris':
      return '👁️';
    default:
      return '🔐';
  }
}

export function getStatusMessage(reason: string): string {
  switch (reason) {
    case 'AVAILABLE':
      return 'Disponible';
    case 'NOT_ENROLLED':
      return 'No registrada';
    case 'NO_HARDWARE':
      return 'Sin hardware biométrico';
    default:
      return 'Desconocido';
  }
}

const styles = StyleSheet.create({
  card: {
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 48,
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212529',
  },
  status: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 4,
  },
  guidance: {
    fontSize: 13,
    color: '#495057',
    marginTop: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
