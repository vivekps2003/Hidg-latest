import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc, orderBy, limit } from 'firebase/firestore';
import { C, S, R } from '../theme';

const getDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 999;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const STATUS = {
  pending:        { label: 'Pending',    bg: '#FEF3C7', text: '#92400E' },
  pending_pickup: { label: 'Pickup Req', bg: '#EDE9FE', text: '#5B21B6' },
  accepted:       { label: 'Accepted',   bg: '#DBEAFE', text: '#1E40AF' },
  assigned:       { label: 'Assigned',   bg: '#EDE9FE', text: '#5B21B6' },
  in_progress:    { label: 'In Transit', bg: '#CFFAFE', text: '#155E75' },
  picked:         { label: 'Picked Up',  bg: '#D1FAE5', text: '#065F46' },
  completed:      { label: 'Completed',  bg: '#D1FAE5', text: '#065F46' },
  rejected:       { label: 'Rejected',   bg: '#FEE2E2', text: '#991B1B' },
};

export default function SellerHome({ navigation }) {
  const [seller, setSeller] = useState({ name: '', location: '' });
  const [agencies, setAgencies] = useState([]);
  const [nearestAgency, setNearestAgency] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      if (!auth.currentUser) return;
      try {
        const uid = auth.currentUser.uid;
        const userDoc = await getDoc(doc(db, 'users', uid));
        let sellerLat, sellerLon;
        if (userDoc.exists()) {
          const d = userDoc.data();
          sellerLat = d.latitude; sellerLon = d.longitude;
          setSeller({ name: d.name || 'Seller', location: d.location || '', latitude: d.latitude, longitude: d.longitude });
        }
        const agSnap = await getDocs(query(collection(db, 'users'), where('entityType', '==', 'agency'), where('isActive', '==', true)));
        const ratesSnap = await getDocs(collection(db, 'scrap_rates'));
        const ratesByAgency = {};
        ratesSnap.docs.forEach(d => {
          const r = d.data();
          if (!ratesByAgency[r.agencyId]) ratesByAgency[r.agencyId] = [];
          ratesByAgency[r.agencyId].push(r);
        });
        const list = agSnap.docs.map(d => ({
          id: d.id, ...d.data(),
          rates: ratesByAgency[d.id] || [],
          distance: getDistance(sellerLat, sellerLon, d.data().latitude, d.data().longitude),
        })).sort((a, b) => a.distance - b.distance);
        setAgencies(list);
        setNearestAgency(list[0] || null);
        const ordSnap = await getDocs(query(collection(db, 'orders'), where('sellerId', '==', uid), orderBy('createdAt', 'desc'), limit(5)));
        setRecentOrders(ordSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const getPrice = (mat) => {
    const r = nearestAgency?.rates?.find(r => r.materialName?.toLowerCase() === mat.toLowerCase());
    return r ? `₹${parseFloat(r.pricePerKg).toFixed(0)}` : '—';
  };

  if (loading) return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <View style={styles.centered}><ActivityIndicator size="large" color={C.primary} /><Text style={styles.loadingText}>Loading...</Text></View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcome}>Good day,</Text>
            <Text style={styles.name}>{seller.name} 👋</Text>
          </View>
          <TouchableOpacity style={styles.profileBtn} onPress={() => navigation.navigate('Profile')}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(seller.name || 'S').charAt(0).toUpperCase()}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.sellBtn} onPress={() => navigation.navigate('SellScrap')} activeOpacity={0.85}>
            <View style={styles.sellBtnInner}>
              <View style={styles.sellBtnIcon}><Ionicons name="storefront-outline" size={22} color="#fff" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sellBtnTitle}>Sell Scrap</Text>
                <Text style={styles.sellBtnSub}>Browse agencies & rates</Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color="rgba(255,255,255,0.7)" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.scanBtn} onPress={() => navigation.navigate('Scan')} activeOpacity={0.85}>
            <View style={styles.scanBtnIcon}><Ionicons name="scan-circle-outline" size={24} color={C.success} /></View>
            <Text style={styles.scanBtnTitle}>AI Scan</Text>
            <Text style={styles.scanBtnSub}>Identify waste</Text>
          </TouchableOpacity>
        </View>

        {/* Live Prices */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Live Rates {nearestAgency ? `· ${nearestAgency.businessName}` : ''}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
            {[
              { name: 'Cardboard', icon: 'cube-outline', color: '#F59E0B' },
              { name: 'Iron', icon: 'hammer-outline', color: '#6B7280' },
              { name: 'Plastic', icon: 'water-outline', color: '#10B981' },
              { name: 'Copper', icon: 'flash-outline', color: '#F97316' },
              { name: 'Aluminium', icon: 'flash-outline', color: '#3B82F6' },
            ].map((m, i) => (
              <View key={i} style={styles.priceCard}>
                <View style={[styles.priceIcon, { backgroundColor: m.color + '15' }]}>
                  <Ionicons name={m.icon} size={20} color={m.color} />
                </View>
                <Text style={styles.priceMat}>{m.name}</Text>
                <Text style={styles.priceVal}>{getPrice(m.name)}</Text>
                <Text style={styles.priceUnit}>/ kg</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Nearby Agencies */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nearby Agencies</Text>
          {agencies.length === 0
            ? <Text style={styles.emptyText}>No active agencies found</Text>
            : agencies.slice(0, 3).map((ag, i) => (
              <TouchableOpacity key={i} style={styles.agencyCard} onPress={() => navigation.navigate('CreateOrder', { agency: ag })} activeOpacity={0.8}>
                <View style={styles.agencyLeft}>
                  <View style={styles.agencyIconBox}><Ionicons name="business-outline" size={18} color={C.primary} /></View>
                  <View>
                    <Text style={styles.agencyName}>{ag.businessName || 'Agency'}</Text>
                    <Text style={styles.agencyDist}>
                      {ag.distance < 999 ? `${ag.distance.toFixed(1)} km away` : ag.location || 'Nearby'}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
              </TouchableOpacity>
            ))
          }
        </View>

        {/* Recent Orders */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Recent Orders</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Orders')}>
              <Text style={styles.viewAll}>View all</Text>
            </TouchableOpacity>
          </View>
          {recentOrders.length === 0
            ? <Text style={styles.emptyText}>No orders yet. Start selling!</Text>
            : recentOrders.map(order => {
              const st = STATUS[order.status] || STATUS.pending;
              return (
                <View key={order.id} style={styles.orderCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.orderMat}>{order.materials?.[0]?.materialName || 'Multiple'}</Text>
                    <Text style={styles.orderKg}>{order.totalKg?.toFixed(1)} kg · {order.agencyName}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                      <Text style={[styles.statusText, { color: st.text }]}>{st.label}</Text>
                    </View>
                    <Text style={styles.orderAmt}>₹{order.estimatedAmount?.toLocaleString('en-IN')}</Text>
                  </View>
                </View>
              );
            })
          }
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 12 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: C.textMuted, fontSize: 15 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  welcome: { fontSize: 13, color: C.textMuted, fontWeight: '500' },
  name: { fontSize: 22, fontWeight: '800', color: C.textPrimary, marginTop: 2 },
  profileBtn: {},
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.primary },
  avatarText: { fontSize: 18, fontWeight: '800', color: C.primary },

  actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  sellBtn: { flex: 2, backgroundColor: C.primary, borderRadius: R.xl, padding: 16, ...S.btn },
  sellBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sellBtnIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  sellBtnTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  sellBtnSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 },
  scanBtn: { flex: 1, backgroundColor: C.successLight, borderRadius: R.xl, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: C.successBorder, ...S.card },
  scanBtnIcon: { marginBottom: 6 },
  scanBtnTitle: { color: C.success, fontSize: 13, fontWeight: '700' },
  scanBtnSub: { color: C.success, fontSize: 10, opacity: 0.7, marginTop: 2 },

  section: { marginBottom: 28 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: C.textPrimary },
  viewAll: { fontSize: 13, color: C.primary, fontWeight: '600' },
  emptyText: { color: C.textMuted, fontSize: 14, fontStyle: 'italic', marginTop: 8 },

  priceCard: {
    backgroundColor: C.surface, borderRadius: R.lg, padding: 14, marginRight: 12,
    alignItems: 'center', width: 100, borderWidth: 1, borderColor: C.border, ...S.card,
  },
  priceIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  priceMat: { fontSize: 12, fontWeight: '600', color: C.textSecondary, marginBottom: 4, textAlign: 'center' },
  priceVal: { fontSize: 18, fontWeight: '800', color: C.textPrimary },
  priceUnit: { fontSize: 11, color: C.textMuted },

  agencyCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.surface, borderRadius: R.lg, padding: 14, marginTop: 10,
    borderWidth: 1, borderColor: C.border, ...S.card,
  },
  agencyLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  agencyIconBox: { width: 38, height: 38, borderRadius: 10, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center' },
  agencyName: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
  agencyDist: { fontSize: 12, color: C.textMuted, marginTop: 2 },

  orderCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.surface, borderRadius: R.lg, padding: 14, marginTop: 10,
    borderWidth: 1, borderColor: C.border, ...S.card,
  },
  orderMat: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
  orderKg: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700' },
  orderAmt: { fontSize: 14, fontWeight: '700', color: C.primary },
});
