import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebase';
import {
  collection, query, where, onSnapshot,
  doc, updateDoc, serverTimestamp, orderBy,
} from 'firebase/firestore';

const STATUS_CONFIG = {
  assigned:    { label: 'Assigned',    color: '#fbbf24', bg: '#1c1a0f', icon: 'person-outline' },
  accepted:    { label: 'Accepted',    color: '#60a5fa', bg: '#0a1020', icon: 'checkmark-circle-outline' },
  in_progress: { label: 'In Progress', color: '#a78bfa', bg: '#130a1f', icon: 'car-outline' },
  picked:      { label: 'Picked Up',   color: '#34d399', bg: '#0a1f17', icon: 'cube-outline' },
  completed:   { label: 'Completed',   color: '#4ade80', bg: '#0a1f0a', icon: 'ribbon-outline' },
};

const NEXT_ACTION = {
  assigned:    { label: 'Accept Pickup',   next: 'accepted',    color: '#60a5fa' },
  accepted:    { label: 'Start Trip',      next: 'in_progress', color: '#a78bfa' },
  in_progress: { label: 'Mark Picked Up',  next: 'picked',      color: '#34d399' },
  picked:      { label: 'Complete Order',  next: 'completed',   color: '#4ade80' },
};

const FILTER_TABS = ['All', 'Assigned', 'Active', 'Completed'];

