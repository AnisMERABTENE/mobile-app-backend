import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { apiRequest } from './api';

WebBrowser.maybeCompleteAuthSession();

/**
 * Service pour l'authentification Google OAuth native
 */
class NativeGoogleAuthService {
  
  constructor() {
    // Configuration OAuth Google - utilise ton Client ID existant
    this.clientId = '1090312299997-hv7ic64it62ftednl1ft3sc39uugjr62.apps.googleusercontent.com';
    
    // Scopes demandés
    this.scopes = ['openid', 'profile', 'email'];
    
    // Configuration de redirection pour Expo
    this.redirectUri = AuthSession.makeRedirectUri({
      useProxy: true, // Important pour que ça fonctionne
    });
    
    console.log('🔧 Google Auth Native configuré');
    console.log('📱 Client ID:', this.clientId);
    console.log('📱 Redirect URI:', this.redirectUri);
  }

  /**
   * Connexion Google OAuth native
   */
  async signInWithGoogle() {
    try {
      console.log('🔵 Démarrage OAuth Google natif...');

      // Configuration de la requête OAuth
      const request = new AuthSession.AuthRequest({
        clientId: this.clientId,
        scopes: this.scopes,
        redirectUri: this.redirectUri,
        responseType: AuthSession.ResponseType.Code,
        additionalParameters: {},
        extraParams: {},
      });

      // Endpoints Google OAuth
      const discovery = await AuthSession.fetchDiscoveryAsync(
        'https://accounts.google.com'
      );

      console.log('🔍 Discovery configuré');

      // Lancer l'authentification
      const result = await request.promptAsync(discovery);

      console.log('📱 Résultat OAuth:', result.type);

      if (result.type === 'success') {
        console.log('✅ Code d\'autorisation reçu');
        return await this.exchangeCodeForToken(result.params.code);
      } else if (result.type === 'cancel') {
        console.log('❌ Authentification annulée');
        return {
          success: false,
          error: 'Authentification annulée',
          cancelled: true
        };
      } else {
        console.log('❌ Erreur OAuth:', result);
        return {
          success: false,
          error: 'Erreur lors de l\'authentification'
        };
      }

    } catch (error) {
      console.error('❌ Erreur Google Auth native:', error);
      return {
        success: false,
        error: 'Erreur technique lors de l\'authentification'
      };
    }
  }

  /**
   * Échanger le code d'autorisation contre un token
   */
  async exchangeCodeForToken(code) {
    try {
      console.log('🔄 Échange du code contre un token...');

      // Échanger le code contre un access token Google
      const tokenResponse = await AuthSession.exchangeCodeAsync({
        clientId: this.clientId,
        code: code,
        redirectUri: this.redirectUri,
        extraParams: {},
      }, {
        tokenEndpoint: 'https://oauth2.googleapis.com/token',
      });

      console.log('✅ Token Google reçu');

      // Récupérer les informations utilisateur avec le token
      const userInfo = await this.getUserInfo(tokenResponse.accessToken);

      if (userInfo.success) {
        // Envoyer les informations au backend pour créer/connecter l'utilisateur
        return await this.authenticateWithBackend(userInfo.data, tokenResponse.accessToken);
      } else {
        return {
          success: false,
          error: 'Impossible de récupérer les informations utilisateur'
        };
      }

    } catch (error) {
      console.error('❌ Erreur échange token:', error);
      return {
        success: false,
        error: 'Erreur lors de l\'échange du token'
      };
    }
  }

  /**
   * Récupérer les informations utilisateur depuis Google
   */
  async getUserInfo(accessToken) {
    try {
      console.log('👤 Récupération des infos utilisateur...');

      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        console.log('✅ Infos utilisateur récupérées:', userData.email);
        
        return {
          success: true,
          data: {
            googleId: userData.id,
            email: userData.email,
            firstName: userData.given_name,
            lastName: userData.family_name,
            avatar: userData.picture,
            isEmailVerified: userData.verified_email,
          }
        };
      } else {
        console.error('❌ Erreur récupération infos utilisateur');
        return {
          success: false,
          error: 'Erreur lors de la récupération des informations utilisateur'
        };
      }

    } catch (error) {
      console.error('❌ Erreur getUserInfo:', error);
      return {
        success: false,
        error: 'Erreur lors de la récupération des informations utilisateur'
      };
    }
  }

  /**
   * Authentifier avec le backend en utilisant les données Google
   */
  async authenticateWithBackend(userData, googleAccessToken) {
    try {
      console.log('🔄 Authentification avec le backend...');

      // Créer un endpoint spécial sur ton backend pour l'auth Google native
      const result = await apiRequest.post('/auth/google/native', {
        googleId: userData.googleId,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        avatar: userData.avatar,
        isEmailVerified: userData.isEmailVerified,
        googleAccessToken: googleAccessToken, // Pour vérification si nécessaire
      });

      if (result.success) {
        console.log('✅ Authentification backend réussie');
        return {
          success: true,
          token: result.data.token,
          user: result.data.user
        };
      } else {
        console.error('❌ Erreur authentification backend:', result.error);
        return {
          success: false,
          error: result.error || 'Erreur lors de l\'authentification'
        };
      }

    } catch (error) {
      console.error('❌ Erreur auth backend:', error);
      return {
        success: false,
        error: 'Erreur lors de l\'authentification avec le serveur'
      };
    }
  }

  /**
   * Obtenir les informations de configuration
   */
  getConfig() {
    return {
      clientId: this.clientId,
      redirectUri: this.redirectUri,
      platform: Platform.OS,
    };
  }
}

// Exporter une instance unique
export default new NativeGoogleAuthService();