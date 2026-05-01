import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, SafeAreaView,
  StatusBar, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore';
import { C, S, R } from '../theme';
import { sendNotification, NotificationTemplates } from '../notificationHelper';
import NotificationBell from '../components/NotificationBell';

const STATUS = {
  pending:            { label: 'Pending',            bg: '#FEF3C7', text: '#92400E', icon: 'time-outline' },
  pending_pickup:     { label: 'Pickup Req',         bg: '#EDE9FE', text: '#5B21B6', icon: 'bicycle-outline' },
  accepted:           { label: 'Accepted',           bg: '#DBEAFE', text: '#1E40AF', icon: 'checkmark-circle-outline' },
  commission_pending: { label: 'Review Commission',  bg: '#FED7AA', text: '#9A3412', icon: 'cash-outline' },
  assigned:           { label: 'Agent Assigned',     bg: '#EDE9FE', text: '#5B21B6', icon: 'person-outline' },
  in_progress:        { label: 'In Transit',         bg: '#CFFAFE', text: '#155E75', icon: 'car-outline' },
  picked:             { label: 'Picked Up',          bg: '#D1FAE5', text: '#065F46', icon: 'cube-outline' },
  picked_up:          { label: 'Picked Up',          bg: '#D1FAE5', text: '#065F46', icon: 'cube-outline' },
  weight_verified:    { label: 'Verify Weight',      bg: '#FEF3C7', text: '#92400E', icon: 'scale-outline' },
  visit_requested:    { label: 'Visit Requested',    bg: '#FED7AA', text: '#9A3412', icon: 'location-outline' },
  verified:           { label: 'Verified',           bg: '#D1FAE5', text: '#065F46', icon: 'checkmark-done-outline' },
  payment_received:   { label: 'Payment Processing', bg: '#CFFAFE', text: '#155E75', icon: 'wallet-outline' },
  paid:               { label: 'Payment Done',       bg: '#CFFAFE', text: '#155E75', icon: 'wallet-outline' },
  completed:          { label: 'Completed',          bg: '#D1FAE5', text: '#065F46', icon: 'ribbon-outline' },
  rejected:           { label: 'Rejected',           bg: '#FEE2E2', text: '#991B1B', icon: 'close-circle-outline' },
};

