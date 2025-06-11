const Request = require('../models/Request');
const { validateCategoryAndSubCategory, getCategoryDisplayName } = require('../config/categories');
const NotificationService = require('../services/notificationService');

/**
 * Créer une nouvelle demande - VERSION AVEC NOTIFICATIONS TEMPS RÉEL
 */
const createRequest = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      subCategory,
      photos,
      location,
      radius,
      priority,
      tags
    } = req.body;

    console.log('📝 Création demande avec notifications temps réel...');
    console.log('👤 Utilisateur:', req.user.email);
    console.log('🏷️ Catégorie:', category, '>', subCategory);
    console.log('📍 Localisation:', location.city);

    // 1. Valider la catégorie et sous-catégorie
    if (!validateCategoryAndSubCategory(category, subCategory)) {
      return res.status(400).json({
        error: 'Catégorie ou sous-catégorie invalide'
      });
    }

    // 2. Valider la géolocalisation
    if (!location || !location.coordinates || location.coordinates.length !== 2) {
      return res.status(400).json({
        error: 'Coordonnées de géolocalisation invalides'
      });
    }

    // 3. Valider le rayon
    if (!radius || radius < 1 || radius > 100) {
      return res.status(400).json({
        error: 'Le rayon doit être entre 1 et 100 km'
      });
    }

    // 4. Créer la demande
    const newRequest = new Request({
      user: req.user._id,
      title: title.trim(),
      description: description.trim(),
      category,
      subCategory,
      photos: photos || [],
      location: {
        type: 'Point',
        coordinates: location.coordinates,
        address: location.address,
        city: location.city,
        postalCode: location.postalCode,
        country: location.country || 'France'
      },
      radius,
      priority: priority || 'medium',
      tags: tags || [],
      status: 'active'
    });

    // 5. Sauvegarder en base
    const savedRequest = await newRequest.save();

    // 6. Peupler les informations utilisateur pour les notifications
    await savedRequest.populate('user', 'firstName lastName email avatar');

    console.log('✅ Demande sauvegardée:', savedRequest.title);

    // 7. NOUVEAU : Envoyer les notifications en temps réel aux vendeurs
    console.log('📢 Démarrage notifications temps réel...');
    
    // Envoyer les notifications en arrière-plan (non bloquant)
    NotificationService.notifyNewRequest(savedRequest)
      .then(result => {
        console.log('📨 Résultat notifications:', result);
        if (result.success) {
          console.log(`✅ ${result.notifiedSellers} vendeurs notifiés pour la demande: ${savedRequest.title}`);
        } else {
          console.error('❌ Erreur notifications:', result.error);
        }
      })
      .catch(error => {
        console.error('❌ Erreur critique notifications:', error);
      });

    // 8. Répondre immédiatement (sans attendre les notifications)
    res.status(201).json({
      message: 'Demande créée avec succès',
      request: savedRequest,
      notifications: {
        status: 'processing',
        message: 'Recherche de vendeurs en cours...'
      }
    });

    console.log('✅ Réponse envoyée au client pour:', savedRequest.title);

  } catch (error) {
    console.error('❌ Erreur création demande:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        error: 'Erreurs de validation',
        details: errors
      });
    }

    res.status(500).json({
      error: 'Erreur lors de la création de la demande'
    });
  }
};

/**
 * Obtenir toutes les demandes de l'utilisateur connecté
 */
const getMyRequests = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    // 1. Construire le filtre
    const filter = { user: req.user._id };
    if (status && ['active', 'completed', 'cancelled', 'expired'].includes(status)) {
      filter.status = status;
    }

    // 2. Pagination
    const skip = (page - 1) * limit;

    // 3. Rechercher les demandes
    const requests = await Request.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('user', 'firstName lastName email avatar');

    // 4. Compter le total
    const total = await Request.countDocuments(filter);

    console.log(`📋 ${requests.length} demandes récupérées pour ${req.user.email}`);

    res.json({
      requests,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: requests.length,
        totalItems: total
      }
    });

  } catch (error) {
    console.error('❌ Erreur récupération demandes:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des demandes'
    });
  }
};

/**
 * Obtenir une demande par ID
 */
const getRequestById = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await Request.findById(id)
      .populate('user', 'firstName lastName email avatar');

    if (!request) {
      return res.status(404).json({
        error: 'Demande non trouvée'
      });
    }

    // Incrémenter le nombre de vues si ce n'est pas le propriétaire
    if (request.user._id.toString() !== req.user._id.toString()) {
      await request.incrementView();
    }

    console.log('👁️ Demande consultée:', request.title);

    res.json({
      request
    });

  } catch (error) {
    console.error('❌ Erreur récupération demande:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération de la demande'
    });
  }
};

/**
 * Rechercher des demandes par proximité
 */
