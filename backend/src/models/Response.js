const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema({
  // Demande à laquelle on répond
  request: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Request',
    required: [true, 'La demande est requise']
  },

  // Vendeur qui répond
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller',
    required: [true, 'Le vendeur est requis']
  },

  // Utilisateur (pour faciliter les requêtes)
  sellerUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'L\'utilisateur vendeur est requis']
  },

  // Message de la réponse
  message: {
    type: String,
    required: [true, 'Le message est requis'],
    trim: true,
    maxlength: [1000, 'Le message ne peut pas dépasser 1000 caractères']
  },

  // Prix proposé (en euros)
  price: {
    type: Number,
    required: [true, 'Le prix est requis'],
    min: [0, 'Le prix ne peut pas être négatif']
  },

  // Photos du produit/service proposé
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

  // Statut de la réponse
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'cancelled'],
    default: 'pending'
  },

  // Informations de timing
  responseTime: {
    type: Number, // en minutes depuis la création de la demande
    default: 0
  },

  // Métadonnées pour les notifications
  isRead: {
    type: Boolean,
    default: false
  },

  readAt: {
    type: Date
  },

  // Réaction du client (optionnel)
  clientFeedback: {
    message: {
      type: String,
      trim: true,
      maxlength: [500, 'Le feedback ne peut pas dépasser 500 caractères']
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    createdAt: {
      type: Date
    }
  }

}, {
  timestamps: true, // createdAt, updatedAt
  toJSON: {
    transform: function(doc, ret) {
      // Calculer le temps de réponse si pas encore défini
      if (!ret.responseTime && ret.createdAt) {
        // On calculera depuis la demande dans le contrôleur
      }
      return ret;
    }
  }
});

// Index pour optimiser les recherches
responseSchema.index({ request: 1, createdAt: -1 });
responseSchema.index({ seller: 1, createdAt: -1 });
responseSchema.index({ sellerUser: 1, status: 1 });
responseSchema.index({ status: 1, createdAt: -1 });

// Index composé pour éviter les doublons (un vendeur ne peut répondre qu'une fois à une demande)
responseSchema.index({ request: 1, seller: 1 }, { unique: true });

// Méthode pour marquer comme lu
responseSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

// Méthode pour accepter/décliner la réponse
responseSchema.methods.updateStatus = function(newStatus, feedback = null) {
  this.status = newStatus;
  
  if (feedback && newStatus === 'accepted') {
    this.clientFeedback = {
      ...feedback,
      createdAt: new Date()
    };
  }
  
  return this.save();
};

// Middleware pour calculer le temps de réponse avant sauvegarde
responseSchema.pre('save', async function(next) {
  try {
    // Calculer le temps de réponse seulement lors de la création
    if (this.isNew) {
      const Request = mongoose.model('Request');
      const request = await Request.findById(this.request);
      
      if (request) {
        const timeDiff = this.createdAt - request.createdAt;
        this.responseTime = Math.round(timeDiff / (1000 * 60)); // en minutes
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Middleware pour incrémenter le compteur de réponses dans la demande
responseSchema.post('save', async function(doc) {
  try {
    if (doc.isNew) {
      const Request = mongoose.model('Request');
      await Request.findByIdAndUpdate(doc.request, {
        $inc: { responseCount: 1 }
      });
    }
  } catch (error) {
    console.error('❌ Erreur mise à jour compteur réponses:', error);
  }
});

// Middleware pour décrémenter le compteur lors de la suppression
responseSchema.post('remove', async function(doc) {
  try {
    const Request = mongoose.model('Request');
    await Request.findByIdAndUpdate(doc.request, {
      $inc: { responseCount: -1 }
    });
  } catch (error) {
    console.error('❌ Erreur mise à jour compteur réponses (suppression):', error);
  }
});

module.exports = mongoose.model('Response', responseSchema);