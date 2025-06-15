import { apiRequest } from './api';

/**
 * Service pour les vendeurs
 * Gère toutes les interactions avec l'API vendeur
 */
class SellerService {
  
  /**
   * Vérifier le statut de l'API vendeur
   */
  async ping() {
    try {
      console.log('🔔 Test API vendeur...');
      
      const result = await apiRequest.get('/sellers/ping');

      if (result.success) {
        console.log('✅ API vendeur accessible');
        return {
          success: true,
          data: result.data,
        };
      } else {
        console.error('❌ API vendeur inaccessible:', result.error);
        return {
          success: false,
          error: result.error || 'API vendeur inaccessible',
        };
      }
    } catch (error) {
      console.error('❌ Erreur ping vendeur:', error);
      return {
        success: false,
        error: 'Impossible de contacter le service vendeur',
      };
    }
  }

  /**
   * Récupérer mon profil vendeur
   */
  async getMyProfile() {
    try {
      console.log('👤 Récupération profil vendeur...');
      
      const result = await apiRequest.get('/sellers/my/profile');

      if (result.success) {
        console.log('✅ Profil vendeur récupéré');
        return {
          success: true,
          data: result.data.seller,
        };
      } else {
        console.log('ℹ️ Pas de profil vendeur trouvé');
        return {
          success: false,
          error: result.error || 'Aucun profil vendeur',
        };
      }
    } catch (error) {
      console.error('❌ Erreur récupération profil vendeur:', error);
      return {
        success: false,
        error: 'Impossible de récupérer le profil vendeur',
      };
    }
  }

  /**
   * Créer un profil vendeur
   */
  async createProfile(profileData) {
    try {
      console.log('📝 Création profil vendeur...');
      
      const result = await apiRequest.post('/sellers/profile', profileData);

      if (result.success) {
        console.log('✅ Profil vendeur créé:', result.data.seller.businessName);
        return {
          success: true,
          data: result.data.seller,
        };
      } else {
        console.error('❌ Échec création profil vendeur:', result.error);
        return {
          success: false,
          error: result.error || 'Erreur lors de la création du profil',
        };
      }
    } catch (error) {
      console.error('❌ Erreur service createProfile:', error);
      return {
        success: false,
        error: 'Impossible de créer le profil vendeur',
      };
    }
  }

  /**
   * Mettre à jour mon profil vendeur
   */
  async updateProfile(updateData) {
    try {
      console.log('✏️ Mise à jour profil vendeur...');
      
      const result = await apiRequest.put('/sellers/my/profile', updateData);

      if (result.success) {
        console.log('✅ Profil vendeur mis à jour');
        return {
          success: true,
          data: result.data.seller,
        };
      } else {
        console.error('❌ Échec mise à jour profil vendeur:', result.error);
        return {
          success: false,
          error: result.error || 'Erreur lors de la mise à jour',
        };
      }
    } catch (error) {
      console.error('❌ Erreur service updateProfile:', error);
      return {
        success: false,
        error: 'Impossible de mettre à jour le profil',
      };
    }
  }

  /**
   * Supprimer mon profil vendeur
   */
  async deleteProfile() {
    try {
      console.log('🗑️ Suppression profil vendeur...');
      
      const result = await apiRequest.delete('/sellers/my/profile');

      if (result.success) {
        console.log('✅ Profil vendeur supprimé');
        return {
          success: true,
        };
      } else {
        console.error('❌ Échec suppression profil vendeur:', result.error);
        return {
          success: false,
          error: result.error || 'Erreur lors de la suppression',
        };
      }
    } catch (error) {
      console.error('❌ Erreur service deleteProfile:', error);
      return {
        success: false,
        error: 'Impossible de supprimer le profil',
      };
    }
  }

  /**
   * Changer le statut de disponibilité
   */
  async toggleAvailability() {
    try {
      console.log('🔄 Changement disponibilité vendeur...');
      
      const result = await apiRequest.patch('/sellers/my/availability');

      if (result.success) {
        console.log('✅ Disponibilité changée:', result.data.isAvailable ? 'Disponible' : 'Indisponible');
        return {
          success: true,
          data: result.data,
        };
      } else {
        console.error('❌ Échec changement disponibilité:', result.error);
        return {
          success: false,
          error: result.error || 'Erreur lors du changement de disponibilité',
        };
      }
    } catch (error) {
      console.error('❌ Erreur service toggleAvailability:', error);
      return {
        success: false,
        error: 'Impossible de changer la disponibilité',
      };
    }
  }

