import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../styles/colors';

const CategorySelector = ({
  selectedCategory,
  selectedSubCategory,
  onCategorySelect,
  onSubCategorySelect,
  categories = [],
  error,
  style
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [subModalVisible, setSubModalVisible] = useState(false);
  const [subCategories, setSubCategories] = useState([]);
  const [loadingSubCategories, setLoadingSubCategories] = useState(false);

  // Trouver le nom de la catégorie sélectionnée
  const selectedCategoryName = categories.find(cat => cat.id === selectedCategory)?.name || '';
  const selectedSubCategoryName = subCategories.find(sub => sub.id === selectedSubCategory)?.name || '';

  // Charger les sous-catégories quand une catégorie est sélectionnée
  const loadSubCategories = async (categoryId) => {
    try {
      setLoadingSubCategories(true);
      
      const response = await fetch(
        `https://mobile-app-backend-production-5d60.up.railway.app/api/requests/categories/${categoryId}/subcategories`
      );
      
      if (response.ok) {
        const data = await response.json();
        setSubCategories(data.subCategories);
        setSubModalVisible(true);
      } else {
        console.error('Erreur chargement sous-catégories');
      }
    } catch (error) {
      console.error('Erreur réseau sous-catégories:', error);
    } finally {
      setLoadingSubCategories(false);
    }
  };

  const handleCategorySelect = (category) => {
    onCategorySelect(category.id);
    setModalVisible(false);
    
    // Charger les sous-catégories automatiquement
    loadSubCategories(category.id);
  };

  const handleSubCategorySelect = (subCategory) => {
    onSubCategorySelect(subCategory.id);
    setSubModalVisible(false);
  };

  const openSubCategoryModal = () => {
    if (selectedCategory) {
      loadSubCategories(selectedCategory);
    }
  };

  return (
    <View style={[styles.container, style]}>
      {/* Sélecteur de catégorie */}
      <TouchableOpacity
        style={[
          styles.selector,
          error && styles.selectorError,
          selectedCategory && styles.selectorSelected
        ]}
        onPress={() => setModalVisible(true)}
      >
        <View style={styles.selectorContent}>
          <Ionicons 
            name="grid-outline" 
            size={20} 
            color={selectedCategory ? colors.primary : colors.gray[400]} 
          />
          <Text style={[
            styles.selectorText,
            selectedCategory && styles.selectorTextSelected
          ]}>
            {selectedCategoryName || 'Choisir une catégorie'}
          </Text>
        </View>
        <Ionicons 
          name="chevron-down" 
          size={20} 
          color={colors.gray[400]} 
        />
      </TouchableOpacity>

      {/* Sélecteur de sous-catégorie */}
      {selectedCategory && (
        <TouchableOpacity
          style={[
            styles.selector,
            styles.subSelector,
            selectedSubCategory && styles.selectorSelected
          ]}
          onPress={openSubCategoryModal}
          disabled={loadingSubCategories}
        >
          <View style={styles.selectorContent}>
            <Ionicons 
              name="list-outline" 
              size={20} 
              color={selectedSubCategory ? colors.primary : colors.gray[400]} 
            />
            <Text style={[
              styles.selectorText,
              selectedSubCategory && styles.selectorTextSelected
            ]}>
              {loadingSubCategories 
                ? 'Chargement...' 
                : selectedSubCategoryName || 'Choisir une sous-catégorie'
              }
            </Text>
          </View>
          <Ionicons 
            name="chevron-down" 
            size={20} 
            color={colors.gray[400]} 
          />
        </TouchableOpacity>
      )}

      {/* Affichage d'erreur */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Modal de sélection de catégorie */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Choisir une catégorie</Text>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryItem,
                  selectedCategory === category.id && styles.categoryItemSelected
                ]}
                onPress={() => handleCategorySelect(category)}
              >
                <View style={styles.categoryItemContent}>
                  <Ionicons 
                    name={category.icon} 
                    size={24} 
                    color={selectedCategory === category.id ? colors.primary : colors.gray[600]} 
                  />
                  <View style={styles.categoryItemText}>
                    <Text style={[
                      styles.categoryItemTitle,
                      selectedCategory === category.id && styles.categoryItemTitleSelected
                    ]}>
                      {category.name}
                    </Text>
                    <Text style={styles.categoryItemSubtitle}>
                      {category.subCategoriesCount} sous-catégories
                    </Text>
                  </View>
                </View>
                {selectedCategory === category.id && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Modal de sélection de sous-catégorie */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={subModalVisible}
        onRequestClose={() => setSubModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {selectedCategoryName} - Sous-catégorie
            </Text>
            <TouchableOpacity
              onPress={() => setSubModalVisible(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            {subCategories.map((subCategory) => (
              <TouchableOpacity
                key={subCategory.id}
                style={[
                  styles.subCategoryItem,
                  selectedSubCategory === subCategory.id && styles.subCategoryItemSelected
                ]}
                onPress={() => handleSubCategorySelect(subCategory)}
              >
                <Text style={[
                  styles.subCategoryItemText,
                  selectedSubCategory === subCategory.id && styles.subCategoryItemTextSelected
                ]}>
                  {subCategory.name}
                </Text>
                {selectedSubCategory === subCategory.id && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderWidth: 2,
    borderColor: colors.input.border,
    borderRadius: 12,
    backgroundColor: colors.input.background,
  },
  subSelector: {
    marginTop: 12,
  },
  selectorSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  selectorError: {
    borderColor: colors.danger,
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectorText: {
    fontSize: 16,
    color: colors.input.placeholder,
    marginLeft: 12,
  },
  selectorTextSelected: {
    color: colors.text.primary,
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 4,
  },
  errorText: {
    fontSize: 14,
    color: colors.danger,
    marginLeft: 6,
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
    backgroundColor: colors.white,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  categoryItemSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  categoryItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryItemText: {
    marginLeft: 16,
    flex: 1,
  },
  categoryItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: 2,
  },
  categoryItemTitleSelected: {
    color: colors.primary,
  },
  categoryItemSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  subCategoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  subCategoryItemSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  subCategoryItemText: {
    fontSize: 16,
    color: colors.text.primary,
    flex: 1,
  },
  subCategoryItemTextSelected: {
    color: colors.primary,
    fontWeight: '500',
  },
});

export default CategorySelector;