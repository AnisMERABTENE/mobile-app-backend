// backend/src/services/notificationService.js
const Seller = require('../models/Seller');
const { 
  sendNotificationToSpecificSellers,
  sendNotificationToUser,
  getConnectionStats 
} = require('../config/socket');

/**
 * Service de notifications en temps réel
 */
class NotificationService {

  /**
   * Notifier les vendeurs d'une nouvelle demande
   */
  async notifyNewRequest(request) {
    try {
      console.log('📢 Recherche vendeurs pour nouvelle demande:', request.title);
      console.log('📍 Localisation:', request.location.city, request.location.coordinates);
      console.log('🏷️ Catégorie:', request.category, '>', request.subCategory);
      console.log('📏 Rayon:', request.radius, 'km');

      // 1. Trouver les vendeurs correspondants
      const matchingSellers = await this.findMatchingSellers(request);
      
      console.log('👥 Vendeurs trouvés:', matchingSellers.length);

      if (matchingSellers.length === 0) {
        console.log('ℹ️ Aucun vendeur correspondant pour cette demande');
        return {
          success: true,
          notifiedSellers: 0,
          message: 'Aucun vendeur correspondant trouvé'
        };
      }

      // 2. Préparer les données de notification
      const notificationData = {
        type: 'new_request',
        request: {
          id: request._id,
          title: request.title,
          description: request.description.substring(0, 200) + (request.description.length > 200 ? '...' : ''),
          category: request.category,
          subCategory: request.subCategory,
          location: {
            city: request.location.city,
            address: request.location.address,
            distance: null // Sera calculé pour chaque vendeur
          },
          priority: request.priority,
          photos: request.photos.slice(0, 3), // Max 3 photos pour la notification
          user: {
            firstName: request.user.firstName,
            avatar: request.user.avatar
          },
          createdAt: request.createdAt
        },
        metadata: {
          urgency: this.calculateUrgency(request),
          matchScore: null // Sera calculé pour chaque vendeur
        }
      };

      // 3. Envoyer les notifications personnalisées
      const notificationPromises = matchingSellers.map(seller => 
        this.sendPersonalizedNotification(seller, notificationData, request)
      );

      const results = await Promise.allSettled(notificationPromises);
      const successCount = results.filter(result => result.status === 'fulfilled').length;

      console.log(`✅ Notifications envoyées: ${successCount}/${matchingSellers.length}`);

      // 4. Envoyer une notification de confirmation au demandeur
      await this.notifyRequestCreated(request, successCount);

      return {
        success: true,
        notifiedSellers: successCount,
        totalMatchingSellers: matchingSellers.length,
        message: `${successCount} vendeurs notifiés`
      };

    } catch (error) {
      console.error('❌ Erreur notification nouvelle demande:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Trouver les vendeurs correspondant à une demande
   */
  async findMatchingSellers(request) {
    try {
      const [longitude, latitude] = request.location.coordinates;
      const radiusInMeters = request.radius * 1000; // Convertir km en mètres

      console.log('🔍 Recherche vendeurs avec critères:');
      console.log('  - Coordonnées:', latitude, longitude);
      console.log('  - Rayon:', radiusInMeters, 'mètres');
      console.log('  - Catégorie:', request.category);
      console.log('  - Sous-catégorie:', request.subCategory);

      // Requête MongoDB avec géolocalisation et spécialités
      const matchingSellers = await Seller.find({
        // 1. Vendeur actif et disponible
        status: 'active',
        isAvailable: true,
        
        // 2. Dans la zone géographique
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [longitude, latitude]
            },
            $maxDistance: radiusInMeters
          }
        },
        
        // 3. Spécialité correspondante
        'specialties.category': request.category,
        'specialties.subCategories': request.subCategory,
        
        // 4. Dernière activité récente (dans les 7 derniers jours)
        lastActiveAt: { 
          $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) 
        }
      })
      .populate('user', 'firstName lastName email isActive')
      .lean(); // Plus rapide pour la lecture seule

      // Filtrer les vendeurs avec utilisateurs actifs
      const activeSellers = matchingSellers.filter(seller => 
        seller.user && seller.user.isActive
      );

      console.log(`🎯 ${activeSellers.length} vendeurs actifs trouvés`);

      // Calculer la distance et le score de correspondance pour chaque vendeur
      const sellersWithScore = activeSellers.map(seller => {
        const distance = this.calculateDistance(
          latitude, longitude,
          seller.location.coordinates[1], seller.location.coordinates[0]
        );

        const matchScore = this.calculateMatchScore(seller, request, distance);

        return {
          ...seller,
          distance: Math.round(distance * 100) / 100, // Arrondir à 2 décimales
          matchScore
        };
      });

      // Trier par score de correspondance (meilleur en premier)
      sellersWithScore.sort((a, b) => b.matchScore - a.matchScore);

      return sellersWithScore;

    } catch (error) {
      console.error('❌ Erreur recherche vendeurs:', error);
      throw error;
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
   * Calculer le score de correspondance vendeur/demande
   */
  calculateMatchScore(seller, request, distance) {
    let score = 100; // Score de base

    // 1. Score de distance (plus proche = meilleur)
    const distanceScore = Math.max(0, 50 - (distance * 2)); // -2 points par km
    score += distanceScore;

    // 2. Score de spécialisation (correspondance exacte)
    const hasExactSpecialty = seller.specialties.some(specialty => 
      specialty.category === request.category && 
      specialty.subCategories.includes(request.subCategory)
    );
    if (hasExactSpecialty) score += 30;

    // 3. Score de réputation
    const reputationScore = (seller.stats?.rating || 0) * 10;
    score += reputationScore;

    // 4. Score d'activité récente
    const daysSinceActive = (Date.now() - new Date(seller.lastActiveAt)) / (1000 * 60 * 60 * 24);
    const activityScore = Math.max(0, 20 - daysSinceActive); // -1 point par jour
    score += activityScore;

    // 5. Score de responsivité
    const responseScore = (seller.stats?.respondedRequests / Math.max(1, seller.stats?.totalRequests)) * 20;
    score += responseScore || 0;

    return Math.round(score);
  }

  /**
   * Calculer l'urgence d'une demande
   */
  calculateUrgency(request) {
    switch (request.priority) {
      case 'urgent': return 'high';
      case 'high': return 'high';
      case 'medium': return 'medium';
      case 'low': return 'low';
      default: return 'medium';
    }
  }

  /**
   * Envoyer une notification personnalisée à un vendeur
   */
  async sendPersonalizedNotification(seller, baseNotificationData, request) {
    try {
      // Personnaliser les données pour ce vendeur
      const personalizedData = {
        ...baseNotificationData,
        request: {
          ...baseNotificationData.request,
          location: {
            ...baseNotificationData.request.location,
            distance: seller.distance
          }
        },
        metadata: {
          ...baseNotificationData.metadata,
          matchScore: seller.matchScore
        },
        seller: {
          id: seller._id,
          businessName: seller.businessName
        }
      };

      // Envoyer via Socket.IO
      const success = sendNotificationToUser(
        seller.user._id.toString(),
        'new_request_notification',
        personalizedData
      );

      if (success) {
        console.log(`📨 Notification envoyée à ${seller.user.email} (score: ${seller.matchScore})`);
        
        // Mettre à jour les stats du vendeur
        await this.updateSellerStats(seller._id, 'notification_received');
      }

      return success;

    } catch (error) {
      console.error(`❌ Erreur notification vendeur ${seller.user.email}:`, error);
      throw error;
    }
  }

  /**
   * Notifier le demandeur que sa demande a été créée
   */
  async notifyRequestCreated(request, notifiedSellersCount) {
    try {
      const notificationData = {
        type: 'request_created',
        request: {
          id: request._id,
          title: request.title,
          status: request.status
        },
        stats: {
          notifiedSellers: notifiedSellersCount,
          estimatedResponses: Math.ceil(notifiedSellersCount * 0.3) // Estimation 30% de taux de réponse
        },
        message: notifiedSellersCount > 0 
          ? `Votre demande a été envoyée à ${notifiedSellersCount} vendeurs dans votre zone`
          : 'Votre demande a été publiée mais aucun vendeur correspondant n\'a été trouvé dans votre zone'
      };

      sendNotificationToUser(
        request.user._id.toString(),
        'request_created_confirmation',
        notificationData
      );

      console.log(`✅ Confirmation envoyée au demandeur: ${request.user.email}`);

    } catch (error) {
      console.error('❌ Erreur notification demandeur:', error);
    }
  }

  /**
   * Mettre à jour les statistiques d'un vendeur
   */
  async updateSellerStats(sellerId, action) {
    try {
      const updateQuery = {};
      
      switch (action) {
        case 'notification_received':
          updateQuery.$inc = { 'stats.totalRequests': 1 };
          break;
        case 'response_sent':
          updateQuery.$inc = { 'stats.respondedRequests': 1 };
          break;
        default:
          return;
      }

      await Seller.findByIdAndUpdate(sellerId, updateQuery);
      
    } catch (error) {
      console.error('❌ Erreur mise à jour stats vendeur:', error);
    }
  }

  /**
   * Obtenir les statistiques des notifications
   */
  async getNotificationStats() {
    try {
      const connectionStats = getConnectionStats();
      
      // Stats depuis la base de données
      const dbStats = await Seller.aggregate([
        { $match: { status: 'active' } },
        {
          $group: {
            _id: null,
            totalActiveSellers: { $sum: 1 },
            availableSellers: {
              $sum: { $cond: ['$isAvailable', 1, 0] }
            },
            averageResponseRate: {
              $avg: {
                $cond: [
                  { $gt: ['$stats.totalRequests', 0] },
                  { $divide: ['$stats.respondedRequests', '$stats.totalRequests'] },
                  0
                ]
              }
            }
          }
        }
      ]);

      return {
        connections: connectionStats,
        sellers: dbStats[0] || {
          totalActiveSellers: 0,
          availableSellers: 0,
          averageResponseRate: 0
        }
      };

    } catch (error) {
      console.error('❌ Erreur stats notifications:', error);
      return null;
    }
  }
}

module.exports = new NotificationService();