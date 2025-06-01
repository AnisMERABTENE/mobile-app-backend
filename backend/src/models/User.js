const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Informations de base
  firstName: {
    type: String,
    required: [true, 'Le prénom est requis'],
    trim: true,
    maxlength: [50, 'Le prénom ne peut pas dépasser 50 caractères']
  },
  lastName: {
    type: String,
    required: [true, 'Le nom est requis'],
    trim: true,
    maxlength: [50, 'Le nom ne peut pas dépasser 50 caractères']
  },
  email: {
    type: String,
    required: [true, 'L\'email est requis'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Veuillez entrer un email valide'
    ]
  },
  password: {
    type: String,
    required: function() {
      // Le mot de passe n'est requis que si ce n'est pas une connexion Google
      return !this.googleId;
    },
    minlength: [8, 'Le mot de passe doit contenir au moins 8 caractères'],
    select: false // N'inclut pas le mot de passe dans les requêtes par défaut
  },
  
  // Authentification Google
  googleId: {
    type: String,
    sparse: true // Permet les valeurs null/undefined mais garde l'unicité
  },
  
  // Vérification email
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  
  // Récupération mot de passe
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  
  // Rôles utilisateur
  role: {
    type: String,
    enum: ['user', 'seller', 'admin'],
    default: 'user'
  },
  
  // Statut du compte
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Informations de connexion
  lastLoginAt: Date,
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  
  // Avatar
  avatar: {
    type: String,
    default: ''
  }
}, {
  timestamps: true, // Ajoute createdAt et updatedAt automatiquement
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.emailVerificationToken;
      delete ret.resetPasswordToken;
      delete ret.loginAttempts;
      delete ret.lockUntil;
      return ret;
    }
  }
});

// Index pour optimiser les recherches
userSchema.index({ email: 1 });
userSchema.index({ googleId: 1 });
userSchema.index({ emailVerificationToken: 1 });
userSchema.index({ resetPasswordToken: 1 });

// Middleware pour hasher le mot de passe avant sauvegarde
userSchema.pre('save', async function(next) {
  // Ne hash que si le mot de passe a été modifié
  if (!this.isModified('password')) return next();
  
  try {
    // Hash le mot de passe avec bcrypt
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Méthode pour comparer les mots de passe
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Méthode pour vérifier si le compte est verrouillé
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Méthode pour incrémenter les tentatives de connexion
userSchema.methods.incLoginAttempts = function() {
  // Si on a un verrou précédent et qu'il a expiré, on remet à zéro
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Verrouiller le compte après 5 tentatives
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 heures
  }
  
  return this.updateOne(updates);
};

// Méthode pour réinitialiser les tentatives de connexion
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

module.exports = mongoose.model('User', userSchema);