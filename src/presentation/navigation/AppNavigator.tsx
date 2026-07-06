import React from 'react';
import {ActivityIndicator, View, StyleSheet} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {LoginScreen} from '@presentation/features/auth/screens/LoginScreen';
import {HomeScreen} from '@presentation/features/auth/screens/HomeScreen';
import {useSession} from '@presentation/features/auth/hooks/useSession';
import {AuthStackParamList, AppStackParamList} from './types';

const AuthStackNavigator = createNativeStackNavigator<AuthStackParamList>();
const AppStackNavigator = createNativeStackNavigator<AppStackParamList>();

function AuthStack() {
  return (
    <AuthStackNavigator.Navigator screenOptions={{headerShown: false}}>
      <AuthStackNavigator.Screen name="Login" component={LoginScreen} />
    </AuthStackNavigator.Navigator>
  );
}

function AppStack() {
  return (
    <AppStackNavigator.Navigator screenOptions={{headerShown: false}}>
      <AppStackNavigator.Screen name="Home" component={HomeScreen} />
    </AppStackNavigator.Navigator>
  );
}

export function AppNavigator() {
  const {session, isLoading} = useSession();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {session ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
