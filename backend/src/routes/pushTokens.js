// backend/src/routes/pushTokens.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

const { authenticateToken } = require('../middleware/auth');
const Seller = require('../models/Seller');
const User = require('../models/User');
const expoPushService = require('../services/expoPushService');

console.log('🔄 Chargement des routes Push Tokens...');

/**
 * @route   POST /api/push-tokens/register
 * @desc    Enregistrer ou mettre à jour le token push d'un utilisateur
 * @access  Private
 */
router.post('/register', [
  authenticateToken,
  body('expoPushToken')
    .notEmpty()
    .withMessage('Token push requis')
    .custom((token) => {
      if (!expoPushService.isValidExpoPushToken(token)) {
        throw new Error('Token push Expo invalide');
      }
      return true;
    }),
  body('deviceInfo')
    .optional()
    .isObject()
    .withMessage('Les informations du device doivent être un objet')
], async (req, res) => {
  try {
    // Vérifier les erreurs de validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      });
    }

    const { expoPushToken, deviceInfo = {} } = req.body;
    const userId = req.user._id;

    console.log('📱 Enregistrement token push...');
    console.log('👤 Utilisateur:', req.user.email);
    console.log('🎯 Token:', expoPushToken.substring(0, 20) + '...');
    console.log('📱 Device:', deviceInfo.platform || 'inconnu');

    // 1. Mettre à jour le user avec le token
    await User.findByIdAndUpdate(userId, {
      expoPushToken: expoPushToken,
      deviceInfo: {
        platform: deviceInfo.platform,
        model: deviceInfo.model,
        osVersion: deviceInfo.osVersion,
        appVersion: deviceInfo.appVersion,
        lastTokenUpdate: new Date()
      }
    });

    console.log('✅ Token sauvegardé pour utilisateur:', req.user.email);

    // 2. Si l'utilisateur est aussi vendeur, mettre à jour le profil vendeur
    const sellerProfile = await Seller.findOne({ user: userId });
    if (sellerProfile) {
      await Seller.findByIdAndUpdate(sellerProfile._id, {
        expoPushToken: expoPushToken,
        lastTokenUpdate: new Date()
      });
      console.log('✅ Token sauvegardé pour vendeur:', sellerProfile.businessName);
    }

    res.json({
      success: true,
      message: 'Token push enregistré avec succès',
      tokenRegistered: true,
      sellerProfile: !!sellerProfile
    });

  } catch (error) {
    console.error('❌ Erreur enregistrement token push:', error);
    res.status(500).json({
      error: 'Erreur lors de l\'enregistrement du token push'
    });
  }
});

/**
 * @route   DELETE /api/push-tokens/unregister
 * @desc    Supprimer le token push d'un utilisateur (déconnexion)
 * @access  Private
 */
router.delete('/unregister', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;

    console.log('🗑️ Suppression token push pour:', req.user.email);

    // 1. Supprimer du user
    await User.findByIdAndUpdate(userId, {
      $unset: { 
        expoPushToken: "",
        deviceInfo: ""
      }
    });

    // 2. Supprimer du vendeur si il existe
    const sellerProfile = await Seller.findOne({ user: userId });
    if (sellerProfile) {
      await Seller.findByIdAndUpdate(sellerProfile._id, {
        $unset: { 
          expoPushToken: "",
          lastTokenUpdate: ""
        }
      });
      console.log('✅ Token supprimé pour vendeur:', sellerProfile.businessName);
    }

    console.log('✅ Token push supprimé pour:', req.user.email);

    res.json({
      success: true,
      message: 'Token push supprimé avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur suppression token push:', error);
    res.status(500).json({
      error: 'Erreur lors de la suppression du token push'
    });
  }
});

/**
 * @route   GET /api/push-tokens/status
 * @desc    Vérifier le statut du token push d'un utilisateur
 * @access  Private
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;

    // Récupérer les infos utilisateur
    const user = await User.findById(userId).select('expoPushToken deviceInfo');
    const sellerProfile = await Seller.findOne({ user: userId }).select('expoPushToken lastTokenUpdate');

    const hasValidToken = user.expoPushToken && expoPushService.isValidExpoPushToken(user.expoPushToken);

    res.json({
      success: true,
      status: {
        hasToken: !!user.expoPushToken,
        isValidToken: hasValidToken,
        tokenPreview: user.expoPushToken ? user.expoPushToken.substring(0, 20) + '...' : null,
        deviceInfo: user.deviceInfo,
        isSellerProfileLinked: !!sellerProfile,
        lastUpdate: user.deviceInfo?.lastTokenUpdate || sellerProfile?.lastTokenUpdate
      }
    });

  } catch (error) {
    console.error('❌ Erreur statut token push:', error);
    res.status(500).json({
      error: 'Erreur lors de la vérification du statut'
    });
  }
});

/**
 * @route   POST /api/push-tokens/test
 * @desc    Envoyer une notification push de test
 * @access  Private
 */
router.post('/test', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;

    // Récupérer le token de l'utilisateur
    const user = await User.findById(userId).select('expoPushToken');
    
    if (!user.expoPushToken) {
      return res.status(400).json({
        error: 'Aucun token push enregistré pour cet utilisateur'
      });
    }

    if (!expoPushService.isValidExpoPushToken(user.expoPushToken)) {
      return res.status(400).json({
        error: 'Token push invalide'
      });
    }

    console.log('🧪 Test notification push pour:', req.user.email);

    // Envoyer la notification de test
    const result = await expoPushService.sendPushNotification(
      user.expoPushToken,
      '🧪 Test depuis le backend !',
      'Cette notification vient directement du serveur Railway !',
      {
        type: 'backend_test',
        timestamp: new Date().toISOString(),
        from: 'Railway Backend'
      }
    );

    if (result.success) {
      console.log('✅ Test notification envoyée à:', req.user.email);
      res.json({
        success: true,
        message: 'Notification push de test envoyée !',
        result: result
      });
    } else {
      console.log('❌ Échec test notification:', result.error);
      res.status(500).json({
        error: 'Échec envoi notification de test',
        details: result.error
      });
    }

  } catch (error) {
    console.error('❌ Erreur test notification push:', error);
    res.status(500).json({
      error: 'Erreur lors du test de notification'
    });
  }
});

console.log('✅ Routes Push Tokens chargées');

module.exports = router;