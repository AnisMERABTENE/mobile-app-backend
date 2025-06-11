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
  style,
  hideRadiusSelector = false  // 🔧 NOUVEAU : Cacher le slider rayon
}) => {
  const [loading, setLoading] = useState(false);
  const [locationPermission, setLocationPermission] = useState(null);
  const [lastLocationTime, setLastLocationTime] = useState(null);

  // Vérifier les permissions au montage et périodiquement
  useEffect(() => {
    checkLocationPermission();
    
    // ✅ NOUVEAU : Vérifier les permissions toutes les 30 secondes si on est sur la page
    const interval = setInterval(checkLocationPermission, 30000);
    
    return () => clearInterval(interval);
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

  // ✅ FONCTION OPTIMISÉE CONTRE LES TIMEOUTS
  const getCurrentLocation = async () => {
    try {
      setLoading(true);
      console.log('📍 Récupération de la position GPS (version optimisée)...');

      // ✅ NOUVEAU : Vérifier si on a une position récente (moins de 5 minutes)
      const now = Date.now();
      if (lastLocationTime && (now - lastLocationTime) < 5 * 60 * 1000 && location) {
        console.log('✅ Utilisation de la position mise en cache');
        setLoading(false);
        return;
      }

      // ✅ STRATÉGIE 1 : Position rapide avec précision réduite d'abord
      console.log('🏃 Tentative position rapide...');
      
      try {
        const quickPosition = await Promise.race([
          Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Low, // ✅ Précision réduite = plus rapide
            timeout: 8000, // ✅ Timeout plus court
            maximumAge: 120000, // ✅ Accepte cache de 2 minutes
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Quick timeout')), 10000)
          )
        ]);

        const { latitude, longitude } = quickPosition.coords;
        console.log('✅ Position rapide obtenue:', { latitude, longitude });
        
        // Utiliser cette position temporairement
        await reverseGeocodeWithBackend(latitude, longitude);
        setLastLocationTime(now);
        
        // ✅ STRATÉGIE 2 : Améliorer la précision en arrière-plan
        console.log('🎯 Amélioration de la précision en arrière-plan...');
        
        setTimeout(async () => {
          try {
            const precisePosition = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
              timeout: 15000,
              maximumAge: 60000,
            });
            
            const preciseCoords = precisePosition.coords;
            console.log('🎯 Position précise obtenue:', preciseCoords);
            
            // Mettre à jour avec la position plus précise
            await reverseGeocodeWithBackend(preciseCoords.latitude, preciseCoords.longitude);
            setLastLocationTime(Date.now());
            
          } catch (preciseError) {
            console.log('⚠️ Amélioration précision échouée, garde position rapide');
          }
        }, 1000);
        
        return;

      } catch (quickError) {
        console.log('⚠️ Position rapide échouée, tentative normale...');
      }

      // ✅ STRATÉGIE 3 : Si position rapide échoue, méthode normale avec retry
      console.log('🔄 Tentative position normale avec retry...');
      
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`📍 Tentative ${attempt}/3...`);
          
          const options = {
            accuracy: attempt === 1 ? Location.Accuracy.Low : Location.Accuracy.Balanced,
            timeout: attempt * 10000, // 10s, 20s, 30s
            maximumAge: 180000, // 3 minutes
          };

          const locationResult = await Location.getCurrentPositionAsync(options);
          const { latitude, longitude } = locationResult.coords;
          
          console.log(`✅ Position obtenue tentative ${attempt}:`, { latitude, longitude });
          await reverseGeocodeWithBackend(latitude, longitude);
          setLastLocationTime(now);
          return;

        } catch (attemptError) {
          console.log(`❌ Tentative ${attempt} échouée:`, attemptError.message);
          
          if (attempt === 3) {
            throw attemptError;
          }
          
          // Pause entre les tentatives
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

    } catch (error) {
      console.error('❌ Erreur géolocalisation complète:', error);
      
      let errorMessage = 'Impossible d\'obtenir votre position';
      let showRetry = true;
      
      if (error.message.includes('timeout') || error.message.includes('Quick timeout')) {
        errorMessage = 'GPS trop lent. Essayez de vous rapprocher d\'une fenêtre ou sortez à l\'extérieur.';
      } else if (error.code === 'PERMISSION_DENIED') {
        errorMessage = 'Permission de géolocalisation refusée.';
        showRetry = false;
      } else if (error.code === 'POSITION_UNAVAILABLE') {
        errorMessage = 'Position GPS indisponible. Vérifiez que le GPS est activé.';
      }
      
      Alert.alert(
        'Erreur de géolocalisation', 
        errorMessage,
        showRetry ? [
          { text: 'Annuler', style: 'cancel' },
          { 
            text: 'Réessayer', 
            onPress: () => {
              // ✅ Reset cache et réessayer
              setLastLocationTime(null);
              getCurrentLocation();
            }
          }
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
        onLocationSelect(result.location);
      } else {
        throw new Error('Réponse API invalide');
      }

    } catch (error) {
      console.error('❌ Erreur géocodage backend:', error);
      
      // Fallback : utiliser les coordonnées brutes
      const fallbackLocation = {
        type: 'Point',
        coordinates: [longitude, latitude],
        address: `Position GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        city: 'Position détectée',
        postalCode: '',
        country: 'France'
      };
      
      onLocationSelect(fallbackLocation);
    }
  };

  const handleLocationPress = async () => {
    console.log('🎯 Clic sur localisation, permission:', locationPermission);
    
    // ✅ NOUVEAU : Re-vérifier les permissions avant chaque utilisation
    await checkLocationPermission();
    
    if (!locationPermission) {
      const granted = await requestLocationPermission();
      if (!granted) return;
    }
    
    getCurrentLocation();
  };

  // ✅ NOUVEAU : Bouton de refresh si on a déjà une position
  const handleRefreshLocation = async () => {
    setLastLocationTime(null); // Reset cache
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
        
        {/* ✅ NOUVEAU : Bouton refresh si position déjà obtenue */}
        {!loading && location && (
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={handleRefreshLocation}
          >
            <Ionicons 
              name="refresh" 
              size={20} 
              color={colors.gray[400]} 
            />
          </TouchableOpacity>
        )}
        
        {!loading && !location && (
          <Ionicons 
            name="chevron-forward" 
            size={20} 
            color={colors.gray[400]} 
          />
        )}
      </TouchableOpacity>

      {/* Indicateur de cache */}
      {location && lastLocationTime && (
        <View style={styles.cacheIndicator}>
          <Ionicons name="time-outline" size={12} color={colors.text.secondary} />
          <Text style={styles.cacheText}>
            Position mise en cache {Math.round((Date.now() - lastLocationTime) / 60000)} min
          </Text>
        </View>
      )}

      {/* 🔧 MODIFICATION : Sélecteur de rayon conditionnel */}
      {location && !hideRadiusSelector && (
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
  refreshButton: {
    padding: 4,
    marginLeft: 8,
  },
  cacheIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  cacheText: {
    fontSize: 12,
    color: colors.text.secondary,
    marginLeft: 4,
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