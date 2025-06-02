const express = require('express');
const passport = require('passport');
const router = express.Router();

console.log('🔄 Chargement du fichier routes/auth.js...');

// Import des contrôleurs
const {
  register,
  login,
  forgotPassword,
  resetPassword,
  verifyEmail,
  getProfile,
  logout
} = require('../controllers/authController');

// Import des middlewares
const { authenticateToken } = require('../middleware/auth');

// Import des validations
const {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  handleValidationErrors
} = require('../utils/validation');

console.log('✅ Imports chargés');

// ===================
// ROUTES DE TEST
// ===================

router.get('/ping', (req, res) => {
  res.json({ message: 'pong' });
});

router.get('/status', (req, res) => {
  res.json({ 
    message: '✅ API Auth fonctionnelle',
    timestamp: new Date().toISOString(),
    availableRoutes: [
      'POST /api/auth/register',
      'POST /api/auth/login',
      'POST /api/auth/forgot-password',
      'POST /api/auth/reset-password',
      'POST /api/auth/verify-email',
      'GET /api/auth/verify-email (lien email)',
      'GET /api/auth/profile (protected)',
      'POST /api/auth/logout (protected)',
      'GET /api/auth/google (OAuth)',
      'GET /api/auth/google/callback (OAuth callback)',
      'GET /api/auth/google/mobile-token (Mobile OAuth)',
      'POST /api/auth/google/native (Native OAuth)'
    ]
  });
});

// ===================
// ROUTES PUBLIQUES
// ===================

/**
 * @route   POST /api/auth/register
 * @desc    Inscription d'un nouvel utilisateur
 * @access  Public
 */
router.post('/register', 
  validateRegister,
  handleValidationErrors,
  register
);

/**
 * @route   POST /api/auth/login
 * @desc    Connexion d'un utilisateur
 * @access  Public
 */
router.post('/login',
  validateLogin,
  handleValidationErrors,
  login
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Demande de réinitialisation de mot de passe
 * @access  Public
 */
router.post('/forgot-password',
  validateForgotPassword,
  handleValidationErrors,
  forgotPassword
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Réinitialisation du mot de passe avec token
 * @access  Public
 */
router.post('/reset-password',
  validateResetPassword,
  handleValidationErrors,
  resetPassword
);

/**
 * @route   POST /api/auth/verify-email
 * @desc    Vérification de l'adresse email (via app mobile)
 * @access  Public
 */
router.post('/verify-email', verifyEmail);

/**
 * @route   GET /api/auth/verify-email
 * @desc    Vérification de l'adresse email (via lien email)
 * @access  Public
 */
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).send(`
        <html>
          <head><title>Erreur de vérification</title></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #ef4444;">❌ Erreur</h1>
            <p>Token de vérification manquant.</p>
            <p><a href="#" onclick="window.close()">Fermer cette fenêtre</a></p>
          </body>
        </html>
      `);
    }

    // Utiliser le même contrôleur que pour POST
    // On simule une requête POST
    req.body = { token };
    
    // Mock de la réponse pour capturer le résultat
    const mockRes = {
      status: (code) => mockRes,
      json: (data) => {
        if (data.message && data.message.includes('succès')) {
          res.send(`
            <html>
              <head><title>Email vérifié</title></head>
              <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                <h1 style="color: #10b981;">✅ Email vérifié avec succès !</h1>
                <p>Votre compte est maintenant activé.</p>
                <p>Vous pouvez retourner à l'application mobile.</p>
                <p><a href="#" onclick="window.close()">Fermer cette fenêtre</a></p>
              </body>
            </html>
          `);
        } else {
          res.status(400).send(`
            <html>
              <head><title>Erreur de vérification</title></head>
              <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                <h1 style="color: #ef4444;">❌ Erreur de vérification</h1>
                <p>${data.error || 'Token invalide ou expiré'}</p>
                <p><a href="#" onclick="window.close()">Fermer cette fenêtre</a></p>
              </body>
            </html>
          `);
        }
      }
    };

    // Appeler le contrôleur
    await verifyEmail(req, mockRes);

  } catch (error) {
    console.error('❌ Erreur vérification email GET:', error);
    res.status(500).send(`
      <html>
        <head><title>Erreur serveur</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: #ef4444;">❌ Erreur serveur</h1>
          <p>Une erreur est survenue lors de la vérification.</p>
          <p><a href="#" onclick="window.close()">Fermer cette fenêtre</a></p>
        </body>
        </html>
    `);
  }
});

// ===================
// ROUTES GOOGLE OAUTH
// ===================

/**
 * @route   GET /api/auth/google
 * @desc    Initier la connexion Google OAuth - CORRIGÉ
 * @access  Public
 */
