import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView,
  StatusBar, ActivityIndicator, TouchableOpacity, Dimensions, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { C, S, R } from '../theme';

const { width } = Dimensions.get('window');

const STAT_COLORS = [
  { icon: 'receipt-outline',        color: '#3B82F6', bg: '#EFF6FF' },
  { icon: 'checkmark-circle-outline', color: '#10B981', bg: '#D1FAE5' },
  { icon: 'time-outline',           color: '#F59E0B', bg: '#FEF3C7' },
  { icon: 'close-circle-outline',   color: '#EF4444', bg: '#FEE2E2' },
];

const MAT_COLORS = ['#3B82F6','#10B981','#F59E0B','#8B5CF6','#EF4444','#06B6D4','#F97316','#EC4899'];

export default function SellerAnalytics({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0, rejected: 0, kg: 0, earnings: 0 });
  const [materials, setMaterials] = useState([]);
  const [monthly, setMonthly] = useState([]);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setLoading(false); return; }

    const fetch = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'orders'), where('sellerId', '==', uid), orderBy('createdAt', 'desc')));
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setOrders(data);
        compute(data);
      } catch (e) {
        Alert.alert('Error', e.message);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const compute = (data) => {
    let kg = 0, earnings = 0, pending = 0, completed = 0, rejected = 0;
    const matMap = {}, monthMap = {};

    data.forEach(o => {
      const status = (o.status || '').toLowerCase();
      const oKg = parseFloat(o.totalKg) || 0;
      const amt = parseFloat(o.sellerNetAmount ?? o.estimatedAmount) || 0;
      kg += oKg;

      if (['completed', 'pickedup', 'picked'].includes(status)) { completed++; earnings += amt; }
      else if (status === 'pending' || status === 'pending_pickup') pending++;
      else if (status === 'rejected') rejected++;

      (o.materials || []).forEach(m => {
        const n = m.materialName?.trim() || 'Unknown';
        matMap[n] = (matMap[n] || 0) + (parseFloat(m.quantityKg) || 0);
      });

      if (['completed', 'pickedup', 'picked'].includes(status) && o.createdAt?.toDate) {
        const mk = o.createdAt.toDate().toLocaleString('en-IN', { month: 'short', year: '2-digit' });
        monthMap[mk] = (monthMap[mk] || 0) + amt;
      }
    });

    setStats({ total: data.length, completed, pending, rejected, kg: Math.round(kg * 10) / 10, earnings: Math.round(earnings) });
    setMaterials(Object.entries(matMap).map(([name, kg]) => ({ name, kg: Math.round(kg * 10) / 10 })).sort((a, b) => b.kg - a.kg));
    setMonthly(Object.entries(monthMap).map(([month, amt]) => ({ month, amt: Math.round(amt) })).slice(0, 6).reverse());
  };

  const maxKg = materials.length ? Math.max(...materials.map(m => m.kg)) : 1;
  const maxAmt = monthly.length ? Math.max(...monthly.map(m => m.amt)) : 1;
  const totalMatKg = materials.reduce((s, m) => s + m.kg, 0);

  const STATS = [
    { label: 'Total Orders', value: stats.total, ...STAT_COLORS[0] },
    { label: 'Completed', value: stats.completed, ...STAT_COLORS[1] },
    { label: 'Pending', value: stats.pending, ...STAT_COLORS[2] },
    { label: 'Rejected', value: stats.rejected, ...STAT_COLORS[3] },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analytics</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.centered}>
          <View style={styles.emptyIcon}><Ionicons name="bar-chart-outline" size={40} color={C.textMuted} /></View>
          <Text style={styles.emptyTitle}>No data yet</Text>
          <Text style={styles.emptySub}>Place some orders to see your insights here.</Text>
          <TouchableOpacity style={styles.startBtn} onPress={() => navigation.navigate('SellScrap')}>
            <Text style={styles.startBtnText}>Start Selling</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Earnings Hero */}
          <View style={styles.earningsHero}>
            <View>
              <Text style={styles.earningsLabel}>Total Earnings</Text>
              <Text style={styles.earningsValue}>₹{stats.earnings.toLocaleString('en-IN')}</Text>
              <Text style={styles.earningsSub}>{stats.kg} kg sold across {stats.total} orders</Text>
            </View>
            <View style={styles.earningsIconBox}>
              <Ionicons name="trending-up-outline" size={36} color={C.success} />
            </View>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            {STATS.map((s, i) => (
              <View key={i} style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: s.bg }]}>
                  <Ionicons name={s.icon} size={20} color={s.color} />
                </View>
                <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Order Status Breakdown */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Order Status</Text>
            {[
              { label: 'Completed', val: stats.completed, color: C.success },
              { label: 'Pending', val: stats.pending, color: C.warning },
              { label: 'Rejected', val: stats.rejected, color: C.danger },
            ].map((row, i) => (
              <View key={i} style={styles.statusRow}>
                <View style={styles.statusLeft}>
                  <View style={[styles.statusDot, { backgroundColor: row.color }]} />
                  <Text style={styles.statusLabel}>{row.label}</Text>
                </View>
                <View style={styles.statusBarWrap}>
                  <View style={[styles.statusBar, { width: `${stats.total > 0 ? (row.val / stats.total) * 100 : 0}%`, backgroundColor: row.color }]} />
                </View>
                <Text style={[styles.statusCount, { color: row.color }]}>{row.val}</Text>
              </View>
            ))}
          </View>

          {/* Material Breakdown */}
          {materials.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Material Breakdown</Text>
              <Text style={styles.cardSub}>By weight sold (kg)</Text>

              {materials.slice(0, 8).map((mat, i) => {
                const pct = maxKg > 0 ? (mat.kg / maxKg) * 100 : 0;
                const sharePct = totalMatKg > 0 ? ((mat.kg / totalMatKg) * 100).toFixed(1) : '0';
                const color = MAT_COLORS[i % MAT_COLORS.length];
                return (
                  <View key={i} style={styles.matRow}>
                    <View style={styles.matLeft}>
                      <View style={[styles.matDot, { backgroundColor: color }]} />
                      <View>
                        <Text style={styles.matName}>{mat.name}</Text>
                        <Text style={styles.matKg}>{mat.kg} kg · {sharePct}%</Text>
                      </View>
                    </View>
                    <View style={styles.matBarWrap}>
                      <View style={[styles.matBar, { width: `${Math.max(pct, 4)}%`, backgroundColor: color }]} />
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Monthly Earnings Chart */}
          {monthly.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Monthly Earnings</Text>
              <Text style={styles.cardSub}>From completed orders</Text>

              <View style={styles.chartArea}>
                {monthly.map((m, i) => {
                  const heightPct = maxAmt > 0 ? (m.amt / maxAmt) * 100 : 0;
                  const isMax = m.amt === maxAmt;
                  return (
                    <View key={i} style={styles.barCol}>
                      <Text style={[styles.barAmt, isMax && { color: C.primary, fontWeight: '700' }]}>
                        ₹{m.amt >= 1000 ? `${(m.amt / 1000).toFixed(1)}k` : m.amt}
                      </Text>
                      <View style={styles.barTrack}>
                        <View style={[
                          styles.barFill,
                          { height: `${Math.max(heightPct, 5)}%`, backgroundColor: isMax ? C.primary : C.primary + '50' }
                        ]} />
                      </View>
                      <Text style={[styles.barMonth, isMax && { color: C.primary, fontWeight: '700' }]}>{m.month}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Summary Table */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Summary</Text>
            {[
              { label: 'Total Orders', value: stats.total },
              { label: 'Total Weight Sold', value: `${stats.kg} kg` },
              { label: 'Completed Orders', value: stats.completed },
              { label: 'Success Rate', value: stats.total > 0 ? `${Math.round((stats.completed / stats.total) * 100)}%` : '0%' },
              { label: 'Avg per Order', value: stats.completed > 0 ? `₹${Math.round(stats.earnings / stats.completed).toLocaleString('en-IN')}` : '—' },
              { label: 'Total Earnings', value: `₹${stats.earnings.toLocaleString('en-IN')}`, highlight: true },
            ].map((row, i, arr) => (
              <View key={i} style={[styles.tableRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
                <Text style={styles.tableLabel}>{row.label}</Text>
                <Text style={[styles.tableValue, row.highlight && { color: C.success, fontWeight: '800', fontSize: 16 }]}>
                  {row.value}
                </Text>
              </View>
            ))}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.textPrimary },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
  loadingText: { color: C.textMuted, fontSize: 15 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: C.textPrimary },
  emptySub: { fontSize: 14, color: C.textMuted, textAlign: 'center' },
  startBtn: { backgroundColor: C.primary, borderRadius: R.lg, paddingHorizontal: 28, paddingVertical: 12, marginTop: 4 },
  startBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  scroll: { padding: 16, gap: 16, paddingBottom: 40 },

  earningsHero: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.successLight, borderRadius: R.xl, padding: 20,
    borderWidth: 1, borderColor: C.successBorder, ...S.card,
  },
  earningsLabel: { fontSize: 12, color: C.success, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  earningsValue: { fontSize: 32, fontWeight: '900', color: C.success, marginBottom: 4 },
  earningsSub: { fontSize: 12, color: C.success, opacity: 0.7 },
  earningsIconBox: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.success + '20', alignItems: 'center', justifyContent: 'center' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    flex: 1, minWidth: (width - 52) / 2, backgroundColor: C.surface,
    borderRadius: R.lg, padding: 14, alignItems: 'center',
    borderWidth: 1, borderColor: C.border, ...S.card,
  },
  statIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  statLabel: { fontSize: 12, color: C.textMuted, textAlign: 'center' },

  card: { backgroundColor: C.surface, borderRadius: R.xl, padding: 18, borderWidth: 1, borderColor: C.border, ...S.card },
  cardTitle: { fontSize: 15, fontWeight: '700', color: C.textPrimary, marginBottom: 4 },
  cardSub: { fontSize: 12, color: C.textMuted, marginBottom: 16 },

  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, width: 90 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 13, color: C.textSecondary, fontWeight: '500' },
  statusBarWrap: { flex: 1, height: 8, backgroundColor: C.surfaceAlt, borderRadius: 4, overflow: 'hidden' },
  statusBar: { height: '100%', borderRadius: 4 },
  statusCount: { fontSize: 13, fontWeight: '700', width: 24, textAlign: 'right' },

  matRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  matLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, width: 140 },
  matDot: { width: 10, height: 10, borderRadius: 5 },
  matName: { fontSize: 13, fontWeight: '600', color: C.textPrimary },
  matKg: { fontSize: 11, color: C.textMuted, marginTop: 1 },
  matBarWrap: { flex: 1, height: 8, backgroundColor: C.surfaceAlt, borderRadius: 4, overflow: 'hidden' },
  matBar: { height: '100%', borderRadius: 4 },

  chartArea: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: 180, marginTop: 8 },
  barCol: { alignItems: 'center', flex: 1 },
  barAmt: { fontSize: 10, color: C.textMuted, marginBottom: 4, textAlign: 'center' },
  barTrack: { width: 28, height: 120, backgroundColor: C.surfaceAlt, borderRadius: 8, overflow: 'hidden', justifyContent: 'flex-end', marginBottom: 6 },
  barFill: { width: '100%', borderRadius: 8 },
  barMonth: { fontSize: 10, color: C.textMuted, textAlign: 'center' },

  tableRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.border },
  tableLabel: { fontSize: 14, color: C.textSecondary },
  tableValue: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
});
