const express = require('express');
const router = express.Router();

// Import des services
const { getConnectionStats } = require('../config/socket');
const NotificationService = require('../services/notificationService');

// Import des middlewares
const { authenticateToken, requireRoles } = require('../middleware/auth');

console.log('🔄 Chargement des routes WebSocket...');

// ===================
// ROUTES DE TEST ET MONITORING
// ===================

/**
 * @route   GET /api/socket/ping
 * @desc    Test de l'API WebSocket
 * @access  Public
 */
router.get('/ping', (req, res) => {
  res.json({
    message: '🔌 API WebSocket fonctionne !',
    timestamp: new Date().toISOString(),
    availableRoutes: [
      'GET /api/socket/ping',
      'GET /api/socket/stats (protected)',
      'POST /api/socket/test-notification (protected)',
      'GET /api/socket/notification-stats (protected)',
      'POST /api/socket/simulate-request (protected, dev only)'
    ]
  });
});

/**
 * @route   GET /api/socket/stats
 * @desc    Statistiques des connexions WebSocket
 * @access  Private
 */
router.get('/stats', authenticateToken, (req, res) => {
  try {
    const stats = getConnectionStats();
    
    res.json({
      success: true,
      stats: {
        ...stats,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        userConnected: req.user.email
      }
    });
  } catch (error) {
    console.error('❌ Erreur stats WebSocket:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des statistiques'
    });
  }
});

/**
 * @route   POST /api/socket/test-notification
 * @desc    Tester l'envoi d'une notification (développement)
 * @access  Private
 */
router.post('/test-notification', authenticateToken, async (req, res) => {
  try {
    const { sendNotificationToUser } = require('../config/socket');
    
    const testData = {
      type: 'test_notification',
      message: 'Ceci est une notification de test',
      data: {
        from: req.user.email,
        timestamp: new Date().toISOString(),
        testId: 'test_' + Date.now()
      }
    };

    const success = sendNotificationToUser(
      req.user._id.toString(),
      'test_notification',
      testData
    );

    res.json({
      success,
      message: success 
        ? 'Notification de test envoyée avec succès' 
        : 'Échec envoi notification (utilisateur peut-être déconnecté)',
      testData
    });

  } catch (error) {
    console.error('❌ Erreur test notification:', error);
    res.status(500).json({
      error: 'Erreur lors du test de notification'
    });
  }
});

/**
 * @route   GET /api/socket/notification-stats
 * @desc    Statistiques des notifications
 * @access  Private
 */
router.get('/notification-stats', authenticateToken, async (req, res) => {
  try {
    const stats = await NotificationService.getNotificationStats();
    
    if (stats) {
      res.json({
        success: true,
        stats
      });
    } else {
      res.status(500).json({
        error: 'Impossible de récupérer les statistiques'
      });
    }

  } catch (error) {
    console.error('❌ Erreur stats notifications:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des statistiques'
    });
  }
});

/**
 * @route   POST /api/socket/simulate-request
 * @desc    Simuler une demande pour tester les notifications (développement)
 * @access  Private
 */
router.post('/simulate-request', authenticateToken, async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        error: 'Route de simulation disponible uniquement en développement'
      });
    }

    const {
      title = 'Demande de test',
      category = 'electronique',
      subCategory = 'smartphones',
      city = 'Paris',
      coordinates = [2.3522, 48.8566], // Paris
      radius = 10
    } = req.body;

    // Créer une fausse demande pour test
    const fakeRequest = {
      _id: 'test_' + Date.now(),
      title,
      description: 'Ceci est une demande de test pour vérifier les notifications',
      category,
      subCategory,
      location: {
        coordinates: coordinates,
        city: city,
        address: `Adresse de test, ${city}`,
        postalCode: '75001',
        country: 'France'
      },
      radius,
      priority: 'medium',
      photos: [],
      user: {
        _id: req.user._id,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        email: req.user.email,
        avatar: req.user.avatar
      },
      createdAt: new Date()
    };

    console.log('🧪 Simulation notification pour demande test:', fakeRequest.title);

    // Envoyer les notifications
    const result = await NotificationService.notifyNewRequest(fakeRequest);

    res.json({
      success: true,
      message: 'Simulation terminée',
      fakeRequest: {
        title: fakeRequest.title,
        category: fakeRequest.category,
        location: fakeRequest.location.city
      },
      notificationResult: result
    });

  } catch (error) {
    console.error('❌ Erreur simulation:', error);
    res.status(500).json({
      error: 'Erreur lors de la simulation'
    });
  }
});

/**
 * @route   POST /api/socket/force-notification
 * @desc    Forcer l'envoi d'une notification à tous les vendeurs connectés (admin)
 * @access  Private (Admin only)
 */
router.post('/force-notification', authenticateToken, requireRoles('admin'), async (req, res) => {
  try {
    const { sendNotificationToSellers } = require('../config/socket');
    const { message, type = 'admin_broadcast' } = req.body;

    if (!message) {
      return res.status(400).json({
        error: 'Message requis pour la notification'
      });
    }

    const notificationData = {
      type,
      message,
      from: 'Administration',
      timestamp: new Date().toISOString(),
      priority: 'high'
    };

    const success = sendNotificationToSellers('admin_notification', notificationData);

    res.json({
      success,
      message: success 
        ? 'Notification diffusée à tous les vendeurs connectés'
        : 'Erreur lors de la diffusion',
      sentData: notificationData
    });

  } catch (error) {
    console.error('❌ Erreur force notification:', error);
    res.status(500).json({
      error: 'Erreur lors de la diffusion'
    });
  }
});

/**
 * @route   GET /api/socket/connected-users
 * @desc    Obtenir la liste des utilisateurs connectés (admin)
 * @access  Private (Admin only)
 */
router.get('/connected-users', authenticateToken, requireRoles('admin'), (req, res) => {
  try {
    const { getSocketIO } = require('../config/socket');
    const io = getSocketIO();
    
    const connectedUsers = [];
    
    io.sockets.sockets.forEach((socket) => {
      if (socket.userEmail) {
        connectedUsers.push({
          id: socket.id,
          email: socket.userEmail,
          role: socket.userRole,
          connectedAt: socket.handshake.time,
          rooms: Array.from(socket.rooms)
        });
      }
    });

    res.json({
      success: true,
      connectedUsers,
      totalConnected: connectedUsers.length,
      stats: getConnectionStats()
    });

  } catch (error) {
    console.error('❌ Erreur liste utilisateurs connectés:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des utilisateurs connectés'
    });
  }
});

console.log('✅ Routes WebSocket chargées');

module.exports = router;