import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useAuth } from '../../context/AuthContext';
// ✅ NOUVEAU : Utiliser le hook de cache intelligent
import { useCachedCategories } from '../../hooks/useCachedCategories';

import Button from '../../components/Button';
import Input from '../../components/Input';
import LocationSelector from '../../components/LocationSelector';
import Loading from '../../components/Loading';

import SellerService from '../../services/sellerService';
import colors, { getGradientString } from '../../styles/colors';

const CreateSellerScreen = ({ navigation }) => {
  const { user } = useAuth();
  
  // ✅ NOUVEAU : Utiliser le cache intelligent des catégories
  const {
    categories,
    loading: categoriesLoading,
    error: categoriesError,
    isFromCache,
    isReady,
    getSubCategoriesForCategory,
    loadSubCategories,
    refresh: refreshCategories,
    getStats: getCategoriesStats,
  } = useCachedCategories({
    autoLoad: true,
    loadSubCategories: false,
  });
  
  // État du formulaire - 🔧 MODIFIÉ : Suppression du serviceRadius
  const [formData, setFormData] = useState({
    businessName: '',
    description: '',
    phone: '',
    location: null,
    // serviceRadius supprimé car non nécessaire pour le vendeur
    specialties: [] // [{ category: 'electronique', subCategories: ['smartphones', 'ordinateurs'] }]
  });

  // État de l'interface
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  
  // État pour la gestion des spécialités
  const [selectedCategory, setSelectedCategory] = useState('');
  const [availableSubCategories, setAvailableSubCategories] = useState([]);
  const [selectedSubCategories, setSelectedSubCategories] = useState([]); // Sous-catégories sélectionnées pour la catégorie courante

  // ✅ NOUVEAU : Debug du cache des catégories
  React.useEffect(() => {
    if (isReady) {
      const stats = getCategoriesStats();
      console.log('📂 Stats cache catégories CreateSellerScreen:', stats);
      console.log('📂 Catégories chargées:', categories.length);
      console.log('📂 Source:', isFromCache ? 'Cache' : 'API');
    }
  }, [isReady, isFromCache]);

  // ✅ AMÉLIORATION : Charger les sous-catégories avec cache intelligent
  React.useEffect(() => {
    if (selectedCategory && isReady) {
      loadSubCategoriesWithCache(selectedCategory);
    } else {
      setAvailableSubCategories([]);
      setSelectedSubCategories([]);
    }
  }, [selectedCategory, isReady]);

  // ✅ NOUVELLE FONCTION : Chargement avec cache intelligent
  const loadSubCategoriesWithCache = async (categoryId) => {
    try {
      console.log('🏷️ Chargement sous-catégories avec cache pour:', categoryId);
      
      // D'abord essayer de récupérer depuis le cache du contexte
      const cachedSubCategories = getSubCategoriesForCategory(categoryId);
      
      if (cachedSubCategories.length > 0) {
        console.log('✅ Sous-catégories trouvées en cache:', cachedSubCategories.length);
        setAvailableSubCategories(cachedSubCategories);
        
        // Récupérer les sous-catégories déjà sélectionnées pour cette catégorie
        const existingSpecialty = formData.specialties.find(s => s.category === categoryId);
        if (existingSpecialty) {
          setSelectedSubCategories(existingSpecialty.subCategories);
        } else {
          setSelectedSubCategories([]);
        }
        return;
      }
      
      // Sinon charger depuis l'API et mettre en cache
      console.log('🌐 Chargement depuis API...');
      await loadSubCategories(categoryId);
      
      // Récupérer à nouveau depuis le cache après chargement
      const newSubCategories = getSubCategoriesForCategory(categoryId);
      setAvailableSubCategories(newSubCategories);
      
      // Récupérer les sous-catégories déjà sélectionnées pour cette catégorie
      const existingSpecialty = formData.specialties.find(s => s.category === categoryId);
      if (existingSpecialty) {
        setSelectedSubCategories(existingSpecialty.subCategories);
      } else {
        setSelectedSubCategories([]);
      }
      
      console.log('✅ Sous-catégories chargées avec cache:', newSubCategories.length);
      
    } catch (error) {
      console.error('❌ Erreur chargement sous-catégories avec cache:', error);
      setAvailableSubCategories([]);
      setSelectedSubCategories([]);
    }
  };

  // Gérer les changements de formulaire
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Effacer l'erreur du champ modifié
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleLocationSelect = (locationData) => {
    setFormData(prev => ({ ...prev, location: locationData }));
    
    if (formErrors.location) {
      setFormErrors(prev => ({ ...prev, location: null }));
    }
  };

  // ✅ NOUVELLE GESTION DES SPÉCIALITÉS

  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId);
  };

  const toggleSubCategory = (subCategoryId) => {
    setSelectedSubCategories(prev => {
      if (prev.includes(subCategoryId)) {
        // Retirer la sous-catégorie
        return prev.filter(id => id !== subCategoryId);
      } else {
        // Ajouter la sous-catégorie
        return [...prev, subCategoryId];
      }
    });
  };

  const saveCurrentSpecialty = () => {
    if (!selectedCategory) {
      Alert.alert('Attention', 'Veuillez sélectionner une catégorie');
      return;
    }

    if (selectedSubCategories.length === 0) {
      Alert.alert('Attention', 'Veuillez sélectionner au moins une sous-catégorie');
      return;
    }

    // Mettre à jour ou ajouter la spécialité
    const updatedSpecialties = [...formData.specialties];
    const existingIndex = updatedSpecialties.findIndex(s => s.category === selectedCategory);

    if (existingIndex !== -1) {
      // Mettre à jour la spécialité existante
      updatedSpecialties[existingIndex] = {
        category: selectedCategory,
        subCategories: [...selectedSubCategories]
      };
    } else {
      // Nouvelle spécialité
      updatedSpecialties.push({
        category: selectedCategory,
        subCategories: [...selectedSubCategories]
      });
    }

    setFormData(prev => ({ ...prev, specialties: updatedSpecialties }));
    
    // Reset de la sélection
    setSelectedCategory('');
    setSelectedSubCategories([]);
    
    if (formErrors.specialties) {
      setFormErrors(prev => ({ ...prev, specialties: null }));
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log('✅ Spécialité sauvegardée:', selectedCategory, selectedSubCategories);
  };

  const removeSpecialty = (categoryToRemove) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.filter(s => s.category !== categoryToRemove)
    }));
    
    // Si on supprime la catégorie actuellement sélectionnée, reset
    if (selectedCategory === categoryToRemove) {
      setSelectedCategory('');
      setSelectedSubCategories([]);
    }
  };

  // Validation du formulaire - 🔧 MODIFIÉ : Pas de validation serviceRadius
  const validateForm = () => {
    const errors = {};

    // Nom d'entreprise
    if (!formData.businessName || formData.businessName.trim().length < 2) {
      errors.businessName = 'Le nom de l\'entreprise doit contenir au moins 2 caractères';
    }

    // Description
    if (!formData.description || formData.description.trim().length < 10) {
      errors.description = 'La description doit contenir au moins 10 caractères';
    }

    // Téléphone
    if (!formData.phone || !/^[0-9+\-\s().]+$/.test(formData.phone)) {
      errors.phone = 'Format de téléphone invalide';
    }

    // Localisation
    if (!formData.location || !formData.location.coordinates || formData.location.coordinates.length !== 2) {
      errors.location = 'Localisation requise';
    }

    // Spécialités
    if (!formData.specialties || formData.specialties.length === 0) {
      errors.specialties = 'Au moins une spécialité est requise';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Soumettre le formulaire - 🔧 MODIFIÉ : Pas de serviceRadius envoyé
  const handleSubmit = async () => {
    try {
      // Validation
      if (!validateForm()) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Formulaire incomplet', 'Veuillez corriger les erreurs et réessayer');
        return;
      }

      setLoading(true);
      console.log('📝 Création du profil vendeur...');
      console.log('📊 Spécialités à envoyer:', formData.specialties);

      // Formater les données - 🔧 MODIFIÉ : Pas de serviceRadius
      const profileData = {
        businessName: formData.businessName.trim(),
        description: formData.description.trim(),
        phone: formData.phone.trim(),
        location: formData.location,
        // serviceRadius supprimé - le vendeur n'a besoin que de son adresse
        specialties: formData.specialties || []
      };
      
      const result = await SellerService.createProfile(profileData);

      if (result.success) {
        console.log('✅ Profil vendeur créé avec succès');
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        Alert.alert(
          '🎉 Profil vendeur créé !',
          `Votre profil "${result.data.businessName}" a été créé avec succès. Il est en attente de validation.`,
          [
            { 
              text: 'Parfait !',
              onPress: () => navigation.goBack()
            }
          ]
        );

      } else {
        console.error('❌ Erreur création profil vendeur:', result.error);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Erreur', result.error);
      }

    } catch (error) {
      console.error('❌ Erreur création profil vendeur:', error);
      Alert.alert('Erreur', 'Une erreur inattendue s\'est produite');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryName = (categoryId) => {
    return categories.find(cat => cat.id === categoryId)?.name || categoryId;
  };

  const getSubCategoryName = (subCategoryId) => {
    return availableSubCategories.find(sub => sub.id === subCategoryId)?.name || subCategoryId;
  };

  // ✅ NOUVEAU : Fonction de refresh des catégories
  const handleRefreshCategories = async () => {
    try {
      console.log('🔄 Refresh manuel des catégories...');
      const result = await refreshCategories();
      if (result.success) {
        Alert.alert('✅ Catégories mises à jour', 'Les catégories ont été actualisées avec succès');
      } else {
        Alert.alert('❌ Erreur', 'Impossible de mettre à jour les catégories');
      }
    } catch (error) {
      Alert.alert('❌ Erreur', 'Erreur lors de la mise à jour');
    }
  };

  // ✅ AFFICHAGE D'ERREUR CATÉGORIES
  if (categoriesError && !isReady) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.danger} />
          <Text style={styles.errorTitle}>Erreur de chargement</Text>
          <Text style={styles.errorText}>{categoriesError}</Text>
          <Button
            title="Réessayer"
            onPress={handleRefreshCategories}
            variant="primary"
          />
        </View>
      </SafeAreaView>
    );
  }

  // ✅ LOADING UNIQUEMENT SI PAS DE CACHE
  if (categoriesLoading && !isReady) {
    return <Loading fullScreen gradient text="Chargement des catégories..." />;
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
          <Ionicons name="business-outline" size={48} color={colors.white} />
          <Text style={styles.headerTitle}>Devenir vendeur</Text>
          <Text style={styles.headerSubtitle}>
            Créez votre profil professionnel
          </Text>
          
          {/* ✅ NOUVEAU : Indicateur de cache */}
          {isFromCache && (
            <View style={styles.cacheIndicator}>
              <Ionicons name="flash" size={12} color={colors.white} />
              <Text style={styles.cacheText}>Mode rapide activé</Text>
            </View>
          )}
        </View>
      </LinearGradient>

      {/* Formulaire */}
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.form}
          contentContainerStyle={styles.formContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Informations de base */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations de base</Text>
            
            <Input
              label="Nom de votre entreprise"
              placeholder="Ex: Électronique Martin, Garage Dupont..."
              value={formData.businessName}
              onChangeText={(value) => handleInputChange('businessName', value)}
              error={formErrors.businessName}
              required
              leftIcon="business-outline"
              autoFocus
            />

            <Input
              label="Description de votre activité"
              placeholder="Décrivez votre expertise, vos services, votre expérience..."
              value={formData.description}
              onChangeText={(value) => handleInputChange('description', value)}
              error={formErrors.description}
              required
              multiline
              numberOfLines={4}
              leftIcon="document-text-outline"
            />

            <Input
              label="Numéro de téléphone"
              placeholder="06 12 34 56 78"
              value={formData.phone}
              onChangeText={(value) => handleInputChange('phone', value)}
              error={formErrors.phone}
              required
              type="phone"
            />
          </View>

          {/* 🔧 SECTION LOCALISATION MODIFIÉE */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Localisation de votre entreprise</Text>
            <Text style={styles.sectionSubtitle}>
              Indiquez l'adresse précise de votre magasin, atelier ou lieu de travail
            </Text>
            
            <LocationSelector
              location={formData.location}
              onLocationSelect={handleLocationSelect}
              error={formErrors.location}
              hideRadiusSelector={true}  // 🔧 NOUVEAU : Cacher le rayon pour vendeur
            />
          </View>

          {/* ✅ NOUVELLE SECTION SPÉCIALITÉS AMÉLIORÉE AVEC CACHE */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vos spécialités</Text>
            <Text style={styles.sectionSubtitle}>
              Sélectionnez une ou plusieurs catégories, puis choisissez les sous-catégories correspondantes
            </Text>

            {/* Sélection de catégorie avec cache */}
            <View style={styles.categorySelection}>
              <Text style={styles.selectionTitle}>1. Choisissez une catégorie :</Text>
              
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryChip,
                      selectedCategory === category.id && styles.categoryChipSelected
                    ]}
                    onPress={() => handleCategorySelect(category.id)}
                  >
                    <Ionicons 
                      name={category.icon} 
                      size={20} 
                      color={selectedCategory === category.id ? colors.white : colors.primary} 
                    />
                    <Text style={[
                      styles.categoryChipText,
                      selectedCategory === category.id && styles.categoryChipTextSelected
                    ]}>
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Sélection de sous-catégories avec cache */}
            {selectedCategory && availableSubCategories.length > 0 && (
              <View style={styles.subCategorySelection}>
                <Text style={styles.selectionTitle}>
                  2. Choisissez les sous-catégories de "{getCategoryName(selectedCategory)}" :
                </Text>
                
                <View style={styles.subCategoriesGrid}>
                  {availableSubCategories.map((subCategory) => (
                    <TouchableOpacity
                      key={subCategory.id}
                      style={[
                        styles.subCategoryChip,
                        selectedSubCategories.includes(subCategory.id) && styles.subCategoryChipSelected
                      ]}
                      onPress={() => toggleSubCategory(subCategory.id)}
                    >
                      <Text style={[
                        styles.subCategoryChipText,
                        selectedSubCategories.includes(subCategory.id) && styles.subCategoryChipTextSelected
                      ]}>
                        {subCategory.name}
                      </Text>
                      {selectedSubCategories.includes(subCategory.id) && (
                        <Ionicons name="checkmark" size={16} color={colors.white} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>

                {selectedSubCategories.length > 0 && (
                  <Button
                    title={`Valider "${getCategoryName(selectedCategory)}" (${selectedSubCategories.length} sous-cat.)`}
                    variant="primary"
                    icon="checkmark"
                    onPress={saveCurrentSpecialty}
                    style={styles.saveSpecialtyButton}
                  />
                )}
              </View>
            )}

            {/* Spécialités sauvegardées */}
            {formData.specialties.length > 0 && (
              <View style={styles.savedSpecialties}>
                <Text style={styles.savedSpecialtiesTitle}>
                  ✅ Vos spécialités ({formData.specialties.length}) :
                </Text>
                
                {formData.specialties.map((specialty, index) => (
                  <View key={index} style={styles.specialtyCard}>
                    <View style={styles.specialtyCardHeader}>
                      <Text style={styles.specialtyCardTitle}>
                        {getCategoryName(specialty.category)}
                      </Text>
                      <TouchableOpacity
                        onPress={() => removeSpecialty(specialty.category)}
                        style={styles.removeSpecialtyButton}
                      >
                        <Ionicons name="trash-outline" size={20} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.specialtySubCategories}>
                      <Text style={styles.subCategoriesCount}>
                        {specialty.subCategories.length} sous-catégorie(s) :
                      </Text>
                      <View style={styles.subCategoriesTags}>
                        {specialty.subCategories.map((subCatId, subIndex) => (
                          <View key={subIndex} style={styles.savedSubCategoryTag}>
                            <Text style={styles.savedSubCategoryText}>
                              {availableSubCategories.find(sub => sub.id === subCatId)?.name || subCatId}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {formErrors.specialties && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
                <Text style={styles.errorText}>{formErrors.specialties}</Text>
              </View>
            )}
          </View>

          {/* Bouton de soumission */}
          <Button
            title={loading ? 'Création en cours...' : 'Créer mon profil vendeur'}
            onPress={handleSubmit}
            loading={loading}
            fullWidth
            style={styles.submitButton}
            icon="business-outline"
            variant="secondary"
          />

          {/* ✅ NOUVEAU : Debug du cache (développement seulement) */}
          {__DEV__ && (
            <View style={styles.debugContainer}>
              <Text style={styles.debugTitle}>🔧 Debug Cache</Text>
              <Text style={styles.debugText}>
                Catégories: {categories.length} | Source: {isFromCache ? 'Cache' : 'API'}
              </Text>
              <Text style={styles.debugText}>
                Sous-catégories chargées: {Object.keys(getSubCategoriesForCategory).length}
              </Text>
              <Button
                title="🔄 Actualiser catégories"
                variant="outline"
                size="small"
                onPress={handleRefreshCategories}
                style={styles.debugButton}
              />
            </View>
          )}

          {/* Espace pour le clavier */}
          <View style={styles.keyboardSpace} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 24,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 24,
    zIndex: 1,
    padding: 8,
  },
  headerContent: {
    alignItems: 'center',
    marginTop: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
    marginTop: 16,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.white,
    opacity: 0.9,
    textAlign: 'center',
  },
  // ✅ NOUVEAU : Indicateur de cache
  cacheIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
  },
  cacheText: {
    fontSize: 12,
    color: colors.white,
    marginLeft: 4,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    marginTop: -15,
  },
  form: {
    flex: 1,
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  formContent: {
    padding: 24,
    paddingTop: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  
  // ✅ STYLES POUR SPÉCIALITÉS
  categorySelection: {
    marginBottom: 24,
  },
  selectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
  },
  categoriesScroll: {
    marginBottom: 16,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
  },
  categoryChipSelected: {
    backgroundColor: colors.primary,
  },
  categoryChipText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
    marginLeft: 8,
  },
  categoryChipTextSelected: {
    color: colors.white,
  },
  subCategorySelection: {
    backgroundColor: colors.gray[50],
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  subCategoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  subCategoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  subCategoryChipSelected: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  subCategoryChipText: {
    fontSize: 12,
    color: colors.text.primary,
    fontWeight: '500',
    marginRight: 4,
  },
  subCategoryChipTextSelected: {
    color: colors.white,
  },
  saveSpecialtyButton: {
    marginTop: 8,
  },
  savedSpecialties: {
    marginTop: 24,
  },
  savedSpecialtiesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
  },
  specialtyCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.success + '30',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  specialtyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  specialtyCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  removeSpecialtyButton: {
    padding: 4,
  },
  specialtySubCategories: {
    marginTop: 8,
  },
  subCategoriesCount: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  subCategoriesTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  savedSubCategoryTag: {
    backgroundColor: colors.success + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  savedSubCategoryText: {
    fontSize: 11,
    color: colors.success,
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  errorText: {
    fontSize: 14,
    color: colors.danger,
    marginLeft: 6,
    flex: 1,
  },
  submitButton: {
    marginTop: 24,
    marginBottom: 16,
  },
  keyboardSpace: {
    height: 100,
  },
  // ✅ NOUVEAU : Styles d'erreur
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  // ✅ NOUVEAU : Debug styles
  debugContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: colors.gray[100],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.gray[300],
  },
  debugTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  debugText: {
    fontSize: 11,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  debugButton: {
    marginTop: 4,
  },
});

export default CreateSellerScreen;