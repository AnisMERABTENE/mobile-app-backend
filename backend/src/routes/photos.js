const express = require('express');
const multer = require('multer');
const { cloudinary, storage } = require('../config/cloudinary');
const router = express.Router();

// Import des middlewares
const { authenticateToken } = require('../middleware/auth');

console.log('🔄 Chargement des routes photos avec Cloudinary...');

// Configuration de multer avec Cloudinary
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
    files: 5, // 5 fichiers max par requête
  },
  fileFilter: (req, file, cb) => {
    // Types de fichiers autorisés
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non autorisé. Utilisez JPG ou PNG'), false);
    }
  }
});

// ===================
// ROUTES PUBLIQUES
// ===================

/**
 * @route   GET /api/photos/ping
 * @desc    Test de l'API photos
 * @access  Public
 */
router.get('/ping', (req, res) => {
  res.json({ 
    message: 'API Photos avec Cloudinary fonctionne !',
    timestamp: new Date().toISOString(),
    uploadLimits: {
      maxFileSize: '5MB',
      maxFiles: 5,
      allowedTypes: ['image/jpeg', 'image/png']
    },
    cloudinary: {
      configured: !!(process.env.CLOUDINARY_CLOUD_NAME),
      cloudName: process.env.CLOUDINARY_CLOUD_NAME
    }
  });
});

// ===================
// ROUTES PROTÉGÉES
// ===================

/**
 * @route   POST /api/photos/upload
 * @desc    Upload une photo sur Cloudinary
 * @access  Private
 */
router.post('/upload', authenticateToken, (req, res) => {
  upload.single('photo')(req, res, (err) => {
    if (err) {
      console.error('❌ Erreur upload Cloudinary:', err.message);
      
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            error: 'Fichier trop volumineux (max 5MB)'
          });
        } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({
            error: 'Champ de fichier inattendu'
          });
        }
      }
      
      return res.status(400).json({
        error: err.message || 'Erreur lors de l\'upload'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: 'Aucun fichier fourni'
      });
    }

    try {
      // Cloudinary retourne directement l'URL de l'image
      const photoUrl = req.file.path; // URL Cloudinary
      const photoId = req.file.filename; // ID Cloudinary
      
      console.log('✅ Photo uploadée sur Cloudinary:', photoId);
      console.log('🔗 URL Cloudinary:', photoUrl);

      res.status(201).json({
        message: 'Photo uploadée avec succès sur Cloudinary',
        photoUrl: photoUrl,
        photoId: photoId,
        fileInfo: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          size: req.file.bytes,
          format: req.file.format,
          width: req.file.width,
          height: req.file.height
        }
      });

    } catch (error) {
      console.error('❌ Erreur traitement upload Cloudinary:', error);
      res.status(500).json({
        error: 'Erreur lors du traitement de l\'upload'
      });
    }
  });
});

/**
 * @route   POST /api/photos/upload-multiple
 * @desc    Upload plusieurs photos sur Cloudinary
 * @access  Private
 */
router.post('/upload-multiple', authenticateToken, (req, res) => {
  upload.array('photos', 5)(req, res, (err) => {
    if (err) {
      console.error('❌ Erreur upload multiple Cloudinary:', err.message);
      
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            error: 'Un ou plusieurs fichiers sont trop volumineux (max 5MB)'
          });
        } else if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            error: 'Trop de fichiers (max 5)'
          });
        }
      }
      
      return res.status(400).json({
        error: err.message || 'Erreur lors de l\'upload'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'Aucun fichier fourni'
      });
    }

    try {
      // Traiter chaque fichier uploadé sur Cloudinary
      const uploadedPhotos = req.files.map(file => {
        const photoUrl = file.path; // URL Cloudinary
        const photoId = file.filename; // ID Cloudinary
        
        return {
          photoUrl: photoUrl,
          photoId: photoId,
          fileInfo: {
            filename: file.filename,
            originalName: file.originalname,
            size: file.bytes,
            format: file.format,
            width: file.width,
            height: file.height
          }
        };
      });

      console.log('✅', req.files.length, 'photos uploadées sur Cloudinary');

      res.status(201).json({
        message: `${req.files.length} photos uploadées avec succès sur Cloudinary`,
        photos: uploadedPhotos,
        count: req.files.length
      });

    } catch (error) {
      console.error('❌ Erreur traitement upload multiple Cloudinary:', error);
      res.status(500).json({
        error: 'Erreur lors du traitement de l\'upload'
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

    // Supprimer la photo de Cloudinary
    const result = await cloudinary.uploader.destroy(photoId);
    
    if (result.result === 'ok') {
      console.log('✅ Photo supprimée de Cloudinary:', photoId);
      res.json({
        message: 'Photo supprimée avec succès de Cloudinary'
      });
    } else {
      console.error('❌ Échec suppression Cloudinary:', result);
      res.status(404).json({
        error: 'Photo non trouvée sur Cloudinary'
      });
    }

  } catch (error) {
    console.error('❌ Erreur suppression Cloudinary:', error);
    res.status(500).json({
      error: 'Erreur lors de la suppression'
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

    // Récupérer les infos de la photo depuis Cloudinary
    const result = await cloudinary.api.resource(photoId);
    
    res.json({
      photoId: result.public_id,
      url: result.secure_url,
      format: result.format,
      width: result.width,
      height: result.height,
      size: result.bytes,
      created: result.created_at
    });
    
  } catch (error) {
    console.error('❌ Erreur info photo Cloudinary:', error);
    
    if (error.error && error.error.http_code === 404) {
      return res.status(404).json({
        error: 'Photo non trouvée sur Cloudinary'
      });
    }
    
    res.status(500).json({
      error: 'Erreur lors de la récupération des informations'
    });
  }
});

console.log('✅ Routes photos avec Cloudinary chargées');

module.exports = router;