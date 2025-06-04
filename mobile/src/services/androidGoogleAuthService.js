import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

// Configuration optimisée pour Android
WebBrowser.maybeCompleteAuthSession();

/**
 * Service Google Auth optimisé pour Android APK
 */
class AndroidGoogleAuthService {
  
  constructor() {
    this.baseURL = 'https://mobile-app-backend-production-5d60.up.railway.app';
    this.timeout = 120000; // 2 minutes timeout
    console.log('🤖 Android Google Auth Service configuré');
  }

  /**
   * Connexion Google OAuth optimisée pour Android APK
   */
  async signInWithGoogle() {
    try {
      console.log('🔵 Démarrage connexion Google pour Android APK...');

      // 1. Préparer l'écoute des deep links AVANT d'ouvrir le navigateur
      const authPromise = this.setupAuthListener();

      // 2. Ouvrir le navigateur avec configuration spéciale Android
      const authUrl = `${this.baseURL}/api/auth/google?mobile=true&platform=android&apk=true&timestamp=${Date.now()}`;
      
      console.log('🌐 Ouverture URL:', authUrl);

      // Configuration spéciale pour APK Android
      const browserResult = await WebBrowser.openBrowserAsync(authUrl, {
        // Configuration critique pour Android APK
        dismissButtonStyle: 'close',
        readerMode: false,
        enableBarCollapsing: false,
        showInRecents: false,
        enableDefaultShareMenuItem: false,
        // IMPORTANT : Forcer le retour vers l'app
        preferredBrowserPackage: null, // Utilise le navigateur par défaut
        // Ajouter des en-têtes pour identifier l'APK
        additionalHeaders: {
          'X-Mobile-App': 'Android-APK',
          'X-Deep-Link-Expected': 'myapp://auth'
        }
      });

      console.log('📱 Résultat navigateur:', browserResult.type);

      if (browserResult.type === 'cancel') {
        console.log('❌ Utilisateur a annulé');
        return {
          success: false,
          error: 'Authentification annulée',
          cancelled: true
        };
      }

      // 3. Attendre le résultat de l'authentification
      return await authPromise;

    } catch (error) {
      console.error('❌ Erreur Google Auth Android:', error);
      return {
        success: false,
        error: 'Erreur technique lors de l\'authentification',
        cancelled: false
      };
    }
  }

  /**
   * Configurer l'écoute des deep links avec timeout robuste
   */
  async setupAuthListener() {
    return new Promise((resolve) => {
      let resolved = false;
      let timeoutId;
      let linkingSubscription;

      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        if (linkingSubscription) linkingSubscription.remove();
      };

      const resolveOnce = (result) => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve(result);
        }
      };

      // Timeout après 2 minutes
      timeoutId = setTimeout(() => {
        console.log('⏰ Timeout - Aucun deep link reçu après 2 minutes');
        resolveOnce({
          success: false,
          error: 'Timeout - Authentification non terminée',
          cancelled: true
        });
      }, this.timeout);

