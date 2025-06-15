import { apiRequest } from './api';

/**
 * Service de gestion des vendeurs
 * Gère toutes les interactions avec l'API vendeur pour l'édition du profil
 */
class SellerService {

  // ============================================================
  // 📋 GESTION DU PROFIL VENDEUR
  // ============================================================

  /**
   * Récupérer le profil vendeur connecté
   */
  async getProfile() {
    try {
      console.log('👤 Récupération du profil vendeur...');
      
      const result = await apiRequest.get('/seller/profile');

      if (result.success) {
        console.log('✅ Profil vendeur récupéré');
        return {
          success: true,
          data: result.data,
        };
      } else {
        console.error('❌ Échec récupération profil vendeur:', result.error);
        return {
          success: false,
          error: result.error || 'Erreur lors de la récupération du profil vendeur',
        };
      }
    } catch (error) {
      console.error('❌ Erreur service profil vendeur:', error);
      return {
        success: false,
        error: 'Impossible de récupérer le profil vendeur',
      };
    }
  }

  /**
   * Mettre à jour les informations générales du profil vendeur
   */
  async updateGeneralInfo(updateData) {
    try {
      console.log('✏️ Mise à jour des informations générales...');
      
      const result = await apiRequest.put('/seller/profile', updateData);

      if (result.success) {
        console.log('✅ Informations générales mises à jour');
        return {
          success: true,
          data: result.data,
        };
      } else {
        console.error('❌ Échec mise à jour informations:', result.error);
        return {
          success: false,
          error: result.error || 'Erreur lors de la mise à jour',
        };
      }
    } catch (error) {
      console.error('❌ Erreur service update informations:', error);
      return {
        success: false,
        error: 'Impossible de mettre à jour les informations',
      };
    }
  }

  // ============================================================
  // 🏷️ GESTION DES SPÉCIALITÉS (CATÉGORIES/SOUS-CATÉGORIES)
  // ============================================================

  /**
   * Ajouter une nouvelle spécialité
   */
  async addSpecialty(specialtyData) {
    try {
      console.log('➕ Ajout d\'une nouvelle spécialité:', specialtyData.category);
      
      const result = await apiRequest.post('/seller/specialties', specialtyData);

      if (result.success) {
        console.log('✅ Spécialité ajoutée avec succès');
        return {
          success: true,
          data: result.data,
        };
      } else {
        console.error('❌ Échec ajout spécialité:', result.error);
        return {
          success: false,
          error: result.error || 'Erreur lors de l\'ajout de la spécialité',
        };
      }
    } catch (error) {
      console.error('❌ Erreur service ajout spécialité:', error);
      return {
        success: false,
        error: 'Impossible d\'ajouter la spécialité',
      };
    }
  }

  /**
   * Modifier une spécialité existante
   */
  async updateSpecialty(specialtyId, specialtyData) {
    try {
      console.log('✏️ Modification de la spécialité:', specialtyId);
      
      const result = await apiRequest.put(`/seller/specialties/${specialtyId}`, specialtyData);

      if (result.success) {
        console.log('✅ Spécialité modifiée avec succès');
        return {
          success: true,
          data: result.data,
        };
      } else {
        console.error('❌ Échec modification spécialité:', result.error);
        return {
          success: false,
          error: result.error || 'Erreur lors de la modification de la spécialité',
        };
      }
    } catch (error) {
      console.error('❌ Erreur service modification spécialité:', error);
      return {
        success: false,
        error: 'Impossible de modifier la spécialité',
      };
    }
  }

  /**
   * Supprimer une spécialité
   */
  async removeSpecialty(specialtyId) {
    try {
      console.log('🗑️ Suppression de la spécialité:', specialtyId);
      
      const result = await apiRequest.delete(`/seller/specialties/${specialtyId}`);

      if (result.success) {
        console.log('✅ Spécialité supprimée avec succès');
        return {
          success: true,
          data: result.data,
        };
      } else {
        console.error('❌ Échec suppression spécialité:', result.error);
        return {
          success: false,
          error: result.error || 'Erreur lors de la suppression de la spécialité',
        };
      }
    } catch (error) {
      console.error('❌ Erreur service suppression spécialité:', error);
      return {
        success: false,
        error: 'Impossible de supprimer la spécialité',
      };
    }
  }

