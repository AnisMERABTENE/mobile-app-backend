const mongoose = require('mongoose');

const sellerSchema = new mongoose.Schema({
  // Lien vers l'utilisateur
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true // Un utilisateur ne peut avoir qu'un seul profil vendeur
  },

  // Informations professionnelles
  businessName: {
    type: String,
    required: [true, 'Le nom de l\'entreprise est requis'],
    trim: true,
    maxlength: [100, 'Le nom de l\'entreprise ne peut pas dépasser 100 caractères']
  },

  description: {
    type: String,
    required: [true, 'La description est requise'],
    trim: true,
    maxlength: [500, 'La description ne peut pas dépasser 500 caractères']
  },

  // Contact
  phone: {
    type: String,
    required: [true, 'Le numéro de téléphone est requis'],
    trim: true,
    match: [/^[0-9+\-\s()]+$/, 'Format de téléphone invalide']
  },

  // Localisation du vendeur
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: [true, 'Les coordonnées sont requises']
    },
    address: {
      type: String,
      required: [true, 'L\'adresse est requise']
    },
    city: {
      type: String,
      required: true
    },
    postalCode: {
      type: String,
      required: true
    },
    country: {
      type: String,
      default: 'France'
    }
  },

  // Zone de service (rayon en kilomètres)
  serviceRadius: {
    type: Number,
    required: [true, 'Le rayon de service est requis'],
    min: [1, 'Le rayon minimum est de 1 km'],
    max: [100, 'Le rayon maximum est de 100 km'],
    default: 10
  },

  // Catégories et sous-catégories de spécialité
  specialties: [{
    category: {
      type: String,
      required: true,
      enum: [
        'electronique',
        'mobilier', 
        'vetements',
        'livres',
        'sport',
        'jardinage',
        'bricolage',
        'cuisine',
        'decoration',
        'jouets',
        'vehicules',
        'autres'
      ]
    },
    subCategories: [{
      type: String,
      required: true
    }]
  }],

  // Statut du profil vendeur
  status: {
    type: String,
    enum: ['pending', 'active', 'suspended', 'inactive'],
    default: 'pending' // En attente de validation
  },

  // Informations de validation
  isVerified: {
    type: Boolean,
    default: false
  },

  verifiedAt: {
    type: Date
  },

  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Disponibilité
  isAvailable: {
    type: Boolean,
    default: true
  },

  // Horaires de disponibilité (optionnel)
  workingHours: {
    monday: { start: String, end: String, available: { type: Boolean, default: true } },
    tuesday: { start: String, end: String, available: { type: Boolean, default: true } },
    wednesday: { start: String, end: String, available: { type: Boolean, default: true } },
    thursday: { start: String, end: String, available: { type: Boolean, default: true } },
    friday: { start: String, end: String, available: { type: Boolean, default: true } },
    saturday: { start: String, end: String, available: { type: Boolean, default: false } },
    sunday: { start: String, end: String, available: { type: Boolean, default: false } }
  },

  // Statistiques
  stats: {
    totalRequests: {
      type: Number,
      default: 0
    },
    respondedRequests: {
      type: Number,
      default: 0
    },
    successfulDeals: {
      type: Number,
      default: 0
    },
    averageResponseTime: {
      type: Number, // en minutes
      default: 0
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    reviewCount: {
      type: Number,
      default: 0
    }
  },

  // Paramètres de notification
  notificationSettings: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    pushNotifications: {
      type: Boolean,
      default: true
    },
    smsNotifications: {
      type: Boolean,
      default: false
    },
    instantNotifications: {
      type: Boolean,
      default: true
    }
  },

  // Photos du profil/entreprise
  photos: [{
    url: {
      type: String,
      required: true
    },
    alt: {
      type: String,
      default: ''
    },
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],

  // Dernière activité
  lastActiveAt: {
    type: Date,
    default: Date.now
  }

}, {
  timestamps: true, // createdAt, updatedAt
  toJSON: {
    transform: function(doc, ret) {
      // Calculer des propriétés virtuelles
      ret.responseRate = ret.stats.totalRequests > 0 
        ? Math.round((ret.stats.respondedRequests / ret.stats.totalRequests) * 100)
        : 0;
      
      ret.isOnline = ret.lastActiveAt && 
        (new Date() - new Date(ret.lastActiveAt)) < 15 * 60 * 1000; // 15 minutes
      
      return ret;
    }
  }
});

// Index géospatial pour les recherches par proximité
sellerSchema.index({ location: '2dsphere' });

