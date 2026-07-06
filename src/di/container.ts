import { BiometricDatasource } from '@data/biometrics/datasources/biometric.datasource';
import { BiometricKeysDatasource } from '@data/biometrics/datasources/biometric-keys.datasource';
import { BiometricRepositoryImpl } from '@data/biometrics/repositories/biometric.repository.impl';
import { BiometricKeysRepositoryImpl } from '@data/biometrics/repositories/biometric-keys.repository.impl';
import { FakeAuthBackend } from '@data/auth/datasources/fake-auth-backend';
import { SecureStorageDatasource } from '@data/auth/datasources/secure-storage.datasource';
import { AuthRepositoryImpl } from '@data/auth/repositories/auth.repository.impl';
import { BiometricEnrollmentRepositoryImpl } from '@data/auth/repositories/biometric-enrollment.repository.impl';
import { CheckBiometricCapabilityUseCase } from '@domain/biometrics/usecases/check-biometric-capability';
import { AuthenticateWithBiometricsUseCase } from '@domain/biometrics/usecases/authenticate-with-biometrics';
import { LoginWithCredentialsUseCase } from '@domain/auth/usecases/login-with-credentials';
import { EnrollBiometricsUseCase } from '@domain/auth/usecases/enroll-biometrics';
import { LoginWithBiometricsUseCase } from '@domain/auth/usecases/login-with-biometrics';
import { DisableBiometricsUseCase } from '@domain/auth/usecases/disable-biometrics';
import { LogoutUseCase } from '@domain/auth/usecases/logout';
import { GetSessionStateUseCase } from '@domain/auth/usecases/get-session-state';

const biometricDatasource = new BiometricDatasource();
const biometricKeysDatasource = new BiometricKeysDatasource();
const fakeAuthBackend = new FakeAuthBackend();
const secureStorageDatasource = new SecureStorageDatasource();

const biometricRepository = new BiometricRepositoryImpl(biometricDatasource);
const biometricKeysRepository = new BiometricKeysRepositoryImpl(
  biometricKeysDatasource,
);
const authRepository = new AuthRepositoryImpl(
  fakeAuthBackend,
  secureStorageDatasource,
);
const biometricEnrollmentRepository = new BiometricEnrollmentRepositoryImpl(
  biometricKeysRepository,
  fakeAuthBackend,
  secureStorageDatasource,
);

const checkBiometricCapabilityUseCase = new CheckBiometricCapabilityUseCase(
  biometricRepository,
);
const authenticateWithBiometricsUseCase =
  new AuthenticateWithBiometricsUseCase(biometricRepository);
const loginWithCredentialsUseCase = new LoginWithCredentialsUseCase(
  authRepository,
);
const enrollBiometricsUseCase = new EnrollBiometricsUseCase(
  biometricEnrollmentRepository,
);
const loginWithBiometricsUseCase = new LoginWithBiometricsUseCase(
  biometricEnrollmentRepository,
  authRepository,
);
const disableBiometricsUseCase = new DisableBiometricsUseCase(
  biometricEnrollmentRepository,
);
const logoutUseCase = new LogoutUseCase(authRepository);
const getSessionStateUseCase = new GetSessionStateUseCase(authRepository);

export { fakeAuthBackend, secureStorageDatasource };

export const container = {
  checkBiometricCapabilityUseCase,
  authenticateWithBiometricsUseCase,
  loginWithCredentialsUseCase,
  enrollBiometricsUseCase,
  loginWithBiometricsUseCase,
  disableBiometricsUseCase,
  logoutUseCase,
  getSessionStateUseCase,
  biometricEnrollmentRepository,
} as const;
