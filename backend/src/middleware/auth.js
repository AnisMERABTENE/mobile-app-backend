const { verifyToken, extractTokenFromHeader } = require('../utils/jwt');
const User = require('../models/User');

/**
 * Middleware pour vérifier l'authentification JWT
 */
const authenticateToken = async (req, res, next) => {
  try {
    // 1. Extraire le token du header
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return res.status(401).json({
        error: 'Token d\'authentification requis'
      });
    }

    // 2. Vérifier le token
    const decoded = verifyToken(token);

    // 3. Vérifier que l'utilisateur existe toujours
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({
        error: 'Utilisateur non trouvé'
      });
    }

    // 4. Vérifier que le compte est actif
    if (!user.isActive) {
      return res.status(401).json({
        error: 'Compte désactivé'
      });
    }

    // 5. Vérifier que le compte n'est pas verrouillé
    if (user.isLocked) {
      return res.status(423).json({
        error: 'Compte temporairement verrouillé'
      });
    }

    // 6. Ajouter l'utilisateur à la requête
    req.user = user;
    req.token = token;

    next();
  } catch (error) {
    console.error('Erreur authentification:', error.message);
    
    if (error.message === 'Token expiré') {
      return res.status(401).json({
        error: 'Session expirée, veuillez vous reconnecter'
      });
    }
    
    return res.status(401).json({
      error: 'Token invalide'
    });
  }
};

/**
 * Middleware pour vérifier les rôles
 * @param {...string} roles - Rôles autorisés
 */
const requireRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentification requise'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Accès refusé - Privilèges insuffisants'
      });
    }

    next();
  };
};

/**
 * Middleware pour vérifier que l'email est vérifié
 */
const requireEmailVerified = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentification requise'
    });
  }

  if (!req.user.isEmailVerified) {
    return res.status(403).json({
      error: 'Email non vérifié',
      code: 'EMAIL_NOT_VERIFIED'
    });
  }

  next();
};

/**
 * Middleware optionnel - ajoute l'utilisateur s'il est connecté
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (token) {
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.id).select('-password');
      
      if (user && user.isActive && !user.isLocked) {
        req.user = user;
        req.token = token;
      }
    }
  } catch (error) {
    // En mode optionnel, on ignore les erreurs de token
    console.log('Token optionnel invalide:', error.message);
  }
  
  next();
};

module.exports = {
  authenticateToken,
  requireRoles,
  requireEmailVerified,
  optionalAuth
};