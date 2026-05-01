import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, ActivityIndicator, Alert,
  TextInput, RefreshControl, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { AD, ADS, ADR } from '../adminTheme';
import NotificationBell from '../components/NotificationBell';

const ROLE_TABS = ['All', 'Sellers', 'Agencies', 'Pickup', 'Scrap Center'];

const ROLE_CONFIG = {
  individual:   { label: 'Individual',    color: AD.info,    bg: AD.infoLight },
  shop:         { label: 'Shop',          color: AD.info,    bg: AD.infoLight },
  mall:         { label: 'Mall',          color: AD.info,    bg: AD.infoLight },
  supermarket:  { label: 'Supermarket',   color: AD.info,    bg: AD.infoLight },
  industry:     { label: 'Industry',      color: AD.info,    bg: AD.infoLight },
  agency:       { label: 'Agency',        color: AD.warning, bg: AD.warningLight },
  pickup_agent: { label: 'Pickup Agent',  color: AD.success, bg: AD.successLight },
  scrap_center: { label: 'Scrap Center',  color: AD.purple,  bg: AD.purpleLight },
};

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('All');
  const [search, setSearch] = useState('');
  const [togglingId, setTogglingId] = useState(null);

  const fetchUsers = useCallback(async () => {
    try {
      const snap = await getDocs(collection(db, 'users'));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setUsers(data);
    } catch (e) {
      Alert.alert('Error', 'Failed to load users.');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchUsers().finally(() => setLoading(false));
  }, [fetchUsers]);

  useEffect(() => {
    let result = [...users];
    if (activeTab === 'Sellers') result = result.filter(u => ['individual', 'shop', 'mall', 'supermarket', 'industry'].includes(u.entityType));
    else if (activeTab === 'Agencies') result = result.filter(u => u.entityType === 'agency');
    else if (activeTab === 'Pickup') result = result.filter(u => u.entityType === 'pickup_agent');
    else if (activeTab === 'Scrap Center') result = result.filter(u => u.entityType === 'scrap_center');
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(u => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.businessName?.toLowerCase().includes(q) || u.phone?.includes(q));
    }
    setFiltered(result);
  }, [users, activeTab, search]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  }, [fetchUsers]);

  const toggleActive = async (user) => {
    setTogglingId(user.id);
    try {
      await updateDoc(doc(db, 'users', user.id), { isActive: !user.isActive, updatedAt: serverTimestamp() });
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isActive: !u.isActive } : u));
    } catch { Alert.alert('Error', 'Could not update status.'); }
    finally { setTogglingId(null); }
  };

  const deleteUser = (user) => {
    Alert.alert(
      'Delete User',
      `Delete "${user.name || user.email}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'users', user.id));
              setUsers(prev => prev.filter(u => u.id !== user.id));
            } catch { Alert.alert('Error', 'Could not delete user.'); }
          },
        },
      ]
    );
  };

  const fmt = (ts) => ts?.toDate?.()?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) ?? '—';

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
        <Text style={styles.headerTitle}>Users</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={styles.countBadge}><Text style={styles.countText}>{filtered.length}</Text></View>
          <NotificationBell navigation={navigation} iconColor={AD.textPrimary} iconSize={22} />
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={17} color={AD.textMuted} style={{ marginRight: 8 }} />
        <TextInput style={styles.searchInput} value={search} onChangeText={setSearch} placeholder="Search name, email, phone..." placeholderTextColor={AD.textMuted} />
        {search.length > 0 && <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={17} color={AD.textMuted} /></TouchableOpacity>}
      </View>

      {/* Role Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabRow} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {ROLE_TABS.map(tab => (
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
            <View style={styles.emptyIcon}><Ionicons name="people-outline" size={36} color={AD.textMuted} /></View>
            <Text style={styles.emptyTitle}>No users found</Text>
          </View>
        ) : (
          filtered.map(user => {
            const rc = ROLE_CONFIG[user.entityType] || { label: user.entityType, color: AD.textMuted, bg: AD.surfaceAlt };
            return (
              <View key={user.id} style={styles.card}>
                <View style={styles.cardTop}>
                  {/* Avatar */}
                  <View style={[styles.avatar, { backgroundColor: rc.bg }]}>
                    <Text style={[styles.avatarText, { color: rc.color }]}>{(user.name || user.email || 'U').charAt(0).toUpperCase()}</Text>
                  </View>

                  {/* Info */}
                  <View style={{ flex: 1 }}>
                    <View style={styles.nameRow}>
                      <Text style={styles.userName} numberOfLines={1}>{user.name || 'No name'}</Text>
                      <View style={[styles.roleBadge, { backgroundColor: rc.bg }]}>
                        <Text style={[styles.roleText, { color: rc.color }]}>{rc.label}</Text>
                      </View>
                    </View>
                    <Text style={styles.userEmail} numberOfLines={1}>{user.email}</Text>
                    {user.phone && <Text style={styles.userPhone}>{user.phone}</Text>}
                    {user.businessName && <Text style={styles.userBiz} numberOfLines={1}>🏢 {user.businessName}</Text>}
                    <Text style={styles.userDate}>Joined {fmt(user.createdAt)}</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                {/* KYC */}
                {user.kycStatus && (
                  <View style={styles.kycRow}>
                    <Text style={styles.kycLabel}>KYC</Text>
                    <View style={[styles.kycBadge, {
                      backgroundColor: user.kycStatus === 'approved' ? AD.successLight : user.kycStatus === 'pending' ? AD.warningLight : AD.dangerLight,
                      borderColor: user.kycStatus === 'approved' ? AD.successBorder : user.kycStatus === 'pending' ? AD.warningBorder : AD.dangerBorder,
                    }]}>
                      <Text style={[styles.kycBadgeText, { color: user.kycStatus === 'approved' ? AD.success : user.kycStatus === 'pending' ? AD.warning : AD.danger }]}>
                        {user.kycStatus.replace('_', ' ').toUpperCase()}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Actions */}
                <View style={styles.actionsRow}>
                  {user.isActive !== undefined && (
                    <View style={styles.toggleRow}>
                      <Text style={styles.toggleLabel}>{user.isActive ? 'Active' : 'Inactive'}</Text>
                      <Switch
                        value={user.isActive}
                        onValueChange={() => toggleActive(user)}
                        disabled={togglingId === user.id}
                        trackColor={{ false: '#E5E7EB', true: AD.success + '80' }}
                        thumbColor={user.isActive ? AD.success : '#9CA3AF'}
                      />
                    </View>
                  )}
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteUser(user)}>
                    <Ionicons name="trash-outline" size={16} color={AD.danger} />
                    <Text style={styles.deleteBtnText}>Delete</Text>
                  </TouchableOpacity>
                </View>
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
  cardTop: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontWeight: '800' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' },
  userName: { fontSize: 15, fontWeight: '700', color: AD.textPrimary, flex: 1 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  roleText: { fontSize: 10, fontWeight: '700' },
  userEmail: { fontSize: 12, color: AD.textMuted, marginBottom: 2 },
  userPhone: { fontSize: 12, color: AD.textMuted, marginBottom: 2 },
  userBiz: { fontSize: 12, color: AD.textSecondary, marginBottom: 2 },
  userDate: { fontSize: 11, color: AD.textMuted },

  divider: { height: 1, backgroundColor: AD.border, marginBottom: 10 },

  kycRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  kycLabel: { fontSize: 13, color: AD.textSecondary, fontWeight: '500' },
  kycBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  kycBadgeText: { fontSize: 11, fontWeight: '700' },

  actionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggleLabel: { fontSize: 13, color: AD.textSecondary, fontWeight: '500' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: AD.dangerLight, borderRadius: ADR.md, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: AD.dangerBorder },
  deleteBtnText: { color: AD.danger, fontSize: 13, fontWeight: '600' },
});
