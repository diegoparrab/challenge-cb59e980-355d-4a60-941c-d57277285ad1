import React from 'react';
import {act, create, ReactTestRenderer} from 'react-test-renderer';
import {
  SensorCard,
  getSensorDisplayName,
  getSensorIcon,
  getStatusMessage,
} from '../SensorCard';
import {BiometricCapability} from '@domain/biometrics/entities/biometric-capability';

describe('getSensorDisplayName', () => {
  it('returns "Face ID" for FaceID', () => {
    expect(getSensorDisplayName('FaceID')).toBe('Face ID');
  });

  it('returns "Touch ID" for TouchID', () => {
    expect(getSensorDisplayName('TouchID')).toBe('Touch ID');
  });

  it('returns "Huella dactilar" for Fingerprint', () => {
    expect(getSensorDisplayName('Fingerprint')).toBe('Huella dactilar');
  });

  it('returns "Reconocimiento facial" for Face', () => {
    expect(getSensorDisplayName('Face')).toBe('Reconocimiento facial');
  });

  it('returns "Iris" for Iris', () => {
    expect(getSensorDisplayName('Iris')).toBe('Iris');
  });

  it('returns "Biometría desconocida" for Unknown', () => {
    expect(getSensorDisplayName('Unknown')).toBe('Biometría desconocida');
  });
});

describe('getSensorIcon', () => {
  it('returns 🚫 when reason is NO_HARDWARE', () => {
    expect(getSensorIcon('NO_HARDWARE', null)).toBe('🚫');
  });

  it('returns ⚠️ when reason is NOT_ENROLLED', () => {
    expect(getSensorIcon('NOT_ENROLLED', 'FaceID')).toBe('⚠️');
  });

  it('returns 🧑 for FaceID when AVAILABLE', () => {
    expect(getSensorIcon('AVAILABLE', 'FaceID')).toBe('🧑');
  });

  it('returns 🧑 for Face when AVAILABLE', () => {
    expect(getSensorIcon('AVAILABLE', 'Face')).toBe('🧑');
  });

  it('returns 👆 for TouchID when AVAILABLE', () => {
    expect(getSensorIcon('AVAILABLE', 'TouchID')).toBe('👆');
  });

  it('returns 👆 for Fingerprint when AVAILABLE', () => {
    expect(getSensorIcon('AVAILABLE', 'Fingerprint')).toBe('👆');
  });

  it('returns 👁️ for Iris when AVAILABLE', () => {
    expect(getSensorIcon('AVAILABLE', 'Iris')).toBe('👁️');
  });

  it('returns 🔐 for Unknown when AVAILABLE', () => {
    expect(getSensorIcon('AVAILABLE', 'Unknown')).toBe('🔐');
  });

  it('returns 🔐 for null type when AVAILABLE', () => {
    expect(getSensorIcon('AVAILABLE', null)).toBe('🔐');
  });
});

describe('getStatusMessage', () => {
  it('returns "Disponible" for AVAILABLE', () => {
    expect(getStatusMessage('AVAILABLE')).toBe('Disponible');
  });

  it('returns "No registrada" for NOT_ENROLLED', () => {
    expect(getStatusMessage('NOT_ENROLLED')).toBe('No registrada');
  });

  it('returns "Sin hardware biométrico" for NO_HARDWARE', () => {
    expect(getStatusMessage('NO_HARDWARE')).toBe('Sin hardware biométrico');
  });

  it('returns "Desconocido" for unknown reason', () => {
    expect(getStatusMessage('OTHER')).toBe('Desconocido');
  });
});

describe('SensorCard', () => {
  it('renders sensor name and status for AVAILABLE capability', () => {
    const capability: BiometricCapability = {
      available: true,
      biometryType: 'FaceID',
      reason: 'AVAILABLE',
    };

    let tree: ReactTestRenderer;
    act(() => {
      tree = create(<SensorCard capability={capability} />);
    });
    const json = JSON.stringify(tree!.toJSON());

    expect(json).toContain('Face ID');
    expect(json).toContain('Disponible');
    expect(json).toContain('🧑');
  });

  it('renders guidance text when reason is NOT_ENROLLED', () => {
    const capability: BiometricCapability = {
      available: false,
      biometryType: 'TouchID',
      reason: 'NOT_ENROLLED',
    };

    let tree: ReactTestRenderer;
    act(() => {
      tree = create(<SensorCard capability={capability} />);
    });
    const json = JSON.stringify(tree!.toJSON());

    expect(json).toContain('Touch ID');
    expect(json).toContain('No registrada');
    expect(json).toContain(
      'Ve a Ajustes del sistema para registrar tu biometría.',
    );
  });

  it('does not render guidance text when reason is AVAILABLE', () => {
    const capability: BiometricCapability = {
      available: true,
      biometryType: 'FaceID',
      reason: 'AVAILABLE',
    };

    let tree: ReactTestRenderer;
    act(() => {
      tree = create(<SensorCard capability={capability} />);
    });
    const json = JSON.stringify(tree!.toJSON());

    expect(json).not.toContain(
      'Ve a Ajustes del sistema para registrar tu biometría.',
    );
  });

  it('renders "Sin sensor" when biometryType is null', () => {
    const capability: BiometricCapability = {
      available: false,
      biometryType: null,
      reason: 'NO_HARDWARE',
    };

    let tree: ReactTestRenderer;
    act(() => {
      tree = create(<SensorCard capability={capability} />);
    });
    const json = JSON.stringify(tree!.toJSON());

    expect(json).toContain('Sin sensor');
    expect(json).toContain('Sin hardware biométrico');
    expect(json).toContain('🚫');
  });
});
