import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Clés de stockage
const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  USER_DATA: 'userData',
  REFRESH_TOKEN: 'refreshToken',
  REMEMBER_EMAIL: 'rememberEmail',
  APP_SETTINGS: 'appSettings',
  ONBOARDING_COMPLETE: 'onboardingComplete',
};

/**
 * Service de stockage sécurisé pour les données sensibles
 * Utilise expo-secure-store pour les données critiques (tokens)
 * et AsyncStorage pour les données moins sensibles (préférences)
 */
class StorageService {
  
  // ==================
  // STOCKAGE SÉCURISÉ (expo-secure-store)
  // ==================
  
  /**
   * Sauvegarder le token d'authentification
   */
  async saveAuthToken(token) {
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.AUTH_TOKEN, token);
      console.log('✅ Token d\'authentification sauvegardé');
      return true;
    } catch (error) {
      console.error('❌ Erreur sauvegarde token:', error);
      return false;
    }
  }
  
  /**
   * Récupérer le token d'authentification
   */
  async getAuthToken() {
    try {
      const token = await SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN);
      return token;
    } catch (error) {
      console.error('❌ Erreur récupération token:', error);
      return null;
    }
  }
  
  /**
   * Supprimer le token d'authentification
   */
  async removeAuthToken() {
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN);
      console.log('✅ Token d\'authentification supprimé');
      return true;
    } catch (error) {
      console.error('❌ Erreur suppression token:', error);
      return false;
    }
  }
  
  /**
   * Sauvegarder les données utilisateur
   */
  async saveUserData(userData) {
    try {
      const userDataString = JSON.stringify(userData);
      await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, userDataString);
      console.log('✅ Données utilisateur sauvegardées');
      return true;
    } catch (error) {
      console.error('❌ Erreur sauvegarde données utilisateur:', error);
      return false;
    }
  }
  
  /**
   * Récupérer les données utilisateur
   */
  async getUserData() {
    try {
      const userDataString = await SecureStore.getItemAsync(STORAGE_KEYS.USER_DATA);
      if (userDataString) {
        return JSON.parse(userDataString);
      }
      return null;
    } catch (error) {
      console.error('❌ Erreur récupération données utilisateur:', error);
      return null;
    }
  }
  
  /**
   * Supprimer les données utilisateur
   */
  async removeUserData() {
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_DATA);
      console.log('✅ Données utilisateur supprimées');
      return true;
    } catch (error) {
      console.error('❌ Erreur suppression données utilisateur:', error);
      return false;
    }
  }
  
  // ==================
  // STOCKAGE NON SÉCURISÉ (AsyncStorage)
  // ==================
  
  /**
   * Sauvegarder l'email pour la fonction "Se souvenir de moi"
   */
  async saveRememberedEmail(email) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.REMEMBER_EMAIL, email);
      return true;
    } catch (error) {
      console.error('❌ Erreur sauvegarde email:', error);
      return false;
    }
  }
  
  /**
   * Récupérer l'email sauvegardé
   */
  async getRememberedEmail() {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.REMEMBER_EMAIL);
    } catch (error) {
      console.error('❌ Erreur récupération email:', error);
      return null;
    }
  }
  
  /**
   * Supprimer l'email sauvegardé
   */
  async removeRememberedEmail() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.REMEMBER_EMAIL);
      return true;
    } catch (error) {
      console.error('❌ Erreur suppression email:', error);
      return false;
    }
  }
  
  /**
   * Sauvegarder les paramètres de l'application
   */
  async saveAppSettings(settings) {
    try {
      const settingsString = JSON.stringify(settings);
      await AsyncStorage.setItem(STORAGE_KEYS.APP_SETTINGS, settingsString);
      return true;
    } catch (error) {
      console.error('❌ Erreur sauvegarde paramètres:', error);
      return false;
    }
  }
  
  /**
   * Récupérer les paramètres de l'application
   */
  async getAppSettings() {
    try {
      const settingsString = await AsyncStorage.getItem(STORAGE_KEYS.APP_SETTINGS);
      if (settingsString) {
        return JSON.parse(settingsString);
      }
      return null;
    } catch (error) {
      console.error('❌ Erreur récupération paramètres:', error);
      return null;
    }
  }
  
  /**
   * Marquer l'onboarding comme terminé
   */
  async setOnboardingComplete() {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, 'true');
      return true;
    } catch (error) {
      console.error('❌ Erreur marquage onboarding:', error);
      return false;
    }
  }
  
  /**
   * Vérifier si l'onboarding est terminé
   */
  async isOnboardingComplete() {
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETE);
      return value === 'true';
    } catch (error) {
      console.error('❌ Erreur vérification onboarding:', error);
      return false;
    }
  }
  
  // ==================
  // UTILITAIRES
  // ==================
  
  /**
   * Vérifier si l'utilisateur est connecté
   */
  async isUserLoggedIn() {
    try {
      const token = await this.getAuthToken();
      const userData = await this.getUserData();
      return !!(token && userData);
    } catch (error) {
      console.error('❌ Erreur vérification connexion:', error);
      return false;
    }
  }
  
  /**
   * Déconnexion complète - supprimer toutes les données sensibles
   */
  async logout() {
    try {
      await Promise.all([
        this.removeAuthToken(),
        this.removeUserData(),
        SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN).catch(() => {}),
      ]);
      console.log('✅ Déconnexion complète réussie');
      return true;
    } catch (error) {
      console.error('❌ Erreur lors de la déconnexion:', error);
      return false;
    }
  }
  
  /**
   * Nettoyer tout le stockage (pour reset complet)
   */
  async clearAll() {
    try {
      // Supprimer les données sécurisées
      await Promise.all([
        this.removeAuthToken(),
        this.removeUserData(),
        SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN).catch(() => {}),
      ]);
      
      // Supprimer les données non sécurisées
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.REMEMBER_EMAIL,
        STORAGE_KEYS.APP_SETTINGS,
        STORAGE_KEYS.ONBOARDING_COMPLETE,
      ]);
      
      console.log('✅ Stockage complètement nettoyé');
      return true;
    } catch (error) {
      console.error('❌ Erreur nettoyage stockage:', error);
      return false;
    }
  }
}

// Exporter une instance unique du service
export default new StorageService();