const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  // Utilisateur qui fait la demande
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Informations principales de la demande
  title: {
    type: String,
    required: [true, 'Le titre est requis'],
    trim: true,
    maxlength: [100, 'Le titre ne peut pas dépasser 100 caractères']
  },
  
  description: {
    type: String,
    required: [true, 'La description est requise'],
    trim: true,
    maxlength: [1000, 'La description ne peut pas dépasser 1000 caractères']
  },

  // Catégories
  category: {
    type: String,
    required: [true, 'La catégorie est requise'],
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

  subCategory: {
    type: String,
    required: [true, 'La sous-catégorie est requise']
  },

  // Photos de la demande (URLs)
  photos: [{
    url: {
      type: String,
      required: true
    },
    alt: {
      type: String,
      default: ''
    }
  }],

  // Géolocalisation
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

  // Rayon de recherche (en kilomètres)
  radius: {
    type: Number,
    required: [true, 'Le rayon de recherche est requis'],
    min: [1, 'Le rayon minimum est de 1 km'],
    max: [100, 'Le rayon maximum est de 100 km'],
    default: 5
  },

  // Statut de la demande
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled', 'expired'],
    default: 'active'
  },

  // Priorité (optionnel)
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },

  // Dates
  expiresAt: {
    type: Date,
    default: function() {
      // Par défaut, expire dans 30 jours
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
  },

  // Réponses reçues (compteur)
  responseCount: {
    type: Number,
    default: 0
  },

  // Vues (compteur)
  viewCount: {
    type: Number,
    default: 0
  },

  // Tags optionnels
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }]
}, {
  timestamps: true, // createdAt, updatedAt
  toJSON: {
    transform: function(doc, ret) {
      // Calculer des propriétés virtuelles
      ret.isExpired = ret.expiresAt < new Date();
      ret.daysLeft = Math.ceil((ret.expiresAt - new Date()) / (1000 * 60 * 60 * 24));
      return ret;
    }
  }
});

// Index géospatial pour les recherches par proximité
requestSchema.index({ location: '2dsphere' });

// Index pour les recherches par catégorie
requestSchema.index({ category: 1, subCategory: 1 });

// Index pour les recherches par utilisateur
requestSchema.index({ user: 1, status: 1 });

// Index pour les recherches par date
requestSchema.index({ createdAt: -1 });

// Index pour les recherches actives
requestSchema.index({ status: 1, expiresAt: 1 });

// Méthode pour vérifier si la demande est active
requestSchema.methods.isActive = function() {
  return this.status === 'active' && this.expiresAt > new Date();
};

// Méthode pour marquer comme vue
requestSchema.methods.incrementView = function() {
  return this.updateOne({ $inc: { viewCount: 1 } });
};

// Méthode pour incrementer les réponses
requestSchema.methods.incrementResponse = function() {
  return this.updateOne({ $inc: { responseCount: 1 } });
};

// Méthode statique pour trouver des demandes par proximité
requestSchema.statics.findNearby = function(longitude, latitude, maxDistance = 10000) {
  return this.find({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance // en mètres
      }
    },
    status: 'active',
    expiresAt: { $gt: new Date() }
  });
};

// Middleware pour nettoyer les données avant sauvegarde
requestSchema.pre('save', function(next) {
  // Nettoyer le titre et la description
  if (this.title) {
    this.title = this.title.trim();
  }
  if (this.description) {
    this.description = this.description.trim();
  }
  
  // Nettoyer les tags
  if (this.tags && this.tags.length > 0) {
    this.tags = this.tags
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0)
      .slice(0, 10); // Maximum 10 tags
  }
  
  next();
});

// Méthode statique pour nettoyer les demandes expirées
requestSchema.statics.cleanExpiredRequests = function() {
  return this.updateMany(
    { 
      status: 'active',
      expiresAt: { $lt: new Date() }
    },
    { 
      $set: { status: 'expired' }
    }
  );
};

// Middleware pour supprimer les demandes expirées automatiquement
requestSchema.pre(/^find/, function(next) {
  // On évite le middleware automatique qui causait des problèmes
  // La méthode cleanExpiredRequests peut être appelée manuellement si besoin
  next();
});

module.exports = mongoose.model('Request', requestSchema);