const express = require('express');
const router = express.Router();

console.log('🔄 Chargement des routes test géolocalisation...');

/**
 * @route   POST /api/geolocation/test
 * @desc    Tester la géolocalisation avec coordonnées fournies
 * @access  Public
 */
router.post('/test', async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    console.log('📍 Test géolocalisation:', { latitude, longitude });

    // Validation des coordonnées
    if (!latitude || !longitude) {
      return res.status(400).json({
        error: 'Latitude et longitude requises'
      });
    }

    // Vérifier que les coordonnées sont valides
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({
        error: 'Coordonnées invalides'
      });
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({
        error: 'Coordonnées hors limites'
      });
    }

    // Simuler un géocodage inverse (pour test)
    let address = 'Adresse non déterminée';
    let city = 'Ville inconnue';
    let postalCode = '';
    let country = 'France';

    // Quelques zones de test connues
    if (lat >= 48.8 && lat <= 48.9 && lng >= 2.3 && lng <= 2.4) {
      address = 'Paris Centre, France';
      city = 'Paris';
      postalCode = '75001';
    } else if (lat >= 43.2 && lat <= 43.3 && lng >= 5.3 && lng <= 5.4) {
      address = 'Marseille, France';
      city = 'Marseille';
      postalCode = '13001';
    } else if (lat >= 45.7 && lat <= 45.8 && lng >= 4.8 && lng <= 4.9) {
      address = 'Lyon, France';
      city = 'Lyon';
      postalCode = '69001';
    } else {
      // Géolocalisation générique
      address = `Position ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      city = 'Position détectée';
    }

    const locationData = {
      success: true,
      coordinates: [lng, lat], // Format MongoDB [longitude, latitude]
      location: {
        type: 'Point',
        coordinates: [lng, lat],
        address: address,
        city: city,
        postalCode: postalCode,
        country: country
      },
      metadata: {
        receivedLatitude: lat,
        receivedLongitude: lng,
        timestamp: new Date().toISOString(),
        precision: 'test'
      }
    };

    console.log('✅ Géolocalisation traitée:', locationData.location.address);

    res.json(locationData);

  } catch (error) {
    console.error('❌ Erreur test géolocalisation:', error);
    res.status(500).json({
      error: 'Erreur lors du test de géolocalisation',
      details: error.message
    });
  }
});

/**
 * @route   POST /api/geolocation/reverse
 * @desc    Géocodage inverse réel avec API externe
 * @access  Public
 */
router.post('/reverse', async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    console.log('🌍 Géocodage inverse pour:', { latitude, longitude });

    // Validation
    if (!latitude || !longitude) {
      return res.status(400).json({
        error: 'Latitude et longitude requises'
      });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({
        error: 'Coordonnées invalides'
      });
    }

    // Utiliser l'API de géocodage inverse gratuite
    // Nominatim (OpenStreetMap) - gratuit et sans clé API
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=fr`;
    
    console.log('🌐 Appel Nominatim:', nominatimUrl);

    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'MobileApp/1.0 (Contact: contact@example.com)'
      }
    });

    if (!response.ok) {
      throw new Error(`Erreur API: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data || data.error) {
      throw new Error('Aucune adresse trouvée pour ces coordonnées');
    }

    // Extraire les informations pertinentes
    const address = data.display_name || 'Adresse non trouvée';
    const addressComponents = data.address || {};
    
    const locationData = {
      success: true,
      coordinates: [lng, lat],
      location: {
        type: 'Point',
        coordinates: [lng, lat],
        address: address,
        city: addressComponents.city || 
               addressComponents.town || 
               addressComponents.village || 
               addressComponents.municipality || 
               'Ville inconnue',
        postalCode: addressComponents.postcode || '',
        country: addressComponents.country || 'France'
      },
      rawData: data,
      metadata: {
        source: 'nominatim',
        timestamp: new Date().toISOString(),
        precision: 'real'
      }
    };

    console.log('✅ Géocodage inverse réussi:', locationData.location.city);

    res.json(locationData);

  } catch (error) {
    console.error('❌ Erreur géocodage inverse:', error);
    res.status(500).json({
      error: 'Erreur lors du géocodage inverse',
      details: error.message
    });
  }
});

/**
 * @route   GET /api/geolocation/ping
 * @desc    Test de l'API géolocalisation
 * @access  Public
 */
router.get('/ping', (req, res) => {
  res.json({
    message: 'API Géolocalisation fonctionne !',
    timestamp: new Date().toISOString(),
    services: {
      test: 'POST /api/geolocation/test',
      reverse: 'POST /api/geolocation/reverse'
    }
  });
});

console.log('✅ Routes test géolocalisation chargées');

module.exports = router;