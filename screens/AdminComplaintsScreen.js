import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity,
  StatusBar, ActivityIndicator, Modal, TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { C, S, R } from '../theme';

const COMPLAINT_TYPES = {
  payment: { label: 'Payment Issue', icon: 'wallet-outline', color: '#ef4444' },
  weight: { label: 'Weight Dispute', icon: 'scale-outline', color: '#f59e0b' },
  pickup: { label: 'Pickup Problem', icon: 'car-outline', color: '#3b82f6' },
  quality: { label: 'Material Quality', icon: 'cube-outline', color: '#8b5cf6' },
  behavior: { label: 'User Behavior', icon: 'people-outline', color: '#ec4899' },
  technical: { label: 'Technical Issue', icon: 'bug-outline', color: '#10b981' },
  other: { label: 'Other', icon: 'help-circle-outline', color: '#6b7280' },
};

const STATUS_CONFIG = {
  open: { label: 'Open', color: '#f59e0b', bg: '#fef3c7', icon: 'time-outline' },
  investigating: { label: 'Investigating', color: '#3b82f6', bg: '#dbeafe', icon: 'search-outline' },
  resolved: { label: 'Resolved', color: '#10b981', bg: '#d1fae5', icon: 'checkmark-circle-outline' },
  closed: { label: 'Closed', color: '#6b7280', bg: '#f3f4f6', icon: 'close-circle-outline' },
};

