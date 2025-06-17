import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
  Share,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useAuth } from '../../context/AuthContext';
import Button from '../../components/Button';
import Loading from '../../components/Loading';
import PhotoPicker from '../../components/PhotoPicker';
import RequestService from '../../services/requestService';
import ResponseService from '../../services/responseService';
import colors, { getGradientString } from '../../styles/colors';

const { width: screenWidth } = Dimensions.get('window');

const RequestDetailScreen = ({ route, navigation }) => {
  const { requestId, tab = 'details' } = route.params; // ✅ AJOUT : Paramètre tab pour navigation directe
  const { user } = useAuth();
  
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // ✅ NOUVEAU : États pour les onglets
  const [activeTab, setActiveTab] = useState(tab);

  // ✅ NOUVEAU : États pour les réponses reçues (côté client)
  const [responses, setResponses] = useState([]);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [responseDetailModalVisible, setResponseDetailModalVisible] = useState(false);

  // États pour la modale de réponse (côté vendeur)
  const [responseModalVisible, setResponseModalVisible] = useState(false);
  const [responseLoading, setResponseLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [responseData, setResponseData] = useState({
    message: '',
    price: '',
    photos: []
  });
  const [responseErrors, setResponseErrors] = useState({});

  // États pour gérer les réponses existantes (côté vendeur)
  const [myResponse, setMyResponse] = useState(null);
  const [loadingMyResponse, setLoadingMyResponse] = useState(false);

  useEffect(() => {
    loadRequestDetails();
  }, [requestId]);

  // ✅ NOUVEAU : Charger les réponses quand on passe à l'onglet réponses
  useEffect(() => {
    if (activeTab === 'responses' && request && isOwner) {
      loadResponses();
    }
  }, [activeTab, request]);

  const loadRequestDetails = async () => {
    try {
      setLoading(true);
      console.log('📋 Chargement détails demande:', requestId);
      
      const result = await RequestService.getRequestById(requestId);
      
      if (result.success) {
        setRequest(result.data);
        console.log('✅ Détails demande chargés:', result.data.title);
        
        // Vérifier si j'ai déjà répondu à cette demande (côté vendeur)
        await checkMyResponse(requestId);
      } else {
        console.error('❌ Erreur chargement demande:', result.error);
        Alert.alert('Erreur', 'Impossible de charger les détails de la demande');
        navigation.goBack();
      }
    } catch (error) {
      console.error('❌ Erreur loadRequestDetails:', error);
      Alert.alert('Erreur', 'Une erreur est survenue');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  // ✅ NOUVEAU : Charger les réponses reçues (côté client)
  const loadResponses = async () => {
    try {
      setLoadingResponses(true);
      console.log('📥 Chargement réponses pour demande:', requestId);
      
      const result = await ResponseService.getResponsesByRequest(requestId);
      
      if (result.success) {
        setResponses(result.data);
        console.log('✅ Réponses chargées:', result.data.length);
      } else {
        console.error('❌ Erreur chargement réponses:', result.error);
        Alert.alert('Erreur', 'Impossible de charger les réponses');
      }
    } catch (error) {
      console.error('❌ Erreur loadResponses:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors du chargement des réponses');
    } finally {
      setLoadingResponses(false);
    }
  };

  // Vérifier si j'ai déjà répondu à cette demande (côté vendeur)
  const checkMyResponse = async (requestId) => {
    try {
      setLoadingMyResponse(true);
      console.log('🔍 Vérification de ma réponse pour demande:', requestId);
      
      const result = await ResponseService.getMyResponses();
      
      if (result.success) {
        const myResponseForThisRequest = result.data.find(
          response => response.request._id === requestId || response.request === requestId
        );
        
        if (myResponseForThisRequest) {
          setMyResponse(myResponseForThisRequest);
          console.log('✅ Réponse trouvée:', myResponseForThisRequest._id, 'Statut:', myResponseForThisRequest.status);
        } else {
          setMyResponse(null);
          console.log('ℹ️ Aucune réponse trouvée pour cette demande');
        }
      } else {
        console.error('❌ Erreur récupération mes réponses:', result.error);
        setMyResponse(null);
      }
    } catch (error) {
      console.error('❌ Erreur checkMyResponse:', error);
      setMyResponse(null);
    } finally {
      setLoadingMyResponse(false);
    }
  };

  // ✅ NOUVEAU : Ouvrir la modale de détail d'une réponse
  const openResponseDetail = (response) => {
    console.log('📋 Ouverture détail réponse:', response._id);
    setSelectedResponse(response);
    setResponseDetailModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // ✅ NOUVEAU : Fermer la modale de détail
  const closeResponseDetail = () => {
    setResponseDetailModalVisible(false);
    setSelectedResponse(null);
  };

  // ✅ NOUVEAU : Accepter une réponse
  const acceptResponse = async (responseId) => {
    try {
      console.log('✅ Acceptation réponse:', responseId);
      
      const result = await ResponseService.updateResponseStatus(responseId, 'accepted');
      
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          'Réponse acceptée',
          'Vous avez accepté cette réponse. Le vendeur va recevoir une notification.',
          [
            {
              text: 'OK',
              onPress: () => {
                closeResponseDetail();
                loadResponses(); // Recharger les réponses
              }
            }
          ]
        );
      } else {
        Alert.alert('Erreur', result.error || 'Impossible d\'accepter la réponse');
      }
    } catch (error) {
      console.error('❌ Erreur acceptation réponse:', error);
      Alert.alert('Erreur', 'Une erreur est survenue');
    }
  };

  // ✅ NOUVEAU : Refuser une réponse
  const declineResponse = async (responseId) => {
    Alert.alert(
      'Refuser la réponse',
      'Êtes-vous sûr de vouloir refuser cette réponse ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Refuser',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('❌ Refus réponse:', responseId);
              
              const result = await ResponseService.updateResponseStatus(responseId, 'declined');
              
              if (result.success) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                Alert.alert(
                  'Réponse refusée',
                  'Vous avez refusé cette réponse. Le vendeur va recevoir une notification.',
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        closeResponseDetail();
                        loadResponses(); // Recharger les réponses
                      }
                    }
                  ]
                );
              } else {
                Alert.alert('Erreur', result.error || 'Impossible de refuser la réponse');
              }
            } catch (error) {
              console.error('❌ Erreur refus réponse:', error);
              Alert.alert('Erreur', 'Une erreur est survenue');
            }
          }
        }
      ]
    );
  };

  // Fonction pour ouvrir la modale de réponse (côté vendeur)
  const openResponseModal = () => {
    console.log('📝 Ouverture modale réponse pour demande:', requestId);
    setResponseModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Fonction pour fermer la modale (côté vendeur)
  const closeResponseModal = () => {
    setResponseModalVisible(false);
    setResponseData({ message: '', price: '', photos: [] });
    setResponseErrors({});
    setUploadProgress(0);
  };

  // Validation du formulaire de réponse (côté vendeur)
  const validateResponseForm = () => {
    const errors = {};

    if (!responseData.message.trim()) {
      errors.message = 'Le message est requis';
    } else if (responseData.message.trim().length < 10) {
      errors.message = 'Le message doit contenir au moins 10 caractères';
    }

    if (!responseData.price || isNaN(responseData.price) || parseFloat(responseData.price) <= 0) {
      errors.price = 'Veuillez saisir un prix valide';
    }

    setResponseErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Fonction pour envoyer la réponse (côté vendeur)
  const submitResponse = async () => {
    console.log('📤 Tentative envoi réponse...');
    
    if (!validateResponseForm()) {
      return;
    }

    try {
      setResponseLoading(true);
      setUploadProgress(0);
      
      console.log('📋 Données réponse à envoyer:', {
        requestId,
        message: responseData.message,
        price: responseData.price,
        photoCount: responseData.photos.length
      });

      const result = await ResponseService.createResponse(
        requestId,
        responseData.message,
        responseData.price,
        responseData.photos,
        (progress) => {
          setUploadProgress(Math.round(progress * 100));
          console.log('📊 Progress upload réponse:', Math.round(progress * 100) + '%');
        }
      );

      if (result.success) {
        console.log('✅ Réponse envoyée avec succès:', result.data._id);
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          'Succès',
          'Votre réponse a été envoyée avec succès ! Le demandeur va recevoir une notification.',
          [{ 
            text: 'OK', 
            onPress: () => {
              closeResponseModal();
              loadRequestDetails();
            }
          }]
        );
      } else {
        console.error('❌ Erreur envoi réponse:', result.error);
        Alert.alert('Erreur', result.error || 'Impossible d\'envoyer votre réponse');
      }

    } catch (error) {
      console.error('❌ Erreur submitResponse:', error);
      Alert.alert('Erreur', 'Une erreur inattendue est survenue');
    } finally {
      setResponseLoading(false);
      setUploadProgress(0);
    }
  };

  // ✅ NOUVEAU : Rendu d'un item de réponse
  const renderResponseItem = ({ item: response }) => (
    <TouchableOpacity
      style={styles.responseItem}
      onPress={() => openResponseDetail(response)}
    >
      <View style={styles.responseHeader}>
        <View style={styles.sellerInfo}>
          {response.sellerUser.avatar ? (
            <Image source={{ uri: response.sellerUser.avatar }} style={styles.sellerAvatar} />
          ) : (
            <View style={[styles.sellerAvatar, styles.sellerAvatarPlaceholder]}>
              <Ionicons name="person-outline" size={20} color={colors.gray[400]} />
            </View>
          )}
          <View style={styles.sellerDetails}>
            <Text style={styles.sellerName}>
              {response.sellerUser.firstName} {response.sellerUser.lastName}
            </Text>
            <Text style={styles.businessName}>{response.seller.businessName}</Text>
          </View>
        </View>
        
        <View style={styles.responseRight}>
          <Text style={styles.responsePrice}>{response.price}€</Text>
          <View style={[
            styles.responseStatusBadge,
            { backgroundColor: getResponseStatusColor(response.status) }
          ]}>
            <Text style={styles.responseStatusText}>
              {getResponseStatusText(response.status)}
            </Text>
          </View>
        </View>
      </View>
      
      <Text style={styles.responseMessage} numberOfLines={2}>
        {response.message}
      </Text>
      
      <View style={styles.responseFooter}>
        {response.photos && response.photos.length > 0 && (
          <View style={styles.photoCount}>
            <Ionicons name="camera-outline" size={16} color={colors.primary} />
            <Text style={styles.photoCountText}>{response.photos.length} photo(s)</Text>
          </View>
        )}
        <Text style={styles.responseDate}>
          {formatDateShort(response.createdAt)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // ✅ NOUVEAU : Fonctions utilitaires pour les statuts
  const getResponseStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return colors.warning;
      case 'accepted':
        return colors.success;
      case 'declined':
        return colors.danger;
      case 'cancelled':
        return colors.gray[500];
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
      case 'cancelled':
        return 'Annulée';
      default:
        return status;
    }
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

  const getMyResponseStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return colors.warning;
      case 'accepted':
        return colors.success;
      case 'declined':
        return colors.danger;
      case 'cancelled':
        return colors.gray[500];
      default:
        return colors.gray[500];
    }
  };

  const getMyResponseStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'En attente';
      case 'accepted':
        return 'Acceptée';
      case 'declined':
        return 'Refusée';
      case 'cancelled':
        return 'Annulée';
      default:
        return status;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateShort = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Regarde cette demande : ${request.title}`,
        title: request.title,
      });
    } catch (error) {
      console.error('❌ Erreur partage:', error);
    }
  };

  const handleContact = () => {
    Alert.alert(
      'Contacter',
      `Voulez-vous contacter ${request.user.firstName} ${request.user.lastName} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Message', onPress: () => console.log('TODO: Message') },
        { text: 'Appeler', onPress: () => console.log('TODO: Appel') },
      ]
    );
  };

  const handleEdit = () => {
    Alert.alert('Info', 'Fonctionnalité d\'édition à venir');
  };

  const handleDelete = () => {
    Alert.alert(
      'Confirmer la suppression',
      'Êtes-vous sûr de vouloir supprimer cette demande ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await RequestService.deleteRequest(requestId);
              if (result.success) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Succès', 'Demande supprimée', [
                  { text: 'OK', onPress: () => navigation.goBack() }
                ]);
              } else {
                Alert.alert('Erreur', result.error);
              }
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer la demande');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return <Loading fullScreen text="Chargement des détails..." />;
  }

  if (!request) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.danger} />
          <Text style={styles.errorTitle}>Demande introuvable</Text>
          <Button
            title="Retour"
            onPress={() => navigation.goBack()}
            variant="primary"
          />
        </View>
      </SafeAreaView>
    );
  }

  const isOwner = request.user._id === user._id;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
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
          
          <Text style={styles.headerTitle} numberOfLines={1}>
            {activeTab === 'details' ? 'Détail de la demande' : 'Réponses reçues'}
          </Text>
          
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={handleShare}
            >
              <Ionicons name="share-outline" size={24} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ✅ NOUVEAU : Onglets (seulement pour le propriétaire) */}
        {isOwner && (
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'details' && styles.activeTab]}
              onPress={() => setActiveTab('details')}
            >
              <Ionicons 
                name="document-text-outline" 
                size={20} 
                color={activeTab === 'details' ? colors.white : colors.white + '80'} 
              />
              <Text style={[
                styles.tabText,
                activeTab === 'details' && styles.activeTabText
              ]}>
                Détails
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'responses' && styles.activeTab]}
              onPress={() => setActiveTab('responses')}
            >
              <Ionicons 
                name="chatbubbles-outline" 
                size={20} 
                color={activeTab === 'responses' ? colors.white : colors.white + '80'} 
              />
              <Text style={[
                styles.tabText,
                activeTab === 'responses' && styles.activeTabText
              ]}>
                Réponses
              </Text>
              {/* ✅ NOUVEAU : Badge avec le nombre de réponses */}
              {request.responseCount > 0 && (
                <View style={styles.responseBadge}>
                  <Text style={styles.responseBadgeText}>{request.responseCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}
      </LinearGradient>

      {/* Contenu principal */}
      {activeTab === 'details' ? (
        // ✅ Contenu existant pour l'onglet détails
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Title and Status */}
          <View style={styles.section}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{request.title}</Text>
              <View 
                style={[
                  styles.statusBadge, 
                  { backgroundColor: getStatusColor(request.status) }
                ]}
              >
                <Text style={styles.statusText}>{getStatusText(request.status)}</Text>
              </View>
            </View>
            <Text style={styles.date}>{formatDate(request.createdAt)}</Text>
          </View>

          {/* Photos */}
          {request.photos && request.photos.length > 0 && (
            <View style={styles.photosSection}>
              <ScrollView 
                horizontal 
                pagingEnabled 
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(event) => {
                  const index = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
                  setCurrentPhotoIndex(index);
                }}
              >
                {request.photos.map((photo, index) => (
                  <Image
                    key={index}
                    source={{ uri: photo.url }}
                    style={styles.photo}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
              
              {request.photos.length > 1 && (
                <View style={styles.photoIndicators}>
                  {request.photos.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.photoIndicator,
                        currentPhotoIndex === index && styles.activePhotoIndicator
                      ]}
                    />
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{request.description}</Text>
          </View>

          {/* Informations */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations</Text>
            <View style={styles.infoGrid}>
              <View style={styles.infoCard}>
                <Ionicons name="pricetag-outline" size={24} color={colors.primary} />
                <Text style={styles.infoLabel}>Catégorie</Text>
                <Text style={styles.infoValue}>{request.category}</Text>
              </View>
              <View style={styles.infoCard}>
                <Ionicons name="location-outline" size={24} color={colors.primary} />
                <Text style={styles.infoLabel}>Rayon</Text>
                <Text style={styles.infoValue}>{request.radius} km</Text>
              </View>
              <View style={styles.infoCard}>
                <Ionicons name="eye-outline" size={24} color={colors.primary} />
                <Text style={styles.infoLabel}>Vues</Text>
                <Text style={styles.infoValue}>{request.viewCount || 0}</Text>
              </View>
              <View style={styles.infoCard}>
                <Ionicons name="chatbubbles-outline" size={24} color={colors.primary} />
                <Text style={styles.infoLabel}>Réponses</Text>
                <Text style={styles.infoValue}>{request.responseCount || 0}</Text>
              </View>
            </View>
          </View>

          {/* Localisation */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Localisation</Text>
            <View style={styles.locationCard}>
              <Ionicons name="location" size={24} color={colors.primary} />
              <View style={styles.locationInfo}>
                <Text style={styles.locationCity}>{request.location.city}</Text>
                <Text style={styles.locationAddress}>{request.location.address}</Text>
              </View>
            </View>
          </View>

          {/* Tags */}
          {request.tags && request.tags.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Mots-clés</Text>
              <View style={styles.tagsContainer}>
                {request.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Actions */}
          <View style={styles.section}>
            {isOwner ? (
              // Actions pour le propriétaire
              <>
                <Button
                  title="Modifier la demande"
                  onPress={handleEdit}
                  variant="primary"
                  style={styles.actionButton}
                  leftIcon={<Ionicons name="create-outline" size={20} color={colors.white} />}
                />
                <Button
                  title="Supprimer la demande"
                  onPress={handleDelete}
                  variant="danger"
                  style={styles.actionButton}
                  leftIcon={<Ionicons name="trash-outline" size={20} color={colors.white} />}
                />
              </>
            ) : (
              // Actions pour les autres utilisateurs (vendeurs)
              <>
                {myResponse ? (
                  // Si j'ai déjà répondu, afficher ma réponse
                  <View style={styles.myResponseContainer}>
                    <View style={styles.myResponseHeader}>
                      <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                      <Text style={styles.myResponseTitle}>Vous avez répondu à cette demande</Text>
                      <View style={[
                        styles.responseStatusBadge,
                        { backgroundColor: getMyResponseStatusColor(myResponse.status) }
                      ]}>
                        <Text style={styles.responseStatusText}>
                          {getMyResponseStatusText(myResponse.status)}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.myResponseContent}>
                      <View style={styles.responseRow}>
                        <Text style={styles.responseLabel}>Message :</Text>
                        <Text style={styles.responseValue}>{myResponse.message}</Text>
                      </View>
                      
                      <View style={styles.responseRow}>
                        <Text style={styles.responseLabel}>Prix proposé :</Text>
                        <Text style={styles.responsePriceValue}>{myResponse.price}€</Text>
                      </View>
                      
                      {myResponse.photos && myResponse.photos.length > 0 && (
                        <View style={styles.responseRow}>
                          <Text style={styles.responseLabel}>Photos :</Text>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {myResponse.photos.map((photo, index) => (
                              <Image
                                key={index}
                                source={{ uri: photo.url }}
                                style={styles.responsePhoto}
                                resizeMode="cover"
                              />
                            ))}
                          </ScrollView>
                        </View>
                      )}
                      
                      <View style={styles.responseRow}>
                        <Text style={styles.responseLabel}>Envoyée le :</Text>
                        <Text style={styles.responseValue}>
                          {formatDateShort(myResponse.createdAt)}
                        </Text>
                      </View>
                    </View>
                  </View>
                ) : (
                  // Si je n'ai pas encore répondu, afficher le bouton
                  <>
                    <Button
                      title="Répondre à cette demande"
                      onPress={openResponseModal}
                      variant="primary"
                      style={styles.actionButton}
                      leftIcon={<Ionicons name="chatbubble-outline" size={20} color={colors.white} />}
                    />
                    <Button
                      title="Contacter le demandeur"
                      onPress={handleContact}
                      variant="secondary"
                      style={styles.actionButton}
                      leftIcon={<Ionicons name="call-outline" size={20} color={colors.primary} />}
                    />
                  </>
                )}
              </>
            )}
          </View>

          <View style={styles.bottomSpace} />
        </ScrollView>
      ) : (
        // ✅ NOUVEAU : Contenu de l'onglet réponses
        <View style={styles.responsesContainer}>
          {loadingResponses ? (
            <Loading fullScreen text="Chargement des réponses..." />
          ) : responses.length === 0 ? (
            <View style={styles.emptyResponsesContainer}>
              <Ionicons name="chatbubbles-outline" size={64} color={colors.gray[400]} />
              <Text style={styles.emptyResponsesTitle}>Aucune réponse</Text>
              <Text style={styles.emptyResponsesSubtitle}>
                Votre demande n'a pas encore reçu de réponses. Patientez, les vendeurs vont bientôt vous contacter !
              </Text>
            </View>
          ) : (
            <FlatList
              data={responses}
              renderItem={renderResponseItem}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.responsesList}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      )}

      {/* Modale de création de réponse (côté vendeur) */}
      <Modal
        visible={responseModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeResponseModal}
      >
        <SafeAreaView style={styles.modalContainer}>
          <KeyboardAvoidingView 
            style={styles.modalContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            {/* Header de la modale */}
            <LinearGradient
              colors={getGradientString('primary')}
              style={styles.modalHeader}
            >
              <View style={styles.modalHeaderContent}>
                <TouchableOpacity 
                  style={styles.modalCloseButton}
                  onPress={closeResponseModal}
                >
                  <Ionicons name="close" size={24} color={colors.white} />
                </TouchableOpacity>
                
                <Text style={styles.modalTitle}>Répondre à la demande</Text>
                
                <TouchableOpacity 
                  style={styles.modalSendButton}
                  onPress={submitResponse}
                  disabled={responseLoading}
                >
                  {responseLoading ? (
                    <Loading size="small" color={colors.white} />
                  ) : (
                    <Ionicons name="send" size={24} color={colors.white} />
                  )}
                </TouchableOpacity>
              </View>
            </LinearGradient>

            <ScrollView style={styles.modalContent}>
              {/* Informations de la demande */}
              <View style={styles.requestInfo}>
                <Text style={styles.requestInfoTitle}>Demande : {request.title}</Text>
                <Text style={styles.requestInfoAuthor}>Par {request.user.firstName} {request.user.lastName}</Text>
              </View>

              {/* Indicateur de progress upload */}
              {responseLoading && uploadProgress > 0 && (
                <View style={styles.uploadProgressContainer}>
                  <View style={styles.uploadProgressHeader}>
                    <Ionicons name="cloud-upload-outline" size={20} color={colors.primary} />
                    <Text style={styles.uploadProgressText}>
                      Upload en cours... {uploadProgress}%
                    </Text>
                  </View>
                  <View style={styles.progressBarContainer}>
                    <View 
                      style={[
                        styles.progressBar, 
                        { width: `${uploadProgress}%` }
                      ]} 
                    />
                  </View>
                  <Text style={styles.uploadProgressSubtext}>
                    {uploadProgress < 80 ? 'Upload des photos...' : 'Finalisation...'}
                  </Text>
                </View>
              )}

              {/* Formulaire de réponse */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Votre message *</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    styles.messageInput,
                    responseErrors.message && styles.inputError
                  ]}
                  placeholder="Décrivez votre offre, vos compétences, délais..."
                  placeholderTextColor={colors.gray[400]}
                  value={responseData.message}
                  onChangeText={(text) => setResponseData(prev => ({ ...prev, message: text }))}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                {responseErrors.message && (
                  <Text style={styles.errorText}>{responseErrors.message}</Text>
                )}
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Prix proposé (€) *</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    responseErrors.price && styles.inputError
                  ]}
                  placeholder="0.00"
                  placeholderTextColor={colors.gray[400]}
                  value={responseData.price}
                  onChangeText={(text) => setResponseData(prev => ({ ...prev, price: text }))}
                  keyboardType="decimal-pad"
                />
                {responseErrors.price && (
                  <Text style={styles.errorText}>{responseErrors.price}</Text>
                )}
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Photos (optionnel)</Text>
                <PhotoPicker
                  photos={responseData.photos}
                  onPhotosChange={(photos) => setResponseData(prev => ({ ...prev, photos }))}
                  maxPhotos={5}
                  style={styles.photoPicker}
                />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* ✅ NOUVEAU : Modale de détail d'une réponse */}
      <Modal
        visible={responseDetailModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeResponseDetail}
      >
        <SafeAreaView style={styles.modalContainer}>
          {selectedResponse && (
            <>
              {/* Header de la modale */}
              <LinearGradient
                colors={getGradientString('primary')}
                style={styles.modalHeader}
              >
                <View style={styles.modalHeaderContent}>
                  <TouchableOpacity 
                    style={styles.modalCloseButton}
                    onPress={closeResponseDetail}
                  >
                    <Ionicons name="close" size={24} color={colors.white} />
                  </TouchableOpacity>
                  
                  <Text style={styles.modalTitle}>Détail de la réponse</Text>
                  
                  <View style={styles.headerButton} />
                </View>
              </LinearGradient>

              <ScrollView style={styles.modalContent}>
                {/* Informations du vendeur */}
                <View style={styles.responseDetailHeader}>
                  {selectedResponse.sellerUser.avatar ? (
                    <Image source={{ uri: selectedResponse.sellerUser.avatar }} style={styles.sellerAvatarLarge} />
                  ) : (
                    <View style={[styles.sellerAvatarLarge, styles.sellerAvatarPlaceholder]}>
                      <Ionicons name="person-outline" size={32} color={colors.gray[400]} />
                    </View>
                  )}
                  <View style={styles.sellerDetailsLarge}>
                    <Text style={styles.sellerNameLarge}>
                      {selectedResponse.sellerUser.firstName} {selectedResponse.sellerUser.lastName}
                    </Text>
                    <Text style={styles.businessNameLarge}>{selectedResponse.seller.businessName}</Text>
                    <View style={[
                      styles.responseStatusBadgeLarge,
                      { backgroundColor: getResponseStatusColor(selectedResponse.status) }
                    ]}>
                      <Text style={styles.responseStatusTextLarge}>
                        {getResponseStatusText(selectedResponse.status)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Prix proposé */}
                <View style={styles.responseDetailSection}>
                  <Text style={styles.responseDetailLabel}>Prix proposé</Text>
                  <Text style={styles.responseDetailPrice}>{selectedResponse.price}€</Text>
                </View>

                {/* Message */}
                <View style={styles.responseDetailSection}>
                  <Text style={styles.responseDetailLabel}>Message</Text>
                  <Text style={styles.responseDetailMessage}>{selectedResponse.message}</Text>
                </View>

                {/* Photos */}
                {selectedResponse.photos && selectedResponse.photos.length > 0 && (
                  <View style={styles.responseDetailSection}>
                    <Text style={styles.responseDetailLabel}>Photos ({selectedResponse.photos.length})</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.responsePhotosContainer}>
                      {selectedResponse.photos.map((photo, index) => (
                        <Image
                          key={index}
                          source={{ uri: photo.url }}
                          style={styles.responsePhotoLarge}
                          resizeMode="cover"
                        />
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Informations supplémentaires */}
                <View style={styles.responseDetailSection}>
                  <Text style={styles.responseDetailLabel}>Informations</Text>
                  <View style={styles.responseInfoGrid}>
                    <View style={styles.responseInfoItem}>
                      <Ionicons name="time-outline" size={20} color={colors.primary} />
                      <Text style={styles.responseInfoText}>
                        Reçue le {formatDate(selectedResponse.createdAt)}
                      </Text>
                    </View>
                    {selectedResponse.seller.phone && (
                      <View style={styles.responseInfoItem}>
                        <Ionicons name="call-outline" size={20} color={colors.primary} />
                        <Text style={styles.responseInfoText}>{selectedResponse.seller.phone}</Text>
                      </View>
                    )}
                    {selectedResponse.seller.location && (
                      <View style={styles.responseInfoItem}>
                        <Ionicons name="location-outline" size={20} color={colors.primary} />
                        <Text style={styles.responseInfoText}>
                          {selectedResponse.seller.location.city}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </ScrollView>

              {/* ✅ NOUVEAU : Boutons d'action (Accepter/Refuser) */}
              {selectedResponse.status === 'pending' && (
                <View style={styles.responseActionsContainer}>
                  <TouchableOpacity
                    style={styles.declineButton}
                    onPress={() => declineResponse(selectedResponse._id)}
                  >
                    <Ionicons name="close-outline" size={24} color={colors.white} />
                    <Text style={styles.declineButtonText}>Refuser</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => acceptResponse(selectedResponse._id)}
                  >
                    <Ionicons name="checkmark-outline" size={24} color={colors.white} />
                    <Text style={styles.acceptButtonText}>Accepter</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },

  // ✅ NOUVEAU : Styles pour les onglets
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  activeTab: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.white + '80',
    marginLeft: 6,
  },
  activeTabText: {
    color: colors.white,
    fontWeight: '600',
  },
  responseBadge: {
    backgroundColor: colors.danger,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  responseBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.white,
  },

  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginRight: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
  },
  date: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  photosSection: {
    marginBottom: 24,
  },
  photo: {
    width: screenWidth,
    height: 250,
  },
  photoIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  photoIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.gray[300],
    marginHorizontal: 4,
  },
  activePhotoIndicator: {
    backgroundColor: colors.primary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: colors.text.primary,
    lineHeight: 24,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  infoCard: {
    width: '48%',
    backgroundColor: colors.gray[50],
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 8,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[50],
    padding: 16,
    borderRadius: 12,
  },
  locationInfo: {
    marginLeft: 12,
    flex: 1,
  },
  locationCity: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  actionButton: {
    marginBottom: 12,
  },
  bottomSpace: {
    height: 50,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 16,
    marginBottom: 24,
  },

  // ✅ NOUVEAU : Styles pour l'onglet réponses
  responsesContainer: {
    flex: 1,
  },
  emptyResponsesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyResponsesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyResponsesSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  responsesList: {
    padding: 24,
  },
  responseItem: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.gray[200],
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  responseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sellerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  sellerAvatarPlaceholder: {
    backgroundColor: colors.gray[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  sellerDetails: {
    flex: 1,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  businessName: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  responseRight: {
    alignItems: 'flex-end',
  },
  responsePrice: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.success,
    marginBottom: 6,
  },
  responseStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  responseStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.white,
  },
  responseMessage: {
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 20,
    marginBottom: 12,
  },
  responseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  photoCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  photoCountText: {
    fontSize: 12,
    color: colors.primary,
    marginLeft: 4,
  },
  responseDate: {
    fontSize: 12,
    color: colors.text.secondary,
  },

  // Styles pour la modale de création de réponse
  modalContainer: {
    flex: 1,
    backgroundColor: colors.white,
  },
  modalHeader: {
    paddingBottom: 16,
  },
  modalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  modalSendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    flex: 1,
    padding: 24,
  },
  requestInfo: {
    backgroundColor: colors.gray[50],
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  requestInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  requestInfoAuthor: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  
  // Styles pour l'indicateur de progress
  uploadProgressContainer: {
    backgroundColor: colors.primary + '10',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.primary + '20',
  },
  uploadProgressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  uploadProgressText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 8,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: colors.gray[200],
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  uploadProgressSubtext: {
    fontSize: 12,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  
  formSection: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text.primary,
    backgroundColor: colors.white,
  },
  messageInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: colors.danger,
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
    marginTop: 4,
  },
  photoPicker: {
    marginTop: 8,
  },
  
  // Styles pour l'affichage de ma réponse (côté vendeur)
  myResponseContainer: {
    backgroundColor: colors.gray[50],
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.success + '20',
  },
  myResponseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  myResponseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginLeft: 8,
    flex: 1,
  },
  myResponseContent: {
    gap: 12,
  },
  responseRow: {
    flexDirection: 'column',
    gap: 4,
  },
  responseLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  responseValue: {
    fontSize: 16,
    color: colors.text.primary,
    lineHeight: 22,
  },
  responsePriceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.success,
  },
  responsePhoto: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: colors.gray[200],
  },

  // ✅ NOUVEAU : Styles pour la modale de détail de réponse
  responseDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.gray[50],
    borderRadius: 12,
    marginBottom: 24,
  },
  sellerAvatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 16,
  },
  sellerDetailsLarge: {
    flex: 1,
  },
  sellerNameLarge: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  businessNameLarge: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  responseStatusBadgeLarge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  responseStatusTextLarge: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
  },
  responseDetailSection: {
    marginBottom: 24,
  },
  responseDetailLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  responseDetailPrice: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.success,
  },
  responseDetailMessage: {
    fontSize: 16,
    color: colors.text.primary,
    lineHeight: 24,
  },
  responsePhotosContainer: {
    marginTop: 8,
  },
  responsePhotoLarge: {
    width: 120,
    height: 120,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: colors.gray[200],
  },
  responseInfoGrid: {
    gap: 12,
  },
  responseInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  responseInfoText: {
    fontSize: 14,
    color: colors.text.primary,
    marginLeft: 8,
    flex: 1,
  },

  // ✅ NOUVEAU : Styles pour les boutons d'action
  responseActionsContainer: {
    flexDirection: 'row',
    padding: 24,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
    gap: 16,
  },
  declineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.danger,
    paddingVertical: 16,
    borderRadius: 12,
  },
  declineButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    marginLeft: 8,
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    paddingVertical: 16,
    borderRadius: 12,
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    marginLeft: 8,
  },
});

export default RequestDetailScreen;