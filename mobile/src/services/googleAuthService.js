import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

// Configuration pour que le WebBrowser puisse revenir à l'app
WebBrowser.maybeCompleteAuthSession();

/**
 * Service Google Auth unifié et optimisé
 * Remplace tous les autres services Google Auth pour simplifier
 */
class GoogleAuthService {
  
  constructor() {
    this.baseURL = 'https://mobile-app-backend-production-5d60.up.railway.app';
    this.timeout = 120000; // 2 minutes
    console.log('🔧 Google Auth Service unifié configuré');
    console.log('🌐 Base URL:', this.baseURL);
    console.log('📱 Platform:', Platform.OS);
  }

  /**
   * Connexion Google OAuth - VERSION UNIFIÉE
   */
  async signInWithGoogle() {
    try {
      console.log('🔵 Démarrage connexion Google (service unifié)...');
      console.log('📱 Plateforme détectée:', Platform.OS);

      // 1. Test de connectivité d'abord
      const connectionTest = await this.testConnection();
      if (!connectionTest.success) {
        throw new Error('Service non accessible: ' + connectionTest.error);
      }

      // 2. Configuration de l'écoute des deep links AVANT d'ouvrir le navigateur
      const authPromise = this.setupAuthListener();

      // 3. URL d'authentification avec paramètres optimisés
      const authParams = new URLSearchParams({
        mobile: 'true',
        platform: Platform.OS,
        apk: Platform.OS === 'android' ? 'true' : 'false',
        timestamp: Date.now().toString()
      });

      const authUrl = `${this.baseURL}/api/auth/google?${authParams.toString()}`;
      
      console.log('🌐 Ouverture URL:', authUrl);

      // 4. Configuration du navigateur selon la plateforme
      const browserConfig = {
        dismissButtonStyle: 'close',
        readerMode: false,
        enableBarCollapsing: false,
        showInRecents: false,
        enableDefaultShareMenuItem: false,
      };

      // 5. Ajout de headers pour identifier l'app mobile
      if (Platform.OS === 'android') {
        browserConfig.additionalHeaders = {
          'X-Mobile-App': 'Android-APK',
          'X-Platform': 'android',
          'X-Deep-Link-Expected': 'myapp://auth'
        };
      }

      // 6. Ouvrir le navigateur
      const browserResult = await WebBrowser.openBrowserAsync(authUrl, browserConfig);

      console.log('📱 Résultat navigateur:', browserResult.type);

      // 7. Gestion de l'annulation
      if (browserResult.type === 'cancel') {
        console.log('❌ Utilisateur a annulé la connexion Google');
        return {
          success: false,
          error: 'Authentification annulée par l\'utilisateur',
          cancelled: true
        };
      }

      // 8. Attendre le résultat via deep link
      return await authPromise;

    } catch (error) {
      console.error('❌ Erreur Google Auth unifié:', error);
      return {
        success: false,
        error: 'Erreur technique: ' + error.message,
        cancelled: false
      };
    }
  }

