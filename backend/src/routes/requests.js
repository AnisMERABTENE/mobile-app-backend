const express = require('express');
const router = express.Router();

// Import des contrôleurs
const {
  createRequest,
  getMyRequests,
  getRequestById,
  searchRequestsNearby,
  updateRequest,
  deleteRequest,
  markRequestAsCompleted,
  getRequestStats
} = require('../controllers/requestController');

// Import des middlewares
const { authenticateToken } = require('../middleware/auth');

// Import de la configuration des catégories
const { getAllCategories, getSubCategories } = require('../config/categories');

console.log('🔄 Chargement des routes requests...');

// ===================
// ROUTES PUBLIQUES (ou avec auth optionnel)
// ===================

/**
 * @route   GET /api/requests/ping
 * @desc    Test de l'API requests
 * @access  Public
 */
router.get('/ping', (req, res) => {
  res.json({ 
    message: 'API Requests fonctionne !',
    timestamp: new Date().toISOString()
  });
});

/**
 * @route   GET /api/requests/categories
 * @desc    Obtenir toutes les catégories
 * @access  Public
 */
router.get('/categories', (req, res) => {
  try {
    const categories = getAllCategories();
    res.json({
      categories,
      count: categories.length
    });
  } catch (error) {
    console.error('❌ Erreur récupération catégories:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des catégories'
    });
  }
});

/**
 * @route   GET /api/requests/categories/:categoryId/subcategories
 * @desc    Obtenir les sous-catégories d'une catégorie
 * @access  Public
 */
router.get('/categories/:categoryId/subcategories', (req, res) => {
  try {
    const { categoryId } = req.params;
    const subCategories = getSubCategories(categoryId);
    
    if (subCategories.length === 0) {
      return res.status(404).json({
        error: 'Catégorie non trouvée'
      });
    }

    res.json({
      categoryId,
      subCategories,
      count: subCategories.length
    });
  } catch (error) {
    console.error('❌ Erreur récupération sous-catégories:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des sous-catégories'
    });
  }
});

/**
 * @route   GET /api/requests/search
 * @desc    Rechercher des demandes par proximité
 * @access  Public
 */
router.get('/search', searchRequestsNearby);

// ===================
// ROUTES PROTÉGÉES
// ===================

/**
 * @route   POST /api/requests
 * @desc    Créer une nouvelle demande
 * @access  Private
 */
router.post('/', authenticateToken, createRequest);

/**
 * @route   GET /api/requests/my/all
 * @desc    Obtenir toutes les demandes de l'utilisateur connecté
 * @access  Private
 */
router.get('/my/all', authenticateToken, getMyRequests);

/**
 * @route   GET /api/requests/my/stats
 * @desc    Obtenir les statistiques des demandes de l'utilisateur
 * @access  Private
 */
router.get('/my/stats', authenticateToken, getRequestStats);

/**
 * @route   GET /api/requests/:id
 * @desc    Obtenir une demande par ID
 * @access  Private (pour compter les vues correctement)
 */
router.get('/:id', authenticateToken, getRequestById);

/**
 * @route   PUT /api/requests/:id
 * @desc    Mettre à jour une demande
 * @access  Private (propriétaire seulement)
 */
router.put('/:id', authenticateToken, updateRequest);

/**
 * @route   PATCH /api/requests/:id/complete
 * @desc    Marquer une demande comme complétée
 * @access  Private (propriétaire seulement)
 */
router.patch('/:id/complete', authenticateToken, markRequestAsCompleted);

/**
 * @route   DELETE /api/requests/:id
 * @desc    Supprimer une demande
 * @access  Private (propriétaire seulement)
 */
router.delete('/:id', authenticateToken, deleteRequest);

console.log('✅ Routes requests chargées');

module.exports = router;