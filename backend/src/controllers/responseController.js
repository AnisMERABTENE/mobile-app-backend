const Response = require('../models/Response');
const Request = require('../models/Request');
const Seller = require('../models/Seller');
const User = require('../models/User');

/**
 * Créer une nouvelle réponse à une demande - VERSION CORRIGÉE POUR PHOTOS
 */
const createResponse = async (req, res) => {
  try {
    const { requestId, message, price, photoUrls = [] } = req.body; // ✅ CORRECTION : photoUrls au lieu de photos

    console.log('📝 Création réponse pour demande:', requestId);
    console.log('👤 Vendeur:', req.user.email);
    console.log('📸 URLs photos reçues:', photoUrls.length, 'photos');

    // 1. Vérifier que la demande existe et est active
    const request = await Request.findById(requestId);
    if (!request) {
      return res.status(404).json({
        error: 'Demande non trouvée'
      });
    }

    if (request.status !== 'active') {
      return res.status(400).json({
        error: 'Cette demande n\'est plus active'
      });
    }

    // 2. Vérifier que l'utilisateur ne répond pas à sa propre demande
    if (request.user.toString() === req.user._id.toString()) {
      return res.status(400).json({
        error: 'Vous ne pouvez pas répondre à votre propre demande'
      });
    }

    // 3. Vérifier que l'utilisateur a un profil vendeur actif
    const seller = await Seller.findOne({ 
      user: req.user._id,
      status: { $in: ['active', 'pending'] }  // ← ACCEPTER AUSSI "pending"
    });

    if (!seller) {
      return res.status(403).json({
        error: 'Vous devez avoir un profil vendeur actif pour répondre aux demandes'
      });
    }

    // 4. Vérifier qu'il n'y a pas déjà une réponse de ce vendeur
    const existingResponse = await Response.findOne({
      request: requestId,
      seller: seller._id
    });

    if (existingResponse) {
      return res.status(400).json({
        error: 'Vous avez déjà répondu à cette demande'
      });
    }

    // 5. Valider les données
    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        error: 'Le message est requis'
      });
    }

    if (!price || price < 0) {
      return res.status(400).json({
        error: 'Le prix doit être un nombre positif'
      });
    }

    // ✅ 6. NOUVELLE SECTION : Valider et formater les photos
    let validatedPhotos = [];
    
    console.log('🔍 Validation des photos de la réponse...');
    console.log('📸 URLs reçues:', JSON.stringify(photoUrls, null, 2));

    if (Array.isArray(photoUrls) && photoUrls.length > 0) {
      for (let i = 0; i < photoUrls.length; i++) {
        const photoUrl = photoUrls[i];
        console.log(`📸 Validation photo ${i + 1}:`, photoUrl);

        // ✅ VÉRIFICATION CRITIQUE : Photo doit avoir une URL valide
        if (!photoUrl || typeof photoUrl !== 'string' || photoUrl.trim() === '') {
          console.warn(`⚠️ Photo ${i + 1} ignorée - URL manquante:`, photoUrl);
          continue;
        }

        // ✅ Vérifier que l'URL est sécurisée et Cloudinary
        if (!photoUrl.startsWith('https://res.cloudinary.com/')) {
          console.warn(`⚠️ Photo ${i + 1} ignorée - URL non Cloudinary:`, photoUrl);
          continue;
        }

        // ✅ FORMATAGE CORRECT POUR MONGODB : respecter le schéma Response
        const validatedPhoto = {
          url: photoUrl.trim(),
          alt: `Photo de la réponse ${i + 1}`
        };

        validatedPhotos.push(validatedPhoto);
        console.log(`✅ Photo ${i + 1} validée:`, validatedPhoto.url.substring(0, 80) + '...');
      }

      console.log('📊 Résultat validation photos réponse:', {
        photosInitiales: photoUrls.length,
        photosValides: validatedPhotos.length,
        photosIgnorees: photoUrls.length - validatedPhotos.length
      });
    } else {
      console.log('ℹ️ Aucune photo à valider pour cette réponse');
    }

    // 6. Créer la réponse avec photos validées
    const responseData = {
      request: requestId,
      seller: seller._id,
      sellerUser: req.user._id,
      message: message.trim(),
      price: parseFloat(price),
      photos: validatedPhotos // ✅ CORRECTION : Utiliser les photos validées au lieu de photos brutes
    };

    const newResponse = new Response(responseData);
    await newResponse.save();

    // 7. Populer les données pour la réponse
    await newResponse.populate([
      {
        path: 'seller',
        select: 'businessName phone location'
      },
      {
        path: 'sellerUser',
        select: 'firstName lastName email avatar'
      },
      {
        path: 'request',
        select: 'title user',
        populate: {
          path: 'user',
          select: 'firstName lastName email'
        }
      }
    ]);

    console.log('✅ Réponse créée avec photos:', newResponse._id);
    console.log('📸 Photos sauvegardées:', newResponse.photos.length);

   // 8. Envoyer notification au client
   try {
    const NotificationService = require('../services/notificationService');
    const notificationResult = await NotificationService.notifyNewResponse(newResponse);
    
    if (notificationResult.success) {
      console.log('✅ Client notifié:', notificationResult.clientNotified);
    } else {
      console.error('⚠️ Erreur notification (non-bloquant):', notificationResult.error);
    }
  } catch (notifError) {
    console.error('⚠️ Erreur notification (non-bloquant):', notifError);
  }

    res.status(201).json({
      message: 'Réponse envoyée avec succès',
      response: newResponse
    });

  } catch (error) {
    console.error('❌ Erreur création réponse:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      console.error('❌ Erreurs de validation MongoDB:', errors); // ✅ AJOUT : Log plus détaillé
      return res.status(400).json({
        error: 'Erreurs de validation',
        details: errors
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        error: 'Vous avez déjà répondu à cette demande'
      });
    }

    res.status(500).json({
      error: 'Erreur lors de la création de la réponse'
    });
  }
};

