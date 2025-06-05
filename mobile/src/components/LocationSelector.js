import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import Slider from '@react-native-community/slider';
import colors from '../styles/colors';

const LocationSelector = ({
  location,
  radius = 5,
  onLocationSelect,
  onRadiusChange,
  error,
  style
}) => {
  const [loading, setLoading] = useState(false);
  const [locationPermission, setLocationPermission] = useState(null);

  // Vérifier les permissions au montage
  useEffect(() => {
    checkLocationPermission();
  }, []);

  const checkLocationPermission = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
      
      if (status !== 'granted') {
        console.log('📍 Permission de géolocalisation non accordée');
      } else {
        console.log('✅ Permission de géolocalisation accordée');
      }
    } catch (error) {
      console.error('❌ Erreur vérification permission:', error);
    }
  };

  const requestLocationPermission = async () => {
    try {
      console.log('🔐 Demande de permission géolocalisation...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
      
      if (status === 'granted') {
        console.log('✅ Permission accordée, récupération position...');
        getCurrentLocation();
      } else {
        console.log('❌ Permission refusée');
        Alert.alert(
          'Permission requise',
          'La géolocalisation est nécessaire pour poster une demande dans votre zone. Veuillez l\'autoriser dans les paramètres.',
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Paramètres', onPress: () => requestLocationPermission() }
          ]
        );
      }
      
      return status === 'granted';
    } catch (error) {
      console.error('❌ Erreur demande permission:', error);
      Alert.alert('Erreur', 'Impossible d\'accéder à la géolocalisation');
      return false;
    }
  };

  const getCurrentLocation = async () => {
    try {
      setLoading(true);
      console.log('📍 Récupération de la position GPS...');

      // Configuration de géolocalisation optimisée
      const options = {
        accuracy: Location.Accuracy.Balanced,
        timeout: 20000, // 20 secondes
        maximumAge: 60000, // Cache d'1 minute
      };

      console.log('🔍 Appel Location.getCurrentPositionAsync...');
      const locationResult = await Location.getCurrentPositionAsync(options);

      const { latitude, longitude } = locationResult.coords;
      console.log('✅ Coordonnées obtenues:', { latitude, longitude });
      console.log('📡 Précision GPS:', locationResult.coords.accuracy, 'mètres');

      // Maintenant utiliser notre API backend pour le géocodage inverse
      await reverseGeocodeWithBackend(latitude, longitude);

    } catch (error) {
      console.error('❌ Erreur géolocalisation GPS:', error);
      
      let errorMessage = 'Impossible d\'obtenir votre position GPS';
      let showRetry = true;
      
      if (error.code === 'TIMEOUT' || error.message.includes('timeout')) {
        errorMessage = 'Délai d\'attente dépassé. Assurez-vous d\'être dans un endroit avec une bonne réception GPS (près d\'une fenêtre).';
      } else if (error.code === 'UNAVAILABLE') {
        errorMessage = 'Service de géolocalisation indisponible. Vérifiez que le GPS est activé dans les paramètres.';
      } else if (error.code === 'PERMISSION_DENIED') {
        errorMessage = 'Permission de géolocalisation refusée.';
        showRetry = false;
      } else if (error.message.includes('Location request timed out')) {
        errorMessage = 'GPS trop lent. Essayez à l\'extérieur ou près d\'une fenêtre.';
      }
      
      Alert.alert(
        'Erreur GPS', 
        errorMessage,
        showRetry ? [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Réessayer', onPress: () => getCurrentLocation() }
        ] : [
          { text: 'OK', style: 'default' }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const reverseGeocodeWithBackend = async (latitude, longitude) => {
    try {
      console.log('🌍 Géocodage inverse avec notre API...');
      
      const response = await fetch(
        'https://mobile-app-backend-production-5d60.up.railway.app/api/geolocation/reverse',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            latitude: latitude,
            longitude: longitude,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success && result.location) {
        console.log('✅ Adresse récupérée:', result.location.address);
        console.log('🏙️ Ville:', result.location.city);
        console.log('📮 Code postal:', result.location.postalCode);
        
        onLocationSelect(result.location);
      } else {
        throw new Error('Réponse API invalide');
      }

    } catch (error) {
      console.error('❌ Erreur géocodage backend:', error);
      
      // Fallback : utiliser les coordonnées brutes
      console.log('🔄 Fallback: utilisation des coordonnées brutes');
      const fallbackLocation = {
        type: 'Point',
        coordinates: [longitude, latitude],
        address: `Position GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        city: 'Position détectée',
        postalCode: '',
        country: 'France'
      };
      
      onLocationSelect(fallbackLocation);
      
      Alert.alert(
        'Adresse partielle',
        'Position GPS obtenue, mais impossible de déterminer l\'adresse exacte. Vous pouvez continuer.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleLocationPress = async () => {
    console.log('🎯 Clic sur localisation, permission:', locationPermission);
    
    if (!locationPermission) {
      const granted = await requestLocationPermission();
      if (!granted) return;
    }
    
    getCurrentLocation();
  };

  const getRadiusText = (radiusValue) => {
    if (radiusValue === 1) return '1 km';
    if (radiusValue < 10) return `${radiusValue} km`;
    if (radiusValue >= 50) return `${radiusValue} km (large zone)`;
    return `${radiusValue} km`;
  };

  const getRadiusColor = (radiusValue) => {
    if (radiusValue <= 5) return colors.success;
    if (radiusValue <= 15) return colors.warning;
    return colors.danger;
  };

  return (
    <View style={[styles.container, style]}>
      {/* Sélecteur de localisation */}
      <TouchableOpacity
        style={[
          styles.locationButton,
          error && styles.locationButtonError,
          location && styles.locationButtonSelected
        ]}
        onPress={handleLocationPress}
        disabled={loading}
      >
        <View style={styles.locationContent}>
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons 
              name={location ? "location" : "location-outline"} 
              size={20} 
              color={location ? colors.primary : colors.gray[400]} 
            />
          )}
          
          <View style={styles.locationText}>
            <Text style={[
              styles.locationTitle,
              location && styles.locationTitleSelected
            ]}>
              {loading 
                ? 'Localisation en cours...' 
                : location 
                  ? 'Position détectée' 
                  : 'Obtenir ma position'
              }
            </Text>
            
            {location && (
              <Text style={styles.locationAddress} numberOfLines={2}>
                📍 {location.address}
              </Text>
            )}
          </View>
        </View>
        
        {!loading && (
          <Ionicons 
            name="refresh" 
            size={20} 
            color={colors.gray[400]} 
          />
        )}
      </TouchableOpacity>

      {/* Sélecteur de rayon */}
      {location && (
        <View style={styles.radiusContainer}>
          <View style={styles.radiusHeader}>
            <Text style={styles.radiusTitle}>Rayon de recherche</Text>
            <Text style={[
              styles.radiusValue,
              { color: getRadiusColor(radius) }
            ]}>
              {getRadiusText(radius)}
            </Text>
          </View>
          
          <View style={styles.sliderContainer}>
            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={100}
              step={1}
              value={radius}
              onValueChange={onRadiusChange}
              minimumTrackTintColor={getRadiusColor(radius)}
              maximumTrackTintColor={colors.gray[300]}
              thumbStyle={styles.sliderThumb}
            />
            
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>1 km</Text>
              <Text style={styles.sliderLabel}>100 km</Text>
            </View>
          </View>
          
          <View style={styles.radiusInfo}>
            <Ionicons name="information-circle-outline" size={16} color={colors.text.secondary} />
            <Text style={styles.radiusInfoText}>
              Les vendeurs dans cette zone recevront votre demande
            </Text>
          </View>
        </View>
      )}

      {/* Affichage d'erreur */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Aide pour la permission */}
      {locationPermission === false && (
        <View style={styles.permissionHelp}>
          <Ionicons name="shield-outline" size={16} color={colors.warning} />
          <Text style={styles.permissionHelpText}>
            Permission de géolocalisation requise pour poster une demande
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
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderWidth: 2,
    borderColor: colors.input.border,
    borderRadius: 12,
    backgroundColor: colors.input.background,
  },
  locationButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  locationButtonError: {
    borderColor: colors.danger,
  },
  locationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationText: {
    marginLeft: 12,
    flex: 1,
  },
  locationTitle: {
    fontSize: 16,
    color: colors.input.placeholder,
    fontWeight: '500',
  },
  locationTitleSelected: {
    color: colors.text.primary,
  },
  locationAddress: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 4,
  },
  radiusContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  radiusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  radiusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  radiusValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  sliderContainer: {
    marginBottom: 12,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderThumb: {
    backgroundColor: colors.primary,
    width: 20,
    height: 20,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sliderLabel: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  radiusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  radiusInfoText: {
    fontSize: 12,
    color: colors.text.secondary,
    marginLeft: 6,
    flex: 1,
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
  permissionHelp: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 12,
    backgroundColor: colors.warning + '20',
    borderRadius: 8,
  },
  permissionHelpText: {
    fontSize: 12,
    color: colors.warning,
    marginLeft: 6,
    flex: 1,
  },
});

export default LocationSelector;