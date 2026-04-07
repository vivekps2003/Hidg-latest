// SellerOrders.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
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

export default function SellerOrders({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser) {
      Alert.alert('Not logged in', 'Please sign in to view your orders.');
      navigation?.goBack?.();
      return;
    }

    const fetchSellerOrders = async () => {
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
      } catch (error) {
        console.error('Error fetching seller orders:', error);
        Alert.alert('Error', 'Failed to load your orders. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchSellerOrders();
  }, [currentUser?.uid, navigation]);

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return { bg: '#ca8a04', text: '#fefce8' };     // yellow
      case 'accepted':
        return { bg: '#2563eb', text: '#eff6ff' };     // blue
      case 'pickedup':                                   // Note: stored as 'pickedUp' in DB
      case 'pickedUp':
        return { bg: '#16a34a', text: '#f0fdf4' };     // green
      case 'rejected':
        return { bg: '#dc2626', text: '#fef2f2' };     // red
      case 'completed':
        return { bg: '#7c3aed', text: '#f3e8ff' };     // purple (future use)
      default:
        return { bg: '#6b7280', text: '#f3f4f6' };
    }
  };

  const getStatusText = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'PENDING';
      case 'accepted': return 'ACCEPTED';
      case 'pickedup':
      case 'pickedUp': return 'PICKED UP';
      case 'rejected': return 'REJECTED';
      case 'completed': return 'COMPLETED';
      default: return (status || 'UNKNOWN').toUpperCase();
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp?.toDate) return '—';
    try {
      const date = timestamp.toDate();
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Invalid date';
    }
  };

  const renderOrder = ({ item }) => {
    const status = item.status || 'pending';
    const statusStyle = getStatusStyle(status);
    const isPickedUp = status === 'pickedUp' || status === 'pickedup';

    return (
      <View style={styles.orderCard}>
        <View style={styles.cardHeader}>
          <View style={styles.agencyInfo}>
            <Ionicons name="business-outline" size={18} color="#94a3b8" />
            <Text style={styles.agencyName}>
              {item.agencyName || 'Agency'}
            </Text>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {getStatusText(status)}
            </Text>
          </View>
        </View>

        <View style={styles.dateRow}>
          <Ionicons name="time-outline" size={14} color="#94a3b8" />
          <Text style={styles.dateText}>
            {formatDate(item.createdAt)}
          </Text>
        </View>

        <View style={styles.materialsSection}>
          {item.materials?.length > 0 ? (
            item.materials.map((mat, index) => (
              <View key={index} style={styles.materialLine}>
                <Text style={styles.materialName}>
                  {mat.materialName || 'Unknown material'}
                </Text>
                <Text style={styles.materialDetail}>
                  {(mat.quantityKg ?? 0).toFixed(1)} kg × ₹
                  {(mat.pricePerKg ?? 0).toFixed(1)}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.noMaterials}>No materials listed</Text>
          )}
        </View>

        <View style={styles.summarySection}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Weight</Text>
            <Text style={styles.summaryValue}>
              {(item.totalKg ?? 0).toFixed(1)} kg
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Estimated Payout</Text>
            <Text style={[styles.summaryValue, styles.payoutValue]}>
              ₹{(item.estimatedAmount ?? 0).toLocaleString('en-IN')}
            </Text>
          </View>
        </View>

        {/* Picked Up Confirmation */}
        {isPickedUp && (
          <View style={styles.pickedUpContainer}>
            <Ionicons name="checkmark-circle" size={24} color="#4ade80" />
            <Text style={styles.pickedUpText}>
              Agency has picked up your materials
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={26} color="#e2e8f0" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Orders</Text>
        <View style={{ width: 26 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading your orders...</Text>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="receipt-outline" size={64} color="#475569" />
          <Text style={styles.emptyText}>No orders yet</Text>
          <Text style={styles.emptySubText}>
            When you place an order, it will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrder}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerTitle: {
    color: '#f1f5f9',
    fontSize: 20,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 16,
    fontSize: 16,
  },
  emptyText: {
    color: '#e2e8f0',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubText: {
    color: '#94a3b8',
    fontSize: 15,
    textAlign: 'center',
  },
  orderCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  agencyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  agencyName: {
    color: '#f1f5f9',
    fontSize: 17,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  dateText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  materialsSection: {
    marginVertical: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#334155',
  },
  materialLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  materialName: {
    color: '#cbd5e1',
    fontSize: 15,
    flex: 1,
  },
  materialDetail: {
    color: '#94a3b8',
    fontSize: 14,
  },
  noMaterials: {
    color: '#64748b',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 8,
  },
  summarySection: {
    marginTop: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  summaryLabel: {
    color: '#cbd5e1',
    fontSize: 15,
  },
  summaryValue: {
    color: '#f1f5f9',
    fontSize: 15,
    fontWeight: '600',
  },
  payoutValue: {
    color: '#60a5fa',
    fontWeight: '700',
  },

  // New styles for picked up status
  pickedUpContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#052e16',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#16a34a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickedUpText: {
    color: '#4ade80',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
});