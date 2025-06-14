const express = require('express');
const multer = require('multer');
const { cloudinary, storage, getFullCloudinaryUrl } = require('../config/cloudinary');
const router = express.Router();

// Import des middlewares
const { authenticateToken } = require('../middleware/auth');

console.log('🔄 Chargement des routes photos avec Cloudinary...');

// ✅ CONFIGURATION MULTER CORRIGÉE
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // ✅ CORRECTION : 10MB au lieu de 5MB
    files: 5, // 5 fichiers max par requête
  },
  fileFilter: (req, file, cb) => {
    console.log('📁 Fichier reçu:', {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size || 'unknown'
    });

    // ✅ TYPES DE FICHIERS AMÉLIORÉS
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
      'image/JPEG', 'image/JPG', 'image/PNG', 'image/WEBP' // Majuscules
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      console.log('✅ Type de fichier accepté:', file.mimetype);
      cb(null, true);
    } else {
      console.error('❌ Type de fichier rejeté:', file.mimetype);
      cb(new Error(`Type de fichier non autorisé: ${file.mimetype}. Utilisez JPG, PNG ou WebP`), false);
    }
  }
});

// ===================
// ROUTES PUBLIQUES
// ===================

/**
 * @route   GET /api/photos/ping
 * @desc    Test de l'API photos avec vérification Cloudinary
 * @access  Public
 */
router.get('/ping', async (req, res) => {
  try {
    // ✅ NOUVEAU : Test de connexion Cloudinary
    const cloudinaryTest = await cloudinary.api.ping();
    
    res.json({ 
      message: 'API Photos avec Cloudinary fonctionne !',
      timestamp: new Date().toISOString(),
      uploadLimits: {
        maxFileSize: '10MB', // ✅ CORRECTION
        maxFiles: 5,
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
      },
      cloudinary: {
        configured: !!(process.env.CLOUDINARY_CLOUD_NAME),
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        connectionTest: cloudinaryTest.status === 'ok' ? '✅ OK' : '❌ Erreur'
      }
    });
  } catch (error) {
    console.error('❌ Erreur test Cloudinary dans ping:', error);
    res.status(500).json({
      message: 'API Photos partiellement fonctionnelle',
      error: 'Problème de connexion Cloudinary',
      cloudinary: {
        configured: !!(process.env.CLOUDINARY_CLOUD_NAME),
        connectionTest: '❌ Erreur'
      }
    });
  }
});

// ===================
// ROUTES PROTÉGÉES
// ===================

/**
 * @route   POST /api/photos/upload
 * @desc    Upload une photo sur Cloudinary - VERSION ULTRA CORRIGÉE
 * @access  Private
 */
router.post('/upload', authenticateToken, (req, res) => {
  console.log('📤 Début upload photo unique...');
  console.log('👤 Utilisateur:', req.user?.email);
  
  upload.single('photo')(req, res, async (err) => {
    if (err) {
      console.error('❌ Erreur upload multer:', err.message);
      
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            error: 'Fichier trop volumineux (max 10MB)', // ✅ CORRECTION
            details: err.message
          });
        } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({
            error: 'Champ de fichier inattendu. Utilisez "photo"',
            details: err.message
          });
        }
      }
      
      return res.status(400).json({
        error: err.message || 'Erreur lors de l\'upload',
        details: 'Vérifiez le format et la taille du fichier'
      });
    }

    if (!req.file) {
      console.error('❌ Aucun fichier reçu');
      return res.status(400).json({
        error: 'Aucun fichier fourni',
        help: 'Envoyez un fichier avec le champ "photo"'
      });
    }

    try {
      console.log('📁 Fichier uploadé sur Cloudinary:', {
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size,
        format: req.file.format
      });

      // ✅ CORRECTION CRITIQUE : URL Cloudinary complète
      const photoUrl = req.file.path; // C'est déjà l'URL complète de Cloudinary
      const photoId = req.file.filename; // Public ID Cloudinary
      
      console.log('✅ Photo uploadée sur Cloudinary avec succès');
      console.log('🔗 URL Cloudinary:', photoUrl);
      console.log('🆔 ID Cloudinary:', photoId);

      // ✅ VÉRIFICATION DE SÉCURITÉ : S'assurer que l'URL est valide
      if (!photoUrl || !photoUrl.startsWith('https://res.cloudinary.com/')) {
        console.error('❌ URL Cloudinary invalide:', photoUrl);
        return res.status(500).json({
          error: 'URL de photo invalide générée par Cloudinary',
          debug: { photoUrl, photoId }
        });
      }

      res.status(201).json({
        success: true,
        message: 'Photo uploadée avec succès sur Cloudinary',
        photoUrl: photoUrl, // ✅ URL complète Cloudinary
        photoId: photoId,
        fileInfo: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          size: req.file.size,
          format: req.file.format,
          width: req.file.width,
          height: req.file.height,
          cloudinaryUrl: photoUrl
        }
      });

    } catch (error) {
      console.error('❌ Erreur traitement upload Cloudinary:', error);
      res.status(500).json({
        error: 'Erreur lors du traitement de l\'upload',
        details: error.message
      });
    }
  });
});

/**
 * @route   POST /api/photos/upload-multiple
 * @desc    Upload plusieurs photos sur Cloudinary - VERSION CORRIGÉE
 * @access  Private
 */
