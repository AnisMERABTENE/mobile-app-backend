const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { validateCategoryAndSubCategory } = require('../config/categories');
const Seller = require('../models/Seller');
const { body, validationResult } = require('express-validator');

// ===================
// MIDDLEWARE DE VALIDATION
// ===================

/**
 * Validation pour la mise à jour du profil général
 */
const validateProfileUpdate = [
  body('businessName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Le nom de l\'entreprise doit contenir entre 2 et 100 caractères')
    .matches(/^[a-zA-ZÀ-ÿ0-9\s'&.-]+$/)
    .withMessage('Le nom de l\'entreprise contient des caractères non autorisés'),

  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('La description doit contenir entre 10 et 500 caractères'),

  body('phone')
    .optional()
    .trim()
    .matches(/^[0-9+\-\s().]+$/)
    .withMessage('Format de téléphone invalide')
    .isLength({ min: 10, max: 20 })
    .withMessage('Le numéro de téléphone doit contenir entre 10 et 20 caractères'),

  body('location.coordinates')
    .optional()
    .isArray({ min: 2, max: 2 })
    .withMessage('Les coordonnées doivent être un tableau de 2 éléments'),

  body('location.coordinates.*')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Coordonnées invalides'),

  body('location.address')
    .optional()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('L\'adresse doit contenir entre 5 et 200 caractères'),

  body('location.city')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('La ville doit contenir entre 2 et 50 caractères'),

  body('location.postalCode')
    .optional()
    .trim()
    .matches(/^\d{5}$/)
    .withMessage('Code postal invalide (5 chiffres attendus)')
];

/**
 * Validation pour l'ajout/modification d'une spécialité
 */
const validateSpecialty = [
  body('category')
    .notEmpty()
    .withMessage('La catégorie est requise'),

  body('subCategories')
    .isArray({ min: 1 })
    .withMessage('Au moins une sous-catégorie est requise'),

  body('subCategories.*')
    .notEmpty()
    .withMessage('Les sous-catégories ne peuvent pas être vides')
];

// ===================
// MIDDLEWARE DE VÉRIFICATION VENDEUR
// ===================

/**
 * Middleware pour vérifier que l'utilisateur est bien un vendeur
 */
const ensureSeller = async (req, res, next) => {
  try {
    const seller = await Seller.findOne({ user: req.user._id });
    if (!seller) {
      return res.status(404).json({
        error: 'Profil vendeur non trouvé'
      });
    }
    req.seller = seller;
    next();
  } catch (error) {
    console.error('❌ Erreur vérification vendeur:', error);
    res.status(500).json({
      error: 'Erreur lors de la vérification du profil vendeur'
    });
  }
};

// ===================
// ROUTES
// ===================

/**
 * @route   GET /api/seller/profile
 * @desc    Récupérer le profil du vendeur connecté
 * @access  Private (Seller only)
 */
router.get('/profile', authenticateToken, ensureSeller, async (req, res) => {
  try {
    const seller = await Seller.findOne({ user: req.user._id })
      .populate('user', 'firstName lastName email')
      .select('-__v');

    if (!seller) {
      return res.status(404).json({
        error: 'Profil vendeur non trouvé'
      });
    }

    res.json({
      message: 'Profil vendeur récupéré avec succès',
      seller: {
        id: seller._id,
        user: seller.user,
        businessName: seller.businessName,
        description: seller.description,
        phone: seller.phone,
        location: seller.location,
        specialties: seller.specialties,
        status: seller.status,
        rating: seller.rating,
        totalReviews: seller.totalReviews,
        createdAt: seller.createdAt,
        updatedAt: seller.updatedAt
      }
    });

  } catch (error) {
    console.error('❌ Erreur récupération profil vendeur:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération du profil'
    });
  }
});

/**
 * @route   PUT /api/seller/profile
 * @desc    Mettre à jour les informations générales du profil vendeur
 * @access  Private (Seller only)
 */
router.put('/profile', authenticateToken, ensureSeller, validateProfileUpdate, async (req, res) => {
  try {
    // Vérifier les erreurs de validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données de validation invalides',
        details: errors.array()
      });
    }

    const { businessName, description, phone, location } = req.body;
    const updateData = {};

    // Construire l'objet de mise à jour avec seulement les champs fournis
    if (businessName !== undefined) updateData.businessName = businessName.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (phone !== undefined) updateData.phone = phone.trim();
    
    // Gérer la localisation
    if (location) {
      updateData.location = {
        type: 'Point',
        coordinates: location.coordinates || req.seller.location.coordinates,
        address: location.address || req.seller.location.address,
        city: location.city || req.seller.location.city,
        postalCode: location.postalCode || req.seller.location.postalCode,
        country: location.country || req.seller.location.country || 'France'
      };
    }

    // Mettre à jour le vendeur
    const updatedSeller = await Seller.findByIdAndUpdate(
      req.seller._id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('user', 'firstName lastName email');

    console.log(`✅ Profil vendeur mis à jour: ${updatedSeller.businessName}`);

    res.json({
      message: 'Profil mis à jour avec succès',
      seller: {
        id: updatedSeller._id,
        user: updatedSeller.user,
        businessName: updatedSeller.businessName,
        description: updatedSeller.description,
        phone: updatedSeller.phone,
        location: updatedSeller.location,
        specialties: updatedSeller.specialties,
        status: updatedSeller.status,
        updatedAt: updatedSeller.updatedAt
      }
    });

  } catch (error) {
    console.error('❌ Erreur mise à jour profil vendeur:', error);
    res.status(500).json({
      error: 'Erreur lors de la mise à jour du profil'
    });
  }
});

