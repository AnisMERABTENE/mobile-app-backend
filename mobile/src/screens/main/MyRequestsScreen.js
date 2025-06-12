import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../context/AuthContext';
import Loading from '../../components/Loading';
import RequestService from '../../services/requestService';
import SellerService from '../../services/sellerService';
import colors, { getGradientString } from '../../styles/colors';

const MyRequestsScreen = ({ navigation }) => {
  const { user } = useAuth();
  
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('all');
  
  // ✅ NOUVEAU : Gestion du mode vendeur/client
  const [hasSellerProfile, setHasSellerProfile] = useState(false);
  const [sellerProfile, setSellerProfile] = useState(null);
  const [currentMode, setCurrentMode] = useState('client'); // 'client' ou 'seller'
  const [switchLoading, setSwitchLoading] = useState(false);

  useEffect(() => {
    checkSellerProfileAndLoadData();
  }, []);

  // ✅ NOUVEAU : Fonction pour vérifier le profil vendeur et charger les données
  const checkSellerProfileAndLoadData = async () => {
    try {
      setLoading(true);
      
      // Vérifier si l'utilisateur a un profil vendeur
      const sellerResult = await SellerService.getMyProfile();
      
      if (sellerResult.success) {
        setHasSellerProfile(true);
        setSellerProfile(sellerResult.data);
        console.log('✅ Profil vendeur détecté:', sellerResult.data.businessName);
        
        // Si l'utilisateur est vendeur, démarrer en mode vendeur par défaut
        setCurrentMode('seller');
      } else {
        setHasSellerProfile(false);
        setSellerProfile(null);
        setCurrentMode('client');
        console.log('✅ Utilisateur client uniquement');
      }
      
      // Charger les données selon le mode
      await loadDataForMode(hasSellerProfile ? 'seller' : 'client');
      
    } catch (error) {
      console.error('❌ Erreur vérification profil:', error);
      setHasSellerProfile(false);
      setCurrentMode('client');
      await loadDataForMode('client');
    } finally {
      setLoading(false);
    }
  };

  // ✅ NOUVEAU : Fonction pour changer de mode
  const switchMode = async (newMode) => {
    if (newMode === currentMode) return;
    
    try {
      setSwitchLoading(true);
      setCurrentMode(newMode);
      await loadDataForMode(newMode);
    } catch (error) {
      console.error('❌ Erreur changement mode:', error);
    } finally {
      setSwitchLoading(false);
    }
  };

  // ✅ MODIFIÉ : Charger les données selon le mode
  const loadDataForMode = async (mode) => {
    try {
      if (mode === 'seller') {
        console.log('📋 Mode vendeur : Chargement des demandes reçues...');
        
        // TODO: Créer une API pour récupérer les demandes reçues par le vendeur
        // Pour l'instant, on simule
        setRequests([]);
        setStats({
          total: 0,
          active: 0,
          totalViews: 0,
          totalResponses: 0
        });
        
      } else {
        console.log('📋 Mode client : Chargement des demandes créées...');
        
        const [requestsResult, statsResult] = await Promise.all([
          RequestService.getMyRequests(),
          RequestService.getMyStats(),
        ]);

        if (requestsResult.success) {
          setRequests(requestsResult.data.requests);
          console.log('✅ Demandes client chargées:', requestsResult.data.requests.length);
        } else {
          console.error('❌ Erreur chargement demandes client:', requestsResult.error);
          setRequests([]);
        }

        if (statsResult.success) {
          setStats(statsResult.data);
          console.log('✅ Stats client chargées');
        } else {
          setStats({
            total: 0,
            active: 0,
            totalViews: 0,
            totalResponses: 0
          });
        }
      }
    } catch (error) {
      console.error('❌ Erreur chargement données mode:', error);
      setRequests([]);
      setStats({
        total: 0,
        active: 0,
        totalViews: 0,
        totalResponses: 0
      });
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDataForMode(currentMode);
    setRefreshing(false);
  };

  const handleRequestPress = (request) => {
    console.log('👁️ Ouverture détails demande:', request.title);
    
    navigation.navigate('RequestDetail', {
      requestId: request._id,
      request: request
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return colors.success;
      case 'completed':
        return colors.primary;
      case 'cancelled':
        return colors.gray[500];
      case 'expired':
        return colors.warning;
      default:
        return colors.gray[500];
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'completed':
        return 'Terminée';
      case 'cancelled':
        return 'Annulée';
      case 'expired':
        return 'Expirée';
      default:
        return status;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getFilteredRequests = () => {
    if (selectedFilter === 'all') return requests;
    return requests.filter(request => request.status === selectedFilter);
  };

  const filters = [
    { id: 'all', label: 'Toutes', count: requests.length },
    { id: 'active', label: 'Actives', count: requests.filter(r => r.status === 'active').length },
    { id: 'completed', label: 'Terminées', count: requests.filter(r => r.status === 'completed').length },
  ];

  if (loading) {
    return <Loading fullScreen text="Chargement..." />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={getGradientString('primary')}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>
          {currentMode === 'seller' ? 'Demandes reçues' : 'Mes demandes'}
        </Text>
        <Text style={styles.headerSubtitle}>
          {currentMode === 'seller' 
            ? 'Notifications et demandes dans votre zone'
            : 'Gérez vos demandes en cours'
          }
        </Text>
        
        {/* ✅ NOUVEAU : Switch vendeur/client */}
        {hasSellerProfile && (
          <View style={styles.modeSwitch}>
            <TouchableOpacity
              style={[
                styles.modeSwitchButton,
                currentMode === 'client' && styles.modeSwitchButtonActive
              ]}
              onPress={() => switchMode('client')}
              disabled={switchLoading}
            >
              <Ionicons 
                name="person" 
                size={16} 
                color={currentMode === 'client' ? colors.primary : colors.white} 
              />
              <Text style={[
                styles.modeSwitchText,
                currentMode === 'client' && styles.modeSwitchTextActive
              ]}>
                Mode Client
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.modeSwitchButton,
                currentMode === 'seller' && styles.modeSwitchButtonActive
              ]}
              onPress={() => switchMode('seller')}
              disabled={switchLoading}
            >
              <Ionicons 
                name="business" 
                size={16} 
                color={currentMode === 'seller' ? colors.primary : colors.white} 
              />
              <Text style={[
                styles.modeSwitchText,
                currentMode === 'seller' && styles.modeSwitchTextActive
              ]}>
                Mode Vendeur
              </Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Badge d'info du mode actuel */}
        <View style={styles.modeBadge}>
          <Ionicons 
            name={currentMode === 'seller' ? 'business' : 'person'} 
            size={14} 
            color={colors.white} 
          />
          <Text style={styles.modeBadgeText}>
            {currentMode === 'seller' 
              ? `${sellerProfile?.businessName || 'Vendeur'}`
              : `${user?.firstName} ${user?.lastName}`
            }
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Loading switch */}
        {switchLoading && (
          <View style={styles.switchLoadingContainer}>
            <Text style={styles.switchLoadingText}>
              Changement vers le mode {currentMode === 'seller' ? 'vendeur' : 'client'}...
            </Text>
          </View>
        )}

        {/* Statistiques */}
        {stats && (
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.total || 0}</Text>
              <Text style={styles.statLabel}>
                {currentMode === 'seller' ? 'Reçues' : 'Créées'}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.active || 0}</Text>
              <Text style={styles.statLabel}>Actives</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.totalViews || 0}</Text>
              <Text style={styles.statLabel}>Vues</Text>
            </View>
          </View>
        )}

        {/* Filtres */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filtersContainer}
          contentContainerStyle={styles.filtersContent}
        >
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.filterButton,
                selectedFilter === filter.id && styles.activeFilterButton
              ]}
              onPress={() => setSelectedFilter(filter.id)}
            >
              <Text style={[
                styles.filterText,
                selectedFilter === filter.id && styles.activeFilterText
              ]}>
                {filter.label} ({filter.count})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Liste des demandes */}
        <View style={styles.requestsList}>
          {getFilteredRequests().length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons 
                name={currentMode === 'seller' ? 'notifications-outline' : 'document-outline'} 
                size={64} 
                color={colors.gray[400]} 
              />
              <Text style={styles.emptyTitle}>
                {currentMode === 'seller' ? 'Aucune demande reçue' : 'Aucune demande créée'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {currentMode === 'seller' 
                  ? 'Les demandes correspondant à vos spécialités s\'afficheront ici automatiquement'
                  : selectedFilter === 'all' 
                    ? 'Vous n\'avez pas encore créé de demande. Allez dans l\'onglet "Nouvelle demande" pour commencer.'
                    : `Aucune demande ${filters.find(f => f.id === selectedFilter)?.label.toLowerCase()}`
                }
              </Text>
              
              {/* Boutons d'aide */}
              {currentMode === 'seller' ? (
                <TouchableOpacity 
                  style={styles.helpButton}
                  onPress={() => Alert.alert(
                    'Comment ça marche ?',
                    'En tant que vendeur, vous recevrez automatiquement des notifications quand des clients publient des demandes dans votre zone et vos spécialités.\n\nVous pouvez aussi passer en mode "Client" pour créer vos propres demandes.',
                    [{ text: 'Compris' }]
                  )}
                >
                  <Text style={styles.helpButtonText}>Comment ça marche ?</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={styles.helpButton}
                  onPress={() => Alert.alert(
                    'Créer une demande',
                    'Pour créer votre première demande, allez dans l\'onglet "Nouvelle demande" en bas de l\'écran.',
                    [{ text: 'Compris' }]
                  )}
                >
                  <Text style={styles.helpButtonText}>Comment créer une demande ?</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            getFilteredRequests().map((request) => (
              <TouchableOpacity
                key={request._id}
                style={styles.requestCard}
                onPress={() => handleRequestPress(request)}
                activeOpacity={0.7}
              >
                {/* Header de la carte */}
                <View style={styles.requestHeader}>
                  <View style={styles.requestTitleContainer}>
                    <Text style={styles.requestTitle} numberOfLines={2}>
                      {request.title}
                    </Text>
                    <View style={styles.requestMeta}>
                      <Text style={styles.requestDate}>
                        {formatDate(request.createdAt)}
                      </Text>
                      <View style={styles.separator} />
                      <View style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(request.status) + '20' }
                      ]}>
                        <Text style={[
                          styles.statusText,
                          { color: getStatusColor(request.status) }
                        ]}>
                          {getStatusText(request.status)}
                        </Text>
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.navigationIndicator}>
                    <Ionicons name="chevron-forward" size={20} color={colors.gray[400]} />
                  </View>
                </View>

                {/* Description */}
                <Text style={styles.requestDescription} numberOfLines={3}>
                  {request.description}
                </Text>

                {/* Photos */}
                {request.photos && request.photos.length > 0 && (
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.photosContainer}
                  >
                    {request.photos.slice(0, 3).map((photo, index) => (
                      <Image
                        key={index}
                        source={{ uri: photo.url }}
                        style={styles.requestPhoto}
                      />
                    ))}
                    {request.photos.length > 3 && (
                      <View style={styles.morePhotosIndicator}>
                        <Text style={styles.morePhotosText}>
                          +{request.photos.length - 3}
                        </Text>
                      </View>
                    )}
                  </ScrollView>
                )}

                {/* Footer de la carte */}
                <View style={styles.requestFooter}>
                  <View style={styles.requestStats}>
                    <View style={styles.statItem}>
                      <Ionicons name="eye-outline" size={16} color={colors.gray[500]} />
                      <Text style={styles.statText}>{request.viewCount || 0} vues</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Ionicons name="location-outline" size={16} color={colors.gray[500]} />
                      <Text style={styles.statText}>{request.radius} km</Text>
                    </View>
                    {request.responseCount > 0 && (
                      <View style={styles.statItem}>
                        <Ionicons name="chatbubble-outline" size={16} color={colors.success} />
                        <Text style={[styles.statText, { color: colors.success }]}>
                          {request.responseCount} réponse{request.responseCount > 1 ? 's' : ''}
                        </Text>
                      </View>
                    )}
                  </View>
                  
                  <Text style={styles.viewDetailsText}>Voir détails</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

// ✅ STYLES AVEC NOUVEAUX ÉLÉMENTS
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.white,
    opacity: 0.9,
    marginBottom: 16,
  },
  
  // ✅ NOUVEAUX STYLES POUR LE SWITCH
  modeSwitch: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 25,
    padding: 4,
    marginBottom: 12,
  },
  modeSwitchButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  modeSwitchButtonActive: {
    backgroundColor: colors.white,
  },
  modeSwitchText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  modeSwitchTextActive: {
    color: colors.primary,
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  modeBadgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
  },
  switchLoadingContainer: {
    padding: 16,
    backgroundColor: colors.info + '20',
    marginHorizontal: 24,
    marginTop: 16,
    borderRadius: 8,
  },
  switchLoadingText: {
    color: colors.info,
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  
  // Styles existants...
  content: {
    flex: 1,
    marginTop: -15,
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 24,
    paddingBottom: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.gray[50],
    borderRadius: 12,
    marginHorizontal: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 4,
  },
  filtersContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  filtersContent: {
    paddingRight: 24,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.gray[100],
    borderRadius: 20,
    marginRight: 12,
  },
  activeFilterButton: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  activeFilterText: {
    color: colors.white,
  },
  requestsList: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  helpButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  helpButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  requestCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.gray[100],
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  requestTitleContainer: {
    flex: 1,
  },
  requestTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  requestMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestDate: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  separator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gray[400],
    marginHorizontal: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  navigationIndicator: {
    marginLeft: 12,
    alignSelf: 'center',
  },
  requestDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  photosContainer: {
    marginBottom: 16,
  },
  requestPhoto: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: colors.gray[200],
  },
  morePhotosIndicator: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: colors.gray[300],
    justifyContent: 'center',
    alignItems: 'center',
  },
  morePhotosText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gray[600],
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  requestStats: {
    flexDirection: 'row',
    flex: 1,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    fontSize: 12,
    color: colors.text.secondary,
    marginLeft: 4,
  },
  viewDetailsText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
});

export default MyRequestsScreen;