import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';

// Context
import { AuthProvider } from './src/context/AuthContext';

// Navigation
import AuthNavigator from './src/navigation/AuthNavigator';
import MainNavigator from './src/navigation/MainNavigator';

// Hooks
import { useAuth } from './src/context/AuthContext';

// Loading
import Loading from './src/components/Loading';

// Empêcher le splash screen de se cacher automatiquement
SplashScreen.preventAutoHideAsync();

const Stack = createNativeStackNavigator();

// Composant principal de navigation
const AppNavigator = () => {
  const { isAuthenticated, isLoading, user } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      // Cacher le splash screen une fois le chargement terminé
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  if (isLoading) {
    return <Loading fullScreen gradient text="Chargement de l'application..." />;
  }

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          // Utilisateur connecté - Navigation principale
          <Stack.Screen 
            name="Main" 
            component={MainNavigator}
            options={{ animationTypeForReplace: 'push' }}
          />
        ) : (
          // Utilisateur non connecté - Navigation d'authentification
          <Stack.Screen 
            name="Auth" 
            component={AuthNavigator}
            options={{ animationTypeForReplace: 'pop' }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

// Composant racine de l'application
export default function App() {
  console.log('📱 Démarrage de l\'application React Native...');

  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}