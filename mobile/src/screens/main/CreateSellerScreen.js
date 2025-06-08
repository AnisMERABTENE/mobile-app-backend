import React, { useState, useEffect } from 'react';
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
import Button from '../../components/Button';
import Input from '../../components/Input';
import CategorySelector from '../../components/CategorySelector';
import LocationSelector from '../../components/LocationSelector';
import Loading from '../../components/Loading';

import SellerService from '../../services/sellerService';
import RequestService from '../../services/requestService';

import colors, { getGradientString } from '../../styles/colors';

const CreateSellerScreen = ({ navigation }) => {
  const { user } = useAuth();
  
  // État du formulaire
  const [formData, setFormData] = useState({
    businessName: '',
    description: '',
    phone: '',
    location: null,
    serviceRadius: 10,
    specialties: [] // [{ category: 'electronique', subCategories: ['smartphones', 'ordinateurs'] }]
  });

  // État de l'interface
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [formErrors, setFormErrors] = useState({});
  
  // État pour la gestion des spécialités
  const [selectedCategory, setSelectedCategory] = useState('');
  const [availableSubCategories, setAvailableSubCategories] = useState([]);
  const [selectedSubCategories, setSelectedSubCategories] = useState([]); // Sous-catégories sélectionnées pour la catégorie courante

  // Charger les catégories au démarrage
  useEffect(() => {
    loadCategories();
  }, []);

  // Charger les sous-catégories quand une catégorie est sélectionnée
  useEffect(() => {
    if (selectedCategory) {
      loadSubCategories(selectedCategory);
    } else {
      setAvailableSubCategories([]);
      setSelectedSubCategories([]);
    }
  }, [selectedCategory]);

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      console.log('📂 Chargement des catégories pour vendeur...');
      
      const result = await RequestService.getCategories();
      
      if (result.success) {
        setCategories(result.data);
        console.log('✅ Catégories chargées:', result.data.length);
      } else {
        console.error('❌ Erreur chargement catégories:', result.error);
        Alert.alert('Erreur', 'Impossible de charger les catégories');
      }
    } catch (error) {
      console.error('❌ Erreur load categories:', error);
      Alert.alert('Erreur', 'Erreur lors du chargement');
    } finally {
      setLoadingCategories(false);
    }
  };

  const loadSubCategories = async (categoryId) => {
    try {
      console.log('🏷️ Chargement sous-catégories pour:', categoryId);
      
      const response = await fetch(
        `https://mobile-app-backend-production-5d60.up.railway.app/api/requests/categories/${categoryId}/subcategories`
      );
      
      if (response.ok) {
        const data = await response.json();
        setAvailableSubCategories(data.subCategories);
        
        // Récupérer les sous-catégories déjà sélectionnées pour cette catégorie
        const existingSpecialty = formData.specialties.find(s => s.category === categoryId);
        if (existingSpecialty) {
          setSelectedSubCategories(existingSpecialty.subCategories);
        } else {
          setSelectedSubCategories([]);
        }
        
        console.log('✅ Sous-catégories chargées:', data.subCategories.length);
      } else {
        console.error('❌ Erreur chargement sous-catégories');
        setAvailableSubCategories([]);
        setSelectedSubCategories([]);
      }
    } catch (error) {
      console.error('❌ Erreur réseau sous-catégories:', error);
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

  const handleRadiusChange = (radius) => {
    setFormData(prev => ({ ...prev, serviceRadius: Math.round(radius) }));
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

  // Validation du formulaire
  const validateForm = () => {
    const validation = SellerService.validateProfileData(formData);
    setFormErrors(validation.errors);
    return validation.isValid;
  };

  // Soumettre le formulaire
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

      // Formater les données
      const profileData = SellerService.formatProfileData(formData);
      
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

  if (loadingCategories) {
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
          <Ionicons name="storefront-outline" size={48} color={colors.white} />
          <Text style={styles.headerTitle}>Devenir vendeur</Text>
          <Text style={styles.headerSubtitle}>
            Créez votre profil professionnel
          </Text>
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

          {/* Localisation */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Zone d'intervention</Text>
            
            <LocationSelector
              location={formData.location}
              radius={formData.serviceRadius}
              onLocationSelect={handleLocationSelect}
              onRadiusChange={handleRadiusChange}
              error={formErrors.location}
            />
          </View>

          {/* ✅ NOUVELLE SECTION SPÉCIALITÉS AMÉLIORÉE */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vos spécialités</Text>
            <Text style={styles.sectionSubtitle}>
              Sélectionnez une ou plusieurs catégories, puis choisissez les sous-catégories correspondantes
            </Text>

            {/* Sélection de catégorie */}
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

            {/* Sélection de sous-catégories */}
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
            icon="storefront-outline"
            variant="secondary"
          />

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
  
  // ✅ NOUVEAUX STYLES POUR SPÉCIALITÉS
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
});

export default CreateSellerScreen;