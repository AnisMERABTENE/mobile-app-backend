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
  const { requestId } = route.params;
  const { user } = useAuth();
  
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // ✅ NOUVEAU : États pour la modale de réponse
  const [responseModalVisible, setResponseModalVisible] = useState(false);
  const [responseLoading, setResponseLoading] = useState(false);
  const [responseData, setResponseData] = useState({
    message: '',
    price: '',
    photos: []
  });
  const [responseErrors, setResponseErrors] = useState({});

  // ✅ NOUVEAU : États pour gérer les réponses existantes
  const [myResponse, setMyResponse] = useState(null);
  const [loadingMyResponse, setLoadingMyResponse] = useState(false);

  useEffect(() => {
    loadRequestDetails();
  }, [requestId]);

  const loadRequestDetails = async () => {
    try {
      setLoading(true);
      console.log('📋 Chargement détails demande:', requestId);
      
      const result = await RequestService.getRequestById(requestId);
      
      if (result.success) {
        setRequest(result.data);
        console.log('✅ Détails demande chargés:', result.data.title);
        
        // ✅ NOUVEAU : Vérifier si j'ai déjà répondu à cette demande
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

  // ✅ NOUVEAU : Vérifier si j'ai déjà répondu à cette demande
  const checkMyResponse = async (requestId) => {
    try {
      setLoadingMyResponse(true);
      console.log('🔍 Vérification de ma réponse pour demande:', requestId);
      
      // Récupérer toutes mes réponses
      const result = await ResponseService.getMyResponses();
      
      if (result.success) {
        // Chercher ma réponse pour cette demande spécifique
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

  // ✅ NOUVEAU : Fonction pour ouvrir la modale de réponse
  const openResponseModal = () => {
    console.log('📝 Ouverture modale réponse pour demande:', requestId);
    setResponseModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // ✅ NOUVEAU : Fonction pour fermer la modale
  const closeResponseModal = () => {
    setResponseModalVisible(false);
    setResponseData({ message: '', price: '', photos: [] });
    setResponseErrors({});
  };

  // ✅ NOUVEAU : Validation du formulaire de réponse
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

  // ✅ NOUVEAU : Fonction pour envoyer la réponse
  const submitResponse = async () => {
    console.log('📤 Tentative envoi réponse...');
    
    if (!validateResponseForm()) {
      return;
    }

    try {
      setResponseLoading(true);
      
      // ✅ NOUVEAU : Envoi réel via le service
      console.log('📋 Données réponse à envoyer:', {
        requestId,
        message: responseData.message,
        price: responseData.price,
        photos: responseData.photos
      });

      const result = await ResponseService.createResponse(
        requestId,
        responseData.message,
        responseData.price,
        responseData.photos
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
              // Recharger les détails de la demande pour mettre à jour le compteur de réponses
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

  // ✅ NOUVEAU : Fonction pour obtenir le statut de ma réponse
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
    // TODO: Navigation vers écran d'édition
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
            Détail de la demande
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
      </LinearGradient>

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
            // ✅ MODIFIÉ : Actions pour les autres utilisateurs (vendeurs)
            <>
              {myResponse ? (
                // ✅ NOUVEAU : Si j'ai déjà répondu, afficher ma réponse
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
                // ✅ Si je n'ai pas encore répondu, afficher le bouton
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

      {/* ✅ NOUVEAU : Modale de réponse */}
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
  
  // ✅ NOUVEAU : Styles pour la modale de réponse
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
  
  // ✅ NOUVEAU : Styles pour l'affichage de ma réponse
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
  responseStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  responseStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
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
});

export default RequestDetailScreen;