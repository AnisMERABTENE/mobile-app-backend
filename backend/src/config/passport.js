const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

console.log('🔄 Configuration Passport Google OAuth...');

// Déboguer les variables d'environnement
console.log('📋 GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'Défini' : 'NON DÉFINI');
console.log('📋 GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'Défini' : 'NON DÉFINI');

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.error('❌ Variables Google OAuth manquantes dans .env');
  return;
}

// Configuration de la stratégie Google OAuth
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/api/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    console.log('📧 Connexion Google tentée pour:', profile.emails[0].value);
    
    // Extraire les informations du profil Google
    const email = profile.emails[0].value;
    const googleId = profile.id;
    const firstName = profile.name.givenName;
    const lastName = profile.name.familyName;
    const avatar = profile.photos[0].value;

    // Vérifier si l'utilisateur existe déjà avec cet email
    let user = await User.findOne({ email });

    if (user) {
      // Utilisateur existe - mettre à jour avec les infos Google si nécessaire
      if (!user.googleId) {
        user.googleId = googleId;
        user.isEmailVerified = true; // Google vérifie déjà l'email
        if (!user.avatar) user.avatar = avatar;
        await user.save();
        console.log('✅ Compte existant lié à Google:', email);
      } else {
        console.log('✅ Connexion Google réussie:', email);
      }
    } else {
      // Créer un nouveau compte utilisateur avec Google
      user = new User({
        firstName,
        lastName,
        email,
        googleId,
        avatar,
        isEmailVerified: true, // Google vérifie déjà l'email
        role: 'user'
        // Pas de mot de passe car connexion via Google
      });
      
      await user.save();
      console.log('✅ Nouveau compte créé via Google:', email);
    }

    // Mettre à jour la dernière connexion
    user.lastLoginAt = new Date();
    await user.save();

    return done(null, user);

  } catch (error) {
    console.error('❌ Erreur OAuth Google:', error);
    return done(error, null);
  }
}));

// Sérialisation pour les sessions (optionnel pour API)
passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

console.log('✅ Passport Google OAuth configuré');

module.exports = passport;