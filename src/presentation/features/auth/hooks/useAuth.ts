import {useState, useEffect, useCallback} from 'react';
import {Result, isOk, isErr} from '@core/types/result';
import {AppError} from '@core/errors/app-error';
import {AuthSession, Credentials} from '@domain/auth/entities';
import {container, secureStorageDatasource} from '@di/container';

export interface UseAuthResult {
  login: (credentials: Credentials) => Promise<Result<AuthSession, AppError>>;
  loginWithBiometrics: () => Promise<Result<AuthSession, AppError>>;
  logout: () => Promise<void>;
  enrollBiometrics: (userId: string) => Promise<Result<string, AppError>>;
  disableBiometrics: () => Promise<Result<void, AppError>>;
  isEnrolled: boolean;
  isEnrolledForCurrentUser: boolean;
  isRejected: boolean;
  isRejectedForCurrentUser: boolean;
  isLoading: boolean;
  error: AppError | null;
}

export function useAuth(currentUserId?: string): UseAuthResult {
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isEnrolledForCurrentUser, setIsEnrolledForCurrentUser] = useState(false);
  const [isRejected, setIsRejected] = useState(false);
  const [isRejectedForCurrentUser, setIsRejectedForCurrentUser] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);

  const refreshEnrollmentStatus = useCallback(async () => {
    const enrolledResult =
      await container.biometricEnrollmentRepository.isEnrolled();
    if (isOk(enrolledResult)) {
      setIsEnrolled(enrolledResult.value);
    }

    if (currentUserId) {
      const flagResult = await secureStorageDatasource.getEnrollmentFlag();
      if (isOk(flagResult)) {
        setIsEnrolledForCurrentUser(flagResult.value === currentUserId);
      }

      const rejectionResult = await secureStorageDatasource.getRejectionFlag();
      if (isOk(rejectionResult)) {
        setIsRejectedForCurrentUser(rejectionResult.value === currentUserId);
      }
    } else {
      setIsEnrolledForCurrentUser(false);
      setIsRejectedForCurrentUser(false);
    }

    const rejectedResult =
      await container.biometricEnrollmentRepository.isEnrollmentRejected();
    if (isOk(rejectedResult)) {
      setIsRejected(rejectedResult.value);
    }
  }, [currentUserId]);

  useEffect(() => {
    refreshEnrollmentStatus();
  }, [refreshEnrollmentStatus]);

  const login = useCallback(
    async (credentials: Credentials): Promise<Result<AuthSession, AppError>> => {
      setIsLoading(true);
      setError(null);

      const result =
        await container.loginWithCredentialsUseCase.execute(credentials);
      console.log("🚀 ~ useAuth ~ result:", result)

      if (isErr(result)) {
        setError(result.error);
      }

      await refreshEnrollmentStatus();
      setIsLoading(false);
      return result;
    },
    [refreshEnrollmentStatus],
  );

  const loginWithBiometrics = useCallback(async (): Promise<
    Result<AuthSession, AppError>
  > => {
    setIsLoading(true);
    setError(null);

    const result = await container.loginWithBiometricsUseCase.execute();

    if (isErr(result) && result.error.code !== 'BIOMETRIC_CANCELLED') {
      setError(result.error);
    }

    await refreshEnrollmentStatus();
    setIsLoading(false);
    return result;
  }, [refreshEnrollmentStatus]);

  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    const result = await container.logoutUseCase.execute();

    if (isErr(result)) {
      setError(result.error);
    }

    setIsLoading(false);
  }, []);

  const enrollBiometrics = useCallback(
    async (userId: string): Promise<Result<string, AppError>> => {
      setIsLoading(true);
      setError(null);

      const result = await container.enrollBiometricsUseCase.execute(userId);

      if (isErr(result)) {
        setError(result.error);
      }

      await refreshEnrollmentStatus();
      setIsLoading(false);
      return result;
    },
    [refreshEnrollmentStatus],
  );

  const disableBiometrics = useCallback(async (): Promise<
    Result<void, AppError>
  > => {
    setIsLoading(true);
    setError(null);

    const result = await container.disableBiometricsUseCase.execute();

    if (isErr(result)) {
      setError(result.error);
    }

    await refreshEnrollmentStatus();
    setIsLoading(false);
    return result;
  }, [refreshEnrollmentStatus]);

  return {
    login,
    loginWithBiometrics,
    logout,
    enrollBiometrics,
    disableBiometrics,
    isEnrolled,
    isEnrolledForCurrentUser,
    isRejected,
    isRejectedForCurrentUser,
    isLoading,
    error,
  };
}