/**
 * @route   POST /api/seller/specialties
 * @desc    Ajouter une nouvelle spécialité
 * @access  Private (Seller only)
 */
router.post('/specialties', authenticateToken, ensureSeller, validateSpecialty, async (req, res) => {
  try {
    // Vérifier les erreurs de validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données de validation invalides',
        details: errors.array()
      });
    }

    const { category, subCategories } = req.body;

    // Vérifier que la catégorie et les sous-catégories sont valides
    for (const subCategory of subCategories) {
      if (!validateCategoryAndSubCategory(category, subCategory)) {
        return res.status(400).json({
          error: `Combinaison catégorie/sous-catégorie invalide: ${category} > ${subCategory}`
        });
      }
    }

    // Vérifier si cette spécialité existe déjà
    const existingSpecialty = req.seller.specialties.find(spec => spec.category === category);
    if (existingSpecialty) {
      return res.status(400).json({
        error: 'Cette catégorie est déjà dans vos spécialités. Utilisez la modification pour ajouter des sous-catégories.'
      });
    }

    // Ajouter la nouvelle spécialité
    const newSpecialty = {
      category,
      subCategories
    };

    const updatedSeller = await Seller.findByIdAndUpdate(
      req.seller._id,
      { $push: { specialties: newSpecialty } },
      { new: true, runValidators: true }
    );

    console.log(`✅ Spécialité ajoutée: ${category} pour ${updatedSeller.businessName}`);

    res.json({
      message: 'Spécialité ajoutée avec succès',
      specialty: newSpecialty,
      specialties: updatedSeller.specialties
    });

  } catch (error) {
    console.error('❌ Erreur ajout spécialité:', error);
    res.status(500).json({
      error: 'Erreur lors de l\'ajout de la spécialité'
    });
  }
});

/**
 * @route   PUT /api/seller/specialties/:specialtyId
 * @desc    Modifier une spécialité existante (ajouter/supprimer des sous-catégories)
 * @access  Private (Seller only)
 */
router.put('/specialties/:specialtyId', authenticateToken, ensureSeller, validateSpecialty, async (req, res) => {
  try {
    // Vérifier les erreurs de validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données de validation invalides',
        details: errors.array()
      });
    }

    const { specialtyId } = req.params;
    const { category, subCategories } = req.body;

    // Vérifier que la spécialité existe
    const specialtyIndex = req.seller.specialties.findIndex(spec => spec._id.toString() === specialtyId);
    if (specialtyIndex === -1) {
      return res.status(404).json({
        error: 'Spécialité non trouvée'
      });
    }

    // Vérifier que la catégorie et les sous-catégories sont valides
    for (const subCategory of subCategories) {
      if (!validateCategoryAndSubCategory(category, subCategory)) {
        return res.status(400).json({
          error: `Combinaison catégorie/sous-catégorie invalide: ${category} > ${subCategory}`
        });
      }
    }

    // Mettre à jour la spécialité
    const updatedSeller = await Seller.findOneAndUpdate(
      { 
        _id: req.seller._id,
        'specialties._id': specialtyId
      },
      {
        $set: {
          'specialties.$.category': category,
          'specialties.$.subCategories': subCategories
        }
      },
      { new: true, runValidators: true }
    );

    const updatedSpecialty = updatedSeller.specialties.find(spec => spec._id.toString() === specialtyId);

    console.log(`✅ Spécialité modifiée: ${category} pour ${updatedSeller.businessName}`);

    res.json({
      message: 'Spécialité modifiée avec succès',
      specialty: updatedSpecialty,
      specialties: updatedSeller.specialties
    });

  } catch (error) {
    console.error('❌ Erreur modification spécialité:', error);
    res.status(500).json({
      error: 'Erreur lors de la modification de la spécialité'
    });
  }
});

/**
 * @route   DELETE /api/seller/specialties/:specialtyId
 * @desc    Supprimer une spécialité
 * @access  Private (Seller only)
 */
router.delete('/specialties/:specialtyId', authenticateToken, ensureSeller, async (req, res) => {
  try {
    const { specialtyId } = req.params;

    // Vérifier que la spécialité existe
    const specialtyExists = req.seller.specialties.some(spec => spec._id.toString() === specialtyId);
    if (!specialtyExists) {
      return res.status(404).json({
        error: 'Spécialité non trouvée'
      });
    }

    // Vérifier qu'il restera au moins une spécialité
    if (req.seller.specialties.length <= 1) {
      return res.status(400).json({
        error: 'Impossible de supprimer la dernière spécialité. Un vendeur doit avoir au moins une spécialité.'
      });
    }

    // Supprimer la spécialité
    const updatedSeller = await Seller.findByIdAndUpdate(
      req.seller._id,
      { $pull: { specialties: { _id: specialtyId } } },
      { new: true }
    );

    console.log(`✅ Spécialité supprimée pour ${updatedSeller.businessName}`);

    res.json({
      message: 'Spécialité supprimée avec succès',
      specialties: updatedSeller.specialties
    });

  } catch (error) {
    console.error('❌ Erreur suppression spécialité:', error);
    res.status(500).json({
      error: 'Erreur lors de la suppression de la spécialité'
    });
  }
});

console.log('✅ Routes seller chargées');

module.exports = router;