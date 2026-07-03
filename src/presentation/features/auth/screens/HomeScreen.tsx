import React, {useCallback, useMemo, useState} from 'react';
import {useNavigation, CommonActions} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {MainLayout} from '@presentation/shared/components/MainLayout';
import {TabBar, TabDefinition} from '@presentation/shared/components/TabBar';
import {AboutScreen} from '@presentation/features/auth/screens/AboutScreen';
import {HardwareInspectorScreen} from '@presentation/features/biometrics/screens/HardwareInspectorScreen';
import {RootStackParamList} from '@presentation/navigation/types';

type HomeNav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const tabs: TabDefinition[] = [
  {key: 'home', label: 'Inicio', icon: '🏠'},
  {key: 'inspector', label: 'Inspector', icon: '🔍'},
];

function getTitle(tab: string): string {
  switch (tab) {
    case 'home':
      return 'Inicio';
    case 'inspector':
      return 'Hardware Inspector';
    default:
      return 'Inicio';
  }
}

export function HomeScreen() {
  const navigation = useNavigation<HomeNav>();
  const [activeTab, setActiveTab] = useState(tabs[0].key);

  const handleLogout = useCallback(() => {
    navigation.dispatch(
      CommonActions.reset({index: 0, routes: [{name: 'Login'}]}),
    );
  }, [navigation]);

  const handleTabPress = useCallback((key: string) => {
    setActiveTab(key);
  }, []);

  const content = useMemo(() => {
    switch (activeTab) {
      case 'home':
        return <AboutScreen />;
      case 'inspector':
        return <HardwareInspectorScreen />;
      default:
        return null;
    }
  }, [activeTab]);

  return (
    <MainLayout title={getTitle(activeTab)} onLogout={handleLogout}>
      {content}
      <TabBar tabs={tabs} activeTab={activeTab} onTabPress={handleTabPress} />
    </MainLayout>
  );
}
