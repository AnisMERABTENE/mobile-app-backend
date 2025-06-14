import * as SecureStore from 'expo-secure-store';

/**
 * Service pour l'upload des photos - VERSION RAILWAY ULTRA CORRIGÉE
 */
class PhotoUploadService {
  
  constructor() {
    // ✅ Configuration Railway avec votre vraie URL
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
        const errorText = await response.text();
        console.error('❌ Railway endpoint non accessible:', response.status, errorText);
        return { success: false, error: `Railway inaccessible: ${response.status}` };
      }

    } catch (error) {
      console.error('❌ Erreur test Railway:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Upload une photo vers Railway - ✅ VERSION ULTRA CORRIGÉE
   */
  async uploadPhoto(photo, onProgress = null) {
    try {
      console.log('📤 Upload photo vers Railway...');
      console.log('📤 Photo debug complète:', {
        name: photo.name,
        type: photo.type,
        size: photo.size,
        uri: photo.uri?.substring(0, 80) + '...',
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

      // 3. ✅ CORRECTION CRITIQUE : Créer le FormData correctement
      const formData = new FormData();
      
      // ✅ SUPER IMPORTANT : Format exact pour React Native
      const photoForUpload = {
        uri: photo.uri,
        type: photo.type || 'image/jpeg',
        name: photo.name || `photo_${Date.now()}.jpg`,
      };
      
      console.log('📤 Photo formatée pour FormData:', photoForUpload);
      
      // ✅ CORRECTION : Utiliser exactement 'photo' comme nom de champ
      formData.append('photo', photoForUpload);

      // 4. URL d'upload Railway
      const uploadUrl = `${this.baseURL}/photos/upload`;
      console.log('📤 Upload vers Railway URL:', uploadUrl);

      // 5. ✅ HEADERS CORRIGÉS pour React Native
      const headers = {
        'Authorization': `Bearer ${token}`,
        // ✅ IMPORTANT : Ne pas définir Content-Type pour FormData
        // React Native le gère automatiquement avec la boundary
      };

      console.log('📤 Headers préparés (sans Content-Type)');

      // 6. ✅ UPLOAD AVEC TIMEOUT ET PROGRESS
      if (onProgress) onProgress(0.1);

      const response = await Promise.race([
        fetch(uploadUrl, {
          method: 'POST',
          headers: headers,
          body: formData,
        }),
        // Timeout de 2 minutes pour les gros fichiers
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout 120s')), 120000)
        )
      ]);

      console.log('📥 Réponse Railway reçue:', response.status, response.statusText);

      if (onProgress) onProgress(0.8);

      // 7. ✅ TRAITEMENT RÉPONSE AMÉLIORÉ
      if (response.ok) {
        const responseData = await response.json();
        console.log('✅ Succès Railway:', {
          success: responseData.success,
          hasPhotoUrl: !!responseData.photoUrl,
          photoUrl: responseData.photoUrl?.substring(0, 80) + '...'
        });
        
        if (onProgress) onProgress(1.0);
        
        // ✅ VÉRIFICATION CRITIQUE : S'assurer qu'on a une URL
        if (!responseData.photoUrl) {
          console.error('❌ Pas d\'URL photo dans la réponse Railway:', responseData);
          return {
            success: false,
            error: 'Pas d\'URL de photo retournée par le serveur'
          };
        }
        
        return {
          success: true,
          photoUrl: responseData.photoUrl,
          photoId: responseData.photoId || 'unknown',
          data: responseData
        };
      } else {
        // ✅ GESTION D'ERREUR AMÉLIORÉE
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          const errorText = await response.text();
          errorData = { error: `Erreur HTTP ${response.status}: ${errorText}` };
        }
        
        console.error('❌ Erreur Railway:', response.status, errorData);
        return {
          success: false,
          error: errorData.error || `Erreur Railway ${response.status}: ${response.statusText}`
        };
      }

    } catch (error) {
      console.error('❌ Erreur critique upload Railway:', error);
      console.error('❌ Stack trace:', error.stack);
      
      if (error.message.includes('Timeout')) {
        return {
          success: false,
          error: 'Timeout: L\'upload a pris trop de temps. Connexion trop lente ou fichier trop gros.'
        };
      }
      
      return {
        success: false,
        error: `Erreur critique d'upload: ${error.message}`,
      };
    }
  }

  /**
   * Upload multiple vers Railway - ✅ VERSION CORRIGÉE
   */
  async uploadMultiplePhotos(photos, onProgress = null) {
    try {
      console.log('📤 Upload multiple vers Railway:', photos.length, 'photos');

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
          await new Promise(resolve => setTimeout(resolve, 1000));
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
        .filter(result => result.photoUrl)
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

    // ✅ CORRECTION : Taille max 10MB (cohérent avec le backend)
    if (photo.size && photo.size > 10 * 1024 * 1024) {
      errors.push('Photo trop volumineuse (max 10MB)');
    } else if (photo.size && photo.size < 100) {
      errors.push('Photo trop petite (min 100 bytes)');
    }

    // Types MIME ultra permissifs
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png',
      'image/JPEG', 'image/JPG', 'image/PNG',
      'image/webp', 'image/WEBP'
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
   * ✅ NOUVELLE MÉTHODE : Test complet de l'upload
   */
  async testUploadFlow() {
    try {
      console.log('🧪 Test complet du flow d\'upload...');
      
      // 1. Test de connectivité
      const connectivityTest = await this.testUploadEndpoint();
      if (!connectivityTest.success) {
        return {
          success: false,
          step: 'connectivity',
          error: connectivityTest.error
        };
      }
      
      console.log('✅ Test de connectivité passé');
      
      // 2. Test avec une photo factice (simulation)
      const fakePhoto = {
        uri: 'file://test.jpg',
        type: 'image/jpeg',
        name: 'test.jpg',
        size: 1024
      };
      
      const validation = this.validatePhoto(fakePhoto);
      if (!validation.isValid) {
        return {
          success: false,
          step: 'validation',
          error: 'Validation échouée: ' + validation.errors.join(', ')
        };
      }
      
      console.log('✅ Test de validation passé');
      
      return {
        success: true,
        message: 'Tous les tests sont passés',
        config: this.getConfig()
      };
      
    } catch (error) {
      console.error('❌ Erreur test flow:', error);
      return {
        success: false,
        step: 'unknown',
        error: error.message
      };
    }
  }

  /**
   * Configuration Railway
   */
  getConfig() {
    return {
      baseURL: this.baseURL,
      maxFileSize: 10 * 1024 * 1024, // ✅ CORRECTION : 10MB
      allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
      maxPhotos: 5,
      timeout: 120000, // ✅ CORRECTION : 120 secondes
      platform: 'Railway',
      cloudinaryUrl: 'https://res.cloudinary.com/drch6mjsd/image/upload/'
    };
  }
}

export default new PhotoUploadService();