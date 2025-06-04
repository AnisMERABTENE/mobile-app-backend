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
  const userAgent = req.get('User-Agent') || '';
  const platform = req.query.platform || 'unknown';
  
  res.json({ 
    message: 'pong',
    timestamp: new Date().toISOString(),
    platform: platform,
    userAgent: userAgent,
    isAndroidAPK: userAgent.includes('Android') || req.headers['x-mobile-app'] === 'Android-APK'
  });
});

router.get('/status', (req, res) => {
  res.json({ 
    message: '✅ API Auth fonctionnelle',
    timestamp: new Date().toISOString(),
    platform: req.query.platform || 'unknown',
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
      'GET /api/auth/google/android-callback (Android APK callback)',
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
 * @desc    Initier la connexion Google OAuth - AMÉLIORÉ ANDROID
 * @access  Public
 */
router.get('/google', (req, res, next) => {
  // Détecter si la requête vient de l'app mobile ou du web
  const userAgent = req.get('User-Agent') || '';
  const isMobile = userAgent.includes('Expo') || 
                   req.query.mobile === 'true' ||
                   req.headers['x-mobile-app'] === 'true' ||
                   req.headers['x-mobile-app'] === 'Android-APK';
  const isAndroidAPK = req.query.apk === 'true' || 
                       req.headers['x-mobile-app'] === 'Android-APK' ||
                       userAgent.includes('Android');

  console.log('🔍 Détection plateforme (AMÉLIORÉE):');
  console.log('  User-Agent:', userAgent);
  console.log('  Est mobile:', isMobile);
  console.log('  Est Android APK:', isAndroidAPK);
  console.log('  Query mobile:', req.query.mobile);
  console.log('  Query APK:', req.query.apk);
  console.log('  Platform:', req.query.platform);
  console.log('  Headers X-Mobile-App:', req.headers['x-mobile-app']);

  // ✅ CORRECTION : Préserver les paramètres mobiles dans le state
  const state = isMobile ? JSON.stringify({
    mobile: true,
    platform: req.query.platform || 'unknown',
    apk: isAndroidAPK,
    timestamp: Date.now()
  }) : undefined;

  console.log('📱 State généré (AMÉLIORÉ):', state);

  // Authentifier avec Passport
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    session: false,
    state: state  // ✅ AJOUT : Passer le state pour préserver les infos mobiles
  })(req, res, next);
});

/**
 * @route   GET /api/auth/google/callback
 * @desc    Callback après authentification Google - AMÉLIORÉ ANDROID
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

      // Récupérer les infos mobiles depuis le state
      let isMobile = false;
      let platform = 'unknown';
      let isAPK = false;
      
      try {
        if (req.query.state) {
          const stateData = JSON.parse(req.query.state);
          isMobile = stateData.mobile || false;
          platform = stateData.platform || 'unknown';
          isAPK = stateData.apk || false;
          console.log('📱 State récupéré (AMÉLIORÉ):', stateData);
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
        isAPK = userAgent.includes('Android');
      }

      console.log('🔍 Détection plateforme callback (AMÉLIORÉE):');
      console.log('  Est mobile:', isMobile);
      console.log('  Platform:', platform);
      console.log('  Est APK:', isAPK);

      if (isMobile) {
        // ✅ REDIRECTION SPÉCIALE POUR ANDROID APK
        if (isAPK && platform === 'android') {
          console.log('🤖 Redirection spéciale Android APK...');
          return res.redirect(`/api/auth/google/android-callback?token=${token}&email=${encodeURIComponent(req.user.email)}&user_id=${req.user._id}`);
        }

        // URL de redirection mobile standard
        const mobileRedirectUrl = `myapp://auth?token=${token}&success=true&email=${encodeURIComponent(req.user.email)}&platform=${platform}`;
        
        console.log('📱 Redirection mobile vers:', mobileRedirectUrl);
        
        // PAGE STANDARD POUR AUTRES MOBILES
        res.send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Connexion réussie</title>
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <meta charset="utf-8">
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  margin: 0;
                  padding: 20px;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white;
                  text-align: center;
                  min-height: 100vh;
                  display: flex;
                  flex-direction: column;
                  justify-content: center;
                }
                .container {
                  max-width: 400px;
                  margin: 0 auto;
                  padding: 30px;
                  background: rgba(255,255,255,0.1);
                  border-radius: 20px;
                  backdrop-filter: blur(10px);
                }
                .icon { font-size: 64px; margin-bottom: 20px; }
                h1 { margin: 0 0 10px 0; font-size: 24px; }
                p { margin: 10px 0; opacity: 0.9; }
                .btn {
                  display: block;
                  width: 100%;
                  padding: 15px 20px;
                  background: white;
                  color: #667eea;
                  text-decoration: none;
                  border-radius: 25px;
                  font-weight: 600;
                  margin: 10px 0;
                  border: none;
                  cursor: pointer;
                  font-size: 16px;
                  box-sizing: border-box;
                }
                .btn:hover { background: #f0f0f0; }
                .btn-secondary {
                  background: transparent;
                  color: white;
                  border: 2px solid white;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="icon">🎉</div>
                <h1>Connexion réussie !</h1>
                <p>Bienvenue <strong>${req.user.firstName}</strong></p>
                
                <button class="btn" onclick="openApp()">📱 Ouvrir l'application</button>
                <button class="btn btn-secondary" onclick="closeWindow()">❌ Fermer cette fenêtre</button>
              </div>

              <script>
                const redirectUrl = '${mobileRedirectUrl}';
                
                function openApp() {
                  console.log('🔗 Tentative ouverture app:', redirectUrl);
                  try {
                    window.location.href = redirectUrl;
                    setTimeout(() => window.open(redirectUrl, '_self'), 100);
                  } catch (e) {
                    console.error('❌ Erreur ouverture app:', e);
                    alert('Impossible d\\'ouvrir l\\'application automatiquement.');
                  }
                }
                
                function closeWindow() {
                  try {
                    window.close();
                    setTimeout(() => window.history.back(), 100);
                  } catch (e) {
                    alert('Fermez manuellement cette fenêtre');
                  }
                }
                
                // Tentative automatique d'ouverture
                setTimeout(openApp, 1000);
                setTimeout(closeWindow, 10000);
              </script>
            </body>
          </html>
        `);
      } else {
        // Redirection web classique
        const webRedirectUrl = process.env.NODE_ENV === 'production' 
          ? `myapp://auth?token=${token}&success=true`
          : `http://localhost:3000/auth/success?token=${token}`;
        
        console.log('🌐 Redirection web vers:', webRedirectUrl);
        res.redirect(webRedirectUrl);
      }
      
    } catch (error) {
      console.error('❌ Erreur callback Google:', error);
      
      res.send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #ef4444; color: white;">
            <h1>❌ Erreur de connexion</h1>
            <p>Une erreur est survenue lors de la connexion avec Google.</p>
            <button onclick="window.close()" style="background: white; color: #ef4444; border: none; padding: 15px 30px; border-radius: 8px; font-size: 16px; cursor: pointer;">
              Fermer
            </button>
          </body>
        </html>
      `);
    }
  }
);

/**
 * @route   GET /api/auth/google/android-callback
 * @desc    Callback spécial pour Android APK avec retry automatique
 * @access  Public
 */
router.get('/google/android-callback', async (req, res) => {
  try {
    const { token, email, user_id } = req.query;
    
    if (!token || !email) {
      return res.status(400).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #ef4444; color: white;">
            <h1>❌ Paramètres manquants</h1>
            <p>Token ou email manquant pour Android APK.</p>
          </body>
        </html>
      `);
    }

    console.log('🤖 Callback Android APK pour:', email);

    // URL de redirection mobile Android avec retry automatique
    const mobileRedirectUrl = `myapp://auth?token=${token}&success=true&email=${encodeURIComponent(email)}&platform=android&apk=true`;
    
    console.log('📱 Redirection Android APK vers:', mobileRedirectUrl);
    
    // PAGE SPÉCIALE POUR ANDROID APK AVEC RETRY AUTOMATIQUE
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Connexion Google - Android</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <meta charset="utf-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0;
              padding: 20px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              text-align: center;
              min-height: 100vh;
              display: flex;
              flex-direction: column;
              justify-content: center;
            }
            .container {
              max-width: 400px;
              margin: 0 auto;
              padding: 30px;
              background: rgba(255,255,255,0.1);
              border-radius: 20px;
              backdrop-filter: blur(10px);
            }
            .icon { font-size: 64px; margin-bottom: 20px; }
            h1 { margin: 0 0 10px 0; font-size: 24px; }
            p { margin: 10px 0; opacity: 0.9; }
            .btn {
              display: block;
              width: 100%;
              padding: 15px 20px;
              background: white;
              color: #667eea;
              text-decoration: none;
              border-radius: 25px;
              font-weight: 600;
              margin: 10px 0;
              border: none;
              cursor: pointer;
              font-size: 16px;
              box-sizing: border-box;
            }
            .status {
              background: rgba(0,0,0,0.3);
              padding: 15px;
              border-radius: 8px;
              margin: 20px 0;
              font-family: monospace;
              font-size: 14px;
            }
            .retry-info {
              background: rgba(255,255,255,0.2);
              padding: 10px;
              border-radius: 8px;
              margin: 10px 0;
              font-size: 12px;
            }
            @keyframes pulse {
              0% { opacity: 1; }
              50% { opacity: 0.5; }
              100% { opacity: 1; }
            }
            .loading { animation: pulse 2s infinite; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">🤖</div>
            <h1>Connexion Android réussie !</h1>
            <p>Retour automatique vers l'application...</p>
            
            <div class="status" id="status">
              🔄 Tentative de retour vers l'app...
            </div>
            
            <div class="retry-info">
              <strong>Tentatives automatiques :</strong>
              <div id="attempt-counter">1 / 5</div>
            </div>
            
            <button class="btn" onclick="manualReturn()">🔄 Retour manuel vers l'app</button>
            <button class="btn" onclick="copyToken()" style="background: transparent; border: 2px solid white; color: white;">📋 Copier le token</button>
          </div>

          <script>
            const redirectUrl = '${mobileRedirectUrl}';
            let attemptCount = 0;
            const maxAttempts = 5;
            
            function updateStatus(message) {
              document.getElementById('status').innerHTML = message;
              console.log('Status:', message);
            }
            
            function updateAttemptCounter() {
              document.getElementById('attempt-counter').textContent = attemptCount + ' / ' + maxAttempts;
            }
            
            function attemptReturn() {
              attemptCount++;
              updateAttemptCounter();
              updateStatus('🔄 Tentative ' + attemptCount + ' - Ouverture de l\\'app...');
              
              try {
                // Méthode 1: Direct navigation
                window.location.href = redirectUrl;
                
                // Méthode 2: Window.open avec target _self (fallback)
                setTimeout(() => {
                  window.open(redirectUrl, '_self');
                }, 1000);
                
                // Méthode 3: Création d'un lien invisible (fallback)
                setTimeout(() => {
                  const link = document.createElement('a');
                  link.href = redirectUrl;
                  link.target = '_self';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }, 2000);
                
              } catch (e) {
                console.error('❌ Erreur tentative', attemptCount, ':', e);
                updateStatus('❌ Tentative ' + attemptCount + ' échouée');
              }
              
              // Vérifier si on doit continuer les tentatives
              if (attemptCount < maxAttempts) {
                setTimeout(() => {
                  attemptReturn();
                }, 3000); // Attendre 3 secondes entre les tentatives
              } else {
                updateStatus('⚠️ Toutes les tentatives ont échoué. Utilisez le bouton manuel.');
              }
            }
            
            function manualReturn() {
              updateStatus('🔄 Tentative manuelle...');
              
              try {
                // Essayer plusieurs méthodes manuellement
                window.location.href = redirectUrl;
                
                setTimeout(() => {
                  window.location.replace(redirectUrl);
                }, 500);
                
                setTimeout(() => {
                  window.open(redirectUrl, '_self');
                }, 1000);
                
              } catch (e) {
                updateStatus('❌ Échec retour manuel. Copiez le token.');
                console.error('❌ Erreur retour manuel:', e);
              }
            }
            
            function copyToken() {
              const token = '${token}';
              
              try {
                // Méthode moderne
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(token).then(() => {
                    updateStatus('✅ Token copié ! Utilisez-le dans l\\'app.');
                  }).catch(() => {
                    fallbackCopy(token);
                  });
                } else {
                  fallbackCopy(token);
                }
              } catch (e) {
                fallbackCopy(token);
              }
            }
            
            function fallbackCopy(text) {
              // Méthode de fallback pour copier
              const textarea = document.createElement('textarea');
              textarea.value = text;
              document.body.appendChild(textarea);
              textarea.select();
              try {
                document.execCommand('copy');
                updateStatus('✅ Token copié ! Utilisez-le dans l\\'app.');
              } catch (e) {
                updateStatus('❌ Impossible de copier. Token affiché ci-dessous.');
                const tokenDisplay = document.createElement('div');
                tokenDisplay.style.cssText = 'word-break: break-all; background: rgba(0,0,0,0.5); padding: 10px; border-radius: 5px; margin: 10px 0; font-size: 10px;';
                tokenDisplay.textContent = text;
                document.querySelector('.container').appendChild(tokenDisplay);
              }
              document.body.removeChild(textarea);
            }
            
            // Démarrer les tentatives automatiques après 1 seconde
            setTimeout(() => {
              attemptReturn();
            }, 1000);
            
            // Fermeture automatique après 2 minutes si rien ne marche
            setTimeout(() => {
              updateStatus('⏰ Timeout atteint. Fermez cette fenêtre.');
              try {
                window.close();
              } catch (e) {
                updateStatus('⏰ Fermez manuellement cette fenêtre.');
              }
            }, 120000);
          </script>
        </body>
      </html>
    `);
    
  } catch (error) {
    console.error('❌ Erreur callback Google Android:', error);
    
    res.send(`
      <html>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #ef4444; color: white;">
          <h1>❌ Erreur de connexion Android</h1>
          <p>Une erreur est survenue lors de la connexion avec Google sur Android.</p>
          <p>Erreur: ${error.message}</p>
          <button onclick="window.close()" style="background: white; color: #ef4444; border: none; padding: 15px 30px; border-radius: 8px; font-size: 16px; cursor: pointer;">
            Fermer
          </button>
        </body>
      </html>
    `);
  }
});

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
    user: req.user,
    platform: req.headers['x-platform'] || 'unknown',
    timestamp: new Date().toISOString()
  });
});

console.log('✅ Routes auth définies');

module.exports = router;