router.get('/google', (req, res, next) => {
  // Détecter si la requête vient de l'app mobile ou du web
  const userAgent = req.get('User-Agent') || '';
  const isMobile = userAgent.includes('Expo') || 
                   req.query.mobile === 'true' ||
                   req.headers['x-mobile-app'] === 'true';

  console.log('🔍 Détection plateforme:');
  console.log('  User-Agent:', userAgent);
  console.log('  Est mobile:', isMobile);
  console.log('  Query mobile:', req.query.mobile);
  console.log('  Platform:', req.query.platform);

  // ✅ CORRECTION : Préserver les paramètres mobiles dans le state
  const state = isMobile ? JSON.stringify({
    mobile: true,
    platform: req.query.platform || 'unknown',
    timestamp: Date.now()
  }) : undefined;

  console.log('📱 State généré:', state);

  // Authentifier avec Passport
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    session: false,
    state: state  // ✅ AJOUT : Passer le state pour préserver les infos mobiles
  })(req, res, next);
});

/**
 * @route   GET /api/auth/google/callback
 * @desc    Callback après authentification Google - VERSION CORRIGÉE
 * @access  Public
 */
router.get('/google/callback',
  passport.authenticate('google', { session: false }),
  async (req, res) => {
    try {
      const { generateToken } = require('../utils/jwt');
      
      // Générer le token JWT pour l'utilisateur
      const token = generateToken(req.user);
      
      console.log('✅ Token généré pour:', req.user.email);

      // ✅ CORRECTION : Récupérer les infos mobiles depuis le state
      let isMobile = false;
      let platform = 'unknown';
      
      try {
        if (req.query.state) {
          const stateData = JSON.parse(req.query.state);
          isMobile = stateData.mobile || false;
          platform = stateData.platform || 'unknown';
          console.log('📱 State récupéré:', stateData);
        }
      } catch (e) {
        console.log('⚠️ Impossible de parser le state, fallback sur User-Agent');
      }

      // Fallback sur User-Agent si pas de state
      if (!isMobile) {
        const userAgent = req.get('User-Agent') || '';
        isMobile = userAgent.includes('Expo') || 
                   userAgent.includes('Mobile') ||
                   req.query.mobile === 'true';
      }

      console.log('🔍 Détection plateforme callback CORRIGÉE:');
      console.log('  Est mobile:', isMobile);
      console.log('  Platform:', platform);
      console.log('  State query:', req.query.state);

      if (isMobile) {
        // ✅ CORRECTION : Redirection mobile améliorée
        const mobileRedirectUrl = `myapp://auth?token=${token}&success=true&email=${encodeURIComponent(req.user.email)}&platform=${platform}`;
        
        console.log('📱 Redirection mobile CORRIGÉE vers:', mobileRedirectUrl);
        
        // Page HTML qui redirige automatiquement vers l'app mobile
        res.send(`
          <html>
            <head>
              <title>Connexion Google réussie</title>
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <script>
                console.log('🔗 Redirection vers: ${mobileRedirectUrl}');
                
                // Fonction de redirection
                function redirectToApp() {
                  try {
                    console.log('📱 Tentative de redirection...');
                    window.location.href = '${mobileRedirectUrl}';
                  } catch (e) {
                    console.error('❌ Erreur redirection:', e);
                  }
                }
                
                // Redirection immédiate
                redirectToApp();
                
                // Redirection de secours après 1 seconde
                setTimeout(redirectToApp, 1000);
                
                // Message de confirmation après 3 secondes
                setTimeout(() => {
                  console.log('✅ Redirections envoyées');
                }, 3000);
              </script>
            </head>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; min-height: 100vh; display: flex; flex-direction: column; justify-content: center;">
              <div>
                <h1>🎉 Connexion Google réussie !</h1>
                <p>Bienvenue <strong>${req.user.firstName} ${req.user.lastName}</strong></p>
                <p style="margin: 30px 0;">Redirection vers l'application mobile...</p>
                
                <button onclick="window.location.href='${mobileRedirectUrl}'" style="background: white; color: #667eea; border: none; padding: 15px 30px; border-radius: 8px; font-size: 16px; cursor: pointer; margin: 10px;">
                  📱 Ouvrir l'application
                </button>
                
                <br>
                
                <button onclick="window.close()" style="background: transparent; color: white; border: 1px solid white; padding: 10px 20px; border-radius: 8px; font-size: 14px; cursor: pointer; margin: 10px;">
                  ❌ Fermer cette fenêtre
                </button>
                
                <p style="font-size: 12px; margin-top: 30px; opacity: 0.8;">
                  Si la redirection ne fonctionne pas, cliquez sur "Ouvrir l'application"<br>
                  Platform: ${platform} | Mobile: ${isMobile}
                </p>
                
                <details style="margin-top: 20px; font-size: 10px;">
                  <summary>Debug Info</summary>
                  <pre style="text-align: left; background: rgba(0,0,0,0.3); padding: 10px; border-radius: 5px; margin-top: 10px;">
Token: ${token.substring(0, 50)}...
URL: ${mobileRedirectUrl}
User: ${req.user.email}
                  </pre>
                </details>
              </div>
              
              <script>
                // Fermer automatiquement après 10 secondes
                setTimeout(() => {
                  try {
                    window.close();
                  } catch (e) {
                    console.log('Info: Impossible de fermer automatiquement');
                  }
                }, 10000);
              </script>
            </body>
          </html>
        `);
      } else {
        // Redirection web classique (pour les tests en développement)
        const webRedirectUrl = process.env.NODE_ENV === 'production' 
          ? `myapp://auth?token=${token}&success=true`
          : `http://localhost:3000/auth/success?token=${token}`;
        
        console.log('🌐 Redirection web vers:', webRedirectUrl);
        res.redirect(webRedirectUrl);
      }
      
    } catch (error) {
      console.error('❌ Erreur callback Google:', error);
      
      const errorRedirectUrl = `myapp://auth?error=${encodeURIComponent('Erreur lors de la connexion Google')}&success=false`;
      
      res.send(`
        <html>
          <head>
            <title>Erreur de connexion</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <script>
              setTimeout(() => {
                window.location.href = '${errorRedirectUrl}';
              }, 2000);
            </script>
          </head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #ef4444; color: white; min-height: 100vh; display: flex; flex-direction: column; justify-content: center;">
            <div>
              <h1>❌ Erreur de connexion</h1>
              <p>Une erreur est survenue lors de la connexion avec Google.</p>
              <p>Redirection vers l'application mobile...</p>
              <button onclick="window.location.href='${errorRedirectUrl}'" style="background: white; color: #ef4444; border: none; padding: 15px 30px; border-radius: 8px; font-size: 16px; cursor: pointer;">
                Retourner à l'application
              </button>
            </div>
          </body>
        </html>
      `);
    }
  }
);

