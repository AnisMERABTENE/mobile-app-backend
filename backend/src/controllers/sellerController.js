const Seller = require('../models/Seller');
const User = require('../models/User');
const { validateCategoryAndSubCategory } = require('../config/categories');

/**
 * Créer un nouveau profil vendeur
 */
const createSellerProfile = async (req, res) => {
  try {
    const {
      businessName,
      description,
      phone,
      location,
      serviceRadius,
      specialties
    } = req.body;

    // 1. Vérifier que l'utilisateur n'a pas déjà un profil vendeur
    const existingSeller = await Seller.findOne({ user: req.user._id });
    if (existingSeller) {
      return res.status(400).json({
        error: 'Vous avez déjà un profil vendeur'
      });
    }

    // 2. Valider la géolocalisation
    if (!location || !location.coordinates || location.coordinates.length !== 2) {
      return res.status(400).json({
        error: 'Coordonnées de géolocalisation invalides'
      });
    }

    // 3. Valider le rayon de service
    if (!serviceRadius || serviceRadius < 1 || serviceRadius > 100) {
      return res.status(400).json({
        error: 'Le rayon de service doit être entre 1 et 100 km'
      });
    }

    // 4. Valider les spécialités
    if (!specialties || specialties.length === 0) {
      return res.status(400).json({
        error: 'Au moins une spécialité est requise'
      });
    }

    // Vérifier chaque spécialité
    for (const specialty of specialties) {
      if (!specialty.category || !specialty.subCategories || specialty.subCategories.length === 0) {
        return res.status(400).json({
          error: 'Chaque spécialité doit avoir une catégorie et au moins une sous-catégorie'
        });
      }

      // Valider la catégorie et les sous-catégories
      for (const subCategory of specialty.subCategories) {
        if (!validateCategoryAndSubCategory(specialty.category, subCategory)) {
          return res.status(400).json({
            error: `Catégorie ou sous-catégorie invalide: ${specialty.category} > ${subCategory}`
          });
        }
      }
    }

    // 5. Créer le profil vendeur
    const newSeller = new Seller({
      user: req.user._id,
      businessName: businessName.trim(),
      description: description.trim(),
      phone: phone.trim(),
      location: {
        type: 'Point',
        coordinates: location.coordinates,
        address: location.address,
        city: location.city,
        postalCode: location.postalCode,
        country: location.country || 'France'
      },
      serviceRadius,
      specialties,
      status: 'pending' // En attente de validation
    });

    // 6. Sauvegarder le profil vendeur
    const savedSeller = await newSeller.save();

    // 7. Mettre à jour le rôle de l'utilisateur
    await User.findByIdAndUpdate(req.user._id, { role: 'seller' });

    // 8. Peupler les informations utilisateur pour la réponse
    await savedSeller.populate('user', 'firstName lastName email avatar');

    console.log('✅ Nouveau profil vendeur créé:', savedSeller.businessName, 'par', req.user.email);

    res.status(201).json({
      message: 'Profil vendeur créé avec succès',
      seller: savedSeller
    });

  } catch (error) {
    console.error('❌ Erreur création profil vendeur:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        error: 'Erreurs de validation',
        details: errors
      });
    }

    res.status(500).json({
      error: 'Erreur lors de la création du profil vendeur'
    });
  }
};

/**
 * Récupérer le profil vendeur de l'utilisateur connecté
 */
const getMySellerProfile = async (req, res) => {
  try {
    const seller = await Seller.findOne({ user: req.user._id })
      .populate('user', 'firstName lastName email avatar');

    if (!seller) {
      return res.status(404).json({
        error: 'Aucun profil vendeur trouvé'
      });
    }

    console.log('👤 Profil vendeur récupéré pour:', req.user.email);

    res.json({
      seller
    });

  } catch (error) {
    console.error('❌ Erreur récupération profil vendeur:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération du profil vendeur'
    });
  }
};

/**
 * Mettre à jour le profil vendeur
 */
