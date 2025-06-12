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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useAuth } from '../../context/AuthContext';
import Button from '../../components/Button';
import Loading from '../../components/Loading';
import RequestService from '../../services/requestService';
import colors, { getGradientString } from '../../styles/colors';

const { width: screenWidth } = Dimensions.get('window');

const RequestDetailScreen = ({ route, navigation }) => {
  const { requestId } = route.params;
  const { user } = useAuth();
  
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

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
      year: 'numeric',
    });
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return colors.danger;
      case 'high':
        return colors.warning;
      case 'medium':
        return colors.info;
      case 'low':
        return colors.gray[500];
      default:
        return colors.gray[500];
    }
  };

  const getPriorityText = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'Urgent';
      case 'high':
        return 'Élevée';
      case 'medium':
        return 'Normale';
      case 'low':
        return 'Basse';
      default:
        return 'Normale';
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Regardez cette demande: "${request.title}" - ${request.description.substring(0, 100)}...`,
        title: request.title,
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error('Erreur partage:', error);
    }
  };

  const handleEdit = () => {
    // TODO: Navigation vers l'écran d'édition
    Alert.alert('Édition', 'Fonctionnalité d\'édition en cours de développement');
  };

  const handleMarkAsCompleted = async () => {
    try {
      Alert.alert(
        'Marquer comme terminée',
        'Êtes-vous sûr de vouloir marquer cette demande comme terminée ?',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Confirmer',
            style: 'default',
            onPress: async () => {
              const result = await RequestService.markAsCompleted(requestId);
              if (result.success) {
                setRequest(prev => ({ ...prev, status: 'completed' }));
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Succès', 'Demande marquée comme terminée');
              } else {
                Alert.alert('Erreur', result.error);
              }
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de modifier le statut');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Supprimer la demande',
      'Êtes-vous sûr de vouloir supprimer définitivement cette demande ?',
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
              style={styles.headerActionButton}
              onPress={handleShare}
            >
              <Ionicons name="share-outline" size={24} color={colors.white} />
            </TouchableOpacity>
            
            {isOwner && (
              <TouchableOpacity 
                style={styles.headerActionButton}
                onPress={handleEdit}
              >
                <Ionicons name="create-outline" size={24} color={colors.white} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </LinearGradient>

      {/* Contenu */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Titre et statut */}
        <View style={styles.titleSection}>
          <View style={styles.titleHeader}>
            <Text style={styles.title}>{request.title}</Text>
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
          
          <View style={styles.metaInfo}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={16} color={colors.text.secondary} />
              <Text style={styles.metaText}>
                Publié le {formatDateShort(request.createdAt)}
              </Text>
            </View>
            
            <View style={styles.metaItem}>
              <Ionicons name="flag-outline" size={16} color={getPriorityColor(request.priority)} />
              <Text style={[styles.metaText, { color: getPriorityColor(request.priority) }]}>
                Priorité {getPriorityText(request.priority)}
              </Text>
            </View>
          </View>
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

        {/* Informations détaillées */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations</Text>
          
          <View style={styles.infoGrid}>
            <View style={styles.infoCard}>
              <Ionicons name="grid-outline" size={24} color={colors.primary} />
              <Text style={styles.infoLabel}>Catégorie</Text>
              <Text style={styles.infoValue}>{request.category}</Text>
            </View>
            
            <View style={styles.infoCard}>
              <Ionicons name="location-outline" size={24} color={colors.primary} />
              <Text style={styles.infoLabel}>Zone</Text>
              <Text style={styles.infoValue}>{request.radius} km</Text>
            </View>
            
            <View style={styles.infoCard}>
              <Ionicons name="eye-outline" size={24} color={colors.primary} />
              <Text style={styles.infoLabel}>Vues</Text>
              <Text style={styles.infoValue}>{request.viewCount || 0}</Text>
            </View>
            
            <View style={styles.infoCard}>
              <Ionicons name="chatbubble-outline" size={24} color={colors.primary} />
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
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Actions pour le propriétaire */}
        {isOwner && request.status === 'active' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Actions</Text>
            
            <Button
              title="Marquer comme terminée"
              variant="success"
              icon="checkmark-circle-outline"
              onPress={handleMarkAsCompleted}
              fullWidth
              style={styles.actionButton}
            />
            
            <Button
              title="Supprimer la demande"
              variant="danger"
              icon="trash-outline"
              onPress={handleDelete}
              fullWidth
              style={styles.actionButton}
            />
          </View>
        )}

        {/* Espace en bas */}
        <View style={styles.bottomSpace} />
      </ScrollView>
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
  headerActionButton: {
    padding: 8,
    marginLeft: 8,
  },
  content: {
    flex: 1,
    marginTop: -10,
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  titleSection: {
    padding: 24,
    paddingBottom: 16,
  },
  titleHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginRight: 16,
    lineHeight: 32,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  metaInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
    marginBottom: 8,
  },
  metaText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginLeft: 6,
  },
  photosSection: {
    marginBottom: 24,
  },
  photo: {
    width: screenWidth,
    height: 250,
    backgroundColor: colors.gray[200],
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
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
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
});

export default RequestDetailScreen;