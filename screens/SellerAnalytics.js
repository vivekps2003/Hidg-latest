// SellerAnalytics.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebase';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from 'firebase/firestore';

const { width } = Dimensions.get('window');

export default function SellerAnalytics({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pending: 0,
    accepted: 0,
    pickedUp: 0,
    rejected: 0,
    totalKg: 0,
    totalEarnings: 0,
  });
  const [materialBreakdown, setMaterialBreakdown] = useState([]);
  const [monthlySummary, setMonthlySummary] = useState([]);

  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser) {
      Alert.alert('Not logged in', 'Please sign in to view analytics.');
      navigation?.goBack?.();
      return;
    }

    const fetchOrders = async () => {
      try {
        setLoading(true);
        const q = query(
          collection(db, 'orders'),
          where('sellerId', '==', currentUser.uid),
          orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const ordersData = querySnapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));

        setOrders(ordersData);
        calculateAnalytics(ordersData);
      } catch (error) {
        console.error('Error fetching orders for analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [currentUser?.uid]);

  const calculateAnalytics = (ordersData) => {
    if (ordersData.length === 0) {
      setStats({
        totalOrders: 0,
        pending: 0,
        accepted: 0,
        pickedUp: 0,
        rejected: 0,
        totalKg: 0,
        totalEarnings: 0,
      });
      setMaterialBreakdown([]);
      setMonthlySummary([]);
      return;
    }

    let totalKg = 0;
    let totalEarnings = 0;
    let pending = 0;
    let accepted = 0;
    let pickedUp = 0;
    let rejected = 0;

    const materialMap = {};
    const monthMap = {};

    ordersData.forEach((order) => {
      // Normalize status to lowercase
      const status = (order.status || 'pending').toLowerCase();
      const kg = parseFloat(order.totalKg) || 0;
      const amount = parseFloat(order.estimatedAmount) || 0;

      totalKg += kg;

      // Status counts
      if (status === 'pickedup') {
        pickedUp++;
        totalEarnings += amount;           // Earnings only from picked up orders
      } else if (status === 'accepted') {
        accepted++;
      } else if (status === 'pending') {
        pending++;
      } else if (status === 'rejected') {
        rejected++;
      }

      // Material breakdown (all orders)
      if (order.materials && Array.isArray(order.materials)) {
        order.materials.forEach((mat) => {
          const name = mat.materialName?.trim() || 'Unknown';
          const matKg = parseFloat(mat.quantityKg) || 0;
          materialMap[name] = (materialMap[name] || 0) + matKg;
        });
      }

      // Monthly earnings - only from pickedUp orders
      if (status === 'pickedup' && order.createdAt?.toDate) {
        const date = order.createdAt.toDate();
        const monthKey = date.toLocaleString('default', { 
          month: 'short', 
          year: 'numeric' 
        });
        monthMap[monthKey] = (monthMap[monthKey] || 0) + amount;
      }
    });

    // Material breakdown sorted by kg descending
    const materialsArray = Object.entries(materialMap)
      .map(([name, kg]) => ({ name, kg: Math.round(kg * 10) / 10 }))
      .sort((a, b) => b.kg - a.kg);

    // Monthly summary (recent first, max 6 months)
    const monthlyArray = Object.entries(monthMap)
      .map(([month, earnings]) => ({ month, earnings: Math.round(earnings) }))
      .sort((a, b) => b.month.localeCompare(a.month))
      .slice(0, 6);

    setStats({
      totalOrders: ordersData.length,
      pending,
      accepted,
      pickedUp,
      rejected,
      totalKg: Math.round(totalKg * 10) / 10,
      totalEarnings: Math.round(totalEarnings),
    });

    setMaterialBreakdown(materialsArray);
    setMonthlySummary(monthlyArray);
  };

  const maxKg = materialBreakdown.length ? Math.max(...materialBreakdown.map(m => m.kg)) : 1;
  const maxEarnings = monthlySummary.length ? Math.max(...monthlySummary.map(m => m.earnings)) : 1;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={26} color="#e2e8f0" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analytics</Text>
        <View style={{ width: 26 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading your analytics...</Text>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="bar-chart-outline" size={80} color="#475569" />
          <Text style={styles.emptyText}>No data available yet</Text>
          <Text style={styles.emptySubText}>
            Place some orders to see your scrap selling insights
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Overview Cards */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Overview</Text>
            <View style={styles.overviewGrid}>
              <View style={styles.statCard}>
                <Ionicons name="receipt-outline" size={28} color="#60a5fa" />
                <Text style={styles.statNumber}>{stats.totalOrders}</Text>
                <Text style={styles.statLabel}>Total Orders</Text>
              </View>

              <View style={styles.statCard}>
                <Ionicons name="checkmark-circle" size={28} color="#16a34a" />
                <Text style={styles.statNumber}>{stats.pickedUp}</Text>
                <Text style={styles.statLabel}>Picked Up</Text>
              </View>

              <View style={styles.statCard}>
                <Ionicons name="time-outline" size={28} color="#eab308" />
                <Text style={styles.statNumber}>{stats.pending}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>

              <View style={styles.statCard}>
                <Ionicons name="cash-outline" size={28} color="#a855f7" />
                <Text style={styles.statNumber}>
                  ₹{stats.totalEarnings.toLocaleString('en-IN')}
                </Text>
                <Text style={styles.statLabel}>Total Earnings</Text>
              </View>
            </View>
          </View>

          {/* Detailed Summary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Detailed Summary</Text>
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Scrap Sold</Text>
                <Text style={styles.summaryValue}>{stats.totalKg} kg</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Accepted</Text>
                <Text style={styles.summaryValue}>{stats.accepted}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Picked Up</Text>
                <Text style={styles.summaryValue}>{stats.pickedUp}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Rejected</Text>
                <Text style={styles.summaryValue}>{stats.rejected}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Earnings</Text>
                <Text style={[styles.summaryValue, { color: '#4ade80' }]}>
                  ₹{stats.totalEarnings.toLocaleString('en-IN')}
                </Text>
              </View>
            </View>
          </View>

          {/* Material Breakdown */}
          {materialBreakdown.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Material Breakdown</Text>
              <View style={styles.breakdownCard}>
                {materialBreakdown.map((mat, index) => {
                  const percentage = maxKg > 0 ? (mat.kg / maxKg) * 100 : 0;
                  return (
                    <View key={index} style={styles.materialRow}>
                      <View style={styles.materialInfo}>
                        <Text style={styles.materialName}>{mat.name}</Text>
                        <Text style={styles.materialKg}>{mat.kg} kg</Text>
                      </View>
                      <View style={styles.barContainer}>
                        <View
                          style={[
                            styles.bar,
                            { width: `${Math.max(percentage, 8)}%` },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Monthly Earnings */}
          {monthlySummary.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Monthly Earnings</Text>
              <View style={styles.monthlyCard}>
                {monthlySummary.map((item, index) => {
                  const heightPercent = maxEarnings > 0 ? (item.earnings / maxEarnings) * 100 : 0;
                  return (
                    <View key={index} style={styles.monthColumn}>
                      <Text style={styles.monthBarValue}>₹{item.earnings}</Text>
                      <View style={styles.monthBarContainer}>
                        <View
                          style={[
                            styles.monthBar,
                            { height: `${Math.max(heightPercent, 8)}%` },
                          ]}
                        />
                      </View>
                      <Text style={styles.monthLabel}>{item.month}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerTitle: { color: '#f1f5f9', fontSize: 20, fontWeight: '700' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  loadingText: { color: '#94a3b8', marginTop: 16, fontSize: 16 },
  emptyText: { color: '#e2e8f0', fontSize: 20, fontWeight: '600', marginTop: 24, marginBottom: 8, textAlign: 'center' },
  emptySubText: { color: '#94a3b8', fontSize: 15, textAlign: 'center' },

  section: { marginBottom: 24 },
  sectionTitle: { color: '#f1f5f9', fontSize: 18, fontWeight: '700', marginBottom: 12, paddingHorizontal: 4 },

  overviewGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    width: (width - 44) / 2,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  statNumber: { color: '#f1f5f9', fontSize: 26, fontWeight: '700', marginVertical: 8 },
  statLabel: { color: '#94a3b8', fontSize: 13, fontWeight: '500' },

  summaryCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  summaryLabel: { color: '#cbd5e1', fontSize: 15 },
  summaryValue: { color: '#f1f5f9', fontSize: 16, fontWeight: '600' },

  breakdownCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  materialRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 10 },
  materialInfo: { width: 140 },
  materialName: { color: '#e2e8f0', fontSize: 15, fontWeight: '600' },
  materialKg: { color: '#94a3b8', fontSize: 13 },
  barContainer: {
    flex: 1,
    height: 12,
    backgroundColor: '#334155',
    borderRadius: 6,
    overflow: 'hidden',
    marginLeft: 12,
  },
  bar: { height: '100%', backgroundColor: '#60a5fa', borderRadius: 6 },

  monthlyCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 220,
  },
  monthColumn: { alignItems: 'center', flex: 1 },
  monthBarContainer: {
    width: 28,
    height: 140,
    backgroundColor: '#334155',
    borderRadius: 999,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  monthBar: { width: '100%', backgroundColor: '#4ade80', borderRadius: 999 },
  monthBarValue: { color: '#94a3b8', fontSize: 11, marginBottom: 4 },
  monthLabel: { color: '#cbd5e1', fontSize: 12, fontWeight: '500' },
});