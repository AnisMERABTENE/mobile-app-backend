import React, { useState } from 'react';
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

const ForgotPasswordScreen = ({ navigation }) => {
  const { forgotPassword, isLoading } = useAuth();
  
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const validateEmail = () => {
    if (!email.trim()) {
      setEmailError('L\'email est requis');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Format d\'email invalide');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleSubmit = async () => {
    if (!validateEmail()) {
      return;
    }

    try {
      const result = await forgotPassword(email.trim());
      
      if (result.success) {
        setEmailSent(true);
        Alert.alert(
          'Email envoyé !',
          'Vérifiez votre boîte email pour les instructions de réinitialisation.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Erreur', result.error);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Une erreur inattendue s\'est produite');
    }
  };

  const handleEmailChange = (value) => {
    setEmail(value);
    if (emailError) {
      setEmailError('');
    }
  };

  if (isLoading) {
    return <Loading fullScreen gradient text="Envoi en cours..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <LinearGradient
        colors={getGradientString('primary')}
        style={styles.header}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Ionicons name="key-outline" size={48} color={colors.white} />
          <Text style={styles.headerTitle}>Mot de passe oublié</Text>
          <Text style={styles.headerSubtitle}>
            Nous vous enverrons un lien de réinitialisation
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
          {!emailSent ? (
            <>
              <Text style={styles.description}>
                Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
              </Text>

              <Input
                label="Adresse email"
                type="email"
                placeholder="Entrez votre email"
                value={email}
                onChangeText={handleEmailChange}
                error={emailError}
                required
                autoFocus
                returnKeyType="send"
                onSubmitEditing={handleSubmit}
              />

              <Button
                title="Envoyer le lien"
                onPress={handleSubmit}
                loading={isLoading}
                fullWidth
                style={styles.submitButton}
              />
            </>
          ) : (
            <View style={styles.successContainer}>
              <Ionicons name="checkmark-circle" size={64} color={colors.success} />
              <Text style={styles.successTitle}>Email envoyé !</Text>
              <Text style={styles.successDescription}>
                Vérifiez votre boîte email {email} pour les instructions de réinitialisation.
              </Text>
              <Text style={styles.successNote}>
                N'oubliez pas de vérifier votre dossier spam.
              </Text>
            </View>
          )}

          <TouchableOpacity 
            style={styles.backToLogin}
            onPress={() => navigation.navigate('Login')}
          >
            <Ionicons name="arrow-back" size={16} color={colors.primary} />
            <Text style={styles.backToLoginText}>Retour à la connexion</Text>
          </TouchableOpacity>
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
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 24,
    zIndex: 1,
    padding: 8,
  },
  headerContent: {
    alignItems: 'center',
    marginTop: 20,
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
  description: {
    fontSize: 16,
    color: colors.text.secondary,
    lineHeight: 24,
    marginBottom: 24,
    textAlign: 'center',
  },
  submitButton: {
    marginBottom: 32,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginTop: 16,
    marginBottom: 16,
  },
  successDescription: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 12,
  },
  successNote: {
    fontSize: 14,
    color: colors.text.light,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  backToLogin: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  backToLoginText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default ForgotPasswordScreen;