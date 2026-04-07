// SellerHome.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, db } from '../firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  orderBy,
  limit,
} from 'firebase/firestore';

const { width } = Dimensions.get('window');

export default function SellerHome({ navigation }) {
  const [seller, setSeller] = useState({ name: '', location: '' });
  const [agencies, setAgencies] = useState([]);
  const [nearestAgency, setNearestAgency] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Haversine distance formula (in km)
  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  useEffect(() => {
    const fetchAllData = async () => {
      if (!auth.currentUser) {
        Alert.alert('Not logged in', 'Please sign in first.');
        return;
      }

      try {
        setLoading(true);

        const uid = auth.currentUser.uid;

        // 1. Fetch Seller Profile
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setSeller({
            name: userData.name || userData.fullName || 'Seller',
            location: userData.location || 'Unknown Location',
            latitude: userData.latitude,
            longitude: userData.longitude,
          });
        }

        // 2. Fetch Active Agencies
        const agenciesQuery = query(
          collection(db, 'users'),
          where('entityType', '==', 'agency'),
          where('isActive', '==', true)
        );
        const agenciesSnap = await getDocs(agenciesQuery);
        let agenciesList = agenciesSnap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));

        // 3. Fetch Rates for each agency + calculate distance
        const sellerLat = seller.latitude;
        const sellerLon = seller.longitude;

        for (let agency of agenciesList) {
          const ratesQuery = query(
            collection(db, 'scrap_rates'),
            where('agencyId', '==', agency.id)
          );
          const ratesSnap = await getDocs(ratesQuery);
          agency.rates = ratesSnap.docs.map((r) => r.data());

          // Calculate distance
          if (sellerLat && sellerLon && agency.latitude && agency.longitude) {
            agency.distance = getDistance(
              sellerLat,
              sellerLon,
              agency.latitude,
              agency.longitude
            );
          } else {
            // Fallback: simple string match (basic)
            agency.distance = agency.location === seller.location ? 0 : 999;
          }
        }

        // Sort agencies by distance
        agenciesList.sort((a, b) => (a.distance || 999) - (b.distance || 999));

        setAgencies(agenciesList);
        setNearestAgency(agenciesList[0] || null);

        // 4. Fetch Recent Orders (limit 5)
        const ordersQuery = query(
          collection(db, 'orders'),
          where('sellerId', '==', uid),
          orderBy('createdAt', 'desc'),
          limit(5)
        );
        const ordersSnap = await getDocs(ordersQuery);
        const ordersData = ordersSnap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        setRecentOrders(ordersData);
      } catch (error) {
        console.error('Error fetching home data:', error);
        Alert.alert('Error', 'Failed to load home data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  // Get status style (matches your other screens)
  const getStatusStyle = (status) => {
    const lower = (status || 'pending').toLowerCase().trim();
    switch (lower) {
      case 'pending':
        return { bg: '#ca8a04', text: '#fefce8' };
      case 'accepted':
        return { bg: '#2563eb', text: '#eff6ff' };
      case 'pickedup':
      case 'picked up':
        return { bg: '#16a34a', text: '#f0fdf4' };
      case 'rejected':
        return { bg: '#dc2626', text: '#fef2f2' };
      default:
        return { bg: '#475569', text: '#e2e8f0' };
    }
  };

  // Get price display from nearest agency
  const getPriceForMaterial = (materialName) => {
    if (!nearestAgency?.rates?.length) return '—';
    const rate = nearestAgency.rates.find(
      (r) => r.materialName?.toLowerCase() === materialName.toLowerCase()
    );
    return rate ? `₹${parseFloat(rate.pricePerKg || 0).toFixed(2)}` : '—';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading your marketplace...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerLeft}>
            <Text style={styles.welcome}>Welcome back,</Text>
            <Text style={styles.name}>{seller.name}</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.locationContainer}>
              <Ionicons name="location-sharp" size={14} color="#94a3b8" />
              <Text style={styles.location}>{seller.location}</Text>
            </View>
            <TouchableOpacity
              style={styles.profileBtn}
              onPress={() => navigation.navigate('Profile')}
            >
              <Ionicons name="person-circle-outline" size={28} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Action - Sell Scrap */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => navigation.navigate('SellScrap')}
        >
          <LinearGradient
            colors={['#3b82f6', '#2563eb']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sellButton}
          >
            <View style={styles.sellContent}>
              <Text style={styles.sellMainText}>Sell Scrap Now</Text>
              <Text style={styles.sellSubText}>Instant quote • Fast pickup</Text>
            </View>
            <Ionicons name="arrow-forward" size={32} color="white" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Today's Prices from Nearest Agency */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Today's Prices {nearestAgency ? `• ${nearestAgency.businessName || 'Nearest Agency'}` : ''}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {['Paper', 'Iron', 'Plastic', 'Copper'].map((material, index) => (
              <View key={index} style={styles.priceCard}>
                <Ionicons
                  name={
                    material === 'Paper'
                      ? 'newspaper-outline'
                      : material === 'Iron'
                      ? 'hammer-outline'
                      : material === 'Plastic'
                      ? 'water-outline'
                      : 'flash-outline'
                  }
                  size={26}
                  color="#3b82f6"
                />
                <Text style={styles.priceType}>{material}</Text>
                <Text style={styles.priceValue}>{getPriceForMaterial(material)}</Text>
                <Text style={styles.priceUnit}>/ kg</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Nearby Centers (Real Agencies) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nearby Centers</Text>
          {agencies.slice(0, 3).map((agency, index) => (
            <TouchableOpacity
              key={index}
              style={styles.centerCard}
              onPress={() => navigation.navigate('SellScrap', { agency })}
            >
              <View>
                <Text style={styles.centerName}>
                  {agency.businessName || agency.name || 'Agency'}
                </Text>
                <Text style={styles.centerDistance}>
                  <Ionicons name="location-outline" size={14} color="#3b82f6" />{' '}
                  {agency.distance
                    ? `${agency.distance.toFixed(1)} km`
                    : agency.location || 'Nearby'}
                </Text>
              </View>
              <View style={styles.ratingBadge}>
                <Text style={styles.ratingText}>4.7</Text>
                <Ionicons name="star" size={14} color="#fbbf24" />
              </View>
            </TouchableOpacity>
          ))}
          {agencies.length === 0 && (
            <Text style={styles.emptyText}>No active agencies found nearby</Text>
          )}
        </View>

        {/* Recent Orders */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>My Recent Orders</Text>
            <TouchableOpacity onPress={() => navigation.navigate('SellerOrders')}>
              <Text style={styles.viewAll}>View All →</Text>
            </TouchableOpacity>
          </View>

          {recentOrders.length === 0 ? (
            <Text style={styles.emptyText}>No orders yet. Start selling scrap!</Text>
          ) : (
            recentOrders.map((order) => {
              const statusStyle = getStatusStyle(order.status);
              return (
                <View key={order.id} style={styles.orderCard}>
                  <View style={styles.orderLeft}>
                    <Text style={styles.orderMaterial}>
                      {order.materials?.[0]?.materialName || 'Multiple Materials'}
                    </Text>
                    <Text style={styles.orderQty}>
                      {order.totalKg ? `${order.totalKg.toFixed(1)} kg` : '—'}
                    </Text>
                  </View>
                  <View style={styles.orderRight}>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: statusStyle.bg },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color: statusStyle.text },
                        ]}
                      >
                        {order.status || 'Pending'}
                      </Text>
                    </View>
                    <Text style={styles.orderAmount}>
                      ₹{order.estimatedAmount?.toLocaleString('en-IN') || '—'}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: { color: '#94a3b8', marginTop: 16, fontSize: 16 },

  headerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  headerLeft: {},
  welcome: { color: '#94a3b8', fontSize: 14, marginBottom: 2 },
  name: { color: '#f1f5f9', fontSize: 22, fontWeight: '700' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  locationContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  location: { color: '#94a3b8', fontSize: 13 },
  profileBtn: { padding: 4 },

  sellButton: {
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 24,
    marginBottom: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  sellContent: { flex: 1 },
  sellMainText: {
    color: 'white',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sellSubText: { color: 'rgba(255,255,255,0.78)', fontSize: 14, marginTop: 4 },

  section: { marginBottom: 28 },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#f1f5f9',
    fontSize: 19,
    fontWeight: '700',
  },
  viewAll: { color: '#60a5fa', fontSize: 14, fontWeight: '600' },

  priceCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginRight: 14,
    alignItems: 'center',
    width: 120,
    borderWidth: 1,
    borderColor: '#334155',
  },
  priceType: { color: '#f1f5f9', fontSize: 15, fontWeight: '600', marginVertical: 8 },
  priceValue: { color: '#60a5fa', fontSize: 22, fontWeight: '800' },
  priceUnit: { color: '#94a3b8', fontSize: 12 },

  centerCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  centerName: { color: '#f1f5f9', fontSize: 16, fontWeight: '600' },
  centerDistance: { color: '#94a3b8', fontSize: 13, marginTop: 4 },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251,191,36,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  ratingText: { color: '#fbbf24', fontWeight: '700', fontSize: 14, marginRight: 4 },

  orderCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  orderLeft: {},
  orderMaterial: { color: '#f1f5f9', fontSize: 16, fontWeight: '600' },
  orderQty: { color: '#94a3b8', fontSize: 13, marginTop: 4 },
  orderRight: { alignItems: 'flex-end' },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: 6,
  },
  statusText: { fontSize: 12, fontWeight: '700' },
  orderAmount: { color: '#60a5fa', fontSize: 18, fontWeight: '700' },

  emptyText: {
    color: '#94a3b8',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
});