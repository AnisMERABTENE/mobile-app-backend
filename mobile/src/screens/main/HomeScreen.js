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
import Button from '../../components/Button';
import SellerService from '../../services/sellerService';
// ✅ AJOUT : Import du service de photos
import PhotoUploadService from '../../services/photoUploadService';
import colors, { getGradientString } from '../../styles/colors';

const HomeScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { notifications, unreadCount } = useNotifications();
  const [sellerProfile, setSellerProfile] = useState(null);
  const [loadingSellerCheck, setLoadingSellerCheck] = useState(true);

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

  // ✅ NOUVELLE FONCTION : Test de connexion upload
  const testUploadConnection = async () => {
    try {
      console.log('🧪 Test connexion mobile → Railway...');
      
      const result = await PhotoUploadService.testUploadEndpoint();
      
      if (result.success) {
        Alert.alert(
          '✅ Connexion OK !', 
          'La connexion entre votre mobile et Railway fonctionne parfaitement !\n\nVous pouvez maintenant tester l\'upload de photos.',
          [{ text: 'Super !', style: 'default' }]
        );
        console.log('✅ Test connexion réussi:', result.data);
      } else {
        Alert.alert(
          '❌ Problème de connexion', 
          `Erreur: ${result.error}\n\nVérifiez votre connexion internet.`,
          [{ text: 'OK', style: 'default' }]
        );
        console.error('❌ Test connexion échoué:', result.error);
      }
    } catch (error) {
      Alert.alert(
        '❌ Erreur technique', 
        `Une erreur s'est produite: ${error.message}`,
        [{ text: 'OK', style: 'default' }]
      );
      console.error('❌ Erreur test connexion:', error);
    }
  };

  const handleNotificationPress = () => {
    console.log('🔔 Clic sur les notifications');
    console.log('📋 Notifications:', notifications.length);
    console.log('🔴 Non lues:', unreadCount);

    if (notifications.length === 0) {
      Alert.alert('Notifications', 'Aucune notification pour le moment');
    } else {
      const latestNotification = notifications[0];
      Alert.alert(
        'Dernière notification',
        latestNotification.message,
        [{ text: 'OK', style: 'default' }]
      );
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Erreur déconnexion:', error);
    }
  };

  const handleBecomeSellerPress = () => {
    Alert.alert(
      '🛍️ Devenir vendeur',
      'Créez votre profil vendeur pour recevoir des demandes dans votre zone et votre domaine d\'expertise.',
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
    Alert.alert('Info', 'Gestion du profil vendeur en cours de développement...');
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
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={32} color={colors.white} />
                </View>
              )}
            </View>
            
            <View style={styles.userDetails}>
              <Text style={styles.welcomeText}>Bonjour,</Text>
              <Text style={styles.userName}>
                {user?.firstName} {user?.lastName}
              </Text>
              <View style={styles.roleContainer}>
                <View
                  style={[
                    styles.roleBadge,
                    { backgroundColor: getUserRoleColor(user?.role) },
                  ]}
                >
                  <Text style={styles.roleText}>
                    {getUserRoleText(user?.role)}
                  </Text>
                </View>
                
                {sellerProfile && (
                  <View style={[styles.roleBadge, styles.sellerBadge]}>
                    <Ionicons name="business" size={12} color={colors.white} />
                    <Text style={styles.roleText}>Vendeur</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          <View style={styles.headerActions}>
            {sellerProfile && (
              <NotificationBell
                onPress={handleNotificationPress}
                size={24}
                color={colors.white}
                showConnectionStatus={__DEV__}
                style={styles.notificationBell}
              />
            )}
            
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <Ionicons name="log-out-outline" size={24} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.contentPadding}>
          
          {/* ✅ SECTION DE TEST AJOUTÉE ICI - AU DÉBUT DU CONTENU */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🧪 Test du système</Text>
            
            <View style={styles.testCard}>
              <View style={styles.testHeader}>
                <Ionicons name="flask" size={24} color={colors.primary} />
                <Text style={styles.testTitle}>Test de l'upload de photos</Text>
              </View>
              
              <Text style={styles.testDescription}>
                Vérifiez que la connexion entre votre mobile et le serveur Railway fonctionne correctement.
              </Text>
              
              <TouchableOpacity 
                style={styles.testButton}
                onPress={testUploadConnection}
              >
                <Ionicons name="cloud-upload-outline" size={20} color={colors.white} />
                <Text style={styles.testButtonText}>
                  Tester la connexion Railway
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Section Vendeur */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Espace vendeur</Text>
            
            {!loadingSellerCheck && (
              <>
                {sellerProfile ? (
                  <View style={styles.sellerCard}>
                    <View style={styles.sellerCardHeader}>
                      <Ionicons name="business" size={24} color={colors.success} />
                      <Text style={styles.sellerCardTitle}>Profil vendeur actif</Text>
                    </View>
                    <Text style={styles.sellerCardDescription}>
                      Vous recevez actuellement des demandes dans votre zone.
                    </Text>
                    
                    {unreadCount > 0 && (
                      <View style={styles.notificationAlert}>
                        <Ionicons name="notifications" size={20} color={colors.warning} />
                        <Text style={styles.notificationAlertText}>
                          {unreadCount} nouvelle{unreadCount > 1 ? 's' : ''} demande{unreadCount > 1 ? 's' : ''} !
                        </Text>
                      </View>
                    )}
                    
                    <View style={styles.sellerStats}>
                      <View style={styles.sellerStat}>
                        <Text style={styles.sellerStatNumber}>{notifications.length}</Text>
                        <Text style={styles.sellerStatLabel}>Demandes reçues</Text>
                      </View>
                      <View style={styles.sellerStat}>
                        <Text style={styles.sellerStatNumber}>0</Text>
                        <Text style={styles.sellerStatLabel}>Réponses envoyées</Text>
                      </View>
                    </View>
                    
                    <Button
                      title="Gérer mon profil vendeur"
                      variant="outline"
                      icon="settings-outline"
                      onPress={handleManageSellerProfile}
                      style={styles.sellerButton}
                    />
                  </View>
                ) : (
                  <View style={styles.becomeSellerCard}>
                    <View style={styles.becomeSellerHeader}>
                      <Ionicons name="business-outline" size={48} color={colors.primary} />
                      <Text style={styles.becomeSellerTitle}>Devenez vendeur</Text>
                    </View>
                    
                    <Text style={styles.becomeSellerDescription}>
                      Créez votre profil vendeur pour recevoir des demandes dans votre zone et augmenter vos ventes.
                    </Text>
                    
                    <View style={styles.becomeSellerFeatures}>
                      <View style={styles.feature}>
                        <Ionicons name="notifications" size={20} color={colors.success} />
                        <Text style={styles.featureText}>Recevez des demandes ciblées</Text>
                      </View>
                      <View style={styles.feature}>
                        <Ionicons name="location" size={20} color={colors.success} />
                        <Text style={styles.featureText}>Dans votre zone géographique</Text>
                      </View>
                      <View style={styles.feature}>
                        <Ionicons name="pricetag" size={20} color={colors.success} />
                        <Text style={styles.featureText}>Définissez vos spécialités</Text>
                      </View>
                    </View>
                    
                    <Button
                      title="Je veux devenir vendeur"
                      variant="primary"
                      icon="arrow-forward"
                      onPress={handleBecomeSellerPress}
                      style={styles.becomeSellerButton}
                    />
                  </View>
                )}
              </>
            )}
          </View>
          
        </View>
      </ScrollView>
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
    paddingBottom: 30,
    paddingHorizontal: 24,
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
    marginRight: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: colors.white,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userDetails: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 16,
    color: colors.white,
    opacity: 0.8,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 4,
  },
  roleContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  sellerBadge: {
    backgroundColor: colors.success,
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleText: {
    fontSize: 12,
    color: colors.white,
    fontWeight: '600',
    marginLeft: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationBell: {
    marginRight: 16,
  },
  logoutButton: {
    padding: 8,
  },
  notificationAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning + '20',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  notificationAlertText: {
    marginLeft: 8,
    fontSize: 14,
    color: colors.warning,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    marginTop: -15,
  },
  contentPadding: {
    padding: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 16,
  },
  // ✅ NOUVEAUX STYLES POUR LA SECTION DE TEST
  testCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#ff6b6b30',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  testHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  testTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginLeft: 8,
  },
  testDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  testButton: {
    backgroundColor: '#ff6b6b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 12,
  },
  testButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Styles existants...
  sellerCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: colors.success + '30',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sellerCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sellerCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginLeft: 8,
  },
  sellerCardDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  sellerStats: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  sellerStat: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.gray[50],
    borderRadius: 8,
    marginHorizontal: 4,
  },
  sellerStatNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  sellerStatLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 4,
    textAlign: 'center',
  },
  sellerButton: {
    marginTop: 8,
  },
  becomeSellerCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  becomeSellerHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  becomeSellerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginTop: 12,
  },
  becomeSellerDescription: {
    fontSize: 16,
    color: colors.text.secondary,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 20,
  },
  becomeSellerFeatures: {
    marginBottom: 24,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 14,
    color: colors.text.primary,
    marginLeft: 12,
    flex: 1,
  },
  becomeSellerButton: {
    marginTop: 8,
  },
});

export default HomeScreen;