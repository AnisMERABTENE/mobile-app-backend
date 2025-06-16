// mobile/src/services/pushNotificationService.js
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';
import Constants from 'expo-constants';

/**
 * Service de notifications push avec Expo
 * 🎯 S'ajoute au système Socket.IO existant SANS le remplacer
 */
class PushNotificationService {
  
  constructor() {
    this.expoPushToken = null;
    this.notificationListener = null;
    this.responseListener = null;
    this.isInitialized = false;
    
    console.log('🔔 PushNotificationService initialisé');
  }

  /**
   * Initialiser les notifications push
   */
  async initialize() {
    try {
      console.log('🚀 Initialisation notifications push...');

      // 1. Vérifier si on est sur un device physique
      if (!Device.isDevice) {
        console.log('⚠️ Simulateur détecté - notifications push limitées');
        Alert.alert(
          'Info', 
          'Les notifications push ne fonctionnent que sur un appareil physique'
        );
        return { success: false, error: 'Simulateur détecté' };
      }

      // 2. Configurer le comportement des notifications
      await this.configureNotificationBehavior();

      // 3. Demander les permissions
      const permissionResult = await this.requestPermissions();
      if (!permissionResult.success) {
        return permissionResult;
      }

      // 4. Obtenir le token Expo Push
      const tokenResult = await this.getExpoPushToken();
      if (!tokenResult.success) {
        return tokenResult;
      }

      // 5. Configurer les listeners
      this.setupNotificationListeners();

      this.isInitialized = true;
      console.log('✅ Notifications push initialisées avec succès');
      console.log('🎯 Token:', this.expoPushToken?.substring(0, 20) + '...');

      return {
        success: true,
        token: this.expoPushToken,
        message: 'Notifications push configurées'
      };

    } catch (error) {
      console.error('❌ Erreur initialisation push notifications:', error);
      return {
        success: false,
        error: error.message || 'Erreur initialisation notifications'
      };
    }
  }

  /**
   * Configurer le comportement des notifications
   */
  async configureNotificationBehavior() {
    console.log('⚙️ Configuration comportement notifications...');

    // Définir comment les notifications doivent être affichées
    await Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        console.log('📥 Notification reçue:', notification.request.content.title);
        
        return {
          // Toujours afficher la notification
          shouldShowAlert: true,
          // Jouer un son
          shouldPlaySound: true,
          // Afficher un badge
          shouldSetBadge: true,
          // Vibrer
          shouldVibrate: true,
        };
      },
    });

    console.log('✅ Comportement configuré');
  }

  /**
   * Demander les permissions de notifications
   */
  async requestPermissions() {
    try {
      console.log('🔐 Demande de permissions...');

      // Vérifier les permissions actuelles
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      console.log('📋 Permissions actuelles:', existingStatus);

      let finalStatus = existingStatus;

      // Si pas encore accordées, demander
      if (existingStatus !== 'granted') {
        console.log('❓ Demande de nouvelles permissions...');
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      // Vérifier le résultat
      if (finalStatus !== 'granted') {
        console.log('❌ Permissions refusées');
        Alert.alert(
          'Permissions requises',
          'Les notifications sont nécessaires pour vous alerter des nouvelles demandes'
        );
        return {
          success: false,
          error: 'Permissions notifications refusées'
        };
      }

      console.log('✅ Permissions accordées');
      return { success: true };

    } catch (error) {
      console.error('❌ Erreur permissions:', error);
      return {
        success: false,
        error: 'Erreur lors de la demande de permissions'
      };
    }
  }

  /**
   * Obtenir le token Expo Push
   */
  async getExpoPushToken() {
    try {
      console.log('🎯 Génération token Expo Push...');

      // Obtenir les infos du projet Expo
      const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.manifest?.extra?.eas?.projectId;
      console.log('📋 Project ID:', projectId);

      if (!projectId) {
        throw new Error('Project ID Expo manquant dans app.json');
      }

      // Générer le token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId
      });

      this.expoPushToken = tokenData.data;
      console.log('✅ Token généré:', this.expoPushToken.substring(0, 20) + '...');

      return {
        success: true,
        token: this.expoPushToken
      };

    } catch (error) {
      console.error('❌ Erreur génération token:', error);
      return {
        success: false,
        error: 'Impossible de générer le token push'
      };
    }
  }

  /**
   * Configurer les listeners de notifications
   */
  setupNotificationListeners() {
    console.log('👂 Configuration des listeners...');

    // Listener pour les notifications reçues quand l'app est active
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('📱 Notification reçue en foreground:', notification.request.content.title);
      // Les notifications en foreground sont gérées automatiquement
    });

    // Listener pour les interactions avec les notifications
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Notification cliquée:', response.notification.request.content.title);
      
      // Récupérer les données de la notification
      const notificationData = response.notification.request.content.data;
      
      // Traiter la navigation
      this.handleNotificationNavigation(notificationData);
    });

    console.log('✅ Listeners configurés');
  }

  /**
   * Gérer la navigation quand on clique sur une notification
   */
  handleNotificationNavigation(data) {
    try {
      console.log('🧭 Navigation depuis notification:', data);

      if (data?.type === 'new_request' && data?.request?.id) {
        // TODO: Navigation vers le détail de la demande
        console.log('🎯 Navigation vers demande:', data.request.id);
        
        // Pour l'instant, on log juste
        // Plus tard, on ajoutera la navigation avec React Navigation
        
      } else {
        console.log('📄 Données de navigation non reconnues');
      }

    } catch (error) {
      console.error('❌ Erreur navigation notification:', error);
    }
  }

  /**
   * Envoyer le token au backend
   */
  async sendTokenToBackend(token = null) {
    try {
      const tokenToSend = token || this.expoPushToken;
      
      if (!tokenToSend) {
        throw new Error('Aucun token disponible');
      }

      console.log('📤 Envoi token au backend...');

      // TODO: Appel API pour sauvegarder le token
      // await apiRequest.post('/notifications/token', { expoPushToken: tokenToSend });
      
      console.log('✅ Token envoyé au backend (TODO: implémenter API)');
      return { success: true };

    } catch (error) {
      console.error('❌ Erreur envoi token:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Nettoyer les listeners
   */
  cleanup() {
    console.log('🧹 Nettoyage listeners notifications...');

    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }

    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }

    console.log('✅ Listeners nettoyés');
  }

  /**
   * Obtenir les informations du service
   */
  getInfo() {
    return {
      isInitialized: this.isInitialized,
      hasToken: !!this.expoPushToken,
      token: this.expoPushToken,
      platform: Platform.OS,
      isDevice: Device.isDevice
    };
  }

  /**
   * Test d'envoi de notification locale
   */
  async sendTestNotification() {
    try {
      console.log('🧪 Test notification locale...');

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Test notification ! 🔔",
          body: "Si tu vois ça, les notifications fonctionnent !",
          data: { 
            type: 'test',
            timestamp: Date.now()
          },
        },
        trigger: { seconds: 2 },
      });

      console.log('✅ Notification test programmée');
      return { success: true };

    } catch (error) {
      console.error('❌ Erreur test notification:', error);
      return { success: false, error: error.message };
    }
  }
}

// Instance unique
const pushNotificationService = new PushNotificationService();

export default pushNotificationService;