      // Écouter les deep links avec gestion d'erreur robuste
      try {
        linkingSubscription = Linking.addEventListener('url', async ({ url }) => {
          console.log('🔗 Deep link reçu:', url);
          
          try {
            const result = await this.parseAndValidateAuthResult(url);
            resolveOnce(result);
          } catch (parseError) {
            console.error('❌ Erreur parsing deep link:', parseError);
            resolveOnce({
              success: false,
              error: 'Erreur lors du traitement du résultat'
            });
          }
        });

        console.log('👂 Écoute des deep links activée (Android APK)');

      } catch (listenerError) {
        console.error('❌ Erreur création listener:', listenerError);
        resolveOnce({
          success: false,
          error: 'Erreur lors de la configuration de l\'écoute'
        });
      }
    });
  }

  /**
   * Parser et valider le résultat d'authentification
   */
  async parseAndValidateAuthResult(url) {
    try {
      console.log('🔍 Parsing résultat auth pour Android:', url);

      // Vérifier que c'est bien notre deep link
      if (!url || !url.includes('myapp://auth')) {
        console.log('⚠️ URL non reconnue:', url);
        return {
          success: false,
          error: 'URL de retour non reconnue',
          cancelled: false
        };
      }

      // Parser les paramètres URL
      const urlObj = new URL(url.replace('myapp://', 'https://temp.com/'));
      const token = urlObj.searchParams.get('token');
      const error = urlObj.searchParams.get('error');
      const success = urlObj.searchParams.get('success');
      const email = urlObj.searchParams.get('email');

      console.log('📋 Paramètres extraits:', {
        hasToken: !!token,
        tokenLength: token?.length,
        error: error,
        success: success,
        email: email
      });

      // Gestion des erreurs
      if (error) {
        console.error('❌ Erreur OAuth reçue:', error);
        return {
          success: false,
          error: decodeURIComponent(error),
          cancelled: false
        };
      }

      // Vérification du succès et du token
      if (success === 'true' && token) {
        console.log('✅ Token reçu, validation en cours...');
        
        // Valider le token avec le backend
        return await this.validateTokenWithBackend(token);
      } else {
        console.log('❌ Paramètres manquants ou invalides');
        return {
          success: false,
          error: 'Paramètres d\'authentification manquants ou invalides',
          cancelled: false
        };
      }

    } catch (error) {
      console.error('❌ Erreur parsing auth result:', error);
      return {
        success: false,
        error: 'Erreur lors du traitement de la réponse',
        cancelled: false
      };
    }
  }

  /**
   * Valider le token avec le backend
   */
  async validateTokenWithBackend(token) {
    try {
      console.log('🔍 Validation du token avec le backend...');

      const response = await fetch(`${this.baseURL}/api/auth/check-token`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Mobile-App-Android-APK',
          'X-Platform': 'android-apk'
        },
        timeout: 10000 // 10 secondes timeout
      });

      console.log('📡 Réponse validation token:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Token validé, utilisateur:', data.user?.email);
        
        return {
          success: true,
          token: token,
          user: data.user
        };
      } else {
        const errorText = await response.text();
        console.error('❌ Token invalide:', response.status, errorText);
        return {
          success: false,
          error: 'Token d\'authentification invalide'
        };
      }

    } catch (error) {
      console.error('❌ Erreur validation token:', error);
      return {
        success: false,
        error: 'Erreur lors de la validation du token'
      };
    }
  }

  /**
   * Test de connexion spécialement pour Android
   */
  async testConnection() {
    try {
      console.log('🧪 Test connexion Android APK...');
      
      const response = await fetch(`${this.baseURL}/api/auth/ping`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mobile-App-Android-APK-Test',
          'X-Platform': 'android-apk'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Service accessible depuis Android APK');
        return { success: true, data };
      } else {
        console.error('❌ Service non accessible:', response.status);
        return { success: false, error: 'Service non accessible' };
      }

    } catch (error) {
      console.error('❌ Erreur test connexion:', error);
      return { success: false, error: 'Erreur de connexion' };
    }
  }

  /**
   * Forcer l'ouverture de l'app depuis le navigateur (méthode alternative)
   */
  async forceAppReturn() {
    try {
      console.log('🔄 Tentative de retour forcé vers l\'app...');
      
      // Essayer plusieurs méthodes pour revenir à l'app
      const schemes = ['myapp://auth', 'myapp://', 'intent://auth#Intent;scheme=myapp;end'];
      
      for (const scheme of schemes) {
        try {
          const supported = await Linking.canOpenURL(scheme);
          if (supported) {
            await Linking.openURL(scheme);
            console.log('✅ Retour app réussi avec:', scheme);
            return true;
          }
        } catch (e) {
          console.log('❌ Échec retour avec:', scheme);
        }
      }
      
      return false;
    } catch (error) {
      console.error('❌ Erreur retour app:', error);
      return false;
    }
  }

  /**
   * Configuration pour Android APK
   */
  getConfig() {
    return {
      baseURL: this.baseURL,
      platform: 'android-apk',
      timeout: this.timeout,
      schemes: ['myapp://auth', 'myapp://'],
      userAgent: 'Mobile-App-Android-APK'
    };
  }
}

export default new AndroidGoogleAuthService();