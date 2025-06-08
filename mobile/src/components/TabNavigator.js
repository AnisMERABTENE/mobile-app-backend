import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../styles/colors';

const TabNavigator = ({ children, currentTab, onTabChange }) => {
  
  const tabs = [
    {
      id: 'newRequest',
      label: 'Nouvelle demande',
      icon: 'add-circle-outline',
      activeIcon: 'add-circle',
    },
    {
      id: 'myRequests',
      label: 'Mes demandes',
      icon: 'list-outline',
      activeIcon: 'list',
    },
    {
      id: 'profile',
      label: 'Profil',
      icon: 'person-outline',
      activeIcon: 'person',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Contenu principal */}
      <View style={styles.content}>
        {children}
      </View>
      
      {/* Barre de navigation */}
      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, isActive && styles.activeTab]}
              onPress={() => onTabChange(tab.id)}
              activeOpacity={0.7}
            >
              <View style={styles.tabContent}>
                <Ionicons
                  name={isActive ? tab.activeIcon : tab.icon}
                  size={24}
                  color={isActive ? colors.primary : colors.gray[500]}
                />
                <Text style={[
                  styles.tabLabel,
                  isActive && styles.activeTabLabel
                ]}>
                  {tab.label}
                </Text>
              </View>
              
              {/* Indicateur actif */}
              {isActive && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
    paddingTop: 8,
    paddingBottom: 8,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 16,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    position: 'relative',
  },
  activeTab: {
    // Styles spécifiques pour l'onglet actif
  },
  tabContent: {
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.gray[500],
    marginTop: 4,
    textAlign: 'center',
  },
  activeTabLabel: {
    color: colors.primary,
    fontWeight: '600',
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    left: '25%',
    right: '25%',
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
});

export default TabNavigator;