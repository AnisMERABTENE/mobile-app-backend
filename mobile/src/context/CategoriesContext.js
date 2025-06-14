import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RequestService from '../services/requestService';

// Clés de cache
const CACHE_KEYS = {
  CATEGORIES: 'cached_categories',
  LAST_UPDATE: 'categories_last_update',
  VERSION: 'categories_version'
};

// Durée de validité du cache (24 heures)
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24h en millisecondes

// État initial
const initialState = {
  categories: [],
  loading: false,
  error: null,
  lastUpdate: null,
  isFromCache: false,
  needsRefresh: false,
  subCategories: {}, // Cache des sous-catégories par catégorie
};

// Actions
const CATEGORIES_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_CATEGORIES: 'SET_CATEGORIES',
  SET_ERROR: 'SET_ERROR',
  SET_SUBCATEGORIES: 'SET_SUBCATEGORIES',
  SET_FROM_CACHE: 'SET_FROM_CACHE',
  SET_NEEDS_REFRESH: 'SET_NEEDS_REFRESH',
  CLEAR_ERROR: 'CLEAR_ERROR',
};

// Reducer
const categoriesReducer = (state, action) => {
  switch (action.type) {
    case CATEGORIES_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload,
      };
      
    case CATEGORIES_ACTIONS.SET_CATEGORIES:
      return {
        ...state,
        categories: action.payload.categories,
        lastUpdate: action.payload.timestamp,
        loading: false,
        error: null,
        isFromCache: action.payload.fromCache || false,
      };
      
    case CATEGORIES_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false,
      };
      
    case CATEGORIES_ACTIONS.SET_SUBCATEGORIES:
      return {
        ...state,
        subCategories: {
          ...state.subCategories,
          [action.payload.categoryId]: action.payload.subCategories,
        },
      };
      
    case CATEGORIES_ACTIONS.SET_FROM_CACHE:
      return {
        ...state,
        isFromCache: action.payload,
      };
      
    case CATEGORIES_ACTIONS.SET_NEEDS_REFRESH:
      return {
        ...state,
        needsRefresh: action.payload,
      };
      
    case CATEGORIES_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };
      
    default:
      return state;
  }
};

// Créer le Context
const CategoriesContext = createContext({});

