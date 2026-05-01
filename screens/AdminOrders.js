import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, ActivityIndicator, Alert,
  TextInput, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../firebase';
import { collection, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { AD, ADS, ADR } from '../adminTheme';
import NotificationBell from '../components/NotificationBell';

const STATUS_TABS = ['All', 'Pending', 'Active', 'Completed', 'Rejected'];

const STATUS_CONFIG = {
  pending:        { label: 'Pending',       color: AD.warning, bg: AD.warningLight, border: AD.warningBorder },
  pending_pickup: { label: 'Pickup Req',    color: AD.purple,  bg: AD.purpleLight,  border: AD.purpleBorder },
  accepted:       { label: 'Accepted',      color: AD.info,    bg: AD.infoLight,    border: AD.infoBorder },
  assigned:       { label: 'Assigned',      color: AD.purple,  bg: AD.purpleLight,  border: AD.purpleBorder },
  in_progress:    { label: 'In Progress',   color: AD.purple,  bg: AD.purpleLight,  border: AD.purpleBorder },
  picked:         { label: 'Picked Up',     color: AD.success, bg: AD.successLight, border: AD.successBorder },
  completed:      { label: 'Completed',     color: AD.success, bg: AD.successLight, border: AD.successBorder },
  rejected:       { label: 'Rejected',      color: AD.danger,  bg: AD.dangerLight,  border: AD.dangerBorder },
};

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('All');
  const [search, setSearch] = useState('');

  const fetchOrders = useCallback(async () => {
    try {
      const snap = await getDocs(collection(db, 'orders'));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setOrders(data);
    } catch (e) {
      Alert.alert('Error', 'Failed to load orders.');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchOrders().finally(() => setLoading(false));
  }, [fetchOrders]);

  useEffect(() => {
    let result = [...orders];
    if (activeTab === 'Pending') result = result.filter(o => ['pending', 'pending_pickup'].includes(o.status));
    else if (activeTab === 'Active') result = result.filter(o => ['accepted', 'assigned', 'in_progress', 'picked'].includes(o.status));
    else if (activeTab === 'Completed') result = result.filter(o => o.status === 'completed');
    else if (activeTab === 'Rejected') result = result.filter(o => o.status === 'rejected');
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(o => o.id.toLowerCase().includes(q) || o.agencyName?.toLowerCase().includes(q) || o.sellerId?.toLowerCase().includes(q));
    }
    setFiltered(result);
  }, [orders, activeTab, search]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  }, [fetchOrders]);

  const forceComplete = (order) => {
    Alert.alert('Force Complete', `Mark order #${order.id.slice(-6).toUpperCase()} as completed?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Complete',
        onPress: async () => {
          try {
            await updateDoc(doc(db, 'orders', order.id), { status: 'completed', completedAt: serverTimestamp(), updatedAt: serverTimestamp() });
            setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'completed' } : o));
          } catch { Alert.alert('Error', 'Could not update order.'); }
        },
      },
    ]);
  };

  const forceReject = (order) => {
    Alert.alert('Force Reject', `Reject order #${order.id.slice(-6).toUpperCase()}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject', style: 'destructive',
        onPress: async () => {
          try {
            await updateDoc(doc(db, 'orders', order.id), { status: 'rejected', rejectedAt: serverTimestamp(), updatedAt: serverTimestamp() });
            setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'rejected' } : o));
          } catch { Alert.alert('Error', 'Could not update order.'); }
        },
      },
    ]);
  };

  const fmt = (ts) => ts?.toDate?.()?.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) ?? '—';

  if (loading) return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={AD.bg} />
      <View style={styles.centered}><ActivityIndicator size="large" color={AD.primary} /></View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={AD.bg} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Orders</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={styles.countBadge}><Text style={styles.countText}>{filtered.length}</Text></View>
          <NotificationBell navigation={navigation} iconColor={AD.textPrimary} iconSize={22} />
        </View>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={17} color={AD.textMuted} style={{ marginRight: 8 }} />
        <TextInput style={styles.searchInput} value={search} onChangeText={setSearch} placeholder="Search order ID or agency..." placeholderTextColor={AD.textMuted} />
        {search.length > 0 && <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={17} color={AD.textMuted} /></TouchableOpacity>}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabRow} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {STATUS_TABS.map(tab => (
          <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AD.primary} colors={[AD.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIcon}><Ionicons name="cube-outline" size={36} color={AD.textMuted} /></View>
            <Text style={styles.emptyTitle}>No orders found</Text>
          </View>
        ) : (
          filtered.map(order => {
            const st = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
            const isTerminal = ['completed', 'rejected'].includes(order.status);
            return (
              <View key={order.id} style={styles.card}>
                {/* Header */}
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.orderId}>#{order.id.slice(-6).toUpperCase()}</Text>
                    <Text style={styles.orderTime}>{fmt(order.createdAt)}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: st.bg, borderColor: st.border }]}>
                    <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
                  </View>
                </View>

                {/* Details */}
                <View style={styles.detailsGrid}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Agency</Text>
                    <Text style={styles.detailValue} numberOfLines={1}>{order.agencyName || '—'}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Weight</Text>
                    <Text style={styles.detailValue}>{order.totalKg} kg</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Amount</Text>
                    <Text style={[styles.detailValue, { color: AD.primary }]}>₹{order.estimatedAmount?.toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Materials</Text>
                    <Text style={styles.detailValue}>{order.materials?.length || 0} items</Text>
                  </View>
                </View>

                {/* Pickup agent */}
                {order.pickupAgentName && (
                  <View style={styles.agentRow}>
                    <Ionicons name="bicycle-outline" size={13} color={AD.success} />
                    <Text style={styles.agentText}>Agent: {order.pickupAgentName} · ₹{order.commissionPerKg}/kg</Text>
                  </View>
                )}

                {/* Below minimum */}
                {order.belowMinimum && (
                  <View style={styles.belowRow}>
                    <Ionicons name="alert-circle-outline" size={13} color={AD.warning} />
                    <Text style={styles.belowText}>Below minimum ({order.minPickupKg} kg)</Text>
                  </View>
                )}

                {/* Admin Actions */}
                {!isTerminal && (
                  <View style={styles.adminActions}>
                    <TouchableOpacity style={styles.completeBtn} onPress={() => forceComplete(order)}>
                      <Ionicons name="checkmark-circle-outline" size={15} color={AD.success} />
                      <Text style={styles.completeBtnText}>Force Complete</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.rejectBtn} onPress={() => forceReject(order)}>
                      <Ionicons name="close-circle-outline" size={15} color={AD.danger} />
                      <Text style={styles.rejectBtnText}>Force Reject</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AD.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, backgroundColor: AD.surface, borderBottomWidth: 1, borderBottomColor: AD.border },
  headerTitle: { fontSize: 22, fontWeight: '800', color: AD.textPrimary, flex: 1 },
  countBadge: { backgroundColor: AD.primaryLight, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: AD.border },
  countText: { color: AD.primaryDark, fontSize: 13, fontWeight: '700' },

  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: AD.surface, margin: 16, borderRadius: ADR.lg, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: AD.border, ...ADS.card },
  searchInput: { flex: 1, fontSize: 14, color: AD.textPrimary },

  tabRow: { maxHeight: 50, backgroundColor: AD.surface, borderBottomWidth: 1, borderBottomColor: AD.border, paddingVertical: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, marginHorizontal: 4, backgroundColor: AD.surfaceAlt, borderWidth: 1, borderColor: AD.border },
  tabActive: { backgroundColor: AD.primary, borderColor: AD.primary },
  tabText: { color: AD.textSecondary, fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#fff' },

  list: { padding: 16, paddingBottom: 40 },
  emptyBox: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: AD.primaryLight, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: AD.textMuted },

  card: { backgroundColor: AD.surface, borderRadius: ADR.xl, padding: 16, borderWidth: 1, borderColor: AD.border, ...ADS.card, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  orderId: { fontSize: 17, fontWeight: '800', color: AD.textPrimary },
  orderTime: { fontSize: 11, color: AD.textMuted, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: '700' },

  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10, marginHorizontal: -5 },
  detailItem: { width: '48%', margin: 5 },
  detailLabel: { fontSize: 11, color: AD.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 },
  detailValue: { fontSize: 14, fontWeight: '600', color: AD.textPrimary },

  agentRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: AD.successLight, borderRadius: ADR.sm, padding: 8, marginBottom: 8, borderWidth: 1, borderColor: AD.successBorder },
  agentText: { color: AD.success, fontSize: 12, fontWeight: '600' },
  belowRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: AD.warningLight, borderRadius: ADR.sm, padding: 8, marginBottom: 8, borderWidth: 1, borderColor: AD.warningBorder },
  belowText: { color: AD.warning, fontSize: 12, fontWeight: '600' },

  adminActions: { flexDirection: 'row', marginTop: 4, marginHorizontal: -5 },
  completeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: AD.successLight, borderRadius: ADR.md, paddingVertical: 9, borderWidth: 1, borderColor: AD.successBorder, margin: 5 },
  completeBtnText: { color: AD.success, fontSize: 13, fontWeight: '600' },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: AD.dangerLight, borderRadius: ADR.md, paddingVertical: 9, borderWidth: 1, borderColor: AD.dangerBorder, margin: 5 },
  rejectBtnText: { color: AD.danger, fontSize: 13, fontWeight: '600' },
});
