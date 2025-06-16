import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import NotificationBell from '../../components/NotificationBell';
import NotificationsModal from '../../components/NotificationsModal';
import Button from '../../components/Button';
import SellerService from '../../services/sellerService';
import PhotoUploadService from '../../services/photoUploadService';
import colors, { getGradientString } from '../../styles/colors';

const HomeScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { notifications, unreadCount } = useNotifications();
  const [sellerProfile, setSellerProfile] = useState(null);
  const [loadingSellerCheck, setLoadingSellerCheck] = useState(true);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);

  // Vérifier si l'utilisateur est déjà vendeur au chargement
  useEffect(() => {
    checkSellerStatus();
  }, []);

  const checkSellerStatus = async () => {
    try {
      setLoadingSellerCheck(true);
      console.log('🔍 Vérification statut vendeur...');
      
      const result = await SellerService.getMyProfile();
      if (result.success) {
        setSellerProfile(result.data);
        console.log('✅ Profil vendeur trouvé:', result.data.businessName);
      } else {
        setSellerProfile(null);
        console.log('ℹ️ Pas de profil vendeur (normal pour nouveaux utilisateurs)');
      }
    } catch (error) {
      console.log('ℹ️ Aucun profil vendeur existant (c\'est normal)');
      setSellerProfile(null);
    } finally {
      setLoadingSellerCheck(false);
    }
  };

  const testUploadConnection = async () => {
    try {
      console.log('🧪 Test connexion mobile → Railway...');
      
      const result = await PhotoUploadService.testUploadEndpoint();
      
      if (result.success) {
        Alert.alert(
          '✅ Connexion OK !', 
          'La connexion entre votre mobile et Railway fonctionne parfaitement !',
          [{ text: 'Super !' }]
        );
      } else {
        Alert.alert(
          '❌ Problème de connexion', 
          `Erreur: ${result.error}`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de tester la connexion');
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Déconnexion', 
          style: 'destructive',
          onPress: () => {
            console.log('🚪 Déconnexion demandée par l\'utilisateur');
            logout();
          }
        }
      ]
    );
  };

  const handleBecomeSellerPress = () => {
    Alert.alert(
      'Devenir vendeur',
      'Vous allez créer votre profil vendeur.',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Continuer', 
          onPress: () => {
            console.log('🔄 Redirection vers création profil vendeur...');
            navigation.navigate('CreateSellerProfile');
          }
        }
      ]
    );
  };

  const handleManageSellerProfile = () => {
    console.log('🔄 Redirection vers gestion profil vendeur...');
    navigation.navigate('ManageSellerProfile');
  };

  // ✅ NAVIGATION PROFONDE : Gérer le clic sur les notifications
  // Dans HomeScreen.js, modifie la fonction handleNotificationPress comme ceci :
  const handleNotificationPress = (notification) => {
    console.log('📱 Notification cliquée:', notification);
    console.log('🔍 Structure notification:', JSON.stringify(notification, null, 2));
    
    // Rediriger selon le type de notification
    if (notification.type === 'new_request') {
      // Essayer plusieurs chemins pour l'ID de la demande
      const requestId = notification.data?.request?.id || 
                       notification.data?.request?._id ||
                       notification.data?.id || 
                       notification.requestId;
      
      if (requestId) {
        console.log('🔄 Redirection vers demande ID:', requestId);
        
        // ✅ CORRECT : Utilise le bon nom d'écran du MainNavigator
        navigation.navigate('RequestDetail', { 
          requestId: requestId,
          requestData: notification.data?.request 
        });
      } else {
        console.log('⚠️ Pas d\'ID de demande trouvé, redirection vers liste');
        Alert.alert(
          'Demande introuvable',
          'Impossible de trouver cette demande. Redirection vers la liste des demandes.',
          [
            { 
              text: 'OK', 
              onPress: () => {
                // Naviguer vers l'onglet MyRequests
                navigation.navigate('MainTabs');
              }
            }
          ]
        );
      }
    } else {
      console.log('⚠️ Type de notification non géré:', notification.type);
      Alert.alert('Notification', 'Type de notification non pris en charge');
    }
  };

  const getUserRoleColor = (role) => {
    switch (role) {
      case 'seller':
        return colors.roles.seller;
      case 'admin':
        return colors.roles.admin;
      default:
        return colors.roles.user;
    }
  };

  const getUserRoleText = (role) => {
    switch (role) {
      case 'seller':
        return 'Vendeur';
      case 'admin':
        return 'Administrateur';
      default:
        return 'Utilisateur';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header avec gradient */}
      <LinearGradient
        colors={getGradientString('primary')}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.userInfo}>
            <View style={styles.avatarContainer}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Ionicons name="person" size={32} color={colors.gray[400]} />
                </View>
              )}
            </View>
            
            <View style={styles.userDetails}>
              <Text style={styles.userName}>
                {user?.firstName} {user?.lastName}
              </Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
              
              <View style={[styles.roleBadge, { backgroundColor: getUserRoleColor(user?.role) }]}>
                <Text style={styles.roleText}>{getUserRoleText(user?.role)}</Text>
              </View>
            </View>
          </View>
          
          {/* Actions header */}
          <View style={styles.headerActions}>
            {/* ✅ CORRIGÉ : NotificationBell avec onPress */}
            <NotificationBell 
              notifications={notifications}
              unreadCount={unreadCount}
              onPress={() => setShowNotificationsModal(true)}
            />
            
            <TouchableOpacity 
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={24} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {/* Contenu principal */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          
          {/* Tests développeur */}
          {__DEV__ && (
            <View style={styles.devSection}>
              <Text style={styles.devTitle}>🧪 Tests développeur</Text>
              <Button
                title="Tester connexion upload"
                variant="outline"
                onPress={testUploadConnection}
                leftIcon="cloud-upload-outline"
                style={styles.devButton}
              />
            </View>
          )}
          
          {/* Section vendeur */}
          {!loadingSellerCheck && (
            <>
              {sellerProfile ? (
                // Utilisateur a déjà un profil vendeur
                <View style={styles.sellerCard}>
                  <View style={styles.sellerHeader}>
                    <Ionicons name="business" size={32} color={colors.primary} />
                    <Text style={styles.sellerCardTitle}>Mon entreprise</Text>
                  </View>
                  
                  <Text style={styles.sellerCardDescription}>
                    {sellerProfile.description}
                  </Text>
                  
                  <View style={styles.sellerStats}>
                    <View style={styles.sellerStat}>
                      <Text style={styles.sellerStatNumber}>4.8</Text>
                      <Text style={styles.sellerStatLabel}>Note moyenne</Text>
                    </View>
                    <View style={styles.sellerStat}>
                      <Text style={styles.sellerStatNumber}>23</Text>
                      <Text style={styles.sellerStatLabel}>Demandes traitées</Text>
                    </View>
                    <View style={styles.sellerStat}>
                      <Text style={styles.sellerStatNumber}>
                        {sellerProfile.specialties?.length || 0}
                      </Text>
                      <Text style={styles.sellerStatLabel}>Spécialités</Text>
                    </View>
                  </View>
                  
                  <Button
                    title="Gérer mon profil vendeur"
                    variant="primary"
                    icon="settings"
                    onPress={handleManageSellerProfile}
                    style={styles.sellerButton}
                  />
                </View>
              ) : (
                // Utilisateur n'a pas encore de profil vendeur
                <View style={styles.becomeSellerCard}>
                  <View style={styles.becomeSellerHeader}>
                    <Ionicons name="business-outline" size={48} color={colors.primary} />
                    <Text style={styles.becomeSellerTitle}>Devenir vendeur</Text>
                  </View>
                  
                  <Text style={styles.becomeSellerDescription}>
                    Rejoignez notre communauté de vendeurs et commencez à répondre aux demandes des utilisateurs près de chez vous.
                  </Text>
                  
                  <View style={styles.benefitsList}>
                    <View style={styles.benefitItem}>
                      <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                      <Text style={styles.benefitText}>Recevez des demandes ciblées</Text>
                    </View>
                    <View style={styles.benefitItem}>
                      <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                      <Text style={styles.benefitText}>Gérez votre activité facilement</Text>
                    </View>
                    <View style={styles.benefitItem}>
                      <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                      <Text style={styles.benefitText}>Développez votre clientèle</Text>
                    </View>
                  </View>
                  
                  <Button
                    title="Créer mon profil vendeur"
                    variant="primary"
                    icon="add-circle"
                    onPress={handleBecomeSellerPress}
                    style={styles.becomeSellerButton}
                  />
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* ✅ CORRIGÉ : Modal des notifications avec les bons noms de variables */}
      <NotificationsModal
        visible={showNotificationsModal}
        onClose={() => setShowNotificationsModal(false)}
        onNotificationPress={handleNotificationPress}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  header: {
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    marginRight: 15,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: colors.white,
  },
  avatarPlaceholder: {
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: colors.white,
    opacity: 0.9,
    marginBottom: 8,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    color: colors.white,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  logoutButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    gap: 20,
  },
  devSection: {
    backgroundColor: colors.warning + '20',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.warning + '40',
  },
  devTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.warning,
    marginBottom: 10,
  },
  devButton: {
    backgroundColor: colors.warning + '10',
    borderColor: colors.warning,
  },
  sellerCard: {
    backgroundColor: colors.white,
    borderRadius: 15,
    padding: 20,
    elevation: 3,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  sellerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sellerCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.gray[800],
    marginLeft: 12,
  },
  sellerCardDescription: {
    fontSize: 14,
    color: colors.gray[600],
    lineHeight: 20,
    marginBottom: 20,
  },
  sellerStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingVertical: 15,
    backgroundColor: colors.gray[50],
    borderRadius: 10,
  },
  sellerStat: {
    alignItems: 'center',
  },
  sellerStatNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  sellerStatLabel: {
    fontSize: 12,
    color: colors.gray[600],
    textAlign: 'center',
  },
  sellerButton: {
    marginTop: 10,
  },
  becomeSellerCard: {
    backgroundColor: colors.white,
    borderRadius: 15,
    padding: 25,
    elevation: 3,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    alignItems: 'center',
  },
  becomeSellerHeader: {
    alignItems: 'center',
    marginBottom: 15,
  },
  becomeSellerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.gray[800],
    marginTop: 10,
  },
  becomeSellerDescription: {
    fontSize: 15,
    color: colors.gray[600],
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  benefitsList: {
    alignSelf: 'stretch',
    marginBottom: 25,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  benefitText: {
    fontSize: 14,
    color: colors.gray[700],
    marginLeft: 10,
    flex: 1,
  },
  becomeSellerButton: {
    alignSelf: 'stretch',
  },
});

export default HomeScreen;