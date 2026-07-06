export type BiometricErrorCode =
  | 'NO_HARDWARE'
  | 'NOT_ENROLLED'
  | 'USER_CANCELLED'
  | 'LOCKOUT'
  | 'UNKNOWN';

export type SuggestedAction =
  | 'ENROLL'
  | 'WAIT'
  | 'NONE';

export interface ErrorMetadata {
  readonly recoverable: boolean;
  readonly suggestedAction: SuggestedAction;
  readonly message: string;
}

export interface BiometricError {
  readonly code: BiometricErrorCode;
  readonly metadata: ErrorMetadata;
  readonly nativeCode?: string;
  readonly timestamp: number;
}

const ERROR_METADATA_MAP: Record<BiometricErrorCode, ErrorMetadata> = {
  NO_HARDWARE: {
    recoverable: false,
    suggestedAction: 'NONE',
    message: 'Este dispositivo no cuenta con sensor biométrico.',
  },
  NOT_ENROLLED: {
    recoverable: true,
    suggestedAction: 'ENROLL',
    message: 'No hay datos biométricos registrados. Configúralos en Ajustes.',
  },
  USER_CANCELLED: {
    recoverable: true,
    suggestedAction: 'NONE',
    message: 'Autenticación cancelada.',
  },
  LOCKOUT: {
    recoverable: true,
    suggestedAction: 'WAIT',
    message:
      'Demasiados intentos fallidos. Espera un momento antes de reintentar.',
  },
  UNKNOWN: {
    recoverable: false,
    suggestedAction: 'NONE',
    message: 'Ocurrió un error inesperado. Intenta más tarde.',
  },
};

export function getErrorMetadata(code: BiometricErrorCode): ErrorMetadata {
  return ERROR_METADATA_MAP[code];
}

export function createBiometricError(
  code: BiometricErrorCode,
  nativeCode?: string,
): BiometricError {
  return {
    code,
    metadata: getErrorMetadata(code),
    nativeCode,
    timestamp: Date.now(),
  };
}
