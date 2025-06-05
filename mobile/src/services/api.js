import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

// ✅ CONFIGURATION RAILWAY UNIQUEMENT
const getBaseURL = () => {
  // Toujours utiliser Railway - plus simple et stable
  return 'https://mobile-app-backend-production-5d60.up.railway.app/api';
};

// Créer l'instance axios
const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 30000, // ✅ CORRECTION : Augmenter le timeout à 30 secondes
  headers: {
    'Content-Type': 'application/json',
  },
});

console.log('🔗 API configurée avec baseURL:', getBaseURL());
console.log('🔧 Mode développement:', __DEV__ ? 'OUI' : 'NON');

// Intercepteur pour ajouter automatiquement le token JWT
api.interceptors.request.use(
  async (config) => {
    try {
      // Récupérer le token depuis le stockage sécurisé
      const token = await SecureStore.getItemAsync('authToken');
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('🔑 Token ajouté à la requête');
      }
      
      console.log(`📤 ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
      return config;
    } catch (error) {
      console.error('❌ Erreur lors de l\'ajout du token:', error);
      return config;
    }
  },
  (error) => {
    console.error('❌ Erreur intercepteur request:', error);
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer les réponses et erreurs
api.interceptors.response.use(
  (response) => {
    console.log(`📥 ${response.status} ${response.config.url}`);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    console.error('❌ Erreur API:', error.response?.status, error.response?.data?.error || error.message);
    
    // Si le token est expiré (401) et qu'on n'a pas déjà tenté de le renouveler
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Supprimer le token expiré
        await SecureStore.deleteItemAsync('authToken');
        await SecureStore.deleteItemAsync('userData');
        
        console.log('🔄 Token expiré, redirection vers la connexion nécessaire');
        
        // Ici tu pourrais émettre un événement ou utiliser le contexte
        // pour rediriger vers l'écran de connexion
        
      } catch (storageError) {
        console.error('❌ Erreur lors de la suppression du token:', storageError);
      }
    }
    
    return Promise.reject(error);
  }
);

// Fonctions utilitaires pour les requêtes API
export const apiRequest = {
  // GET request
  get: async (url, config = {}) => {
    try {
      const response = await api.get(url, config);
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  // POST request
  post: async (url, data = {}, config = {}) => {
    try {
      const response = await api.post(url, data, config);
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  // PUT request
  put: async (url, data = {}, config = {}) => {
    try {
      const response = await api.put(url, data, config);
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  // DELETE request
  delete: async (url, config = {}) => {
    try {
      const response = await api.delete(url, config);
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },
};

// Gestionnaire d'erreurs API - AMÉLIORÉ
const handleApiError = (error) => {
  let errorMessage = 'Une erreur est survenue';
  let errorCode = 'UNKNOWN_ERROR';
  
  if (error.response) {
    // Erreur avec réponse du serveur
    errorMessage = error.response.data?.error || error.response.data?.message || errorMessage;
    errorCode = error.response.status.toString();
    
    // Messages d'erreur spécifiques
    switch (error.response.status) {
      case 400:
        errorMessage = error.response.data?.error || 'Données invalides';
        break;
      case 401:
        errorMessage = 'Session expirée, veuillez vous reconnecter';
        errorCode = 'UNAUTHORIZED';
        break;
      case 403:
        errorMessage = 'Accès refusé';
        break;
      case 404:
        errorMessage = 'Ressource non trouvée';
        break;
      case 422:
        errorMessage = error.response.data?.error || 'Erreur de validation';
        break;
      case 500:
        errorMessage = 'Erreur serveur, réessayez plus tard';
        break;
    }
  } else if (error.request) {
    // Erreur réseau
    errorMessage = 'Impossible de contacter le serveur. Vérifiez votre connexion internet.';
    errorCode = 'NETWORK_ERROR';
    
    // ✅ AJOUT : Log détaillé pour debug réseau
    console.error('❌ Détails erreur réseau:', {
      url: error.config?.url,
      baseURL: error.config?.baseURL,
      method: error.config?.method,
      timeout: error.config?.timeout,
      message: error.message
    });
  } else {
    // Autre erreur
    errorMessage = error.message || errorMessage;
  }
  
  console.error('❌ API Error:', { errorMessage, errorCode, originalError: error });
  
  return {
    success: false,
    error: errorMessage,
    errorCode,
    details: error.response?.data
  };
};

// Fonction pour tester la connexion à l'API
export const testApiConnection = async () => {
  try {
    console.log('🧪 Test de connexion à l\'API...');
    console.log('🔗 URL testée:', getBaseURL());
    
    const response = await api.get('/test');
    console.log('✅ Connexion API réussie:', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('❌ Échec du test de connexion API:', error.message);
    return handleApiError(error);
  }
};

// ✅ NOUVELLE FONCTION : Test spécifique pour l'upload
export const testPhotoUploadEndpoint = async () => {
  try {
    console.log('🧪 Test endpoint upload photos...');
    
    // Test simple ping vers l'endpoint photos
    const response = await api.get('/photos/ping');
    console.log('✅ Endpoint photos accessible:', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('❌ Endpoint photos inaccessible:', error.message);
    return handleApiError(error);
  }
};

export default api;