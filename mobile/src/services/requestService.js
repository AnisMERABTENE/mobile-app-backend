import { apiRequest } from './api';

/**
 * Service pour les demandes
 * Gère toutes les interactions avec l'API des demandes
 */
class RequestService {
  
  /**
   * Récupérer toutes les catégories
   */
  async getCategories() {
    try {
      console.log('📂 Récupération des catégories...');
      
      const result = await apiRequest.get('/requests/categories');

      if (result.success) {
        console.log('✅ Catégories récupérées:', result.data.count);
        return {
          success: true,
          data: result.data.categories,
        };
      } else {
        console.error('❌ Échec récupération catégories:', result.error);
        return {
          success: false,
          error: result.error || 'Erreur lors de la récupération des catégories',
        };
      }
    } catch (error) {
      console.error('❌ Erreur service getCategories:', error);
      return {
        success: false,
        error: 'Impossible de récupérer les catégories',
      };
    }
  }

  /**
   * Récupérer les sous-catégories d'une catégorie
   */
  async getSubCategories(categoryId) {
    try {
      console.log('🏷️ Récupération des sous-catégories pour:', categoryId);
      
      const result = await apiRequest.get(`/requests/categories/${categoryId}/subcategories`);

      if (result.success) {
        console.log('✅ Sous-catégories récupérées:', result.data.count);
        return {
          success: true,
          data: result.data.subCategories,
        };
      } else {
        console.error('❌ Échec récupération sous-catégories:', result.error);
        return {
          success: false,
          error: result.error || 'Erreur lors de la récupération des sous-catégories',
        };
      }
    } catch (error) {
      console.error('❌ Erreur service getSubCategories:', error);
      return {
        success: false,
        error: 'Impossible de récupérer les sous-catégories',
      };
    }
  }

  /**
   * Créer une nouvelle demande
   */
  async createRequest(requestData) {
    try {
      console.log('📝 Création d\'une nouvelle demande...');
      
      const result = await apiRequest.post('/requests', requestData);

      if (result.success) {
        console.log('✅ Demande créée avec succès:', result.data.request.title);
        return {
          success: true,
          data: result.data.request,
        };
      } else {
        console.error('❌ Échec création demande:', result.error);
        return {
          success: false,
          error: result.error || 'Erreur lors de la création de la demande',
        };
      }
    } catch (error) {
      console.error('❌ Erreur service createRequest:', error);
      return {
        success: false,
        error: 'Impossible de créer la demande',
      };
    }
  }

  /**
   * Récupérer les demandes de l'utilisateur connecté
   */
  async getMyRequests(page = 1, status = null) {
    try {
      console.log('📋 Récupération des demandes utilisateur...');
      
      let url = `/requests/my/all?page=${page}`;
      if (status) {
        url += `&status=${status}`;
      }
      
      const result = await apiRequest.get(url);

      if (result.success) {
        console.log('✅ Demandes récupérées:', result.data.requests.length);
        return {
          success: true,
          data: result.data,
        };
      } else {
        console.error('❌ Échec récupération demandes:', result.error);
        return {
          success: false,
          error: result.error || 'Erreur lors de la récupération des demandes',
        };
      }
    } catch (error) {
      console.error('❌ Erreur service getMyRequests:', error);
      return {
        success: false,
        error: 'Impossible de récupérer les demandes',
      };
    }
  }

  /**
   * Récupérer les statistiques des demandes
   */
  async getMyStats() {
    try {
      console.log('📊 Récupération des statistiques...');
      
      const result = await apiRequest.get('/requests/my/stats');

      if (result.success) {
        console.log('✅ Statistiques récupérées');
        return {
          success: true,
          data: result.data.stats,
        };
      } else {
        console.error('❌ Échec récupération stats:', result.error);
        return {
          success: false,
          error: result.error || 'Erreur lors de la récupération des statistiques',
        };
      }
    } catch (error) {
      console.error('❌ Erreur service getMyStats:', error);
      return {
        success: false,
        error: 'Impossible de récupérer les statistiques',
      };
    }
  }