const updateSellerProfile = async (req, res) => {
  try {
    const updates = req.body;
    
    const seller = await Seller.findOne({ user: req.user._id });

    if (!seller) {
      return res.status(404).json({
        error: 'Aucun profil vendeur trouvé'
      });
    }

    // Valider les spécialités si mises à jour
    if (updates.specialties) {
      if (updates.specialties.length === 0) {
        return res.status(400).json({
          error: 'Au moins une spécialité est requise'
        });
      }

      for (const specialty of updates.specialties) {
        if (!specialty.category || !specialty.subCategories || specialty.subCategories.length === 0) {
          return res.status(400).json({
            error: 'Chaque spécialité doit avoir une catégorie et au moins une sous-catégorie'
          });
        }

        for (const subCategory of specialty.subCategories) {
          if (!validateCategoryAndSubCategory(specialty.category, subCategory)) {
            return res.status(400).json({
              error: `Catégorie ou sous-catégorie invalide: ${specialty.category} > ${subCategory}`
            });
          }
        }
      }
    }

    // Appliquer les mises à jour
    Object.assign(seller, updates);
    const updatedSeller = await seller.save();

    await updatedSeller.populate('user', 'firstName lastName email avatar');

    console.log('✏️ Profil vendeur mis à jour:', updatedSeller.businessName);

    res.json({
      message: 'Profil vendeur mis à jour avec succès',
      seller: updatedSeller
    });

  } catch (error) {
    console.error('❌ Erreur mise à jour profil vendeur:', error);
    res.status(500).json({
      error: 'Erreur lors de la mise à jour du profil vendeur'
    });
  }
};

/**
 * Changer le statut de disponibilité
 */
const toggleAvailability = async (req, res) => {
  try {
    const seller = await Seller.findOne({ user: req.user._id });

    if (!seller) {
      return res.status(404).json({
        error: 'Aucun profil vendeur trouvé'
      });
    }

    seller.isAvailable = !seller.isAvailable;
    seller.lastActiveAt = new Date();
    await seller.save();

    console.log('🔄 Disponibilité vendeur changée:', seller.isAvailable ? 'Disponible' : 'Indisponible');

    res.json({
      message: `Statut changé: ${seller.isAvailable ? 'Disponible' : 'Indisponible'}`,
      isAvailable: seller.isAvailable
    });

  } catch (error) {
    console.error('❌ Erreur changement disponibilité:', error);
    res.status(500).json({
      error: 'Erreur lors du changement de disponibilité'
    });
  }
};

/**
 * Rechercher des vendeurs par proximité et spécialité
 */
const searchSellers = async (req, res) => {
  try {
    const { longitude, latitude, maxDistance = 10, category, subCategory, page = 1, limit = 20 } = req.query;

    // 1. Valider les coordonnées
    if (!longitude || !latitude) {
      return res.status(400).json({
        error: 'Coordonnées de géolocalisation requises'
      });
    }

    // 2. Valider la catégorie
    if (!category) {
      return res.status(400).json({
        error: 'Catégorie requise'
      });
    }

    // 3. Rechercher les vendeurs
    const sellers = await Seller.findNearbyBySpecialty(
      parseFloat(longitude),
      parseFloat(latitude),
      parseInt(maxDistance),
      category,
      subCategory
    );

    // 4. Pagination
    const skip = (page - 1) * limit;
    const paginatedSellers = sellers.slice(skip, skip + parseInt(limit));

    console.log(`🔍 ${sellers.length} vendeurs trouvés pour ${category}${subCategory ? ` > ${subCategory}` : ''} près de [${latitude}, ${longitude}]`);

    res.json({
      sellers: paginatedSellers,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(sellers.length / limit),
        count: paginatedSellers.length,
        totalItems: sellers.length
      },
      searchParams: {
        longitude: parseFloat(longitude),
        latitude: parseFloat(latitude),
        maxDistance: parseInt(maxDistance),
        category,
        subCategory
      }
    });

  } catch (error) {
    console.error('❌ Erreur recherche vendeurs:', error);
    res.status(500).json({
      error: 'Erreur lors de la recherche de vendeurs'
    });
  }
};

/**
 * Récupérer un vendeur par ID
 */
