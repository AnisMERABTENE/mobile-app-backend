import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { apiRequest } from './api';
import StorageService from '../utils/storage';

// Configuration pour que le WebBrowser puisse revenir à l'app
WebBrowser.maybeCompleteAuthSession();

/**
 * Service pour l'authentification Google OAuth
 */
class GoogleAuthService {
  
  constructor() {
    // URL de base de l'API backend
    this.baseURL = 'https://mobile-app-backend-production-5d60.up.railway.app';
    
    console.log('🔧 Google Auth Service configuré');
  }

  /**
   * Connexion Google OAuth via le backend
   */
  async signInWithGoogle() {
    try {
      console.log('🔵 Démarrage de la connexion Google...');

      // URL d'authentification du backend avec indicateur mobile
      const authUrl = `${this.baseURL}/api/auth/google?mobile=true`;
      
      console.log('🌐 Ouverture de:', authUrl);

      // Ouvrir le navigateur pour l'authentification
      const result = await WebBrowser.openBrowserAsync(authUrl, {
        // Options pour revenir à l'app après authentification
        dismissButtonStyle: 'close',
        readerMode: false,
        enableBarCollapsing: false,
        showInRecents: true,
      });

      console.log('📱 Résultat WebBrowser:', result);

      if (result.type === 'cancel') {
        console.log('❌ Authentification annulée par l\'utilisateur');
        return {
          success: false,
          error: 'Authentification annulée',
          cancelled: true
        };
      }

      // Après que l'utilisateur ferme le navigateur, on vérifie s'il y a un token
      // Le backend aura stocké le token dans une session temporaire
      return await this.checkForStoredToken();

    } catch (error) {
      console.error('❌ Erreur Google Auth:', error);
      return {
        success: false,
        error: 'Erreur technique lors de l\'authentification'
      };
    }
  }

  /**
   * Vérifier s'il y a un token stocké après l'authentification
   */
  async checkForStoredToken() {
    try {
      console.log('🔍 Vérification du token après authentification...');

      // Attendre un peu que l'utilisateur ferme le navigateur
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Essayer de récupérer le token via une route spéciale
      const result = await apiRequest.get('/auth/google/mobile-token');

      if (result.success && result.data.token) {
        console.log('✅ Token Google récupéré');
        return {
          success: true,
          token: result.data.token,
          user: result.data.user
        };
      } else {
        console.log('ℹ️ Aucun token trouvé - utilisateur probablement annulé');
        return {
          success: false,
          error: 'Authentification non terminée',
          cancelled: true
        };
      }

    } catch (error) {
      console.error('❌ Erreur vérification token:', error);
      return {
        success: false,
        error: 'Erreur lors de la vérification du token'
      };
    }
  }

  /**
   * Nettoyer le token temporaire
   */
  async clearTemporaryToken() {
    try {
      await apiRequest.delete('/auth/google/mobile-token');
    } catch (error) {
      console.log('Info: Impossible de nettoyer le token temporaire');
    }
  }

  /**
   * Obtenir les informations de configuration
   */
  getConfig() {
    return {
      baseURL: this.baseURL,
      platform: Platform.OS,
    };
  }
}

// Exporter une instance unique
export default new GoogleAuthService();