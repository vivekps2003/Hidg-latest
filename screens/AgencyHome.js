import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  Switch, TouchableOpacity, ActivityIndicator, Alert, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAuth } from 'firebase/auth';
import {
  getFirestore, collection, query, where,
  getDocs, doc, getDoc, updateDoc, serverTimestamp,
} from 'firebase/firestore';
import { A, AS, AR } from '../agencyTheme';

const AgencyHome = ({ navigation }) => {
  const [agencyData, setAgencyData] = useState(null);
  const [summary, setSummary] = useState({ total: 0, active: 0, completed: 0, kg: 0, earnings: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const db = getFirestore();
  const auth = getAuth();
  const user = auth.currentUser;

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) setAgencyData(snap.data());
      const ordSnap = await getDocs(query(collection(db, 'orders'), where('agencyId', '==', user.uid)));
      const orders = ordSnap.docs.map(d => d.data());
      const completed = orders.filter(o => o.status === 'completed');
      const active = orders.filter(o => ['accepted', 'assigned', 'in_progress', 'picked'].includes(o.status));
      setSummary({
        total: orders.length, active: active.length, completed: completed.length,
        kg: completed.reduce((s, o) => s + (Number(o.totalKg) || 0), 0),
        earnings: completed.reduce((s, o) => s + (Number(o.estimatedAmount) || 0), 0),
      });
    } catch (e) { console.error(e); }
  }, [user, db]);

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const toggleActive = async (val) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), { isActive: val, updatedAt: serverTimestamp() });
      setAgencyData(prev => ({ ...prev, isActive: val }));
    } catch { Alert.alert('Error', 'Could not update status.'); }
  };

  if (loading) return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={A.bg} />
      <View style={styles.centered}><ActivityIndicator size="large" color={A.primary} /></View>
    </SafeAreaView>
  );

  if (!agencyData) return (
    <SafeAreaView style={styles.container}>
      <View style={styles.centered}><Text style={styles.errorText}>Agency profile not found</Text></View>
    </SafeAreaView>
  );

  const kycStatus = agencyData.kycStatus || 'not_submitted';
  const kycApproved = kycStatus === 'approved';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={A.bg} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={A.primary} colors={[A.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcome}>Welcome back,</Text>
            <Text style={styles.agencyName}>{agencyData.businessName || 'Agency'} 🏢</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(agencyData.businessName || 'A').charAt(0).toUpperCase()}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Banners */}
        {!kycApproved && (
          <View style={styles.warningBanner}>
            <Ionicons name="alert-circle-outline" size={18} color={A.primaryDark} />
            <Text style={styles.warningText}>KYC not approved — limited order access</Text>
          </View>
        )}
        {!agencyData.isActive && (
          <View style={styles.offlineBanner}>
            <Ionicons name="cloud-offline-outline" size={18} color={A.danger} />
            <Text style={styles.offlineText}>Agency is currently offline</Text>
          </View>
        )}

        {/* Earnings Hero */}
        <View style={styles.earningsCard}>
          <View style={styles.earningsLeft}>
            <Text style={styles.earningsLabel}>Total Earnings</Text>
            <Text style={styles.earningsValue}>₹{summary.earnings.toLocaleString('en-IN')}</Text>
            <Text style={styles.earningsSub}>{summary.completed} completed · {summary.kg.toFixed(0)} kg processed</Text>
          </View>
          <View style={styles.earningsIconBox}>
            <Ionicons name="trending-up-outline" size={34} color={A.primaryDark} />
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {[
            { label: 'Total Orders', value: summary.total,     icon: 'cube-outline',             color: A.primary },
            { label: 'Active',       value: summary.active,    icon: 'flash-outline',            color: A.info },
            { label: 'Completed',    value: summary.completed, icon: 'checkmark-circle-outline', color: A.success },
            { label: 'Total kg',     value: `${summary.kg.toFixed(0)}`, icon: 'scale-outline',   color: A.primaryDark },
          ].map((s, i) => (
            <View key={i} style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: s.color + '18' }]}>
                <Ionicons name={s.icon} size={20} color={s.color} />
              </View>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Status Card */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="business-outline" size={18} color={A.primary} />
            <Text style={styles.cardTitle}>Agency Status</Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>KYC Verification</Text>
            <View style={[styles.kycBadge, {
              backgroundColor: kycApproved ? A.successLight : A.primaryLight,
              borderColor: kycApproved ? A.successBorder : A.border,
            }]}>
              <Ionicons
                name={kycApproved ? 'shield-checkmark-outline' : 'time-outline'}
                size={12}
                color={kycApproved ? A.success : A.primaryDark}
              />
              <Text style={[styles.kycText, { color: kycApproved ? A.success : A.primaryDark }]}>
                {kycStatus.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.statusRow}>
            <View>
              <Text style={styles.statusLabel}>Accept Orders</Text>
              <Text style={styles.statusSub}>{agencyData.isActive ? 'Visible to sellers' : 'Hidden from sellers'}</Text>
            </View>
            <Switch
              value={agencyData.isActive}
              onValueChange={toggleActive}
              trackColor={{ false: '#E5E7EB', true: A.primary + '80' }}
              thumbColor={agencyData.isActive ? A.primary : '#9CA3AF'}
            />
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Min Pickup Weight</Text>
            <Text style={styles.statusValue}>{agencyData.minPickupKg || 0} kg</Text>
          </View>

          <View style={[styles.statusRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.statusLabel}>Service Radius</Text>
            <Text style={styles.statusValue}>{agencyData.serviceRadiusKm || 0} km</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="flash-outline" size={18} color={A.primary} />
            <Text style={styles.cardTitle}>Quick Actions</Text>
          </View>
          {[
            { label: 'Manage Rates',    sub: 'Update buying prices',       icon: 'pricetag-outline', color: A.primary,     screen: 'Rates' },
            { label: 'View Orders',     sub: 'Accept or reject requests',  icon: 'list-outline',     color: A.info,        screen: 'Orders' },
            { label: 'Profile Settings',sub: 'Update your information',    icon: 'person-outline',   color: A.primaryDark, screen: 'Profile' },
          ].map((a, i, arr) => (
            <TouchableOpacity
              key={i}
              style={[styles.actionBtn, i === arr.length - 1 && { borderBottomWidth: 0 }]}
              onPress={() => navigation.navigate(a.screen)}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: a.color + '18' }]}>
                <Ionicons name={a.icon} size={20} color={a.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionLabel}>{a.label}</Text>
                <Text style={styles.actionSub}>{a.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={A.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: A.bg },
  scroll: { padding: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: A.danger, fontSize: 16 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  welcome: { fontSize: 13, color: A.textMuted, fontWeight: '500' },
  agencyName: { fontSize: 22, fontWeight: '800', color: A.textPrimary, marginTop: 2 },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: A.primaryLight, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: A.primary,
  },
  avatarText: { fontSize: 18, fontWeight: '800', color: A.primaryDark },

  warningBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: A.primaryLight, borderRadius: AR.md, padding: 12,
    marginBottom: 10, borderWidth: 1, borderColor: A.border,
  },
  warningText: { color: A.primaryDark, fontSize: 13, fontWeight: '600', flex: 1 },
  offlineBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: A.dangerLight, borderRadius: AR.md, padding: 12,
    marginBottom: 10, borderWidth: 1, borderColor: A.dangerBorder,
  },
  offlineText: { color: A.danger, fontSize: 13, fontWeight: '600', flex: 1 },

  earningsCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: A.primaryLight, borderRadius: AR.xl, padding: 20,
    marginBottom: 14, borderWidth: 1.5, borderColor: A.border, ...AS.cardMd,
  },
  earningsLeft: {},
  earningsLabel: { fontSize: 11, color: A.primaryDark, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  earningsValue: { fontSize: 30, fontWeight: '900', color: A.primaryDark, marginBottom: 4 },
  earningsSub: { fontSize: 12, color: A.primaryText, opacity: 0.7 },
  earningsIconBox: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: A.primary + '25', alignItems: 'center', justifyContent: 'center',
  },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  statCard: {
    flex: 1, minWidth: '45%', backgroundColor: A.surface, borderRadius: AR.lg,
    padding: 14, alignItems: 'center', borderWidth: 1, borderColor: A.border, ...AS.card,
  },
  statIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 22, fontWeight: '800', marginBottom: 2 },
  statLabel: { fontSize: 12, color: A.textMuted, textAlign: 'center' },

  card: {
    backgroundColor: A.surface, borderRadius: AR.xl, padding: 16,
    marginBottom: 14, borderWidth: 1, borderColor: A.border, ...AS.card,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: A.textPrimary },

  statusRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: A.border,
  },
  statusLabel: { fontSize: 14, color: A.textSecondary, fontWeight: '500' },
  statusSub: { fontSize: 11, color: A.textMuted, marginTop: 2 },
  statusValue: { fontSize: 14, fontWeight: '700', color: A.primaryDark },
  kycBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1,
  },
  kycText: { fontSize: 11, fontWeight: '700' },

  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: A.border,
  },
  actionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 14, fontWeight: '600', color: A.textPrimary },
  actionSub: { fontSize: 12, color: A.textMuted, marginTop: 1 },
});

export default AgencyHome;
