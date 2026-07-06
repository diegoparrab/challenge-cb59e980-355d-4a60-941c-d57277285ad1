import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSignatureFlow } from '../hooks/useSignatureFlow';

export function SignatureFlowPanel() {
  const { flow, securityLevel, loading, refresh } = useSignatureFlow();

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>Flujo de Firma</Text>

      {loading && !flow && (
        <ActivityIndicator size="small" style={styles.loader} />
      )}

      {!loading && !flow && (
        <Text style={styles.emptyText}>
          No hay intentos de login biométrico
        </Text>
      )}

      {flow && (
        <View style={styles.flowContainer}>
          <Text style={styles.label}>Challenge (nonce):</Text>
          <Text style={styles.mono}>{flow.challenge}</Text>

          <Text style={styles.label}>Firma (signature):</Text>
          <Text style={styles.mono}>
            {truncateSignature(flow.signature)}
          </Text>

          <Text style={styles.label}>Resultado:</Text>
          <Text style={styles.result}>
            {flow.verified
              ? '✅ Verificado'
              : `❌ Fallido: ${flow.reason ?? 'desconocido'}`}
          </Text>

          <Text style={styles.label}>Timestamp:</Text>
          <Text style={styles.body}>
            {new Date(flow.timestamp).toLocaleString()}
          </Text>
        </View>
      )}

      <View style={styles.securityRow}>
        <Text style={styles.label}>Nivel de seguridad:</Text>
        <Text style={styles.mono}>{securityLevel}</Text>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={refresh}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel="Refrescar flujo de firma"
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Refrescar</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

function truncateSignature(signature: string): string {
  if (!signature || signature.length <= 20) {
    return signature || '(vacío)';
  }
  return `${signature.substring(0, 20)}...`;
}

const styles = StyleSheet.create({
  panel: {
    padding: 16,
    borderRadius: 10,
    backgroundColor: '#f8f9fa',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12,
  },
  loader: {
    marginVertical: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6c757d',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  flowContainer: {
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#495057',
    marginTop: 8,
  },
  mono: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#0d6efd',
    marginTop: 2,
  },
  result: {
    fontSize: 14,
    color: '#212529',
    marginTop: 2,
  },
  body: {
    fontSize: 14,
    color: '#495057',
    marginTop: 2,
  },
  securityRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
  },
  button: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#1A73E8',
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
