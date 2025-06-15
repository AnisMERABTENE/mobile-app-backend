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
   * Récupérer les statistiques du vendeur
   */
  async getStats() {
    try {
      console.log('📊 Récupération statistiques vendeur...');
      
      const result = await apiRequest.get('/sellers/my/stats');

      if (result.success) {
        console.log('✅ Statistiques récupérées:', result.data);
        // Le backend retourne { stats: {...} }, on veut juste les stats
        return {
          success: true,
          data: result.data.stats || result.data,
        };
      } else {
        console.log('ℹ️ Pas de statistiques trouvées');
        return {
          success: false,
          error: result.error || 'Aucune statistique',
        };
      }
    } catch (error) {
      console.error('❌ Erreur récupération statistiques:', error);
      return {
        success: false,
        error: 'Impossible de récupérer les statistiques',
      };
    }
  }

  /**
   * Récupérer les demandes reçues pour ce vendeur
   * (utilise l'API de recherche par proximité basée sur les spécialités du vendeur)
   */
  async getReceivedRequests() {
    try {
      console.log('📬 Récupération demandes reçues...');
      
      // 1. D'abord récupérer mon profil vendeur
      const profileResult = await this.getMyProfile();
      if (!profileResult.success) {
        return {
          success: false,
          error: 'Profil vendeur requis',
        };
      }

      const sellerProfile = profileResult.data;
      console.log('✅ Profil vendeur:', sellerProfile.businessName);

      // 2. Rechercher les demandes pour chaque spécialité
      const allRequests = [];
      const processedRequestIds = new Set();

      const [longitude, latitude] = sellerProfile.location.coordinates;
      const maxDistance = 25000; // 25km en mètres

      for (const specialty of sellerProfile.specialties) {
        try {
          console.log(`🔍 Recherche demandes: ${specialty.category}`);

          // Utiliser l'endpoint de recherche par proximité
          const searchResult = await apiRequest.get('/requests/search', {
            params: {
              longitude,
              latitude,
              maxDistance,
              category: specialty.category,
              page: 1,
              limit: 50
            }
          });

          if (searchResult.success && searchResult.data.requests) {
            // Filtrer par sous-catégories et éviter les doublons
            const filteredRequests = searchResult.data.requests.filter(request => 
              specialty.subCategories.includes(request.subCategory) &&
              !processedRequestIds.has(request._id) &&
              request.status === 'active'
            );

            filteredRequests.forEach(request => {
              processedRequestIds.add(request._id);
              
              // Calculer la distance du vendeur
              const distance = this.calculateDistance(
                latitude, longitude,
                request.location.coordinates[1], 
                request.location.coordinates[0]
              );

              allRequests.push({
                ...request,
                matchingSpecialty: {
                  category: specialty.category,
                  subCategory: request.subCategory
                },
                distanceFromSeller: Math.round(distance * 100) / 100,
                matchScore: this.calculateMatchScore(request, specialty, distance)
              });
            });

            console.log(`✅ ${filteredRequests.length} demandes trouvées pour ${specialty.category}`);
          }

        } catch (subError) {
          console.warn(`⚠️ Erreur recherche ${specialty.category}:`, subError.message);
        }
      }

      // 3. Trier par score de correspondance et date
      allRequests.sort((a, b) => {
        if (b.matchScore !== a.matchScore) {
          return b.matchScore - a.matchScore;
        }
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      console.log(`✅ ${allRequests.length} demandes reçues trouvées au total`);

      return {
        success: true,
        data: {
          requests: allRequests,
          total: allRequests.length,
          byStatus: {
            active: allRequests.filter(r => r.status === 'active').length,
            completed: allRequests.filter(r => r.status === 'completed').length,
            cancelled: allRequests.filter(r => r.status === 'cancelled').length,
          }
        },
      };

    } catch (error) {
      console.error('❌ Erreur récupération demandes reçues:', error);
      return {
        success: false,
        error: 'Impossible de récupérer les demandes reçues',
      };
    }
  }

  /**
   * Calculer la distance entre deux points géographiques
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Rayon de la Terre en km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  deg2rad(deg) {
    return deg * (Math.PI/180);
  }

  /**
   * Calculer le score de correspondance pour une demande
   */
  calculateMatchScore(request, specialty, distance) {
    let score = 100;

    // Score de distance (plus proche = meilleur)
    const distanceScore = Math.max(0, 50 - (distance * 2));
    score += distanceScore;

    // Bonus correspondance exacte
    score += 30;

    // Score de priorité
    switch (request.priority) {
      case 'urgent': score += 20; break;
      case 'high': score += 15; break;
      case 'medium': score += 10; break;
      case 'low': score += 5; break;
    }

    // Score de fraîcheur (demandes récentes = meilleures)
    const daysSinceCreated = (new Date() - new Date(request.createdAt)) / (1000 * 60 * 60 * 24);
    const freshnessScore = Math.max(0, 20 - daysSinceCreated);
    score += freshnessScore;

    return Math.round(score);
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