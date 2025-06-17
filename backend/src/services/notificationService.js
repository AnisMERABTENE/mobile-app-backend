// backend/src/services/notificationService.js
const Seller = require('../models/Seller');
const User = require('../models/User');
const { 
  sendNotificationToSpecificSellers,
  sendNotificationToUser,
  getConnectionStats 
} = require('../config/socket');

// 🔥 NOUVEAU : Import du service Expo Push
const expoPushService = require('./expoPushService');

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

      // 4. Notifier le demandeur que sa demande a été créée
      await this.notifyRequestCreated(request, successCount);

      return {
        success: true,
        notifiedSellers: successCount,
        totalSellers: matchingSellers.length,
        message: `Notifications envoyées à ${successCount} vendeur(s)`
      };

    } catch (error) {
      console.error('❌ Erreur notification nouvelle demande:', error);
      return {
        success: false,
        notifiedSellers: 0,
        error: error.message
      };
    }
  }

  /**
   * 🔥 NOUVEAU : Notifier le client qu'un vendeur a répondu à sa demande
   */
  async notifyNewResponse(response) {
    try {
      console.log('📧 Notification nouvelle réponse:', response._id);

      // 1. Récupérer les données complètes avec populate
      await response.populate([
        {
          path: 'request',
          select: 'title user category subCategory location',
          populate: {
            path: 'user',
            select: 'firstName lastName email expoPushToken'
          }
        },
        {
          path: 'seller',
          select: 'businessName phone isAvailable'
        },
        {
          path: 'sellerUser',
          select: 'firstName lastName email avatar'
        }
      ]);

      const client = response.request.user;
      const vendeur = response.sellerUser;

      console.log('👤 Client à notifier:', client.email);
      console.log('🔧 Vendeur qui répond:', vendeur.email);

      // 2. Préparer les données de notification
      const notificationData = {
        type: 'new_response',
        response: {
          id: response._id,
          message: response.message.substring(0, 150) + (response.message.length > 150 ? '...' : ''),
          price: response.price,
          photos: response.photos.slice(0, 2), // Max 2 photos pour la notification
          status: response.status,
          responseTime: response.responseTime,
          createdAt: response.createdAt
        },
        request: {
          id: response.request._id,
          title: response.request.title,
          category: response.request.category,
          subCategory: response.request.subCategory
        },
        seller: {
          businessName: response.seller.businessName,
          firstName: vendeur.firstName,
          lastName: vendeur.lastName,
          avatar: vendeur.avatar,
          isAvailable: response.seller.isAvailable
        },
        metadata: {
          urgency: 'normal', // Les réponses sont moins urgentes que les demandes
          notification_id: `response_${response._id}_${Date.now()}`
        }
      };

      console.log('📦 Données notification préparées:', {
        client: client.email,
        response_id: response._id,
        request_title: response.request.title
      });

      // 3. Envoyer notification WebSocket au client
      const socketSuccess = sendNotificationToUser(
        client._id.toString(),
        'new_response_notification',
        notificationData
      );

      if (socketSuccess) {
        console.log(`📨 Notification WebSocket envoyée au client: ${client.email}`);
      } else {
        console.log(`⚠️ Échec WebSocket pour client: ${client.email}`);
      }

      // 4. Envoyer notification push si le client a un token
      if (client.expoPushToken && expoPushService.isValidExpoPushToken(client.expoPushToken)) {
        console.log(`🔔 Envoi notification push au client: ${client.email}...`);
        
        const pushNotification = this.createResponsePushNotification(notificationData);
        
        const pushResult = await expoPushService.sendPushNotification(
          client.expoPushToken,
          pushNotification.title,
          pushNotification.body,
          pushNotification.data
        );
        
        if (pushResult.success) {
          console.log(`✅ Push notification envoyée au client: ${client.email}`);
        } else {
          console.log(`⚠️ Échec push notification pour client: ${client.email}:`, pushResult.error);
        }
      } else {
        console.log(`ℹ️ Pas de token push valide pour client: ${client.email} (WebSocket seulement)`);
      }

      // 5. Marquer la réponse comme notifiée (optionnel, pour tracking)
      response.isNotified = true;
      await response.save();

      console.log('✅ Notification nouvelle réponse terminée');

      return {
        success: true,
        client: client.email,
        vendeur: vendeur.email,
        socketSent: socketSuccess,
        pushSent: !!(client.expoPushToken && expoPushService.isValidExpoPushToken(client.expoPushToken))
      };

    } catch (error) {
      console.error('❌ Erreur notification nouvelle réponse:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 🔥 NOUVEAU : Créer une notification push pour une nouvelle réponse
   */
  createResponsePushNotification(data) {
    const vendeurName = `${data.seller.firstName} ${data.seller.lastName}`;
    const businessName = data.seller.businessName;
    const price = data.response.price;

    return {
      title: '💬 Nouvelle réponse reçue !',
      body: `${businessName} a répondu à votre demande "${data.request.title}" - ${price}€`,
      data: {
        type: 'new_response',
        responseId: data.response.id,
        requestId: data.request.id,
        sellerId: data.seller.id,
        price: price,
        category: data.request.category,
        businessName: businessName,
        timestamp: data.response.createdAt,
        navigation: {
          screen: 'RequestDetail',
          params: {
            requestId: data.request.id,
            tab: 'responses' // Ouvrir directement l'onglet réponses
          }
        }
      },
      sound: 'default',
      badge: 1
    };
  }

  /**
   * 🔥 NOUVEAU : Notifier le vendeur qu'une réponse a été acceptée/déclinée
   */
  async notifyResponseStatusChange(response, newStatus, feedback = null) {
    try {
      console.log(`📝 Notification changement statut réponse: ${response._id} → ${newStatus}`);

      // Populer les données
      await response.populate([
        {
          path: 'request',
          select: 'title user',
          populate: {
            path: 'user',
            select: 'firstName lastName email'
          }
        },
        {
          path: 'sellerUser',
          select: 'firstName lastName email expoPushToken'
        }
      ]);

      const vendeur = response.sellerUser;
      const client = response.request.user;

      console.log('🔧 Vendeur à notifier:', vendeur.email);
      console.log('👤 Client qui a répondu:', client.email);

      // Préparer les données de notification
      const notificationData = {
        type: 'response_status_changed',
        response: {
          id: response._id,
          status: newStatus,
          price: response.price,
          message: response.message.substring(0, 100) + '...'
        },
        request: {
          id: response.request._id,
          title: response.request.title
        },
        client: {
          firstName: client.firstName,
          lastName: client.lastName
        },
        feedback: feedback,
        metadata: {
          isAccepted: newStatus === 'accepted',
          timestamp: new Date().toISOString()
        }
      };

      // Envoyer notification WebSocket
      const socketSuccess = sendNotificationToUser(
        vendeur._id.toString(),
        'response_status_notification',
        notificationData
      );

      // Envoyer notification push si possible
      if (vendeur.expoPushToken && expoPushService.isValidExpoPushToken(vendeur.expoPushToken)) {
        const title = newStatus === 'accepted' ? '🎉 Réponse acceptée !' : '❌ Réponse déclinée';
        const body = newStatus === 'accepted' 
          ? `${client.firstName} a accepté votre offre de ${response.price}€`
          : `${client.firstName} a décliné votre offre pour "${response.request.title}"`;

        const pushResult = await expoPushService.sendPushNotification(
          vendeur.expoPushToken,
          title,
          body,
          {
            type: 'response_status_changed',
            responseId: response._id,
            requestId: response.request._id,
            status: newStatus,
            clientName: `${client.firstName} ${client.lastName}`
          }
        );

        console.log(`${pushResult.success ? '✅' : '❌'} Push notification statut réponse:`, vendeur.email);
      }

      return { success: true };

    } catch (error) {
      console.error('❌ Erreur notification changement statut:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Trouver les vendeurs correspondants à une demande
   */
  async findMatchingSellers(request) {
    try {
      // Recherche géographique avec spécialités
      const sellers = await Seller.aggregate([
        // 1. Match par géolocalisation
        {
          $geoNear: {
            near: {
              type: 'Point',
              coordinates: request.location.coordinates
            },
            distanceField: 'distance',
            maxDistance: request.radius * 1000, // Conversion km -> mètres
            spherical: true,
            query: {
                status: { $in: ['active', 'pending'] },
                isAvailable: true
              }
          }
        },
        
        // 2. Match par spécialités
        {
          $match: {
            'specialties.category': request.category
          }
        },
        
        // 3. Filtrer par sous-catégories
        {
          $addFields: {
            hasSubCategory: {
              $anyElementTrue: {
                $map: {
                  input: '$specialties',
                  as: 'specialty',
                  in: {
                    $and: [
                      { $eq: ['$$specialty.category', request.category] },
                      { $in: [request.subCategory, '$$specialty.subCategories'] }
                    ]
                  }
                }
              }
            }
          }
        },
        
        // 4. Ne garder que ceux qui ont la sous-catégorie
        {
          $match: {
            hasSubCategory: true
          }
        },
        
        // 5. Calculer le score de correspondance
        {
          $addFields: {
            matchScore: {
              $add: [
                // Score de proximité (plus proche = meilleur score)
                { $subtract: [100, { $multiply: [{ $divide: ['$distance', 1000] }, 10] }] },
                
                // Bonus si très disponible
                { $cond: [{ $eq: ['$isAvailable', true] }, 20, 0] },
                
                // Bonus selon le rating
                { $multiply: ['$stats.rating', 5] },
                
                // Bonus selon le taux de réponse
                {
                  $multiply: [
                    {
                      $cond: [
                        { $gt: ['$stats.totalRequests', 0] },
                        { $divide: ['$stats.respondedRequests', '$stats.totalRequests'] },
                        0
                      ]
                    },
                    15
                  ]
                }
              ]
            }
          }
        },
        
        // 6. Trier par score décroissant
        {
          $sort: { matchScore: -1 }
        },
        
        // 7. Limiter à 50 vendeurs maximum
        {
          $limit: 50
        },
        
        // 8. Joindre les données utilisateur
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'user'
          }
        },
        
        // 9. Aplatir l'utilisateur
        {
          $unwind: '$user'
        },
        
        // 10. Projeter seulement les champs nécessaires
        {
          $project: {
            _id: 1,
            businessName: 1,
            'user._id': 1,
            'user.email': 1,
            'user.firstName': 1,
            'user.lastName': 1,
            'user.expoPushToken': 1,
            distance: 1,
            matchScore: 1,
            isAvailable: 1,
            'stats.rating': 1,
            expoPushToken: 1
          }
        }
      ]);

      return sellers;

    } catch (error) {
      console.error('❌ Erreur recherche vendeurs:', error);
      return [];
    }
  }

  /**
   * Envoyer une notification personnalisée à un vendeur
   */
  async sendPersonalizedNotification(seller, notificationData, request) {
    try {
      // Calculer la distance spécifique pour ce vendeur
      const personalizedData = {
        ...notificationData,
        request: {
          ...notificationData.request,
          location: {
            ...notificationData.request.location,
            distance: Math.round(seller.distance / 1000 * 10) / 10 // km avec 1 décimale
          }
        },
        metadata: {
          ...notificationData.metadata,
          matchScore: Math.round(seller.matchScore)
        }
      };

      console.log(`📤 Envoi notification à ${seller.user.email} (score: ${seller.matchScore}, distance: ${personalizedData.request.location.distance}km)`);

      // 🔥 1. TOUJOURS ENVOYER VIA SOCKET.IO (comme avant)
      const socketSuccess = sendNotificationToUser(
        seller.user._id.toString(),
        'new_request_notification',
        personalizedData
      );

      if (socketSuccess) {
        console.log(`📨 Notification Socket.IO envoyée à ${seller.user.email} (score: ${seller.matchScore})`);
      } else {
        console.log(`⚠️ Échec Socket.IO pour ${seller.user.email}`);
      }

      // 🔥 2. ESSAYER D'ENVOYER VIA PUSH (bonus si token disponible)
      const pushToken = seller.expoPushToken || seller.user.expoPushToken;
      if (pushToken && expoPushService.isValidExpoPushToken(pushToken)) {
        console.log(`🔔 Envoi notification push à ${seller.user.email}...`);
        
        const pushNotification = expoPushService.createNewRequestNotification({
          _id: request._id,
          title: request.title,
          location: request.location,
          category: request.category,
          subCategory: request.subCategory
        });
        
        const pushResult = await expoPushService.sendPushNotification(
          pushToken,
          pushNotification.title,
          pushNotification.body,
          pushNotification.data
        );
        
        if (pushResult.success) {
          console.log(`✅ Push notification envoyée à ${seller.user.email}`);
        } else {
          console.log(`⚠️ Échec push notification pour ${seller.user.email}:`, pushResult.error);
        }
      } else {
        console.log(`ℹ️ Pas de token push valide pour ${seller.user.email} (Socket.IO seulement)`);
      }

      // Mettre à jour les stats
      await this.updateSellerStats(seller._id, 'notification_received');

      // 🔥 TOUJOURS retourner true si Socket.IO fonctionne
      return socketSuccess;

    } catch (error) {
      console.error(`❌ Erreur notification vendeur ${seller.user.email}:`, error);
      return false; // Échec complet
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
   * Calculer l'urgence d'une demande
   */
  calculateUrgency(request) {
    switch (request.priority) {
      case 'urgent': return 'high';
      case 'high': return 'medium-high';
      case 'medium': return 'medium';
      case 'low': return 'low';
      default: return 'medium';
    }
  }
  /**
 * 🔥 NOUVEAU : Notifier le client qu'un vendeur a répondu à sa demande
 * ✅ S'ajoute à ton système existant SANS rien casser
 */
async notifyNewResponse(response) {
    try {
      console.log('📧 Notification nouvelle réponse:', response._id);
  
      // 1. Récupérer les données complètes avec populate
      await response.populate([
        {
          path: 'request',
          select: 'title user category subCategory location',
          populate: {
            path: 'user',
            select: 'firstName lastName email expoPushToken' // ✅ Utilise ton système existant
          }
        },
        {
          path: 'seller',
          select: 'businessName phone isAvailable'
        },
        {
          path: 'sellerUser',
          select: 'firstName lastName email avatar'
        }
      ]);
  
      const client = response.request.user;
      const vendeur = response.sellerUser;
      const businessName = response.seller.businessName;
  
      console.log('👤 Client à notifier:', client.email);
      console.log('🔧 Vendeur qui répond:', vendeur.email);
  
      // 2. Préparer les données de notification (même format que ton système)
      const notificationData = {
        type: 'new_response',
        response: {
          id: response._id,
          message: response.message.substring(0, 150) + (response.message.length > 150 ? '...' : ''),
          price: response.price,
          photoCount: response.photos ? response.photos.length : 0,
          createdAt: response.createdAt
        },
        request: {
          id: response.request._id,
          title: response.request.title,
          category: response.request.category,
          location: response.request.location
        },
        seller: {
          businessName: businessName,
          firstName: vendeur.firstName,
          lastName: vendeur.lastName,
          avatar: vendeur.avatar
        },
        navigation: { // ✅ Navigation directe vers l'onglet réponses
          screen: 'RequestDetail',
          params: {
            requestId: response.request._id,
            tab: 'responses'
          }
        },
        metadata: {
          timestamp: new Date().toISOString(),
          priority: 'high'
        }
      };
  
      // 3. ✅ Notification WebSocket (utilise ton système existant)
      const socketSuccess = sendNotificationToUser(
        client._id.toString(),
        'new_response_notification', // ✅ Nouvel événement
        notificationData
      );
  
      console.log('📡 Notification WebSocket client:', socketSuccess ? 'Envoyée' : 'Client non connecté');
  
      // 4. ✅ Notification Push (utilise ton expoPushService existant)
      if (client.expoPushToken && expoPushService.isValidExpoPushToken(client.expoPushToken)) {
        
        const pushResult = await expoPushService.sendPushNotification(
          client.expoPushToken,
          '🎉 Nouvelle réponse reçue !',
          `${businessName} a répondu à votre demande "${response.request.title}" - ${response.price}€`,
          notificationData // ✅ Même data pour cohérence
        );
  
        console.log('📱 Résultat push client:', pushResult.success ? 'Envoyée' : pushResult.error);
      }
  
      return {
        success: true,
        clientNotified: client.email,
        socketSent: socketSuccess,
        pushSent: !!client.expoPushToken
      };
  
    } catch (error) {
      console.error('❌ Erreur notification nouvelle réponse:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }/**
 * 🔥 NOUVEAU : Notifier le client qu'un vendeur a répondu à sa demande
 * ✅ S'ajoute à ton système existant SANS rien casser
 */
async notifyNewResponse(response) {
    try {
      console.log('📧 Notification nouvelle réponse:', response._id);
  
      // 1. Récupérer les données complètes avec populate
      await response.populate([
        {
          path: 'request',
          select: 'title user category subCategory location',
          populate: {
            path: 'user',
            select: 'firstName lastName email expoPushToken' // ✅ Utilise ton système existant
          }
        },
        {
          path: 'seller',
          select: 'businessName phone isAvailable'
        },
        {
          path: 'sellerUser',
          select: 'firstName lastName email avatar'
        }
      ]);
  
      const client = response.request.user;
      const vendeur = response.sellerUser;
      const businessName = response.seller.businessName;
  
      console.log('👤 Client à notifier:', client.email);
      console.log('🔧 Vendeur qui répond:', vendeur.email);
  
      // 2. Préparer les données de notification (même format que ton système)
      const notificationData = {
        type: 'new_response',
        response: {
          id: response._id,
          message: response.message.substring(0, 150) + (response.message.length > 150 ? '...' : ''),
          price: response.price,
          photoCount: response.photos ? response.photos.length : 0,
          createdAt: response.createdAt
        },
        request: {
          id: response.request._id,
          title: response.request.title,
          category: response.request.category,
          location: response.request.location
        },
        seller: {
          businessName: businessName,
          firstName: vendeur.firstName,
          lastName: vendeur.lastName,
          avatar: vendeur.avatar
        },
        navigation: { // ✅ Navigation directe vers l'onglet réponses
          screen: 'RequestDetail',
          params: {
            requestId: response.request._id,
            tab: 'responses'
          }
        },
        metadata: {
          timestamp: new Date().toISOString(),
          priority: 'high'
        }
      };
  
      // 3. ✅ Notification WebSocket (utilise ton système existant)
      const socketSuccess = sendNotificationToUser(
        client._id.toString(),
        'new_response_notification', // ✅ Nouvel événement
        notificationData
      );
  
      console.log('📡 Notification WebSocket client:', socketSuccess ? 'Envoyée' : 'Client non connecté');
  
      // 4. ✅ Notification Push (utilise ton expoPushService existant)
      if (client.expoPushToken && expoPushService.isValidExpoPushToken(client.expoPushToken)) {
        
        const pushResult = await expoPushService.sendPushNotification(
          client.expoPushToken,
          '🎉 Nouvelle réponse reçue !',
          `${businessName} a répondu à votre demande "${response.request.title}" - ${response.price}€`,
          notificationData // ✅ Même data pour cohérence
        );
  
        console.log('📱 Résultat push client:', pushResult.success ? 'Envoyée' : pushResult.error);
      }
  
      return {
        success: true,
        clientNotified: client.email,
        socketSent: socketSuccess,
        pushSent: !!client.expoPushToken
      };
  
    } catch (error) {
      console.error('❌ Erreur notification nouvelle réponse:', error);
      return {
        success: false,
        error: error.message
      };
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
            sellersWithPushTokens: {
              $sum: { $cond: [{ $ne: ['$expoPushToken', null] }, 1, 0] }
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
          sellersWithPushTokens: 0,
          averageResponseRate: 0
        },
        expoPush: expoPushService.getStats()
      };

    } catch (error) {
      console.error('❌ Erreur stats notifications:', error);
      return null;
    }
  }
}

module.exports = new NotificationService();