  /**
   * Configuration robuste de l'écoute des deep links
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

      // Timeout de sécurité
      timeoutId = setTimeout(() => {
        console.log('⏰ Timeout Google Auth - Aucun deep link reçu');
        resolveOnce({
          success: false,
          error: 'Timeout - Authentification non terminée dans les temps',
          cancelled: true
        });
      }, this.timeout);

      // Écouter les deep links
      try {
        linkingSubscription = Linking.addEventListener('url', async ({ url }) => {
          console.log('🔗 Deep link reçu (Google Auth):', url);
          
          try {
            const result = await this.parseAndValidateAuthResult(url);
            resolveOnce(result);
          } catch (parseError) {
            console.error('❌ Erreur parsing deep link:', parseError);
            resolveOnce({
              success: false,
              error: 'Erreur lors du traitement du résultat: ' + parseError.message
            });
          }
        });

        console.log('👂 Écoute des deep links activée pour Google Auth');

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
      console.log('🔍 Parsing résultat Google Auth:', url);

      // Vérifier que c'est notre deep link
      if (!url || (!url.includes('myapp://auth') && !url.includes('mobileapp://auth'))) {
        console.log('⚠️ URL non reconnue pour Google Auth:', url);
        return {
          success: false,
          error: 'URL de retour non reconnue',
          cancelled: false
        };
      }

      // Normaliser l'URL pour le parsing
      const normalizedUrl = url
        .replace('myapp://', 'https://temp.com/')
        .replace('mobileapp://', 'https://temp.com/');

      const urlObj = new URL(normalizedUrl);
      const token = urlObj.searchParams.get('token');
      const error = urlObj.searchParams.get('error');
      const success = urlObj.searchParams.get('success');
      const email = urlObj.searchParams.get('email');

      console.log('📋 Paramètres Google Auth extraits:', {
        hasToken: !!token,
        tokenLength: token?.length,
        error: error,
        success: success,
        email: email
      });

      // Gestion des erreurs OAuth
      if (error) {
        console.error('❌ Erreur OAuth Google reçue:', error);
        return {
          success: false,
          error: 'Erreur Google: ' + decodeURIComponent(error),
          cancelled: false
        };
      }

      // Vérification du succès et du token
      if (success === 'true' && token) {
        console.log('✅ Token Google reçu, validation en cours...');
        
        // Valider le token avec le backend
        return await this.validateTokenWithBackend(token);
      } else {
        console.log('❌ Paramètres Google Auth manquants ou invalides');
        return {
          success: false,
          error: 'Paramètres d\'authentification Google manquants',
          cancelled: false
        };
      }

    } catch (error) {
      console.error('❌ Erreur parsing Google Auth result:', error);
      return {
        success: false,
        error: 'Erreur lors du traitement de la réponse Google',
        cancelled: false
      };
    }
  }

  /**
   * Valider le token Google avec le backend
   */
  async validateTokenWithBackend(token) {
    try {
      console.log('🔍 Validation token Google avec le backend...');

      const response = await fetch(`${this.baseURL}/api/auth/check-token`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': `Mobile-App-${Platform.OS}`,
          'X-Platform': Platform.OS
        },
        timeout: 15000 // 15 secondes timeout
      });

      console.log('📡 Réponse validation token Google:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Token Google validé, utilisateur:', data.user?.email);
        
        return {
          success: true,
          token: token,
          user: data.user
        };
      } else {
        const errorText = await response.text().catch(() => 'Erreur inconnue');
        console.error('❌ Token Google invalide:', response.status, errorText);
        return {
          success: false,
          error: 'Token d\'authentification Google invalide'
        };
      }

    } catch (error) {
      console.error('❌ Erreur validation token Google:', error);
      return {
        success: false,
        error: 'Erreur lors de la validation avec le serveur'
      };
    }
  }

  /**
   * Test de connexion au service
   */
  async testConnection() {
    try {
      console.log('🧪 Test connexion service Google Auth...');
      
      const response = await fetch(`${this.baseURL}/api/auth/ping`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': `Mobile-App-${Platform.OS}`,
          'X-Platform': Platform.OS
        },
        timeout: 10000 // 10 secondes
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Service Google Auth accessible');
        return { success: true, data };
      } else {
        console.error('❌ Service Google Auth non accessible:', response.status);
        return { success: false, error: `Service non accessible (${response.status})` };
      }

    } catch (error) {
      console.error('❌ Erreur test connexion Google Auth:', error);
      return { success: false, error: 'Erreur de connexion: ' + error.message };
    }
  }

  /**
   * Configuration du service
   */
  getConfig() {
    return {
      baseURL: this.baseURL,
      platform: Platform.OS,
      timeout: this.timeout,
      schemes: ['myapp://auth', 'mobileapp://auth'],
      userAgent: `Mobile-App-${Platform.OS}`,
      authUrl: `${this.baseURL}/api/auth/google`
    };
  }
}

export default new GoogleAuthService();