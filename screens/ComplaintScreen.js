import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity,
  StatusBar, TextInput, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { C, S, R } from '../theme';

const COMPLAINT_TYPES = [
  { value: 'payment', label: 'Payment Issue', icon: 'wallet-outline', color: '#ef4444' },
  { value: 'weight', label: 'Weight Dispute', icon: 'scale-outline', color: '#f59e0b' },
  { value: 'pickup', label: 'Pickup Problem', icon: 'car-outline', color: '#3b82f6' },
  { value: 'quality', label: 'Material Quality', icon: 'cube-outline', color: '#8b5cf6' },
  { value: 'behavior', label: 'User Behavior', icon: 'people-outline', color: '#ec4899' },
  { value: 'technical', label: 'Technical Issue', icon: 'bug-outline', color: '#10b981' },
  { value: 'other', label: 'Other', icon: 'help-circle-outline', color: '#6b7280' },
];

const STATUS_CONFIG = {
  open: { label: 'Open', color: '#f59e0b', bg: '#fef3c7', icon: 'time-outline' },
  investigating: { label: 'Investigating', color: '#3b82f6', bg: '#dbeafe', icon: 'search-outline' },
  resolved: { label: 'Resolved', color: '#10b981', bg: '#d1fae5', icon: 'checkmark-circle-outline' },
  closed: { label: 'Closed', color: '#6b7280', bg: '#f3f4f6', icon: 'close-circle-outline' },
};

