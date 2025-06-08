import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../context/AuthContext';
import Loading from '../../components/Loading';
import RequestService from '../../services/requestService';
import colors, { getGradientString } from '../../styles/colors';

const MyRequestsScreen = () => {
  const { user } = useAuth();
  
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Charger les demandes et les stats en parallèle
      const [requestsResult, statsResult] = await Promise.all([
        RequestService.getMyRequests(),
        RequestService.getMyStats(),
      ]);

      if (requestsResult.success) {
        setRequests(requestsResult.data.requests);
        console.log('✅ Demandes chargées:', requestsResult.data.requests.length);
      } else {
        console.error('❌ Erreur chargement demandes:', requestsResult.error);
        Alert.alert('Erreur', 'Impossible de charger vos demandes');
      }

      if (statsResult.success) {
        setStats(statsResult.data);
        console.log('✅ Stats chargées');
      }

    } catch (error) {
      console.error('❌ Erreur loadData:', error);
      Alert.alert('Erreur', 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return colors.success;
      case 'completed':
        return colors.primary;
      case 'cancelled':
        return colors.gray[500];
      case 'expired':
        return colors.warning;
      default:
        return colors.gray[500];
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'completed':
        return 'Terminée';
      case 'cancelled':
        return 'Annulée';
      case 'expired':
        return 'Expirée';
      default:
        return status;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getFilteredRequests = () => {
    if (selectedFilter === 'all') return requests;
    return requests.filter(request => request.status === selectedFilter);
  };

  const filters = [
    { id: 'all', label: 'Toutes', count: requests.length },
    { id: 'active', label: 'Actives', count: requests.filter(r => r.status === 'active').length },
    { id: 'completed', label: 'Terminées', count: requests.filter(r => r.status === 'completed').length },
  ];

  if (loading) {
    return <Loading fullScreen text="Chargement de vos demandes..." />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={getGradientString('primary')}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Mes demandes</Text>
        <Text style={styles.headerSubtitle}>
          Gérez vos demandes en cours
        </Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Statistiques */}
        {stats && (
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.total || 0}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.active || 0}</Text>
              <Text style={styles.statLabel}>Actives</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.totalViews || 0}</Text>
              <Text style={styles.statLabel}>Vues</Text>
            </View>
          </View>
        )}

        {/* Filtres */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filtersContainer}
          contentContainerStyle={styles.filtersContent}
        >
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.filterButton,
                selectedFilter === filter.id && styles.activeFilterButton
              ]}
              onPress={() => setSelectedFilter(filter.id)}
            >
              <Text style={[
                styles.filterText,
                selectedFilter === filter.id && styles.activeFilterText
              ]}>
                {filter.label} ({filter.count})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Liste des demandes */}
        <View style={styles.requestsList}>
          {getFilteredRequests().length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-outline" size={64} color={colors.gray[400]} />
              <Text style={styles.emptyTitle}>Aucune demande</Text>
              <Text style={styles.emptySubtitle}>
                {selectedFilter === 'all' 
                  ? 'Vous n\'avez pas encore créé de demande'
                  : `Aucune demande ${filters.find(f => f.id === selectedFilter)?.label.toLowerCase()}`
                }
              </Text>
            </View>
          ) : (
            getFilteredRequests().map((request) => (
              <View key={request._id} style={styles.requestCard}>
                {/* Header de la carte */}
                <View style={styles.requestHeader}>
                  <View style={styles.requestTitleContainer}>
                    <Text style={styles.requestTitle} numberOfLines={2}>
                      {request.title}
                    </Text>
                    <View style={styles.requestMeta}>
                      <Text style={styles.requestDate}>
                        {formatDate(request.createdAt)}
                      </Text>
                      <View style={styles.separator} />
                      <View style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(request.status) + '20' }
                      ]}>
                        <Text style={[
                          styles.statusText,
                          { color: getStatusColor(request.status) }
                        ]}>
                          {getStatusText(request.status)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Description */}
                <Text style={styles.requestDescription} numberOfLines={3}>
                  {request.description}
                </Text>

                {/* Photos */}
                {request.photos && request.photos.length > 0 && (
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.photosContainer}
                  >
                    {request.photos.map((photo, index) => (
                      <Image
                        key={index}
                        source={{ uri: photo.url }}
                        style={styles.requestPhoto}
                      />
                    ))}
                  </ScrollView>
                )}

                {/* Footer de la carte */}
                <View style={styles.requestFooter}>
                  <View style={styles.requestStats}>
                    <View style={styles.statItem}>
                      <Ionicons name="eye-outline" size={16} color={colors.gray[500]} />
                      <Text style={styles.statText}>{request.viewCount || 0} vues</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Ionicons name="location-outline" size={16} color={colors.gray[500]} />
                      <Text style={styles.statText}>{request.radius} km</Text>
                    </View>
                  </View>
                  
                  <TouchableOpacity style={styles.actionButton}>
                    <Ionicons name="ellipsis-horizontal" size={20} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.white,
    opacity: 0.9,
  },
  content: {
    flex: 1,
    marginTop: -15,
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 24,
    paddingBottom: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.gray[50],
    borderRadius: 12,
    marginHorizontal: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 4,
  },
  filtersContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  filtersContent: {
    paddingRight: 24,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.gray[100],
    borderRadius: 20,
    marginRight: 12,
  },
  activeFilterButton: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  activeFilterText: {
    color: colors.white,
  },
  requestsList: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  requestCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  requestHeader: {
    marginBottom: 12,
  },
  requestTitleContainer: {
    flex: 1,
  },
  requestTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  requestMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestDate: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  separator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gray[400],
    marginHorizontal: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  requestDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  photosContainer: {
    marginBottom: 16,
  },
  requestPhoto: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: colors.gray[200],
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  requestStats: {
    flexDirection: 'row',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    fontSize: 12,
    color: colors.text.secondary,
    marginLeft: 4,
  },
  actionButton: {
    padding: 8,
  },
});

export default MyRequestsScreen;