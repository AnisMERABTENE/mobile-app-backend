// backend/src/config/socket.js
const { Server } = require('socket.io');
const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');

let io;

/**
 * Initialiser Socket.IO
 */
const initializeSocket = (server) => {
  console.log('🔌 Initialisation Socket.IO...');
  
  io = new Server(server, {
    cors: {
      origin: "*", // En production, spécifier les domaines autorisés
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Middleware d'authentification pour Socket.IO
  io.use(async (socket, next) => {
    try {
      console.log('🔐 Authentification Socket.IO...');
      
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
      
      if (!token) {
        console.log('❌ Pas de token fourni pour Socket.IO');
        return next(new Error('Token d\'authentification requis'));
      }

      // Vérifier le token
      const decoded = verifyToken(token);
      
      // Récupérer l'utilisateur
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user || !user.isActive) {
        console.log('❌ Utilisateur invalide pour Socket.IO');
        return next(new Error('Utilisateur invalide'));
      }

      // Attacher l'utilisateur au socket
      socket.userId = user._id.toString();
      socket.userEmail = user.email;
      socket.userRole = user.role;
      
      console.log('✅ Utilisateur authentifié Socket.IO:', user.email);
      next();
      
    } catch (error) {
      console.error('❌ Erreur auth Socket.IO:', error.message);
      next(new Error('Token invalide'));
    }
  });

  // Gestion des connexions
  io.on('connection', (socket) => {
    console.log(`🔗 Nouvelle connexion Socket.IO: ${socket.userEmail} (${socket.id})`);
    
    // Rejoindre la room de l'utilisateur (pour notifications personnelles)
    socket.join(`user:${socket.userId}`);
    
    // Rejoindre la room des vendeurs si l'utilisateur est vendeur
    if (socket.userRole === 'seller') {
      socket.join('sellers');
      console.log(`👨‍💼 Vendeur ${socket.userEmail} ajouté à la room sellers`);
    }

    // Événement de test
    socket.on('ping', (data) => {
      console.log('🏓 Ping reçu de:', socket.userEmail, data);
      socket.emit('pong', { 
        message: 'Pong!', 
        timestamp: new Date().toISOString(),
        user: socket.userEmail 
      });
    });

    // Événement pour rejoindre des rooms spécifiques
    socket.on('join_seller_region', (data) => {
      const { city, postalCode } = data;
      if (socket.userRole === 'seller' && city && postalCode) {
        const regionRoom = `region:${city}:${postalCode}`;
        socket.join(regionRoom);
        console.log(`📍 Vendeur ${socket.userEmail} rejoint la région: ${regionRoom}`);
        socket.emit('region_joined', { region: regionRoom });
      }
    });

    // Événement pour rejoindre des catégories spécifiques
    socket.on('join_seller_categories', (data) => {
      const { categories } = data;
      if (socket.userRole === 'seller' && Array.isArray(categories)) {
        categories.forEach(category => {
          const categoryRoom = `category:${category}`;
          socket.join(categoryRoom);
          console.log(`🏷️ Vendeur ${socket.userEmail} rejoint la catégorie: ${category}`);
        });
        socket.emit('categories_joined', { categories });
      }
    });

    // Déconnexion
    socket.on('disconnect', (reason) => {
      console.log(`🔌 Déconnexion Socket.IO: ${socket.userEmail} (${reason})`);
    });

    // Gestion des erreurs
    socket.on('error', (error) => {
      console.error('❌ Erreur Socket.IO:', error);
    });
  });

  console.log('✅ Socket.IO initialisé avec succès');
  return io;
};

/**
 * Obtenir l'instance Socket.IO
 */
const getSocketIO = () => {
  if (!io) {
    throw new Error('Socket.IO non initialisé');
  }
  return io;
};

/**
 * Envoyer une notification à un utilisateur spécifique
 */
const sendNotificationToUser = (userId, eventName, data) => {
  try {
    if (!io) {
      console.error('❌ Socket.IO non initialisé pour notification utilisateur');
      return false;
    }
    
    const room = `user:${userId}`;
    io.to(room).emit(eventName, {
      ...data,
      timestamp: new Date().toISOString(),
      id: require('crypto').randomUUID()
    });
    
    console.log(`📨 Notification envoyée à ${userId}: ${eventName}`);
    return true;
  } catch (error) {
    console.error('❌ Erreur envoi notification utilisateur:', error);
    return false;
  }
};

/**
 * Envoyer une notification à tous les vendeurs
 */
const sendNotificationToSellers = (eventName, data) => {
  try {
    if (!io) {
      console.error('❌ Socket.IO non initialisé pour notification vendeurs');
      return false;
    }
    
    io.to('sellers').emit(eventName, {
      ...data,
      timestamp: new Date().toISOString(),
      id: require('crypto').randomUUID()
    });
    
    console.log(`📨 Notification envoyée à tous les vendeurs: ${eventName}`);
    return true;
  } catch (error) {
    console.error('❌ Erreur envoi notification vendeurs:', error);
    return false;
  }
};

/**
 * Envoyer une notification à des vendeurs spécifiques
 */
const sendNotificationToSpecificSellers = (sellerIds, eventName, data) => {
  try {
    if (!io) {
      console.error('❌ Socket.IO non initialisé pour notification vendeurs spécifiques');
      return false;
    }
    
    sellerIds.forEach(sellerId => {
      const room = `user:${sellerId}`;
      io.to(room).emit(eventName, {
        ...data,
        timestamp: new Date().toISOString(),
        id: require('crypto').randomUUID()
      });
    });
    
    console.log(`📨 Notification envoyée à ${sellerIds.length} vendeurs spécifiques: ${eventName}`);
    return true;
  } catch (error) {
    console.error('❌ Erreur envoi notification vendeurs spécifiques:', error);
    return false;
  }
};

/**
 * Envoyer une notification à une région géographique
 */
const sendNotificationToRegion = (city, postalCode, eventName, data) => {
  try {
    if (!io) {
      console.error('❌ Socket.IO non initialisé pour notification région');
      return false;
    }
    
    const regionRoom = `region:${city}:${postalCode}`;
    io.to(regionRoom).emit(eventName, {
      ...data,
      timestamp: new Date().toISOString(),
      id: require('crypto').randomUUID()
    });
    
    console.log(`📨 Notification envoyée à la région ${regionRoom}: ${eventName}`);
    return true;
  } catch (error) {
    console.error('❌ Erreur envoi notification région:', error);
    return false;
  }
};

/**
 * Envoyer une notification à une catégorie
 */
const sendNotificationToCategory = (category, eventName, data) => {
  try {
    if (!io) {
      console.error('❌ Socket.IO non initialisé pour notification catégorie');
      return false;
    }
    
    const categoryRoom = `category:${category}`;
    io.to(categoryRoom).emit(eventName, {
      ...data,
      timestamp: new Date().toISOString(),
      id: require('crypto').randomUUID()
    });
    
    console.log(`📨 Notification envoyée à la catégorie ${categoryRoom}: ${eventName}`);
    return true;
  } catch (error) {
    console.error('❌ Erreur envoi notification catégorie:', error);
    return false;
  }
};

/**
 * Obtenir les statistiques des connexions
 */
const getConnectionStats = () => {
  try {
    if (!io) {
      return { connected: 0, sellers: 0 };
    }
    
    const sockets = io.sockets.sockets;
    const connected = sockets.size;
    const sellers = Array.from(sockets.values()).filter(socket => socket.userRole === 'seller').length;
    
    return { connected, sellers };
  } catch (error) {
    console.error('❌ Erreur stats connexions:', error);
    return { connected: 0, sellers: 0 };
  }
};

module.exports = {
  initializeSocket,
  getSocketIO,
  sendNotificationToUser,
  sendNotificationToSellers,
  sendNotificationToSpecificSellers,
  sendNotificationToRegion,
  sendNotificationToCategory,
  getConnectionStats
};