// Index pour les recherches par spécialités
sellerSchema.index({ 'specialties.category': 1, 'specialties.subCategories': 1 });

// Index pour les recherches par statut
sellerSchema.index({ status: 1, isAvailable: 1 });

// Index pour les recherches par utilisateur
sellerSchema.index({ user: 1 });

// Index pour les recherches par ville
sellerSchema.index({ 'location.city': 1, 'location.postalCode': 1 });

// Méthode pour vérifier si le vendeur peut servir une localisation
sellerSchema.methods.canServeLocation = function(longitude, latitude) {
  const sellerCoords = this.location.coordinates;
  const distance = this.calculateDistance(
    sellerCoords[1], sellerCoords[0], // seller lat, lng
    latitude, longitude // request lat, lng
  );
  
  return distance <= this.serviceRadius;
};

// Méthode pour calculer la distance entre deux points (formule haversine)
sellerSchema.methods.calculateDistance = function(lat1, lon1, lat2, lon2) {
  const R = 6371; // Rayon de la Terre en km
  const dLat = this.deg2rad(lat2 - lat1);
  const dLon = this.deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance en km
};

// Méthode utilitaire pour convertir degrés en radians
sellerSchema.methods.deg2rad = function(deg) {
  return deg * (Math.PI/180);
};

// Méthode pour vérifier si le vendeur a une spécialité donnée
sellerSchema.methods.hasSpecialty = function(category, subCategory = null) {
  const specialty = this.specialties.find(s => s.category === category);
  if (!specialty) return false;
  
  if (subCategory) {
    return specialty.subCategories.includes(subCategory);
  }
  
  return true;
};

// Méthode pour mettre à jour les statistiques
sellerSchema.methods.updateStats = function(updates) {
  Object.keys(updates).forEach(key => {
    if (this.stats[key] !== undefined) {
      this.stats[key] = updates[key];
    }
  });
  return this.save();
};

// Méthode pour mettre à jour la dernière activité
sellerSchema.methods.updateActivity = function() {
  this.lastActiveAt = new Date();
  return this.save();
};

// Méthode statique pour trouver des vendeurs par proximité et spécialité
sellerSchema.statics.findNearbyBySpecialty = function(longitude, latitude, maxDistance, category, subCategory = null) {
  const matchQuery = {
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance * 1000 // Convertir km en mètres
      }
    },
    status: 'active',
    isAvailable: true,
    'specialties.category': category
  };

  // Ajouter le filtre de sous-catégorie si spécifié
  if (subCategory) {
    matchQuery['specialties.subCategories'] = subCategory;
  }

  return this.find(matchQuery)
    .populate('user', 'firstName lastName email avatar')
    .sort({ 'stats.rating': -1, lastActiveAt: -1 });
};

// Méthode statique pour obtenir les statistiques globales des vendeurs
sellerSchema.statics.getGlobalStats = function() {
  return this.aggregate([
    { $match: { status: 'active' } },
    {
      $group: {
        _id: null,
        totalSellers: { $sum: 1 },
        averageRating: { $avg: '$stats.rating' },
        totalDeals: { $sum: '$stats.successfulDeals' },
        activeSellers: {
          $sum: {
            $cond: [
              {
                $gte: [
                  '$lastActiveAt',
                  { $subtract: [new Date(), 15 * 60 * 1000] } // 15 minutes
                ]
              },
              1,
              0
            ]
          }
        }
      }
    }
  ]);
};

// Middleware pour valider les spécialités avant sauvegarde
sellerSchema.pre('save', function(next) {
  // Vérifier qu'il y a au moins une spécialité
  if (!this.specialties || this.specialties.length === 0) {
    return next(new Error('Au moins une spécialité est requise'));
  }

  // Vérifier que chaque spécialité a au moins une sous-catégorie
  for (const specialty of this.specialties) {
    if (!specialty.subCategories || specialty.subCategories.length === 0) {
      return next(new Error(`La spécialité ${specialty.category} doit avoir au moins une sous-catégorie`));
    }
  }

  // Mettre à jour le rôle de l'utilisateur si ce profil est actif
  if (this.status === 'active' && this.isModified('status')) {
    // Note: On fera cette mise à jour dans le contrôleur pour éviter les références circulaires
  }

  next();
});

// Middleware pour nettoyer les données avant suppression
sellerSchema.pre('remove', async function(next) {
  try {
    // Remettre le rôle utilisateur à 'user' si nécessaire
    const User = mongoose.model('User');
    await User.findByIdAndUpdate(this.user, { role: 'user' });
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('Seller', sellerSchema);