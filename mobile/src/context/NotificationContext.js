import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { Platform, Alert } from 'react-native';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';
import StorageService from '../utils/storage';

// État initial des notifications
const initialState = {
  socket: null,
  isConnected: false,
  notifications: [],
  unreadCount: 0,
  isConnecting: false,
  connectionError: null,
};

// Actions pour les notifications
const NOTIFICATION_ACTIONS = {
  SET_SOCKET: 'SET_SOCKET',
  SET_CONNECTED: 'SET_CONNECTED',
  SET_CONNECTING: 'SET_CONNECTING',
  SET_CONNECTION_ERROR: 'SET_CONNECTION_ERROR',
  ADD_NOTIFICATION: 'ADD_NOTIFICATION',
  MARK_AS_READ: 'MARK_AS_READ',
  CLEAR_NOTIFICATIONS: 'CLEAR_NOTIFICATIONS',
  SET_NOTIFICATIONS: 'SET_NOTIFICATIONS',
  INCREMENT_UNREAD: 'INCREMENT_UNREAD',
  DECREMENT_UNREAD: 'DECREMENT_UNREAD',
  SET_UNREAD_COUNT: 'SET_UNREAD_COUNT',
};

// Reducer pour gérer l'état des notifications
const notificationReducer = (state, action) => {
  switch (action.type) {
    case NOTIFICATION_ACTIONS.SET_SOCKET:
      return {
        ...state,
        socket: action.payload,
      };
      
    case NOTIFICATION_ACTIONS.SET_CONNECTED:
      return {
        ...state,
        isConnected: action.payload,
        isConnecting: false,
        connectionError: action.payload ? null : state.connectionError,
      };
      
    case NOTIFICATION_ACTIONS.SET_CONNECTING:
      return {
        ...state,
        isConnecting: action.payload,
        connectionError: null,
      };
      
    case NOTIFICATION_ACTIONS.SET_CONNECTION_ERROR:
      return {
        ...state,
        connectionError: action.payload,
        isConnected: false,
        isConnecting: false,
      };
      
    case NOTIFICATION_ACTIONS.ADD_NOTIFICATION:
      return {
        ...state,
        notifications: [action.payload, ...state.notifications],
        unreadCount: state.unreadCount + 1,
      };
      
    case NOTIFICATION_ACTIONS.MARK_AS_READ:
      return {
        ...state,
        notifications: state.notifications.map(notif =>
          notif.id === action.payload ? { ...notif, read: true } : notif
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      };
      
    case NOTIFICATION_ACTIONS.CLEAR_NOTIFICATIONS:
      return {
        ...state,
        notifications: [],
        unreadCount: 0,
      };
      
    case NOTIFICATION_ACTIONS.SET_NOTIFICATIONS:
      return {
        ...state,
        notifications: action.payload,
        unreadCount: action.payload.filter(n => !n.read).length,
      };
      
    case NOTIFICATION_ACTIONS.SET_UNREAD_COUNT:
      return {
        ...state,
        unreadCount: action.payload,
      };
      
    default:
      return state;
  }
};

// Créer le Context
const NotificationContext = createContext({});

// Provider Component
export const NotificationProvider = ({ children }) => {
  const [state, dispatch] = useReducer(notificationReducer, initialState);
  const { user, token, isAuthenticated } = useAuth();

  // Initialiser la connexion Socket.IO
  useEffect(() => {
    if (isAuthenticated && token && user) {
      connectSocket();
    } else {
      disconnectSocket();
    }

    return () => {
      disconnectSocket();
    };
  }, [isAuthenticated, token, user]);

  // Charger les notifications sauvegardées au démarrage
  useEffect(() => {
    loadSavedNotifications();
  }, []);

  /**
   * Connexion au serveur Socket.IO
   */
  const connectSocket = async () => {
    try {
      if (state.socket?.connected) {
        console.log('🔌 Socket déjà connecté');
        return;
      }

      console.log('🔌 Connexion Socket.IO...');
      dispatch({ type: NOTIFICATION_ACTIONS.SET_CONNECTING, payload: true });

      const socketUrl = 'https://mobile-app-backend-production-5d60.up.railway.app';
      
      const socket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        auth: {
          token: token,
        },
        extraHeaders: {
          'Authorization': `Bearer ${token}`,
          'X-Platform': Platform.OS,
        },
        query: {
          platform: Platform.OS,
          userId: user._id,
        },
      });

      // Événements de connexion
      socket.on('connect', () => {
        console.log('✅ Socket.IO connecté:', socket.id);
        dispatch({ type: NOTIFICATION_ACTIONS.SET_CONNECTED, payload: true });
        
        // Test de ping
        socket.emit('ping', { message: 'Hello from mobile app', platform: Platform.OS });
      });

      socket.on('disconnect', (reason) => {
        console.log('🔌 Socket.IO déconnecté:', reason);
        dispatch({ type: NOTIFICATION_ACTIONS.SET_CONNECTED, payload: false });
      });

      socket.on('connect_error', (error) => {
        console.error('❌ Erreur connexion Socket.IO:', error.message);
        dispatch({ 
          type: NOTIFICATION_ACTIONS.SET_CONNECTION_ERROR, 
          payload: 'Erreur de connexion aux notifications' 
        });
      });

      // Réponse au ping
      socket.on('pong', (data) => {
        console.log('🏓 Pong reçu:', data);
      });

      // ÉVÉNEMENT PRINCIPAL : Nouvelle demande pour vendeur
      socket.on('new_request_notification', (data) => {
        console.log('📢 Nouvelle notification demande reçue:', data);
        handleNewRequestNotification(data);
      });

      // Confirmation de création de demande
      socket.on('request_created_confirmation', (data) => {
        console.log('✅ Confirmation création demande:', data);
        // Afficher une notification discrète
        showLocalNotification('Demande publiée', data.message);
      });

      // Autres types de notifications
      socket.on('test_notification', (data) => {
        console.log('🧪 Notification de test:', data);
        handleTestNotification(data);
      });

      // Enregistrer le socket
      dispatch({ type: NOTIFICATION_ACTIONS.SET_SOCKET, payload: socket });

    } catch (error) {
      console.error('❌ Erreur connexion Socket.IO:', error);
      dispatch({ 
        type: NOTIFICATION_ACTIONS.SET_CONNECTION_ERROR, 
        payload: 'Impossible de se connecter aux notifications' 
      });
    }
  };

  /**
   * Déconnexion du socket
   */
  const disconnectSocket = () => {
    if (state.socket) {
      console.log('🔌 Déconnexion Socket.IO...');
      state.socket.disconnect();
      dispatch({ type: NOTIFICATION_ACTIONS.SET_SOCKET, payload: null });
      dispatch({ type: NOTIFICATION_ACTIONS.SET_CONNECTED, payload: false });
    }
  };

  /**
   * Gérer une nouvelle notification de demande
   */
  const handleNewRequestNotification = (data) => {
    const notification = {
      id: data.id || Date.now().toString(),
      type: 'new_request',
      title: 'Nouvelle demande !',
      message: `${data.request?.title || 'Demande sans titre'}`,
      data: data,
      timestamp: new Date(),
      read: false,
    };

    // Ajouter à l'état local
    dispatch({ type: NOTIFICATION_ACTIONS.ADD_NOTIFICATION, payload: notification });

    // Sauvegarder
    saveNotifications([notification, ...state.notifications]);

    // Afficher une notification locale
    showLocalNotification(notification.title, notification.message);

    console.log('✅ Notification ajoutée:', notification.title);
  };

  /**
   * Gérer une notification de test
   */
  const handleTestNotification = (data) => {
    const notification = {
      id: data.testId || Date.now().toString(),
      type: 'test',
      title: 'Notification de test',
      message: data.message || 'Test des notifications',
      data: data,
      timestamp: new Date(),
      read: false,
    };

    dispatch({ type: NOTIFICATION_ACTIONS.ADD_NOTIFICATION, payload: notification });
    saveNotifications([notification, ...state.notifications]);
    showLocalNotification(notification.title, notification.message);
  };

  /**
   * Afficher une notification locale (Alert pour l'instant)
   */
  const showLocalNotification = (title, message) => {
    // Pour l'instant, on utilise Alert, plus tard on pourra utiliser expo-notifications
    setTimeout(() => {
      Alert.alert(title, message, [
        { text: 'OK', style: 'default' }
      ]);
    }, 500);
  };

  /**
   * Marquer une notification comme lue
   */
  const markAsRead = async (notificationId) => {
    dispatch({ type: NOTIFICATION_ACTIONS.MARK_AS_READ, payload: notificationId });
    
    // Mettre à jour le stockage
    const updatedNotifications = state.notifications.map(notif =>
      notif.id === notificationId ? { ...notif, read: true } : notif
    );
    await saveNotifications(updatedNotifications);
    
    console.log('✅ Notification marquée comme lue:', notificationId);
  };

  /**
   * Effacer toutes les notifications
   */
  const clearAllNotifications = async () => {
    dispatch({ type: NOTIFICATION_ACTIONS.CLEAR_NOTIFICATIONS });
    await StorageService.removeItem('notifications');
    console.log('🧹 Toutes les notifications effacées');
  };

  /**
   * Sauvegarder les notifications
   */
  const saveNotifications = async (notifications) => {
    try {
      await StorageService.setItem('notifications', JSON.stringify(notifications));
    } catch (error) {
      console.error('❌ Erreur sauvegarde notifications:', error);
    }
  };

  /**
   * Charger les notifications sauvegardées
   */
  const loadSavedNotifications = async () => {
    try {
      const saved = await StorageService.getItem('notifications');
      if (saved) {
        const notifications = JSON.parse(saved);
        dispatch({ type: NOTIFICATION_ACTIONS.SET_NOTIFICATIONS, payload: notifications });
        console.log('📱 Notifications chargées:', notifications.length);
      }
    } catch (error) {
      console.error('❌ Erreur chargement notifications:', error);
    }
  };

  /**
   * Obtenir les statistiques de connexion (debug)
   */
  const getConnectionStats = () => {
    return {
      isConnected: state.isConnected,
      isConnecting: state.isConnecting,
      socketId: state.socket?.id,
      unreadCount: state.unreadCount,
      totalNotifications: state.notifications.length,
      connectionError: state.connectionError,
    };
  };

  // Valeurs du contexte
  const value = {
    // État
    socket: state.socket,
    isConnected: state.isConnected,
    isConnecting: state.isConnecting,
    connectionError: state.connectionError,
    notifications: state.notifications,
    unreadCount: state.unreadCount,
    
    // Actions
    connectSocket,
    disconnectSocket,
    markAsRead,
    clearAllNotifications,
    getConnectionStats,
    
    // Dispatch pour des actions avancées
    dispatch,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

// Hook pour utiliser le contexte
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications doit être utilisé dans un NotificationProvider');
  }
  return context;
};

export default NotificationContext;