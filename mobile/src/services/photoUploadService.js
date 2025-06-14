import * as SecureStore from 'expo-secure-store';

/**
 * Service pour l'upload des photos - VERSION RAILWAY CORRIGÉE
 */
class PhotoUploadService {
  
  constructor() {
    // ✅ Configuration Railway uniquement
    this.baseURL = 'https://mobile-app-backend-production-5d60.up.railway.app/api';
    console.log('📤 Photo Upload Service configuré pour Railway');
    console.log('🔗 Base URL:', this.baseURL);
  }

  /**
   * Test de connectivité à Railway
   */
  async testUploadEndpoint() {
    try {
      console.log('🧪 Test endpoint Railway photos...');
      
      const token = await SecureStore.getItemAsync('authToken');
      if (!token) {
        return { success: false, error: 'Pas de token d\'authentification' };
      }

      const response = await fetch(`${this.baseURL}/photos/ping`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Railway photos endpoint accessible:', data);
        return { success: true, data };
      } else {
        console.error('❌ Railway endpoint non accessible:', response.status);
        return { success: false, error: `Railway inaccessible: ${response.status}` };
      }

    } catch (error) {
      console.error('❌ Erreur test Railway:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Upload une photo vers Railway - ✅ ULTRA CORRIGÉ
   */
  async uploadPhoto(photo, onProgress = null) {
    try {
      console.log('📤 Upload photo vers Railway...');
      console.log('📤 Photo debug complète:', {
        name: photo.name,
        type: photo.type,
        size: photo.size,
        uri: photo.uri?.substring(0, 50) + '...',
        hasUri: !!photo.uri,
        uriType: typeof photo.uri
      });

      // 1. Récupérer le token
      const token = await SecureStore.getItemAsync('authToken');
      if (!token) {
        throw new Error('Token d\'authentification requis pour upload');
      }
      console.log('🔑 Token récupéré pour upload');

      // 2. Valider la photo AVANT upload
      const validation = this.validatePhoto(photo);
      if (!validation.isValid) {
        const errorMsg = `Photo invalide: ${validation.errors.join(', ')}`;
        console.error('❌ Validation échouée:', errorMsg);
        return {
          success: false,
          error: errorMsg
        };
      }
      console.log('✅ Photo validée pour upload');

      // 3. Test de connectivité AVANT upload
      console.log('🧪 Test connectivité Railway...');
      const connectivityTest = await this.testUploadEndpoint();
      if (!connectivityTest.success) {
        console.error('❌ Railway inaccessible:', connectivityTest.error);
        return {
          success: false,
          error: `Service Railway inaccessible: ${connectivityTest.error}`
        };
      }
      console.log('✅ Railway accessible, procédure d\'upload...');

      // 4. Créer le FormData avec vérifications
      const formData = new FormData();
      
      // ✅ CORRECTION CRITIQUE : Format photo pour FormData
      const photoForUpload = {
        uri: photo.uri,
        type: photo.type || 'image/jpeg',
        name: photo.name || `photo_${Date.now()}.jpg`,
      };
      
      console.log('📤 Photo formatée pour FormData:', photoForUpload);
      formData.append('photo', photoForUpload);

      // 5. URL d'upload Railway
      const uploadUrl = `${this.baseURL}/photos/upload`;
      console.log('📤 Upload vers Railway URL:', uploadUrl);

      // 6. Upload avec fetch amélioré
      const result = await this.uploadWithFetch(uploadUrl, formData, token, onProgress);

      // 7. ✅ CORRECTION CRITIQUE : Vérifier le résultat
      if (!result) {
        console.error('❌ Résultat upload undefined !');
        return {
          success: false,
          error: 'Erreur technique: Résultat d\'upload undefined'
        };
      }

      if (result.success) {
        console.log('✅ Photo uploadée sur Railway:', result.data?.photoUrl);
        
        // ✅ CORRECTION CRITIQUE : Vérifier que l'URL est complète
        let finalPhotoUrl = result.data?.photoUrl;
        
        if (!finalPhotoUrl) {
          console.error('❌ Pas d\'URL photo dans la réponse:', result.data);
          return {
            success: false,
            error: 'URL de photo manquante dans la réponse du serveur'
          };
        }
        
        // Si l'URL n'est pas complète, la construire
        if (!finalPhotoUrl.startsWith('http')) {
          console.warn('⚠️ URL photo incomplète, reconstruction...');
          finalPhotoUrl = `https://res.cloudinary.com/Root/image/upload/${finalPhotoUrl}`;
        }
        
        console.log('🔗 URL finale de la photo:', finalPhotoUrl);
        
        return {
          success: true,
          photoUrl: finalPhotoUrl,
          photoId: result.data?.photoId || 'unknown',
        };
      } else {
        console.error('❌ Échec upload Railway:', result.error);
        return {
          success: false,
          error: result.error || 'Erreur d\'upload Railway inconnue',
        };
      }

    } catch (error) {
      console.error('❌ Erreur critique upload Railway:', error);
      console.error('❌ Stack trace:', error.stack);
      return {
        success: false,
        error: `Erreur critique d'upload: ${error.message}`,
      };
    }
  }

  /**
   * ✅ NOUVELLE MÉTHODE : Upload avec fetch() au lieu de XMLHttpRequest
   */
  async uploadWithFetch(url, formData, token, onProgress) {
    try {
      console.log('🚀 Début upload avec fetch...');
      
      // Simuler progression si callback fourni
      if (onProgress) {
        onProgress(0.1); // 10% au début
      }

      const response = await Promise.race([
        fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            // ✅ IMPORTANT : Ne pas définir Content-Type pour FormData
            // fetch() le définira automatiquement avec boundary
          },
          body: formData,
        }),
        // Timeout de 60 secondes
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout 60s')), 60000)
        )
      ]);

      console.log('📥 Réponse fetch reçue:', response.status, response.statusText);

      if (onProgress) {
        onProgress(0.8); // 80% réponse reçue
      }

      if (response.ok) {
        const responseData = await response.json();
        console.log('✅ Succès Railway fetch:', responseData);
        
        if (onProgress) {
          onProgress(1.0); // 100% terminé
        }
        
        return {
          success: true,
          data: responseData
        };
      } else {
        // Tenter de lire l'erreur JSON
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          errorData = { error: `Erreur HTTP ${response.status}` };
        }
        
        console.error('❌ Erreur Railway fetch:', response.status, errorData);
        return {
          success: false,
          error: errorData.error || `Erreur Railway ${response.status}: ${response.statusText}`
        };
      }

    } catch (error) {
      console.error('❌ Erreur fetch upload:', error);
      
      if (error.message.includes('Timeout')) {
        return {
          success: false,
          error: 'Timeout: L\'upload a pris trop de temps (60s). Connexion trop lente.'
        };
      }
      
      return {
        success: false,
        error: `Erreur réseau: ${error.message}`
      };
    }
  }

  /**
   * Upload multiple vers Railway - ✅ ULTRA CORRIGÉ
   */
  async uploadMultiplePhotos(photos, onProgress = null) {
    try {
      console.log('📤 Upload multiple vers Railway:', photos.length, 'photos');

      // ✅ VALIDATION INITIALE
      if (!Array.isArray(photos) || photos.length === 0) {
        console.error('❌ Pas de photos à uploader');
        return {
          success: false,
          error: 'Aucune photo à uploader',
          successfulUploads: [],
          failedUploads: [],
          photoUrls: [],
        };
      }

      const results = [];
      
      for (let i = 0; i < photos.length; i++) {
        console.log(`📤 Photo ${i + 1}/${photos.length} vers Railway...`);
        
        try {
          const result = await this.uploadPhoto(photos[i], (progress) => {
            if (onProgress) {
              const globalProgress = (i + progress) / photos.length;
              onProgress(globalProgress, i, photos.length);
            }
          });
          
          console.log(`📊 Résultat photo ${i + 1}:`, {
            success: result.success,
            error: result.error,
            hasUrl: !!result.photoUrl
          });
          
          results.push(result);
          
        } catch (photoError) {
          console.error(`❌ Erreur critique photo ${i + 1}:`, photoError);
          results.push({
            success: false,
            error: `Erreur photo ${i + 1}: ${photoError.message}`
          });
        }
        
        // Pause entre uploads Railway pour éviter la surcharge
        if (i < photos.length - 1) {
          console.log('⏳ Pause entre uploads...');
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }
      
      const successfulUploads = results.filter(r => r && r.success);
      const failedUploads = results.filter(r => !r || !r.success);

      console.log('📊 Résultats Railway final:', {
        total: photos.length,
        success: successfulUploads.length,
        failed: failedUploads.length
      });

      // ✅ CORRECTION CRITIQUE : Format des URLs dans la réponse
      const photoUrls = successfulUploads
        .filter(result => result.photoUrl) // Filtrer ceux qui ont une URL
        .map(result => ({
          url: result.photoUrl,
          alt: 'Photo de la demande'
        }));

      console.log('🔗 URLs finales retournées:', photoUrls.length);

      return {
        success: failedUploads.length === 0 && successfulUploads.length > 0,
        successfulUploads,
        failedUploads,
        photoUrls,
        error: failedUploads.length > 0 ? `${failedUploads.length} photos ont échoué` : null
      };

    } catch (error) {
      console.error('❌ Erreur critique multiple Railway:', error);
      return {
        success: false,
        error: `Erreur critique: ${error.message}`,
        successfulUploads: [],
        failedUploads: photos.map(photo => ({ photo, error: error.message })),
        photoUrls: [],
      };
    }
  }

  /**
   * Valider une photo - VERSION ULTRA ROBUSTE
   */
  validatePhoto(photo) {
    const errors = [];

    console.log('🔍 Validation photo ultra complète:', {
      name: photo?.name,
      type: photo?.type,
      size: photo?.size,
      uri: photo?.uri?.substring(0, 50) + '...',
      hasAllProps: !!(photo && photo.uri && photo.name),
      isObject: typeof photo === 'object'
    });

    // Vérifier que c'est un objet
    if (!photo || typeof photo !== 'object') {
      errors.push('Photo doit être un objet valide');
      return { isValid: false, errors };
    }

    // URI obligatoire et valide
    if (!photo.uri || typeof photo.uri !== 'string') {
      errors.push('URI de photo manquante ou invalide');
    } else if (!photo.uri.startsWith('file://') && !photo.uri.startsWith('content://')) {
      console.warn('⚠️ URI format inattendu:', photo.uri.substring(0, 30));
      // Accepter quand même d'autres formats
    }

    // Taille max 10MB (plus généreux)
    if (photo.size && photo.size > 10 * 1024 * 1024) {
      errors.push('Photo trop volumineuse (max 10MB)');
    } else if (photo.size && photo.size < 100) {
      errors.push('Photo trop petite (min 100 bytes)');
    }

    // Types MIME ultra permissifs
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png',
      'image/JPEG', 'image/JPG', 'image/PNG', // Majuscules
      'image/webp', 'image/WEBP' // Bonus
    ];
    
    if (photo.type) {
      if (!allowedTypes.includes(photo.type)) {
        // Vérifier l'extension comme fallback
        if (photo.name) {
          const extension = photo.name.toLowerCase().split('.').pop();
          if (!['jpg', 'jpeg', 'png', 'webp'].includes(extension)) {
            errors.push(`Format non supporté: ${photo.type}. Utilisez JPG, PNG ou WebP`);
          } else {
            console.log('✅ Type validé via extension:', extension);
          }
        } else {
          console.log('⚠️ Type MIME non reconnu mais accepté:', photo.type);
        }
      }
    } else {
      console.log('⚠️ Pas de type MIME, validation via nom de fichier...');
      if (photo.name) {
        const extension = photo.name.toLowerCase().split('.').pop();
        if (!['jpg', 'jpeg', 'png', 'webp'].includes(extension)) {
          errors.push('Extension de fichier non supportée');
        }
      } else {
        console.log('⚠️ Ni type MIME ni nom de fichier, acceptation par défaut');
      }
    }

    // Nom de fichier
    if (!photo.name || typeof photo.name !== 'string') {
      console.warn('⚠️ Pas de nom de fichier, génération automatique');
      // Pas d'erreur, on peut générer un nom
    }

    console.log('📋 Résultat validation ultra:', {
      isValid: errors.length === 0,
      errors: errors
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Configuration Railway
   */
  getConfig() {
    return {
      baseURL: this.baseURL,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
      maxPhotos: 5,
      timeout: 60000, // 60 secondes
      platform: 'Railway',
      cloudinaryUrl: 'https://res.cloudinary.com/Root/image/upload/'
    };
  }
}

export default new PhotoUploadService();