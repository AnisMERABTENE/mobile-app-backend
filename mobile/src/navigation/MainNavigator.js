import React, { useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Screens principales
import NewHomeScreen from '../screens/main/NewHomeScreen';
import MyRequestsScreen from '../screens/main/MyRequestsScreen';
import HomeScreen from '../screens/main/HomeScreen'; // Profil
import CreateSellerScreen from '../screens/main/CreateSellerScreen';
import RequestDetailScreen from '../screens/main/RequestDetailScreen';

// ✅ NOUVEAUX : Écrans vendeur
import EditSellerProfileScreen from '../screens/seller/EditSellerProfileScreen';
import AddSpecialtyScreen from '../screens/seller/AddSpecialtyScreen';

// Components
import TabNavigator from '../components/TabNavigator';

const Stack = createNativeStackNavigator();

const MainNavigator = () => {
  const [currentTab, setCurrentTab] = useState('newRequest');

  // Fonction simple pour passer la navigation
  const createScreenWithNavigation = (ScreenComponent) => {
    return ({ navigation }) => (
      <ScreenComponent navigation={navigation} />
    );
  };

  const renderCurrentScreen = ({ navigation }) => {
    switch (currentTab) {
      case 'newRequest':
        return <NewHomeScreen navigation={navigation} />;
      case 'myRequests':
        return <MyRequestsScreen navigation={navigation} />;
      case 'profile':
        return <HomeScreen navigation={{ 
          navigate: (screenName) => {
            if (screenName === 'CreateSellerProfile') {
              navigation.navigate('CreateSellerProfile');
            } else if (screenName === 'EditSellerProfile') {
              // ✅ NOUVEAU : Navigation vers édition profil vendeur
              navigation.navigate('EditSellerProfile');
            }
          }
        }} />;
      default:
        return <NewHomeScreen navigation={navigation} />;
    }
  };

  // Structure simplifiée qui fonctionne
  const TabScreen = ({ navigation }) => (
    <TabNavigator currentTab={currentTab} onTabChange={setCurrentTab}>
      {renderCurrentScreen({ navigation })}
    </TabNavigator>
  );

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Écran principal avec onglets */}
      <Stack.Screen 
        name="MainTabs" 
        component={TabScreen}
      />
      
      {/* Écran de détail des demandes */}
      <Stack.Screen 
        name="RequestDetail" 
        component={RequestDetailScreen}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
      
      {/* Écran de création de vendeur */}
      <Stack.Screen 
        name="CreateSellerProfile" 
        component={CreateSellerScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />

      {/* ✅ NOUVEAUX ÉCRANS VENDEUR */}
      
      {/* Écran d'édition du profil vendeur */}
      <Stack.Screen 
        name="EditSellerProfile" 
        component={EditSellerProfileScreen}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
      
      {/* Écran d'ajout de spécialité */}
      <Stack.Screen 
        name="AddSpecialty" 
        component={AddSpecialtyScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      
      {/* Écran d'édition de spécialité (même composant, paramètres différents) */}
      <Stack.Screen 
        name="EditSpecialty" 
        component={AddSpecialtyScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
    </Stack.Navigator>
  );
};

export default MainNavigator;