const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

console.log('🔄 Démarrage de l\'application...');
console.log('📍 Point de contrôle 1: Initialisation Express');

// ===================
// MIDDLEWARES DE BASE
// ===================

console.log('📍 Point de contrôle 2: Configuration CORS');
// CORS simple
app.use(cors());
console.log('✅ CORS configuré');

console.log('📍 Point de contrôle 3: Configuration parsers');
// Parser JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
console.log('✅ Parsers JSON/URL configurés');

console.log('📍 Point de contrôle 4: Vérification variables Google OAuth');
// Initialiser Passport après avoir vérifié les variables d'env
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  console.log('🔄 Initialisation de Passport...');
  try {
    const passport = require('./config/passport');
    app.use(passport.initialize());
    console.log('✅ Passport initialisé');
  } catch (passportError) {
    console.error('❌ ERREUR CRITIQUE: Échec initialisation Passport');
    console.error('❌ Erreur Passport:', passportError.message);
    console.error('❌ Stack Passport:', passportError.stack);
  }
} else {
  console.log('⚠️ Google OAuth désactivé - Variables manquantes');
}

console.log('📍 Point de contrôle 5: Configuration logger');
// Logger simple
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

console.log('✅ Middlewares chargés');
console.log('📍 Point de contrôle 6: Début chargement routes');

// ===================
// ROUTES DE L'API
// ===================

console.log('📍 Point de contrôle 7: Configuration route de test principale');
// Route de test principale
app.get('/api/test', (req, res) => {
  console.log('🧪 Route /api/test appelée');
  res.json({ 
    message: '🚀 API Backend Mobile App fonctionne !',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    features: {
      auth: true,
      requests: true,
      sellers: true,
      photos: true,
      websockets: true,
      notifications: true
    }
  });
});
console.log('✅ Route de test /api/test configurée');

console.log('📍 Point de contrôle 8: Configuration route racine');
// Route racine
app.get('/', (req, res) => {
  console.log('🏠 Route racine / appelée');
  res.json({ 
    message: '📱 API Mobile App Backend',
    status: 'running',
    websockets: 'enabled',
    notifications: 'real-time'
  });
});
console.log('✅ Route racine / configurée');

console.log('📍 Point de contrôle 9: Configuration pages temporaires Google OAuth');
// Pages temporaires pour Google OAuth (développement)
app.get('/auth/success', (req, res) => {
  console.log('✅ Page /auth/success appelée');
  const { token } = req.query;
  res.send(`
    <h1>🎉 Connexion Google réussie !</h1>
    <p><strong>Token JWT :</strong></p>
    <textarea rows="5" cols="80">${token}</textarea>
    <p>Tu peux maintenant utiliser ce token dans ton app mobile !</p>
  `);
});

app.get('/auth/error', (req, res) => {
  console.log('❌ Page /auth/error appelée');
  const { error } = req.query;
  res.send(`
    <h1>❌ Erreur de connexion</h1>
    <p>Erreur : ${error}</p>
    <a href="/api/auth/google">Réessayer</a>
  `);
});
console.log('✅ Pages temporaires OAuth configurées');

// ===================
// CHARGEMENT DES ROUTES - AVEC LOGS DÉTAILLÉS
// ===================

console.log('📍 Point de contrôle 10: DÉBUT chargement routes d\'authentification');
console.log('🔄 Tentative de chargement ./routes/auth...');
try {
  console.log('📂 Vérification existence fichier ./routes/auth');
  const authRoutes = require('./routes/auth');
  console.log('✅ Fichier ./routes/auth trouvé et chargé');
  
  console.log('🔄 Configuration route /api/auth...');
  app.use('/api/auth', authRoutes);
  console.log('✅ Routes auth configurées sur /api/auth');
  console.log('✅ Routes auth chargées avec succès');
} catch (error) {
  console.error('❌ ERREUR CRITIQUE: Échec chargement routes auth');
  console.error('❌ Erreur auth:', error.message);
  console.error('❌ Stack auth:', error.stack);
  console.error('❌ Code erreur auth:', error.code);
}

console.log('📍 Point de contrôle 11: DÉBUT chargement routes requests');
console.log('🔄 Tentative de chargement ./routes/requests...');
try {
  console.log('📂 Vérification existence fichier ./routes/requests');
  const requestRoutes = require('./routes/requests');
  console.log('✅ Fichier ./routes/requests trouvé et chargé');
  
  console.log('🔄 Configuration route /api/requests...');
  app.use('/api/requests', requestRoutes);
  console.log('✅ Routes requests configurées sur /api/requests');
  console.log('✅ Routes requests chargées avec succès');
} catch (error) {
  console.error('❌ ERREUR CRITIQUE: Échec chargement routes requests');
  console.error('❌ Erreur requests:', error.message);
  console.error('❌ Stack requests:', error.stack);
  console.error('❌ Code erreur requests:', error.code);
}

console.log('📍 Point de contrôle 12: DÉBUT chargement routes photos');
console.log('🔄 Tentative de chargement ./routes/photos...');
try {
  console.log('📂 Vérification existence fichier ./routes/photos');
  const photoRoutes = require('./routes/photos');
  console.log('✅ Fichier ./routes/photos trouvé et chargé');
  
  console.log('🔄 Configuration route /api/photos...');
  app.use('/api/photos', photoRoutes);
  console.log('✅ Routes photos configurées sur /api/photos');
  console.log('✅ Routes photos chargées avec succès');
} catch (error) {
  console.error('❌ ERREUR CRITIQUE: Échec chargement routes photos');
  console.error('❌ Erreur photos:', error.message);
  console.error('❌ Stack photos:', error.stack);
  console.error('❌ Code erreur photos:', error.code);
}

