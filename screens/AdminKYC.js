import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, ActivityIndicator, Alert,
  RefreshControl, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../firebase';
import { collection, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { AD, ADS, ADR } from '../adminTheme';

const KYC_TABS = ['All', 'Pending', 'Approved', 'Rejected'];

export default function AdminKYC() {
  const [users, setUsers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('Pending');
  const [processingId, setProcessingId] = useState(null);

  const fetchUsers = useCallback(async () => {
    try {
      const snap = await getDocs(collection(db, 'users'));
      const data = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(u => ['agency', 'scrap_center'].includes(u.entityType));
      data.sort((a, b) => (b.kycSubmittedAt?.toMillis?.() || 0) - (a.kycSubmittedAt?.toMillis?.() || 0));
      setUsers(data);
    } catch (e) {
      Alert.alert('Error', 'Failed to load KYC data.');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchUsers().finally(() => setLoading(false));
  }, [fetchUsers]);

  useEffect(() => {
    let result = [...users];
    if (activeTab === 'Pending') result = result.filter(u => u.kycStatus === 'pending');
    else if (activeTab === 'Approved') result = result.filter(u => u.kycStatus === 'approved');
    else if (activeTab === 'Rejected') result = result.filter(u => u.kycStatus === 'rejected');
    setFiltered(result);
  }, [users, activeTab]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  }, [fetchUsers]);

  const handleKYC = (user, action) => {
    const isApprove = action === 'approve';
    Alert.alert(
      isApprove ? 'Approve KYC' : 'Reject KYC',
      `${isApprove ? 'Approve' : 'Reject'} KYC for "${user.businessName || user.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isApprove ? 'Approve' : 'Reject',
          style: isApprove ? 'default' : 'destructive',
          onPress: async () => {
            setProcessingId(user.id);
            try {
              const payload = {
                kycStatus: isApprove ? 'approved' : 'rejected',
                kycReviewedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              };
              if (!isApprove) payload.kycRejectionReason = 'Documents not satisfactory. Please resubmit.';
              await updateDoc(doc(db, 'users', user.id), payload);
              setUsers(prev => prev.map(u => u.id === user.id ? { ...u, ...payload } : u));
            } catch { Alert.alert('Error', 'Could not update KYC status.'); }
            finally { setProcessingId(null); }
          },
        },
      ]
    );
  };

  const openDoc = (url) => {
    if (!url) { Alert.alert('Not Available', 'Document not uploaded yet.'); return; }
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open document.'));
  };

  const fmt = (ts) => ts?.toDate?.()?.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) ?? '—';

  const pendingCount = users.filter(u => u.kycStatus === 'pending').length;

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
        <View>
          <Text style={styles.headerTitle}>KYC Review</Text>
          <Text style={styles.headerSub}>{pendingCount > 0 ? `${pendingCount} pending review` : 'All reviewed'}</Text>
        </View>
        {pendingCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{pendingCount}</Text></View>}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabRow} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {KYC_TABS.map(tab => (
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
            <View style={styles.emptyIcon}><Ionicons name="shield-outline" size={36} color={AD.textMuted} /></View>
            <Text style={styles.emptyTitle}>No {activeTab === 'All' ? '' : activeTab} KYC submissions</Text>
          </View>
        ) : (
          filtered.map(user => {
            const kycDocs = user.kycDocuments || {};
            const isPending = user.kycStatus === 'pending';
            const isApproved = user.kycStatus === 'approved';
            const isProcessing = processingId === user.id;

            return (
              <View key={user.id} style={[styles.card, isPending && styles.cardPending]}>
                {/* Header */}
                <View style={styles.cardHeader}>
                  <View style={[styles.avatar, { backgroundColor: isApproved ? AD.successLight : isPending ? AD.warningLight : AD.dangerLight }]}>
                    <Ionicons
                      name={isApproved ? 'shield-checkmark-outline' : isPending ? 'time-outline' : 'shield-outline'}
                      size={22}
                      color={isApproved ? AD.success : isPending ? AD.warning : AD.danger}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bizName}>{user.businessName || user.name || 'Unknown'}</Text>
                    <Text style={styles.userEmail}>{user.email}</Text>
                    <View style={styles.typeRow}>
                      <View style={[styles.typeBadge, { backgroundColor: user.entityType === 'agency' ? AD.warningLight : AD.purpleLight }]}>
                        <Text style={[styles.typeText, { color: user.entityType === 'agency' ? AD.warning : AD.purple }]}>
                          {user.entityType === 'agency' ? 'Agency' : 'Scrap Center'}
                        </Text>
                      </View>
                      <View style={[styles.kycStatusBadge, {
                        backgroundColor: isApproved ? AD.successLight : isPending ? AD.warningLight : AD.dangerLight,
                        borderColor: isApproved ? AD.successBorder : isPending ? AD.warningBorder : AD.dangerBorder,
                      }]}>
                        <Text style={[styles.kycStatusText, { color: isApproved ? AD.success : isPending ? AD.warning : AD.danger }]}>
                          {user.kycStatus?.replace('_', ' ').toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.divider} />

                {/* Business Info */}
                <View style={styles.infoGrid}>
                  {user.gstNumber && (
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>GST Number</Text>
                      <Text style={styles.infoValue}>{user.gstNumber}</Text>
                    </View>
                  )}
                  {user.location && (
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Location</Text>
                      <Text style={styles.infoValue}>{user.location}</Text>
                    </View>
                  )}
                  {user.phone && (
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Phone</Text>
                      <Text style={styles.infoValue}>{user.phone}</Text>
                    </View>
                  )}
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Submitted</Text>
                    <Text style={styles.infoValue}>{fmt(user.kycSubmittedAt)}</Text>
                  </View>
                </View>

                {/* Documents */}
                <View style={styles.docsSection}>
                  <Text style={styles.docsTitle}>Documents</Text>
                  {[
                    { label: 'GST Certificate', url: kycDocs.gstCertificateUrl, icon: 'document-text-outline' },
                    { label: 'Business License', url: kycDocs.businessLicenseUrl, icon: 'document-outline' },
                  ].map((docItem, i) => (
                    <TouchableOpacity key={i} style={[styles.docRow, !docItem.url && styles.docRowDisabled]} onPress={() => openDoc(docItem.url)}>
                      <View style={[styles.docIcon, { backgroundColor: docItem.url ? AD.primaryLight : AD.surfaceAlt }]}>
                        <Ionicons name={docItem.icon} size={16} color={docItem.url ? AD.primary : AD.textMuted} />
                      </View>
                      <Text style={[styles.docLabel, !docItem.url && { color: AD.textMuted }]}>{docItem.label}</Text>
                      {docItem.url
                        ? <><Text style={styles.docUploaded}>Uploaded</Text><Ionicons name="open-outline" size={14} color={AD.primary} /></>
                        : <Text style={styles.docMissing}>Not uploaded</Text>
                      }
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Rejection reason */}
                {user.kycStatus === 'rejected' && user.kycRejectionReason && (
                  <View style={styles.rejectionBox}>
                    <Ionicons name="alert-circle-outline" size={14} color={AD.danger} />
                    <Text style={styles.rejectionText}>{user.kycRejectionReason}</Text>
                  </View>
                )}

                {/* Action Buttons */}
                {isPending && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.rejectBtn, isProcessing && { opacity: 0.6 }]}
                      onPress={() => handleKYC(user, 'reject')}
                      disabled={isProcessing}
                    >
                      {isProcessing ? <ActivityIndicator size="small" color={AD.danger} /> : (
                        <><Ionicons name="close-circle-outline" size={16} color={AD.danger} /><Text style={styles.rejectBtnText}>Reject</Text></>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.approveBtn, isProcessing && { opacity: 0.6 }]}
                      onPress={() => handleKYC(user, 'approve')}
                      disabled={isProcessing}
                    >
                      {isProcessing ? <ActivityIndicator size="small" color="#fff" /> : (
                        <><Ionicons name="shield-checkmark-outline" size={16} color="#fff" /><Text style={styles.approveBtnText}>Approve KYC</Text></>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {isApproved && (
                  <View style={styles.approvedBanner}>
                    <Ionicons name="checkmark-circle" size={16} color={AD.success} />
                    <Text style={styles.approvedText}>KYC Approved · {fmt(user.kycReviewedAt)}</Text>
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

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, backgroundColor: AD.surface, borderBottomWidth: 1, borderBottomColor: AD.border },
  headerTitle: { fontSize: 22, fontWeight: '800', color: AD.textPrimary },
  headerSub: { fontSize: 13, color: AD.textMuted, marginTop: 2 },
  badge: { backgroundColor: AD.warning, borderRadius: 20, minWidth: 32, height: 32, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  badgeText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  tabRow: { maxHeight: 50, backgroundColor: AD.surface, borderBottomWidth: 1, borderBottomColor: AD.border },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginVertical: 8, backgroundColor: AD.surfaceAlt, borderWidth: 1, borderColor: AD.border },
  tabActive: { backgroundColor: AD.primary, borderColor: AD.primary },
  tabText: { color: AD.textSecondary, fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#fff' },

  list: { padding: 16, gap: 14, paddingBottom: 40 },
  emptyBox: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: AD.primaryLight, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: AD.textMuted },

  card: { backgroundColor: AD.surface, borderRadius: ADR.xl, padding: 16, borderWidth: 1, borderColor: AD.border, ...ADS.card },
  cardPending: { borderColor: AD.warningBorder, borderWidth: 1.5 },
  cardHeader: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  bizName: { fontSize: 16, fontWeight: '700', color: AD.textPrimary, marginBottom: 2 },
  userEmail: { fontSize: 12, color: AD.textMuted, marginBottom: 6 },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  typeText: { fontSize: 10, fontWeight: '700' },
  kycStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  kycStatusText: { fontSize: 10, fontWeight: '700' },

  divider: { height: 1, backgroundColor: AD.border, marginBottom: 12 },

  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  infoItem: { minWidth: '45%', flex: 1 },
  infoLabel: { fontSize: 10, color: AD.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 },
  infoValue: { fontSize: 13, fontWeight: '600', color: AD.textPrimary },

  docsSection: { backgroundColor: AD.surfaceAlt, borderRadius: ADR.md, padding: 12, marginBottom: 12 },
  docsTitle: { fontSize: 11, fontWeight: '700', color: AD.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: AD.border },
  docRowDisabled: { opacity: 0.6 },
  docIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  docLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: AD.textPrimary },
  docUploaded: { fontSize: 12, color: AD.success, fontWeight: '600', marginRight: 4 },
  docMissing: { fontSize: 12, color: AD.textMuted },

  rejectionBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: AD.dangerLight, borderRadius: ADR.sm, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: AD.dangerBorder },
  rejectionText: { flex: 1, color: AD.danger, fontSize: 12 },

  actionRow: { flexDirection: 'row', gap: 10 },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: AD.dangerLight, borderRadius: ADR.md, paddingVertical: 12, borderWidth: 1, borderColor: AD.dangerBorder },
  rejectBtnText: { color: AD.danger, fontSize: 14, fontWeight: '700' },
  approveBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: AD.success, borderRadius: ADR.md, paddingVertical: 12, ...ADS.btn },
  approveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  approvedBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: AD.successLight, borderRadius: ADR.md, padding: 12, borderWidth: 1, borderColor: AD.successBorder },
  approvedText: { color: AD.success, fontSize: 13, fontWeight: '600' },
});
