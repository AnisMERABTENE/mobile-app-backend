import * as SecureStore from 'expo-secure-store';

/**
 * Service pour l'upload des photos
 */
class PhotoUploadService {
  
  constructor() {
    this.baseURL = 'https://mobile-app-backend-production-5d60.up.railway.app/api';
    console.log('📤 Photo Upload Service configuré');
  }

  /**
   * Upload une photo unique vers le serveur
   */
  async uploadPhoto(photo, onProgress = null) {
    try {
      console.log('📤 Upload de la photo:', photo.name);

      // Récupérer le token d'authentification
      const token = await SecureStore.getItemAsync('authToken');
      if (!token) {
        throw new Error('Token d\'authentification requis');
      }

      // Créer le FormData pour l'upload
      const formData = new FormData();
      formData.append('photo', {
        uri: photo.uri,
        type: photo.type || 'image/jpeg',
        name: photo.name || `photo_${Date.now()}.jpg`,
      });

      // Options de la requête
      const options = {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      };

      // Effectuer l'upload avec suivi de progression
      const response = await this.fetchWithProgress(
        `${this.baseURL}/photos/upload`,
        options,
        onProgress
      );

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Photo uploadée avec succès:', result.photoUrl);
        
        return {
          success: true,
          photoUrl: result.photoUrl,
          photoId: result.photoId,
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Erreur upload photo:', response.status, errorData);
        
        return {
          success: false,
          error: errorData.error || 'Erreur lors de l\'upload de la photo',
        };
      }

    } catch (error) {
      console.error('❌ Erreur service upload photo:', error);
      return {
        success: false,
        error: 'Impossible d\'uploader la photo',
      };
    }
  }

  /**
   * Upload plusieurs photos en parallèle
   */
  async uploadMultiplePhotos(photos, onProgress = null) {
    try {
      console.log('📤 Upload de', photos.length, 'photos...');

      const uploadPromises = photos.map((photo, index) => 
        this.uploadPhoto(photo, (progress) => {
          if (onProgress) {
            // Calculer la progression globale
            const globalProgress = (index + progress) / photos.length;
            onProgress(globalProgress, index, photos.length);
          }
        })
      );

      const results = await Promise.all(uploadPromises);
      
      // Vérifier les résultats
      const successfulUploads = results.filter(result => result.success);
      const failedUploads = results.filter(result => !result.success);

      console.log('✅ Photos uploadées:', successfulUploads.length, '/', photos.length);

      if (failedUploads.length > 0) {
        console.error('❌ Échecs d\'upload:', failedUploads);
      }

      return {
        success: failedUploads.length === 0,
        successfulUploads,
        failedUploads,
        photoUrls: successfulUploads.map(result => ({
          url: result.photoUrl,
          id: result.photoId,
        })),
      };

    } catch (error) {
      console.error('❌ Erreur upload multiple photos:', error);
      return {
        success: false,
        error: 'Erreur lors de l\'upload des photos',
        successfulUploads: [],
        failedUploads: photos.map(photo => ({ photo, error: error.message })),
        photoUrls: [],
      };
    }
  }

  /**
   * Upload avec suivi de progression
   */
  async fetchWithProgress(url, options, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      // Gestion de la progression
      if (onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = event.loaded / event.total;
            onProgress(progress);
          }
        });
      }

      // Gestion de la réponse
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({
            ok: true,
            status: xhr.status,
            json: () => Promise.resolve(JSON.parse(xhr.responseText)),
          });
        } else {
          resolve({
            ok: false,
            status: xhr.status,
            json: () => Promise.resolve(JSON.parse(xhr.responseText || '{}')),
          });
        }
      };

      xhr.onerror = () => {
        reject(new Error('Erreur réseau lors de l\'upload'));
      };

      xhr.ontimeout = () => {
        reject(new Error('Timeout lors de l\'upload'));
      };

      // Configuration et envoi
      xhr.open(options.method, url);
      
      // Ajouter les headers (sauf Content-Type pour FormData)
      Object.entries(options.headers || {}).forEach(([key, value]) => {
        if (key.toLowerCase() !== 'content-type') {
          xhr.setRequestHeader(key, value);
        }
      });

      xhr.timeout = 60000; // 60 secondes timeout
      xhr.send(options.body);
    });
  }

  /**
   * Redimensionner une image avant upload (optionnel)
   */
  async resizeImage(imageUri, maxWidth = 1024, maxHeight = 1024, quality = 0.8) {
    try {
      // Cette fonction peut être implémentée avec expo-image-manipulator
      // Pour l'instant, on retourne l'URI original
      return imageUri;
    } catch (error) {
      console.error('❌ Erreur redimensionnement:', error);
      return imageUri;
    }
  }

  /**
   * Optimiser les photos avant upload
   */
  async optimizePhotos(photos) {
    try {
      console.log('🔧 Optimisation de', photos.length, 'photos...');
      
      const optimizedPhotos = await Promise.all(
        photos.map(async (photo) => {
          // Redimensionner si nécessaire
          const optimizedUri = await this.resizeImage(photo.uri);
          
          return {
            ...photo,
            uri: optimizedUri,
            optimized: true,
          };
        })
      );

      console.log('✅ Photos optimisées');
      return optimizedPhotos;

    } catch (error) {
      console.error('❌ Erreur optimisation photos:', error);
      return photos; // Retourner les photos originales en cas d'erreur
    }
  }

  /**
   * Supprimer une photo du serveur
   */
  async deletePhoto(photoId) {
    try {
      console.log('🗑️ Suppression de la photo:', photoId);

      const token = await SecureStore.getItemAsync('authToken');
      if (!token) {
        throw new Error('Token d\'authentification requis');
      }

      const response = await fetch(`${this.baseURL}/photos/${photoId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        console.log('✅ Photo supprimée du serveur');
        return { success: true };
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Erreur suppression photo:', errorData);
        return {
          success: false,
          error: errorData.error || 'Erreur lors de la suppression',
        };
      }

    } catch (error) {
      console.error('❌ Erreur service suppression photo:', error);
      return {
        success: false,
        error: 'Impossible de supprimer la photo',
      };
    }
  }

  /**
   * Obtenir l'URL complète d'une photo
   */
  getPhotoUrl(photoPath) {
    if (!photoPath) return null;
    
    // Si c'est déjà une URL complète
    if (photoPath.startsWith('http')) {
      return photoPath;
    }
    
    // Sinon, construire l'URL complète
    return `${this.baseURL}/photos/${photoPath}`;
  }

  /**
   * Valider une photo avant upload
   */
  validatePhoto(photo) {
    const errors = [];

    // Vérifier la taille
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (photo.size && photo.size > maxSize) {
      errors.push('La photo ne peut pas dépasser 5MB');
    }

    // Vérifier le type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (photo.type && !allowedTypes.includes(photo.type.toLowerCase())) {
      errors.push('Format non supporté. Utilisez JPG ou PNG');
    }

    // Vérifier l'URI
    if (!photo.uri) {
      errors.push('Photo invalide');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Obtenir les informations de configuration
   */
  getConfig() {
    return {
      baseURL: this.baseURL,
      maxFileSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['image/jpeg', 'image/jpg', 'image/png'],
      maxPhotos: 5,
      timeout: 60000, // 60 secondes
    };
  }
}

// Exporter une instance unique du service
export default new PhotoUploadService();