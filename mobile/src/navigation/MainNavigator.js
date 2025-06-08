import React, { useState } from 'react';

// Screens
import NewHomeScreen from '../screens/main/NewHomeScreen';
import MyRequestsScreen from '../screens/main/MyRequestsScreen';
import HomeScreen from '../screens/main/HomeScreen'; // Profil

// Components
import TabNavigator from '../components/TabNavigator';

const MainNavigator = () => {
  const [currentTab, setCurrentTab] = useState('newRequest');

  const renderCurrentScreen = () => {
    switch (currentTab) {
      case 'newRequest':
        return <NewHomeScreen />;
      case 'myRequests':
        return <MyRequestsScreen />;
      case 'profile':
        return <HomeScreen />;
      default:
        return <NewHomeScreen />;
    }
  };

  return (
    <TabNavigator currentTab={currentTab} onTabChange={setCurrentTab}>
      {renderCurrentScreen()}
    </TabNavigator>
  );
};

export default MainNavigator;