import { BiometricDatasource } from '@data/biometrics/datasources/biometric.datasource';
import { BiometricRepositoryImpl } from '@data/biometrics/repositories/biometric.repository.impl';
import { CheckBiometricCapabilityUseCase } from '@domain/biometrics/usecases/check-biometric-capability';
import { AuthenticateWithBiometricsUseCase } from '@domain/biometrics/usecases/authenticate-with-biometrics';

const biometricDatasource = new BiometricDatasource();
const biometricRepository = new BiometricRepositoryImpl(biometricDatasource);
const checkBiometricCapabilityUseCase = new CheckBiometricCapabilityUseCase(
  biometricRepository,
);
const authenticateWithBiometricsUseCase =
  new AuthenticateWithBiometricsUseCase(biometricRepository);

export const container = {
  checkBiometricCapabilityUseCase,
  authenticateWithBiometricsUseCase,
} as const;
