import { useState, useEffect } from 'react';
import { useCategories } from '../context/CategoriesContext';

/**
 * Hook personnalisé pour utiliser les catégories avec cache intelligent
 * @param {Object} options - Options de configuration
 * @param {boolean} options.autoLoad - Charger automatiquement au montage
 * @param {boolean} options.loadSubCategories - Charger aussi les sous-catégories
 * @param {string} options.initialCategory - Catégorie à charger en priorité
 */
export const useCachedCategories = (options = {}) => {
  const {
    autoLoad = true,
    loadSubCategories = false,
    initialCategory = null,
  } = options;

  const {
    categories,
    subCategories,
    loading,
    error,
    isFromCache,
    lastUpdate,
    loadSubCategories: loadSubCategoriesFromContext,
    refreshCategories,
    getCacheStats,
  } = useCategories();

  const [subCategoryLoading, setSubCategoryLoading] = useState(false);
  const [subCategoryError, setSubCategoryError] = useState(null);

  // ✅ AUTO-CHARGEMENT DES SOUS-CATÉGORIES
  useEffect(() => {
    if (loadSubCategories && initialCategory && categories.length > 0) {
      handleLoadSubCategories(initialCategory);
    }
  }, [loadSubCategories, initialCategory, categories.length]);

  /**
   * Charger les sous-catégories d'une catégorie
   */
  const handleLoadSubCategories = async (categoryId) => {
    try {
      setSubCategoryLoading(true);
      setSubCategoryError(null);
      
      const result = await loadSubCategoriesFromContext(categoryId);
      
      if (!result.success) {
        setSubCategoryError(result.error);
      }
    } catch (error) {
      setSubCategoryError('Erreur lors du chargement des sous-catégories');
    } finally {
      setSubCategoryLoading(false);
    }
  };

  /**
   * Obtenir les sous-catégories d'une catégorie spécifique
   */
  const getSubCategoriesForCategory = (categoryId) => {
    return subCategories[categoryId] || [];
  };

  /**
   * Vérifier si une catégorie a ses sous-catégories chargées
   */
  const hasSubCategoriesLoaded = (categoryId) => {
    return !!(subCategories[categoryId] && subCategories[categoryId].length > 0);
  };

  /**
   * Recharger les catégories manuellement
   */
  const handleRefresh = async () => {
    try {
      const result = await refreshCategories();
      return result;
    } catch (error) {
      console.error('❌ Erreur refresh catégories:', error);
      return { success: false, error: error.message };
    }
  };

  /**
   * Charger une catégorie spécifique avec ses sous-catégories
   */
  const loadCategoryWithSubCategories = async (categoryId) => {
    if (!categoryId) return { success: false, error: 'ID de catégorie requis' };
    
    try {
      setSubCategoryLoading(true);
      setSubCategoryError(null);
      
      const result = await loadSubCategoriesFromContext(categoryId);
      
      if (result.success) {
        return {
          success: true,
          subCategories: result.data,
        };
      } else {
        setSubCategoryError(result.error);
        return result;
      }
    } catch (error) {
      const errorMsg = 'Erreur lors du chargement';
      setSubCategoryError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setSubCategoryLoading(false);
    }
  };

  /**
   * Trouver une catégorie par son ID
   */
  const findCategoryById = (categoryId) => {
    return categories.find(cat => cat.id === categoryId) || null;
  };

  /**
   * Trouver une sous-catégorie par ID dans une catégorie
   */
  const findSubCategoryById = (categoryId, subCategoryId) => {
    const categorySubCategories = getSubCategoriesForCategory(categoryId);
    return categorySubCategories.find(sub => sub.id === subCategoryId) || null;
  };

  /**
   * Obtenir le nom complet d'une catégorie/sous-catégorie
   */
  const getFullCategoryName = (categoryId, subCategoryId = null) => {
    const category = findCategoryById(categoryId);
    if (!category) return 'Catégorie inconnue';
    
    if (!subCategoryId) return category.name;
    
    const subCategory = findSubCategoryById(categoryId, subCategoryId);
    if (!subCategory) return category.name;
    
    return `${category.name} > ${subCategory.name}`;
  };

  /**
   * Vérifier si les catégories sont prêtes
   */
  const isReady = categories.length > 0 && !loading;

  /**
   * Obtenir les statistiques complètes
   */
  const getStats = () => {
    const cacheStats = getCacheStats();
    
    return {
      ...cacheStats,
      isReady,
      hasError: !!error,
      subCategoryLoading,
      hasSubCategoryError: !!subCategoryError,
      loadedSubCategories: Object.keys(subCategories).length,
    };
  };

  return {
    // 📊 ÉTAT
    categories,
    loading,
    error,
    isFromCache,
    lastUpdate,
    isReady,
    
    // 🏷️ SOUS-CATÉGORIES
    subCategories,
    subCategoryLoading,
    subCategoryError,
    getSubCategoriesForCategory,
    hasSubCategoriesLoaded,
    
    // 🔄 ACTIONS
    refresh: handleRefresh,
    loadSubCategories: handleLoadSubCategories,
    loadCategoryWithSubCategories,
    
    // 🔍 UTILITAIRES
    findCategoryById,
    findSubCategoryById,
    getFullCategoryName,
    getStats,
  };
};

/**
 * Hook simplifié pour juste les catégories
 */
export const useSimpleCategories = () => {
  const { categories, loading, error, isReady } = useCachedCategories({
    autoLoad: true,
    loadSubCategories: false,
  });

  return {
    categories,
    loading,
    error,
    isReady,
  };
};

/**
 * Hook pour une catégorie spécifique avec ses sous-catégories
 */
export const useCategoryWithSubs = (categoryId) => {
  const {
    categories,
    getSubCategoriesForCategory,
    hasSubCategoriesLoaded,
    loadCategoryWithSubCategories,
    subCategoryLoading,
    subCategoryError,
    findCategoryById,
  } = useCachedCategories({
    autoLoad: true,
    loadSubCategories: true,
    initialCategory: categoryId,
  });

  const category = findCategoryById(categoryId);
  const subCategories = getSubCategoriesForCategory(categoryId);
  const isSubCategoriesLoaded = hasSubCategoriesLoaded(categoryId);

  const loadSubCategories = () => {
    if (categoryId) {
      return loadCategoryWithSubCategories(categoryId);
    }
    return Promise.resolve({ success: false, error: 'Pas de catégorie spécifiée' });
  };

  return {
    category,
    subCategories,
    isSubCategoriesLoaded,
    loading: subCategoryLoading,
    error: subCategoryError,
    loadSubCategories,
  };
};

export default useCachedCategories;