router.post('/upload-multiple', authenticateToken, (req, res) => {
  console.log('📤 Début upload multiple photos...');
  console.log('👤 Utilisateur:', req.user?.email);
  
  upload.array('photos', 5)(req, res, async (err) => {
    if (err) {
      console.error('❌ Erreur upload multiple multer:', err.message);
      
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            error: 'Un ou plusieurs fichiers sont trop volumineux (max 10MB)', // ✅ CORRECTION
            details: err.message
          });
        } else if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            error: 'Trop de fichiers (max 5)',
            details: err.message
          });
        }
      }
      
      return res.status(400).json({
        error: err.message || 'Erreur lors de l\'upload multiple',
        details: 'Vérifiez le format et la taille des fichiers'
      });
    }

    if (!req.files || req.files.length === 0) {
      console.error('❌ Aucun fichier reçu pour upload multiple');
      return res.status(400).json({
        error: 'Aucun fichier fourni',
        help: 'Envoyez des fichiers avec le champ "photos"'
      });
    }

    try {
      console.log(`📁 ${req.files.length} fichiers reçus pour upload multiple`);

      // ✅ TRAITEMENT AMÉLIORÉ : Chaque fichier uploadé
      const uploadedPhotos = req.files.map((file, index) => {
        const photoUrl = file.path; // URL complète Cloudinary
        const photoId = file.filename; // Public ID Cloudinary
        
        console.log(`📸 Photo ${index + 1}:`, {
          url: photoUrl,
          id: photoId,
          size: file.size
        });

        // ✅ VÉRIFICATION : URL valide
        if (!photoUrl || !photoUrl.startsWith('https://res.cloudinary.com/')) {
          console.warn(`⚠️ URL potentiellement invalide pour photo ${index + 1}:`, photoUrl);
        }
        
        return {
          photoUrl: photoUrl,
          photoId: photoId,
          fileInfo: {
            filename: file.filename,
            originalName: file.originalname,
            size: file.size,
            format: file.format,
            width: file.width,
            height: file.height,
            cloudinaryUrl: photoUrl
          }
        };
      });

      console.log('✅', req.files.length, 'photos uploadées sur Cloudinary avec succès');

      res.status(201).json({
        success: true,
        message: `${req.files.length} photos uploadées avec succès sur Cloudinary`,
        photos: uploadedPhotos,
        count: req.files.length
      });

    } catch (error) {
      console.error('❌ Erreur traitement upload multiple Cloudinary:', error);
      res.status(500).json({
        error: 'Erreur lors du traitement de l\'upload multiple',
        details: error.message
      });
    }
  });
});

/**
 * @route   DELETE /api/photos/:photoId
 * @desc    Supprimer une photo de Cloudinary
 * @access  Private
 */
router.delete('/:photoId', authenticateToken, async (req, res) => {
  try {
    const { photoId } = req.params;
    
    // Sécurité : vérifier le format de l'ID
    if (!photoId || typeof photoId !== 'string') {
      return res.status(400).json({
        error: 'ID de photo invalide'
      });
    }

    console.log('🗑️ Suppression photo Cloudinary:', photoId);
    console.log('👤 Demandé par:', req.user?.email);

    // Supprimer la photo de Cloudinary
    const result = await cloudinary.uploader.destroy(photoId);
    
    if (result.result === 'ok') {
      console.log('✅ Photo supprimée de Cloudinary:', photoId);
      res.json({
        success: true,
        message: 'Photo supprimée avec succès de Cloudinary'
      });
    } else if (result.result === 'not found') {
      console.log('⚠️ Photo non trouvée sur Cloudinary:', photoId);
      res.status(404).json({
        error: 'Photo non trouvée sur Cloudinary'
      });
    } else {
      console.error('❌ Échec suppression Cloudinary:', result);
      res.status(500).json({
        error: 'Échec de la suppression sur Cloudinary',
        details: result
      });
    }

  } catch (error) {
    console.error('❌ Erreur suppression Cloudinary:', error);
    res.status(500).json({
      error: 'Erreur lors de la suppression',
      details: error.message
    });
  }
});

/**
 * @route   GET /api/photos/info/:photoId
 * @desc    Obtenir les informations d'une photo Cloudinary
 * @access  Private
 */
router.get('/info/:photoId', authenticateToken, async (req, res) => {
  try {
    const { photoId } = req.params;
    
    if (!photoId || typeof photoId !== 'string') {
      return res.status(400).json({
        error: 'ID de photo invalide'
      });
    }

    console.log('ℹ️ Récupération info photo:', photoId);

    // Récupérer les infos de la photo depuis Cloudinary
    const result = await cloudinary.api.resource(photoId);
    
    res.json({
      success: true,
      photoId: result.public_id,
      url: result.secure_url,
      format: result.format,
      width: result.width,
      height: result.height,
      size: result.bytes,
      created: result.created_at,
      folder: result.folder || 'mobile-app-photos'
    });
    
  } catch (error) {
    console.error('❌ Erreur info photo Cloudinary:', error);
    
    if (error.error && error.error.http_code === 404) {
      return res.status(404).json({
        error: 'Photo non trouvée sur Cloudinary'
      });
    }
    
    res.status(500).json({
      error: 'Erreur lors de la récupération des informations',
      details: error.message
    });
  }
});

console.log('✅ Routes photos avec Cloudinary chargées');

module.exports = router;