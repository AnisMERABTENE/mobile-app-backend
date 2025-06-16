// backend/src/services/expoPushService.js
const { Expo } = require('expo-server-sdk');

/**
 * Service de notifications push Expo
 * 🎯 S'ajoute au système Socket.IO existant SANS le remplacer
 */
class ExpoPushService {
  
  constructor() {
    // Créer une nouvelle instance Expo SDK
    this.expo = new Expo();
    this.isEnabled = true;
    
    console.log('🔔 ExpoPushService initialisé');
    console.log('📊 Expo SDK version:', this.expo.constructor.name);
  }

  /**
   * Valider un token Expo Push
   */
  isValidExpoPushToken(token) {
    if (!token) {
      return false;
    }
    
    return Expo.isExpoPushToken(token);
  }

  /**
   * Envoyer une notification push à un utilisateur
   */
  async sendPushNotification(expoPushToken, title, body, data = {}) {
    try {
      // Vérifier que le service est activé
      if (!this.isEnabled) {
        console.log('⚠️ Service push désactivé');
        return {
          success: false,
          error: 'Service de notifications push désactivé'
        };
      }

      // Valider le token
      if (!this.isValidExpoPushToken(expoPushToken)) {
        console.log('❌ Token Expo Push invalide:', expoPushToken?.substring(0, 20) + '...');
        return {
          success: false,
          error: 'Token Expo Push invalide'
        };
      }

      console.log('📤 Envoi notification push...');
      console.log('🎯 Token:', expoPushToken.substring(0, 20) + '...');
      console.log('📱 Titre:', title);
      console.log('💬 Message:', body);

      // Créer le message de notification
      const message = {
        to: expoPushToken,
        sound: 'default',
        title: title,
        body: body,
        data: {
          ...data,
          timestamp: new Date().toISOString(),
        },
        priority: 'high',
        badge: 1,
      };

      // Envoyer la notification
      const chunks = this.expo.chunkPushNotifications([message]);
      const tickets = [];

      for (const chunk of chunks) {
        try {
          const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
          console.log('📨 Chunk envoyé:', ticketChunk.length, 'notifications');
        } catch (chunkError) {
          console.error('❌ Erreur envoi chunk:', chunkError);
        }
      }

      // Analyser les résultats
      const results = this.analyzeTickets(tickets);
      
      if (results.successCount > 0) {
        console.log('✅ Notification push envoyée avec succès');
        return {
          success: true,
          tickets: tickets,
          results: results,
          message: `${results.successCount} notification(s) envoyée(s)`
        };
      } else {
        console.log('❌ Échec envoi notification push:', results.errors);
        return {
          success: false,
          error: 'Échec envoi notification',
          tickets: tickets,
          results: results
        };
      }

    } catch (error) {
      console.error('❌ Erreur ExpoPushService.sendPushNotification:', error);
      return {
        success: false,
        error: error.message || 'Erreur inconnue lors de l\'envoi'
      };
    }
  }

