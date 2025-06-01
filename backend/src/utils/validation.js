const { body, validationResult } = require('express-validator');

/**
 * Règles de validation pour l'inscription
 */
const validateRegister = [
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('Le prénom est requis')
    .isLength({ min: 2, max: 50 })
    .withMessage('Le prénom doit contenir entre 2 et 50 caractères')
    .matches(/^[a-zA-ZÀ-ÿ\s'-]+$/)
    .withMessage('Le prénom ne peut contenir que des lettres, espaces, apostrophes et tirets'),

  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Le nom est requis')
    .isLength({ min: 2, max: 50 })
    .withMessage('Le nom doit contenir entre 2 et 50 caractères')
    .matches(/^[a-zA-ZÀ-ÿ\s'-]+$/)
    .withMessage('Le nom ne peut contenir que des lettres, espaces, apostrophes et tirets'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('L\'email est requis')
    .isEmail()
    .withMessage('Format d\'email invalide')
    .normalizeEmail()
    .isLength({ max: 254 })
    .withMessage('L\'email est trop long'),

  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Le mot de passe doit contenir entre 8 et 128 caractères')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Le mot de passe doit contenir au moins: 1 minuscule, 1 majuscule, 1 chiffre et 1 caractère spécial')
];

/**
 * Règles de validation pour la connexion
 */
const validateLogin = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('L\'email est requis')
    .isEmail()
    .withMessage('Format d\'email invalide')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Le mot de passe est requis')
];

/**
 * Règles de validation pour la demande de réinitialisation
 */
const validateForgotPassword = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('L\'email est requis')
    .isEmail()
    .withMessage('Format d\'email invalide')
    .normalizeEmail()
];

/**
 * Règles de validation pour la réinitialisation de mot de passe
 */
const validateResetPassword = [
  body('token')
    .notEmpty()
    .withMessage('Token de réinitialisation requis'),

  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Le mot de passe doit contenir entre 8 et 128 caractères')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Le mot de passe doit contenir au moins: 1 minuscule, 1 majuscule, 1 chiffre et 1 caractère spécial')
];

/**
 * Règles de validation pour le changement de mot de passe
 */
const validateChangePassword = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Le mot de passe actuel est requis'),

  body('newPassword')
    .isLength({ min: 8, max: 128 })
    .withMessage('Le nouveau mot de passe doit contenir entre 8 et 128 caractères')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Le nouveau mot de passe doit contenir au moins: 1 minuscule, 1 majuscule, 1 chiffre et 1 caractère spécial')
];

/**
 * Middleware pour gérer les erreurs de validation
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value
    }));

    return res.status(400).json({
      error: 'Erreurs de validation',
      details: errorMessages
    });
  }
  
  next();
};

/**
 * Fonction utilitaire pour vérifier la force du mot de passe
 */
const checkPasswordStrength = (password) => {
  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[@$!%*?&]/.test(password)
  };

  const score = Object.values(checks).filter(Boolean).length;
  
  let strength = 'faible';
  if (score >= 5) strength = 'très forte';
  else if (score >= 4) strength = 'forte';
  else if (score >= 3) strength = 'moyenne';

  return {
    isValid: score >= 5,
    strength,
    checks,
    score
  };
};

/**
 * Fonction pour nettoyer et valider les données utilisateur
 */
const sanitizeUserInput = (data) => {
  const cleaned = {};
  
  // Nettoyer le prénom
  if (data.firstName) {
    cleaned.firstName = data.firstName.trim()
      .replace(/\s+/g, ' ') // Remplacer les espaces multiples par un seul
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  // Nettoyer le nom
  if (data.lastName) {
    cleaned.lastName = data.lastName.trim()
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  // Nettoyer l'email
  if (data.email) {
    cleaned.email = data.email.trim().toLowerCase();
  }
  
  return cleaned;
};

module.exports = {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateChangePassword,
  handleValidationErrors,
  checkPasswordStrength,
  sanitizeUserInput
};