import React, {useCallback, useMemo, useState} from 'react';
import {MainLayout} from '@presentation/shared/components/MainLayout';
import {TabBar, TabDefinition} from '@presentation/shared/components/TabBar';
import {AboutScreen} from '@presentation/features/auth/screens/AboutScreen';

interface Props {
  onLogout: () => void;
}

const tabs: TabDefinition[] = [
  {key: 'home', label: 'Inicio', icon: '🏠'},
];

function getTitle(tab: string): string {
  switch (tab) {
    case 'home':
      return 'Inicio';
    default:
      return 'Inicio';
  }
}

export function HomeScreen({onLogout}: Props) {
  const [activeTab, setActiveTab] = useState(tabs[0].key);

  const handleTabPress = useCallback((key: string) => {
    setActiveTab(key);
  }, []);

  const content = useMemo(() => {
    switch (activeTab) {
      case 'home':
        return <AboutScreen />;
      default:
        return null;
    }
  }, [activeTab]);

  return (
    <MainLayout title={getTitle(activeTab)} onLogout={onLogout}>
      {content}
      <TabBar tabs={tabs} activeTab={activeTab} onTabPress={handleTabPress} />
    </MainLayout>
  );
}
