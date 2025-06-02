import { apiRequest } from './api';

/**
 * Service d'authentification
 * Gère toutes les interactions avec l'API d'authentification
 */
class AuthService {
  
  /**
   * Connexion avec email/mot de passe
   */
  async login(email, password) {
    try {
      console.log('🔐 Tentative de connexion pour:', email);
      
      const result = await apiRequest.post('/auth/login', {
        email: email.trim().toLowerCase(),
        password: password,
      });

      if (result.success) {
        console.log('✅ Connexion API réussie');
        return {
          success: true,
          data: result.data,
        };
      } else {
        console.error('❌ Échec connexion API:', result.error);
        return {
          success: false,
          error: result.error || 'Erreur de connexion',
        };
      }
    } catch (error) {
      console.error('❌ Erreur service login:', error);
      return {
        success: false,
        error: 'Impossible de se connecter au serveur',
      };
    }
  }

  /**
   * Vérifier un token avec le backend (utile après Google OAuth)
   */
  async verifyTokenWithBackend(token) {
    try {
      console.log('🔍 Vérification du token avec le backend...');
      
      // Temporairement stocker le token pour la requête
      const currentToken = await SecureStore.getItemAsync('authToken');
      await SecureStore.setItemAsync('authToken', token);
      
      const result = await apiRequest.get('/auth/profile');
      
      // Restaurer l'ancien token si la vérification échoue
      if (!result.success && currentToken) {
        await SecureStore.setItemAsync('authToken', currentToken);
      }

      if (result.success) {
        console.log('✅ Token valide, profil récupéré');
        return {
          success: true,
          data: {
            user: result.data.user,
            token: token
          }
        };
      } else {
        console.log('❌ Token invalide');
        return {
          success: false,
          error: result.error || 'Token invalide',
        };
      }
    } catch (error) {
      console.error('❌ Erreur vérification token:', error);
      return {
        success: false,
        error: 'Erreur de vérification',
      };
    }
  }

  /**
   * Inscription
   */
  async register(userData) {
    try {
      console.log('📝 Tentative d\'inscription pour:', userData.email);
      
      const cleanUserData = {
        firstName: userData.firstName.trim(),
        lastName: userData.lastName.trim(),
        email: userData.email.trim().toLowerCase(),
        password: userData.password,
      };

      const result = await apiRequest.post('/auth/register', cleanUserData);

      if (result.success) {
        console.log('✅ Inscription API réussie');
        return {
          success: true,
          data: result.data,
        };
      } else {
        console.error('❌ Échec inscription API:', result.error);
        return {
          success: false,
          error: result.error || 'Erreur lors de l\'inscription',
        };
      }
    } catch (error) {
      console.error('❌ Erreur service register:', error);
      return {
        success: false,
        error: 'Impossible de se connecter au serveur',
      };
    }
  }

  /**
   * Récupération de mot de passe
   */
  async forgotPassword(email) {
    try {
      console.log('🔄 Demande de récupération de mot de passe pour:', email);
      
      const result = await apiRequest.post('/auth/forgot-password', {
        email: email.trim().toLowerCase(),
      });

      if (result.success) {
        console.log('✅ Email de récupération envoyé');
        return {
          success: true,
          message: result.data.message,
        };
      } else {
        console.error('❌ Échec récupération mot de passe:', result.error);
        return {
          success: false,
          error: result.error || 'Erreur lors de l\'envoi de l\'email',
        };
      }
    } catch (error) {
      console.error('❌ Erreur service forgot password:', error);
      return {
        success: false,
        error: 'Impossible de se connecter au serveur',
      };
    }
  }

  /**
   * Vérification du token
   */
  async verifyToken() {
    try {
      console.log('🔍 Vérification du token...');
      
      const result = await apiRequest.get('/auth/check-token');

      if (result.success) {
        console.log('✅ Token valide');
        return {
          success: true,
          data: result.data,
        };
      } else {
        console.log('❌ Token invalide');
        return {
          success: false,
          error: result.error || 'Token invalide',
        };
      }
    } catch (error) {
      console.error('❌ Erreur vérification token:', error);
      return {
        success: false,
        error: 'Erreur de vérification',
      };
    }
  }

  /**
   * Récupération du profil utilisateur
   */
  async getProfile() {
    try {
      console.log('👤 Récupération du profil utilisateur...');
      
      const result = await apiRequest.get('/auth/profile');

      if (result.success) {
        console.log('✅ Profil récupéré');
        return {
          success: true,
          data: result.data,
        };
      } else {
        console.error('❌ Échec récupération profil:', result.error);
        return {
          success: false,
          error: result.error || 'Erreur lors de la récupération du profil',
        };
      }
    } catch (error) {
      console.error('❌ Erreur service profil:', error);
      return {
        success: false,
        error: 'Impossible de récupérer le profil',
      };
    }
  }

  /**
   * Mise à jour du profil
   */
  async updateProfile(updateData) {
    try {
      console.log('✏️ Mise à jour du profil...');
      
      const result = await apiRequest.put('/auth/profile', updateData);

      if (result.success) {
        console.log('✅ Profil mis à jour');
        return {
          success: true,
          data: result.data,
        };
      } else {
        console.error('❌ Échec mise à jour profil:', result.error);
        return {
          success: false,
          error: result.error || 'Erreur lors de la mise à jour',
        };
      }
    } catch (error) {
      console.error('❌ Erreur service update profil:', error);
      return {
        success: false,
        error: 'Impossible de mettre à jour le profil',
      };
    }
  }

  /**
   * Déconnexion
   */
  async logout() {
    try {
      console.log('🚪 Déconnexion...');
      
      const result = await apiRequest.post('/auth/logout');

      if (result.success) {
        console.log('✅ Déconnexion API réussie');
      } else {
        console.log('⚠️ Déconnexion API échouée (mais continuer la déconnexion locale)');
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Erreur service logout (mais continuer):', error);
      // Même en cas d'erreur API, on considère la déconnexion comme réussie
      // car on va nettoyer le stockage local
      return { success: true };
    }
  }

  /**
   * Vérification d'email
   */
  async verifyEmail(token) {
    try {
      console.log('📧 Vérification d\'email...');
      
      const result = await apiRequest.post('/auth/verify-email', { token });

      if (result.success) {
        console.log('✅ Email vérifié');
        return {
          success: true,
          message: result.data.message,
        };
      } else {
        console.error('❌ Échec vérification email:', result.error);
        return {
          success: false,
          error: result.error || 'Erreur lors de la vérification',
        };
      }
    } catch (error) {
      console.error('❌ Erreur service verify email:', error);
      return {
        success: false,
        error: 'Impossible de vérifier l\'email',
      };
    }
  }

  /**
   * Renvoyer l'email de vérification
   */
  async resendVerificationEmail() {
    try {
      console.log('📧 Renvoi de l\'email de vérification...');
      
      const result = await apiRequest.post('/auth/resend-verification');

      if (result.success) {
        console.log('✅ Email de vérification renvoyé');
        return {
          success: true,
          message: result.data.message,
        };
      } else {
        console.error('❌ Échec renvoi email:', result.error);
        return {
          success: false,
          error: result.error || 'Erreur lors du renvoi',
        };
      }
    } catch (error) {
      console.error('❌ Erreur service resend email:', error);
      return {
        success: false,
        error: 'Impossible de renvoyer l\'email',
      };
    }
  }
}

// Exporter une instance unique du service
export default new AuthService();