import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '../context/NotificationContext';
import colors from '../styles/colors';

const { height: screenHeight } = Dimensions.get('window');

const NotificationsModal = ({ visible, onClose, onNotificationPress }) => {
  const { notifications, markAsRead, clearAllNotifications } = useNotifications();

  const handleNotificationPress = (notification) => {
    // Marquer comme lue
    markAsRead(notification.id);
    
    // Rediriger vers la demande
    if (onNotificationPress) {
      onNotificationPress(notification);
    }
    
    // Fermer le modal
    onClose();
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `${diffMins}min`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}j`;
    return date.toLocaleDateString('fr-FR');
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'new_request':
        return 'mail';
      case 'request_update':
        return 'refresh';
      case 'message':
        return 'chatbubble';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'new_request':
        return colors.primary;
      case 'urgent':
        return colors.error;
      case 'success':
        return colors.success;
      default:
        return colors.gray[600];
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <View style={styles.modalContainer}>
          <View>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Notifications</Text>
              <View style={styles.headerActions}>
                {notifications.length > 0 && (
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={clearAllNotifications}
                  >
                    <Text style={styles.clearText}>Tout effacer</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={onClose}
                >
                  <Ionicons name="close" size={24} color={colors.gray[600]} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Liste des notifications */}
            <ScrollView 
              style={styles.notificationsList}
              showsVerticalScrollIndicator={false}
            >
              {notifications.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons 
                    name="notifications-outline" 
                    size={48} 
                    color={colors.gray[400]} 
                  />
                  <Text style={styles.emptyTitle}>Aucune notification</Text>
                  <Text style={styles.emptyText}>
                    Vous serez notifié ici quand vous recevrez de nouvelles demandes
                  </Text>
                </View>
              ) : (
                notifications.map((notification) => (
                  <TouchableOpacity
                    key={notification.id}
                    style={[
                      styles.notificationItem,
                      !notification.read && styles.unreadNotification
                    ]}
                    onPress={() => handleNotificationPress(notification)}
                  >
                    <View style={styles.notificationIcon}>
                      <Ionicons
                        name={getNotificationIcon(notification.type)}
                        size={24}
                        color={getNotificationColor(notification.type)}
                      />
                    </View>

                    <View style={styles.notificationContent}>
                      <Text style={[
                        styles.notificationTitle,
                        !notification.read && styles.unreadTitle
                      ]}>
                        {notification.title}
                      </Text>
                      
                      <Text style={styles.notificationMessage} numberOfLines={2}>
                        {notification.message}
                      </Text>

                      {notification.data?.location && (
                        <Text style={styles.notificationLocation}>
                          📍 {notification.data.location.city} • {notification.data.location.distance}km
                        </Text>
                      )}

                      <Text style={styles.notificationTime}>
                        {formatTime(notification.timestamp)}
                      </Text>
                    </View>

                    {!notification.read && (
                      <View style={styles.unreadDot} />
                    )}

                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={colors.gray[400]}
                    />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 80,
    paddingRight: 20,
  },
  modalContainer: {
    backgroundColor: colors.white,
    borderRadius: 12,
    width: '90%',
    maxHeight: screenHeight * 0.7,
    elevation: 10,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.gray[800],
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.gray[100],
    borderRadius: 6,
  },
  clearText: {
    fontSize: 12,
    color: colors.gray[600],
    fontWeight: '500',
  },
  closeButton: {
    padding: 4,
  },
  notificationsList: {
    maxHeight: screenHeight * 0.5,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[700],
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.gray[500],
    textAlign: 'center',
    lineHeight: 20,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  unreadNotification: {
    backgroundColor: colors.primary + '05',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
    gap: 4,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray[800],
  },
  unreadTitle: {
    fontWeight: '600',
    color: colors.gray[900],
  },
  notificationMessage: {
    fontSize: 13,
    color: colors.gray[600],
    lineHeight: 18,
  },
  notificationLocation: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  notificationTime: {
    fontSize: 11,
    color: colors.gray[400],
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginLeft: 8,
    marginTop: 4,
  },
});

export default NotificationsModal;