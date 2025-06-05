import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Screens
import NewHomeScreen from '../screens/main/NewHomeScreen';
import HomeScreen from '../screens/main/HomeScreen'; // Ancienne page (gardée pour plus tard)

const Stack = createNativeStackNavigator();

const MainNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
      initialRouteName="NewHome"
    >
      <Stack.Screen 
        name="NewHome" 
        component={NewHomeScreen}
        options={{
          title: 'Nouvelle demande',
        }}
      />
      <Stack.Screen 
        name="Profile" 
        component={HomeScreen}
        options={{
          title: 'Profil',
        }}
      />
    </Stack.Navigator>
  );
};

export default MainNavigator;