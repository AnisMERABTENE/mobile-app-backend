import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import colors from '../styles/colors';

const PhotoPicker = ({
  photos = [],
  onPhotosChange,
  maxPhotos = 5,
  error,
  style
}) => {
  const [loading, setLoading] = useState(false);

  // Vérifier les permissions au montage
  React.useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      // Vérifier les permissions pour la caméra et la galerie
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (cameraPermission.status !== 'granted' || mediaPermission.status !== 'granted') {
        console.log('📸 Permissions photos non accordées');
        Alert.alert(
          'Permissions requises',
          'L\'application a besoin des permissions caméra et galerie pour fonctionner correctement.',
          [{ text: 'OK' }]
        );
      } else {
        console.log('✅ Permissions photos accordées');
      }
    } catch (error) {
      console.error('❌ Erreur vérification permissions photos:', error);
    }
  };

  const showImagePicker = () => {
    Alert.alert(
      'Ajouter une photo',
      'Choisissez comment ajouter votre photo',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: '📷 Prendre une photo', onPress: () => openCamera() },
        { text: '🖼️ Galerie', onPress: () => openGallery() },
      ]
    );
  };

  const openCamera = async () => {
    try {
      setLoading(true);
      console.log('📷 Ouverture caméra...');
      
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8, // ✅ CORRECTION : Qualité pour réduire la taille
        base64: false,
      });

      console.log('📷 Résultat caméra:', {
        cancelled: result.canceled,
        assetsLength: result.assets?.length
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        console.log('📷 Asset caméra:', {
          uri: asset.uri?.substring(0, 50) + '...',
          type: asset.type,
          fileName: asset.fileName,
          fileSize: asset.fileSize
        });
        
        // ✅ CORRECTION CRITIQUE : Création photo améliorée
        const newPhoto = createPhotoObject(asset, 'camera');
        
        if (newPhoto) {
          console.log('📸 Photo caméra créée:', newPhoto.name);
          addPhoto(newPhoto);
        } else {
          Alert.alert('Erreur', 'Impossible de traiter la photo de la caméra');
        }
      }
    } catch (error) {
      console.error('❌ Erreur caméra:', error);
      Alert.alert('Erreur', 'Impossible d\'accéder à la caméra: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const openGallery = async () => {
    try {
      setLoading(true);
      console.log('🖼️ Ouverture galerie...');
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8, // ✅ CORRECTION : Qualité pour réduire la taille
        base64: false,
        allowsMultipleSelection: false, // Une seule photo à la fois
      });

      console.log('🖼️ Résultat galerie:', {
        cancelled: result.canceled,
        assetsLength: result.assets?.length
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        console.log('🖼️ Asset galerie:', {
          uri: asset.uri?.substring(0, 50) + '...',
          type: asset.type,
          fileName: asset.fileName,
          fileSize: asset.fileSize
        });
        
        // ✅ CORRECTION CRITIQUE : Création photo améliorée
        const newPhoto = createPhotoObject(asset, 'gallery');
        
        if (newPhoto) {
          console.log('🖼️ Photo galerie créée:', newPhoto.name);
          addPhoto(newPhoto);
        } else {
          Alert.alert('Erreur', 'Impossible de traiter la photo de la galerie');
        }
      }
    } catch (error) {
      console.error('❌ Erreur galerie:', error);
      Alert.alert('Erreur', 'Impossible d\'accéder à la galerie: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ NOUVELLE FONCTION : Création d'objet photo normalisé
  const createPhotoObject = (asset, source) => {
    try {
      if (!asset || !asset.uri) {
        console.error('❌ Asset invalide:', asset);
        return null;
      }

      // ✅ CORRECTION : Détecter le type MIME correct
      let mimeType = asset.type || 'image/jpeg';
      let fileName = asset.fileName || asset.filename || `photo_${Date.now()}.jpg`;
      
      // Si pas de type MIME, le déduire du nom de fichier
      if (!mimeType.startsWith('image/')) {
        if (fileName.toLowerCase().includes('.png')) {
          mimeType = 'image/png';
        } else if (fileName.toLowerCase().includes('.webp')) {
          mimeType = 'image/webp';
        } else {
          mimeType = 'image/jpeg'; // Fallback
        }
      }
      
      // Si pas d'extension dans le nom, l'ajouter
      if (!fileName.includes('.')) {
        const extension = mimeType === 'image/png' ? '.png' : 
                         mimeType === 'image/webp' ? '.webp' : '.jpg';
        fileName = `photo_${Date.now()}${extension}`;
      }
      
      // ✅ CORRECTION : Gérer la taille
      let fileSize = asset.fileSize || asset.size || 0;
      
      // Si pas de taille, estimer (optionnel)
      if (!fileSize && asset.width && asset.height) {
        // Estimation grossière basée sur les dimensions
        fileSize = Math.round((asset.width * asset.height * 3) / 4); // RGB compressé
      }
      
      const photo = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        uri: asset.uri,
        type: mimeType,
        name: fileName,
        size: fileSize,
        source: source,
        width: asset.width,
        height: asset.height,
        created: new Date().toISOString()
      };
      
      console.log('✅ Photo normalisée créée:', {
        name: photo.name,
        type: photo.type,
        size: photo.size,
        source: photo.source,
        hasUri: !!photo.uri
      });
      
      return photo;
      
    } catch (error) {
      console.error('❌ Erreur création photo object:', error);
      return null;
    }
  };

  const addPhoto = (newPhoto) => {
    try {
      if (photos.length >= maxPhotos) {
        Alert.alert(
          'Limite atteinte',
          `Vous ne pouvez ajouter que ${maxPhotos} photos maximum.`
        );
        return;
      }

      // ✅ CORRECTION : Vérification taille améliorée
      const maxSize = 10 * 1024 * 1024; // 10MB (cohérent avec le backend)
      if (newPhoto.size && newPhoto.size > maxSize) {
        Alert.alert(
          'Fichier trop volumineux',
          `La photo ne peut pas dépasser 10MB. Taille actuelle: ${Math.round(newPhoto.size / 1024 / 1024)}MB`
        );
        return;
      }

      // ✅ CORRECTION : Vérification type MIME
      const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
        'image/JPEG', 'image/JPG', 'image/PNG', 'image/WEBP'
      ];
      
      if (newPhoto.type && !allowedTypes.includes(newPhoto.type)) {
        Alert.alert(
          'Format non supporté',
          `Format ${newPhoto.type} non supporté. Utilisez JPG, PNG ou WebP.`
        );
        return;
      }

      const updatedPhotos = [...photos, newPhoto];
      onPhotosChange(updatedPhotos);
      console.log('✅ Photo ajoutée à la liste:', newPhoto.name);
      
      // Feedback visuel
      Alert.alert(
        '✅ Photo ajoutée',
        `Photo "${newPhoto.name}" ajoutée avec succès !`,
        [{ text: 'OK' }],
        { cancelable: true }
      );
      
    } catch (error) {
      console.error('❌ Erreur ajout photo:', error);
      Alert.alert('Erreur', 'Impossible d\'ajouter la photo: ' + error.message);
    }
  };

  const removePhoto = (photoId) => {
    Alert.alert(
      'Supprimer la photo',
      'Êtes-vous sûr de vouloir supprimer cette photo ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive',
          onPress: () => {
            try {
              const updatedPhotos = photos.filter(photo => photo.id !== photoId);
              onPhotosChange(updatedPhotos);
              console.log('🗑️ Photo supprimée de la liste');
            } catch (error) {
              console.error('❌ Erreur suppression photo:', error);
            }
          }
        },
      ]
    );
  };

  const canAddMore = photos.length < maxPhotos;

  return (
    <View style={[styles.container, style]}>
      {/* En-tête */}
      <View style={styles.header}>
        <Text style={styles.title}>Photos de votre demande</Text>
        <Text style={styles.subtitle}>
          {photos.length}/{maxPhotos} photos ajoutées
        </Text>
      </View>

      {/* Zone d'ajout de photos */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.photosScroll}
        contentContainerStyle={styles.photosContainer}
      >
        {/* Photos existantes */}
        {photos.map((photo) => (
          <View key={photo.id} style={styles.photoItem}>
            <Image source={{ uri: photo.uri }} style={styles.photoImage} />
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removePhoto(photo.id)}
            >
              <Ionicons name="close-circle" size={24} color={colors.danger} />
            </TouchableOpacity>
            {/* ✅ NOUVEAU : Indicateur de taille */}
            {photo.size && (
              <View style={styles.sizeIndicator}>
                <Text style={styles.sizeText}>
                  {Math.round(photo.size / 1024)}KB
                </Text>
              </View>
            )}
          </View>
        ))}

        {/* Bouton d'ajout */}
        {canAddMore && (
          <TouchableOpacity
            style={[
              styles.addButton,
              error && styles.addButtonError,
              loading && styles.addButtonLoading
            ]}
            onPress={showImagePicker}
            disabled={loading}
          >
            <Ionicons 
              name={loading ? "hourglass-outline" : "camera-outline"} 
              size={32} 
              color={error ? colors.danger : colors.primary} 
            />
            <Text style={[
              styles.addButtonText,
              error && styles.addButtonTextError
            ]}>
              {loading ? 'Chargement...' : 'Ajouter'}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Informations supplémentaires */}
      <View style={styles.info}>
        <Ionicons name="information-circle-outline" size={16} color={colors.text.secondary} />
        <Text style={styles.infoText}>
          Ajoutez des photos pour mieux décrire votre demande. Format accepté: JPG, PNG, WebP (max 10MB)
        </Text>
      </View>

      {/* Affichage d'erreur */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Limite atteinte */}
      {!canAddMore && (
        <View style={styles.limitReached}>
          <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
          <Text style={styles.limitReachedText}>
            Limite de {maxPhotos} photos atteinte
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  photosScroll: {
    marginBottom: 12,
  },
  photosContainer: {
    paddingHorizontal: 0,
  },
  photoItem: {
    position: 'relative',
    marginRight: 12,
  },
  photoImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: colors.gray[200],
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.white,
    borderRadius: 12,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  // ✅ NOUVEAU : Indicateur de taille
  sizeIndicator: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  sizeText: {
    fontSize: 10,
    color: colors.white,
    fontWeight: '500',
  },
  addButton: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary + '10',
  },
  addButtonError: {
    borderColor: colors.danger,
    backgroundColor: colors.danger + '10',
  },
  addButtonLoading: {
    opacity: 0.7,
  },
  addButtonText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
    marginTop: 4,
  },
  addButtonTextError: {
    color: colors.danger,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: colors.gray[50],
    borderRadius: 8,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: colors.text.secondary,
    marginLeft: 6,
    flex: 1,
    lineHeight: 16,
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
  limitReached: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: colors.success + '20',
    borderRadius: 8,
  },
  limitReachedText: {
    fontSize: 12,
    color: colors.success,
    marginLeft: 6,
    fontWeight: '500',
  },
});

export default PhotoPicker;