/**
 * @route   GET /api/auth/google/mobile-token
 * @desc    Récupérer le token pour l'app mobile après OAuth
 * @access  Public (temporaire)
 */
router.get('/google/mobile-token', (req, res) => {
  // Pour l'instant, cette route indique qu'il n'y a pas de token
  // Dans une vraie implémentation, on utiliserait Redis ou une session temporaire
  console.log('📱 Demande de token mobile...');
  
  res.status(404).json({
    success: false,
    error: 'Aucun token disponible'
  });
});

/**
 * @route   POST /api/auth/google/native
 * @desc    Authentification Google native depuis l'app mobile
 * @access  Public
 */
router.post('/google/native', async (req, res) => {
  try {
    const { googleId, email, firstName, lastName, avatar, isEmailVerified } = req.body;
    const { generateToken } = require('../utils/jwt');
    const User = require('../models/User');

    console.log('📱 Auth Google native pour:', email);

    // Chercher ou créer l'utilisateur
    let user = await User.findOne({ email });

    if (user) {
      // Utilisateur existe - mettre à jour avec les infos Google
      if (!user.googleId) {
        user.googleId = googleId;
        user.isEmailVerified = true;
        if (!user.avatar) user.avatar = avatar;
        await user.save();
        console.log('✅ Compte existant lié à Google:', email);
      } else {
        console.log('✅ Connexion Google native réussie:', email);
      }
    } else {
      // Créer un nouvel utilisateur
      user = new User({
        firstName,
        lastName,
        email,
        googleId,
        avatar,
        isEmailVerified: true,
        role: 'user'
      });
      await user.save();
      console.log('✅ Nouveau compte créé via Google native:', email);
    }

    // Mettre à jour la dernière connexion
    user.lastLoginAt = new Date();
    await user.save();

    // Générer le token JWT
    const token = generateToken(user);

    res.json({
      message: 'Connexion Google native réussie',
      user: user.toJSON(),
      token
    });

  } catch (error) {
    console.error('❌ Erreur auth Google native:', error);
    res.status(500).json({
      error: 'Erreur lors de l\'authentification Google'
    });
  }
});

// ===================
// ROUTES PROTÉGÉES
// ===================

/**
 * @route   GET /api/auth/profile
 * @desc    Obtenir le profil de l'utilisateur connecté
 * @access  Private
 */
router.get('/profile', authenticateToken, getProfile);

/**
 * @route   POST /api/auth/logout
 * @desc    Déconnexion de l'utilisateur
 * @access  Private
 */
router.post('/logout', authenticateToken, logout);

/**
 * @route   GET /api/auth/check-token
 * @desc    Vérifier la validité du token
 * @access  Private
 */
router.get('/check-token', authenticateToken, (req, res) => {
  res.json({
    valid: true,
    user: req.user
  });
});

console.log('✅ Routes auth définies');

module.exports = router;