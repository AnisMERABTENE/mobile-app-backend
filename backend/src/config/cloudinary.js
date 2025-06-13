const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

console.log('🔄 Configuration Cloudinary...');

// Configuration Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Vérifier la configuration
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error('❌ Variables Cloudinary manquantes dans .env');
} else {
  console.log('✅ Cloudinary configuré pour:', process.env.CLOUDINARY_CLOUD_NAME);
}

// Créer le storage Cloudinary pour multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'mobile-app-photos', // Dossier dans Cloudinary
    allowed_formats: ['jpg', 'jpeg', 'png'],
    public_id: (req, file) => {
      // Nom unique pour chaque photo
      return `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },
    transformation: [
      { width: 800, height: 600, crop: 'limit' }, // Redimensionner automatiquement
      { quality: 'auto' } // Optimisation automatique
    ]
  },
});

module.exports = {
  cloudinary,
  storage
};