// Provider Component
export const CategoriesProvider = ({ children }) => {
  const [state, dispatch] = useReducer(categoriesReducer, initialState);

  // ✅ INITIALISATION AU DÉMARRAGE
  useEffect(() => {
    initializeCategories();
  }, []);

  /**
   * Initialisation intelligente des catégories
   */
  const initializeCategories = async () => {
    try {
      console.log('📂 Initialisation cache catégories...');
      
      // 1. Vérifier le cache local
      const cachedData = await loadFromCache();
      
      if (cachedData.isValid) {
        console.log('✅ Cache valide, utilisation des données en cache');
        dispatch({
          type: CATEGORIES_ACTIONS.SET_CATEGORIES,
          payload: {
            categories: cachedData.categories,
            timestamp: cachedData.timestamp,
            fromCache: true,
          },
        });
        
        // Vérifier en arrière-plan si une mise à jour est nécessaire
        checkForUpdatesInBackground();
      } else {
        console.log('🔄 Cache invalide ou expiré, chargement depuis l\'API...');
        await loadFromAPI(true); // Force load depuis API
      }
      
    } catch (error) {
      console.error('❌ Erreur initialisation catégories:', error);
      dispatch({
        type: CATEGORIES_ACTIONS.SET_ERROR,
        payload: 'Erreur lors du chargement des catégories',
      });
    }
  };

  /**
   * Charger depuis le cache AsyncStorage
   */
  const loadFromCache = async () => {
    try {
      const [categoriesJson, lastUpdateStr] = await Promise.all([
        AsyncStorage.getItem(CACHE_KEYS.CATEGORIES),
        AsyncStorage.getItem(CACHE_KEYS.LAST_UPDATE),
      ]);

      if (!categoriesJson || !lastUpdateStr) {
        console.log('📂 Pas de cache trouvé');
        return { isValid: false };
      }

      const categories = JSON.parse(categoriesJson);
      const lastUpdate = parseInt(lastUpdateStr);
      const now = Date.now();
      const isExpired = (now - lastUpdate) > CACHE_DURATION;

      console.log('📂 Cache trouvé:', {
        categoriesCount: categories.length,
        lastUpdate: new Date(lastUpdate).toLocaleString(),
        isExpired,
        age: Math.round((now - lastUpdate) / (1000 * 60 * 60)) + 'h',
      });

      return {
        isValid: !isExpired && categories.length > 0,
        categories,
        timestamp: lastUpdate,
      };
    } catch (error) {
      console.error('❌ Erreur lecture cache:', error);
      return { isValid: false };
    }
  };

  /**
   * Sauvegarder dans le cache
   */
  const saveToCache = async (categories) => {
    try {
      const timestamp = Date.now();
      
      await Promise.all([
        AsyncStorage.setItem(CACHE_KEYS.CATEGORIES, JSON.stringify(categories)),
        AsyncStorage.setItem(CACHE_KEYS.LAST_UPDATE, timestamp.toString()),
      ]);
      
      console.log('💾 Catégories sauvegardées en cache:', categories.length);
      return true;
    } catch (error) {
      console.error('❌ Erreur sauvegarde cache:', error);
      return false;
    }
  };

  /**
   * Charger depuis l'API
   */
  const loadFromAPI = async (isInitialLoad = false) => {
    try {
      if (!isInitialLoad) {
        dispatch({ type: CATEGORIES_ACTIONS.SET_LOADING, payload: true });
      }
      
      console.log('🌐 Chargement catégories depuis l\'API...');
      const result = await RequestService.getCategories();

      if (result.success) {
        const categories = result.data;
        console.log('✅ Catégories chargées depuis l\'API:', categories.length);

        // Mettre à jour l'état
        dispatch({
          type: CATEGORIES_ACTIONS.SET_CATEGORIES,
          payload: {
            categories,
            timestamp: Date.now(),
            fromCache: false,
          },
        });

        // Sauvegarder en cache
        await saveToCache(categories);
        
        return { success: true, categories };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('❌ Erreur chargement API catégories:', error);
      
      dispatch({
        type: CATEGORIES_ACTIONS.SET_ERROR,
        payload: 'Impossible de charger les catégories',
      });
      
      return { success: false, error: error.message };
    }
  };

  /**
   * Vérification en arrière-plan (silencieuse)
   */
  const checkForUpdatesInBackground = async () => {
    try {
      console.log('🔍 Vérification silencieuse des mises à jour...');
      
      // Faire une requête de test pour voir si l'API est accessible
      const result = await RequestService.getCategories();
      
      if (result.success) {
        const apiCategories = result.data;
        
        // Comparer avec le cache (simple comparaison de longueur)
        if (apiCategories.length !== state.categories.length) {
          console.log('🔄 Mise à jour détectée, actualisation...');
          
          dispatch({
            type: CATEGORIES_ACTIONS.SET_CATEGORIES,
            payload: {
              categories: apiCategories,
              timestamp: Date.now(),
              fromCache: false,
            },
          });
          
          await saveToCache(apiCategories);
        } else {
          console.log('✅ Catégories à jour');
        }
      }
    } catch (error) {
      console.log('ℹ️ Vérification silencieuse échouée (normal si offline):', error.message);
    }
  };

  /**
   * Charger les sous-catégories d'une catégorie
   */
  const loadSubCategories = async (categoryId, forceRefresh = false) => {
    try {
      // Vérifier le cache local d'abord
      if (!forceRefresh && state.subCategories[categoryId]) {
        console.log('✅ Sous-catégories en cache pour:', categoryId);
        return {
          success: true,
          data: state.subCategories[categoryId],
        };
      }

      console.log('🌐 Chargement sous-catégories pour:', categoryId);
      
      const response = await fetch(
        `https://mobile-app-backend-production-5d60.up.railway.app/api/requests/categories/${categoryId}/subcategories`
      );
      
      if (response.ok) {
        const result = await response.json();
        const subCategories = result.subCategories;
        
        // Mettre en cache
        dispatch({
          type: CATEGORIES_ACTIONS.SET_SUBCATEGORIES,
          payload: {
            categoryId,
            subCategories,
          },
        });
        
        console.log('✅ Sous-catégories chargées pour:', categoryId, subCategories.length);
        return { success: true, data: subCategories };
      } else {
        throw new Error(`Erreur API: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Erreur chargement sous-catégories:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  };

  /**
   * Forcer le rechargement
   */
  const refreshCategories = async () => {
    console.log('🔄 Rechargement forcé des catégories...');
    return await loadFromAPI();
  };

  /**
   * Vider le cache
   */
  const clearCache = async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(CACHE_KEYS.CATEGORIES),
        AsyncStorage.removeItem(CACHE_KEYS.LAST_UPDATE),
      ]);
      
      dispatch({
        type: CATEGORIES_ACTIONS.SET_CATEGORIES,
        payload: {
          categories: [],
          timestamp: null,
          fromCache: false,
        },
      });
      
      console.log('🧹 Cache catégories vidé');
      return true;
    } catch (error) {
      console.error('❌ Erreur vidage cache:', error);
      return false;
    }
  };

  /**
   * Obtenir les statistiques du cache
   */
  const getCacheStats = () => {
    const now = Date.now();
    const lastUpdate = state.lastUpdate;
    
    return {
      hasCategories: state.categories.length > 0,
      categoriesCount: state.categories.length,
      isFromCache: state.isFromCache,
      lastUpdate: lastUpdate ? new Date(lastUpdate) : null,
      cacheAge: lastUpdate ? Math.round((now - lastUpdate) / (1000 * 60)) : null, // en minutes
      isExpired: lastUpdate ? (now - lastUpdate) > CACHE_DURATION : true,
      subCategoriesCount: Object.keys(state.subCategories).length,
    };
  };

  // Valeurs du contexte
  const value = {
    // État
    categories: state.categories,
    subCategories: state.subCategories,
    loading: state.loading,
    error: state.error,
    isFromCache: state.isFromCache,
    needsRefresh: state.needsRefresh,
    lastUpdate: state.lastUpdate,
    
    // Actions
    loadSubCategories,
    refreshCategories,
    clearCache,
    getCacheStats,
    
    // Utilitaires
    dispatch,
  };

  return (
    <CategoriesContext.Provider value={value}>
      {children}
    </CategoriesContext.Provider>
  );
};

// Hook pour utiliser le contexte
export const useCategories = () => {
  const context = useContext(CategoriesContext);
  if (!context) {
    throw new Error('useCategories doit être utilisé dans un CategoriesProvider');
  }
  return context;
};

export default CategoriesContext;