  /**
   * Récupérer mes statistiques vendeur
   */
  async getMyStats() {
    try {
      console.log('📊 Récupération stats vendeur...');
      
      const result = await apiRequest.get('/sellers/my/stats');

      if (result.success) {
        console.log('✅ Stats vendeur récupérées');
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
   * Rechercher des vendeurs par proximité et spécialité
   */
  async searchSellers(longitude, latitude, maxDistance = 10, category, subCategory = null, page = 1) {
    try {
      console.log('🔍 Recherche vendeurs...');
      
      let url = `/sellers/search?longitude=${longitude}&latitude=${latitude}&maxDistance=${maxDistance}&category=${category}&page=${page}`;
      if (subCategory) {
        url += `&subCategory=${subCategory}`;
      }
      
      const result = await apiRequest.get(url);

      if (result.success) {
        console.log('✅ Vendeurs trouvés:', result.data.sellers.length);
        return {
          success: true,
          data: result.data,
        };
      } else {
        console.error('❌ Échec recherche vendeurs:', result.error);
        return {
          success: false,
          error: result.error || 'Erreur lors de la recherche',
        };
      }
    } catch (error) {
      console.error('❌ Erreur service searchSellers:', error);
      return {
        success: false,
        error: 'Impossible d\'effectuer la recherche',
      };
    }
  }

  /**
   * Récupérer un vendeur par ID
   */
  async getSellerById(sellerId) {
    try {
      console.log('👁️ Récupération vendeur:', sellerId);
      
      const result = await apiRequest.get(`/sellers/${sellerId}`);

      if (result.success) {
        console.log('✅ Vendeur récupéré');
        return {
          success: true,
          data: result.data.seller,
        };
      } else {
        console.error('❌ Échec récupération vendeur:', result.error);
        return {
          success: false,
          error: result.error || 'Vendeur non trouvé',
        };
      }
    } catch (error) {
      console.error('❌ Erreur service getSellerById:', error);
      return {
        success: false,
        error: 'Impossible de récupérer le vendeur',
      };
    }
  }

  /**
   * Mettre à jour les paramètres de notification
   */
  async updateNotificationSettings(settings) {
    try {
      console.log('🔔 Mise à jour notifications vendeur...');
      
      const result = await apiRequest.put('/sellers/my/notifications', {
        notificationSettings: settings
      });

      if (result.success) {
        console.log('✅ Notifications mises à jour');
        return {
          success: true,
          data: result.data.notificationSettings,
        };
      } else {
        console.error('❌ Échec mise à jour notifications:', result.error);
        return {
          success: false,
          error: result.error || 'Erreur lors de la mise à jour des notifications',
        };
      }
    } catch (error) {
      console.error('❌ Erreur service updateNotificationSettings:', error);
      return {
        success: false,
        error: 'Impossible de mettre à jour les notifications',
      };
    }
  }

  /**
   * Valider les données de profil vendeur côté client
   */
  validateProfileData(data) {
    const errors = {};

    // Nom d'entreprise
    if (!data.businessName || data.businessName.trim().length < 2) {
      errors.businessName = 'Le nom de l\'entreprise doit contenir au moins 2 caractères';
    }

    // Description
    if (!data.description || data.description.trim().length < 10) {
      errors.description = 'La description doit contenir au moins 10 caractères';
    }

    // Téléphone
    if (!data.phone || !/^[0-9+\-\s().]+$/.test(data.phone)) {
      errors.phone = 'Format de téléphone invalide';
    }

    // Localisation
    if (!data.location || !data.location.coordinates || data.location.coordinates.length !== 2) {
      errors.location = 'Localisation requise';
    }

    // Rayon de service
    if (!data.serviceRadius || data.serviceRadius < 1 || data.serviceRadius > 100) {
      errors.serviceRadius = 'Le rayon doit être entre 1 et 100 km';
    }

    // Spécialités
    if (!data.specialties || data.specialties.length === 0) {
      errors.specialties = 'Au moins une spécialité est requise';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  /**
   * Formater les données pour l'envoi à l'API
   */
  formatProfileData(data) {
    return {
      businessName: data.businessName?.trim(),
      description: data.description?.trim(),
      phone: data.phone?.trim(),
      location: data.location,
      serviceRadius: parseInt(data.serviceRadius),
      specialties: data.specialties || []
    };
  }
}

// Exporter une instance unique du service
export default new SellerService();