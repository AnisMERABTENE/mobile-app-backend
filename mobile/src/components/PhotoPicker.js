import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActionSheet,
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
      
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        
        // ✅ CORRECTION : S'assurer que le type MIME est correct
        let mimeType = asset.type || 'image/jpeg';
        if (!mimeType.startsWith('image/')) {
          mimeType = 'image/jpeg'; // Fallback par défaut
        }
        
        // ✅ CORRECTION : Générer un nom de fichier avec la bonne extension
        let fileName = asset.fileName || `photo_${Date.now()}.jpg`;
        if (!fileName.includes('.')) {
          // Si pas d'extension, l'ajouter basé sur le type MIME
          const extension = mimeType === 'image/png' ? '.png' : '.jpg';
          fileName = `photo_${Date.now()}${extension}`;
        }
        
        const newPhoto = {
          id: Date.now().toString(),
          uri: asset.uri,
          type: mimeType,
          name: fileName,
          size: asset.fileSize || 0,
        };
        
        console.log('📸 Photo caméra créée:', newPhoto);
        addPhoto(newPhoto);
      }
    } catch (error) {
      console.error('❌ Erreur caméra:', error);
      Alert.alert('Erreur', 'Impossible d\'accéder à la caméra');
    } finally {
      setLoading(false);
    }
  };

  const openGallery = async () => {
    try {
      setLoading(true);
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false,
        allowsMultipleSelection: false, // ✅ CORRECTION : Désactiver sélection multiple pour éviter les problèmes
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        result.assets.forEach((asset, index) => {
          // ✅ CORRECTION : S'assurer que le type MIME est correct
          let mimeType = asset.type || 'image/jpeg';
          if (!mimeType.startsWith('image/')) {
            mimeType = 'image/jpeg'; // Fallback par défaut
          }
          
          // ✅ CORRECTION : Générer un nom de fichier avec la bonne extension
          let fileName = asset.fileName || `photo_${Date.now() + index}.jpg`;
          if (!fileName.includes('.')) {
            // Si pas d'extension, l'ajouter basé sur le type MIME
            const extension = mimeType === 'image/png' ? '.png' : '.jpg';
            fileName = `photo_${Date.now() + index}${extension}`;
          }
          
          const newPhoto = {
            id: (Date.now() + index).toString(),
            uri: asset.uri,
            type: mimeType,
            name: fileName,
            size: asset.fileSize || 0,
          };
          
          console.log('🖼️ Photo galerie créée:', newPhoto);
          addPhoto(newPhoto);
        });
      }
    } catch (error) {
      console.error('❌ Erreur galerie:', error);
      Alert.alert('Erreur', 'Impossible d\'accéder à la galerie');
    } finally {
      setLoading(false);
    }
  };

  const addPhoto = (newPhoto) => {
    if (photos.length >= maxPhotos) {
      Alert.alert(
        'Limite atteinte',
        `Vous ne pouvez ajouter que ${maxPhotos} photos maximum.`
      );
      return;
    }

    // Vérifier la taille du fichier (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (newPhoto.size && newPhoto.size > maxSize) {
      Alert.alert(
        'Fichier trop volumineux',
        'La photo ne peut pas dépasser 5MB. Veuillez choisir une photo plus petite.'
      );
      return;
    }

    const updatedPhotos = [...photos, newPhoto];
    onPhotosChange(updatedPhotos);
    console.log('✅ Photo ajoutée:', newPhoto.name);
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
            const updatedPhotos = photos.filter(photo => photo.id !== photoId);
            onPhotosChange(updatedPhotos);
            console.log('🗑️ Photo supprimée');
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
          Ajoutez des photos pour mieux décrire votre demande. Format accepté: JPG, PNG (max 5MB)
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