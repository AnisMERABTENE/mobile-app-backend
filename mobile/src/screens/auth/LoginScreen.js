import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../context/AuthContext';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Loading from '../../components/Loading';
import colors, { getGradientString } from '../../styles/colors';

const LoginScreen = ({ navigation }) => {
  const { login, loginWithGoogle, isLoading, error, clearError, getRememberedEmail, handleAuthDeepLink } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [googleLoading, setGoogleLoading] = useState(false);
  
  const passwordRef = useRef(null);

  // Charger l'email sauvegardé au démarrage
  useEffect(() => {
    loadRememberedEmail();
  }, []);

  // Effacer les erreurs quand on tape
  useEffect(() => {
    if (error) {
      clearError();
    }
  }, [formData.email, formData.password]);

  const loadRememberedEmail = async () => {
    try {
      const savedEmail = await getRememberedEmail();
      if (savedEmail) {
        setFormData(prev => ({ ...prev, email: savedEmail }));
        setRememberMe(true);
      }
    } catch (error) {
      console.log('Pas d\'email sauvegardé');
    }
  };

  const validateForm = () => {
    const errors = {};

    // Validation email
    if (!formData.email.trim()) {
      errors.email = 'L\'email est requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Format d\'email invalide';
    }

    // Validation mot de passe
    if (!formData.password) {
      errors.password = 'Le mot de passe est requis';
    } else if (formData.password.length < 8) {
      errors.password = 'Le mot de passe doit contenir au moins 8 caractères';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Effacer l'erreur du champ modifié
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const result = await login(formData.email, formData.password, rememberMe);
      
      if (!result.success) {
        Alert.alert('Erreur de connexion', result.error);
      }
      // Si succès, la navigation se fera automatiquement via AuthContext
    } catch (error) {
      Alert.alert('Erreur', 'Une erreur inattendue s\'est produite');
    }
  };

  /**
   * ✅ CONNEXION GOOGLE SIMPLIFIÉE - VERSION CORRIGÉE
   */
  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      console.log('🔵 Démarrage connexion Google depuis LoginScreen...');
      
      // ✅ CORRECTION : Utilise directement le contexte d'authentification (simplifié)
      const result = await loginWithGoogle();
      
      console.log('📱 Résultat Google depuis LoginScreen:', {
        success: result.success,
        cancelled: result.cancelled,
        hasUser: !!result.user,
        error: result.error
      });

      if (result.success) {
        console.log('✅ Connexion Google réussie depuis LoginScreen');
        // La navigation se fait automatiquement via AuthContext
        Alert.alert(
          '🎉 Connexion réussie !', 
          `Bienvenue ${result.user?.firstName || result.user?.email || 'utilisateur'} !`,
          [{ text: 'Parfait !', style: 'default' }]
        );
      } else if (result.cancelled) {
        console.log('ℹ️ Connexion Google annulée par l\'utilisateur');
        // Ne pas afficher d'erreur pour une annulation
      } else {
        console.error('❌ Échec connexion Google depuis LoginScreen:', result.error);
        Alert.alert(
          'Erreur de connexion Google', 
          result.error || 'Une erreur est survenue lors de la connexion avec Google'
        );
      }
      
    } catch (error) {
      console.error('❌ Erreur Google login LoginScreen:', error);
      Alert.alert(
        'Erreur technique', 
        'Une erreur inattendue s\'est produite lors de l\'authentification Google'
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  /**
   * ✅ FONCTION DE TEST TOKEN (pour développement/debug)
   */
  const testTokenDirectly = async () => {
    try {
      setGoogleLoading(true);
      console.log('🧪 Test direct du token...');
      
      // Token de test valide (remplace par un token récent de tes logs si besoin)
      const testToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4M2NiYjhkYjJjMWFiODQ4YzE3OTc5MCIsImVtYWlsIjoiYW5pc3NhcGExMzZAZ21haWwuY29tIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3NDkwNzI3MDUsImV4cCI6MTc0OTY3NzUwNSwiYXVkIjoibW9iaWxlLWFwcC11c2VycyIsImlzcyI6Im1vYmlsZS1hcHAtYmFja2VuZCJ9.a2yDUkEQOME-5Xgl2tLchlbvKAR_qtWxWdFUJbgccHI";
      
      // Simuler le deep link complet avec le token de test
      const fakeUrl = `myapp://auth?token=${testToken}&success=true&email=test@example.com&platform=test`;
      
      console.log('🧪 Simulation deep link avec token de test...');
      const result = await handleAuthDeepLink(fakeUrl);
      
      if (result.success) {
        Alert.alert(
          '✅ Test réussi !', 
          `Connexion test réussie pour ${result.user?.email || 'utilisateur test'}`
        );
      } else {
        Alert.alert(
          '❌ Test échoué', 
          `Erreur test: ${result.error}`
        );
      }
      
    } catch (error) {
      console.error('❌ Erreur test token:', error);
      Alert.alert('❌ Erreur technique test', error.message);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  const handleRegister = () => {
    navigation.navigate('Register');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <LinearGradient
        colors={getGradientString('primary')}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Ionicons name="log-in-outline" size={48} color={colors.white} />
          <Text style={styles.headerTitle}>Bon retour !</Text>
          <Text style={styles.headerSubtitle}>
            Connectez-vous à votre compte
          </Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.form}
          contentContainerStyle={styles.formContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Google Login Button - EN PREMIER */}
          <Button
            title="Continuer avec Google"
            variant="google"
            icon="logo-google"
            onPress={handleGoogleLogin}
            loading={googleLoading}
            fullWidth
            gradient={false}
            style={styles.googleButton}
          />

          {/* ✅ BOUTON TEST (pour développement) */}
          {__DEV__ && (
            <Button
              title="🧪 TEST TOKEN DIRECT"
              variant="outline"
              onPress={testTokenDirectly}
              fullWidth
              style={styles.testButton}
              textStyle={{ color: colors.warning }}
            />
          )}

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ou</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Email Input */}
          <Input
            label="Adresse email"
            type="email"
            placeholder="Entrez votre email"
            value={formData.email}
            onChangeText={(value) => handleInputChange('email', value)}
            error={formErrors.email}
            required
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            autoFocus
          />

          {/* Password Input */}
          <Input
            ref={passwordRef}
            label="Mot de passe"
            type="password"
            placeholder="Entrez votre mot de passe"
            value={formData.password}
            onChangeText={(value) => handleInputChange('password', value)}
            error={formErrors.password}
            required
            returnKeyType="go"
            onSubmitEditing={handleLogin}
          />

          {/* Remember Me & Forgot Password */}
          <View style={styles.optionsRow}>
            <TouchableOpacity
              style={styles.rememberMe}
              onPress={() => setRememberMe(!rememberMe)}
            >
              <Ionicons
                name={rememberMe ? 'checkbox' : 'checkbox-outline'}
                size={20}
                color={rememberMe ? colors.primary : colors.gray[400]}
              />
              <Text style={styles.rememberMeText}>Se souvenir de moi</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleForgotPassword}>
              <Text style={styles.forgotPasswordText}>
                Mot de passe oublié ?
              </Text>
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          <Button
            title="Se connecter"
            onPress={handleLogin}
            loading={isLoading}
            fullWidth
            style={styles.loginButton}
          />

          {/* Register Link */}
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>
              Vous n'avez pas de compte ?{' '}
            </Text>
            <TouchableOpacity onPress={handleRegister}>
              <Text style={styles.registerLink}>S'inscrire</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.white,
    marginTop: 16,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.white,
    opacity: 0.9,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    marginTop: -20,
  },
  form: {
    flex: 1,
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  formContent: {
    padding: 24,
    paddingTop: 32,
  },
  googleButton: {
    marginBottom: 16,
  },
  testButton: {
    marginBottom: 16,
    borderColor: colors.warning,
    backgroundColor: colors.warning + '20',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.gray[300],
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: colors.text.secondary,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  rememberMe: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rememberMeText: {
    marginLeft: 8,
    fontSize: 14,
    color: colors.text.secondary,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  loginButton: {
    marginBottom: 32,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  registerLink: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
});

export default LoginScreen;