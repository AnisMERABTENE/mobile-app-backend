const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

console.log('🔄 Démarrage de l\'application...');

// ===================
// MIDDLEWARES DE BASE
// ===================

// CORS - Autoriser TOUTES les requêtes pour mobile
app.use(cors({
  origin: '*', // Autorise toutes les origines
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Parser JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialiser Passport après avoir vérifié les variables d'env
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  console.log('🔄 Initialisation de Passport...');
  const passport = require('./config/passport');
  app.use(passport.initialize());
  console.log('✅ Passport initialisé');
} else {
  console.log('⚠️ Google OAuth désactivé - Variables manquantes');
}

// Logger simple
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

console.log('✅ Middlewares chargés');

// ===================
// ROUTES DE L'API
// ===================

// Route de test principale
app.get('/api/test', (req, res) => {
  res.json({ 
    message: '🚀 API Backend Mobile App fonctionne !',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Route racine
app.get('/', (req, res) => {
  res.json({ 
    message: '📱 API Mobile App Backend',
    status: 'running'
  });
});

// Pages temporaires pour Google OAuth (développement)
app.get('/auth/success', (req, res) => {
  const { token } = req.query;
  res.send(`
    <h1>🎉 Connexion Google réussie !</h1>
    <p><strong>Token JWT :</strong></p>
    <textarea rows="5" cols="80">${token}</textarea>
    <p>Tu peux maintenant utiliser ce token dans ton app mobile !</p>
  `);
});

app.get('/auth/error', (req, res) => {
  const { error } = req.query;
  res.send(`
    <h1>❌ Erreur de connexion</h1>
    <p>Erreur : ${error}</p>
    <a href="/api/auth/google">Réessayer</a>
  `);
});

// Routes d'authentification avec gestion d'erreur
console.log('🔄 Chargement des routes auth...');
try {
  const authRoutes = require('./routes/auth');
  app.use('/api/auth', authRoutes);
  console.log('✅ Routes auth chargées avec succès');
} catch (error) {
  console.error('❌ Erreur chargement routes auth:', error.message);
  console.error('❌ Stack:', error.stack);
}

// Route de test email (développement seulement)
if (process.env.NODE_ENV === 'development') {
  app.get('/api/test-email', async (req, res) => {
    try {
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
}

// ===================
// GESTION D'ERREURS
// ===================

// Routes non trouvées
app.use((req, res) => {
  res.status(404).json({
    error: 'Route non trouvée',
    path: req.originalUrl
  });
});

// Erreurs générales
app.use((err, req, res, next) => {
  console.error('Erreur:', err);
  res.status(500).json({
    error: 'Erreur serveur'
  });
});

console.log('✅ Application configurée');

module.exports = app;