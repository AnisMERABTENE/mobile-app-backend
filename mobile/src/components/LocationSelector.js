import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Slider,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
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
      }
    } catch (error) {
      console.error('❌ Erreur vérification permission:', error);
    }
  };

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
      
      if (status === 'granted') {
        getCurrentLocation();
      } else {
        Alert.alert(
          'Permission requise',
          'La géolocalisation est nécessaire pour poster une demande dans votre zone.',
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Paramètres', onPress: () => Location.requestForegroundPermissionsAsync() }
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
      console.log('📍 Récupération de la position...');

      // Configuration de la géolocalisation
      const locationResult = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeout: 15000,
        maximumAge: 60000, // Cache de 1 minute
      });

      const { latitude, longitude } = locationResult.coords;
      console.log('✅ Position obtenue:', latitude, longitude);

      // Géocodage inverse pour obtenir l'adresse
      const addressResult = await Location.reverseGeocodeAsync({
        latitude,
        longitude
      });

      if (addressResult.length > 0) {
        const address = addressResult[0];
        const locationData = {
          coordinates: [longitude, latitude], // [lng, lat] pour MongoDB
          address: formatAddress(address),
          city: address.city || address.subregion || 'Ville inconnue',
          postalCode: address.postalCode || '',
          country: address.country || 'France'
        };

        console.log('✅ Adresse récupérée:', locationData.address);
        onLocationSelect(locationData);
      } else {
        // Si pas d'adresse trouvée, utiliser les coordonnées
        const locationData = {
          coordinates: [longitude, latitude],
          address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          city: 'Position actuelle',
          postalCode: '',
          country: 'France'
        };
        
        onLocationSelect(locationData);
      }

    } catch (error) {
      console.error('❌ Erreur géolocalisation:', error);
      
      let errorMessage = 'Impossible d\'obtenir votre position';
      
      if (error.code === 'TIMEOUT') {
        errorMessage = 'Délai d\'attente dépassé. Vérifiez votre connexion.';
      } else if (error.code === 'UNAVAILABLE') {
        errorMessage = 'Service de géolocalisation indisponible.';
      } else if (error.code === 'PERMISSION_DENIED') {
        errorMessage = 'Permission de géolocalisation refusée.';
      }
      
      Alert.alert('Erreur de géolocalisation', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address) => {
    const parts = [];
    
    if (address.streetNumber) parts.push(address.streetNumber);
    if (address.street) parts.push(address.street);
    if (address.city) parts.push(address.city);
    if (address.postalCode) parts.push(address.postalCode);
    
    return parts.join(', ') || 'Adresse non disponible';
  };

  const handleLocationPress = async () => {
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
              Plus le rayon est large, plus vous toucherez de personnes
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