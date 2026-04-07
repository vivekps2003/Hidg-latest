// AgencyOrders.js
// Agency sees all incoming orders — can Accept (→ tracking) or Reject them.

import React, { useState, useEffect, useCallback } from 'react';
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
  RefreshControl,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebase';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending: { label: 'Awaiting Review', color: '#fbbf24', bg: '#1c1a0f', icon: 'time-outline' },
  accepted: { label: 'Accepted', color: '#34d399', bg: '#0a1f17', icon: 'checkmark-circle-outline' },
  rejected: { label: 'Rejected', color: '#f87171', bg: '#1f0a0a', icon: 'close-circle-outline' },
  picked_up: { label: 'Picked Up', color: '#60a5fa', bg: '#0a1020', icon: 'car-outline' },
  completed: { label: 'Completed', color: '#a78bfa', bg: '#130a1f', icon: 'ribbon-outline' },
};

const FILTER_TABS = ['All', 'Pending', 'Accepted', 'Rejected', 'Completed'];

// ─── Single Order Card ────────────────────────────────────────────────────────
function OrderCard({ order, onAccept, onReject, onTrack, actionLoading }) {
  const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const isPending = order.status === 'pending';
  const isAccepted = order.status === 'accepted';
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, []);

  const createdAt = order.createdAt?.toDate?.();
  const timeStr = createdAt
    ? createdAt.toLocaleString('en-IN', {
        day: '2-digit', month: 'short',
        hour: '2-digit', minute: '2-digit',
      })
    : 'Just now';

  return (
    <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
      {/* Card Top Row */}
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sellerLabel}>Order Request</Text>
          <Text style={styles.orderId}>#{order.id.slice(-6).toUpperCase()}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: status.bg, borderColor: status.color }]}>
          <Ionicons name={status.icon} size={13} color={status.color} />
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      {/* Time */}
      <View style={styles.metaRow}>
        <Ionicons name="calendar-outline" size={13} color="#64748b" />
        <Text style={styles.metaText}>{timeStr}</Text>
      </View>

      {/* Materials */}
      <View style={styles.divider} />
      {(order.materials || []).map((mat, i) => (
        <View key={i} style={styles.materialRow}>
          <View style={styles.materialDot} />
          <Text style={styles.materialName}>{mat.materialName}</Text>
          <Text style={styles.materialQty}>{mat.quantityKg} kg</Text>
          <Text style={styles.materialAmount}>₹{mat.subtotal?.toFixed(0)}</Text>
        </View>
      ))}

      {/* Totals */}
      <View style={styles.divider} />
      <View style={styles.totalsRow}>
        <View style={styles.totalItem}>
          <Text style={styles.totalLabel}>Total Weight</Text>
          <Text style={styles.totalValue}>{order.totalKg} kg</Text>
        </View>
        <View style={styles.totalDivider} />
        <View style={styles.totalItem}>
          <Text style={styles.totalLabel}>Est. Payout</Text>
          <Text style={[styles.totalValue, { color: '#60a5fa' }]}>₹{order.estimatedAmount}</Text>
        </View>
      </View>

      {/* Location chip if available */}
      {order.sellerLatitude && (
        <View style={styles.locationChip}>
          <Ionicons name="navigate-circle-outline" size={14} color="#34d399" />
          <Text style={styles.locationText}>
            Seller location attached · {order.sellerLatitude.toFixed(4)}, {order.sellerLongitude.toFixed(4)}
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      {isPending && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.rejectBtn}
            onPress={() => onReject(order.id)}
            disabled={actionLoading === order.id}
          >
            {actionLoading === order.id ? (
              <ActivityIndicator size="small" color="#f87171" />
            ) : (
              <>
                <Ionicons name="close" size={18} color="#f87171" />
                <Text style={styles.rejectBtnText}>Reject</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.acceptBtn}
            onPress={() => onAccept(order.id)}
            disabled={actionLoading === order.id}
          >
            {actionLoading === order.id ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text style={styles.acceptBtnText}>Accept</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Track button for accepted orders */}
      {isAccepted && (
        <TouchableOpacity style={styles.trackBtn} onPress={() => onTrack(order)}>
          <Ionicons name="car-outline" size={18} color="#0f172a" />
          <Text style={styles.trackBtnText}>Manage Pickup</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AgencyOrders({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [actionLoading, setActionLoading] = useState(null); // orderId being acted on

  // Real-time listener for this agency's orders
  useEffect(() => {
    const agencyId = auth.currentUser?.uid;
    if (!agencyId) return;

    const q = query(
      collection(db, 'orders'),
      where('agencyId', '==', agencyId),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, snapshot => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setOrders(data);
      setLoading(false);
      setRefreshing(false);
    }, err => {
      console.error('Orders fetch error:', err);
      setLoading(false);
      setRefreshing(false);
    });

    return () => unsub();
  }, []);

  const handleAccept = useCallback(async (orderId) => {
    Alert.alert(
      'Accept Order',
      'Confirm you want to accept this order and proceed to pickup?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            setActionLoading(orderId);
            try {
              await updateDoc(doc(db, 'orders', orderId), {
                status: 'accepted',
                acceptedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
              // Navigate to tracking for this order
              const order = orders.find(o => o.id === orderId);
              if (order) {
                navigation.navigate('OrderTracking', { order: { ...order, status: 'accepted' } });
              }
            } catch (e) {
              console.error('Accept failed:', e);
              Alert.alert('Error', 'Could not accept order. Please try again.');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  }, [orders, navigation]);

  const handleReject = useCallback(async (orderId) => {
    Alert.alert(
      'Reject Order',
      'Are you sure you want to reject this order?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(orderId);
            try {
              await updateDoc(doc(db, 'orders', orderId), {
                status: 'rejected',
                rejectedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
            } catch (e) {
              console.error('Reject failed:', e);
              Alert.alert('Error', 'Could not reject order. Please try again.');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  }, []);

  const handleTrack = useCallback((order) => {
    navigation.navigate('OrderTracking', { order });
  }, [navigation]);

  const filteredOrders = orders.filter(o => {
    if (activeFilter === 'All') return true;
    return o.status === activeFilter.toLowerCase();
  });

  const pendingCount = orders.filter(o => o.status === 'pending').length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Incoming Orders</Text>
          <Text style={styles.headerSub}>
            {pendingCount > 0 ? `${pendingCount} awaiting your review` : 'All orders reviewed'}
          </Text>
        </View>
        {pendingCount > 0 && (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingBadgeText}>{pendingCount}</Text>
          </View>
        )}
      </View>

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
      >
        {FILTER_TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.filterTab, activeFilter === tab && styles.filterTabActive]}
            onPress={() => setActiveFilter(tab)}
          >
            <Text style={[styles.filterTabText, activeFilter === tab && styles.filterTabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Orders List */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      ) : filteredOrders.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="file-tray-outline" size={56} color="#334155" />
          <Text style={styles.emptyTitle}>No {activeFilter === 'All' ? '' : activeFilter} Orders</Text>
          <Text style={styles.emptySubtitle}>
            {activeFilter === 'All'
              ? 'New order requests will appear here.'
              : `No orders with "${activeFilter}" status.`}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => setRefreshing(true)}
              tintColor="#2563eb"
            />
          }
        >
          {filteredOrders.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              onAccept={handleAccept}
              onReject={handleReject}
              onTrack={handleTrack}
              actionLoading={actionLoading}
            />
          ))}
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
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: { color: '#f1f5f9', fontSize: 24, fontWeight: '800' },
  headerSub: { color: '#64748b', fontSize: 13, marginTop: 2 },
  pendingBadge: {
    backgroundColor: '#fbbf24',
    borderRadius: 20,
    minWidth: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  pendingBadgeText: { color: '#0f172a', fontSize: 15, fontWeight: '800' },

  filterRow: { maxHeight: 52, marginBottom: 4 },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterTabActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  filterTabText: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },
  filterTabTextActive: { color: '#fff' },

  listContent: { padding: 16, paddingBottom: 40, gap: 16 },

  card: {
    backgroundColor: '#1e293b',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  sellerLabel: { color: '#64748b', fontSize: 11, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase' },
  orderId: { color: '#f1f5f9', fontSize: 18, fontWeight: '800', marginTop: 2 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    gap: 4,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 12 },
  metaText: { color: '#64748b', fontSize: 12 },

  divider: { height: 1, backgroundColor: '#334155', marginVertical: 12 },

  materialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  materialDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: '#2563eb',
  },
  materialName: { color: '#cbd5e1', fontSize: 14, flex: 1 },
  materialQty: { color: '#94a3b8', fontSize: 13, width: 55, textAlign: 'right' },
  materialAmount: { color: '#60a5fa', fontSize: 13, width: 60, textAlign: 'right', fontWeight: '600' },

  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  totalItem: { alignItems: 'center', flex: 1 },
  totalLabel: { color: '#64748b', fontSize: 12, marginBottom: 4 },
  totalValue: { color: '#f1f5f9', fontSize: 17, fontWeight: '700' },
  totalDivider: { width: 1, height: 32, backgroundColor: '#334155' },

  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0a1f17',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#134e35',
  },
  locationText: { color: '#34d399', fontSize: 11, flex: 1 },

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#f87171',
    backgroundColor: '#1f0a0a',
  },
  rejectBtnText: { color: '#f87171', fontSize: 15, fontWeight: '700' },
  acceptBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#16a34a',
  },
  acceptBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  trackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#34d399',
  },
  trackBtnText: { color: '#0f172a', fontSize: 15, fontWeight: '800' },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#64748b', fontSize: 15 },
  emptyTitle: { color: '#cbd5e1', fontSize: 20, fontWeight: '700' },
  emptySubtitle: { color: '#64748b', fontSize: 14, textAlign: 'center', paddingHorizontal: 40 },
});