/**
 * Obtenir toutes les réponses d'une demande
 */
const getResponsesByRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    console.log('🔍 Récupération réponses pour demande:', requestId);

    // 1. Vérifier que la demande existe
    const request = await Request.findById(requestId);
    if (!request) {
      return res.status(404).json({
        error: 'Demande non trouvée'
      });
    }

    // 2. Vérifier que l'utilisateur est le propriétaire de la demande
    if (request.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: 'Vous ne pouvez voir que les réponses à vos propres demandes'
      });
    }

    // 3. Récupérer les réponses
    const responses = await Response.find({ request: requestId })
      .populate('seller', 'businessName phone location isAvailable')
      .populate('sellerUser', 'firstName lastName email avatar')
      .sort({ createdAt: -1 });

    // 4. Marquer les réponses comme lues
    await Response.updateMany(
      { 
        request: requestId,
        isRead: false
      },
      { 
        isRead: true,
        readAt: new Date()
      }
    );

    console.log('✅ Réponses récupérées:', responses.length);

    res.json({
      responses,
      count: responses.length,
      request: {
        id: request._id,
        title: request.title,
        responseCount: request.responseCount
      }
    });

  } catch (error) {
    console.error('❌ Erreur récupération réponses:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des réponses'
    });
  }
};

/**
 * Obtenir toutes mes réponses (vendeur)
 */
const getMyResponses = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    console.log('🔍 Récupération mes réponses pour:', req.user.email);

    // 1. Vérifier que l'utilisateur a un profil vendeur
    const seller = await Seller.findOne({ user: req.user._id });
    if (!seller) {
      return res.status(404).json({
        error: 'Profil vendeur non trouvé'
      });
    }

    // 2. Construire le filtre
    const filter = { seller: seller._id };
    if (status && ['pending', 'accepted', 'declined', 'cancelled'].includes(status)) {
      filter.status = status;
    }

    // 3. Pagination
    const skip = (page - 1) * limit;

    // 4. Récupérer les réponses
    const responses = await Response.find(filter)
      .populate('request', 'title description category location user')
      .populate('request.user', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // 5. Compter le total
    const total = await Response.countDocuments(filter);

    console.log('✅ Mes réponses récupérées:', responses.length);

    res.json({
      responses,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: responses.length,
        totalItems: total
      }
    });

  } catch (error) {
    console.error('❌ Erreur récupération mes réponses:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération de vos réponses'
    });
  }
};