  // ============================================================
  // 🏪 GESTION DU MAGASIN (MÉTHODES EXISTANTES PRÉSERVÉES)
  // ============================================================

  /**
   * Créer un nouveau profil vendeur
   */
  async createProfile(profileData) {
    try {
      console.log('🆕 Création d\'un nouveau profil vendeur...');
      
      const result = await apiRequest.post('/sellers/create', profileData);

      if (result.success) {
        console.log('✅ Profil vendeur créé avec succès');
        return {
          success: true,
          data: result.data,
        };
      } else {
        console.error('❌ Échec création profil vendeur:', result.error);
        return {
          success: false,
          error: result.error || 'Erreur lors de la création du profil vendeur',
        };
      }
    } catch (error) {
      console.error('❌ Erreur service création profil vendeur:', error);
      return {
        success: false,
        error: 'Impossible de créer le profil vendeur',
      };
    }
  }

  /**
   * Rechercher des vendeurs par proximité
   */
  async searchNearby(searchParams) {
    try {
      console.log('🔍 Recherche de vendeurs à proximité...');
      
      const { longitude, latitude, maxDistance, category, subCategory, page, limit } = searchParams;
      
      const queryParams = new URLSearchParams({
        longitude: longitude.toString(),
        latitude: latitude.toString(),
        maxDistance: maxDistance.toString(),
        category,
        ...(subCategory && { subCategory }),
        page: page?.toString() || '1',
        limit: limit?.toString() || '20'
      });

      const result = await apiRequest.get(`/sellers/search?${queryParams}`);

      if (result.success) {
        console.log('✅ Vendeurs trouvés:', result.data.sellers?.length || 0);
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
      console.error('❌ Erreur service recherche vendeurs:', error);
      return {
        success: false,
        error: 'Impossible de rechercher des vendeurs',
      };
    }
  }

  /**
   * Récupérer un vendeur par ID
   */
  async getById(sellerId) {
    try {
      console.log('👁️ Récupération du vendeur:', sellerId);
      
      const result = await apiRequest.get(`/sellers/${sellerId}`);

      if (result.success) {
        console.log('✅ Vendeur récupéré');
        return {
          success: true,
          data: result.data,
        };
      } else {
        console.error('❌ Échec récupération vendeur:', result.error);
        return {
          success: false,
          error: result.error || 'Vendeur non trouvé',
        };
      }
    } catch (error) {
      console.error('❌ Erreur service récupération vendeur:', error);
      return {
        success: false,
        error: 'Impossible de récupérer le vendeur',
      };
    }
  }

  /**
   * Basculer la disponibilité du vendeur
   */
  async toggleAvailability() {
    try {
      console.log('🔄 Changement de disponibilité...');
      
      const result = await apiRequest.post('/sellers/availability');

      if (result.success) {
        console.log('✅ Disponibilité changée');
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
      console.error('❌ Erreur service disponibilité:', error);
      return {
        success: false,
        error: 'Impossible de changer la disponibilité',
      };
    }
  }

  /**
   * Récupérer les statistiques du vendeur
   */
  async getStats() {
    try {
      console.log('📊 Récupération des statistiques vendeur...');
      
      const result = await apiRequest.get('/sellers/stats');

      if (result.success) {
        console.log('✅ Statistiques récupérées');
        return {
          success: true,
          data: result.data,
        };
      } else {
        console.error('❌ Échec récupération statistiques:', result.error);
        return {
          success: false,
          error: result.error || 'Erreur lors de la récupération des statistiques',
        };
      }
    } catch (error) {
      console.error('❌ Erreur service statistiques:', error);
      return {
        success: false,
        error: 'Impossible de récupérer les statistiques',
      };
    }
  }

  // ============================================================
  // 🧪 UTILITAIRES ET TESTS
  // ============================================================

  /**
   * Valider les données d'une spécialité
   */
  validateSpecialtyData(specialtyData) {
    const { category, subCategories } = specialtyData;

    if (!category || typeof category !== 'string' || category.trim().length === 0) {
      return {
        isValid: false,
        error: 'La catégorie est requise'
      };
    }

    if (!subCategories || !Array.isArray(subCategories) || subCategories.length === 0) {
      return {
        isValid: false,
        error: 'Au moins une sous-catégorie est requise'
      };
    }

    for (const subCategory of subCategories) {
      if (!subCategory || typeof subCategory !== 'string' || subCategory.trim().length === 0) {
        return {
          isValid: false,
          error: 'Toutes les sous-catégories doivent être valides'
        };
      }
    }

    return {
      isValid: true
    };
  }

  /**
   * Valider les données du profil général
   */
  validateGeneralInfoData(profileData) {
    const errors = [];

    if (profileData.businessName !== undefined) {
      if (!profileData.businessName || profileData.businessName.trim().length < 2) {
        errors.push('Le nom de l\'entreprise doit contenir au moins 2 caractères');
      }
      if (profileData.businessName.trim().length > 100) {
        errors.push('Le nom de l\'entreprise ne peut pas dépasser 100 caractères');
      }
    }

    if (profileData.description !== undefined) {
      if (!profileData.description || profileData.description.trim().length < 10) {
        errors.push('La description doit contenir au moins 10 caractères');
      }
      if (profileData.description.trim().length > 500) {
        errors.push('La description ne peut pas dépasser 500 caractères');
      }
    }

    if (profileData.phone !== undefined) {
      if (!profileData.phone || profileData.phone.trim().length < 10) {
        errors.push('Le numéro de téléphone doit contenir au moins 10 caractères');
      }
    }

    if (profileData.location !== undefined && profileData.location.coordinates) {
      const { coordinates } = profileData.location;
      if (!Array.isArray(coordinates) || coordinates.length !== 2) {
        errors.push('Les coordonnées de localisation sont invalides');
      }
      const [longitude, latitude] = coordinates;
      if (typeof longitude !== 'number' || typeof latitude !== 'number') {
        errors.push('Les coordonnées doivent être des nombres');
      }
      if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
        errors.push('Les coordonnées sont hors des limites géographiques');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Tester la connexion au service vendeur
   */
  async testConnection() {
    try {
      console.log('🧪 Test de connexion au service vendeur...');
      
      const result = await apiRequest.get('/sellers/ping');

      if (result.success) {
        console.log('✅ Service vendeur accessible');
        return {
          success: true,
          data: result.data,
        };
      } else {
        console.error('❌ Service vendeur non accessible:', result.error);
        return {
          success: false,
          error: result.error || 'Service non accessible',
        };
      }
    } catch (error) {
      console.error('❌ Erreur test connexion service vendeur:', error);
      return {
        success: false,
        error: 'Erreur de connexion au service vendeur',
      };
    }
  }

  /**
   * Obtenir la configuration du service
   */
  getConfig() {
    return {
      endpoints: {
        profile: '/seller/profile',
        specialties: '/seller/specialties',
        search: '/sellers/search',
        stats: '/sellers/stats',
        availability: '/sellers/availability'
      },
      validation: {
        businessName: { min: 2, max: 100 },
        description: { min: 10, max: 500 },
        phone: { min: 10, max: 20 },
        specialties: { min: 1 }
      },
      features: {
        editProfile: true,
        manageSpecialties: true,
        search: true,
        statistics: true,
        availability: true
      }
    };
  }
}

// Exporter une instance unique du service
export default new SellerService();