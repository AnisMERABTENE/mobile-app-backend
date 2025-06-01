const User = require('../models/User');
const { 
  generateToken, 
  generateResetToken, 
  generateVerificationToken,
  verifyToken 
} = require('../utils/jwt');
const { sanitizeUserInput } = require('../utils/validation');
const { sendVerificationEmail, sendResetPasswordEmail } = require('../utils/emailService');

/**
 * Inscription d'un nouvel utilisateur
 */
const register = async (req, res) => {
  try {
    // 1. Nettoyer et extraire les données
    const cleanData = sanitizeUserInput(req.body);
    const { firstName, lastName, email } = cleanData;
    const { password } = req.body;

    // 2. Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        error: 'Un compte avec cet email existe déjà'
      });
    }

    // 3. Créer le nouvel utilisateur
    const user = new User({
      firstName,
      lastName,
      email,
      password // Le hashage se fait automatiquement dans le modèle
    });

    // 4. Générer le token de vérification d'email
    const verificationToken = generateVerificationToken(user);
    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    // 5. Sauvegarder l'utilisateur
    await user.save();

    // 6. Générer le token JWT pour la session
    const authToken = generateToken(user);

    // 7. Réponse (sans le mot de passe)
    const userResponse = user.toJSON();

    res.status(201).json({
      message: 'Compte créé avec succès',
      user: userResponse,
      token: authToken,
      emailVerificationRequired: true
    });

    // Envoyer l'email de vérification
    console.log(`📧 Envoi de l'email de vérification à ${email}...`);
    const emailResult = await sendVerificationEmail(user, verificationToken);
    
    if (emailResult.success) {
      console.log('✅ Email de vérification envoyé avec succès');
    } else {
      console.error('❌ Erreur envoi email de vérification:', emailResult.error);
    }

  } catch (error) {
    console.error('Erreur inscription:', error);
    
    // Gestion des erreurs de validation MongoDB
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        error: 'Erreurs de validation',
        details: errors
      });
    }

    res.status(500).json({
      error: 'Erreur lors de la création du compte'
    });
  }
};

/**
 * Connexion d'un utilisateur
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Trouver l'utilisateur avec le mot de passe
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        error: 'Email ou mot de passe incorrect'
      });
    }

    // 2. Vérifier si le compte est verrouillé
    if (user.isLocked) {
      return res.status(423).json({
        error: 'Compte temporairement verrouillé en raison de trop nombreuses tentatives',
        lockUntil: user.lockUntil
      });
    }

    // 3. Vérifier le mot de passe
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      // Incrémenter les tentatives de connexion échouées
      await user.incLoginAttempts();
      
      return res.status(401).json({
        error: 'Email ou mot de passe incorrect'
      });
    }

    // 4. Vérifier si le compte est actif
    if (!user.isActive) {
      return res.status(401).json({
        error: 'Compte désactivé'
      });
    }

    // 5. Réinitialiser les tentatives de connexion
    if (user.loginAttempts > 0) {
      await user.resetLoginAttempts();
    }

    // 6. Mettre à jour la dernière connexion
    user.lastLoginAt = new Date();
    await user.save();

    // 7. Générer le token JWT
    const token = generateToken(user);

    // 8. Réponse (sans le mot de passe)
    const userResponse = user.toJSON();

    res.json({
      message: 'Connexion réussie',
      user: userResponse,
      token,
      emailVerificationRequired: !user.isEmailVerified
    });

  } catch (error) {
    console.error('Erreur connexion:', error);
    res.status(500).json({
      error: 'Erreur lors de la connexion'
    });
  }
};

/**
 * Demande de réinitialisation de mot de passe
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // 1. Trouver l'utilisateur
    const user = await User.findOne({ email });
    
    if (!user) {
      // Pour des raisons de sécurité, on ne révèle pas si l'email existe
      return res.json({
        message: 'Si cet email est enregistré, vous recevrez un lien de réinitialisation'
      });
    }

    // 2. Vérifier si le compte est actif
    if (!user.isActive) {
      return res.json({
        message: 'Si cet email est enregistré, vous recevrez un lien de réinitialisation'
      });
    }

    // 3. Générer le token de réinitialisation
    const resetToken = generateResetToken(user);
    
    // 4. Sauvegarder le token dans la base de données
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 heure
    await user.save();

    res.json({
      message: 'Si cet email est enregistré, vous recevrez un lien de réinitialisation'
    });

    // Envoyer l'email de réinitialisation
    console.log(`📧 Envoi de l'email de réinitialisation à ${email}...`);
    const emailResult = await sendResetPasswordEmail(user, resetToken);
    
    if (emailResult.success) {
      console.log('✅ Email de réinitialisation envoyé avec succès');
    } else {
      console.error('❌ Erreur envoi email de réinitialisation:', emailResult.error);
    }

  } catch (error) {
    console.error('Erreur forgot password:', error);
    res.status(500).json({
      error: 'Erreur lors de la demande de réinitialisation'
    });
  }
};

/**
 * Réinitialisation du mot de passe
 */
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    // 1. Vérifier le token
    let decoded;
    try {
      decoded = verifyToken(token, 'mobile-app-reset');
    } catch (error) {
      return res.status(400).json({
        error: 'Token de réinitialisation invalide ou expiré'
      });
    }

    // 2. Trouver l'utilisateur avec le token
    const user = await User.findOne({
      _id: decoded.id,
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        error: 'Token de réinitialisation invalide ou expiré'
      });
    }

    // 3. Mettre à jour le mot de passe
    user.password = password; // Le hashage se fait automatiquement
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    
    // Réinitialiser les tentatives de connexion
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    
    await user.save();

    // 4. Générer un nouveau token de session
    const authToken = generateToken(user);

    res.json({
      message: 'Mot de passe réinitialisé avec succès',
      token: authToken
    });

  } catch (error) {
    console.error('Erreur reset password:', error);
    res.status(500).json({
      error: 'Erreur lors de la réinitialisation du mot de passe'
    });
  }
};

/**
 * Vérification d'email
 */
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    // 1. Vérifier le token
    let decoded;
    try {
      decoded = verifyToken(token, 'mobile-app-verification');
    } catch (error) {
      return res.status(400).json({
        error: 'Token de vérification invalide ou expiré'
      });
    }

    // 2. Trouver l'utilisateur
    const user = await User.findOne({
      _id: decoded.id,
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        error: 'Token de vérification invalide ou expiré'
      });
    }

    // 3. Marquer l'email comme vérifié
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.json({
      message: 'Email vérifié avec succès'
    });

  } catch (error) {
    console.error('Erreur vérification email:', error);
    res.status(500).json({
      error: 'Erreur lors de la vérification de l\'email'
    });
  }
};

/**
 * Obtenir le profil utilisateur actuel
 */
const getProfile = async (req, res) => {
  try {
    // L'utilisateur est déjà disponible via le middleware d'authentification
    res.json({
      user: req.user
    });
  } catch (error) {
    console.error('Erreur get profile:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération du profil'
    });
  }
};

/**
 * Déconnexion (côté client principalement)
 */
const logout = async (req, res) => {
  try {
    // TODO: Implémenter une blacklist de tokens si nécessaire
    res.json({
      message: 'Déconnexion réussie'
    });
  } catch (error) {
    console.error('Erreur logout:', error);
    res.status(500).json({
      error: 'Erreur lors de la déconnexion'
    });
  }
};

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  verifyEmail,
  getProfile,
  logout
};