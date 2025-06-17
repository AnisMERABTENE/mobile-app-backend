import * as SecureStore from 'expo-secure-store';

// ✅ CORRECTION : Utiliser l'URL directe au lieu d'importer depuis config
const API_BASE_URL = 'https://mobile-app-backend-production-5d60.up.railway.app/api';

class ResponseService {
  constructor() {
    this.baseUrl = `${API_BASE_URL}/responses`;
  }

  // ✅ CORRECTION : Utiliser SecureStore au lieu d'AsyncStorage
  async getAuthToken() {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      return token;
    } catch (error) {
      console.error('❌ Erreur récupération token:', error);
      return null;
    }
  }

  // Headers par défaut avec authentification
  async getHeaders() {
    const token = await this.getAuthToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  }

  /**
   * Créer une nouvelle réponse à une demande
   * @param {string} requestId - ID de la demande
   * @param {string} message - Message de la réponse
   * @param {number} price - Prix proposé
   * @param {Array} photos - Tableau des photos
   * @returns {Promise<Object>} Résultat de l'opération
   */
  async createResponse(requestId, message, price, photos = []) {
    try {
      console.log('📤 Envoi réponse pour demande:', requestId);
      console.log('📝 Données:', { message: message.substring(0, 50) + '...', price, photoCount: photos.length });

      const headers = await this.getHeaders();
      
      const requestData = {
        requestId,
        message: message.trim(),
        price: parseFloat(price),
        photos: photos || []
      };

      console.log('🔗 URL:', `${this.baseUrl}`);
      console.log('📋 Payload:', requestData);

      const response = await fetch(`${this.baseUrl}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestData),
      });

      console.log('📡 Statut réponse:', response.status);

      const data = await response.json();
      console.log('📦 Données reçues:', data);

      if (response.ok) {
        console.log('✅ Réponse créée avec succès:', data.response?._id);
        return {
          success: true,
          data: data.response,
          message: 'Réponse envoyée avec succès'
        };
      } else {
        console.error('❌ Erreur API:', data.error);
        return {
          success: false,
          error: data.error || 'Erreur lors de l\'envoi de la réponse'
        };
      }

    } catch (error) {
      console.error('❌ Erreur createResponse:', error);
      return {
        success: false,
        error: 'Erreur de connexion. Vérifiez votre connexion internet.'
      };
    }
  }

  /**
   * Obtenir toutes les réponses d'une demande
   * @param {string} requestId - ID de la demande
   * @returns {Promise<Object>} Liste des réponses
   */
  async getResponsesByRequest(requestId) {
    try {
      console.log('📥 Récupération réponses pour demande:', requestId);

      const headers = await this.getHeaders();
      
      const response = await fetch(`${this.baseUrl}/request/${requestId}`, {
        method: 'GET',
        headers,
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Réponses récupérées:', data.responses?.length || 0);
        return {
          success: true,
          data: data.responses || [],
          count: data.count || 0
        };
      } else {
        console.error('❌ Erreur récupération réponses:', data.error);
        return {
          success: false,
          error: data.error || 'Erreur lors de la récupération des réponses'
        };
      }

    } catch (error) {
      console.error('❌ Erreur getResponsesByRequest:', error);
      return {
        success: false,
        error: 'Erreur de connexion'
      };
    }
  }

  /**
   * Obtenir mes réponses (en tant que vendeur)
   * @returns {Promise<Object>} Liste de mes réponses
   */
  async getMyResponses() {
    try {
      console.log('📥 Récupération de mes réponses');

      const headers = await this.getHeaders();
      
      const response = await fetch(`${this.baseUrl}/my`, {
        method: 'GET',
        headers,
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Mes réponses récupérées:', data.responses?.length || 0);
        return {
          success: true,
          data: data.responses || [],
          count: data.count || 0
        };
      } else {
        console.error('❌ Erreur récupération mes réponses:', data.error);
        return {
          success: false,
          error: data.error || 'Erreur lors de la récupération de vos réponses'
        };
      }

    } catch (error) {
      console.error('❌ Erreur getMyResponses:', error);
      return {
        success: false,
        error: 'Erreur de connexion'
      };
    }
  }

  /**
   * Obtenir une réponse par ID
   * @param {string} responseId - ID de la réponse
   * @returns {Promise<Object>} Détails de la réponse
   */
  async getResponseById(responseId) {
    try {
      console.log('📥 Récupération réponse:', responseId);

      const headers = await this.getHeaders();
      
      const response = await fetch(`${this.baseUrl}/${responseId}`, {
        method: 'GET',
        headers,
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Réponse récupérée:', data.response?._id);
        return {
          success: true,
          data: data.response
        };
      } else {
        console.error('❌ Erreur récupération réponse:', data.error);
        return {
          success: false,
          error: data.error || 'Erreur lors de la récupération de la réponse'
        };
      }

    } catch (error) {
      console.error('❌ Erreur getResponseById:', error);
      return {
        success: false,
        error: 'Erreur de connexion'
      };
    }
  }

  /**
   * Mettre à jour le statut d'une réponse (accepter/décliner)
   * @param {string} responseId - ID de la réponse
   * @param {string} status - Nouveau statut ('accepted' ou 'declined')
   * @param {Object} feedback - Feedback optionnel
   * @returns {Promise<Object>} Résultat de l'opération
   */
  async updateResponseStatus(responseId, status, feedback = null) {
    try {
      console.log('🔄 Mise à jour statut réponse:', responseId, '->', status);

      const headers = await this.getHeaders();
      
      const requestData = {
        status,
        feedback
      };

      const response = await fetch(`${this.baseUrl}/${responseId}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Statut mis à jour:', data.response?._id);
        return {
          success: true,
          data: data.response,
          message: status === 'accepted' ? 'Réponse acceptée' : 'Réponse déclinée'
        };
      } else {
        console.error('❌ Erreur mise à jour statut:', data.error);
        return {
          success: false,
          error: data.error || 'Erreur lors de la mise à jour du statut'
        };
      }

    } catch (error) {
      console.error('❌ Erreur updateResponseStatus:', error);
      return {
        success: false,
        error: 'Erreur de connexion'
      };
    }
  }

  /**
   * Supprimer une réponse
   * @param {string} responseId - ID de la réponse
   * @returns {Promise<Object>} Résultat de l'opération
   */
  async deleteResponse(responseId) {
    try {
      console.log('🗑️ Suppression réponse:', responseId);

      const headers = await this.getHeaders();
      
      const response = await fetch(`${this.baseUrl}/${responseId}`, {
        method: 'DELETE',
        headers,
      });

      if (response.ok) {
        console.log('✅ Réponse supprimée');
        return {
          success: true,
          message: 'Réponse supprimée avec succès'
        };
      } else {
        const data = await response.json();
        console.error('❌ Erreur suppression réponse:', data.error);
        return {
          success: false,
          error: data.error || 'Erreur lors de la suppression de la réponse'
        };
      }

    } catch (error) {
      console.error('❌ Erreur deleteResponse:', error);
      return {
        success: false,
        error: 'Erreur de connexion'
      };
    }
  }
}

// Instance unique du service
const responseService = new ResponseService();

export default responseService;