import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '../context/NotificationContext';
import colors from '../styles/colors';

const NotificationBell = ({ 
  onPress, 
  size = 24, 
  color = colors.white,
  showConnectionStatus = false,
  style 
}) => {
  const { 
    unreadCount, 
    isConnected, 
    isConnecting, 
    connectionError 
  } = useNotifications();

  // Animation pour faire "sonner" la cloche quand il y a des notifications
  const [bellAnimation] = React.useState(new Animated.Value(0));

  // Déclencher l'animation quand le nombre de notifications change
  React.useEffect(() => {
    if (unreadCount > 0) {
      // Animation de "sonnerie"
      Animated.sequence([
        Animated.timing(bellAnimation, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(bellAnimation, {
          toValue: -1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(bellAnimation, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(bellAnimation, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [unreadCount]);

  // Rotation de la cloche
  const bellRotation = bellAnimation.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-10deg', '10deg'],
  });

  // Couleur de la cloche selon le statut de connexion
  const getBellColor = () => {
    if (connectionError) return colors.danger;
    if (isConnecting) return colors.warning;
    if (!isConnected) return colors.gray[400];
    return color;
  };

  // Icône selon le statut
  const getBellIcon = () => {
    if (connectionError) return 'notifications-off-outline';
    if (isConnecting) return 'hourglass-outline';
    if (unreadCount > 0) return 'notifications';
    return 'notifications-outline';
  };

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.bellContainer}>
        {/* Cloche animée */}
        <Animated.View
          style={[
            styles.bell,
            {
              transform: [{ rotate: bellRotation }],
            },
          ]}
        >
          <Ionicons
            name={getBellIcon()}
            size={size}
            color={getBellColor()}
          />
        </Animated.View>

        {/* Badge de compteur */}
        {unreadCount > 0 && (
          <View style={[
            styles.badge,
            size < 20 && styles.badgeSmall
          ]}>
            <Text style={[
              styles.badgeText,
              size < 20 && styles.badgeTextSmall
            ]}>
              {unreadCount > 99 ? '99+' : unreadCount.toString()}
            </Text>
          </View>
        )}

        {/* Indicateur de statut de connexion (optionnel) */}
        {showConnectionStatus && (
          <View style={[
            styles.connectionDot,
            {
              backgroundColor: isConnected 
                ? colors.success 
                : connectionError 
                  ? colors.danger 
                  : colors.warning
            }
          ]} />
        )}
      </View>

      {/* Debug info (seulement en développement) */}
      {__DEV__ && showConnectionStatus && (
        <View style={styles.debugInfo}>
          <Text style={styles.debugText}>
            {isConnecting ? 'Connexion...' :
             isConnected ? 'Connecté' :
             connectionError ? 'Erreur' : 'Déconnecté'}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  bellContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bell: {
    // Style pour l'animation
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.danger,
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  badgeSmall: {
    top: -6,
    right: -6,
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    borderWidth: 1,
  },
  badgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  badgeTextSmall: {
    fontSize: 9,
  },
  connectionDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.white,
  },
  debugInfo: {
    position: 'absolute',
    top: 30,
    left: -20,
    backgroundColor: colors.black,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  debugText: {
    color: colors.white,
    fontSize: 8,
    fontWeight: '500',
  },
});

export default NotificationBell;