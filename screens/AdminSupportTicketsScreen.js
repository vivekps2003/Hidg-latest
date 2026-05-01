import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity,
  StatusBar, ActivityIndicator, Modal, TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { C, S, R } from '../theme';

const STATUS_CONFIG = {
  open: { label: 'Open', color: '#f59e0b', bg: '#fef3c7', icon: 'time-outline' },
  in_progress: { label: 'In Progress', color: '#3b82f6', bg: '#dbeafe', icon: 'sync-outline' },
  resolved: { label: 'Resolved', color: '#10b981', bg: '#d1fae5', icon: 'checkmark-circle-outline' },
  closed: { label: 'Closed', color: '#6b7280', bg: '#f3f4f6', icon: 'close-circle-outline' },
};

export default function AdminSupportTicketsScreen({ navigation }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [response, setResponse] = useState('');
  const [updating, setUpdating] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    const q = query(collection(db, 'support_tickets'), orderBy('createdAt', 'desc'));
    
    const unsub = onSnapshot(q, snap => {
      setTickets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, err => {
      console.error('Tickets error:', err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleUpdateStatus = async (ticketId, newStatus) => {
    try {
      await updateDoc(doc(db, 'support_tickets', ticketId), {
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
      await updateDoc(doc(db, 'support_tickets', selectedTicket.id), {
        response: response.trim(),
        status: 'resolved',
        respondedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      Alert.alert('Success', 'Response sent to user');
      setResponse('');
      setSelectedTicket(null);
    } catch (e) {
      Alert.alert('Error', 'Failed to send response');
    } finally {
      setUpdating(false);
    }
  };

  const filteredTickets = filterStatus === 'all' 
    ? tickets 
    : tickets.filter(t => t.status === filterStatus);

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
  };

  const renderTicket = (ticket) => {
    const statusConfig = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
    const timeStr = ticket.createdAt?.toDate?.()?.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    }) ?? 'Just now';

    return (
      <TouchableOpacity
        key={ticket.id}
        style={styles.ticketCard}
        onPress={() => setSelectedTicket(ticket)}
      >
        <View style={styles.ticketHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.ticketSubject}>{ticket.subject}</Text>
            <Text style={styles.ticketUser}>{ticket.userEmail}</Text>
            <Text style={styles.ticketTime}>{timeStr}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <Ionicons name={statusConfig.icon} size={12} color={statusConfig.color} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
          </View>
        </View>
        
        <Text style={styles.ticketMessage} numberOfLines={2}>{ticket.message}</Text>
        
        {ticket.response && (
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
        <Text style={styles.headerTitle}>Support Tickets</Text>
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
          <Text style={[styles.statNumber, { color: '#3b82f6' }]}>{stats.in_progress}</Text>
          <Text style={styles.statLabel}>In Progress</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: '#10b981' }]}>{stats.resolved}</Text>
          <Text style={styles.statLabel}>Resolved</Text>
        </View>
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {['all', 'open', 'in_progress', 'resolved', 'closed'].map(status => (
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

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : filteredTickets.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="mail-open-outline" size={48} color={C.textMuted} />
          <Text style={styles.emptyTitle}>No Tickets</Text>
          <Text style={styles.emptySub}>
            {filterStatus === 'all' ? 'No support tickets yet' : `No ${filterStatus} tickets`}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {filteredTickets.map(renderTicket)}
        </ScrollView>
      )}

      {/* Ticket Details Modal */}
      <Modal visible={!!selectedTicket} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ticket Details</Text>
              <TouchableOpacity onPress={() => setSelectedTicket(null)}>
                <Ionicons name="close" size={28} color={C.textPrimary} />
              </TouchableOpacity>
            </View>

            {selectedTicket && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* User Info */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>User Email</Text>
                  <Text style={styles.detailValue}>{selectedTicket.userEmail}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Subject</Text>
                  <Text style={styles.detailValue}>{selectedTicket.subject}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Message</Text>
                  <Text style={styles.detailMessage}>{selectedTicket.message}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Submitted</Text>
                  <Text style={styles.detailValue}>
                    {selectedTicket.createdAt?.toDate?.()?.toLocaleString('en-IN') ?? 'Just now'}
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
                          selectedTicket.status === status && styles.statusUpdateBtnActive
                        ]}
                        onPress={() => handleUpdateStatus(selectedTicket.id, status)}
                      >
                        <Text style={[styles.statusUpdateText, { color: STATUS_CONFIG[status].color }]}>
                          {STATUS_CONFIG[status].label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Previous Response */}
                {selectedTicket.response && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Previous Response</Text>
                    <View style={styles.responseBox}>
                      <Text style={styles.responseText}>{selectedTicket.response}</Text>
                    </View>
                  </View>
                )}

                {/* Response Input */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>
                    {selectedTicket.response ? 'Update Response' : 'Send Response'}
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
  
  filterRow: { maxHeight: 52, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
  filterBtn: {
    paddingHorizontal: 16, paddingVertical: 10, marginHorizontal: 4, marginVertical: 8,
    borderRadius: 20, backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border,
  },
  filterBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  filterText: { fontSize: 13, fontWeight: '600', color: C.textSecondary },
  filterTextActive: { color: '#fff' },
  
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.textPrimary },
  emptySub: { fontSize: 14, color: C.textMuted, textAlign: 'center' },
  
  list: { padding: 16, paddingBottom: 40 },
  ticketCard: {
    backgroundColor: C.surface, borderRadius: R.lg, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: C.border, ...S.card,
  },
  ticketHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  ticketSubject: { fontSize: 15, fontWeight: '700', color: C.textPrimary, marginBottom: 4 },
  ticketUser: { fontSize: 13, color: C.textMuted, marginBottom: 2 },
  ticketTime: { fontSize: 12, color: C.textMuted },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '700' },
  ticketMessage: { fontSize: 14, color: C.textSecondary, lineHeight: 20, marginBottom: 8 },
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
