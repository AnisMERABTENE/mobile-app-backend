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

// ============================================================
// 🆕 NOUVELLES MÉTHODES POUR L'ÉDITION DU PROFIL VENDEUR
// ============================================================

/**
 * Récupérer le profil du vendeur connecté (pour édition)
 */
const getSellerProfileForEdit = async (req, res) => {
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
    console.error('❌ Erreur récupération profil vendeur pour édition:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération du profil'
    });
  }
};

/**
 * Mettre à jour les informations générales du profil vendeur
 */
const updateSellerGeneralInfo = async (req, res) => {
  try {
    const { businessName, description, phone, location } = req.body;
    
    const seller = await Seller.findOne({ user: req.user._id });
    if (!seller) {
      return res.status(404).json({
        error: 'Profil vendeur non trouvé'
      });
    }

    const updateData = {};

    // Construire l'objet de mise à jour avec seulement les champs fournis
    if (businessName !== undefined) updateData.businessName = businessName.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (phone !== undefined) updateData.phone = phone.trim();
    
    // Gérer la localisation
    if (location) {
      updateData.location = {
        type: 'Point',
        coordinates: location.coordinates || seller.location.coordinates,
        address: location.address || seller.location.address,
        city: location.city || seller.location.city,
        postalCode: location.postalCode || seller.location.postalCode,
        country: location.country || seller.location.country || 'France'
      };
    }

    // Mettre à jour le vendeur
    const updatedSeller = await Seller.findByIdAndUpdate(
      seller._id,
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
};

/**
 * Ajouter une nouvelle spécialité
 */
const addSellerSpecialty = async (req, res) => {
  try {
    const { category, subCategories } = req.body;

    // Vérifier que la catégorie et les sous-catégories sont valides
    for (const subCategory of subCategories) {
      if (!validateCategoryAndSubCategory(category, subCategory)) {
        return res.status(400).json({
          error: `Combinaison catégorie/sous-catégorie invalide: ${category} > ${subCategory}`
        });
      }
    }

    const seller = await Seller.findOne({ user: req.user._id });
    if (!seller) {
      return res.status(404).json({
        error: 'Profil vendeur non trouvé'
      });
    }

    // Vérifier si cette spécialité existe déjà
    const existingSpecialty = seller.specialties.find(spec => spec.category === category);
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
      seller._id,
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
};

/**
 * Modifier une spécialité existante
 */
const updateSellerSpecialty = async (req, res) => {
  try {
    const { specialtyId } = req.params;
    const { category, subCategories } = req.body;

    // Vérifier que la catégorie et les sous-catégories sont valides
    for (const subCategory of subCategories) {
      if (!validateCategoryAndSubCategory(category, subCategory)) {
        return res.status(400).json({
          error: `Combinaison catégorie/sous-catégorie invalide: ${category} > ${subCategory}`
        });
      }
    }

    const seller = await Seller.findOne({ user: req.user._id });
    if (!seller) {
      return res.status(404).json({
        error: 'Profil vendeur non trouvé'
      });
    }

    // Vérifier que la spécialité existe
    const specialtyIndex = seller.specialties.findIndex(spec => spec._id.toString() === specialtyId);
    if (specialtyIndex === -1) {
      return res.status(404).json({
        error: 'Spécialité non trouvée'
      });
    }

    // Mettre à jour la spécialité
    const updatedSeller = await Seller.findOneAndUpdate(
      { 
        _id: seller._id,
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
};

/**
 * Supprimer une spécialité
 */
const removeSellerSpecialty = async (req, res) => {
  try {
    const { specialtyId } = req.params;

    const seller = await Seller.findOne({ user: req.user._id });
    if (!seller) {
      return res.status(404).json({
        error: 'Profil vendeur non trouvé'
      });
    }

    // Vérifier que la spécialité existe
    const specialtyExists = seller.specialties.some(spec => spec._id.toString() === specialtyId);
    if (!specialtyExists) {
      return res.status(404).json({
        error: 'Spécialité non trouvée'
      });
    }

    // Vérifier qu'il restera au moins une spécialité
    if (seller.specialties.length <= 1) {
      return res.status(400).json({
        error: 'Impossible de supprimer la dernière spécialité. Un vendeur doit avoir au moins une spécialité.'
      });
    }

    // Supprimer la spécialité
    const updatedSeller = await Seller.findByIdAndUpdate(
      seller._id,
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
};

// Export de toutes les méthodes
module.exports = {
  // Méthodes existantes
  createSellerProfile,
  getMySellerProfile,
  updateSellerProfile,
  toggleAvailability,
  searchSellers,
  getSellerById,
  getSellerStats,
  deleteSellerProfile,
  getRecommendedSellers,
  updateNotificationSettings,
  
  // Nouvelles méthodes pour l'édition
  getSellerProfileForEdit,
  updateSellerGeneralInfo,
  addSellerSpecialty,
  updateSellerSpecialty,
  removeSellerSpecialty
};