const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

console.log('🔄 Configuration Cloudinary...');

// Configuration Cloudinary avec vos vraies clés
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'drch6mjsd', // ✅ CORRECTION : Votre vrai cloud name
  api_key: process.env.CLOUDINARY_API_KEY || '299119212298488',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'iFcP4yyrSgJ3LsOklclis5XYUMg',
});

// ✅ VÉRIFICATION AMÉLIORÉE
console.log('🔍 Vérification config Cloudinary:');
console.log('  - Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME || 'drch6mjsd');
console.log('  - API Key:', process.env.CLOUDINARY_API_KEY ? '✅ Configuré' : '❌ Manquant');
console.log('  - API Secret:', process.env.CLOUDINARY_API_SECRET ? '✅ Configuré' : '❌ Manquant');

// Test de la configuration
const testCloudinaryConnection = async () => {
  try {
    const result = await cloudinary.api.ping();
    console.log('✅ Connexion Cloudinary réussie:', result);
    return true;
  } catch (error) {
    console.error('❌ Erreur connexion Cloudinary:', error.message);
    return false;
  }
};

// Tester la connexion au démarrage
testCloudinaryConnection();

// ✅ CONFIGURATION STORAGE CORRIGÉE
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'mobile-app-photos', // Dossier dans Cloudinary
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'], // ✅ Ajout webp
    public_id: (req, file) => {
      // Nom unique pour chaque photo avec timestamp
      const timestamp = Date.now();
      const random = Math.random().toString(36).substr(2, 9);
      return `photo_${timestamp}_${random}`;
    },
    transformation: [
      { 
        width: 1200, 
        height: 900, 
        crop: 'limit', // ✅ Limite sans déformer
        quality: 'auto:good', // ✅ Qualité optimisée
        fetch_format: 'auto' // ✅ Format automatique
      }
    ],
    // ✅ NOUVEAU : Options de sécurité
    resource_type: 'image',
    type: 'upload',
    access_mode: 'public'
  },
});

// ✅ FONCTION UTILITAIRE : Générer URL complète
const getFullCloudinaryUrl = (publicId) => {
  if (!publicId) return null;
  
  // Si c'est déjà une URL complète
  if (publicId.startsWith('http')) {
    return publicId;
  }
  
  // Construire l'URL complète
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'drch6mjsd';
  return `https://res.cloudinary.com/${cloudName}/image/upload/${publicId}`;
};

// ✅ FONCTION UTILITAIRE : Supprimer une photo
const deleteCloudinaryImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    console.log('🗑️ Photo supprimée de Cloudinary:', publicId, result);
    return result;
  } catch (error) {
    console.error('❌ Erreur suppression Cloudinary:', error);
    throw error;
  }
};

// ✅ FONCTION UTILITAIRE : Obtenir infos d'une photo
const getCloudinaryImageInfo = async (publicId) => {
  try {
    const result = await cloudinary.api.resource(publicId);
    return {
      public_id: result.public_id,
      url: result.secure_url,
      format: result.format,
      width: result.width,
      height: result.height,
      size: result.bytes,
      created: result.created_at
    };
  } catch (error) {
    console.error('❌ Erreur récupération info Cloudinary:', error);
    throw error;
  }
};

module.exports = {
  cloudinary,
  storage,
  getFullCloudinaryUrl,
  deleteCloudinaryImage,
  getCloudinaryImageInfo,
  testCloudinaryConnection
};