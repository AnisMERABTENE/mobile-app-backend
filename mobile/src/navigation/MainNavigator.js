import React, { useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Screens
import NewHomeScreen from '../screens/main/NewHomeScreen';
import MyRequestsScreen from '../screens/main/MyRequestsScreen';
import HomeScreen from '../screens/main/HomeScreen'; // Profil
import CreateSellerScreen from '../screens/main/CreateSellerScreen';
import RequestDetailScreen from '../screens/main/RequestDetailScreen';
import ManageSellerProfileScreen from '../screens/main/ManageSellerProfileScreen'; // ✅ NOUVEAU

// Components
import TabNavigator from '../components/TabNavigator';

const Stack = createNativeStackNavigator();

const MainNavigator = () => {
  const [currentTab, setCurrentTab] = useState('newRequest');

  // ✅ CORRECTION : Fonction simple pour passer la navigation
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
              navigate: (screenName, params) => {
                if (screenName === 'CreateSellerProfile') {
                  navigation.navigate('CreateSellerProfile');
                } else if (screenName === 'ManageSellerProfile') {
                  navigation.navigate('ManageSellerProfile');
                } else if (screenName === 'RequestDetailScreen') {
                  navigation.navigate('RequestDetailScreen', params);
                } else if (screenName === 'MainTabs') {
                  // Pour revenir aux onglets principaux
                  setCurrentTab('myRequests');
                } else {
                  // Fallback pour toute autre navigation
                  navigation.navigate(screenName, params);
                }
              }
            }} />;
      default:
        return <NewHomeScreen navigation={navigation} />;
    }
  };

  // ✅ CORRECTION : Structure simplifiée qui fonctionne
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

      {/* ✅ NOUVEAU : Écran de gestion du profil vendeur */}
      <Stack.Screen 
        name="ManageSellerProfile" 
        component={ManageSellerProfileScreen}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
    </Stack.Navigator>
  );
};

export default MainNavigator;