const { body, validationResult } = require('express-validator');
const { validateCategoryAndSubCategory } = require('../config/categories');

/**
 * Règles de validation pour la création d'un profil vendeur
 */
const validateSellerProfile = [
  // Nom de l'entreprise
  body('businessName')
    .trim()
    .notEmpty()
    .withMessage('Le nom de l\'entreprise est requis')
    .isLength({ min: 2, max: 100 })
    .withMessage('Le nom de l\'entreprise doit contenir entre 2 et 100 caractères')
    .matches(/^[a-zA-ZÀ-ÿ0-9\s'&.-]+$/)
    .withMessage('Le nom de l\'entreprise contient des caractères non autorisés'),

  // Description
  body('description')
    .trim()
    .notEmpty()
    .withMessage('La description est requise')
    .isLength({ min: 10, max: 500 })
    .withMessage('La description doit contenir entre 10 et 500 caractères'),

  // Téléphone
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Le numéro de téléphone est requis')
    .matches(/^[0-9+\-\s().]+$/)
    .withMessage('Format de téléphone invalide')
    .isLength({ min: 10, max: 20 })
    .withMessage('Le numéro de téléphone doit contenir entre 10 et 20 caractères'),

  // Localisation
  body('location')
    .notEmpty()
    .withMessage('La localisation est requise'),

  body('location.coordinates')
    .isArray({ min: 2, max: 2 })
    .withMessage('Les coordonnées doivent être un tableau de 2 éléments [longitude, latitude]'),

  body('location.coordinates.*')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Les coordonnées doivent être des nombres valides'),

  body('location.address')
    .trim()
    .notEmpty()
    .withMessage('L\'adresse est requise')
    .isLength({ max: 200 })
    .withMessage('L\'adresse ne peut pas dépasser 200 caractères'),

  body('location.city')
    .trim()
    .notEmpty()
    .withMessage('La ville est requise')
    .isLength({ max: 100 })
    .withMessage('La ville ne peut pas dépasser 100 caractères'),

  body('location.postalCode')
    .trim()
    .notEmpty()
    .withMessage('Le code postal est requis')
    .matches(/^[0-9]{5}$/)
    .withMessage('Le code postal doit contenir exactement 5 chiffres'),

  // Rayon de service
  body('serviceRadius')
    .isInt({ min: 1, max: 100 })
    .withMessage('Le rayon de service doit être entre 1 et 100 km'),

  // Spécialités
  body('specialties')
    .isArray({ min: 1 })
    .withMessage('Au moins une spécialité est requise'),

  body('specialties.*.category')
    .notEmpty()
    .withMessage('La catégorie de spécialité est requise')
    .isIn([
      'electronique', 'mobilier', 'vetements', 'livres', 'sport',
      'jardinage', 'bricolage', 'cuisine', 'decoration', 'jouets',
      'vehicules', 'autres'
    ])
    .withMessage('Catégorie de spécialité invalide'),

  body('specialties.*.subCategories')
    .isArray({ min: 1 })
    .withMessage('Au moins une sous-catégorie est requise par spécialité'),

  // Validation personnalisée pour les spécialités
  body('specialties').custom((specialties) => {
    if (!Array.isArray(specialties)) {
      throw new Error('Les spécialités doivent être un tableau');
    }

    for (const specialty of specialties) {
      if (!specialty.category || !Array.isArray(specialty.subCategories)) {
        throw new Error('Chaque spécialité doit avoir une catégorie et des sous-catégories');
      }

      for (const subCategory of specialty.subCategories) {
        if (!validateCategoryAndSubCategory(specialty.category, subCategory)) {
          throw new Error(`Combinaison catégorie/sous-catégorie invalide: ${specialty.category} > ${subCategory}`);
        }
      }
    }

    return true;
  })
];

/**
 * Règles de validation pour la mise à jour d'un profil vendeur
 */
const validateSellerUpdate = [
  // Nom de l'entreprise (optionnel)
  body('businessName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Le nom de l\'entreprise doit contenir entre 2 et 100 caractères')
    .matches(/^[a-zA-ZÀ-ÿ0-9\s'&.-]+$/)
    .withMessage('Le nom de l\'entreprise contient des caractères non autorisés'),

  // Description (optionnel)
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('La description doit contenir entre 10 et 500 caractères'),

  // Téléphone (optionnel)
  body('phone')
    .optional()
    .trim()
    .matches(/^[0-9+\-\s().]+$/)
    .withMessage('Format de téléphone invalide')
    .isLength({ min: 10, max: 20 })
    .withMessage('Le numéro de téléphone doit contenir entre 10 et 20 caractères'),

  // Localisation (optionnel)
  body('location.coordinates')
    .optional()
    .isArray({ min: 2, max: 2 })
    .withMessage('Les coordonnées doivent être un tableau de 2 éléments'),

  body('location.coordinates.*')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Les coordonnées doivent être des nombres valides'),

  body('location.address')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('L\'adresse ne peut pas dépasser 200 caractères'),

  body('location.city')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('La ville ne peut pas dépasser 100 caractères'),

  body('location.postalCode')
    .optional()
    .trim()
    .matches(/^[0-9]{5}$/)
    .withMessage('Le code postal doit contenir exactement 5 chiffres'),

  // Rayon de service (optionnel)
  body('serviceRadius')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Le rayon de service doit être entre 1 et 100 km'),

  // Spécialités (optionnel mais si présent, doit être valide)
  body('specialties')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Au moins une spécialité est requise'),

  body('specialties.*.category')
    .optional()
    .isIn([
      'electronique', 'mobilier', 'vetements', 'livres', 'sport',
      'jardinage', 'bricolage', 'cuisine', 'decoration', 'jouets',
      'vehicules', 'autres'
    ])
    .withMessage('Catégorie de spécialité invalide'),

  body('specialties.*.subCategories')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Au moins une sous-catégorie est requise par spécialité'),

  // Statut de disponibilité (optionnel)
  body('isAvailable')
    .optional()
    .isBoolean()
    .withMessage('Le statut de disponibilité doit être un booléen'),

  // Paramètres de notification (optionnel)
  body('notificationSettings.emailNotifications')
    .optional()
    .isBoolean()
    .withMessage('Les notifications email doivent être un booléen'),

  body('notificationSettings.pushNotifications')
    .optional()
    .isBoolean()
    .withMessage('Les notifications push doivent être un booléen'),

  body('notificationSettings.smsNotifications')
    .optional()
    .isBoolean()
    .withMessage('Les notifications SMS doivent être un booléen'),

  body('notificationSettings.instantNotifications')
    .optional()
    .isBoolean()
    .withMessage('Les notifications instantanées doivent être un booléen'),

  // Validation personnalisée pour les spécialités lors de la mise à jour
  body('specialties').optional().custom((specialties) => {
    if (specialties && Array.isArray(specialties)) {
      for (const specialty of specialties) {
        if (!specialty.category || !Array.isArray(specialty.subCategories)) {
          throw new Error('Chaque spécialité doit avoir une catégorie et des sous-catégories');
        }

        for (const subCategory of specialty.subCategories) {
          if (!validateCategoryAndSubCategory(specialty.category, subCategory)) {
            throw new Error(`Combinaison catégorie/sous-catégorie invalide: ${specialty.category} > ${subCategory}`);
          }
        }
      }
    }

    return true;
  })
];

/**
 * Règles de validation pour les paramètres de notification
 */
const validateNotificationSettings = [
  body('notificationSettings')
    .notEmpty()
    .withMessage('Les paramètres de notification sont requis'),

  body('notificationSettings.emailNotifications')
    .optional()
    .isBoolean()
    .withMessage('Les notifications email doivent être un booléen'),

  body('notificationSettings.pushNotifications')
    .optional()
    .isBoolean()
    .withMessage('Les notifications push doivent être un booléen'),

  body('notificationSettings.smsNotifications')
    .optional()
    .isBoolean()
    .withMessage('Les notifications SMS doivent être un booléen'),

  body('notificationSettings.instantNotifications')
    .optional()
    .isBoolean()
    .withMessage('Les notifications instantanées doivent être un booléen')
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

    console.log('❌ Erreurs de validation vendeur:', errorMessages);

    return res.status(400).json({
      error: 'Erreurs de validation',
      details: errorMessages
    });
  }
  
  next();
};

/**
 * Fonction utilitaire pour valider un numéro de téléphone français
 */
const validateFrenchPhoneNumber = (phone) => {
  // Supprimer tous les espaces, tirets et parenthèses
  const cleanPhone = phone.replace(/[\s\-().]/g, '');
  
  // Vérifier les formats français
  const frenchMobileRegex = /^(?:\+33|0)[67]\d{8}$/;
  const frenchLandlineRegex = /^(?:\+33|0)[1-5]\d{8}$/;
  
  return frenchMobileRegex.test(cleanPhone) || frenchLandlineRegex.test(cleanPhone);
};

/**
 * Fonction utilitaire pour valider une adresse française
 */
const validateFrenchAddress = (address, city, postalCode) => {
  const errors = [];
  
  // Vérifier le code postal français
  if (!/^[0-9]{5}$/.test(postalCode)) {
    errors.push('Le code postal doit contenir exactement 5 chiffres');
  }
  
  // Vérifier que l'adresse contient au moins un chiffre (numéro de rue)
  if (!/\d/.test(address)) {
    errors.push('L\'adresse doit contenir un numéro de rue');
  }
  
  // Vérifier que la ville ne contient que des lettres, espaces et tirets
  if (!/^[a-zA-ZÀ-ÿ\s\-']+$/.test(city)) {
    errors.push('La ville ne peut contenir que des lettres, espaces, tirets et apostrophes');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Fonction pour nettoyer et formater les données vendeur
 */
const sanitizeSellerData = (data) => {
  const cleaned = {};
  
  // Nettoyer le nom de l'entreprise
  if (data.businessName) {
    cleaned.businessName = data.businessName.trim()
      .replace(/\s+/g, ' ') // Remplacer les espaces multiples
      .replace(/[^\w\s'&.-]/g, ''); // Supprimer les caractères non autorisés
  }
  
  // Nettoyer la description
  if (data.description) {
    cleaned.description = data.description.trim()
      .replace(/\s+/g, ' ');
  }
  
  // Nettoyer le téléphone
  if (data.phone) {
    cleaned.phone = data.phone.trim()
      .replace(/[^\d+\-\s().]/g, ''); // Garder seulement les caractères autorisés
  }
  
  // Nettoyer l'adresse
  if (data.location) {
    cleaned.location = {
      ...data.location,
      address: data.location.address?.trim(),
      city: data.location.city?.trim().toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' '),
      postalCode: data.location.postalCode?.trim()
    };
  }
  
  return cleaned;
};

module.exports = {
  validateSellerProfile,
  validateSellerUpdate,
  validateNotificationSettings,
  handleValidationErrors,
  validateFrenchPhoneNumber,
  validateFrenchAddress,
  sanitizeSellerData
};