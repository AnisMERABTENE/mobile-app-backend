import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

// Configuration pour que le WebBrowser puisse revenir à l'app
WebBrowser.maybeCompleteAuthSession();

/**
 * Service Google Auth simplifié - VERSION CORRIGÉE
 */
class SimpleGoogleAuthService {
  
  constructor() {
    this.baseURL = 'https://mobile-app-backend-production-5d60.up.railway.app';
    console.log('🔧 Simple Google Auth Service configuré');
    console.log('🌐 Base URL:', this.baseURL);
  }

  /**
   * Connexion Google OAuth via WebBrowser - VERSION CORRIGÉE
   */
  async signInWithGoogle() {
    try {
      console.log('🔵 Démarrage connexion Google via WebBrowser...');

      // URL d'authentification avec paramètres mobiles
      const authUrl = `${this.baseURL}/api/auth/google?mobile=true&platform=${Platform.OS}&timestamp=${Date.now()}`;
      
      console.log('🌐 Ouverture URL:', authUrl);

      // ✅ CORRECTION : Utiliser openBrowserAsync au lieu de openAuthSessionAsync
      const result = await WebBrowser.openBrowserAsync(authUrl, {
        dismissButtonStyle: 'close',
        readerMode: false,
        enableBarCollapsing: false,
        showInRecents: false,
        enableDefaultShareMenuItem: false,
        // ✅ IMPORTANT : Définir l'app à ouvrir après succès
        returnUrl: 'myapp://auth'
      });

      console.log('📱 Résultat WebBrowser:', result.type);

      // ✅ NOUVELLE APPROCHE : Attendre le deep link au lieu de parser le résultat
      if (result.type === 'cancel') {
        console.log('❌ Authentification annulée par l\'utilisateur');
        return {
          success: false,
          error: 'Authentification annulée',
          cancelled: true
        };
      }

      // ✅ IMPORTANT : Attendre le deep link
      console.log('⏳ Attente du deep link de retour...');
      return await this.waitForAuthResult();

    } catch (error) {
      console.error('❌ Erreur Google Auth:', error);
      return {
        success: false,
        error: 'Erreur technique lors de l\'authentification',
        cancelled: false
      };
    }
  }

  /**
   * ✅ NOUVELLE MÉTHODE : Attendre le résultat d'authentification via deep link
   */
  async waitForAuthResult() {
    return new Promise((resolve) => {
      let timeoutId;
      let linkingSubscription;

      // Timeout après 60 secondes
      timeoutId = setTimeout(() => {
        console.log('⏰ Timeout - Aucun deep link reçu');
        if (linkingSubscription) {
          linkingSubscription.remove();
        }
        resolve({
          success: false,
          error: 'Timeout - Aucun résultat reçu',
          cancelled: true
        });
      }, 60000);

      // Écouter les deep links
      linkingSubscription = Linking.addEventListener('url', ({ url }) => {
        console.log('🔗 Deep link reçu dans Google Auth:', url);
        
        // Nettoyer les listeners
        clearTimeout(timeoutId);
        if (linkingSubscription) {
          linkingSubscription.remove();
        }

        // Parser le résultat
        this.parseAuthResult(url).then(result => {
          resolve(result);
        }).catch(error => {
          console.error('❌ Erreur parsing deep link:', error);
          resolve({
            success: false,
            error: 'Erreur lors du traitement du résultat'
          });
        });
      });

      console.log('👂 Écoute des deep links activée...');
    });
  }

  /**
   * Parser le résultat d'authentification depuis l'URL - AMÉLIORÉ
   */
  async parseAuthResult(url) {
    try {
      console.log('🔍 Parsing du résultat d\'auth:', url);

      if (!url || (!url.includes('myapp://') && !url.includes('mobileapp://'))) {
        return {
          success: false,
          error: 'URL de retour invalide',
          cancelled: false
        };
      }

      // Normaliser l'URL pour le parsing
      const normalizedUrl = url
        .replace('myapp://', 'https://app.com/')
        .replace('mobileapp://', 'https://app.com/');

      const urlObj = new URL(normalizedUrl);
      const token = urlObj.searchParams.get('token');
      const error = urlObj.searchParams.get('error');
      const success = urlObj.searchParams.get('success');
      const email = urlObj.searchParams.get('email');

      console.log('📋 Paramètres extraits:', {
        hasToken: !!token,
        error: error,
        success: success,
        email: email
      });

      if (error) {
        console.error('❌ Erreur OAuth reçue:', error);
        return {
          success: false,
          error: decodeURIComponent(error),
          cancelled: false
        };
      }

      if (success === 'true' && token) {
        console.log('✅ Token reçu via URL de retour');
        
        // Récupérer les infos utilisateur avec ce token
        return await this.getUserWithToken(token);
      } else if (success === 'false') {
        console.log('❌ Connexion Google échouée selon les paramètres');
        return {
          success: false,
          error: 'La connexion Google a échoué',
          cancelled: false
        };
      } else {
        console.log('⚠️ Paramètres manquants dans l\'URL de retour');
        return {
          success: false,
          error: 'Paramètres manquants dans la réponse',
          cancelled: false
        };
      }

    } catch (error) {
      console.error('❌ Erreur parsing auth result:', error);
      return {
        success: false,
        error: 'Erreur lors du traitement de la réponse d\'authentification',
        cancelled: false
      };
    }
  }

  /**
   * Récupérer les infos utilisateur avec le token
   */
  async getUserWithToken(token) {
    try {
      console.log('👤 Récupération du profil avec le token...');

      // Appel API pour vérifier le token et récupérer l'utilisateur
      const response = await fetch(`${this.baseURL}/api/auth/check-token`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Mobile-App-Expo'
        }
      });

      console.log('📡 Réponse API check-token:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Profil utilisateur récupéré pour:', data.user?.email);
        
        return {
          success: true,
          token: token,
          user: data.user
        };
      } else {
        const errorData = await response.text();
        console.error('❌ Erreur récupération profil:', response.status, errorData);
        return {
          success: false,
          error: 'Impossible de récupérer le profil utilisateur'
        };
      }

    } catch (error) {
      console.error('❌ Erreur getUserWithToken:', error);
      return {
        success: false,
        error: 'Erreur lors de la récupération du profil'
      };
    }
  }

  /**
   * Tester la connexion au service
   */
  async testConnection() {
    try {
      console.log('🧪 Test de connexion au service Google Auth...');
      
      const response = await fetch(`${this.baseURL}/api/auth/ping`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mobile-App-Expo'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Service accessible:', data);
        return { success: true, data };
      } else {
        console.error('❌ Service non accessible:', response.status);
        return { success: false, error: 'Service non accessible' };
      }

    } catch (error) {
      console.error('❌ Erreur test connexion:', error);
      return { success: false, error: 'Erreur de connexion au service' };
    }
  }

  /**
   * Obtenir les informations de configuration
   */
  getConfig() {
    return {
      baseURL: this.baseURL,
      platform: Platform.OS,
      userAgent: 'Mobile-App-Expo',
      authUrl: `${this.baseURL}/api/auth/google`,
      redirectScheme: 'myapp://auth'
    };
  }
}

// Exporter une instance unique
export default new SimpleGoogleAuthService();