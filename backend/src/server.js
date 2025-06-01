const app = require('./app');
const connectDB = require('./config/database');

// ===================
// CONFIGURATION
// ===================

const PORT = process.env.PORT || 3000;

// ===================
// DÉMARRAGE DU SERVEUR
// ===================

const startServer = async () => {
  try {
    // 1. Connexion à la base de données
    console.log('🔗 Connexion à MongoDB...');
    await connectDB();
    
    // 2. Démarrage du serveur
    const server = app.listen(PORT, () => {
      console.log(`🚀 Serveur démarré sur le port ${PORT}`);
      console.log(`📱 API disponible sur: http://localhost:${PORT}/api`);
      console.log(`🧪 Route de test: http://localhost:${PORT}/api/test`);
      console.log(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}`);
    });

    // 3. Gestion de l'arrêt propre du serveur
    const gracefulShutdown = (signal) => {
      console.log(`\n📴 Signal ${signal} reçu, arrêt du serveur...`);
      
      server.close((err) => {
        if (err) {
          console.error('❌ Erreur lors de l\'arrêt du serveur:', err);
          process.exit(1);
        }
        
        console.log('✅ Serveur arrêté proprement');
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