export default function ComplaintScreen({ navigation }) {
  const [showForm, setShowForm] = useState(false);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [selectedType, setSelectedType] = useState('');
  const [orderId, setOrderId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, 'complaints'),
      where('userId', '==', user.uid)
    );

    const unsub = onSnapshot(q, snap => {
      // Sort in memory instead of in query
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime; // desc order
      });
      setComplaints(docs);
      setLoading(false);
    }, err => {
      console.error('Complaints error:', err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleSubmit = async () => {
    if (!selectedType || !title.trim() || !description.trim()) {
      Alert.alert('Required', 'Please fill all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const user = auth.currentUser;
      await addDoc(collection(db, 'complaints'), {
        userId: user.uid,
        userEmail: user.email,
        type: selectedType,
        orderId: orderId.trim() || null,
        title: title.trim(),
        description: description.trim(),
        status: 'open',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      Alert.alert('Success', 'Your complaint has been filed. We will investigate and respond within 24-48 hours.');
      
      // Reset form
      setSelectedType('');
      setOrderId('');
      setTitle('');
      setDescription('');
      setShowForm(false);
    } catch (e) {
      Alert.alert('Error', 'Failed to submit complaint. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderComplaintCard = (complaint) => {
    const typeConfig = COMPLAINT_TYPES.find(t => t.value === complaint.type) || COMPLAINT_TYPES[6];
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
            <Text style={styles.complaintTime}>{timeStr}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <Ionicons name={statusConfig.icon} size={12} color={statusConfig.color} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
          </View>
        </View>
        
        {complaint.orderId && (
          <View style={styles.orderIdChip}>
            <Ionicons name="document-text-outline" size={12} color={C.textMuted} />
            <Text style={styles.orderIdText}>Order: {complaint.orderId.slice(-6).toUpperCase()}</Text>
          </View>
        )}
        
        <Text style={styles.complaintDesc} numberOfLines={2}>{complaint.description}</Text>
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
        <TouchableOpacity onPress={() => setShowForm(true)} style={styles.addBtn}>
          <Ionicons name="add-circle" size={28} color={C.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loadingText}>Loading complaints...</Text>
        </View>
      ) : complaints.length === 0 ? (
        <View style={styles.centered}>
          <View style={styles.emptyIcon}>
            <Ionicons name="shield-checkmark-outline" size={48} color={C.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>No Complaints Filed</Text>
          <Text style={styles.emptySub}>Tap + to file a complaint if you face any issues</Text>
          <TouchableOpacity style={styles.fileBtn} onPress={() => setShowForm(true)}>
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.fileBtnText}>File Complaint</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color={C.info} />
            <Text style={styles.infoText}>
              We investigate all complaints within 24-48 hours. You'll be notified of updates.
            </Text>
          </View>
          {complaints.map(renderComplaintCard)}
        </ScrollView>
      )}

      {/* File Complaint Modal */}
      <Modal visible={showForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>File a Complaint</Text>
              <TouchableOpacity onPress={() => setShowForm(false)}>
                <Ionicons name="close" size={28} color={C.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Complaint Type *</Text>
              <View style={styles.typeGrid}>
                {COMPLAINT_TYPES.map(type => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.typeBtn,
                      selectedType === type.value && { backgroundColor: type.color + '20', borderColor: type.color }
                    ]}
                    onPress={() => setSelectedType(type.value)}
                  >
                    <Ionicons name={type.icon} size={20} color={type.color} />
                    <Text style={[styles.typeText, selectedType === type.value && { color: type.color, fontWeight: '700' }]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Order ID (Optional)</Text>
              <TextInput
                style={styles.input}
                value={orderId}
                onChangeText={setOrderId}
                placeholder="Enter order ID if related to specific order"
                placeholderTextColor={C.textMuted}
              />

              <Text style={styles.inputLabel}>Title *</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Brief summary of the issue"
                placeholderTextColor={C.textMuted}
              />

              <Text style={styles.inputLabel}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Describe your complaint in detail..."
                placeholderTextColor={C.textMuted}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="send" size={18} color="#fff" />
                    <Text style={styles.submitBtnText}>Submit Complaint</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Complaint Details Modal */}
      <Modal visible={!!selectedComplaint} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.detailsModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Complaint Details</Text>
              <TouchableOpacity onPress={() => setSelectedComplaint(null)}>
                <Ionicons name="close" size={28} color={C.textPrimary} />
              </TouchableOpacity>
            </View>

            {selectedComplaint && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Type:</Text>
                  <Text style={styles.detailValue}>
                    {COMPLAINT_TYPES.find(t => t.value === selectedComplaint.type)?.label || 'Other'}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status:</Text>
                  <View style={[styles.statusBadge, { backgroundColor: STATUS_CONFIG[selectedComplaint.status]?.bg }]}>
                    <Text style={[styles.statusText, { color: STATUS_CONFIG[selectedComplaint.status]?.color }]}>
                      {STATUS_CONFIG[selectedComplaint.status]?.label}
                    </Text>
                  </View>
                </View>

                {selectedComplaint.orderId && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Order ID:</Text>
                    <Text style={styles.detailValue}>{selectedComplaint.orderId.slice(-6).toUpperCase()}</Text>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Filed On:</Text>
                  <Text style={styles.detailValue}>
                    {selectedComplaint.createdAt?.toDate?.()?.toLocaleString('en-IN') ?? 'Just now'}
                  </Text>
                </View>

                <View style={styles.divider} />

                <Text style={styles.detailSectionTitle}>Title</Text>
                <Text style={styles.detailText}>{selectedComplaint.title}</Text>

                <Text style={styles.detailSectionTitle}>Description</Text>
                <Text style={styles.detailText}>{selectedComplaint.description}</Text>

                {selectedComplaint.response && (
                  <>
                    <View style={styles.divider} />
                    <Text style={styles.detailSectionTitle}>Admin Response</Text>
                    <View style={styles.responseBox}>
                      <Text style={styles.responseText}>{selectedComplaint.response}</Text>
                    </View>
                  </>
                )}
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
  addBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
  loadingText: { color: C.textMuted, fontSize: 15 },
  emptyIcon: { width: 100, height: 100, borderRadius: 50, backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: C.textPrimary },
  emptySub: { fontSize: 14, color: C.textMuted, textAlign: 'center', marginBottom: 20 },
  fileBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.primary, borderRadius: R.lg, paddingHorizontal: 24, paddingVertical: 12, ...S.btn,
  },
  fileBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  
  list: { padding: 16, paddingBottom: 40 },
  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: C.infoLight, borderRadius: R.md, padding: 12,
    marginBottom: 16, borderWidth: 1, borderColor: C.infoBorder,
  },
  infoText: { flex: 1, fontSize: 13, color: C.info, lineHeight: 18 },
  
  complaintCard: {
    backgroundColor: C.surface, borderRadius: R.lg, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: C.border, ...S.card,
  },
  complaintHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  typeIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  complaintTitle: { fontSize: 15, fontWeight: '700', color: C.textPrimary, marginBottom: 4 },
  complaintTime: { fontSize: 12, color: C.textMuted },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '700' },
  orderIdChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.surfaceAlt, borderRadius: R.sm, paddingHorizontal: 8, paddingVertical: 4,
    alignSelf: 'flex-start', marginBottom: 8,
  },
  orderIdText: { fontSize: 11, color: C.textMuted, fontWeight: '600' },
  complaintDesc: { fontSize: 14, color: C.textSecondary, lineHeight: 20 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, maxHeight: '90%',
  },
  detailsModal: {
    backgroundColor: C.surface, borderRadius: 20,
    padding: 20, margin: 20, maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: C.textPrimary },
  
  inputLabel: { fontSize: 13, fontWeight: '600', color: C.textSecondary, marginBottom: 8, marginTop: 16 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  typeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: R.md,
    backgroundColor: C.surfaceAlt, borderWidth: 1.5, borderColor: C.border,
  },
  typeText: { fontSize: 13, color: C.textSecondary, fontWeight: '600' },
  input: {
    backgroundColor: C.surfaceAlt, borderRadius: R.md, padding: 14,
    fontSize: 15, color: C.textPrimary, borderWidth: 1, borderColor: C.border,
  },
  textArea: { minHeight: 120, paddingTop: 14 },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.danger, borderRadius: R.lg, paddingVertical: 16,
    marginTop: 24, ...S.btn,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  detailLabel: { fontSize: 14, color: C.textMuted, fontWeight: '600' },
  detailValue: { fontSize: 14, color: C.textPrimary, fontWeight: '600' },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 16 },
  detailSectionTitle: { fontSize: 15, fontWeight: '700', color: C.textPrimary, marginBottom: 8 },
  detailText: { fontSize: 14, color: C.textSecondary, lineHeight: 22, marginBottom: 16 },
  responseBox: {
    backgroundColor: C.successLight, borderRadius: R.md, padding: 12,
    borderWidth: 1, borderColor: C.successBorder,
  },
  responseText: { fontSize: 14, color: C.success, lineHeight: 20 },
});
