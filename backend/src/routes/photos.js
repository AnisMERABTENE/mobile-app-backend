const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const router = express.Router();

// Import des middlewares
const { authenticateToken } = require('../middleware/auth');

console.log('🔄 Chargement des routes photos...');

// Configuration du stockage multer
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      // Créer le dossier uploads s'il n'existe pas
      const uploadDir = path.join(__dirname, '../../uploads/photos');
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      console.error('❌ Erreur création dossier:', error);
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Générer un nom unique pour le fichier
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    const extension = path.extname(file.originalname);
    const fileName = `photo_${Date.now()}_${uniqueSuffix}${extension}`;
    cb(null, fileName);
  }
});

// Configuration du filtre de fichiers
const fileFilter = (req, file, cb) => {
  // Types de fichiers autorisés
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Type de fichier non autorisé. Utilisez JPG ou PNG'), false);
  }
};

// Configuration de multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
    files: 5, // 5 fichiers max par requête
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
    message: 'API Photos fonctionne !',
    timestamp: new Date().toISOString(),
    uploadLimits: {
      maxFileSize: '5MB',
      maxFiles: 5,
      allowedTypes: ['image/jpeg', 'image/png']
    }
  });
});

/**
 * @route   GET /api/photos/:filename
 * @desc    Servir une photo
 * @access  Public
 */
router.get('/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Sécurité : vérifier que le nom de fichier est valide
    if (!filename || filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({
        error: 'Nom de fichier invalide'
      });
    }

    const filePath = path.join(__dirname, '../../uploads/photos', filename);
    
    // Vérifier que le fichier existe
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({
        error: 'Photo non trouvée'
      });
    }

    // Déterminer le type de contenu
    const extension = path.extname(filename).toLowerCase();
    let contentType = 'application/octet-stream';
    
    switch (extension) {
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.png':
        contentType = 'image/png';
        break;
    }

    // Servir le fichier
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache 1 an
    res.sendFile(filePath);

  } catch (error) {
    console.error('❌ Erreur service photo:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération de la photo'
    });
  }
});

// ===================
// ROUTES PROTÉGÉES
// ===================

/**
 * @route   POST /api/photos/upload
 * @desc    Upload une photo unique
 * @access  Private
 */
router.post('/upload', authenticateToken, (req, res) => {
  upload.single('photo')(req, res, (err) => {
    if (err) {
      console.error('❌ Erreur upload:', err.message);
      
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
      // Construire l'URL de la photo
      const photoUrl = `${req.protocol}://${req.get('host')}/api/photos/${req.file.filename}`;
      
      console.log('✅ Photo uploadée:', req.file.filename, 'par', req.user.email);

      res.status(201).json({
        message: 'Photo uploadée avec succès',
        photoUrl: photoUrl,
        photoId: req.file.filename,
        fileInfo: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype
        }
      });

    } catch (error) {
      console.error('❌ Erreur traitement upload:', error);
      res.status(500).json({
        error: 'Erreur lors du traitement de l\'upload'
      });
    }
  });
});

/**
 * @route   POST /api/photos/upload-multiple
 * @desc    Upload plusieurs photos
 * @access  Private
 */
router.post('/upload-multiple', authenticateToken, (req, res) => {
  upload.array('photos', 5)(req, res, (err) => {
    if (err) {
      console.error('❌ Erreur upload multiple:', err.message);
      
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
      // Traiter chaque fichier uploadé
      const uploadedPhotos = req.files.map(file => {
        const photoUrl = `${req.protocol}://${req.get('host')}/api/photos/${file.filename}`;
        
        return {
          photoUrl: photoUrl,
          photoId: file.filename,
          fileInfo: {
            filename: file.filename,
            originalName: file.originalname,
            size: file.size,
            mimetype: file.mimetype
          }
        };
      });

      console.log('✅', req.files.length, 'photos uploadées par', req.user.email);

      res.status(201).json({
        message: `${req.files.length} photos uploadées avec succès`,
        photos: uploadedPhotos,
        count: req.files.length
      });

    } catch (error) {
      console.error('❌ Erreur traitement upload multiple:', error);
      res.status(500).json({
        error: 'Erreur lors du traitement de l\'upload'
      });
    }
  });
});

/**
 * @route   DELETE /api/photos/:filename
 * @desc    Supprimer une photo
 * @access  Private
 */
router.delete('/:filename', authenticateToken, async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Sécurité : vérifier le nom de fichier
    if (!filename || filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({
        error: 'Nom de fichier invalide'
      });
    }

    const filePath = path.join(__dirname, '../../uploads/photos', filename);
    
    // Vérifier que le fichier existe
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({
        error: 'Photo non trouvée'
      });
    }

    // Supprimer le fichier
    await fs.unlink(filePath);
    
    console.log('🗑️ Photo supprimée:', filename, 'par', req.user.email);

    res.json({
      message: 'Photo supprimée avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur suppression photo:', error);
    res.status(500).json({
      error: 'Erreur lors de la suppression de la photo'
    });
  }
});

/**
 * @route   GET /api/photos/info/:filename
 * @desc    Obtenir les informations d'une photo
 * @access  Private
 */
router.get('/info/:filename', authenticateToken, async (req, res) => {
  try {
    const { filename } = req.params;
    
    if (!filename || filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({
        error: 'Nom de fichier invalide'
      });
    }

    const filePath = path.join(__dirname, '../../uploads/photos', filename);
    
    // Vérifier que le fichier existe et obtenir ses stats
    try {
      const stats = await fs.stat(filePath);
      
      res.json({
        filename: filename,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        url: `${req.protocol}://${req.get('host')}/api/photos/${filename}`
      });
      
    } catch (error) {
      return res.status(404).json({
        error: 'Photo non trouvée'
      });
    }

  } catch (error) {
    console.error('❌ Erreur info photo:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des informations'
    });
  }
});

console.log('✅ Routes photos chargées');

module.exports = router;