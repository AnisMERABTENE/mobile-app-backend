const express = require('express');
const router = express.Router();

// Import des contrôleurs (à créer ensuite)
const {
  createResponse,
  getResponsesByRequest,
  getMyResponses,
  getResponseById,
  updateResponseStatus,
  deleteResponse
} = require('../controllers/responseController');

// Import des middlewares
const { authenticateToken } = require('../middleware/auth');

console.log('🔄 Chargement des routes responses...');

// ===================
// ROUTES DE TEST
// ===================

/**
 * @route   GET /api/responses/ping
 * @desc    Test de l'API responses
 * @access  Public
 */
router.get('/ping', (req, res) => {
  res.json({ 
    message: 'API Responses fonctionne !',
    timestamp: new Date().toISOString()
  });
});

// ===================
// ROUTES PROTÉGÉES
// ===================

/**
 * @route   POST /api/responses
 * @desc    Créer une nouvelle réponse à une demande
 * @access  Private (vendeurs seulement)
 */
router.post('/', authenticateToken, createResponse);

/**
 * @route   GET /api/responses/request/:requestId
 * @desc    Obtenir toutes les réponses d'une demande
 * @access  Private (propriétaire de la demande seulement)
 */
router.get('/request/:requestId', authenticateToken, getResponsesByRequest);

/**
 * @route   GET /api/responses/my
 * @desc    Obtenir toutes mes réponses (vendeur)
 * @access  Private (vendeurs seulement)
 */
router.get('/my', authenticateToken, getMyResponses);

/**
 * @route   GET /api/responses/:id
 * @desc    Obtenir une réponse par ID
 * @access  Private
 */
router.get('/:id', authenticateToken, getResponseById);

/**
 * @route   PATCH /api/responses/:id/status
 * @desc    Mettre à jour le statut d'une réponse (accepter/décliner)
 * @access  Private (propriétaire de la demande seulement)
 */
router.patch('/:id/status', authenticateToken, updateResponseStatus);

/**
 * @route   DELETE /api/responses/:id
 * @desc    Supprimer une réponse
 * @access  Private (propriétaire de la réponse seulement)
 */
router.delete('/:id', authenticateToken, deleteResponse);

console.log('✅ Routes responses chargées');

module.exports = router;