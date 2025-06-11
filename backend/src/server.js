const app = require('./app');
const connectDB = require('./config/database');
const { initializeSocket } = require('./config/socket');
const http = require('http');

// ===================
// CONFIGURATION
// ===================

const PORT = process.env.PORT || 3000;

// ===================
// DÉMARRAGE DU SERVEUR AVEC SOCKET.IO
// ===================

const startServer = async () => {
  try {
    // 1. Connexion à la base de données
    console.log('🔗 Connexion à MongoDB...');
    await connectDB();
    
    // 2. Créer le serveur HTTP (nécessaire pour Socket.IO)
    const server = http.createServer(app);
    
    // 3. Initialiser Socket.IO
    console.log('🔌 Initialisation des WebSockets...');
    initializeSocket(server);
    
    // 4. Démarrer le serveur
    server.listen(PORT, () => {
      console.log(`🚀 Serveur démarré sur le port ${PORT}`);
      console.log(`📱 API disponible sur: http://localhost:${PORT}/api`);
      console.log(`🧪 Route de test: http://localhost:${PORT}/api/test`);
      console.log(`🔌 WebSockets disponibles sur: ws://localhost:${PORT}`);
      console.log(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}`);
      
      // Affichage des nouvelles routes WebSocket
      console.log('\n🔌 Routes WebSocket disponibles:');
      console.log('  - GET /api/socket/ping');
      console.log('  - GET /api/socket/stats (authentifié)');
      console.log('  - POST /api/socket/test-notification (authentifié)');
      console.log('  - GET /api/socket/notification-stats (authentifié)');
      console.log('  - POST /api/socket/simulate-request (authentifié, dev)');
      console.log('\n📢 Notifications temps réel activées pour les vendeurs !');
    });

    // 5. Gestion de l'arrêt propre du serveur
    const gracefulShutdown = (signal) => {
      console.log(`\n📴 Signal ${signal} reçu, arrêt du serveur...`);
      
      server.close((err) => {
        if (err) {
          console.error('❌ Erreur lors de l\'arrêt du serveur:', err);
          process.exit(1);
        }
        
        console.log('✅ Serveur et WebSockets arrêtés proprement');
        process.exit(0);
      });
    };

    // Écouter les signaux d'arrêt
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
};

// Gestion des erreurs non gérées
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesse rejetée non gérée:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Exception non gérée:', error);
  process.exit(1);
});

// Démarrer le serveur
startServer();