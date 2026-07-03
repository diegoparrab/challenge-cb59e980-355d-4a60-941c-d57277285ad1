export type BiometryType =
  | 'FaceID'
  | 'TouchID'
  | 'Fingerprint'
  | 'Face'
  | 'Iris'
  | 'Unknown';

export type CapabilityReason = 'NO_HARDWARE' | 'NOT_ENROLLED' | 'AVAILABLE';

export interface BiometricCapability {
  readonly available: boolean;
  readonly biometryType: BiometryType | null;
  readonly reason: CapabilityReason;
}

/**
 * Factory function enforcing the invariant:
 * available === true if and only if reason === 'AVAILABLE'
 */
export function createBiometricCapability(
  reason: CapabilityReason,
  biometryType: BiometryType | null,
): BiometricCapability {
  return {
    available: reason === 'AVAILABLE',
    biometryType,
    reason,
  };
}
