import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../context/AuthContext';
import Button from '../../components/Button';
import colors, { getGradientString } from '../../styles/colors';

const HomeScreen = () => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Erreur déconnexion:', error);
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
              </View>
            </View>
          </View>

          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Contenu principal */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.contentPadding}>
          
          {/* Carte de statut */}
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <Ionicons name="checkmark-circle" size={24} color={colors.success} />
              <Text style={styles.statusTitle}>Compte vérifié</Text>
            </View>
            <Text style={styles.statusDescription}>
              {user?.isEmailVerified 
                ? 'Votre email a été vérifié avec succès ✅'
                : 'Votre email n\'est pas encore vérifié ⚠️'
              }
            </Text>
          </View>

          {/* Informations du compte */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations du compte</Text>
            
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="mail-outline" size={20} color={colors.primary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{user?.email}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Membre depuis</Text>
                  <Text style={styles.infoValue}>
                    {user?.createdAt 
                      ? new Date(user.createdAt).toLocaleDateString('fr-FR')
                      : 'N/A'
                    }
                  </Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="time-outline" size={20} color={colors.primary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Dernière connexion</Text>
                  <Text style={styles.infoValue}>
                    {user?.lastLoginAt 
                      ? new Date(user.lastLoginAt).toLocaleDateString('fr-FR')
                      : 'Maintenant'
                    }
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Actions rapides */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Actions rapides</Text>
            
            <View style={styles.actionsGrid}>
              <TouchableOpacity style={styles.actionCard}>
                <Ionicons name="person-outline" size={32} color={colors.primary} />
                <Text style={styles.actionTitle}>Profil</Text>
                <Text style={styles.actionDescription}>
                  Gérer vos informations
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionCard}>
                <Ionicons name="settings-outline" size={32} color={colors.primary} />
                <Text style={styles.actionTitle}>Paramètres</Text>
                <Text style={styles.actionDescription}>
                  Configurer l'app
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionCard}>
                <Ionicons name="help-circle-outline" size={32} color={colors.primary} />
                <Text style={styles.actionTitle}>Aide</Text>
                <Text style={styles.actionDescription}>
                  Support et FAQ
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionCard}>
                <Ionicons name="star-outline" size={32} color={colors.primary} />
                <Text style={styles.actionTitle}>Évaluer</Text>
                <Text style={styles.actionDescription}>
                  Noter l'application
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Bouton de déconnexion */}
          <Button
            title="Se déconnecter"
            variant="outline"
            icon="log-out-outline"
            onPress={handleLogout}
            fullWidth
            style={styles.logoutButtonFull}
          />

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
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    color: colors.white,
    fontWeight: '600',
  },
  logoutButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    marginTop: -15,
  },
  contentPadding: {
    padding: 24,
  },
  statusCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginLeft: 8,
  },
  statusDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
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
  infoCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  infoContent: {
    marginLeft: 16,
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: colors.text.primary,
    fontWeight: '500',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    width: '48%',
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 12,
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 12,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  logoutButtonFull: {
    marginTop: 16,
  },
});

export default HomeScreen;