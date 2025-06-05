import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
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
import PhotoPicker from '../../components/PhotoPicker';
import Loading from '../../components/Loading';

import RequestService from '../../services/requestService';
import PhotoUploadService from '../../services/photoUploadService';

import colors, { getGradientString } from '../../styles/colors';

const NewHomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  
  // État du formulaire
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    subCategory: '',
    location: null,
    radius: 5,
    priority: 'medium',
    tags: [],
    photos: []
  });

  // État de l'interface
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formErrors, setFormErrors] = useState({});

  // Charger les catégories au démarrage
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      console.log('📂 Chargement des catégories...');
      
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

  // Gérer les changements de formulaire
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Effacer l'erreur du champ modifié
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleCategorySelect = (categoryId) => {
    setFormData(prev => ({ 
      ...prev, 
      category: categoryId,
      subCategory: '' // Reset la sous-catégorie
    }));
    
    if (formErrors.category) {
      setFormErrors(prev => ({ ...prev, category: null }));
    }
  };

  const handleSubCategorySelect = (subCategoryId) => {
    setFormData(prev => ({ ...prev, subCategory: subCategoryId }));
    
    if (formErrors.subCategory) {
      setFormErrors(prev => ({ ...prev, subCategory: null }));
    }
  };

  const handleLocationSelect = (locationData) => {
    setFormData(prev => ({ ...prev, location: locationData }));
    
    if (formErrors.location) {
      setFormErrors(prev => ({ ...prev, location: null }));
    }
  };

  const handleRadiusChange = (radius) => {
    setFormData(prev => ({ ...prev, radius: Math.round(radius) }));
  };

  const handlePhotosChange = (photos) => {
    setFormData(prev => ({ ...prev, photos }));
    
    if (formErrors.photos) {
      setFormErrors(prev => ({ ...prev, photos: null }));
    }
  };

  // Validation du formulaire
  const validateForm = () => {
    const errors = {};

    // Titre
    if (!formData.title.trim()) {
      errors.title = 'Le titre est requis';
    } else if (formData.title.trim().length < 5) {
      errors.title = 'Le titre doit contenir au moins 5 caractères';
    } else if (formData.title.trim().length > 100) {
      errors.title = 'Le titre ne peut pas dépasser 100 caractères';
    }

    // Description
    if (!formData.description.trim()) {
      errors.description = 'La description est requise';
    } else if (formData.description.trim().length < 10) {
      errors.description = 'La description doit contenir au moins 10 caractères';
    } else if (formData.description.trim().length > 1000) {
      errors.description = 'La description ne peut pas dépasser 1000 caractères';
    }

    // Catégorie
    if (!formData.category) {
      errors.category = 'Veuillez choisir une catégorie';
    }

    // Sous-catégorie
    if (!formData.subCategory) {
      errors.subCategory = 'Veuillez choisir une sous-catégorie';
    }

    // Localisation
    if (!formData.location) {
      errors.location = 'Veuillez définir votre localisation';
    }

    // Au moins une photo (optionnel mais recommandé)
    if (formData.photos.length === 0) {
      errors.photos = 'Ajoutez au moins une photo pour mieux décrire votre demande';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Soumettre le formulaire - VERSION CORRIGÉE
  const handleSubmit = async () => {
    try {
      // Validation
      if (!validateForm()) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Formulaire incomplet', 'Veuillez corriger les erreurs et réessayer');
        return;
      }

      setLoading(true);
      console.log('📝 Création de la demande...');

      let photoUrls = [];

      // 1. Upload des photos SI il y en a
      if (formData.photos.length > 0) {
        console.log('📤 Upload de', formData.photos.length, 'photos...');
        
        try {
          const uploadResult = await PhotoUploadService.uploadMultiplePhotos(
            formData.photos,
            (progress, current, total) => {
              setUploadProgress(progress);
              console.log(`📤 Upload photo ${current + 1}/${total}: ${Math.round(progress * 100)}%`);
            }
          );

          if (uploadResult.success) {
            photoUrls = uploadResult.photoUrls;
            console.log('✅ Photos uploadées:', photoUrls.length);
          } else {
            console.error('❌ Erreur upload photos:', uploadResult.error);
            
            // ✅ CORRECTION : Proposer de continuer sans photos
            const continueWithoutPhotos = await new Promise((resolve) => {
              Alert.alert(
                'Erreur upload photos', 
                `Impossible d'uploader les photos : ${uploadResult.error}\n\nVoulez-vous continuer sans photos ?`,
                [
                  { text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
                  { text: 'Continuer sans photos', onPress: () => resolve(true) }
                ]
              );
            });

            if (!continueWithoutPhotos) {
              setLoading(false);
              setUploadProgress(0);
              return; // Arrêter ici si l'utilisateur annule
            }
            
            // Continuer sans photos
            photoUrls = [];
            console.log('⚠️ Continuation sans photos');
          }
        } catch (uploadError) {
          console.error('❌ Erreur critique upload:', uploadError);
          
          // ✅ CORRECTION : Proposer de continuer même en cas d'erreur critique
          const continueWithoutPhotos = await new Promise((resolve) => {
            Alert.alert(
              'Erreur critique upload', 
              `Erreur technique : ${uploadError.message}\n\nVoulez-vous créer la demande sans photos ?`,
              [
                { text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
                { text: 'Créer sans photos', onPress: () => resolve(true) }
              ]
            );
          });

          if (!continueWithoutPhotos) {
            setLoading(false);
            setUploadProgress(0);
            return;
          }
          
          photoUrls = [];
        }
      } else {
        console.log('ℹ️ Aucune photo à uploader');
      }

      // 2. Créer la demande (avec ou sans photos)
      await proceedWithRequest(photoUrls);

    } catch (error) {
      console.error('❌ Erreur création demande:', error);
      Alert.alert('Erreur', 'Une erreur inattendue s\'est produite');
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const proceedWithRequest = async (photoUrls) => {
    try {
      console.log('📝 Création de la demande avec', photoUrls.length, 'photos...');
      
      // Construire les données de la demande
      const requestData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        subCategory: formData.subCategory,
        location: formData.location,
        radius: formData.radius,
        priority: formData.priority,
        photos: photoUrls,
        tags: extractTags(formData.description)
      };

      console.log('📝 Envoi de la demande au serveur...');
      console.log('📸 Avec', photoUrls.length, 'photos');
      
      const result = await RequestService.createRequest(requestData);

      if (result.success) {
        console.log('✅ Demande créée avec succès:', result.data.title);
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // ✅ Message de succès adapté selon les photos
        const successMessage = photoUrls.length > 0 
          ? `Votre demande "${result.data.title}" a été publiée avec ${photoUrls.length} photo(s). Vous recevrez des notifications quand des personnes répondront.`
          : `Votre demande "${result.data.title}" a été publiée sans photos. Vous recevrez des notifications quand des personnes répondront.`;
        
        Alert.alert(
          '🎉 Demande publiée !',
          successMessage,
          [
            { 
              text: 'Nouvelle demande', 
              onPress: () => resetForm()
            },
            { 
              text: 'OK',
              style: 'default'
            }
          ]
        );

      } else {
        console.error('❌ Erreur création demande:', result.error);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Erreur', result.error);
      }

    } catch (error) {
      console.error('❌ Erreur proceed request:', error);
      Alert.alert('Erreur', 'Impossible de créer la demande');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  // ✅ NOUVEAU : Fonction de test upload séparée
  const handleTestUpload = async () => {
    try {
      setLoading(true);
      console.log('🧪 TEST UPLOAD SEUL...');
      
      const result = await PhotoUploadService.uploadMultiplePhotos(
        formData.photos,
        (progress, current, total) => {
          setUploadProgress(progress);
          console.log(`TEST: ${current + 1}/${total}: ${Math.round(progress * 100)}%`);
        }
      );
      
      if (result.success) {
        Alert.alert('✅ Test réussi', `${result.photoUrls.length} photos uploadées sur Railway !`);
      } else {
        Alert.alert('❌ Test échoué', result.error);
      }
    } catch (error) {
      Alert.alert('❌ Erreur test', error.message);
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  // Extraire les tags depuis la description
  const extractTags = (description) => {
    // Extraire les mots-clés potentiels (mots de plus de 3 lettres)
    const words = description.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 5); // Max 5 tags

    return [...new Set(words)]; // Supprimer les doublons
  };

  // Réinitialiser le formulaire
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: '',
      subCategory: '',
      location: null,
      radius: 5,
      priority: 'medium',
      tags: [],
      photos: []
    });
    setFormErrors({});
    console.log('🔄 Formulaire réinitialisé');
  };

  if (loadingCategories) {
    return <Loading fullScreen gradient text="Chargement des catégories..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header avec gradient */}
      <LinearGradient
        colors={getGradientString('primary')}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.welcomeText}>Bonjour {user?.firstName} 👋</Text>
          <Text style={styles.headerTitle}>Que recherchez-vous ?</Text>
          <Text style={styles.headerSubtitle}>
            Publiez votre demande et trouvez ce qu'il vous faut
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
          {/* Titre */}
          <Input
            label="Titre de votre demande"
            placeholder="Ex: Recherche iPhone 13, Prêt perceuse..."
            value={formData.title}
            onChangeText={(value) => handleInputChange('title', value)}
            error={formErrors.title}
            required
            maxLength={100}
            leftIcon="document-text-outline"
            autoFocus
          />

          {/* Description */}
          <Input
            label="Description détaillée"
            placeholder="Décrivez précisément ce que vous recherchez, l'état souhaité, vos préférences..."
            value={formData.description}
            onChangeText={(value) => handleInputChange('description', value)}
            error={formErrors.description}
            required
            multiline
            numberOfLines={4}
            maxLength={1000}
            leftIcon="chatbubble-outline"
            helperText="Plus votre description est précise, meilleures seront les réponses"
          />

          {/* Sélecteur de catégories */}
          <CategorySelector
            selectedCategory={formData.category}
            selectedSubCategory={formData.subCategory}
            onCategorySelect={handleCategorySelect}
            onSubCategorySelect={handleSubCategorySelect}
            categories={categories}
            error={formErrors.category || formErrors.subCategory}
          />

          {/* Photos */}
          <PhotoPicker
            photos={formData.photos}
            onPhotosChange={handlePhotosChange}
            maxPhotos={5}
            error={formErrors.photos}
          />

          {/* Localisation et rayon */}
          <LocationSelector
            location={formData.location}
            radius={formData.radius}
            onLocationSelect={handleLocationSelect}
            onRadiusChange={handleRadiusChange}
            error={formErrors.location}
          />

          {/* ✅ BOUTON TEST UPLOAD - SYNTAX CORRECTE */}
          {formData.photos.length > 0 && (
            <Button
              title="🧪 Tester upload photos uniquement"
              variant="outline"
              onPress={handleTestUpload}
              fullWidth
              style={{ marginBottom: 16 }}
              loading={loading}
            />
          )}

          {/* Bouton de soumission */}
          <Button
            title={loading ? 'Publication en cours...' : 'Publier ma demande'}
            onPress={handleSubmit}
            loading={loading}
            fullWidth
            style={styles.submitButton}
            icon="send-outline"
          />

          {/* Progression d'upload */}
          {loading && uploadProgress > 0 && (
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>
                Upload des photos: {Math.round(uploadProgress * 100)}%
              </Text>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${uploadProgress * 100}%` }
                  ]} 
                />
              </View>
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
  },
  headerContent: {
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 16,
    color: colors.white,
    opacity: 0.9,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 8,
    textAlign: 'center',
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
  submitButton: {
    marginTop: 24,
    marginBottom: 16,
  },
  progressContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: colors.gray[50],
    borderRadius: 12,
  },
  progressText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.gray[300],
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  keyboardSpace: {
    height: 100,
  },
});

export default NewHomeScreen;