import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { P, PS, PR, STATUS, NEXT_ACTION } from '../pickupTheme';
import NotificationBell from '../components/NotificationBell';

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
    const q = query(collection(db, 'orders'), where('pickupAgentId', '==', uid), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false); setRefreshing(false);
    }, err => { Alert.alert('Error', err.message); setLoading(false); setRefreshing(false); });
    return () => unsub();
  }, [fetchTick]);

  const handleAction = useCallback(async (order) => {
    const action = NEXT_ACTION[order.status];
    if (!action) return;
    Alert.alert(action.label, `Confirm "${action.label}" for order #${order.id.slice(-6).toUpperCase()}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          setActionLoading(order.id);
          try {
            await updateDoc(doc(db, 'orders', order.id), {
              status: action.next, updatedAt: serverTimestamp(),
              ...(action.next === 'in_progress' && { tripStartedAt: serverTimestamp() }),
              ...(action.next === 'picked' && { pickedUpAt: serverTimestamp() }),
              ...(action.next === 'completed' && { completedAt: serverTimestamp() }),
            });
          } catch (e) {
            Alert.alert('Error', e.code === 'permission-denied' ? 'Permission denied.' : 'Could not update. Try again.');
          } finally { setActionLoading(null); }
        },
      },
    ]);
  }, []);

  const filtered = orders.filter(o => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Assigned') return o.status === 'assigned';
    if (activeFilter === 'Active') return ['accepted', 'in_progress', 'picked'].includes(o.status);
    if (activeFilter === 'Completed') return o.status === 'completed';
    return true;
  });

  const assignedCount = orders.filter(o => o.status === 'assigned').length;

  if (loading) return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={P.bg} />
      <View style={styles.centered}><ActivityIndicator size="large" color={P.primary} /><Text style={styles.loadingText}>Loading...</Text></View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={P.bg} />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Pickups</Text>
          <Text style={styles.headerSub}>{assignedCount > 0 ? `${assignedCount} new assignment${assignedCount > 1 ? 's' : ''}` : 'All caught up ✓'}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {assignedCount > 0 && (
            <View style={styles.badge}><Text style={styles.badgeText}>{assignedCount}</Text></View>
          )}
          <NotificationBell navigation={navigation} iconColor={P.textPrimary} iconSize={22} />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {FILTER_TABS.map(tab => (
          <TouchableOpacity key={tab} style={[styles.filterTab, activeFilter === tab && styles.filterTabActive]} onPress={() => setActiveFilter(tab)}>
            <Text style={[styles.filterTabText, activeFilter === tab && styles.filterTabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setFetchTick(t => t + 1); }} tintColor={P.primary} colors={[P.primary]} />}
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIcon}><Ionicons name="cube-outline" size={36} color={P.textMuted} /></View>
            <Text style={styles.emptyTitle}>No {activeFilter === 'All' ? '' : activeFilter} Orders</Text>
            <Text style={styles.emptySub}>New assignments will appear here automatically.</Text>
          </View>
        ) : (
          filtered.map(order => {
            const st = STATUS[order.status] || STATUS.assigned;
            const action = NEXT_ACTION[order.status];
            const isActing = actionLoading === order.id;
            const timeStr = order.createdAt?.toDate?.()?.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) ?? 'Just now';

            return (
              <TouchableOpacity key={order.id} style={styles.card} onPress={() => navigation.navigate('PickupOrderDetails', { order })} activeOpacity={0.85}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardLabel}>Pickup Assignment</Text>
                    <Text style={styles.cardId}>#{order.id.slice(-6).toUpperCase()}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: st.bg, borderColor: st.border }]}>
                    <Ionicons name={st.icon} size={12} color={st.color} />
                    <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <Ionicons name="business-outline" size={13} color={P.textMuted} />
                  <Text style={styles.metaText}>{order.agencyName || 'Agency'}</Text>
                  <Ionicons name="calendar-outline" size={13} color={P.textMuted} style={{ marginLeft: 10 }} />
                  <Text style={styles.metaText}>{timeStr}</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.statsRow}>
                  {[
                    { label: 'Weight', value: `${order.totalKg} kg` },
                    { label: 'Commission', value: `₹${order.totalCommission || order.estimatedAmount}`, color: P.primary },
                    { label: 'Items', value: `${order.materials?.length ?? 0}` },
                  ].map((s, i, arr) => (
                    <React.Fragment key={i}>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>{s.label}</Text>
                        <Text style={[styles.statValue, s.color && { color: s.color }]}>{s.value}</Text>
                      </View>
                      {i < arr.length - 1 && <View style={styles.statDivider} />}
                    </React.Fragment>
                  ))}
                </View>

                {order.sellerLatitude && (
                  <TouchableOpacity style={styles.locationChip} onPress={() => navigation.navigate('PickupMapScreen', { order })}>
                    <Ionicons name="location-outline" size={13} color={P.primary} />
                    <Text style={styles.locationText}>{order.sellerLatitude.toFixed(4)}, {order.sellerLongitude.toFixed(4)}</Text>
                    <Ionicons name="map-outline" size={13} color={P.primary} />
                    <Text style={[styles.locationText, { fontWeight: '600' }]}>View Map</Text>
                  </TouchableOpacity>
                )}

                {action && (
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: action.color }, isActing && { opacity: 0.6 }]} onPress={() => handleAction(order)} disabled={isActing}>
                    {isActing ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.actionBtnText}>{action.label}</Text>}
                  </TouchableOpacity>
                )}

                {order.status === 'completed' && (
                  <View style={styles.completedRow}>
                    <Ionicons name="checkmark-circle" size={16} color={P.primary} />
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
  container: { flex: 1, backgroundColor: P.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: P.textMuted, fontSize: 15 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
    backgroundColor: P.surface, borderBottomWidth: 1, borderBottomColor: P.border,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: P.textPrimary },
  headerSub: { fontSize: 13, color: P.textMuted, marginTop: 2 },
  badge: { backgroundColor: P.primary, borderRadius: 20, minWidth: 32, height: 32, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  badgeText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  filterRow: { maxHeight: 52, backgroundColor: P.surface, borderBottomWidth: 1, borderBottomColor: P.border },
  filterTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginVertical: 8, backgroundColor: P.surfaceAlt, borderWidth: 1, borderColor: P.border },
  filterTabActive: { backgroundColor: P.primary, borderColor: P.primary },
  filterTabText: { color: P.textSecondary, fontSize: 13, fontWeight: '600' },
  filterTabTextActive: { color: '#fff' },

  list: { padding: 16, gap: 14, paddingBottom: 40 },
  emptyBox: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: P.primaryLight, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: P.textPrimary },
  emptySub: { fontSize: 14, color: P.textMuted, textAlign: 'center', paddingHorizontal: 40 },

  card: { backgroundColor: P.surface, borderRadius: PR.xl, padding: 16, borderWidth: 1, borderColor: P.border, ...PS.card },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  cardLabel: { fontSize: 11, color: P.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
  cardId: { fontSize: 20, fontWeight: '800', color: P.textPrimary, marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: '700' },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10 },
  metaText: { color: P.textMuted, fontSize: 12 },
  divider: { height: 1, backgroundColor: P.border, marginBottom: 12 },

  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginBottom: 12 },
  statItem: { alignItems: 'center', flex: 1 },
  statLabel: { color: P.textMuted, fontSize: 11, marginBottom: 4 },
  statValue: { color: P.textPrimary, fontSize: 16, fontWeight: '700' },
  statDivider: { width: 1, height: 30, backgroundColor: P.border },

  locationChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: P.primaryLight, borderRadius: PR.sm, paddingHorizontal: 10, paddingVertical: 7, marginBottom: 10, borderWidth: 1, borderColor: P.border },
  locationText: { color: P.primaryDark, fontSize: 11, flex: 1 },

  actionBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderRadius: PR.md, ...PS.btn },
  actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  completedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, backgroundColor: P.primaryLight, borderRadius: PR.md, borderWidth: 1, borderColor: P.border },
  completedText: { color: P.primaryDark, fontSize: 14, fontWeight: '700' },
});
