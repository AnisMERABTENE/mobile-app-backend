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
          [{ text: 'Super !' }]
        );
      } else {
        Alert.alert(
          '❌ Problème de connexion', 
          `Erreur: ${result.error}\n\nVérifiez votre connexion internet et que le serveur Railway est démarré.`,
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
      'Vous allez créer votre profil vendeur. Vous pourrez proposer vos services et répondre aux demandes des utilisateurs.',
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
              
              {/* Badge de rôle */}
              <View style={[styles.roleBadge, { backgroundColor: getUserRoleColor(user?.role) }]}>
                <Text style={styles.roleText}>{getUserRoleText(user?.role)}</Text>
              </View>
            </View>
          </View>
          
          {/* Actions header */}
          <View style={styles.headerActions}>
            <NotificationBell 
              notifications={notifications}
              unreadCount={unreadCount}
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
          
          {/* ✅ NOUVELLE SECTION : Test de connexion (dev) */}
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
    alignItems: 'center',
    justifyContent: 'space-between',
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
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    marginTop: -15,
  },
  section: {
    padding: 24,
  },
  
  // ✅ STYLES DÉVELOPPEUR
  devSection: {
    backgroundColor: colors.warning,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  devTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 12,
  },
  devButton: {
    backgroundColor: colors.white,
  },
  
  // Styles vendeur
  sellerCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sellerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
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