export default function PickupOrders({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [actionLoading, setActionLoading] = useState(null);
  const [fetchTick, setFetchTick] = useState(0);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setLoading(false); return; }

    const q = query(
      collection(db, 'orders'),
      where('pickupAgentId', '==', uid),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, snap => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
      setRefreshing(false);
    }, err => {
      console.error('PickupOrders error:', err.code, err.message);
      Alert.alert('Error', err.message);
      setLoading(false);
      setRefreshing(false);
    });

    return () => unsub();
  }, [fetchTick]);

  const handleAction = useCallback(async (order) => {
    const action = NEXT_ACTION[order.status];
    if (!action) return;

    Alert.alert(
      action.label,
      `Confirm: "${action.label}" for order #${order.id.slice(-6).toUpperCase()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setActionLoading(order.id);
            try {
              await updateDoc(doc(db, 'orders', order.id), {
                status: action.next,
                updatedAt: serverTimestamp(),
                ...(action.next === 'in_progress' && { tripStartedAt: serverTimestamp() }),
                ...(action.next === 'picked'      && { pickedUpAt: serverTimestamp() }),
                ...(action.next === 'completed'   && { completedAt: serverTimestamp() }),
              });
            } catch (e) {
              Alert.alert('Error', e.code === 'permission-denied'
                ? 'Permission denied. Check Firestore rules.'
                : 'Could not update. Try again.');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  }, []);

  const filteredOrders = orders.filter(o => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Assigned') return o.status === 'assigned';
    if (activeFilter === 'Active') return ['accepted', 'in_progress', 'picked'].includes(o.status);
    if (activeFilter === 'Completed') return o.status === 'completed';
    return true;
  });

  const assignedCount = orders.filter(o => o.status === 'assigned').length;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Pickup Orders</Text>
          <Text style={styles.headerSub}>
            {assignedCount > 0 ? `${assignedCount} new assignment${assignedCount > 1 ? 's' : ''}` : 'All caught up'}
          </Text>
        </View>
        {assignedCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{assignedCount}</Text>
          </View>
        )}
      </View>

      {/* Filter Tabs */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
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

      {/* List */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); setFetchTick(t => t + 1); }}
            tintColor="#2563eb"
          />
        }
      >
        {filteredOrders.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="cube-outline" size={56} color="#334155" />
            <Text style={styles.emptyTitle}>No {activeFilter === 'All' ? '' : activeFilter} Orders</Text>
            <Text style={styles.emptySubtitle}>New assignments will appear here automatically.</Text>
          </View>
        ) : (
          filteredOrders.map(order => {
            const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.assigned;
            const action = NEXT_ACTION[order.status];
            const isActing = actionLoading === order.id;
            const timeStr = order.createdAt?.toDate?.()?.toLocaleString('en-IN', {
              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
            }) ?? 'Just now';

            return (
              <TouchableOpacity
                key={order.id}
                style={styles.card}
                onPress={() => navigation.navigate('PickupOrderDetails', { order })}
                activeOpacity={0.85}
              >
                {/* Card Header */}
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardLabel}>Pickup Assignment</Text>
                    <Text style={styles.cardId}>#{order.id.slice(-6).toUpperCase()}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: cfg.bg, borderColor: cfg.color }]}>
                    <Ionicons name={cfg.icon} size={12} color={cfg.color} />
                    <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                </View>

                {/* Agency */}
                <View style={styles.metaRow}>
                  <Ionicons name="business-outline" size={13} color="#64748b" />
                  <Text style={styles.metaText}>{order.agencyName || 'Agency'}</Text>
                  <Ionicons name="calendar-outline" size={13} color="#64748b" style={{ marginLeft: 12 }} />
                  <Text style={styles.metaText}>{timeStr}</Text>
                </View>

                <View style={styles.divider} />

                {/* Stats */}
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Weight</Text>
                    <Text style={styles.statValue}>{order.totalKg} kg</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Payout</Text>
                    <Text style={[styles.statValue, { color: '#60a5fa' }]}>₹{order.estimatedAmount}</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Items</Text>
                    <Text style={styles.statValue}>{order.materials?.length ?? 0}</Text>
                  </View>
                </View>

                {/* Location chip */}
                {order.sellerLatitude && (
                  <TouchableOpacity
                    style={styles.locationChip}
                    onPress={() => navigation.navigate('PickupMapScreen', { order })}
                  >
                    <Ionicons name="navigate-circle-outline" size={14} color="#34d399" />
                    <Text style={styles.locationText}>
                      {order.sellerLatitude.toFixed(4)}, {order.sellerLongitude.toFixed(4)}
                    </Text>
                    <Ionicons name="map-outline" size={13} color="#34d399" />
                    <Text style={styles.locationText}>View Map</Text>
                  </TouchableOpacity>
                )}

                {/* Action Button */}
                {action && (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: action.color }, isActing && { opacity: 0.6 }]}
                    onPress={() => handleAction(order)}
                    disabled={isActing}
                  >
                    {isActing
                      ? <ActivityIndicator size="small" color="#0f172a" />
                      : <Text style={styles.actionBtnText}>{action.label}</Text>
                    }
                  </TouchableOpacity>
                )}

                {order.status === 'completed' && (
                  <View style={styles.completedRow}>
                    <Ionicons name="checkmark-circle" size={16} color="#4ade80" />
                    <Text style={styles.completedText}>Order Completed</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 80 },
  loadingText: { color: '#64748b', fontSize: 15 },
  emptyTitle: { color: '#cbd5e1', fontSize: 20, fontWeight: '700' },
  emptySubtitle: { color: '#64748b', fontSize: 14, textAlign: 'center', paddingHorizontal: 40 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
  },
  headerTitle: { color: '#f1f5f9', fontSize: 24, fontWeight: '800' },
  headerSub: { color: '#64748b', fontSize: 13, marginTop: 2 },
  badge: {
    backgroundColor: '#fbbf24', borderRadius: 20, minWidth: 32, height: 32,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10,
  },
  badgeText: { color: '#0f172a', fontSize: 15, fontWeight: '800' },

  filterRow: { maxHeight: 52, marginBottom: 4 },
  filterTab: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155',
  },
  filterTabActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  filterTabText: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },
  filterTabTextActive: { color: '#fff' },

  listContent: { padding: 16, paddingBottom: 40, gap: 16 },

  card: {
    backgroundColor: '#1e293b', borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: '#334155',
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  cardLabel: { color: '#64748b', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  cardId: { color: '#f1f5f9', fontSize: 20, fontWeight: '800', marginTop: 2 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1,
  },
  statusText: { fontSize: 11, fontWeight: '700' },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 12 },
  metaText: { color: '#64748b', fontSize: 12 },

  divider: { height: 1, backgroundColor: '#334155', marginBottom: 12 },

  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginBottom: 12 },
  statItem: { alignItems: 'center', flex: 1 },
  statLabel: { color: '#64748b', fontSize: 12, marginBottom: 4 },
  statValue: { color: '#f1f5f9', fontSize: 17, fontWeight: '700' },
  statDivider: { width: 1, height: 32, backgroundColor: '#334155' },

  locationChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#0a1f17', borderRadius: 8, paddingHorizontal: 10,
    paddingVertical: 6, marginBottom: 12, borderWidth: 1, borderColor: '#134e35',
  },
  locationText: { color: '#34d399', fontSize: 11, flex: 1 },

  actionBtn: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 12,
  },
  actionBtnText: { color: '#0f172a', fontSize: 15, fontWeight: '800' },

  completedRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10,
  },
  completedText: { color: '#4ade80', fontSize: 14, fontWeight: '700' },
});
