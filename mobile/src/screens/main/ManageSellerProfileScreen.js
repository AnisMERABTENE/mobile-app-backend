const loadReceivedRequests = async () => {
    setLoadingRequests(true);
    try {
      const result = await SellerService.getReceivedRequests();
      if (result.success) {
        setReceivedRequestsData(result.data);
        console.log('✅ Demandes reçues chargées:', result.data);
      } else {
        console.log('❌ Erreur demandes:', result.error);
      }
    } catch (error) {
      console.error('❌ Erreur:', error);
    } finally {
      setLoadingRequests(false);
    }
  };import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Switch,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../context/AuthContext';
import { useCategories } from '../../context/CategoriesContext';
import SellerService from '../../services/sellerService';
import RequestService from '../../services/requestService';
import Loading from '../../components/Loading';
import Button from '../../components/Button';
// import AddCategoryModal from '../../components/AddCategoryModal'; // TEMPORAIREMENT COMMENTÉ
import colors, { getGradientString } from '../../styles/colors';

const ManageSellerProfileScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { categories } = useCategories();
  
  // États pour les données
  const [sellerProfile, setSellerProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [receivedRequestsData, setReceivedRequestsData] = useState(null);
  const [loadingRequests, setLoadingRequests] = useState(false);
  
  // États UI
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTab, setCurrentTab] = useState('profile'); // 'profile', 'categories', 'stats', 'requests'
  const [isEditing, setIsEditing] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  
  // États d'édition
  const [editData, setEditData] = useState({
    businessName: '',
    description: '',
    phone: '',
    isAvailable: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  // Charger les demandes reçues quand on passe sur l'onglet Demandes
  useEffect(() => {
    if (currentTab === 'requests' && !receivedRequestsData && !loadingRequests) {
      loadReceivedRequests();
    }
  }, [currentTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Charger le profil vendeur
      const profileResult = await SellerService.getMyProfile();
      if (profileResult.success) {
        setSellerProfile(profileResult.data);
        setEditData({
          businessName: profileResult.data.businessName || '',
          description: profileResult.data.description || '',
          phone: profileResult.data.phone || '',
          isAvailable: profileResult.data.isAvailable || true,
        });
      }
      
      // Charger les statistiques
      const statsResult = await SellerService.getStats();
      if (statsResult.success) {
        console.log('✅ Stats reçues:', statsResult.data);
        setStats(statsResult.data);
      } else {
        console.log('❌ Erreur stats:', statsResult.error);
      }
      
      // Charger les demandes (à implémenter avec une nouvelle route backend)
      // const requestsResult = await RequestService.getReceivedRequests();
      // if (requestsResult.success) {
      //   setReceivedRequests(requestsResult.data);
      // }
      
    } catch (error) {
      console.error('❌ Erreur chargement données vendeur:', error);
      Alert.alert('Erreur', 'Impossible de charger les données');
    } finally {
      setLoading(false);
    }
  };

  const loadReceivedRequests = async () => {
    setLoadingRequests(true);
    try {
      const result = await SellerService.getReceivedRequests();
      if (result.success) {
        setReceivedRequestsData(result.data);
        console.log('✅ Demandes reçues chargées:', result.data);
      } else {
        console.log('❌ Erreur demandes:', result.error);
      }
    } catch (error) {
      console.error('❌ Erreur:', error);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      
      const result = await SellerService.updateProfile(editData);
      
      if (result.success) {
        setSellerProfile(result.data);
        setIsEditing(false);
        Alert.alert('✅ Succès', 'Profil mis à jour avec succès');
      } else {
        Alert.alert('❌ Erreur', result.error || 'Erreur lors de la mise à jour');
      }
    } catch (error) {
      Alert.alert('❌ Erreur', 'Impossible de mettre à jour le profil');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAvailability = async () => {
    try {
      const result = await SellerService.toggleAvailability();
      if (result.success) {
        setSellerProfile(prev => ({
          ...prev,
          isAvailable: result.data.isAvailable
        }));
        Alert.alert(
          '✅ Statut mis à jour', 
          `Vous êtes maintenant ${result.data.isAvailable ? 'disponible' : 'indisponible'}`
        );
      }
    } catch (error) {
      Alert.alert('❌ Erreur', 'Impossible de changer le statut');
    }
  };

  const handleDeleteSpecialty = (index) => {
    Alert.alert(
      'Supprimer la spécialité',
      'Êtes-vous sûr de vouloir supprimer cette spécialité ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive',
          onPress: async () => {
            const newSpecialties = [...sellerProfile.specialties];
            newSpecialties.splice(index, 1);
            
            try {
              setLoading(true);
              const result = await SellerService.updateProfile({ specialties: newSpecialties });
              
              if (result.success) {
                setSellerProfile(result.data);
                Alert.alert('✅ Succès', 'Spécialité supprimée avec succès');
              } else {
                Alert.alert('❌ Erreur', result.error || 'Erreur lors de la suppression');
              }
            } catch (error) {
              Alert.alert('❌ Erreur', 'Impossible de supprimer la spécialité');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleAddSpecialty = async (newSpecialty) => {
    try {
      setLoading(true);
      
      // Vérifier si la catégorie existe déjà
      const existingSpecialty = sellerProfile.specialties.find(
        spec => spec.category === newSpecialty.category
      );

      let updatedSpecialties;

      if (existingSpecialty) {
        // Ajouter les sous-catégories à la spécialité existante
        updatedSpecialties = sellerProfile.specialties.map(spec => {
          if (spec.category === newSpecialty.category) {
            const combinedSubCategories = [
              ...spec.subCategories,
              ...newSpecialty.subCategories
            ];
            // Supprimer les doublons
            const uniqueSubCategories = [...new Set(combinedSubCategories)];
            return {
              ...spec,
              subCategories: uniqueSubCategories
            };
          }
          return spec;
        });
      } else {
        // Ajouter une nouvelle spécialité
        updatedSpecialties = [...sellerProfile.specialties, newSpecialty];
      }

      const result = await SellerService.updateProfile({ specialties: updatedSpecialties });
      
      if (result.success) {
        setSellerProfile(result.data);
        Alert.alert('✅ Succès', 'Spécialité ajoutée avec succès');
      } else {
        Alert.alert('❌ Erreur', result.error || 'Erreur lors de l\'ajout');
      }
    } catch (error) {
      Alert.alert('❌ Erreur', 'Impossible d\'ajouter la spécialité');
    } finally {
      setLoading(false);
    }
  };

  const renderTabButtons = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[styles.tabButton, currentTab === 'profile' && styles.activeTab]}
        onPress={() => setCurrentTab('profile')}
      >
        <Ionicons 
          name="person-outline" 
          size={20} 
          color={currentTab === 'profile' ? colors.white : colors.gray[600]} 
        />
        <Text style={[styles.tabText, currentTab === 'profile' && styles.activeTabText]}>
          Profil
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tabButton, currentTab === 'categories' && styles.activeTab]}
        onPress={() => setCurrentTab('categories')}
      >
        <Ionicons 
          name="pricetags-outline" 
          size={20} 
          color={currentTab === 'categories' ? colors.white : colors.gray[600]} 
        />
        <Text style={[styles.tabText, currentTab === 'categories' && styles.activeTabText]}>
          Catégories
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tabButton, currentTab === 'stats' && styles.activeTab]}
        onPress={() => setCurrentTab('stats')}
      >
        <Ionicons 
          name="bar-chart-outline" 
          size={20} 
          color={currentTab === 'stats' ? colors.white : colors.gray[600]} 
        />
        <Text style={[styles.tabText, currentTab === 'stats' && styles.activeTabText]}>
          Statistiques
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tabButton, currentTab === 'requests' && styles.activeTab]}
        onPress={() => setCurrentTab('requests')}
      >
        <Ionicons 
          name="mail-outline" 
          size={20} 
          color={currentTab === 'requests' ? colors.white : colors.gray[600]} 
        />
        <Text style={[styles.tabText, currentTab === 'requests' && styles.activeTabText]}>
          Demandes
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderProfileTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Informations générales</Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setIsEditing(!isEditing)}
          >
            <Ionicons 
              name={isEditing ? "close" : "pencil"} 
              size={20} 
              color={colors.primary} 
            />
          </TouchableOpacity>
        </View>

        {isEditing ? (
          <View style={styles.editForm}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nom du magasin</Text>
              <TextInput
                style={styles.textInput}
                value={editData.businessName}
                onChangeText={(text) => setEditData(prev => ({...prev, businessName: text}))}
                placeholder="Nom de votre entreprise"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={editData.description}
                onChangeText={(text) => setEditData(prev => ({...prev, description: text}))}
                placeholder="Décrivez vos services..."
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Téléphone</Text>
              <TextInput
                style={styles.textInput}
                value={editData.phone}
                onChangeText={(text) => setEditData(prev => ({...prev, phone: text}))}
                placeholder="Votre numéro de téléphone"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.actionButtons}>
              <Button
                title="Annuler"
                variant="outline"
                onPress={() => setIsEditing(false)}
                style={styles.actionButton}
              />
              <Button
                title="Sauvegarder"
                variant="primary"
                onPress={handleSaveProfile}
                style={styles.actionButton}
              />
            </View>
          </View>
        ) : (
          <View style={styles.profileInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nom du magasin</Text>
              <Text style={styles.infoValue}>{sellerProfile?.businessName}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Description</Text>
              <Text style={styles.infoValue}>{sellerProfile?.description}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Téléphone</Text>
              <Text style={styles.infoValue}>{sellerProfile?.phone}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Statut</Text>
              <View style={styles.statusContainer}>
                <Switch
                  value={sellerProfile?.isAvailable}
                  onValueChange={handleToggleAvailability}
                  trackColor={{ false: colors.gray[300], true: colors.primary + '40' }}
                  thumbColor={sellerProfile?.isAvailable ? colors.primary : colors.gray[400]}
                />
                <Text style={styles.statusText}>
                  {sellerProfile?.isAvailable ? 'Disponible' : 'Indisponible'}
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );

  const renderCategoriesTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Mes spécialités</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => Alert.alert('Info', 'Ajout de catégorie temporairement désactivé pour debug...')}
          >
            <Ionicons name="add" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {sellerProfile?.specialties?.map((specialty, index) => (
          <View key={index} style={styles.specialtyCard}>
            <View style={styles.specialtyHeader}>
              <Text style={styles.specialtyCategory}>{specialty.category}</Text>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteSpecialty(index)}
              >
                <Ionicons name="trash-outline" size={16} color={colors.error} />
              </TouchableOpacity>
            </View>
            <View style={styles.subCategoriesContainer}>
              {specialty.subCategories?.map((subCat, subIndex) => (
                <View key={subIndex} style={styles.subCategoryChip}>
                  <Text style={styles.subCategoryText}>{subCat}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        {(!sellerProfile?.specialties || sellerProfile.specialties.length === 0) && (
          <Text style={styles.emptyText}>Aucune spécialité configurée</Text>
        )}
      </View>
    </View>
  );

  const renderStatsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mes statistiques</Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="eye" size={24} color={colors.primary} />
            <Text style={styles.statNumber}>{stats?.views || stats?.totalViews || 0}</Text>
            <Text style={styles.statLabel}>Vues du profil</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="mail" size={24} color={colors.success} />
            <Text style={styles.statNumber}>{stats?.requests || stats?.totalRequests || 0}</Text>
            <Text style={styles.statLabel}>Demandes reçues</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
            <Text style={styles.statNumber}>{stats?.completed || stats?.completedServices || 0}</Text>
            <Text style={styles.statLabel}>Services réalisés</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="star" size={24} color={colors.warning} />
            <Text style={styles.statNumber}>{stats?.rating || stats?.averageRating || 0}</Text>
            <Text style={styles.statLabel}>Note moyenne</Text>
          </View>
        </View>

        <View style={styles.statsDetails}>
          <Text style={styles.statsDetailsTitle}>Détails</Text>
          
          {/* Debug des données reçues */}
          {__DEV__ && (
            <View style={styles.debugContainer}>
              <Text style={styles.debugTitle}>🔍 Debug Stats:</Text>
              <Text style={styles.debugText}>{JSON.stringify(stats, null, 2)}</Text>
            </View>
          )}
          
          <View style={styles.statsDetailsItem}>
            <Text style={styles.statsDetailsLabel}>Compte créé le</Text>
            <Text style={styles.statsDetailsValue}>
              {sellerProfile?.createdAt ? new Date(sellerProfile.createdAt).toLocaleDateString() : '-'}
            </Text>
          </View>
          <View style={styles.statsDetailsItem}>
            <Text style={styles.statsDetailsLabel}>Dernière connexion</Text>
            <Text style={styles.statsDetailsValue}>
              {sellerProfile?.lastActiveAt ? new Date(sellerProfile.lastActiveAt).toLocaleDateString() : '-'}
            </Text>
          </View>
          <View style={styles.statsDetailsItem}>
            <Text style={styles.statsDetailsLabel}>Taux de réponse</Text>
            <Text style={styles.statsDetailsValue}>
              {stats?.responseRate || 0}%
            </Text>
          </View>
          <View style={styles.statsDetailsItem}>
            <Text style={styles.statsDetailsLabel}>Statut</Text>
            <Text style={styles.statsDetailsValue}>
              {sellerProfile?.isAvailable ? '🟢 Disponible' : '🔴 Indisponible'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderRequestsTab = () => {
    return (
      <View style={styles.tabContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Demandes reçues</Text>
          
          {loadingRequests ? (
            <View style={styles.loadingContainer}>
              <Text>Chargement des demandes...</Text>
            </View>
          ) : (
            <>
              <View style={styles.requestsStats}>
                <View style={styles.requestStatItem}>
                  <Text style={styles.requestStatNumber}>
                    {receivedRequestsData?.total || 0}
                  </Text>
                  <Text style={styles.requestStatLabel}>Total reçues</Text>
                </View>
                <View style={styles.requestStatItem}>
                  <Text style={styles.requestStatNumber}>
                    {receivedRequestsData?.byStatus?.active || 0}
                  </Text>
                  <Text style={styles.requestStatLabel}>Actives</Text>
                </View>
                <View style={styles.requestStatItem}>
                  <Text style={styles.requestStatNumber}>
                    {receivedRequestsData?.byStatus?.completed || 0}
                  </Text>
                  <Text style={styles.requestStatLabel}>Complétées</Text>
                </View>
                <View style={styles.requestStatItem}>
                  <Text style={styles.requestStatNumber}>
                    {receivedRequestsData?.byStatus?.cancelled || 0}
                  </Text>
                  <Text style={styles.requestStatLabel}>Annulées</Text>
                </View>
              </View>

              {/* Debug des données reçues */}
              {__DEV__ && receivedRequestsData && (
                <View style={styles.debugContainer}>
                  <Text style={styles.debugTitle}>🔍 Debug Demandes:</Text>
                  <Text style={styles.debugText}>
                    Total: {receivedRequestsData.total}{'\n'}
                    Requests: {receivedRequestsData.requests?.length || 0}
                  </Text>
                </View>
              )}

              {receivedRequestsData?.requests?.length > 0 ? (
                <View style={styles.requestsList}>
                  <Text style={styles.requestsListTitle}>Dernières demandes:</Text>
                  {receivedRequestsData.requests.slice(0, 3).map((request, index) => (
                    <View key={index} style={styles.requestItem}>
                      <Text style={styles.requestTitle}>{request.title}</Text>
                      <Text style={styles.requestDistance}>
                        📍 {request.distanceFromSeller}km • Score: {request.matchScore}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyText}>
                  Aucune demande reçue pour le moment
                </Text>
              )}
              
              <Button
                title="Voir toutes les demandes"
                variant="outline"
                onPress={() => Alert.alert('Info', 'Redirection vers la liste complète...')}
                style={styles.viewAllButton}
              />
            </>
          )}
        </View>
      </View>
    );
  };

  if (loading && !sellerProfile) {
    return <Loading fullScreen text="Chargement du profil vendeur..." />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={getGradientString('primary')}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.white} />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Gérer mon profil</Text>
          
          <View style={styles.headerSpacer} />
        </View>
      </LinearGradient>

      {/* Onglets */}
      {renderTabButtons()}

      {/* Contenu */}
      <ScrollView
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {currentTab === 'profile' && renderProfileTab()}
        {currentTab === 'categories' && renderCategoriesTab()}
        {currentTab === 'stats' && renderStatsTab()}
        {currentTab === 'requests' && renderRequestsTab()}
      </ScrollView>

      {/* Modal d'ajout de catégorie - TEMPORAIREMENT COMMENTÉ */}
      {/* <AddCategoryModal
        visible={showAddCategoryModal}
        onClose={() => setShowAddCategoryModal(false)}
        onAdd={handleAddSpecialty}
        existingSpecialties={sellerProfile?.specialties || []}
      /> */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 5,
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 12,
    color: colors.gray[600],
    fontWeight: '500',
  },
  activeTabText: {
    color: colors.white,
  },
  scrollContainer: {
    flex: 1,
  },
  tabContent: {
    padding: 20,
  },
  section: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.gray[800],
  },
  editButton: {
    padding: 8,
  },
  addButton: {
    padding: 8,
  },
  editForm: {
    gap: 15,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[700],
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: colors.white,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
  },
  profileInfo: {
    gap: 15,
  },
  infoRow: {
    gap: 5,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[600],
  },
  infoValue: {
    fontSize: 16,
    color: colors.gray[800],
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusText: {
    fontSize: 16,
    color: colors.gray[800],
    fontWeight: '500',
  },
  specialtyCard: {
    backgroundColor: colors.gray[50],
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  specialtyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  specialtyCategory: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.gray[800],
  },
  deleteButton: {
    padding: 5,
  },
  subCategoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  subCategoryChip: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  subCategoryText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
    marginBottom: 20,
  },
  statCard: {
    width: '45%',
    backgroundColor: colors.gray[50],
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    gap: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.gray[800],
  },
  statLabel: {
    fontSize: 12,
    color: colors.gray[600],
    textAlign: 'center',
  },
  statsDetails: {
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
    paddingTop: 20,
  },
  statsDetailsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.gray[800],
    marginBottom: 15,
  },
  statsDetailsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statsDetailsLabel: {
    fontSize: 14,
    color: colors.gray[600],
  },
  statsDetailsValue: {
    fontSize: 14,
    color: colors.gray[800],
    fontWeight: '500',
  },
  requestsStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.gray[50],
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
  },
  requestStatItem: {
    alignItems: 'center',
    gap: 5,
  },
  requestStatNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  requestStatLabel: {
    fontSize: 12,
    color: colors.gray[600],
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: colors.gray[500],
    fontStyle: 'italic',
    marginVertical: 20,
  },
  viewAllButton: {
    marginTop: 10,
  },
  debugContainer: {
    backgroundColor: colors.gray[100],
    padding: 10,
    borderRadius: 8,
    marginVertical: 10,
  },
  debugTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.gray[600],
    marginBottom: 5,
  },
  debugText: {
    fontSize: 10,
    color: colors.gray[500],
    fontFamily: 'monospace',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  requestsList: {
    marginTop: 15,
  },
  requestsListTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[800],
    marginBottom: 10,
  },
  requestItem: {
    backgroundColor: colors.gray[50],
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  requestTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray[800],
    marginBottom: 4,
  },
  requestDistance: {
    fontSize: 12,
    color: colors.gray[600],
  },
});

export default ManageSellerProfileScreen;