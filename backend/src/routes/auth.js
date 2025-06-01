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
      'POST /api/auth/logout (protected)'
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
 * @desc    Initier la connexion Google OAuth
 * @access  Public
 */
router.get('/google', 
  passport.authenticate('google', { 
    scope: ['profile', 'email'] 
  })
);

/**
 * @route   GET /api/auth/google/callback
 * @desc    Callback après authentification Google
 * @access  Public
 */
router.get('/google/callback',
  passport.authenticate('google', { session: false }),
  async (req, res) => {
    try {
      const { generateToken } = require('../utils/jwt');
      
      // Générer le token JWT pour l'utilisateur
      const token = generateToken(req.user);
      
      // Rediriger vers l'app mobile avec le token
      // En développement, on peut rediriger vers une page de succès
      const redirectUrl = process.env.NODE_ENV === 'production' 
        ? `${process.env.MOBILE_APP_URL}?token=${token}`
        : `http://localhost:3000/auth/success?token=${token}`;
        
      res.redirect(redirectUrl);
      
    } catch (error) {
      console.error('❌ Erreur callback Google:', error);
      const errorUrl = process.env.NODE_ENV === 'production'
        ? `${process.env.MOBILE_APP_URL}?error=auth_failed`
        : `http://localhost:3000/auth/error?error=auth_failed`;
        
      res.redirect(errorUrl);
    }
  }
);

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