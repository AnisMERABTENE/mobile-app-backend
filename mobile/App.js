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

// Empêcher le splash screen de se cacher automatiquement
SplashScreen.preventAutoHideAsync();

const Stack = createNativeStackNavigator();

// Composant principal de navigation
const AppNavigator = () => {
  const { isAuthenticated, isLoading, user, handleAuthDeepLink } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      // Cacher le splash screen une fois le chargement terminé
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  // ✅ DEBUG SÉPARÉ
  useEffect(() => {
    console.log('🔧 Debug: App démarrée, écoute des deep links...');
    console.log('🧪 Test réception deep links...');
  }, []);

  // ✅ GESTION AMÉLIORÉE DES DEEP LINKS - USEEFFECT SÉPARÉ
  useEffect(() => {
    const handleDeepLink = async (url) => {
      console.log('🔗 Deep link reçu dans App.js:', url);
      
      if (!url) return;

      // Vérifier si c'est un deep link d'authentification
      if (url.includes('myapp://auth') || url.includes('mobileapp://auth')) {
        try {
          console.log('🔐 Deep link d\'authentification détecté');
          
          // Utiliser la fonction du contexte pour traiter le deep link
          const result = await handleAuthDeepLink(url);
          
          if (result.success) {
            console.log('✅ Deep link traité avec succès');
            Alert.alert(
              'Connexion réussie', 
              `Bienvenue ${result.user?.firstName || 'utilisateur'} !`
            );
          } else {
            console.error('❌ Erreur traitement deep link:', result.error);
            Alert.alert('Erreur de connexion', result.error);
          }
        } catch (error) {
          console.error('❌ Erreur inattendue deep link:', error);
          Alert.alert('Erreur', 'Une erreur inattendue s\'est produite');
        }
      } else if (url.includes('myapp://') || url.includes('mobileapp://')) {
        // Autres types de deep links (ajouts futurs)
        console.log('🔗 Autre type de deep link:', url);
      }
    };

    // Écouter les deep links pendant que l'app est ouverte
    const subscription = Linking.addEventListener('url', ({ url }) => {
      console.log('📱 Deep link reçu (app ouverte):', url);
      handleDeepLink(url);
    });

    // Vérifier s'il y a un deep link au démarrage de l'app
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('🚀 Deep link au démarrage:', url);
        // Attendre un peu que l'app soit complètement chargée
        setTimeout(() => {
          handleDeepLink(url);
        }, 1500);
      }
    }).catch((error) => {
      console.error('❌ Erreur récupération initial URL:', error);
    });

    // Nettoyer l'écouteur
    return () => {
      subscription?.remove();
    };
  }, [handleAuthDeepLink]);

  // Afficher le loading pendant l'initialisation
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
  console.log('🔗 Deep link schemes configurés: myapp://, mobileapp://');

  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}