const fmt = (ts) => {
  if (!ts?.toDate) return '—';
  return ts.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export default function SellerOrders({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setLoading(false); return; }
    const q = query(collection(db, 'orders'), where('sellerId', '==', uid), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, err => {
      Alert.alert('Error', err.message);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleAcceptWeight = async (order) => {
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        status: 'verified',
        sellerVerifiedAt: new Date(),
      });
      
      // Send notification to agency
      if (order.agencyId) {
        const notif = NotificationTemplates.weightAccepted(order.sellerName || 'Seller');
        await sendNotification(order.agencyId, notif.type, notif.message, order.id);
      }
      
      Alert.alert('Success', 'Weight accepted! Agency can now process payment.');
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const handleAcceptCommission = async (order) => {
    Alert.alert(
      'Accept Commission',
      `Pickup commission: ₹${order.totalCommission}\n\nYour net payout: ₹${order.sellerNetAmount}\n\nAccept and allow pickup?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'orders', order.id), {
                status: 'assigned',
                commissionAcceptedAt: new Date(),
                assignedAt: new Date(),
              });
              
              // Send notification to pickup agent
              if (order.pickupAgentId) {
                const notif = NotificationTemplates.offerAccepted(order.sellerName || 'Seller');
                await sendNotification(order.pickupAgentId, notif.type, notif.message, order.id);
              }
              
              Alert.alert('Success', 'Commission accepted! Pickup agent can now proceed.');
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  const renderOrder = ({ item }) => {
    const st = STATUS[item.status] || STATUS.pending;
    const hasCommission = item.sellerNetAmount != null;
    const needsVerification = item.status === 'weight_verified' || item.status === 'visit_requested';
    const needsCommissionApproval = item.status === 'commission_pending';
    const hasOffers = item.status === 'accepted';

    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => needsVerification && navigation.navigate('SellerVerificationScreen', { order: item })}
        activeOpacity={needsVerification ? 0.7 : 1}
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.agencyRow}>
            <View style={styles.agencyIcon}><Ionicons name="business-outline" size={16} color={C.primary} /></View>
            <View>
              <Text style={styles.agencyName}>{item.agencyName || 'Agency'}</Text>
              <Text style={styles.orderDate}>{fmt(item.createdAt)}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
            <Ionicons name={st.icon} size={11} color={st.text} />
            <Text style={[styles.statusText, { color: st.text }]}>{st.label}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Materials */}
        {(item.materials || []).map((mat, i) => (
          <View key={i} style={styles.matRow}>
            <View style={styles.matDot} />
            <Text style={styles.matName}>{mat.materialName}</Text>
            <Text style={styles.matDetail}>{mat.quantityKg?.toFixed(1)} kg × ₹{mat.pricePerKg?.toFixed(1)}</Text>
          </View>
        ))}

        <View style={styles.divider} />

        {/* Summary */}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Weight</Text>
          <Text style={styles.summaryValue}>{item.totalKg?.toFixed(1)} kg</Text>
        </View>

        {hasCommission ? (
          <>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Gross Payout</Text>
              <Text style={styles.summaryValue}>₹{item.estimatedAmount?.toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.commissionBox}>
              <Ionicons name="remove-circle-outline" size={14} color={C.danger} />
              <Text style={styles.commissionText}>
                Pickup Commission (₹{item.commissionPerKg}/kg × {item.totalKg} kg)
              </Text>
              <Text style={styles.commissionAmt}>−₹{item.totalCommission}</Text>
            </View>
            <View style={[styles.summaryRow, styles.netRow]}>
              <Text style={styles.netLabel}>Your Net Payout</Text>
              <Text style={styles.netValue}>₹{item.sellerNetAmount?.toLocaleString('en-IN')}</Text>
            </View>
          </>
        ) : (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Estimated Payout</Text>
            <Text style={[styles.summaryValue, { color: C.primary, fontWeight: '700' }]}>
              ₹{item.estimatedAmount?.toLocaleString('en-IN')}
            </Text>
          </View>
        )}

        {/* Pickup agent info */}
        {item.pickupAgentName && (
          <View style={styles.agentBox}>
            <Ionicons name="bicycle-outline" size={14} color={C.success} />
            <Text style={styles.agentText}>Pickup by {item.pickupAgentName}</Text>
          </View>
        )}

        {/* Pickup Offers Available */}
        {hasOffers && (
          <TouchableOpacity 
            style={styles.viewOffersBtn}
            onPress={() => navigation.navigate('PickupOffersForSeller', { order: item })}
          >
            <Ionicons name="people" size={18} color="#fff" />
            <Text style={styles.viewOffersText}>View Pickup Offers</Text>
          </TouchableOpacity>
        )}

        {/* Commission Approval */}
        {needsCommissionApproval && (
          <View style={styles.commissionApprovalBox}>
            <View style={styles.commissionHeader}>
              <Ionicons name="information-circle" size={18} color="#f59e0b" />
              <Text style={styles.commissionTitle}>Pickup Commission Request</Text>
            </View>
            <View style={styles.commissionDetail}>
              <Text style={styles.commissionLabel}>Pickup Agent:</Text>
              <Text style={styles.commissionValue}>{item.pickupAgentName}</Text>
            </View>
            <View style={styles.commissionDetail}>
              <Text style={styles.commissionLabel}>Commission:</Text>
              <Text style={styles.commissionValue}>₹{item.commissionPerKg}/kg × {item.totalKg} kg = ₹{item.totalCommission}</Text>
            </View>
            <View style={styles.commissionDetail}>
              <Text style={styles.commissionLabel}>Your Net Payout:</Text>
              <Text style={[styles.commissionValue, { color: C.success, fontWeight: '700' }]}>₹{item.sellerNetAmount}</Text>
            </View>
            <TouchableOpacity 
              style={styles.acceptCommissionBtn}
              onPress={() => handleAcceptCommission(item)}
            >
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={styles.acceptCommissionText}>Accept Commission & Allow Pickup</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Pickup Agent Info */}
        {item.pickupAgentId && (item.status === 'assigned' || item.status === 'in_progress' || item.status === 'picked_up') && (
          <View style={styles.trackingBox}>
            <View style={styles.agentBox}>
              <Ionicons name="bicycle-outline" size={14} color={C.success} />
              <Text style={styles.agentText}>Pickup by {item.pickupAgentName}</Text>
            </View>
            <TouchableOpacity 
              style={styles.trackBtn}
              onPress={() => navigation.navigate('OrderTracking', { order: item })}
            >
              <Ionicons name="location" size={14} color={C.primary} />
              <Text style={styles.trackBtnText}>Track Pickup</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Weight Verification */}
        {needsVerification && (
          <View>
            {item.status === 'visit_requested' && (
              <View style={styles.visitInfoBox}>
                <Ionicons name="information-circle" size={16} color="#3b82f6" />
                <Text style={styles.visitInfoText}>Visit agency to verify weight, then accept below</Text>
              </View>
            )}
            <TouchableOpacity 
              style={styles.acceptWeightBtn}
              onPress={() => handleAcceptWeight(item)}
            >
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={styles.acceptWeightText}>Accept Weight</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Waiting for Payment */}
        {(item.status === 'verified' || item.status === 'payment_received') && (
          <View style={styles.waitingBox}>
            <Ionicons name="hourglass-outline" size={14} color="#f59e0b" />
            <Text style={styles.waitingText}>
              {item.status === 'verified' ? 'Waiting for agency payment' : 'Payment processing...'}
            </Text>
          </View>
        )}

        {/* Completed */}
        {item.status === 'completed' && (
          <View style={styles.completedBox}>
            <Ionicons name="checkmark-circle" size={16} color={C.success} />
            <Text style={styles.completedText}>Order completed successfully</Text>
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
        <Text style={styles.headerTitle}>My Orders</Text>
        <NotificationBell navigation={navigation} iconColor={C.textPrimary} iconSize={24} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.centered}>
          <View style={styles.emptyIcon}><Ionicons name="receipt-outline" size={40} color={C.textMuted} /></View>
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.emptySub}>Your orders will appear here once you start selling.</Text>
          <TouchableOpacity style={styles.startBtn} onPress={() => navigation.navigate('SellScrap')}>
            <Text style={styles.startBtnText}>Start Selling</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrder}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
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
  list: { padding: 16, gap: 14, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
  loadingText: { color: C.textMuted, fontSize: 15 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.textPrimary },
  emptySub: { fontSize: 14, color: C.textMuted, textAlign: 'center' },
  startBtn: { backgroundColor: C.primary, borderRadius: R.lg, paddingHorizontal: 28, paddingVertical: 12, marginTop: 8 },
  startBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  card: { backgroundColor: C.surface, borderRadius: R.xl, padding: 16, borderWidth: 1, borderColor: C.border, ...S.card },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  agencyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  agencyIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center' },
  agencyName: { fontSize: 14, fontWeight: '700', color: C.textPrimary },
  orderDate: { fontSize: 11, color: C.textMuted, marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700' },

  divider: { height: 1, backgroundColor: C.border, marginVertical: 10 },

  matRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  matDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.primary },
  matName: { flex: 1, fontSize: 13, color: C.textSecondary },
  matDetail: { fontSize: 13, color: C.textMuted },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 4 },
  summaryLabel: { fontSize: 14, color: C.textSecondary },
  summaryValue: { fontSize: 14, fontWeight: '600', color: C.textPrimary },

  commissionBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.dangerLight, borderRadius: R.sm, padding: 10,
    marginVertical: 4, borderWidth: 1, borderColor: C.dangerBorder,
  },
  commissionText: { flex: 1, fontSize: 12, color: C.danger },
  commissionAmt: { fontSize: 13, fontWeight: '700', color: C.danger },

  netRow: { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 8, marginTop: 4 },
  netLabel: { fontSize: 15, fontWeight: '700', color: C.textPrimary },
  netValue: { fontSize: 16, fontWeight: '800', color: C.success },

  agentBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.successLight, borderRadius: R.sm, padding: 8,
    marginTop: 8, borderWidth: 1, borderColor: C.successBorder,
  },
  agentText: { fontSize: 12, color: C.success, fontWeight: '600' },

  completedBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: C.successLight, borderRadius: R.md, padding: 10,
    marginTop: 10, borderWidth: 1, borderColor: C.successBorder,
  },
  completedText: { fontSize: 13, color: C.success, fontWeight: '600' },

  commissionApprovalBox: {
    backgroundColor: '#fef3c7', borderRadius: R.md, padding: 14,
    marginTop: 12, borderWidth: 1, borderColor: '#fde68a',
  },
  commissionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10,
  },
  commissionTitle: {
    fontSize: 14, color: '#92400e', fontWeight: '700',
  },
  commissionDetail: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6,
  },
  commissionLabel: {
    fontSize: 13, color: '#78350f',
  },
  commissionValue: {
    fontSize: 13, color: '#78350f', fontWeight: '600',
  },
  acceptCommissionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.success, borderRadius: R.md, padding: 12,
    marginTop: 10,
  },
  acceptCommissionText: { fontSize: 14, color: '#fff', fontWeight: '700' },

  viewOffersBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.primary, borderRadius: R.md, padding: 14,
    marginTop: 12,
  },
  viewOffersText: { fontSize: 15, color: '#fff', fontWeight: '700' },

  trackingBox: {
    backgroundColor: C.successLight, borderRadius: R.md, padding: 12,
    marginTop: 12, borderWidth: 1, borderColor: C.successBorder,
  },
  trackBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: C.primary, borderRadius: R.sm, padding: 10,
    marginTop: 8,
  },
  trackBtnText: { fontSize: 13, color: '#fff', fontWeight: '700' },

  acceptWeightBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.success, borderRadius: R.md, padding: 14,
    marginTop: 12,
  },
  acceptWeightText: { fontSize: 15, color: '#fff', fontWeight: '700' },

  waitingBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#fef3c7', borderRadius: R.md, padding: 10,
    marginTop: 10, borderWidth: 1, borderColor: '#fde68a',
  },
  waitingText: { fontSize: 12, color: '#92400e', fontWeight: '600', textAlign: 'center' },

  visitInfoBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#dbeafe', borderRadius: R.md, padding: 10,
    marginTop: 10, borderWidth: 1, borderColor: '#93c5fd',
  },
  visitInfoText: { fontSize: 12, color: '#1e40af', fontWeight: '600', flex: 1 },
});
