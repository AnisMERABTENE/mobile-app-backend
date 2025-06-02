import React, { createContext, useContext, useReducer, useEffect } from 'react';
import StorageService from '../utils/storage';
import AuthService from '../services/authService';
import NativeGoogleAuthService from '../services/nativeGoogleAuthService';

// État initial
const initialState = {
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,
};

// Actions
const AUTH_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGOUT: 'LOGOUT',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  UPDATE_USER: 'UPDATE_USER',
};

// Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
      };
      
    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
      
    case AUTH_ACTIONS.LOGOUT:
      return {
        ...initialState,
        isLoading: false,
      };
      
    case AUTH_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };
      
    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };
      
    case AUTH_ACTIONS.UPDATE_USER:
      return {
        ...state,
        user: { ...state.user, ...action.payload },
      };
      
    default:
      return state;
  }
};

// Créer le Context
const AuthContext = createContext({});

// Provider Component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Vérifier l'authentification au démarrage
  useEffect(() => {
    checkAuthStatus();
  }, []);

  /**
   * Vérifier le statut d'authentification au démarrage
   */
  const checkAuthStatus = async () => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });

      const token = await StorageService.getAuthToken();
      const userData = await StorageService.getUserData();

      if (token && userData) {
        // Vérifier que le token est encore valide
        const result = await AuthService.verifyToken();
        
        if (result.success) {
          dispatch({
            type: AUTH_ACTIONS.LOGIN_SUCCESS,
            payload: {
              user: result.data.user,
              token: token,
            },
          });
          console.log('✅ Utilisateur automatiquement connecté');
        } else {
          // Token invalide, nettoyer le stockage
          await StorageService.logout();
          dispatch({ type: AUTH_ACTIONS.LOGOUT });
          console.log('🔄 Token invalide, déconnexion automatique');
        }
      } else {
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
        console.log('ℹ️ Aucune session utilisateur trouvée');
      }
    } catch (error) {
      console.error('❌ Erreur vérification auth:', error);
      await StorageService.logout();
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
    }
  };

  /**
   * Connexion avec email/mot de passe
   */
  const login = async (email, password, rememberMe = false) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

      const result = await AuthService.login(email, password);

      if (result.success) {
        const { user, token } = result.data;

        // Sauvegarder les données
        await StorageService.saveAuthToken(token);
        await StorageService.saveUserData(user);

        // Sauvegarder l'email si "Se souvenir de moi"
        if (rememberMe) {
          await StorageService.saveRememberedEmail(email);
        } else {
          await StorageService.removeRememberedEmail();
        }

        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: { user, token },
        });

        console.log('✅ Connexion réussie pour:', user.email);
        return { success: true };
      } else {
        dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: result.error });
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage = 'Erreur de connexion';
      dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: errorMessage });
      console.error('❌ Erreur login:', error);
      return { success: false, error: errorMessage };
    }
  };

  /**
   * Connexion avec Google OAuth natif
   */
  const loginWithGoogle = async () => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

      console.log('🔵 Démarrage connexion Google native...');

      // Appeler le service Google Auth natif
      const result = await NativeGoogleAuthService.signInWithGoogle();

      if (result.success) {
        console.log('✅ Connexion Google native réussie');

        const { user, token } = result;

        // Sauvegarder les données
        await StorageService.saveAuthToken(token);
        await StorageService.saveUserData(user);

        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: { user, token },
        });

        console.log('✅ Connexion Google complète pour:', user.email);
        return { success: true };
      } else {
        if (result.cancelled) {
          dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
          return { success: false, cancelled: true };
        } else {
          dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: result.error });
          return { success: false, error: result.error };
        }
      }
    } catch (error) {
      const errorMessage = 'Erreur lors de la connexion Google';
      dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: errorMessage });
      console.error('❌ Erreur Google login native:', error);
      return { success: false, error: errorMessage };
    }
  };

  /**
   * Inscription
   */
  const register = async (userData) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

      const result = await AuthService.register(userData);

      if (result.success) {
        const { user, token } = result.data;

        // Sauvegarder les données
        await StorageService.saveAuthToken(token);
        await StorageService.saveUserData(user);

        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: { user, token },
        });

        console.log('✅ Inscription réussie pour:', user.email);
        return { success: true, emailVerificationRequired: result.data.emailVerificationRequired };
      } else {
        dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: result.error });
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage = 'Erreur lors de l\'inscription';
      dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: errorMessage });
      console.error('❌ Erreur register:', error);
      return { success: false, error: errorMessage };
    }
  };

  /**
   * Récupération de mot de passe
   */
  const forgotPassword = async (email) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

      const result = await AuthService.forgotPassword(email);

      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });

      if (result.success) {
        console.log('✅ Email de récupération envoyé');
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
      const errorMessage = 'Erreur lors de l\'envoi de l\'email';
      console.error('❌ Erreur forgot password:', error);
      return { success: false, error: errorMessage };
    }
  };

  /**
   * Déconnexion
   */
  const logout = async () => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });

      // Appeler l'API de déconnexion
      await AuthService.logout();

      // Nettoyer le stockage local
      await StorageService.logout();

      dispatch({ type: AUTH_ACTIONS.LOGOUT });
      console.log('✅ Déconnexion réussie');
    } catch (error) {
      // Même en cas d'erreur API, on déconnecte localement
      await StorageService.logout();
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
      console.error('❌ Erreur logout (déconnexion locale effectuée):', error);
    }
  };

  /**
   * Mettre à jour le profil utilisateur
   */
  const updateProfile = async (updateData) => {
    try {
      const result = await AuthService.updateProfile(updateData);

      if (result.success) {
        const updatedUser = result.data.user;
        
        // Mettre à jour le stockage
        await StorageService.saveUserData(updatedUser);
        
        // Mettre à jour le state
        dispatch({
          type: AUTH_ACTIONS.UPDATE_USER,
          payload: updatedUser,
        });

        console.log('✅ Profil mis à jour');
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('❌ Erreur update profile:', error);
      return { success: false, error: 'Erreur lors de la mise à jour' };
    }
  };

  /**
   * Effacer les erreurs
   */
  const clearError = () => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  };

  /**
   * Récupérer l'email sauvegardé
   */
  const getRememberedEmail = async () => {
    return await StorageService.getRememberedEmail();
  };

  // Valeurs du contexte
  const value = {
    // State
    user: state.user,
    token: state.token,
    isLoading: state.isLoading,
    isAuthenticated: state.isAuthenticated,
    error: state.error,
    
    // Actions
    login,
    loginWithGoogle, // NOUVEAU - Service Google natif
    register,
    logout,
    forgotPassword,
    updateProfile,
    clearError,
    getRememberedEmail,
    
    // Utilitaires
    checkAuthStatus,
    dispatch, // Pour les deep links dans App.js
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook pour utiliser le context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }
  return context;
};

export default AuthContext;