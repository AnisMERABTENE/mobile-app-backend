import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import { Alert } from 'react-native';

// Context
import { AuthProvider } from './src/context/AuthContext';

// Navigation
import AuthNavigator from './src/navigation/AuthNavigator';
import MainNavigator from './src/navigation/MainNavigator';

// Hooks
import { useAuth } from './src/context/AuthContext';

// Loading
import Loading from './src/components/Loading';

// Services
import StorageService from './src/utils/storage';
import AuthService from './src/services/authService';

// Empêcher le splash screen de se cacher automatiquement
SplashScreen.preventAutoHideAsync();

const Stack = createNativeStackNavigator();

// Composant principal de navigation
const AppNavigator = () => {
  const { isAuthenticated, isLoading, user, dispatch } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      // Cacher le splash screen une fois le chargement terminé
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  // Gestion des deep links pour Google OAuth
  useEffect(() => {
    const handleDeepLink = async (url) => {
      console.log('🔗 Deep link reçu:', url);
      
      if (url && url.includes('auth/google/callback')) {
        try {
          // Extraire le token de l'URL
          const urlObj = new URL(url);
          const token = urlObj.searchParams.get('token');
          const error = urlObj.searchParams.get('error');

          if (error) {
            console.error('❌ Erreur OAuth:', error);
            Alert.alert('Erreur de connexion', 'Une erreur est survenue lors de la connexion avec Google');
            return;
          }

          if (token) {
            console.log('✅ Token reçu via deep link');
            
            // Sauvegarder le token temporairement
            await StorageService.saveAuthToken(token);
            
            // Récupérer le profil utilisateur avec ce token
            const profileResult = await AuthService.verifyToken();
            
            if (profileResult.success) {
              const { user } = profileResult.data;
              
              // Sauvegarder les données utilisateur
              await StorageService.saveUserData(user);
              
              // Mettre à jour le contexte d'authentification
              dispatch({
                type: 'LOGIN_SUCCESS',
                payload: { user, token }
              });
              
              console.log('✅ Connexion Google complète pour:', user.email);
              Alert.alert('Connexion réussie', `Bienvenue ${user.firstName} !`);
            } else {
              console.error('❌ Erreur récupération profil:', profileResult.error);
              await StorageService.removeAuthToken();
              Alert.alert('Erreur', 'Impossible de récupérer votre profil');
            }
          }
        } catch (error) {
          console.error('❌ Erreur traitement deep link:', error);
          Alert.alert('Erreur', 'Une erreur est survenue lors du traitement de la connexion');
        }
      }
    };

    // Écouter les deep links
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    // Vérifier s'il y a un deep link au démarrage
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    return () => {
      subscription?.remove();
    };
  }, [dispatch]);

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