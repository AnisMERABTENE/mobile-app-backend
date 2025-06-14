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
  Switch,
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
  
  // ✅ NOUVEAU : États pour le mode dual
  const [viewMode, setViewMode] = useState('client'); // 'client' ou 'seller'
  const [hasSellerProfile, setHasSellerProfile] = useState(false);
  
  // États existants
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('all');
  
  // ✅ NOUVEAU : États pour mode vendeur
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [sellerStats, setSellerStats] = useState(null);

  useEffect(() => {
    checkSellerProfile();
    loadData();
  }, []);

  // ✅ NOUVEAU : Recharger quand le mode change
  useEffect(() => {
    if (hasSellerProfile) {
      loadData();
    }
  }, [viewMode]);

  // ✅ NOUVEAU : Vérifier si l'utilisateur a un profil vendeur
  const checkSellerProfile = async () => {
    try {
      const result = await SellerService.getMyProfile();
      if (result.success) {
        setHasSellerProfile(true);
        console.log('✅ Profil vendeur trouvé:', result.data.businessName);
      } else {
        setHasSellerProfile(false);
        setViewMode('client'); // Force le mode client si pas de profil vendeur
        console.log('ℹ️ Pas de profil vendeur');
      }
    } catch (error) {
      setHasSellerProfile(false);
      setViewMode('client');
      console.log('ℹ️ Pas de profil vendeur (normal)');
    }
  };

  // ✅ MODIFIÉ : Fonction de chargement adaptée au mode
  const loadData = async () => {
    try {
      setLoading(true);
      
      if (viewMode === 'client') {
        // Mode client : charger mes demandes créées (logique existante)
        await loadClientData();
      } else if (viewMode === 'seller' && hasSellerProfile) {
        // Mode vendeur : charger les demandes reçues
        await loadSellerData();
      }
      
    } catch (error) {
      console.error('❌ Erreur loadData:', error);
      Alert.alert('Erreur', 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  // ✅ EXISTANT : Charger les données client (demandes créées)
  const loadClientData = async () => {
    const [requestsResult, statsResult] = await Promise.all([
      RequestService.getMyRequests(),
      RequestService.getMyStats(),
    ]);

    if (requestsResult.success) {
      setRequests(requestsResult.data.requests);
      console.log('✅ Demandes client chargées:', requestsResult.data.requests.length);
      
      // ✅ DEBUG PHOTOS - Vérifier le format des photos
      requestsResult.data.requests.forEach((request, index) => {
        if (request.photos && request.photos.length > 0) {
          console.log(`🔍 DEBUG - Demande ${index + 1} "${request.title}":`, {
            photosCount: request.photos.length,
            firstPhoto: request.photos[0],
            photoType: typeof request.photos[0],
            photoKeys: typeof request.photos[0] === 'object' ? Object.keys(request.photos[0]) : 'N/A'
          });
        }
      });
      
    } else {
      console.error('❌ Erreur chargement demandes client:', requestsResult.error);
      Alert.alert('Erreur', 'Impossible de charger vos demandes');
    }

    if (statsResult.success) {
      setStats(statsResult.data);
      console.log('✅ Stats client chargées');
    }
  };

  // ✅ NOUVEAU : Charger les données vendeur (demandes reçues)
  const loadSellerData = async () => {
    try {
      console.log('🛍️ Chargement des demandes reçues en tant que vendeur...');
      
      // TODO: Créer cette méthode dans RequestService ou SellerService
      // Pour l'instant, on simule avec les demandes existantes
      const result = await RequestService.getMyRequests(); // Temporaire
      
      if (result.success) {
        // Temporaire : filtrer ou adapter les données
        setReceivedRequests(result.data.requests);
        console.log('✅ Demandes vendeur chargées:', result.data.requests.length);
      }
      
      // Charger les stats vendeur
      const sellerStatsResult = await SellerService.getMyStats();
      if (sellerStatsResult.success) {
        setSellerStats(sellerStatsResult.data);
        console.log('✅ Stats vendeur chargées');
      }
      
    } catch (error) {
      console.error('❌ Erreur chargement données vendeur:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleRequestPress = (request) => {
    console.log('👁️ Ouverture détails demande:', request.title);
    
    navigation.navigate('RequestDetail', {
      requestId: request._id,
      request: request,
      viewMode: viewMode, // ✅ NOUVEAU : Passer le mode pour adapter l'affichage
    });
  };

  // ✅ NOUVEAU : Fonction pour changer de mode
  const handleModeChange = (newMode) => {
    if (newMode === 'seller' && !hasSellerProfile) {
      Alert.alert(
        'Profil vendeur requis',
        'Vous devez créer un profil vendeur pour accéder à cette section.',
        [
          { text: 'Annuler', style: 'cancel' },
          { 
            text: 'Créer profil', 
            onPress: () => navigation.navigate('CreateSellerProfile')
          }
        ]
      );
      return;
    }
    
    setViewMode(newMode);
    setSelectedFilter('all'); // Reset le filtre
  };

  // ✅ MODIFIÉ : Fonction pour obtenir les données selon le mode
  const getCurrentRequests = () => {
    const currentRequests = viewMode === 'client' ? requests : receivedRequests;
    
    if (selectedFilter === 'all') return currentRequests;
    return currentRequests.filter(request => request.status === selectedFilter);
  };

  const getCurrentStats = () => {
    return viewMode === 'client' ? stats : sellerStats;
  };

  // ✅ FONCTION PHOTO EXISTANTE (inchangée)
  const getPhotoUri = (photo) => {
    if (!photo) return null;
    
    // Configuration Cloudinary
    const CLOUDINARY_CLOUD_NAME = 'drch6mjsd';
    const CLOUDINARY_BASE_URL = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/`;
    
    // Si c'est une string directe (nom de fichier ou URL)
    if (typeof photo === 'string') {
      // Si c'est déjà une URL complète Cloudinary
      if (photo.startsWith('https://res.cloudinary.com/')) {
        console.log('✅ URL Cloudinary directe:', photo);
        return photo;
      }
      
      // Si c'est déjà une URL HTTP complète (autre serveur)
      if (photo.startsWith('http://') || photo.startsWith('https://')) {
        console.log('✅ URL externe directe:', photo);
        return photo;
      }
      
      // Si c'est juste un nom de fichier, construire l'URL Cloudinary
      let publicId = photo;
      
      // Nettoyer le nom de fichier
      if (publicId.includes('.')) {
        publicId = publicId.split('.')[0]; // Enlever l'extension
      }
      
      const cloudinaryUrl = `${CLOUDINARY_BASE_URL}${publicId}`;
      console.log('🔧 URL Cloudinary construite:', cloudinaryUrl);
      return cloudinaryUrl;
    }
    
    // Si c'est un objet avec url
    if (photo.url) {
      console.log('✅ URL depuis objet.url:', photo.url);
      return photo.url;
    }
    
    // Si c'est un objet avec uri (format upload)
    if (photo.uri) {
      console.log('✅ URI depuis objet.uri:', photo.uri);
      return photo.uri;
    }
    
    // Si c'est un objet avec photoUrl (format service)
    if (photo.photoUrl) {
      console.log('✅ URL depuis objet.photoUrl:', photo.photoUrl);
      return photo.photoUrl;
    }
    
    console.warn('⚠️ Format de photo non reconnu:', photo);
    return null;
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

  // ✅ MODIFIÉ : Filtres adaptés au mode
  const getFilters = () => {
    const currentRequests = viewMode === 'client' ? requests : receivedRequests;
    
    const filters = [
      { id: 'all', label: 'Toutes', count: currentRequests.length },
      { id: 'active', label: 'Actives', count: currentRequests.filter(r => r.status === 'active').length },
      { id: 'completed', label: 'Terminées', count: currentRequests.filter(r => r.status === 'completed').length },
    ];
    
    return filters;
  };

  if (loading) {
    return <Loading fullScreen text="Chargement de vos demandes..." />;
  }

  const currentRequests = getCurrentRequests();
  const currentStats = getCurrentStats();
  const filters = getFilters();

  return (
    <View style={styles.container}>
      {/* ✅ NOUVEAU : Header avec mode selector */}
      <LinearGradient
        colors={getGradientString('primary')}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>
            {viewMode === 'client' ? 'Mes demandes' : 'Demandes reçues'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {viewMode === 'client' 
              ? 'Gérez vos demandes en cours' 
              : 'Répondez aux demandes clients'
            }
          </Text>
        </View>

        {/* ✅ NOUVEAU : Mode selector */}
        {hasSellerProfile && (
          <View style={styles.modeSelector}>
            <TouchableOpacity
              style={[
                styles.modeButton,
                viewMode === 'client' && styles.modeButtonActive
              ]}
              onPress={() => handleModeChange('client')}
            >
              <Ionicons 
                name="person-outline" 
                size={20} 
                color={viewMode === 'client' ? colors.primary : colors.white} 
              />
              <Text style={[
                styles.modeButtonText,
                viewMode === 'client' && styles.modeButtonTextActive
              ]}>
                Client
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeButton,
                viewMode === 'seller' && styles.modeButtonActive
              ]}
              onPress={() => handleModeChange('seller')}
            >
              <Ionicons 
                name="business-outline" 
                size={20} 
                color={viewMode === 'seller' ? colors.primary : colors.white} 
              />
              <Text style={[
                styles.modeButtonText,
                viewMode === 'seller' && styles.modeButtonTextActive
              ]}>
                Vendeur
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* ✅ MODIFIÉ : Statistiques adaptées au mode */}
        {currentStats && (
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{currentStats.total || 0}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{currentStats.active || 0}</Text>
              <Text style={styles.statLabel}>Actives</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>
                {viewMode === 'client' 
                  ? (currentStats.totalViews || 0)
                  : (currentStats.totalResponses || 0)
                }
              </Text>
              <Text style={styles.statLabel}>
                {viewMode === 'client' ? 'Vues' : 'Réponses'}
              </Text>
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

        {/* ✅ MODIFIÉ : Liste des demandes adaptée au mode */}
        <View style={styles.requestsList}>
          {currentRequests.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons 
                name={viewMode === 'client' ? 'document-outline' : 'business-outline'} 
                size={64} 
                color={colors.gray[400]} 
              />
              <Text style={styles.emptyTitle}>
                {viewMode === 'client' ? 'Aucune demande' : 'Aucune demande reçue'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {selectedFilter === 'all' 
                  ? (viewMode === 'client' 
                      ? 'Vous n\'avez pas encore créé de demande'
                      : 'Aucune demande reçue dans votre zone'
                    )
                  : `Aucune demande ${filters.find(f => f.id === selectedFilter)?.label.toLowerCase()}`
                }
              </Text>
              
              {/* ✅ NOUVEAU : Bouton d'aide selon le mode */}
              {viewMode === 'client' && (
                <TouchableOpacity 
                  style={styles.helpButton}
                  onPress={() => navigation.navigate('NewRequest')}
                >
                  <Text style={styles.helpButtonText}>+ Créer une demande</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            currentRequests.map((request) => (
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

                {/* Photos - ✅ VERSION ULTRA CORRIGÉE */}
                {request.photos && request.photos.length > 0 && (
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.photosContainer}
                  >
                    {request.photos.slice(0, 3).map((photo, index) => {
                      const photoUri = getPhotoUri(photo);
                      
                      if (!photoUri) {
                        console.warn('⚠️ Photo sans URI valide:', photo);
                        return null;
                      }

                      console.log(`📸 Affichage photo ${index + 1}:`, photoUri);

                      return (
                        <Image
                          key={index}
                          source={{ uri: photoUri }}
                          style={styles.requestPhoto}
                          onError={(error) => {
                            console.error('❌ Erreur chargement photo:', error.nativeEvent.error);
                            console.error('❌ URI problématique:', photoUri);
                          }}
                          onLoad={() => {
                            console.log('✅ Photo chargée avec succès:', photoUri);
                          }}
                          onLoadStart={() => {
                            console.log('🔄 Début chargement photo:', photoUri);
                          }}
                        />
                      );
                    })}
                    {request.photos.length > 3 && (
                      <View style={styles.morePhotosIndicator}>
                        <Text style={styles.morePhotosText}>
                          +{request.photos.length - 3}
                        </Text>
                      </View>
                    )}
                  </ScrollView>
                )}

                {/* ✅ MODIFIÉ : Footer de la carte adapté au mode */}
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
                  
                  {/* ✅ NOUVEAU : Action différente selon le mode */}
                  <Text style={styles.viewDetailsText}>
                    {viewMode === 'client' ? 'Voir détails' : 'Répondre'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  // ✅ NOUVEAU : Styles pour le header
  headerTop: {
    marginBottom: 16,
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
  },
  // ✅ NOUVEAU : Mode selector
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 25,
    padding: 4,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  modeButtonActive: {
    backgroundColor: colors.white,
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
    marginLeft: 6,
  },
  modeButtonTextActive: {
    color: colors.primary,
  },
  content: {
    flex: 1,
    marginTop: -10,
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
  },
  // ✅ NOUVEAU : Bouton d'aide
  helpButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 20,
  },
  helpButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
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