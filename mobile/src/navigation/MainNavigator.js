import React, { useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Screens
import NewHomeScreen from '../screens/main/NewHomeScreen';
import MyRequestsScreen from '../screens/main/MyRequestsScreen';
import HomeScreen from '../screens/main/HomeScreen'; // Profil
import CreateSellerScreen from '../screens/main/CreateSellerScreen'; // Nouveau

// Components
import TabNavigator from '../components/TabNavigator';

const Stack = createNativeStackNavigator();

const MainNavigator = () => {
  const [currentTab, setCurrentTab] = useState('newRequest');

  const renderCurrentScreen = () => {
    switch (currentTab) {
      case 'newRequest':
        return <NewHomeScreen />;
      case 'myRequests':
        return <MyRequestsScreen />;
      case 'profile':
        return <HomeScreen navigation={{ navigate: navigateToCreateSeller }} />;
      default:
        return <NewHomeScreen />;
    }
  };

  // Fonction pour naviguer vers CreateSeller depuis les onglets
  const navigateToCreateSeller = (screenName) => {
    if (screenName === 'CreateSellerProfile') {
      // On va utiliser une approche différente car on est dans les onglets
      setCurrentTab('createSeller');
    }
  };

  // Rendu spécial pour l'écran CreateSeller
  if (currentTab === 'createSeller') {
    return (
      <CreateSellerScreen 
        navigation={{ 
          goBack: () => setCurrentTab('profile'),
          navigate: navigateToCreateSeller 
        }} 
      />
    );
  }

  return (
    <TabNavigator currentTab={currentTab} onTabChange={setCurrentTab}>
      {renderCurrentScreen()}
    </TabNavigator>
  );
};

export default MainNavigator;