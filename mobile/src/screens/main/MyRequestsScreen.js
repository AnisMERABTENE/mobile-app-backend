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
import ResponseService from '../../services/responseService';
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

  // ✅ NOUVEAU : États pour les nouvelles catégories vendeur
  const [myResponses, setMyResponses] = useState([]);
  const [newSellerStats, setNewSellerStats] = useState({
    untreated: 0,     // Non traité
    responded: 0,     // Répondu  
    completed: 0      // Terminé
  });
  const [selectedSellerFilter, setSelectedSellerFilter] = useState('untreated');

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

  // ✅ MODIFIÉ : Charger les données vendeur avec mes réponses
  const loadSellerData = async () => {
    try {
      console.log('👨‍💼 Chargement des demandes reçues en tant que vendeur...');
      
      // Charger les demandes reçues ET mes réponses en parallèle
      const [profileResult, responsesResult] = await Promise.all([
        SellerService.getMyProfile(),
        ResponseService.getMyResponses()
      ]);

      if (!profileResult.success) {
        console.warn('⚠️ Aucun profil vendeur trouvé');
        setReceivedRequests([]);
        setSellerStats(null);
        return;
      }

      const sellerProfile = profileResult.data;
      console.log('✅ Profil vendeur récupéré:', sellerProfile.businessName);

      // Récupérer mes réponses
      let allResponses = [];
      if (responsesResult.success) {
        allResponses = responsesResult.data;
        console.log('✅ Mes réponses chargées:', allResponses.length);
      }
      setMyResponses(allResponses);

      // Récupérer les demandes reçues pour chaque spécialité (code existant)
      const allRequests = [];
      const processedRequestIds = new Set();
      const [longitude, latitude] = sellerProfile.location.coordinates;
      const maxDistance = 25;

      for (const specialty of sellerProfile.specialties) {
        for (const subCategory of specialty.subCategories) {
          try {
            const searchResult = await RequestService.searchNearby(
              longitude,
              latitude,
              maxDistance * 1000,
              specialty.category,
              1
            );

            if (searchResult.success) {
              const filteredRequests = (searchResult.data.requests || []).filter(request => 
                request.subCategory === subCategory && 
                !processedRequestIds.has(request._id) &&
                request.status === 'active'
              );

              filteredRequests.forEach(request => {
                processedRequestIds.add(request._id);
                const distance = calculateDistance(
                  latitude, longitude,
                  request.location.coordinates[1], 
                  request.location.coordinates[0]
                );

                allRequests.push({
                  ...request,
                  matchingSpecialty: {
                    category: specialty.category,
                    subCategory: subCategory
                  },
                  distanceFromSeller: Math.round(distance * 100) / 100,
                  matchScore: calculateMatchScore(request, specialty, distance)
                });
              });
            }
          } catch (subError) {
            console.warn(`⚠️ Erreur recherche ${specialty.category} > ${subCategory}:`, subError.message);
          }
        }
      }

      allRequests.sort((a, b) => {
        if (b.matchScore !== a.matchScore) {
          return b.matchScore - a.matchScore;
        }
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      console.log(`✅ ${allRequests.length} demandes reçues trouvées au total`);
      setReceivedRequests(allRequests);

      // ✅ NOUVEAU : Calculer les nouvelles statistiques
      calculateNewSellerStats(allRequests, allResponses);

      const sellerStatsResult = await SellerService.getMyStats();
      if (sellerStatsResult.success) {
        setSellerStats(sellerStatsResult.data);
      }
      
    } catch (error) {
      console.error('❌ Erreur chargement données vendeur:', error);
      Alert.alert('Erreur', 'Impossible de charger les demandes reçues');
      setReceivedRequests([]);
      setSellerStats(null);
    }
  };

  // ✅ NOUVEAU : Calculer les nouvelles statistiques vendeur
  const calculateNewSellerStats = (requests, responses) => {
    const respondedRequestIds = new Set(
      responses.map(r => r.request._id || r.request)
    );

    // Non traité : demandes auxquelles je n'ai pas encore répondu
    const untreated = requests.filter(req => 
      !respondedRequestIds.has(req._id) && req.status === 'active'
    ).length;

    // Répondu : mes réponses en attente (pending)
    const responded = responses.filter(r => r.status === 'pending').length;

    // Terminé : mes réponses acceptées ou refusées
    const completed = responses.filter(r => 
      r.status === 'accepted' || r.status === 'declined'
    ).length;

    const stats = { untreated, responded, completed };
    setNewSellerStats(stats);
    console.log('📊 Nouvelles stats vendeur:', stats);
  };

  // ✅ NOUVEAU : Obtenir les demandes filtrées pour le mode vendeur
  const getFilteredSellerRequests = () => {
    if (!receivedRequests.length && !myResponses.length) return [];

    const respondedRequestIds = new Set(
      myResponses.map(r => r.request._id || r.request)
    );

    switch (selectedSellerFilter) {
      case 'untreated':
        // Demandes auxquelles je n'ai pas encore répondu
        return receivedRequests.filter(req => 
          !respondedRequestIds.has(req._id) && 
          req.status === 'active' &&
          req.user._id !== user._id // Pas mes propres demandes
        );

      case 'responded':
        // Mes réponses en attente
        return myResponses
          .filter(r => r.status === 'pending')
          .map(r => ({
            ...r.request,
            myResponse: r // Ajouter ma réponse pour l'affichage
          }));

      case 'completed':
        // Mes réponses terminées (acceptées/refusées)
        return myResponses
          .filter(r => r.status === 'accepted' || r.status === 'declined')
          .map(r => ({
            ...r.request,
            myResponse: r // Ajouter ma réponse pour l'affichage
          }));

      default:
        return [];
    }
  };

  // 🔧 Fonction utilitaire : Calculer la distance entre deux points
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Rayon de la Terre en km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const deg2rad = (deg) => {
    return deg * (Math.PI/180);
  };

  // 🔧 Fonction utilitaire : Calculer le score de correspondance
  const calculateMatchScore = (request, specialty, distance) => {
    let score = 100; // Score de base

    // 1. Score de distance (plus proche = meilleur)
    const distanceScore = Math.max(0, 50 - (distance * 2)); // -2 points par km
    score += distanceScore;

    // 2. Score de correspondance exacte catégorie/sous-catégorie
    score += 30; // Bonus car on a déjà filtré sur la correspondance exacte

    // 3. Score de priorité de la demande
    switch (request.priority) {
      case 'urgent':
        score += 20;
        break;
      case 'high':
        score += 15;
        break;
      case 'medium':
        score += 10;
        break;
      case 'low':
        score += 5;
        break;
    }

    // 4. Score basé sur l'âge de la demande (plus récent = meilleur)
    const hoursOld = (Date.now() - new Date(request.createdAt)) / (1000 * 60 * 60);
    const freshnessScore = Math.max(0, 10 - hoursOld); // -1 point par heure
    score += freshnessScore;

    return Math.round(score);
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
    if (viewMode === 'seller') {
      return getFilteredSellerRequests();
    }
    
    const currentRequests = requests;
    if (selectedFilter === 'all') return currentRequests;
    return currentRequests.filter(request => request.status === selectedFilter);
  };

  const getCurrentStats = () => {
    if (viewMode === 'seller') {
      return newSellerStats;
    }
    return stats;
  };
  
  // ✅ AJOUTER CETTE FONCTION MANQUANTE
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
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

  // ✅ NOUVEAU : Couleurs pour les statuts de réponse vendeur
  const getResponseStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return colors.warning;
      case 'accepted':
        return colors.success;
      case 'declined':
        return colors.danger;
      default:
        return colors.gray[500];
    }
  };

  const getResponseStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'En attente';
      case 'accepted':
        return 'Acceptée';
      case 'declined':
        return 'Refusée';
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
    if (viewMode === 'seller') {
      return [
        { id: 'untreated', label: 'Non traité', count: newSellerStats.untreated },
        { id: 'responded', label: 'Répondu', count: newSellerStats.responded },
        { id: 'completed', label: 'Terminé', count: newSellerStats.completed },
      ];
    }
    
    const filters = [
      { id: 'all', label: 'Toutes', count: requests.length },
      { id: 'active', label: 'Actives', count: requests.filter(r => r.status === 'active').length },
      { id: 'completed', label: 'Terminées', count: requests.filter(r => r.status === 'completed').length },
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
            {viewMode === 'client' ? (
              // Stats mode client (existantes)
              <>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{currentStats.total || 0}</Text>
                  <Text style={styles.statLabel}>Total</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{currentStats.active || 0}</Text>
                  <Text style={styles.statLabel}>Actives</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{currentStats.totalViews || 0}</Text>
                  <Text style={styles.statLabel}>Vues</Text>
                </View>
              </>
            ) : (
              // ✅ NOUVEAU : Stats mode vendeur
              <>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{currentStats.untreated}</Text>
                  <Text style={styles.statLabel}>Non traité</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{currentStats.responded}</Text>
                  <Text style={styles.statLabel}>Répondu</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{currentStats.completed}</Text>
                  <Text style={styles.statLabel}>Terminé</Text>
                </View>
              </>
            )}
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
                (viewMode === 'client' ? selectedFilter : selectedSellerFilter) === filter.id && styles.activeFilterButton
              ]}
              onPress={() => {
                if (viewMode === 'client') {
                  setSelectedFilter(filter.id);
                } else {
                  setSelectedSellerFilter(filter.id);
                }
              }}
            >
              <Text style={[
                styles.filterText,
                (viewMode === 'client' ? selectedFilter : selectedSellerFilter) === filter.id && styles.activeFilterText
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
                {viewMode === 'client' ? 'Aucune demande' : 
                 selectedSellerFilter === 'untreated' ? 'Aucune demande à traiter' :
                 selectedSellerFilter === 'responded' ? 'Aucune réponse en attente' :
                 'Aucune demande terminée'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {viewMode === 'client' 
                  ? (selectedFilter === 'all' 
                      ? 'Vous n\'avez pas encore créé de demande'
                      : `Aucune demande ${filters.find(f => f.id === selectedFilter)?.label.toLowerCase()}`
                    )
                  : selectedSellerFilter === 'untreated'
                    ? 'Les nouvelles demandes dans votre zone apparaîtront ici'
                    : 'Vos demandes traitées apparaîtront ici'
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
                      
                      {/* ✅ NOUVEAU : Affichage conditionnel selon le mode et filtre */}
                      {viewMode === 'seller' && selectedSellerFilter === 'untreated' ? (
                        <View style={[styles.statusBadge, { backgroundColor: colors.warning + '20' }]}>
                          <Text style={[styles.statusText, { color: colors.warning }]}>Non traité</Text>
                        </View>
                      ) : viewMode === 'seller' && request.myResponse ? (
                        <View style={[
                          styles.statusBadge, 
                          { backgroundColor: getResponseStatusColor(request.myResponse.status) + '20' }
                        ]}>
                          <Text style={[
                            styles.statusText,
                            { color: getResponseStatusColor(request.myResponse.status) }
                          ]}>
                            {getResponseStatusText(request.myResponse.status)}
                          </Text>
                        </View>
                      ) : (
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
                      )}
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

                {/* ✅ NOUVEAU : Afficher ma réponse si elle existe */}
                {viewMode === 'seller' && request.myResponse && selectedSellerFilter !== 'untreated' && (
                  <View style={styles.myResponsePreview}>
                    <Text style={styles.myResponseLabel}>Ma réponse :</Text>
                    <Text style={styles.myResponseText} numberOfLines={1}>
                      {request.myResponse.message}
                    </Text>
                    <Text style={styles.myResponsePrice}>
                      {request.myResponse.price}€
                    </Text>
                  </View>
                )}

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
                    {viewMode === 'seller' ? (
                      <>
                        <View style={styles.statItem}>
                          <Ionicons name="location-outline" size={16} color={colors.gray[500]} />
                          <Text style={styles.statText}>{request.location?.city}</Text>
                        </View>
                        <View style={styles.statItem}>
                          <Ionicons name="chatbubbles-outline" size={16} color={colors.gray[500]} />
                          <Text style={styles.statText}>{request.responseCount || 0} réponses</Text>
                        </View>
                      </>
                    ) : (
                      <>
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
                      </>
                    )}
                  </View>
                  
                  {/* ✅ NOUVEAU : Action différente selon le mode */}
                  <Text style={styles.viewDetailsText}>
                    {viewMode === 'client' ? 'Voir détails' : 
                     selectedSellerFilter === 'untreated' ? 'Répondre' : 'Voir détails'}
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
  
  // ✅ NOUVEAU : Styles pour l'aperçu de ma réponse
  myResponsePreview: {
    backgroundColor: colors.gray[50],
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  myResponseLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: 4,
  },
  myResponseText: {
    fontSize: 14,
    color: colors.text.primary,
    marginBottom: 4,
  },
  myResponsePrice: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.success,
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