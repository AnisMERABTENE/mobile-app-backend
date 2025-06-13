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
   * Upload une photo vers Railway - ✅ CORRIGÉ
   */
  async uploadPhoto(photo, onProgress = null) {
    try {
      console.log('📤 Upload photo vers Railway...');
      console.log('📤 Photo:', {
        name: photo.name,
        type: photo.type,
        size: photo.size
      });

      // 1. Récupérer le token
      const token = await SecureStore.getItemAsync('authToken');
      if (!token) {
        throw new Error('Token d\'authentification requis');
      }

      // 2. Valider la photo
      const validation = this.validatePhoto(photo);
      if (!validation.isValid) {
        throw new Error(`Photo invalide: ${validation.errors.join(', ')}`);
      }

      // 3. Créer le FormData
      const formData = new FormData();
      formData.append('photo', {
        uri: photo.uri,
        type: photo.type || 'image/jpeg',
        name: photo.name || `photo_${Date.now()}.jpg`,
      });

      // 4. URL d'upload Railway
      const uploadUrl = `${this.baseURL}/photos/upload`;
      console.log('📤 Upload vers Railway:', uploadUrl);

      // 5. Upload avec XMLHttpRequest
      const result = await this.uploadWithXHR(uploadUrl, formData, token, onProgress);

      if (result.success) {
        console.log('✅ Photo uploadée sur Railway:', result.data.photoUrl);
        
        // ✅ CORRECTION CRITIQUE : Vérifier que l'URL est complète
        let finalPhotoUrl = result.data.photoUrl;
        
        // Si l'URL n'est pas complète, la construire
        if (!finalPhotoUrl.startsWith('http')) {
          console.warn('⚠️ URL photo incomplète, reconstruction...');
          finalPhotoUrl = `https://res.cloudinary.com/Root/image/upload/${finalPhotoUrl}`;
        }
        
        console.log('🔗 URL finale de la photo:', finalPhotoUrl);
        
        return {
          success: true,
          photoUrl: finalPhotoUrl, // ✅ URL Cloudinary complète
          photoId: result.data.photoId,
        };
      } else {
        console.error('❌ Échec upload Railway:', result.error);
        return {
          success: false,
          error: result.error,
        };
      }

    } catch (error) {
      console.error('❌ Erreur upload Railway:', error);
      return {
        success: false,
        error: 'Impossible d\'uploader vers Railway: ' + error.message,
      };
    }
  }

  /**
   * XMLHttpRequest optimisé pour Railway
   */
  async uploadWithXHR(url, formData, token, onProgress) {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      
      // Configuration pour Railway
      xhr.timeout = 90000; // 90 secondes pour Railway
      
      // Progression
      if (onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = event.loaded / event.total;
            console.log('📊 Progression Railway:', Math.round(progress * 100) + '%');
            onProgress(progress);
          }
        });
      }

      // Succès
      xhr.onload = () => {
        console.log('📥 Réponse Railway:', xhr.status);
        
        try {
          if (xhr.status >= 200 && xhr.status < 300) {
            const responseData = JSON.parse(xhr.responseText);
            console.log('✅ Succès Railway:', responseData);
            
            // ✅ CORRECTION : Logs détaillés de la réponse
            console.log('🔍 Analyse réponse Railway:', {
              photoUrl: responseData.photoUrl,
              photoId: responseData.photoId,
              fileInfo: responseData.fileInfo
            });
            
            resolve({
              success: true,
              data: responseData
            });
          } else {
            const errorData = JSON.parse(xhr.responseText || '{}');
            console.error('❌ Erreur Railway:', xhr.status, errorData);
            resolve({
              success: false,
              error: errorData.error || `Erreur Railway ${xhr.status}`
            });
          }
        } catch (parseError) {
          console.error('❌ Erreur parsing Railway:', parseError);
          resolve({
            success: false,
            error: 'Erreur réponse Railway'
          });
        }
      };

      // Erreur réseau
      xhr.onerror = () => {
        console.error('❌ Erreur réseau Railway');
        resolve({
          success: false,
          error: 'Erreur réseau Railway. Vérifiez votre connexion internet.'
        });
      };

      // Timeout
      xhr.ontimeout = () => {
        console.error('❌ Timeout Railway (90s)');
        resolve({
          success: false,
          error: 'Timeout Railway (90s). Connexion trop lente.'
        });
      };

      // Configuration et envoi
      xhr.open('POST', url);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      
      console.log('🚀 Envoi vers Railway...');
      xhr.send(formData);
    });
  }

  /**
   * Upload multiple vers Railway - ✅ CORRIGÉ
   */
  async uploadMultiplePhotos(photos, onProgress = null) {
    try {
      console.log('📤 Upload multiple vers Railway:', photos.length, 'photos');

      const results = [];
      
      for (let i = 0; i < photos.length; i++) {
        console.log(`📤 Photo ${i + 1}/${photos.length} vers Railway...`);
        
        const result = await this.uploadPhoto(photos[i], (progress) => {
          if (onProgress) {
            const globalProgress = (i + progress) / photos.length;
            onProgress(globalProgress, i, photos.length);
          }
        });
        
        results.push(result);
        
        // Pause entre uploads Railway
        if (i < photos.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      const successfulUploads = results.filter(r => r.success);
      const failedUploads = results.filter(r => !r.success);

      console.log('📊 Résultats Railway:', successfulUploads.length, '/', photos.length);

      // ✅ CORRECTION CRITIQUE : Format des URLs dans la réponse
      const photoUrls = successfulUploads.map(result => ({
        url: result.photoUrl, // ✅ URL Cloudinary complète
        alt: 'Photo de la demande'
      }));

      console.log('🔗 URLs finales retournées:', photoUrls);

      return {
        success: failedUploads.length === 0,
        successfulUploads,
        failedUploads,
        photoUrls, // ✅ Format correct avec URLs complètes
      };

    } catch (error) {
      console.error('❌ Erreur multiple Railway:', error);
      return {
        success: false,
        error: 'Erreur Railway: ' + error.message,
        successfulUploads: [],
        failedUploads: photos.map(photo => ({ photo, error: error.message })),
        photoUrls: [],
      };
    }
  }

  /**
   * Valider une photo - VERSION CORRIGÉE POUR EXPO
   */
  validatePhoto(photo) {
    const errors = [];

    console.log('🔍 Validation photo:', {
      name: photo.name,
      type: photo.type,
      size: photo.size,
      uri: photo.uri?.substring(0, 50) + '...'
    });

    // Taille max 5MB
    if (photo.size && photo.size > 5 * 1024 * 1024) {
      errors.push('Photo trop volumineuse (max 5MB)');
    }

    // ✅ CORRECTION : Types MIME plus permissifs pour Expo
    const allowedTypes = [
      'image/jpeg', 
      'image/jpg', 
      'image/png',
      'image/JPEG',  // Expo peut retourner en majuscules
      'image/JPG',
      'image/PNG'
    ];
    
    // ✅ CORRECTION : Vérifier si le type existe ET s'il est valide
    if (photo.type) {
      if (!allowedTypes.includes(photo.type)) {
        console.warn('⚠️ Type MIME non reconnu:', photo.type);
        
        // ✅ FALLBACK : Vérifier l'extension du fichier
        if (photo.name) {
          const extension = photo.name.toLowerCase().split('.').pop();
          if (!['jpg', 'jpeg', 'png'].includes(extension)) {
            errors.push(`Format non supporté: ${photo.type}. Utilisez JPG ou PNG`);
          } else {
            console.log('✅ Type validé via extension:', extension);
          }
        } else {
          // ✅ Si pas de nom de fichier, accepter quand même (Expo peut être inconsistant)
          console.log('⚠️ Pas de nom de fichier, acceptation par défaut');
        }
      } else {
        console.log('✅ Type MIME valide:', photo.type);
      }
    } else {
      // ✅ CORRECTION : Si pas de type MIME, vérifier l'URI
      if (photo.uri && (photo.uri.includes('.jpg') || photo.uri.includes('.jpeg') || photo.uri.includes('.png'))) {
        console.log('✅ Type validé via URI');
      } else {
        console.log('⚠️ Aucun type MIME, acceptation par défaut (Expo)');
      }
    }

    // URI valide
    if (!photo.uri) {
      errors.push('Photo invalide - pas d\'URI');
    }

    console.log('📋 Résultat validation:', {
      isValid: errors.length === 0,
      errors
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Supprimer une photo sur Railway
   */
  async deletePhoto(photoId) {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      if (!token) {
        throw new Error('Token requis');
      }

      const response = await fetch(`${this.baseURL}/photos/${photoId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        console.log('✅ Photo supprimée de Railway');
        return { success: true };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.error || 'Erreur suppression Railway',
        };
      }

    } catch (error) {
      console.error('❌ Erreur suppression Railway:', error);
      return {
        success: false,
        error: 'Impossible de supprimer sur Railway',
      };
    }
  }

  /**
   * Configuration Railway
   */
  getConfig() {
    return {
      baseURL: this.baseURL,
      maxFileSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['image/jpeg', 'image/jpg', 'image/png'],
      maxPhotos: 5,
      timeout: 90000, // 90 secondes
      platform: 'Railway',
      cloudinaryUrl: 'https://res.cloudinary.com/Root/image/upload/'
    };
  }
}

export default new PhotoUploadService();