/**
 * Obtenir une réponse par ID
 */
const getResponseById = async (req, res) => {
  try {
    const { id } = req.params;

    const response = await Response.findById(id)
      .populate('seller', 'businessName phone location')
      .populate('sellerUser', 'firstName lastName email avatar')
      .populate('request', 'title description user')
      .populate('request.user', 'firstName lastName email');

    if (!response) {
      return res.status(404).json({
        error: 'Réponse non trouvée'
      });
    }

    // Vérifier les permissions
    const isOwner = response.request.user._id.toString() === req.user._id.toString();
    const isSeller = response.sellerUser._id.toString() === req.user._id.toString();

    if (!isOwner && !isSeller) {
      return res.status(403).json({
        error: 'Accès non autorisé'
      });
    }

    res.json({ response });

  } catch (error) {
    console.error('❌ Erreur récupération réponse:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération de la réponse'
    });
  }
};

/**
 * Mettre à jour le statut d'une réponse (accepter/décliner)
 */
const updateResponseStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, feedback } = req.body;

    console.log('🔄 Mise à jour statut réponse:', id, '→', status);

    // 1. Vérifier le statut
    if (!['accepted', 'declined'].includes(status)) {
      return res.status(400).json({
        error: 'Statut invalide. Doit être "accepted" ou "declined"'
      });
    }

    // 2. Récupérer la réponse
    const response = await Response.findById(id)
      .populate('request', 'user title')
      .populate('sellerUser', 'firstName lastName email');

    if (!response) {
      return res.status(404).json({
        error: 'Réponse non trouvée'
      });
    }

    // 3. Vérifier que l'utilisateur est le propriétaire de la demande
    if (response.request.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: 'Seul le propriétaire de la demande peut accepter/décliner les réponses'
      });
    }

    // 4. Vérifier que la réponse est toujours en attente
    if (response.status !== 'pending') {
      return res.status(400).json({
        error: 'Cette réponse a déjà été traitée'
      });
    }

    // 5. Mettre à jour le statut
    await response.updateStatus(status, feedback);

    console.log('✅ Statut réponse mis à jour:', status);

    // 6. TODO: Envoyer notification au vendeur
    // Cela sera implémenté dans la prochaine étape

    res.json({
      message: `Réponse ${status === 'accepted' ? 'acceptée' : 'déclinée'} avec succès`,
      response
    });

  } catch (error) {
    console.error('❌ Erreur mise à jour statut:', error);
    res.status(500).json({
      error: 'Erreur lors de la mise à jour du statut'
    });
  }
};

/**
 * Supprimer une réponse
 */
const deleteResponse = async (req, res) => {
  try {
    const { id } = req.params;

    const response = await Response.findById(id);

    if (!response) {
      return res.status(404).json({
        error: 'Réponse non trouvée'
      });
    }

    // Vérifier que l'utilisateur est le propriétaire de la réponse
    if (response.sellerUser.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: 'Vous ne pouvez supprimer que vos propres réponses'
      });
    }

    // Supprimer la réponse
    await Response.findByIdAndDelete(id);

    console.log('✅ Réponse supprimée:', id);

    res.json({
      message: 'Réponse supprimée avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur suppression réponse:', error);
    res.status(500).json({
      error: 'Erreur lors de la suppression'
    });
  }
};

module.exports = {
  createResponse,
  getResponsesByRequest,
  getMyResponses,
  getResponseById,
  updateResponseStatus,
  deleteResponse
};