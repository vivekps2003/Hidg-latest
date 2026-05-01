import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../firebase';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { AD, ADS, ADR } from '../adminTheme';
import NotificationBell from '../components/NotificationBell';

export default function AdminDashboard({ navigation }) {
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const [usersSnap, ordersSnap, ratesSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'orders')),
        getDocs(collection(db, 'scrap_rates')),
      ]);

      const users = usersSnap.docs.map(d => d.data());
      const orders = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const byRole = (role) => users.filter(u => u.entityType === role).length;
      const byStatus = (s) => orders.filter(o => o.status === s).length;
      const pendingKyc = users.filter(u => u.kycStatus === 'pending').length;
      const totalRevenue = orders.filter(o => o.status === 'completed').reduce((s, o) => s + (o.estimatedAmount || 0), 0);

      setStats({
        totalUsers: users.length,
        sellers: byRole('individual') + byRole('shop') + byRole('mall') + byRole('supermarket') + byRole('industry'),
        agencies: byRole('agency'),
        pickupAgents: byRole('pickup_agent'),
        scrapCenters: byRole('scrap_center'),
        totalOrders: orders.length,
        pendingOrders: byStatus('pending') + byStatus('pending_pickup'),
        completedOrders: byStatus('completed'),
        rejectedOrders: byStatus('rejected'),
        activeOrders: orders.filter(o => ['accepted', 'assigned', 'in_progress', 'picked'].includes(o.status)).length,
        pendingKyc,
        totalRevenue,
        totalRates: ratesSnap.size,
      });

      // Recent 5 orders
      const sorted = [...orders].sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setRecentOrders(sorted.slice(0, 5));
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to load dashboard data.');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchStats().finally(() => setLoading(false));
  }, [fetchStats]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  }, [fetchStats]);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Sign out of admin?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => { await signOut(auth); navigation.replace('Login'); } },
    ]);
  };

  const ORDER_STATUS_COLOR = {
    pending: { bg: AD.warningLight, text: AD.warning },
    pending_pickup: { bg: AD.purpleLight, text: AD.purple },
    accepted: { bg: AD.infoLight, text: AD.info },
    assigned: { bg: AD.purpleLight, text: AD.purple },
    in_progress: { bg: AD.purpleLight, text: AD.purple },
    picked: { bg: AD.successLight, text: AD.success },
    completed: { bg: AD.successLight, text: AD.success },
    rejected: { bg: AD.dangerLight, text: AD.danger },
  };

  if (loading) return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={AD.bg} />
      <View style={styles.centered}><ActivityIndicator size="large" color={AD.primary} /></View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={AD.bg} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AD.primary} colors={[AD.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Admin Dashboard</Text>
            <Text style={styles.headerSub}>HidG Platform Overview</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <NotificationBell navigation={navigation} iconColor={AD.textPrimary} iconSize={22} />
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color={AD.danger} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Revenue Hero */}
        <View style={styles.revenueCard}>
          <View>
            <Text style={styles.revenueLabel}>Platform Revenue</Text>
            <Text style={styles.revenueValue}>₹{stats?.totalRevenue?.toLocaleString('en-IN') || '0'}</Text>
            <Text style={styles.revenueSub}>From {stats?.completedOrders || 0} completed orders</Text>
          </View>
          <View style={styles.revenueIcon}>
            <Ionicons name="trending-up-outline" size={36} color={AD.primaryDark} />
          </View>
        </View>

        {/* KYC Alert */}
        {stats?.pendingKyc > 0 && (
          <TouchableOpacity style={styles.kycAlert} onPress={() => navigation.navigate('KYC')}>
            <View style={styles.kycAlertLeft}>
              <Ionicons name="alert-circle-outline" size={20} color={AD.warning} />
              <Text style={styles.kycAlertText}>{stats.pendingKyc} KYC verification{stats.pendingKyc > 1 ? 's' : ''} pending review</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={AD.warning} />
          </TouchableOpacity>
        )}

        {/* User Stats */}
        <Text style={styles.sectionTitle}>Users</Text>
        <View style={styles.statsGrid}>
          {[
            { label: 'Total Users',    value: stats?.totalUsers,    icon: 'people-outline',   color: AD.primary,  bg: AD.primaryLight },
            { label: 'Sellers',        value: stats?.sellers,       icon: 'person-outline',   color: AD.info,     bg: AD.infoLight },
            { label: 'Agencies',       value: stats?.agencies,      icon: 'business-outline', color: AD.warning,  bg: AD.warningLight },
            { label: 'Pickup Agents',  value: stats?.pickupAgents,  icon: 'bicycle-outline',  color: AD.success,  bg: AD.successLight },
          ].map((s, i) => (
            <View key={i} style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: s.bg }]}>
                <Ionicons name={s.icon} size={20} color={s.color} />
              </View>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value ?? '—'}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Order Stats */}
        <Text style={styles.sectionTitle}>Orders</Text>
        <View style={styles.statsGrid}>
          {[
            { label: 'Total',     value: stats?.totalOrders,     icon: 'cube-outline',             color: AD.primary, bg: AD.primaryLight },
            { label: 'Pending',   value: stats?.pendingOrders,   icon: 'time-outline',             color: AD.warning, bg: AD.warningLight },
            { label: 'Active',    value: stats?.activeOrders,    icon: 'flash-outline',            color: AD.purple,  bg: AD.purpleLight },
            { label: 'Completed', value: stats?.completedOrders, icon: 'checkmark-circle-outline', color: AD.success, bg: AD.successLight },
          ].map((s, i) => (
            <View key={i} style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: s.bg }]}>
                <Ionicons name={s.icon} size={20} color={s.color} />
              </View>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value ?? '—'}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {[
            { label: 'Manage Users',   icon: 'people-outline',   color: AD.primary,  bg: AD.primaryLight, tab: 'Users' },
            { label: 'View Orders',    icon: 'list-outline',     color: AD.info,     bg: AD.infoLight,    tab: 'Orders' },
            { label: 'KYC Review',     icon: 'shield-outline',   color: AD.warning,  bg: AD.warningLight, tab: 'KYC' },
            { label: 'Scrap Rates',    icon: 'pricetag-outline', color: AD.success,  bg: AD.successLight, tab: 'Users' },
          ].map((a, i) => (
            <TouchableOpacity key={i} style={styles.actionCard} onPress={() => navigation.navigate(a.tab)} activeOpacity={0.8}>
              <View style={[styles.actionIcon, { backgroundColor: a.bg }]}>
                <Ionicons name={a.icon} size={22} color={a.color} />
              </View>
              <Text style={styles.actionLabel}>{a.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={AD.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Orders */}
        <Text style={styles.sectionTitle}>Recent Orders</Text>
        <View style={styles.card}>
          {recentOrders.length === 0
            ? <Text style={styles.emptyText}>No orders yet</Text>
            : recentOrders.map((order, i) => {
              const st = ORDER_STATUS_COLOR[order.status] || ORDER_STATUS_COLOR.pending;
              return (
                <View key={order.id} style={[styles.orderRow, i === recentOrders.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.orderIdText}>#{order.id.slice(-6).toUpperCase()}</Text>
                    <Text style={styles.orderMeta}>{order.agencyName || 'Agency'} · {order.totalKg} kg</Text>
                  </View>
                  <View>
                    <View style={[styles.orderStatusBadge, { backgroundColor: st.bg }]}>
                      <Text style={[styles.orderStatusText, { color: st.text }]}>{order.status?.replace('_', ' ').toUpperCase()}</Text>
                    </View>
                    <Text style={styles.orderAmt}>₹{order.estimatedAmount?.toLocaleString('en-IN')}</Text>
                  </View>
                </View>
              );
            })
          }
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AD.bg },
  scroll: { padding: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: '900', color: AD.textPrimary },
  headerSub: { fontSize: 13, color: AD.textMuted, marginTop: 2 },
  logoutBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: AD.dangerLight, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: AD.dangerBorder },

  revenueCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: AD.primaryLight, borderRadius: ADR.xl, padding: 20,
    marginBottom: 14, borderWidth: 1.5, borderColor: AD.border, ...ADS.cardMd,
  },
  revenueLabel: { fontSize: 11, color: AD.primaryDark, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  revenueValue: { fontSize: 32, fontWeight: '900', color: AD.primaryDark, marginBottom: 4 },
  revenueSub: { fontSize: 12, color: AD.primaryText, opacity: 0.7 },
  revenueIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: AD.primary + '20', alignItems: 'center', justifyContent: 'center' },

  kycAlert: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: AD.warningLight, borderRadius: ADR.lg, padding: 14,
    marginBottom: 14, borderWidth: 1, borderColor: AD.warningBorder,
  },
  kycAlertLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  kycAlertText: { color: AD.warning, fontSize: 13, fontWeight: '600', flex: 1 },

  sectionTitle: { fontSize: 14, fontWeight: '700', color: AD.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10, marginTop: 4 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: AD.surface, borderRadius: ADR.lg, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: AD.border, ...ADS.card },
  statIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 24, fontWeight: '800', marginBottom: 2 },
  statLabel: { fontSize: 12, color: AD.textMuted, textAlign: 'center' },

  actionsGrid: { gap: 10, marginBottom: 14 },
  actionCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: AD.surface, borderRadius: ADR.lg, padding: 14, borderWidth: 1, borderColor: AD.border, ...ADS.card },
  actionIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: AD.textPrimary },

  card: { backgroundColor: AD.surface, borderRadius: ADR.xl, padding: 16, borderWidth: 1, borderColor: AD.border, ...ADS.card, marginBottom: 14 },
  emptyText: { color: AD.textMuted, fontSize: 14, textAlign: 'center', paddingVertical: 16 },
  orderRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: AD.border },
  orderIdText: { fontSize: 14, fontWeight: '700', color: AD.textPrimary },
  orderMeta: { fontSize: 12, color: AD.textMuted, marginTop: 2 },
  orderStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, alignSelf: 'flex-end', marginBottom: 2 },
  orderStatusText: { fontSize: 10, fontWeight: '700' },
  orderAmt: { fontSize: 13, fontWeight: '700', color: AD.primary, textAlign: 'right' },
});