  /**
   * Rechercher des demandes par proximité
   */
  async searchNearby(longitude, latitude, maxDistance = 10000, category = null, page = 1) {
    try {
      console.log('🗺️ Recherche par proximité...');
      
      let url = `/requests/search?longitude=${longitude}&latitude=${latitude}&maxDistance=${maxDistance}&page=${page}`;
      if (category) {
        url += `&category=${category}`;
      }
      
      const result = await apiRequest.get(url);

      if (result.success) {
        console.log('✅ Demandes trouvées:', result.data.requests.length);
        return {
          success: true,
          data: result.data,
        };
      } else {
        console.error('❌ Échec recherche proximité:', result.error);
        return {
          success: false,
          error: result.error || 'Erreur lors de la recherche',
        };
      }
    } catch (error) {
      console.error('❌ Erreur service searchNearby:', error);
      return {
        success: false,
        error: 'Impossible d\'effectuer la recherche',
      };
    }
  }

  /**
   * Récupérer une demande par ID
   */
  async getRequestById(requestId) {
    try {
      console.log('👁️ Récupération demande:', requestId);
      
      const result = await apiRequest.get(`/requests/${requestId}`);

      if (result.success) {
        console.log('✅ Demande récupérée');
        return {
          success: true,
          data: result.data.request,
        };
      } else {
        console.error('❌ Échec récupération demande:', result.error);
        return {
          success: false,
          error: result.error || 'Erreur lors de la récupération de la demande',
        };
      }
    } catch (error) {
      console.error('❌ Erreur service getRequestById:', error);
      return {
        success: false,
        error: 'Impossible de récupérer la demande',
      };
    }
  }

  /**
   * Mettre à jour une demande
   */
  async updateRequest(requestId, updateData) {
    try {
      console.log('✏️ Mise à jour demande:', requestId);
      
      const result = await apiRequest.put(`/requests/${requestId}`, updateData);

      if (result.success) {
        console.log('✅ Demande mise à jour');
        return {
          success: true,
          data: result.data.request,
        };
      } else {
        console.error('❌ Échec mise à jour demande:', result.error);
        return {
          success: false,
          error: result.error || 'Erreur lors de la mise à jour',
        };
      }
    } catch (error) {
      console.error('❌ Erreur service updateRequest:', error);
      return {
        success: false,
        error: 'Impossible de mettre à jour la demande',
      };
    }
  }

  /**
   * Marquer une demande comme complétée
   */
  async markAsCompleted(requestId) {
    try {
      console.log('✅ Marquage demande comme complétée:', requestId);
      
      const result = await apiRequest.patch(`/requests/${requestId}/complete`);

      if (result.success) {
        console.log('✅ Demande marquée comme complétée');
        return {
          success: true,
          data: result.data.request,
        };
      } else {
        console.error('❌ Échec marquage completion:', result.error);
        return {
          success: false,
          error: result.error || 'Erreur lors du marquage',
        };
      }
    } catch (error) {
      console.error('❌ Erreur service markAsCompleted:', error);
      return {
        success: false,
        error: 'Impossible de marquer comme complétée',
      };
    }
  }

  /**
   * Supprimer une demande
   */
  async deleteRequest(requestId) {
    try {
      console.log('🗑️ Suppression demande:', requestId);
      
      const result = await apiRequest.delete(`/requests/${requestId}`);

      if (result.success) {
        console.log('✅ Demande supprimée');
        return {
          success: true,
        };
      } else {
        console.error('❌ Échec suppression demande:', result.error);
        return {
          success: false,
          error: result.error || 'Erreur lors de la suppression',
        };
      }
    } catch (error) {
      console.error('❌ Erreur service deleteRequest:', error);
      return {
        success: false,
        error: 'Impossible de supprimer la demande',
      };
    }
  }
}

// Exporter une instance unique du service
export default new RequestService();