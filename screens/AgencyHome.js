import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';

const AgencyHome = ({ navigation }) => {
  const [agencyData, setAgencyData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState({
    totalOrders: 0,
    activeOrders: 0,
    completedOrders: 0,
    totalScrap: 0,
    totalPayout: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const db = getFirestore();
  const auth = getAuth();
  const user = auth.currentUser;

  const fetchData = useCallback(async () => {
    if (!user) {
      Alert.alert('Error', 'No authenticated user found.');
      return;
    }

    try {
      // Changed from 'agencies' → 'users'
      const agencyRef = doc(db, 'users', user.uid);
      const agencySnap = await getDoc(agencyRef);

      if (agencySnap.exists()) {
        const data = agencySnap.data();
        // Optional: you could add a safety check here in the future
        // if (data.entityType !== 'agency') { ... handle mismatch ... }
        setAgencyData(data);
      } else {
        Alert.alert('Not Found', 'Agency profile not found.');
      }

      const ordersQ = query(
        collection(db, 'orders'),
        where('selectedAgencyId', '==', user.uid)
      );
      const ordersSnap = await getDocs(ordersQ);
      const ordersData = ordersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setOrders(ordersData);
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      Alert.alert('Error', 'Failed to load dashboard data. Please try again.');
    }
  }, [user, db]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchData();
      setLoading(false);
    };
    load();
  }, [fetchData]);

  useEffect(() => {
    if (orders.length === 0) return;

    const completed = orders.filter((o) => o.status === 'Completed');
    const active = orders.filter((o) =>
      ['Accepted', 'In Progress'].includes(o.status)
    );

    setSummary({
      totalOrders: orders.length,
      activeOrders: active.length,
      completedOrders: completed.length,
      totalScrap: completed.reduce((sum, o) => sum + (Number(o.totalKg) || 0), 0),
      totalPayout: completed.reduce((sum, o) => sum + (Number(o.estimatedTotalPayout) || 0), 0),
    });
  }, [orders]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const toggleActive = async (newValue) => {
    if (!agencyData || !user) return;

    try {
      // Changed from 'agencies' → 'users'
      const agencyRef = doc(db, 'users', user.uid);
      await updateDoc(agencyRef, {
        isActive: newValue,
        updatedAt: serverTimestamp(),
      });
      setAgencyData((prev) => ({ ...prev, isActive: newValue }));
    } catch (err) {
      console.error('Toggle active failed:', err);
      Alert.alert('Error', 'Could not update agency status.');
    }
  };

  const getKycStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return { bg: '#4CAF50', text: '#FFFFFF' };
      case 'pending':
        return { bg: '#FFC107', text: '#000000' };
      case 'rejected':
      case 'not_submitted':
        return { bg: '#F44336', text: '#FFFFFF' };
      default:
        return { bg: '#757575', text: '#FFFFFF' };
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      </SafeAreaView>
    );
  }

  if (!agencyData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.errorText}>Agency profile not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const kyc = getKycStyle(agencyData.kycStatus);
  const showKycWarning = agencyData.kycStatus !== 'approved';
  const showOfflineWarning = !agencyData.isActive;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4CAF50"
            colors={['#4CAF50']}
          />
        }
      >
        {/* Warnings */}
        {showKycWarning && (
          <View style={[styles.banner, styles.bannerWarning]}>
            <Ionicons name="alert-circle" size={20} color="#fff" />
            <Text style={styles.bannerText}>
              KYC not approved — cannot receive direct orders
            </Text>
          </View>
        )}

        {showOfflineWarning && (
          <View style={[styles.banner, styles.bannerOffline]}>
            <Ionicons name="cloud-offline" size={20} color="#fff" />
            <Text style={styles.bannerText}>Agency is currently offline</Text>
          </View>
        )}

        {/* Summary Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="grid-outline" size={22} color="#4CAF50" />
            <Text style={styles.cardTitle}>Dashboard Overview</Text>
          </View>

          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{summary.totalOrders}</Text>
              <Text style={styles.summaryLabel}>Total Orders</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{summary.activeOrders}</Text>
              <Text style={styles.summaryLabel}>Active</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{summary.completedOrders}</Text>
              <Text style={styles.summaryLabel}>Completed</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{summary.totalScrap.toFixed(0)}</Text>
              <Text style={styles.summaryLabel}>Total Kg</Text>
            </View>
            <View style={[styles.summaryItem, styles.fullWidth]}>
              <Text style={[styles.summaryValue, { color: '#81C784' }]}>
                ₹{summary.totalPayout.toLocaleString()}
              </Text>
              <Text style={styles.summaryLabel}>Total Earnings</Text>
            </View>
          </View>
        </View>

        {/* Agency Status */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="business-outline" size={22} color="#2196F3" />
            <Text style={styles.cardTitle}>Agency Status</Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>KYC Status</Text>
            <View style={[styles.badge, { backgroundColor: kyc.bg }]}>
              <Text style={[styles.badgeText, { color: kyc.text }]}>
                {(agencyData.kycStatus || 'Unknown').toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Active</Text>
            <Switch
              value={agencyData.isActive}
              onValueChange={toggleActive}
              trackColor={{ false: '#424242', true: '#66BB6A' }}
              thumbColor={agencyData.isActive ? '#4CAF50' : '#B0BEC5'}
              ios_backgroundColor="#3e3e3e"
            />
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Min Pickup</Text>
            <Text style={styles.statusValue}>{agencyData.minPickupKg || 0} kg</Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Service Radius</Text>
            <Text style={styles.statusValue}>{agencyData.serviceRadiusKm || 0} km</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="flash-outline" size={22} color="#FFCA28" />
            <Text style={styles.cardTitle}>Quick Actions</Text>
          </View>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('AgencyRates')}
          >
            <Ionicons name="pricetag-outline" size={22} color="#FFCA28" />
            <Text style={styles.actionText}>Manage Rates</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('AgencyOrders')}
          >
            <Ionicons name="list-outline" size={22} color="#2196F3" />
            <Text style={styles.actionText}>View Orders</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <Ionicons name="person-outline" size={22} color="#AB47BC" />
            <Text style={styles.actionText}>Profile Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Analytics Placeholder */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="trending-up-outline" size={22} color="#29B6F6" />
            <Text style={styles.cardTitle}>Earnings Analytics</Text>
          </View>
          <View style={styles.placeholderContainer}>
            <Text style={styles.placeholderText}>Interactive chart coming soon...</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollContent: {
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  bannerWarning: {
    backgroundColor: '#C62828',
  },
  bannerOffline: {
    backgroundColor: '#F57C00',
  },
  bannerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#252525',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  fullWidth: {
    flexBasis: '100%',
  },
  summaryValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  summaryLabel: {
    color: '#B0BEC5',
    fontSize: 13,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  statusLabel: {
    color: '#E0E0E0',
    fontSize: 15,
  },
  statusValue: {
    color: '#81C784',
    fontSize: 15,
    fontWeight: '500',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#252525',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 14,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  placeholderContainer: {
    height: 140,
    backgroundColor: '#252525',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#78909C',
    fontSize: 15,
    fontStyle: 'italic',
  },
  errorText: {
    color: '#EF5350',
    fontSize: 18,
    textAlign: 'center',
  },
});

export default AgencyHome;