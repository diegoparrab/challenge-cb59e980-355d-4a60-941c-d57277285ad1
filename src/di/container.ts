import { BiometricDatasource } from '@data/biometrics/datasources/biometric.datasource';
import { BiometricRepositoryImpl } from '@data/biometrics/repositories/biometric.repository.impl';
import { CheckBiometricCapabilityUseCase } from '@domain/biometrics/usecases/check-biometric-capability';

const biometricDatasource = new BiometricDatasource();
const biometricRepository = new BiometricRepositoryImpl(biometricDatasource);
const checkBiometricCapabilityUseCase = new CheckBiometricCapabilityUseCase(
  biometricRepository,
);

export const container = {
  checkBiometricCapabilityUseCase,
} as const;
