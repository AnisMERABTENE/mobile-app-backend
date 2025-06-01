const jwt = require('jsonwebtoken');

/**
 * Génère un token JWT pour un utilisateur
 * @param {Object} user - L'utilisateur
 * @returns {String} Token JWT
 */
const generateToken = (user) => {
  const payload = {
    id: user._id,
    email: user.email,
    role: user.role
  };

  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      issuer: 'mobile-app-backend',
      audience: 'mobile-app-users'
    }
  );
};

/**
 * Génère un token de réinitialisation de mot de passe
 * @param {Object} user - L'utilisateur
 * @returns {String} Token de reset
 */
const generateResetToken = (user) => {
  const payload = {
    id: user._id,
    email: user.email,
    type: 'password-reset'
  };

  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    {
      expiresIn: '1h', // Token valide 1 heure seulement
      issuer: 'mobile-app-backend',
      audience: 'mobile-app-reset'
    }
  );
};

/**
 * Génère un token de vérification d'email
 * @param {Object} user - L'utilisateur
 * @returns {String} Token de vérification
 */
const generateVerificationToken = (user) => {
  const payload = {
    id: user._id,
    email: user.email,
    type: 'email-verification'
  };

  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    {
      expiresIn: '24h', // Token valide 24 heures
      issuer: 'mobile-app-backend',
      audience: 'mobile-app-verification'
    }
  );
};

/**
 * Vérifie et décode un token JWT
 * @param {String} token - Le token à vérifier
 * @param {String} audience - L'audience attendue (optionnel)
 * @returns {Object} Données décodées du token
 */
const verifyToken = (token, audience = 'mobile-app-users') => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'mobile-app-backend',
      audience: audience
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expiré');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Token invalide');
    } else {
      throw new Error('Erreur de vérification du token');
    }
  }
};

/**
 * Extrait le token du header Authorization
 * @param {String} authHeader - Header Authorization
 * @returns {String|null} Token extrait ou null
 */
const extractTokenFromHeader = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.substring(7); // Enlève "Bearer "
};

module.exports = {
  generateToken,
  generateResetToken,
  generateVerificationToken,
  verifyToken,
  extractTokenFromHeader
};