import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import { Alert, Platform } from 'react-native';

// Context
import { AuthProvider } from './src/context/AuthContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { CategoriesProvider } from './src/context/CategoriesContext'; // ✅ NOUVEAU

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
    console.log('📱 Plateforme:', Platform.OS);
    console.log('🧪 Test réception deep links...');
  }, []);

  // ✅ GESTION AMÉLIORÉE DES DEEP LINKS - OPTIMISÉE ANDROID APK
  useEffect(() => {
    const handleDeepLink = async (url) => {
      console.log('🔗 Deep link reçu dans App.js:', url);
      console.log('📱 Plateforme:', Platform.OS);
      
      if (!url) return;

      // Vérifier si c'est un deep link d'authentification
      if (url.includes('myapp://auth') || url.includes('mobileapp://auth')) {
        try {
          console.log('🔐 Deep link d\'authentification détecté');
          console.log('🤖 Android APK - Traitement du deep link...');
          
          // ✅ CORRECTION ANDROID : Délai pour s'assurer que l'app est prête
          const delay = Platform.OS === 'android' ? 1000 : 500;
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // Utiliser la fonction du contexte pour traiter le deep link
          const result = await handleAuthDeepLink(url);
          
          if (result.success) {
            console.log('✅ Deep link traité avec succès (Android APK)');
            
            // ✅ AMÉLIORATION : Alert adapté pour Android
            Alert.alert(
              '🎉 Connexion Google réussie', 
              `Bienvenue ${result.user?.firstName || result.user?.email || 'utilisateur'} !`,
              [{ 
                text: Platform.OS === 'android' ? 'Parfait !' : 'OK', 
                style: 'default',
                onPress: () => {
                  console.log('✅ Utilisateur a confirmé la connexion');
                }
              }],
              { cancelable: false }
            );
          } else {
            console.error('❌ Erreur traitement deep link Android:', result.error);
            
            // ✅ AMÉLIORATION : Gestion d'erreur spécifique Android
            Alert.alert(
              '❌ Erreur de connexion', 
              result.error || 'Une erreur est survenue lors de la connexion Google',
              [{ 
                text: Platform.OS === 'android' ? 'Réessayer' : 'OK', 
                style: 'default',
                onPress: () => {
                  console.log('🔄 Utilisateur va réessayer');
                }
              }],
              { cancelable: true }
            );
          }
        } catch (error) {
          console.error('❌ Erreur inattendue deep link Android:', error);
          
          Alert.alert(
            '❌ Erreur technique', 
            'Une erreur technique s\'est produite lors de la connexion. Veuillez réessayer.',
            [{ 
              text: 'Compris', 
              style: 'default',
              onPress: () => {
                console.log('🔄 Erreur technique confirmée par utilisateur');
              }
            }],
            { cancelable: true }
          );
        }
      } else if (url.includes('myapp://') || url.includes('mobileapp://')) {
        // Autres types de deep links (ajouts futurs)
        console.log('🔗 Autre type de deep link:', url);
      }
    };

    // ✅ ÉCOUTER LES DEEP LINKS PENDANT QUE L'APP EST OUVERTE (OPTIMISÉ ANDROID)
    const subscription = Linking.addEventListener('url', ({ url }) => {
      console.log('📱 Deep link reçu (app ouverte - Android APK):', url);
      console.log('⏰ Timestamp:', new Date().toISOString());
      handleDeepLink(url);
    });

    // ✅ VÉRIFIER S'IL Y A UN DEEP LINK AU DÉMARRAGE (OPTIMISÉ ANDROID APK)
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('🚀 Deep link au démarrage (Android APK):', url);
        console.log('⏰ Timestamp démarrage:', new Date().toISOString());
        
        // ✅ CORRECTION : Attendre plus longtemps pour Android APK
        const startupDelay = Platform.OS === 'android' ? 2500 : 1500;
        setTimeout(() => {
          console.log('🔄 Traitement du deep link de démarrage...');
          handleDeepLink(url);
        }, startupDelay);
      } else {
        console.log('ℹ️ Aucun deep link au démarrage');
      }
    }).catch((error) => {
      console.error('❌ Erreur récupération initial URL (Android):', error);
    });

    // ✅ LOG DE DEBUG POUR ANDROID
    console.log('👂 Écoute des deep links activée pour:', Platform.OS);
    console.log('🔗 Schemes écoutés: myapp://, mobileapp://');

    // Nettoyer l'écouteur
    return () => {
      console.log('🧹 Nettoyage des listeners de deep links');
      subscription?.remove();
    };
  }, [handleAuthDeepLink]);

  // ✅ AMÉLIORATION : Log d'état de l'app
  useEffect(() => {
    console.log('🔍 État de l\'app:');
    console.log('  - isLoading:', isLoading);
    console.log('  - isAuthenticated:', isAuthenticated);
    console.log('  - user:', user?.email || 'Non connecté');
    console.log('  - plateforme:', Platform.OS);
  }, [isLoading, isAuthenticated, user]);

  // Afficher le loading pendant l'initialisation
  if (isLoading) {
    return <Loading fullScreen gradient text="Chargement de l'application..." />;
  }

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          // Utilisateur connecté - Navigation principale avec notifications
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

// ✅ COMPOSANT RACINE MODIFIÉ AVEC CATEGORIESPROVIDER
export default function App() {
  console.log('📱 Démarrage de l\'application React Native...');
  console.log('🔗 Deep link schemes configurés: myapp://, mobileapp://');
  console.log('🤖 Plateforme détectée:', Platform.OS);
  console.log('⏰ Timestamp démarrage:', new Date().toISOString());
  console.log('🔔 Notifications temps réel activées');
  console.log('📂 Cache des catégories intelligent activé'); // ✅ NOUVEAU

  return (
    <AuthProvider>
      <CategoriesProvider>
        <NotificationProvider>
          <AppNavigator />
        </NotificationProvider>
      </CategoriesProvider>
    </AuthProvider>
  );
}