import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Configuration pour que le WebBrowser puisse revenir à l'app
WebBrowser.maybeCompleteAuthSession();

/**
 * Service pour l'authentification Google OAuth
 */
class GoogleAuthService {
  
  constructor() {
    // URL de base de l'API backend
    this.baseURL = 'https://mobile-app-backend-production-5d60.up.railway.app';
    
    // Configuration OAuth
    this.redirectUri = AuthSession.makeRedirectUri({
      scheme: 'mobileapp',
      path: 'auth/google/callback'
    });
    
    console.log('🔧 Google Auth Service configuré');
    console.log('📱 Redirect URI:', this.redirectUri);
  }

  /**
   * Connexion Google OAuth via le backend
   */
  async signInWithGoogle() {
    try {
      console.log('🔵 Démarrage de la connexion Google...');

      // URL d'authentification du backend
      const authUrl = `${this.baseURL}/api/auth/google`;
      
      console.log('🌐 Ouverture de:', authUrl);

      // Ouvrir le navigateur pour l'authentification
      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        this.redirectUri,
        {
          showInRecents: false,
        }
      );

      console.log('📱 Résultat WebBrowser:', result);

      if (result.type === 'success') {
        return this.handleAuthSuccess(result.url);
      } else if (result.type === 'cancel') {
        console.log('❌ Authentification annulée par l\'utilisateur');
        return {
          success: false,
          error: 'Authentification annulée',
          cancelled: true
        };
      } else {
        console.log('❌ Authentification échouée:', result.type);
        return {
          success: false,
          error: 'Erreur lors de l\'authentification'
        };
      }

    } catch (error) {
      console.error('❌ Erreur Google Auth:', error);
      return {
        success: false,
        error: 'Erreur technique lors de l\'authentification'
      };
    }
  }

  /**
   * Traiter la réponse de succès du backend
   */
  handleAuthSuccess(url) {
    try {
      console.log('✅ Traitement de l\'URL de succès:', url);

      // Parser l'URL pour extraire le token
      const urlObj = new URL(url);
      const params = new URLSearchParams(urlObj.search);
      
      const token = params.get('token');
      const error = params.get('error');

      if (error) {
        console.error('❌ Erreur du backend:', error);
        return {
          success: false,
          error: this.getErrorMessage(error)
        };
      }

      if (token) {
        console.log('✅ Token JWT reçu du backend');
        return {
          success: true,
          token: token
        };
      } else {
        console.error('❌ Aucun token dans l\'URL de retour');
        return {
          success: false,
          error: 'Aucun token d\'authentification reçu'
        };
      }

    } catch (error) {
      console.error('❌ Erreur parsing URL:', error);
      return {
        success: false,
        error: 'Erreur lors du traitement de la réponse'
      };
    }
  }

  /**
   * Convertir les codes d'erreur en messages lisibles
   */
  getErrorMessage(errorCode) {
    const errorMessages = {
      'auth_failed': 'Échec de l\'authentification Google',
      'server_error': 'Erreur serveur, réessayez plus tard',
      'invalid_token': 'Token d\'authentification invalide',
      'user_cancelled': 'Authentification annulée',
    };

    return errorMessages[errorCode] || 'Erreur inconnue lors de l\'authentification';
  }

  /**
   * Obtenir les informations de configuration
   */
  getConfig() {
    return {
      redirectUri: this.redirectUri,
      baseURL: this.baseURL,
      platform: Platform.OS,
    };
  }
}

// Exporter une instance unique
export default new GoogleAuthService();