export default function AdminComplaintsScreen({ navigation }) {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [response, setResponse] = useState('');
  const [updating, setUpdating] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    const q = query(collection(db, 'complaints'), orderBy('createdAt', 'desc'));
    
    const unsub = onSnapshot(q, snap => {
      setComplaints(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, err => {
      console.error('Complaints error:', err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleUpdateStatus = async (complaintId, newStatus) => {
    try {
      await updateDoc(doc(db, 'complaints', complaintId), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      Alert.alert('Success', 'Status updated');
    } catch (e) {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const handleSendResponse = async () => {
    if (!response.trim()) {
      Alert.alert('Required', 'Please enter a response');
      return;
    }

    setUpdating(true);
    try {
      await updateDoc(doc(db, 'complaints', selectedComplaint.id), {
        response: response.trim(),
        status: 'resolved',
        respondedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      Alert.alert('Success', 'Response sent to user');
      setResponse('');
      setSelectedComplaint(null);
    } catch (e) {
      Alert.alert('Error', 'Failed to send response');
    } finally {
      setUpdating(false);
    }
  };

  const filteredComplaints = complaints.filter(c => {
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    if (filterType !== 'all' && c.type !== filterType) return false;
    return true;
  });

  const stats = {
    total: complaints.length,
    open: complaints.filter(c => c.status === 'open').length,
    investigating: complaints.filter(c => c.status === 'investigating').length,
    resolved: complaints.filter(c => c.status === 'resolved').length,
  };

  const renderComplaint = (complaint) => {
    const typeConfig = COMPLAINT_TYPES[complaint.type] || COMPLAINT_TYPES.other;
    const statusConfig = STATUS_CONFIG[complaint.status] || STATUS_CONFIG.open;
    const timeStr = complaint.createdAt?.toDate?.()?.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    }) ?? 'Just now';

    return (
      <TouchableOpacity
        key={complaint.id}
        style={styles.complaintCard}
        onPress={() => setSelectedComplaint(complaint)}
      >
        <View style={styles.complaintHeader}>
          <View style={[styles.typeIcon, { backgroundColor: typeConfig.color + '20' }]}>
            <Ionicons name={typeConfig.icon} size={20} color={typeConfig.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.complaintTitle}>{complaint.title}</Text>
            <Text style={styles.complaintUser}>{complaint.userEmail}</Text>
            <Text style={styles.complaintTime}>{timeStr}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <Ionicons name={statusConfig.icon} size={12} color={statusConfig.color} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
          </View>
        </View>
        
        {complaint.orderId && (
          <View style={styles.orderChip}>
            <Ionicons name="document-text-outline" size={12} color={C.textMuted} />
            <Text style={styles.orderText}>Order: {complaint.orderId.slice(-6).toUpperCase()}</Text>
          </View>
        )}
        
        <Text style={styles.complaintDesc} numberOfLines={2}>{complaint.description}</Text>
        
        {complaint.response && (
          <View style={styles.responseIndicator}>
            <Ionicons name="checkmark-done" size={14} color={C.success} />
            <Text style={styles.responseIndicatorText}>Response sent</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Complaints</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: '#f59e0b' }]}>{stats.open}</Text>
          <Text style={styles.statLabel}>Open</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: '#3b82f6' }]}>{stats.investigating}</Text>
          <Text style={styles.statLabel}>Investigating</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: '#10b981' }]}>{stats.resolved}</Text>
          <Text style={styles.statLabel}>Resolved</Text>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          <Text style={styles.filterLabel}>Status:</Text>
          {['all', 'open', 'investigating', 'resolved', 'closed'].map(status => (
            <TouchableOpacity
              key={status}
              style={[styles.filterBtn, filterStatus === status && styles.filterBtnActive]}
              onPress={() => setFilterStatus(status)}
            >
              <Text style={[styles.filterText, filterStatus === status && styles.filterTextActive]}>
                {status === 'all' ? 'All' : STATUS_CONFIG[status]?.label || status}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          <Text style={styles.filterLabel}>Type:</Text>
          {['all', ...Object.keys(COMPLAINT_TYPES)].map(type => (
            <TouchableOpacity
              key={type}
              style={[styles.filterBtn, filterType === type && styles.filterBtnActive]}
              onPress={() => setFilterType(type)}
            >
              <Text style={[styles.filterText, filterType === type && styles.filterTextActive]}>
                {type === 'all' ? 'All' : COMPLAINT_TYPES[type]?.label || type}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : filteredComplaints.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="shield-checkmark-outline" size={48} color={C.textMuted} />
          <Text style={styles.emptyTitle}>No Complaints</Text>
          <Text style={styles.emptySub}>No complaints match your filters</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {filteredComplaints.map(renderComplaint)}
        </ScrollView>
      )}

      {/* Complaint Details Modal */}
      <Modal visible={!!selectedComplaint} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Complaint Details</Text>
              <TouchableOpacity onPress={() => setSelectedComplaint(null)}>
                <Ionicons name="close" size={28} color={C.textPrimary} />
              </TouchableOpacity>
            </View>

            {selectedComplaint && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Type Badge */}
                <View style={[styles.typeBadge, { backgroundColor: COMPLAINT_TYPES[selectedComplaint.type]?.color + '20' }]}>
                  <Ionicons 
                    name={COMPLAINT_TYPES[selectedComplaint.type]?.icon} 
                    size={20} 
                    color={COMPLAINT_TYPES[selectedComplaint.type]?.color} 
                  />
                  <Text style={[styles.typeBadgeText, { color: COMPLAINT_TYPES[selectedComplaint.type]?.color }]}>
                    {COMPLAINT_TYPES[selectedComplaint.type]?.label}
                  </Text>
                </View>

                {/* User Info */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>User Email</Text>
                  <Text style={styles.detailValue}>{selectedComplaint.userEmail}</Text>
                </View>

                {selectedComplaint.orderId && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Order ID</Text>
                    <Text style={styles.detailValue}>{selectedComplaint.orderId.slice(-6).toUpperCase()}</Text>
                  </View>
                )}

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Title</Text>
                  <Text style={styles.detailValue}>{selectedComplaint.title}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Description</Text>
                  <Text style={styles.detailMessage}>{selectedComplaint.description}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Filed On</Text>
                  <Text style={styles.detailValue}>
                    {selectedComplaint.createdAt?.toDate?.()?.toLocaleString('en-IN') ?? 'Just now'}
                  </Text>
                </View>

                {/* Status Update */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Update Status</Text>
                  <View style={styles.statusButtons}>
                    {Object.keys(STATUS_CONFIG).map(status => (
                      <TouchableOpacity
                        key={status}
                        style={[
                          styles.statusUpdateBtn,
                          { backgroundColor: STATUS_CONFIG[status].bg },
                          selectedComplaint.status === status && styles.statusUpdateBtnActive
                        ]}
                        onPress={() => handleUpdateStatus(selectedComplaint.id, status)}
                      >
                        <Text style={[styles.statusUpdateText, { color: STATUS_CONFIG[status].color }]}>
                          {STATUS_CONFIG[status].label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Previous Response */}
                {selectedComplaint.response && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Previous Response</Text>
                    <View style={styles.responseBox}>
                      <Text style={styles.responseText}>{selectedComplaint.response}</Text>
                    </View>
                  </View>
                )}

                {/* Response Input */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>
                    {selectedComplaint.response ? 'Update Response' : 'Send Response'}
                  </Text>
                  <TextInput
                    style={styles.responseInput}
                    value={response}
                    onChangeText={setResponse}
                    placeholder="Type your response here..."
                    placeholderTextColor={C.textMuted}
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                  />
                  <TouchableOpacity
                    style={[styles.sendBtn, updating && { opacity: 0.6 }]}
                    onPress={handleSendResponse}
                    disabled={updating}
                  >
                    {updating ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="send" size={18} color="#fff" />
                        <Text style={styles.sendBtnText}>Send Response</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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
  
  statsRow: {
    flexDirection: 'row', padding: 16, gap: 12,
    backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 24, fontWeight: '800', color: C.textPrimary },
  statLabel: { fontSize: 11, color: C.textMuted, marginTop: 4 },
  
  filtersContainer: { backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
  filterRow: { maxHeight: 52, paddingHorizontal: 16 },
  filterLabel: { fontSize: 12, fontWeight: '700', color: C.textMuted, paddingVertical: 12, marginRight: 8 },
  filterBtn: {
    paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, marginVertical: 8,
    borderRadius: 20, backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border,
  },
  filterBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  filterText: { fontSize: 12, fontWeight: '600', color: C.textSecondary },
  filterTextActive: { color: '#fff' },
  
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.textPrimary },
  emptySub: { fontSize: 14, color: C.textMuted, textAlign: 'center' },
  
  list: { padding: 16, paddingBottom: 40 },
  complaintCard: {
    backgroundColor: C.surface, borderRadius: R.lg, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: C.border, ...S.card,
  },
  complaintHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  typeIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  complaintTitle: { fontSize: 15, fontWeight: '700', color: C.textPrimary, marginBottom: 4 },
  complaintUser: { fontSize: 13, color: C.textMuted, marginBottom: 2 },
  complaintTime: { fontSize: 12, color: C.textMuted },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '700' },
  orderChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.surfaceAlt, borderRadius: R.sm, paddingHorizontal: 8, paddingVertical: 4,
    alignSelf: 'flex-start', marginBottom: 8,
  },
  orderText: { fontSize: 11, color: C.textMuted, fontWeight: '600' },
  complaintDesc: { fontSize: 14, color: C.textSecondary, lineHeight: 20, marginBottom: 8 },
  responseIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  responseIndicatorText: { fontSize: 12, color: C.success, fontWeight: '600' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: C.textPrimary },
  
  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: R.md, padding: 12, marginBottom: 20,
  },
  typeBadgeText: { fontSize: 15, fontWeight: '700' },
  
  detailSection: { marginBottom: 20 },
  detailLabel: { fontSize: 13, fontWeight: '700', color: C.textMuted, marginBottom: 8, textTransform: 'uppercase' },
  detailValue: { fontSize: 15, color: C.textPrimary, fontWeight: '600' },
  detailMessage: { fontSize: 15, color: C.textSecondary, lineHeight: 22 },
  
  statusButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusUpdateBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: R.md,
    borderWidth: 2, borderColor: 'transparent',
  },
  statusUpdateBtnActive: { borderColor: C.primary },
  statusUpdateText: { fontSize: 13, fontWeight: '700' },
  
  responseBox: {
    backgroundColor: C.successLight, borderRadius: R.md, padding: 12,
    borderWidth: 1, borderColor: C.successBorder,
  },
  responseText: { fontSize: 14, color: C.success, lineHeight: 20 },
  
  responseInput: {
    backgroundColor: C.surfaceAlt, borderRadius: R.md, padding: 14,
    fontSize: 15, color: C.textPrimary, borderWidth: 1, borderColor: C.border,
    minHeight: 120, marginBottom: 12,
  },
  sendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.success, borderRadius: R.lg, paddingVertical: 14, ...S.btn,
  },
  sendBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