const searchRequestsNearby = async (req, res) => {
  try {
    const { longitude, latitude, maxDistance = 10000, category, page = 1, limit = 20 } = req.query;

    // 1. Valider les coordonnées
    if (!longitude || !latitude) {
      return res.status(400).json({
        error: 'Coordonnées de géolocalisation requises'
      });
    }

    // 2. Construire le filtre
    const filter = {
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: parseInt(maxDistance)
        }
      },
      status: 'active',
      expiresAt: { $gt: new Date() }
    };

    // Filtrer par catégorie si spécifiée
    if (category) {
      filter.category = category;
    }

    // 3. Pagination
    const skip = (page - 1) * limit;

    // 4. Rechercher
    const requests = await Request.find(filter)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('user', 'firstName lastName avatar')
      .sort({ createdAt: -1 });

    const total = await Request.countDocuments(filter);

    console.log(`🗺️ ${requests.length} demandes trouvées près de [${latitude}, ${longitude}]`);

    res.json({
      requests,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: requests.length,
        totalItems: total
      },
      searchParams: {
        longitude: parseFloat(longitude),
        latitude: parseFloat(latitude),
        maxDistance: parseInt(maxDistance),
        category
      }
    });

  } catch (error) {
    console.error('❌ Erreur recherche proximité:', error);
    res.status(500).json({
      error: 'Erreur lors de la recherche'
    });
  }
};

/**
 * Mettre à jour une demande
 */
const updateRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // 1. Trouver la demande
    const request = await Request.findById(id);

    if (!request) {
      return res.status(404).json({
        error: 'Demande non trouvée'
      });
    }

    // 2. Vérifier que l'utilisateur est le propriétaire
    if (request.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: 'Vous ne pouvez modifier que vos propres demandes'
      });
    }

    // 3. Valider les mises à jour si nécessaire
    if (updates.category && updates.subCategory) {
      if (!validateCategoryAndSubCategory(updates.category, updates.subCategory)) {
        return res.status(400).json({
          error: 'Catégorie ou sous-catégorie invalide'
        });
      }
    }

    // 4. Mettre à jour
    Object.assign(request, updates);
    const updatedRequest = await request.save();

    await updatedRequest.populate('user', 'firstName lastName email avatar');

    console.log('✏️ Demande mise à jour:', updatedRequest.title);

    res.json({
      message: 'Demande mise à jour avec succès',
      request: updatedRequest
    });

  } catch (error) {
    console.error('❌ Erreur mise à jour demande:', error);
    res.status(500).json({
      error: 'Erreur lors de la mise à jour'
    });
  }
};

/**
 * Supprimer une demande
 */
const deleteRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await Request.findById(id);

    if (!request) {
      return res.status(404).json({
        error: 'Demande non trouvée'
      });
    }

    // Vérifier que l'utilisateur est le propriétaire
    if (request.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: 'Vous ne pouvez supprimer que vos propres demandes'
      });
    }

    await Request.findByIdAndDelete(id);

    console.log('🗑️ Demande supprimée:', request.title);

    res.json({
      message: 'Demande supprimée avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur suppression demande:', error);
    res.status(500).json({
      error: 'Erreur lors de la suppression'
    });
  }
};

/**
 * Marquer une demande comme complétée
 */
const markRequestAsCompleted = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await Request.findById(id);

    if (!request) {
      return res.status(404).json({
        error: 'Demande non trouvée'
      });
    }

    // Vérifier que l'utilisateur est le propriétaire
    if (request.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: 'Vous ne pouvez modifier que vos propres demandes'
      });
    }

    request.status = 'completed';
    await request.save();

    console.log('✅ Demande marquée comme complétée:', request.title);

    res.json({
      message: 'Demande marquée comme complétée',
      request
    });

  } catch (error) {
    console.error('❌ Erreur completion demande:', error);
    res.status(500).json({
      error: 'Erreur lors de la completion'
    });
  }
};

/**
 * Obtenir les statistiques des demandes de l'utilisateur
 */
const getRequestStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const stats = await Request.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalViews: { $sum: '$viewCount' },
          totalResponses: { $sum: '$responseCount' }
        }
      }
    ]);

    const formattedStats = {
      active: 0,
      completed: 0,
      cancelled: 0,
      expired: 0,
      totalViews: 0,
      totalResponses: 0
    };

    stats.forEach(stat => {
      formattedStats[stat._id] = stat.count;
      formattedStats.totalViews += stat.totalViews;
      formattedStats.totalResponses += stat.totalResponses;
    });

    formattedStats.total = formattedStats.active + formattedStats.completed + 
                          formattedStats.cancelled + formattedStats.expired;

    console.log('📊 Statistiques récupérées pour', req.user.email);

    res.json({
      stats: formattedStats
    });

  } catch (error) {
    console.error('❌ Erreur récupération stats:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des statistiques'
    });
  }
};

module.exports = {
  createRequest,
  getMyRequests,
  getRequestById,
  searchRequestsNearby,
  updateRequest,
  deleteRequest,
  markRequestAsCompleted,
  getRequestStats
};