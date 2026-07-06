import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { EnrollmentModal } from '../EnrollmentModal';
import { AppError } from '@core/errors/app-error';

describe('EnrollmentModal', () => {
  const defaultProps = {
    visible: true,
    onAccept: jest.fn(),
    onDecline: jest.fn(),
    isLoading: false,
    error: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when not visible', () => {
    let tree: ReactTestRenderer;
    act(() => {
      tree = create(<EnrollmentModal {...defaultProps} visible={false} />);
    });

    const json = tree!.toJSON();
    expect(json).toBeNull();
  });

  it('renders title and description when visible', () => {
    let tree: ReactTestRenderer;
    act(() => {
      tree = create(<EnrollmentModal {...defaultProps} />);
    });

    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('Activar login biométrico');
    expect(json).toContain('huella o rostro');
  });

  it('renders accept and decline buttons', () => {
    let tree: ReactTestRenderer;
    act(() => {
      tree = create(<EnrollmentModal {...defaultProps} />);
    });

    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('Activar');
    expect(json).toContain('No, gracias');
  });

  it('calls onAccept when accept button is pressed', () => {
    let tree: ReactTestRenderer;
    act(() => {
      tree = create(<EnrollmentModal {...defaultProps} />);
    });

    const acceptButton = tree!.root.findByProps({
      accessibilityLabel: 'Activar autenticación biométrica',
    });
    act(() => {
      acceptButton.props.onPress();
    });

    expect(defaultProps.onAccept).toHaveBeenCalledTimes(1);
  });

  it('calls onDecline when decline button is pressed', () => {
    let tree: ReactTestRenderer;
    act(() => {
      tree = create(<EnrollmentModal {...defaultProps} />);
    });

    const declineButton = tree!.root.findByProps({
      accessibilityLabel: 'Rechazar autenticación biométrica permanentemente',
    });
    act(() => {
      declineButton.props.onPress();
    });

    expect(defaultProps.onDecline).toHaveBeenCalledTimes(1);
  });

  it('shows loading indicator and hides buttons when isLoading is true', () => {
    let tree: ReactTestRenderer;
    act(() => {
      tree = create(<EnrollmentModal {...defaultProps} isLoading={true} />);
    });

    const json = JSON.stringify(tree!.toJSON());
    expect(json).not.toContain('No, gracias');

    const indicator = tree!.root.findByProps({
      accessibilityLabel: 'Procesando inscripción biométrica',
    });
    expect(indicator).toBeDefined();

    const buttons = tree!.root.findAllByProps({ accessibilityRole: 'button' });
    expect(buttons).toHaveLength(0);
  });

  it('displays error message when error is provided', () => {
    const error = new AppError('AUTH_ENROLLMENT_FAILED', 'No se pudo generar el par de claves');
    let tree: ReactTestRenderer;
    act(() => {
      tree = create(<EnrollmentModal {...defaultProps} error={error} />);
    });

    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('No se pudo generar el par de claves');
  });

  it('does not display error section when error is null', () => {
    let tree: ReactTestRenderer;
    act(() => {
      tree = create(<EnrollmentModal {...defaultProps} error={null} />);
    });

    const json = JSON.stringify(tree!.toJSON());
    expect(json).not.toContain('FEF2F2');
  });

  it('shows buttons alongside error for retry capability', () => {
    const error = new AppError('AUTH_ENROLLMENT_FAILED', 'Error de inscripción');
    let tree: ReactTestRenderer;
    act(() => {
      tree = create(
        <EnrollmentModal {...defaultProps} error={error} isLoading={false} />,
      );
    });

    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('Error de inscripción');
    expect(json).toContain('Activar');
    expect(json).toContain('No, gracias');
  });

  it('has accessible modal container', () => {
    let tree: ReactTestRenderer;
    act(() => {
      tree = create(<EnrollmentModal {...defaultProps} />);
    });

    const modal = tree!.root.findByProps({ accessibilityViewIsModal: true });
    expect(modal).toBeDefined();
  });
});