const getSellerById = async (req, res) => {
  try {
    const { id } = req.params;

    const seller = await Seller.findById(id)
      .populate('user', 'firstName lastName email avatar');

    if (!seller) {
      return res.status(404).json({
        error: 'Vendeur non trouvé'
      });
    }

    // Mettre à jour la dernière activité si c'est le profil du vendeur lui-même
    if (seller.user._id.toString() === req.user._id.toString()) {
      await seller.updateActivity();
    }

    console.log('👁️ Profil vendeur consulté:', seller.businessName);

    res.json({
      seller
    });

  } catch (error) {
    console.error('❌ Erreur récupération vendeur:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération du vendeur'
    });
  }
};

/**
 * Récupérer les statistiques du vendeur
 */
const getSellerStats = async (req, res) => {
  try {
    const seller = await Seller.findOne({ user: req.user._id });

    if (!seller) {
      return res.status(404).json({
        error: 'Aucun profil vendeur trouvé'
      });
    }

    // Calculer des statistiques additionnelles
    const stats = {
      ...seller.stats,
      accountAge: Math.floor((new Date() - seller.createdAt) / (1000 * 60 * 60 * 24)), // jours
      isOnline: seller.lastActiveAt && (new Date() - seller.lastActiveAt) < 15 * 60 * 1000,
      responseRate: seller.stats.totalRequests > 0 
        ? Math.round((seller.stats.respondedRequests / seller.stats.totalRequests) * 100)
        : 0
    };

    console.log('📊 Statistiques vendeur récupérées pour:', req.user.email);

    res.json({
      stats
    });

  } catch (error) {
    console.error('❌ Erreur récupération stats vendeur:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des statistiques'
    });
  }
};

/**
 * Supprimer le profil vendeur
 */
const deleteSellerProfile = async (req, res) => {
  try {
    const seller = await Seller.findOne({ user: req.user._id });

    if (!seller) {
      return res.status(404).json({
        error: 'Aucun profil vendeur trouvé'
      });
    }

    await Seller.findByIdAndDelete(seller._id);

    // Remettre le rôle utilisateur à 'user'
    await User.findByIdAndUpdate(req.user._id, { role: 'user' });

    console.log('🗑️ Profil vendeur supprimé pour:', req.user.email);

    res.json({
      message: 'Profil vendeur supprimé avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur suppression profil vendeur:', error);
    res.status(500).json({
      error: 'Erreur lors de la suppression du profil vendeur'
    });
  }
};

/**
 * Récupérer les vendeurs recommandés pour une demande
 */
const getRecommendedSellers = async (req, res) => {
  try {
    const { requestId } = req.params;
    
    // TODO: Implémenter la logique pour récupérer une demande
    // et trouver les vendeurs recommandés basés sur:
    // - La localisation de la demande
    // - La catégorie et sous-catégorie
    // - Les évaluations des vendeurs
    // - Leur disponibilité

    res.json({
      message: 'Fonctionnalité en cours de développement',
      recommendedSellers: []
    });

  } catch (error) {
    console.error('❌ Erreur récupération vendeurs recommandés:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des vendeurs recommandés'
    });
  }
};

/**
 * Mettre à jour les paramètres de notification
 */
const updateNotificationSettings = async (req, res) => {
  try {
    const { notificationSettings } = req.body;

    const seller = await Seller.findOne({ user: req.user._id });

    if (!seller) {
      return res.status(404).json({
        error: 'Aucun profil vendeur trouvé'
      });
    }

    seller.notificationSettings = { ...seller.notificationSettings, ...notificationSettings };
    await seller.save();

    console.log('🔔 Paramètres de notification mis à jour pour:', req.user.email);

    res.json({
      message: 'Paramètres de notification mis à jour',
      notificationSettings: seller.notificationSettings
    });

  } catch (error) {
    console.error('❌ Erreur mise à jour notifications:', error);
    res.status(500).json({
      error: 'Erreur lors de la mise à jour des notifications'
    });
  }
};

module.exports = {
  createSellerProfile,
  getMySellerProfile,
  updateSellerProfile,
  toggleAvailability,
  searchSellers,
  getSellerById,
  getSellerStats,
  deleteSellerProfile,
  getRecommendedSellers,
  updateNotificationSettings
};