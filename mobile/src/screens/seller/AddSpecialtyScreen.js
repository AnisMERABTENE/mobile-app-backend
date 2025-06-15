import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useCachedCategories } from '../../hooks/useCachedCategories';
import sellerService from '../../services/sellerService';
import Loading from '../../components/Loading';
import Button from '../../components/Button';
import colors, { getGradientString } from '../../styles/colors';

const AddSpecialtyScreen = ({ navigation, route }) => {
  // Récupérer une spécialité existante si on édite
  const { specialty: existingSpecialty } = route?.params || {};
  const isEditing = !!existingSpecialty;
  
  // Hook pour les catégories avec cache intelligent
  const {
    categories,
    loading: categoriesLoading,
    error: categoriesError,
    isReady,
    getSubCategoriesForCategory,
    loadSubCategories,
    refresh: refreshCategories,
  } = useCachedCategories({
    autoLoad: true,
    loadSubCategories: false,
  });

  // États
  const [saving, setSaving] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(
    isEditing ? existingSpecialty.category : ''
  );
  const [availableSubCategories, setAvailableSubCategories] = useState([]);
  const [selectedSubCategories, setSelectedSubCategories] = useState(
    isEditing ? existingSpecialty.subCategories || [] : []
  );
  const [loadingSubCategories, setLoadingSubCategories] = useState(false);

  // ============================================================
  // 🔄 GESTION DES SOUS-CATÉGORIES
  // ============================================================

  useEffect(() => {
    if (selectedCategory && isReady) {
      loadSubCategoriesForCategory(selectedCategory);
    } else {
      setAvailableSubCategories([]);
      if (!isEditing) {
        setSelectedSubCategories([]);
      }
    }
  }, [selectedCategory, isReady]);

  const loadSubCategoriesForCategory = async (categoryId) => {
    try {
      setLoadingSubCategories(true);
      console.log('🏷️ Chargement sous-catégories pour:', categoryId);
      
      // D'abord vérifier le cache
      const cachedSubCategories = getSubCategoriesForCategory(categoryId);
      
      if (cachedSubCategories.length > 0) {
        console.log('✅ Sous-catégories trouvées en cache:', cachedSubCategories.length);
        setAvailableSubCategories(cachedSubCategories);
        return;
      }
      
      // Sinon charger depuis l'API
      console.log('🌐 Chargement depuis API...');
      await loadSubCategories(categoryId);
      
      // Récupérer depuis le cache après chargement
      const newSubCategories = getSubCategoriesForCategory(categoryId);
      setAvailableSubCategories(newSubCategories);
      
    } catch (error) {
      console.error('❌ Erreur chargement sous-catégories:', error);
      Alert.alert('Erreur', 'Impossible de charger les sous-catégories');
    } finally {
      setLoadingSubCategories(false);
    }
  };

  // ============================================================
  // 🎯 SÉLECTION DES CATÉGORIES
  // ============================================================

  const handleCategorySelect = (categoryId) => {
    if (selectedCategory === categoryId) {
      // Désélectionner
      setSelectedCategory('');
      setSelectedSubCategories([]);
      setAvailableSubCategories([]);
    } else {
      // Sélectionner nouvelle catégorie
      setSelectedCategory(categoryId);
      // Les sous-catégories se chargeront via useEffect
      if (!isEditing) {
        setSelectedSubCategories([]);
      }
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSubCategoryToggle = (subCategoryId) => {
    setSelectedSubCategories(prev => {
      if (prev.includes(subCategoryId)) {
        // Retirer la sous-catégorie
        return prev.filter(id => id !== subCategoryId);
      } else {
        // Ajouter la sous-catégorie
        return [...prev, subCategoryId];
      }
    });
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // ============================================================
  // 💾 SAUVEGARDE
  // ============================================================

  const validateSelection = () => {
    if (!selectedCategory) {
      Alert.alert('Erreur', 'Veuillez sélectionner une catégorie');
      return false;
    }
    
    if (selectedSubCategories.length === 0) {
      Alert.alert('Erreur', 'Veuillez sélectionner au moins une sous-catégorie');
      return false;
    }
    
    return true;
  };

  const handleSave = async () => {
    if (!validateSelection()) {
      return;
    }
    
    try {
      setSaving(true);
      console.log(`💾 ${isEditing ? 'Modification' : 'Ajout'} spécialité...`);
      
      const specialtyData = {
        category: selectedCategory,
        subCategories: selectedSubCategories,
      };
      
      let result;
      if (isEditing) {
        result = await sellerService.updateSpecialty(existingSpecialty._id, specialtyData);
      } else {
        result = await sellerService.addSpecialty(specialtyData);
      }
      
      if (result.success) {
        Alert.alert(
          'Succès',
          `Spécialité ${isEditing ? 'modifiée' : 'ajoutée'} avec succès`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
        console.log(`✅ Spécialité ${isEditing ? 'modifiée' : 'ajoutée'}`);
      } else {
        Alert.alert('Erreur', result.error);
      }
    } catch (error) {
      console.error(`❌ Erreur ${isEditing ? 'modification' : 'ajout'} spécialité:`, error);
      Alert.alert('Erreur', `Impossible de ${isEditing ? 'modifier' : 'ajouter'} la spécialité`);
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // 🎨 RENDU DES COMPOSANTS
  // ============================================================

  const renderCategoryCard = (category) => {
    const isSelected = selectedCategory === category.id;
    
    return (
      <TouchableOpacity
        key={category.id}
        style={[
          styles.categoryCard,
          isSelected && styles.categoryCardSelected
        ]}
        onPress={() => handleCategorySelect(category.id)}
        activeOpacity={0.7}
      >
        <View style={styles.categoryContent}>
          <Ionicons
            name={category.icon || 'cube-outline'}
            size={24}
            color={isSelected ? colors.white : colors.primary}
          />
          <Text style={[
            styles.categoryName,
            isSelected && styles.categoryNameSelected
          ]}>
            {category.name}
          </Text>
        </View>
        
        {isSelected && (
          <Ionicons
            name="checkmark-circle"
            size={20}
            color={colors.white}
          />
        )}
      </TouchableOpacity>
    );
  };

  const renderSubCategoriesSection = () => {
    if (!selectedCategory) {
      return (
        <View style={styles.noSelectionContainer}>
          <Ionicons name="arrow-up" size={32} color={colors.gray[400]} />
          <Text style={styles.noSelectionText}>
            Sélectionnez d'abord une catégorie
          </Text>
        </View>
      );
    }

    if (loadingSubCategories) {
      return (
        <View style={styles.loadingContainer}>
          <Loading text="Chargement des sous-catégories..." />
        </View>
      );
    }

    if (availableSubCategories.length === 0) {
      return (
        <View style={styles.noSubCategoriesContainer}>
          <Ionicons name="cube-outline" size={32} color={colors.gray[400]} />
          <Text style={styles.noSubCategoriesText}>
            Aucune sous-catégorie disponible
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.subCategoriesGrid}>
        {availableSubCategories.map((subCategory) => {
          const isSelected = selectedSubCategories.includes(subCategory.id);
          
          return (
            <TouchableOpacity
              key={subCategory.id}
              style={[
                styles.subCategoryChip,
                isSelected && styles.subCategoryChipSelected
              ]}
              onPress={() => handleSubCategoryToggle(subCategory.id)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.subCategoryText,
                isSelected && styles.subCategoryTextSelected
              ]}>
                {subCategory.name}
              </Text>
              
              {isSelected && (
                <Ionicons
                  name="checkmark"
                  size={14}
                  color={colors.white}
                  style={styles.subCategoryCheck}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderProgressIndicator = () => {
    const step1Complete = !!selectedCategory;
    const step2Complete = selectedSubCategories.length > 0;
    
    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressStep}>
          <View style={[
            styles.progressCircle,
            step1Complete && styles.progressCircleComplete
          ]}>
            <Text style={[
              styles.progressNumber,
              step1Complete && styles.progressNumberComplete
            ]}>
              1
            </Text>
          </View>
          <Text style={styles.progressLabel}>Catégorie</Text>
        </View>
        
        <View style={[
          styles.progressLine,
          step1Complete && styles.progressLineComplete
        ]} />
        
        <View style={styles.progressStep}>
          <View style={[
            styles.progressCircle,
            step2Complete && styles.progressCircleComplete
          ]}>
            <Text style={[
              styles.progressNumber,
              step2Complete && styles.progressNumberComplete
            ]}>
              2
            </Text>
          </View>
          <Text style={styles.progressLabel}>Sous-catégories</Text>
        </View>
      </View>
    );
  };

  // ============================================================
  // 🎨 RENDU PRINCIPAL
  // ============================================================

  if (categoriesLoading && !isReady) {
    return (
      <Loading 
        fullScreen 
        gradient 
        text="Chargement des catégories..." 
      />
    );
  }

  if (categoriesError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={48} color={colors.error} />
          <Text style={styles.errorTitle}>Erreur de chargement</Text>
          <Text style={styles.errorText}>{categoriesError}</Text>
          <Button
            title="Réessayer"
            onPress={refreshCategories}
            style={styles.retryButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <LinearGradient
        colors={getGradientString('secondary')}
        style={styles.header}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Ionicons name="add-circle-outline" size={32} color={colors.white} />
          <Text style={styles.headerTitle}>
            {isEditing ? 'Modifier la spécialité' : 'Ajouter une spécialité'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {isEditing 
              ? 'Modifiez votre domaine d\'expertise'
              : 'Ajoutez un nouveau domaine d\'expertise'
            }
          </Text>
        </View>
      </LinearGradient>

      {/* Indicateur de progression */}
      {renderProgressIndicator()}

      {/* Contenu */}
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Section Catégories */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Choisissez une catégorie</Text>
            <Text style={styles.sectionSubtitle}>
              Sélectionnez la catégorie principale de votre expertise
            </Text>
            
            <View style={styles.categoriesGrid}>
              {categories.map(renderCategoryCard)}
            </View>
          </View>

          {/* Section Sous-catégories */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Sélectionnez vos sous-spécialités</Text>
            <Text style={styles.sectionSubtitle}>
              Choisissez une ou plusieurs sous-catégories (minimum 1)
            </Text>
            
            {renderSubCategoriesSection()}
            
            {selectedSubCategories.length > 0 && (
              <View style={styles.selectionSummary}>
                <Text style={styles.summaryTitle}>
                  {selectedSubCategories.length} sous-catégorie(s) sélectionnée(s)
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Bouton de sauvegarde */}
        <View style={styles.footer}>
          <Button
            title={isEditing ? 'Sauvegarder les modifications' : 'Ajouter cette spécialité'}
            onPress={handleSave}
            loading={saving}
            disabled={!selectedCategory || selectedSubCategories.length === 0}
            style={styles.saveButton}
            leftIcon={isEditing ? 'checkmark-circle-outline' : 'add-circle-outline'}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ============================================================
// 🎨 STYLES
// ============================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  header: {
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
    marginTop: 12,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.white,
    opacity: 0.9,
    marginTop: 4,
    textAlign: 'center',
  },
  
  // Indicateur de progression
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    marginHorizontal: 20,
    marginTop: -15,
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 16,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  progressStep: {
    alignItems: 'center',
  },
  progressCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gray[200],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressCircleComplete: {
    backgroundColor: colors.primary,
  },
  progressNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.gray[600],
  },
  progressNumberComplete: {
    color: colors.white,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  progressLine: {
    height: 2,
    flex: 1,
    backgroundColor: colors.gray[200],
    marginHorizontal: 16,
  },
  progressLineComplete: {
    backgroundColor: colors.primary,
  },
  
  // Contenu
  content: {
    flex: 1,
    marginTop: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  section: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  
  // Grille des catégories
  categoriesGrid: {
    gap: 12,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.gray[50],
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.gray[200],
  },
  categoryCardSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginLeft: 12,
  },
  categoryNameSelected: {
    color: colors.white,
  },
  
  // Sous-catégories
  noSelectionContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noSelectionText: {
    fontSize: 16,
    color: colors.gray[500],
    marginTop: 12,
  },
  loadingContainer: {
    paddingVertical: 40,
  },
  noSubCategoriesContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noSubCategoriesText: {
    fontSize: 16,
    color: colors.gray[500],
    marginTop: 12,
  },
  subCategoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  subCategoryChip: {
    backgroundColor: colors.gray[100],
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: colors.gray[200],
    flexDirection: 'row',
    alignItems: 'center',
  },
  subCategoryChipSelected: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  subCategoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  subCategoryTextSelected: {
    color: colors.white,
  },
  subCategoryCheck: {
    marginLeft: 6,
  },
  
  // Résumé de sélection
  selectionSummary: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
  },
  
  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    padding: 20,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  saveButton: {
    marginTop: 0,
  },
  
  // États d'erreur
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  retryButton: {
    minWidth: 150,
  },
});

export default AddSpecialtyScreen;