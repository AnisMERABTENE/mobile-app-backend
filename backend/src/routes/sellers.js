const express = require('express');
const router = express.Router();

// Import des contrôleurs
const {
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
} = require('../controllers/sellerController');

// Import des middlewares
const { authenticateToken } = require('../middleware/auth');

// Import des validations
const {
  validateSellerProfile,
  validateSellerUpdate,
  handleValidationErrors
} = require('../utils/sellerValidation');

console.log('🔄 Chargement des routes sellers...');

// ===================
// ROUTES PUBLIQUES
// ===================

/**
 * @route   GET /api/sellers/ping
 * @desc    Test de l'API sellers
 * @access  Public
 */
router.get('/ping', (req, res) => {
  res.json({ 
    message: 'API Sellers fonctionne !',
    timestamp: new Date().toISOString(),
    availableRoutes: [
      'GET /api/sellers/ping',
      'GET /api/sellers/search',
      'GET /api/sellers/:id',
      'POST /api/sellers/profile (protected)',
      'GET /api/sellers/my/profile (protected)',
      'PUT /api/sellers/my/profile (protected)',
      'DELETE /api/sellers/my/profile (protected)',
      'PATCH /api/sellers/my/availability (protected)',
      'GET /api/sellers/my/stats (protected)',
      'PUT /api/sellers/my/notifications (protected)',
      'GET /api/sellers/recommendations/:requestId (protected)'
    ]
  });
});

/**
 * @route   GET /api/sellers/search
 * @desc    Rechercher des vendeurs par proximité et spécialité
 * @access  Public
 */
router.get('/search', searchSellers);

/**
 * @route   GET /api/sellers/:id
 * @desc    Obtenir un vendeur par ID
 * @access  Public (mais avec auth optionnel pour les stats)
 */
router.get('/:id', authenticateToken, getSellerById);

// ===================
// ROUTES PROTÉGÉES
// ===================

/**
 * @route   POST /api/sellers/profile
 * @desc    Créer un nouveau profil vendeur
 * @access  Private
 */
router.post('/profile', 
  authenticateToken,
  validateSellerProfile,
  handleValidationErrors,
  createSellerProfile
);

/**
 * @route   GET /api/sellers/my/profile
 * @desc    Récupérer mon profil vendeur
 * @access  Private
 */
router.get('/my/profile', authenticateToken, getMySellerProfile);

/**
 * @route   PUT /api/sellers/my/profile
 * @desc    Mettre à jour mon profil vendeur
 * @access  Private
 */
router.put('/my/profile', 
  authenticateToken,
  validateSellerUpdate,
  handleValidationErrors,
  updateSellerProfile
);

/**
 * @route   DELETE /api/sellers/my/profile
 * @desc    Supprimer mon profil vendeur
 * @access  Private
 */
router.delete('/my/profile', authenticateToken, deleteSellerProfile);

/**
 * @route   PATCH /api/sellers/my/availability
 * @desc    Changer mon statut de disponibilité
 * @access  Private
 */
router.patch('/my/availability', authenticateToken, toggleAvailability);

/**
 * @route   GET /api/sellers/my/stats
 * @desc    Récupérer mes statistiques vendeur
 * @access  Private
 */
router.get('/my/stats', authenticateToken, getSellerStats);

/**
 * @route   PUT /api/sellers/my/notifications
 * @desc    Mettre à jour mes paramètres de notification
 * @access  Private
 */
router.put('/my/notifications', authenticateToken, updateNotificationSettings);

/**
 * @route   GET /api/sellers/recommendations/:requestId
 * @desc    Obtenir les vendeurs recommandés pour une demande
 * @access  Private
 */
router.get('/recommendations/:requestId', authenticateToken, getRecommendedSellers);

console.log('✅ Routes sellers chargées');

module.exports = router;