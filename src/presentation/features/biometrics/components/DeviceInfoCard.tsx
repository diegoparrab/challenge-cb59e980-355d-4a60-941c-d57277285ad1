import React from 'react';
import {View, Text, StyleSheet} from 'react-native';

interface Props {
  platform: string;
  osVersion: string;
}

export function DeviceInfoCard({platform, osVersion}: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Ficha del dispositivo</Text>
      <Text style={styles.row}>
        Plataforma: {platform === 'ios' ? 'iOS' : 'Android'}
      </Text>
      <Text style={styles.row}>Versión OS: {osVersion}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 10,
    backgroundColor: '#f8f9fa',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8,
  },
  row: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 4,
  },
});
