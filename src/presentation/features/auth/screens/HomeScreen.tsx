import React, {useCallback, useMemo, useState} from 'react';
import {isOk} from '@core/types/result';
import {MainLayout} from '@presentation/shared/components/MainLayout';
import {TabBar, TabDefinition} from '@presentation/shared/components/TabBar';
import {AboutScreen} from '@presentation/features/auth/screens/AboutScreen';
import {SettingsScreen} from '@presentation/features/auth/screens/SettingsScreen';
import {HardwareInspectorScreen} from '@presentation/features/biometrics/screens/HardwareInspectorScreen';
import {EnrollmentModal} from '../components/EnrollmentModal';
import {secureStorageDatasource} from '@di/container';
import {useAuth} from '../hooks/useAuth';
import {useSession} from '../hooks/useSession';

const tabs: TabDefinition[] = [
  {key: 'home', label: 'Inicio', icon: '🏠'},
  {key: 'inspector', label: 'Inspector', icon: '🔍'},
  {key: 'settings', label: 'Ajustes', icon: '⚙️'},
];

function getTitle(tab: string): string {
  switch (tab) {
    case 'home':
      return 'Inicio';
    case 'inspector':
      return 'Hardware Inspector';
    case 'settings':
      return 'Ajustes';
    default:
      return 'Inicio';
  }
}

export function HomeScreen() {
  const {session, clearSession} = useSession();
  const {
    logout,
    enrollBiometrics,
    disableBiometrics,
    isEnrolled,
    isEnrolledForCurrentUser,
    isRejectedForCurrentUser,
    isLoading,
    error,
  } = useAuth(session?.userId);
  const [activeTab, setActiveTab] = useState(tabs[0].key);
  const [showEnrollmentModal, setShowEnrollmentModal] = useState(true);

  const enrollmentVisible =
    showEnrollmentModal && !isEnrolled && !isRejectedForCurrentUser && session !== null;

  const handleLogout = useCallback(async () => {
    await logout();
    clearSession();
  }, [logout, clearSession]);

  const handleTabPress = useCallback((key: string) => {
    setActiveTab(key);
  }, []);

  const handleExpireSession = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const handleEnrollFromSettings = useCallback(async () => {
    if (session) {
      await enrollBiometrics(session.userId);
    }
  }, [enrollBiometrics, session]);

  const handleDisableBiometrics = useCallback(async () => {
    await disableBiometrics();
  }, [disableBiometrics]);

  const handleEnrollAccept = useCallback(async () => {
    if (session) {
      const result = await enrollBiometrics(session.userId);
      if (isOk(result)) {
        setShowEnrollmentModal(false);
      }
    }
  }, [enrollBiometrics, session]);

  const handleEnrollDecline = useCallback(async () => {
    if (session) {
      await secureStorageDatasource.storeRejectionFlag(session.userId);
    }
    setShowEnrollmentModal(false);
  }, [session]);

  const content = useMemo(() => {
    switch (activeTab) {
      case 'home':
        return <AboutScreen />;
      case 'inspector':
        return <HardwareInspectorScreen />;
      case 'settings':
        return (
          <SettingsScreen
            session={session}
            isEnrolled={isEnrolledForCurrentUser}
            isLoading={isLoading}
            onEnrollBiometrics={handleEnrollFromSettings}
            onDisableBiometrics={handleDisableBiometrics}
            onExpireSession={handleExpireSession}
          />
        );
      default:
        return null;
    }
  }, [
    activeTab,
    session,
    isEnrolledForCurrentUser,
    isLoading,
    handleEnrollFromSettings,
    handleDisableBiometrics,
    handleExpireSession,
  ]);

  return (
    <MainLayout title={getTitle(activeTab)} onLogout={handleLogout}>
      {content}
      <TabBar tabs={tabs} activeTab={activeTab} onTabPress={handleTabPress} />
      <EnrollmentModal
        visible={enrollmentVisible}
        onAccept={handleEnrollAccept}
        onDecline={handleEnrollDecline}
        isLoading={isLoading}
        error={error}
      />
    </MainLayout>
  );
}
