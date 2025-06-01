import React from 'react';
import {
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import colors, { getGradientString } from '../styles/colors';

const Loading = ({ 
  text = 'Chargement...', 
  size = 'large',
  color = colors.primary,
  fullScreen = false,
  gradient = false,
  style
}) => {
  
  const renderContent = () => (
    <View style={[styles.container, !fullScreen && styles.inline, style]}>
      <ActivityIndicator 
        size={size} 
        color={gradient ? colors.white : color} 
      />
      {text && (
        <Text style={[
          styles.text, 
          { color: gradient ? colors.white : colors.text.secondary }
        ]}>
          {text}
        </Text>
      )}
    </View>
  );

  if (fullScreen && gradient) {
    return (
      <LinearGradient
        colors={getGradientString('primary')}
        style={styles.fullScreen}
      >
        {renderContent()}
      </LinearGradient>
    );
  }

  if (fullScreen) {
    return (
      <View style={[styles.fullScreen, { backgroundColor: colors.background }]}>
        {renderContent()}
      </View>
    );
  }

  return renderContent();
};

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default Loading;