  /**
   * Envoyer des notifications à plusieurs utilisateurs
   */
  async sendBulkPushNotifications(notifications) {
    try {
      if (!Array.isArray(notifications) || notifications.length === 0) {
        return {
          success: false,
          error: 'Aucune notification à envoyer'
        };
      }

      console.log(`📤 Envoi en masse: ${notifications.length} notifications`);

      // Créer les messages
      const messages = [];
      
      for (const notif of notifications) {
        if (this.isValidExpoPushToken(notif.expoPushToken)) {
          messages.push({
            to: notif.expoPushToken,
            sound: 'default',
            title: notif.title,
            body: notif.body,
            data: {
              ...notif.data,
              timestamp: new Date().toISOString(),
            },
            priority: 'high',
            badge: 1,
          });
        } else {
          console.log('⚠️ Token invalide ignoré:', notif.expoPushToken?.substring(0, 20) + '...');
        }
      }

      if (messages.length === 0) {
        return {
          success: false,
          error: 'Aucun token valide trouvé'
        };
      }

      // Envoyer par chunks
      const chunks = this.expo.chunkPushNotifications(messages);
      const allTickets = [];

      for (const chunk of chunks) {
        try {
          const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
          allTickets.push(...ticketChunk);
          console.log('📨 Chunk masse envoyé:', ticketChunk.length, 'notifications');
        } catch (chunkError) {
          console.error('❌ Erreur chunk masse:', chunkError);
        }
      }

      // Analyser les résultats
      const results = this.analyzeTickets(allTickets);
      
      console.log(`✅ Envoi masse terminé: ${results.successCount}/${messages.length} réussies`);
      
      return {
        success: results.successCount > 0,
        totalSent: messages.length,
        tickets: allTickets,
        results: results,
        message: `${results.successCount}/${messages.length} notifications envoyées`
      };

    } catch (error) {
      console.error('❌ Erreur envoi masse:', error);
      return {
        success: false,
        error: error.message || 'Erreur envoi en masse'
      };
    }
  }

  /**
   * Analyser les tickets de réponse
   */
  analyzeTickets(tickets) {
    const results = {
      successCount: 0,
      errorCount: 0,
      errors: []
    };

    for (const ticket of tickets) {
      if (ticket.status === 'ok') {
        results.successCount++;
      } else if (ticket.status === 'error') {
        results.errorCount++;
        results.errors.push({
          code: ticket.details?.error || 'unknown',
          message: ticket.message || 'Erreur inconnue'
        });
        
        console.log('⚠️ Erreur ticket:', ticket.message);
      }
    }

    return results;
  }

  /**
   * Vérifier les reçus de notifications (optionnel)
   */
  async checkReceipts(receiptIds) {
    try {
      if (!Array.isArray(receiptIds) || receiptIds.length === 0) {
        return {
          success: false,
          error: 'Aucun ID de reçu fourni'
        };
      }

      console.log(`🧾 Vérification ${receiptIds.length} reçus...`);

      const receiptIdChunks = this.expo.chunkPushNotificationReceiptIds(receiptIds);
      const allReceipts = {};

      for (const chunk of receiptIdChunks) {
        try {
          const receipts = await this.expo.getPushNotificationReceiptsAsync(chunk);
          Object.assign(allReceipts, receipts);
        } catch (receiptError) {
          console.error('❌ Erreur vérification reçus:', receiptError);
        }
      }

      console.log('✅ Reçus vérifiés:', Object.keys(allReceipts).length);
      
      return {
        success: true,
        receipts: allReceipts
      };

    } catch (error) {
      console.error('❌ Erreur checkReceipts:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Créer une notification formatée pour une nouvelle demande
   */
  createNewRequestNotification(requestData) {
    const title = 'Nouvelle demande !';
    const body = `${requestData.title} - ${requestData.location?.city || 'Localisation inconnue'}`;
    
    const data = {
      type: 'new_request',
      request: {
        id: requestData._id || requestData.id,
        title: requestData.title,
        category: requestData.category,
        subCategory: requestData.subCategory,
        location: requestData.location,
      },
      // Données pour la navigation
      screen: 'RequestDetail',
      params: {
        requestId: requestData._id || requestData.id
      }
    };

    return {
      title,
      body,
      data
    };
  }

  /**
   * Obtenir les statistiques du service
   */
  getStats() {
    return {
      isEnabled: this.isEnabled,
      sdkVersion: 'expo-server-sdk v3.10.0',
      service: 'Expo Push Notifications',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Désactiver temporairement le service
   */
  disable() {
    this.isEnabled = false;
    console.log('🔇 Service Expo Push désactivé');
  }

  /**
   * Réactiver le service
   */
  enable() {
    this.isEnabled = true;
    console.log('🔔 Service Expo Push réactivé');
  }
}

// Instance unique
const expoPushService = new ExpoPushService();

module.exports = expoPushService;