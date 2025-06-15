import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../context/AuthContext';
import sellerService from '../../services/sellerService';
import Loading from '../../components/Loading';
import Button from '../../components/Button';
import Input from '../../components/Input';
import colors, { getGradientString } from '../../styles/colors';

const EditSellerProfileScreen = ({ navigation }) => {
  const { user } = useAuth();
  
  // États
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [seller, setSeller] = useState(null);
  const [activeTab, setActiveTab] = useState('general'); // general, specialties
  
  // Données du formulaire pour les infos générales
  const [formData, setFormData] = useState({
    businessName: '',
    description: '',
    phone: '',
    location: null
  });
  
  const [formErrors, setFormErrors] = useState({});

  // ============================================================
  // 🔄 CHARGEMENT INITIAL
  // ============================================================

  useEffect(() => {
    loadSellerProfile();
  }, []);

  const loadSellerProfile = async () => {
    try {
      console.log('🔄 Chargement du profil vendeur...');
      setLoading(true);
      
      const result = await sellerService.getProfile();
      
      if (result.success) {
        const sellerData = result.data.seller;
        setSeller(sellerData);
        
        // Pré-remplir le formulaire
        setFormData({
          businessName: sellerData.businessName || '',
          description: sellerData.description || '',
          phone: sellerData.phone || '',
          location: sellerData.location || null
        });
        
        console.log('✅ Profil vendeur chargé');
      } else {
        console.error('❌ Erreur chargement profil:', result.error);
        Alert.alert('Erreur', result.error);
        navigation.goBack();
      }
    } catch (error) {
      console.error('❌ Erreur chargement profil vendeur:', error);
      Alert.alert('Erreur', 'Impossible de charger le profil vendeur');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSellerProfile();
    setRefreshing(false);
  };

  // ============================================================
  // 📝 GESTION DU FORMULAIRE
  // ============================================================

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Effacer l'erreur quand l'utilisateur tape
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleLocationSelect = (locationData) => {
    setFormData(prev => ({
      ...prev,
      location: locationData
    }));
    
    if (formErrors.location) {
      setFormErrors(prev => ({
        ...prev,
        location: ''
      }));
    }
  };

  // ============================================================
  // ✅ VALIDATION ET SAUVEGARDE
  // ============================================================

  const validateForm = () => {
    const errors = {};
    
    if (!formData.businessName.trim()) {
      errors.businessName = 'Le nom de l\'entreprise est requis';
    } else if (formData.businessName.trim().length < 2) {
      errors.businessName = 'Le nom doit contenir au moins 2 caractères';
    }
    
    if (!formData.description.trim()) {
      errors.description = 'La description est requise';
    } else if (formData.description.trim().length < 10) {
      errors.description = 'La description doit contenir au moins 10 caractères';
    }
    
    if (!formData.phone.trim()) {
      errors.phone = 'Le numéro de téléphone est requis';
    } else if (formData.phone.trim().length < 10) {
      errors.phone = 'Numéro de téléphone invalide';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveGeneralInfo = async () => {
    if (!validateForm()) {
      Alert.alert('Erreur', 'Veuillez corriger les erreurs dans le formulaire');
      return;
    }
    
    try {
      setSaving(true);
      console.log('💾 Sauvegarde des informations générales...');
      
      const updateData = {
        businessName: formData.businessName.trim(),
        description: formData.description.trim(),
        phone: formData.phone.trim(),
      };
      
      // Ajouter la localisation si elle a été modifiée
      if (formData.location) {
        updateData.location = formData.location;
      }
      
      const result = await sellerService.updateGeneralInfo(updateData);
      
      if (result.success) {
        setSeller(result.data.seller);
        Alert.alert('Succès', 'Informations mises à jour avec succès');
        console.log('✅ Informations générales sauvegardées');
      } else {
        Alert.alert('Erreur', result.error);
      }
    } catch (error) {
      console.error('❌ Erreur sauvegarde:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder les modifications');
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // 🎨 RENDU DES ONGLETS
  // ============================================================

  const renderTabButtons = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'general' && styles.activeTab]}
        onPress={() => setActiveTab('general')}
      >
        <Ionicons 
          name="business-outline" 
          size={20} 
          color={activeTab === 'general' ? colors.white : colors.primary} 
        />
        <Text style={[
          styles.tabText, 
          activeTab === 'general' && styles.activeTabText
        ]}>
          Informations générales
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.tab, activeTab === 'specialties' && styles.activeTab]}
        onPress={() => setActiveTab('specialties')}
      >
        <Ionicons 
          name="library-outline" 
          size={20} 
          color={activeTab === 'specialties' ? colors.white : colors.primary} 
        />
        <Text style={[
          styles.tabText, 
          activeTab === 'specialties' && styles.activeTabText
        ]}>
          Spécialités
        </Text>
        <View style={styles.specialtyCount}>
          <Text style={styles.specialtyCountText}>
            {seller?.specialties?.length || 0}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderGeneralInfoTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Informations de votre entreprise</Text>
      <Text style={styles.sectionSubtitle}>
        Modifiez les informations de base de votre profil vendeur
      </Text>
      
      <Input
        label="Nom de votre entreprise"
        placeholder="Ex: Électronique Martin, Garage Dupont..."
        value={formData.businessName}
        onChangeText={(value) => handleInputChange('businessName', value)}
        error={formErrors.businessName}
        required
        leftIcon="business-outline"
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
        leftIcon="call-outline"
      />
      
      {/* Section Localisation */}
      <View style={styles.locationSection}>
        <Text style={styles.inputLabel}>Localisation actuelle</Text>
        {seller?.location ? (
          <View style={styles.currentLocationCard}>
            <Ionicons name="location-outline" size={20} color={colors.primary} />
            <View style={styles.locationInfo}>
              <Text style={styles.locationAddress}>
                {seller.location.address}
              </Text>
              <Text style={styles.locationCity}>
                {seller.location.city}, {seller.location.postalCode}
              </Text>
            </View>
            <TouchableOpacity style={styles.editLocationButton}>
              <Ionicons name="pencil-outline" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.addLocationButton}>
            <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.addLocationText}>Ajouter une localisation</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <Button
        title="Sauvegarder les modifications"
        onPress={handleSaveGeneralInfo}
        loading={saving}
        style={styles.saveButton}
        leftIcon="checkmark-circle-outline"
      />
    </View>
  );

  const renderSpecialtiesTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.specialtiesHeader}>
        <View>
          <Text style={styles.sectionTitle}>Vos spécialités</Text>
          <Text style={styles.sectionSubtitle}>
            Gérez les catégories et sous-catégories de votre expertise
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.addSpecialtyButton}
          onPress={() => navigation.navigate('AddSpecialty')}
        >
          <Ionicons name="add" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>
      
      {seller?.specialties?.length > 0 ? (
        <View style={styles.specialtiesList}>
          {seller.specialties.map((specialty, index) => (
            <View key={specialty._id || index} style={styles.specialtyCard}>
              <View style={styles.specialtyHeader}>
                <View style={styles.specialtyInfo}>
                  <Text style={styles.specialtyCategory}>
                    {specialty.category}
                  </Text>
                  <Text style={styles.specialtySubCount}>
                    {specialty.subCategories?.length || 0} sous-catégorie(s)
                  </Text>
                </View>
                <View style={styles.specialtyActions}>
                  <TouchableOpacity 
                    style={styles.specialtyActionButton}
                    onPress={() => navigation.navigate('EditSpecialty', { specialty })}
                  >
                    <Ionicons name="pencil-outline" size={16} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.specialtyActionButton}
                    onPress={() => handleDeleteSpecialty(specialty._id)}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.subCategoriesContainer}>
                {specialty.subCategories?.map((subCategory, subIndex) => (
                  <View key={subIndex} style={styles.subCategoryChip}>
                    <Text style={styles.subCategoryText}>{subCategory}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptySpecialties}>
          <Ionicons name="library-outline" size={48} color={colors.gray[400]} />
          <Text style={styles.emptySpecialtiesTitle}>Aucune spécialité</Text>
          <Text style={styles.emptySpecialtiesText}>
            Ajoutez vos spécialités pour que les clients puissent vous trouver plus facilement
          </Text>
          <Button
            title="Ajouter ma première spécialité"
            onPress={() => navigation.navigate('AddSpecialty')}
            style={styles.emptySpecialtiesButton}
            leftIcon="add-circle-outline"
          />
        </View>
      )}
    </View>
  );

  // ============================================================
  // 🗑️ SUPPRESSION DE SPÉCIALITÉ
  // ============================================================

  const handleDeleteSpecialty = (specialtyId) => {
    Alert.alert(
      'Supprimer cette spécialité ?',
      'Cette action est irréversible. Êtes-vous sûr de vouloir supprimer cette spécialité ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive',
          onPress: () => deleteSpecialty(specialtyId)
        }
      ]
    );
  };

  const deleteSpecialty = async (specialtyId) => {
    try {
      console.log('🗑️ Suppression de la spécialité:', specialtyId);
      
      const result = await sellerService.removeSpecialty(specialtyId);
      
      if (result.success) {
        // Mettre à jour les spécialités localement
        setSeller(prev => ({
          ...prev,
          specialties: result.data.specialties
        }));
        
        Alert.alert('Succès', 'Spécialité supprimée avec succès');
        console.log('✅ Spécialité supprimée');
      } else {
        Alert.alert('Erreur', result.error);
      }
    } catch (error) {
      console.error('❌ Erreur suppression spécialité:', error);
      Alert.alert('Erreur', 'Impossible de supprimer la spécialité');
    }
  };

  // ============================================================
  // 🎨 RENDU PRINCIPAL
  // ============================================================

  if (loading) {
    return (
      <Loading 
        fullScreen 
        gradient 
        text="Chargement de votre profil..." 
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <LinearGradient
        colors={getGradientString('primary')}
        style={styles.header}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Ionicons name="settings-outline" size={32} color={colors.white} />
          <Text style={styles.headerTitle}>Modifier mon profil</Text>
          <Text style={styles.headerSubtitle}>
            {seller?.businessName || 'Mon entreprise'}
          </Text>
        </View>
      </LinearGradient>

      {/* Onglets */}
      {renderTabButtons()}

      {/* Contenu */}
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          {activeTab === 'general' ? renderGeneralInfoTab() : renderSpecialtiesTab()}
        </ScrollView>
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
  
  // Onglets
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    marginHorizontal: 20,
    marginTop: -15,
    borderRadius: 12,
    padding: 4,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 6,
    textAlign: 'center',
  },
  activeTabText: {
    color: colors.white,
  },
  specialtyCount: {
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
    minWidth: 20,
    alignItems: 'center',
  },
  specialtyCountText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.primary,
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
  tabContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
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
    marginBottom: 24,
    lineHeight: 20,
  },
  
  // Localisation
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  locationSection: {
    marginBottom: 24,
  },
  currentLocationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[50],
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  locationInfo: {
    flex: 1,
    marginLeft: 12,
  },
  locationAddress: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  locationCity: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 2,
  },
  editLocationButton: {
    padding: 8,
  },
  addLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray[50],
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  addLocationText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 8,
  },
  
  // Spécialités
  specialtiesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  addSpecialtyButton: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  specialtiesList: {
    gap: 16,
  },
  specialtyCard: {
    backgroundColor: colors.gray[50],
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  specialtyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  specialtyInfo: {
    flex: 1,
  },
  specialtyCategory: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    textTransform: 'capitalize',
  },
  specialtySubCount: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 2,
  },
  specialtyActions: {
    flexDirection: 'row',
    gap: 8,
  },
  specialtyActionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.white,
  },
  subCategoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  subCategoryChip: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  subCategoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
  },
  
  // État vide
  emptySpecialties: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptySpecialtiesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySpecialtiesText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptySpecialtiesButton: {
    minWidth: 200,
  },
  
  // Boutons
  saveButton: {
    marginTop: 24,
  },
});

export default EditSellerProfileScreen;