console.log('📍 Point de contrôle 13: DÉBUT chargement routes sellers');
console.log('🔄 Tentative de chargement ./routes/sellers...');
try {
  console.log('📂 Vérification existence fichier ./routes/sellers');
  const sellerRoutes = require('./routes/sellers');
  console.log('✅ Fichier ./routes/sellers trouvé et chargé');
  
  console.log('🔄 Configuration route /api/sellers...');
  app.use('/api/sellers', sellerRoutes);
  console.log('✅ Routes sellers configurées sur /api/sellers');
  console.log('✅ Routes sellers chargées avec succès');
} catch (error) {
  console.error('❌ ERREUR CRITIQUE: Échec chargement routes sellers');
  console.error('❌ Erreur sellers:', error.message);
  console.error('❌ Stack sellers:', error.stack);
  console.error('❌ Code erreur sellers:', error.code);
}

console.log('📍 Point de contrôle 14: DÉBUT chargement routes géolocalisation');
console.log('🔄 Tentative de chargement ./routes/geolocation-test...');
try {
  console.log('📂 Vérification existence fichier ./routes/geolocation-test');
  const geolocationRoutes = require('./routes/geolocation-test');
  console.log('✅ Fichier ./routes/geolocation-test trouvé et chargé');
  
  console.log('🔄 Configuration route /api/geolocation...');
  app.use('/api/geolocation', geolocationRoutes);
  console.log('✅ Routes géolocalisation configurées sur /api/geolocation');
  console.log('✅ Routes géolocalisation chargées avec succès');
} catch (error) {
  console.error('❌ ERREUR CRITIQUE: Échec chargement routes géolocalisation');
  console.error('❌ Erreur géolocalisation:', error.message);
  console.error('❌ Stack géolocalisation:', error.stack);
  console.error('❌ Code erreur géolocalisation:', error.code);
}

console.log('📍 Point de contrôle 15: DÉBUT chargement routes WebSocket');
console.log('🔄 Tentative de chargement ./routes/socket...');
try {
  console.log('📂 Vérification existence fichier ./routes/socket');
  const socketRoutes = require('./routes/socket');
  console.log('✅ Fichier ./routes/socket trouvé et chargé');
  
  console.log('🔄 Configuration route /api/socket...');
  app.use('/api/socket', socketRoutes);
  console.log('✅ Routes WebSocket configurées sur /api/socket');
  console.log('✅ Routes WebSocket chargées avec succès');
} catch (error) {
  console.error('❌ ERREUR CRITIQUE: Échec chargement routes WebSocket');
  console.error('❌ Erreur WebSocket:', error.message);
  console.error('❌ Stack WebSocket:', error.stack);
  console.error('❌ Code erreur WebSocket:', error.code);
}

console.log('📍 Point de contrôle 16: Configuration route test email');
// Route de test email (développement seulement)
if (process.env.NODE_ENV === 'development') {
  app.get('/api/test-email', async (req, res) => {
    try {
      console.log('📧 Route test email appelée');
      const { testEmailConfig } = require('./utils/emailService');
      console.log('📧 Test de configuration email...');
      
      const result = await testEmailConfig();
      
      if (result.success) {
        res.json({
          message: '✅ Email de test envoyé avec succès !',
          messageId: result.messageId,
          note: 'Vérifiez votre boîte email (et le dossier spam)'
        });
      } else {
        res.status(500).json({
          error: '❌ Erreur lors de l\'envoi de l\'email de test',
          details: result.error
        });
      }
    } catch (error) {
      console.error('❌ Erreur test email:', error);
      res.status(500).json({
        error: 'Erreur lors du test email',
        details: error.message
      });
    }
  });
  console.log('✅ Route test email configurée (développement)');
} else {
  console.log('ℹ️ Route test email non configurée (production)');
}

console.log('📍 Point de contrôle 17: Configuration gestion erreurs');

// ===================
// GESTION D'ERREURS
// ===================

// Routes non trouvées
app.use((req, res) => {
  console.log('❌ Route non trouvée:', req.originalUrl);
  res.status(404).json({
    error: 'Route non trouvée',
    path: req.originalUrl,
    availableRoutes: [
      '/api/test',
      '/api/auth/*',
      '/api/requests/*',
      '/api/sellers/*',
      '/api/photos/*',
      '/api/geolocation/*',
      '/api/socket/*'
    ]
  });
});

// Erreurs générales
app.use((err, req, res, next) => {
  console.error('❌ ERREUR GLOBALE MIDDLEWARE:', err);
  console.error('❌ Stack erreur globale:', err.stack);
  res.status(500).json({
    error: 'Erreur serveur'
  });
});

console.log('✅ Gestion d\'erreurs configurée');
console.log('📍 Point de contrôle 18: FIN configuration application');
console.log('✅ Application configurée avec WebSockets et notifications temps réel');

// ===================
// RÉCAPITULATIF FINAL
// ===================

console.log('📋 RÉCAPITULATIF DE CONFIGURATION:');
console.log('  ✅ Express configuré');
console.log('  ✅ CORS configuré');
console.log('  ✅ Parsers configurés');
console.log('  ✅ Logger configuré');
console.log('  ✅ Routes de base configurées');
console.log('  ✅ Gestion d\'erreurs configurée');
console.log('📋 ROUTES DISPONIBLES:');
console.log('  📍 GET / (racine)');
console.log('  📍 GET /api/test (test principal)');
console.log('  📍 /api/auth/* (authentification)');
console.log('  📍 /api/requests/* (demandes)');
console.log('  📍 /api/photos/* (photos)');
console.log('  📍 /api/sellers/* (vendeurs)');
console.log('  📍 /api/geolocation/* (géolocalisation)');
console.log('  📍 /api/socket/* (WebSocket)');

module.exports = app;