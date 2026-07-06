export {
  type BiometryType,
  type CapabilityReason,
  type BiometricCapability,
  createBiometricCapability,
} from './biometric-capability';

export { type PromptConfig, type BiometricAuthResult } from './biometric-auth';

export {
  type BiometricErrorCode,
  type SuggestedAction,
  type ErrorMetadata,
  type BiometricError,
  getErrorMetadata,
  createBiometricError,
} from './biometric-error';
