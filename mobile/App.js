import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

// Context
import { AuthProvider, useAuth } from './src/context/AuthContext';

// Screens
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import HomeScreen from './src/screens/main/HomeScreen';

// Components
import Loading from './src/components/Loading';

// Test de connexion API
import { testApiConnection } from './src/services/api';

const Stack = createNativeStackNavigator();

// Navigateur d'authentification
const AuthNavigator = () => (
  <Stack.Navigator 
    screenOptions={{ 
      headerShown: false,
      animation: 'slide_from_right',
      gestureEnabled: true,
    }}
  >
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

// Navigateur principal (utilisateur connecté)
const MainNavigator = () => (
  <Stack.Navigator 
    screenOptions={{ 
      headerShown: false,
      animation: 'slide_from_right',
      gestureEnabled: true,
    }}
  >
    <Stack.Screen name="Home" component={HomeScreen} />
  </Stack.Navigator>
);

// Composant principal de navigation
const AppNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // Tester la connexion API au démarrage
    testApiConnection();
  }, []);

  // Afficher l'écran de chargement pendant la vérification d'auth
  if (isLoading) {
    return (
      <Loading 
        fullScreen 
        gradient 
        text="Connexion au serveur..." 
      />
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

// Composant App principal
export default function App() {
  console.log('🚀 Démarrage de l\'application mobile...');

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}