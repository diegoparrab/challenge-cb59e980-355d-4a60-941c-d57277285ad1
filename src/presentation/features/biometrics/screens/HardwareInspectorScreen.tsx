import React from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Platform,
  StyleSheet,
} from 'react-native';
import {useBiometricCapability} from '../hooks/useBiometricCapability';
import {SensorCard} from '../components/SensorCard';
import {ReDetectButton} from '../components/ReDetectButton';
import {ExplanationPanel} from '../components/ExplanationPanel';
import {SignatureFlowPanel} from '../components/SignatureFlowPanel';
import {DeviceInfoCard} from '../components/DeviceInfoCard';

export function HardwareInspectorScreen() {
  const {capability, loading, error, redetect} = useBiometricCapability();

  if (loading && !capability) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Detectando capacidades...</Text>
      </View>
    );
  }

  if (error && !capability) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <ReDetectButton onPress={redetect} loading={loading} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Hardware Inspector</Text>

      {capability && <SensorCard capability={capability} />}

      <ReDetectButton onPress={redetect} loading={loading} />

      {capability && <ExplanationPanel capability={capability} />}

      <SignatureFlowPanel />

      <DeviceInfoCard
        platform={Platform.OS}
        osVersion={Platform.Version.toString()}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#fff'},
  content: {padding: 24},
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 24,
  },
  loadingText: {marginTop: 12, fontSize: 16, color: '#6c757d'},
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 16,
  },
});
