import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, ActivityIndicator, Alert, RefreshControl, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebase';
import {
  collection, query, where, orderBy, onSnapshot,
  doc, updateDoc, serverTimestamp,
} from 'firebase/firestore';
import { A, AS, AR } from '../agencyTheme';
import { sendNotification, NotificationTemplates } from '../notificationHelper';

const STATUS_CONFIG = {
  pending:            { label: 'Awaiting Review',      color: A.primary,    bg: A.primaryLight,  border: A.border,        icon: 'time-outline' },
  accepted:           { label: 'Accepted',             color: A.success,    bg: A.successLight,  border: A.successBorder, icon: 'checkmark-circle-outline' },
  commission_pending: { label: 'Awaiting Seller',      color: '#f59e0b',    bg: '#fef3c7',       border: '#fde68a',       icon: 'hourglass-outline' },
  rejected:           { label: 'Rejected',             color: A.danger,     bg: A.dangerLight,   border: A.dangerBorder,  icon: 'close-circle-outline' },
  assigned:           { label: 'Agent Assigned',       color: '#7C3AED',    bg: '#EDE9FE',       border: '#DDD6FE',       icon: 'person-outline' },
  in_progress:        { label: 'In Transit',           color: '#f59e0b',    bg: '#fef3c7',       border: '#fde68a',       icon: 'car-outline' },
  picked_up:          { label: 'Picked Up',            color: A.info,       bg: A.infoLight,     border: A.infoBorder,    icon: 'cube-outline' },
  weight_verified:    { label: 'Weight Verified',      color: '#8b5cf6',    bg: '#f3e8ff',       border: '#e9d5ff',       icon: 'scale-outline' },
  verified:           { label: 'Seller Verified',      color: '#10b981',    bg: '#d1fae5',       border: '#6ee7b7',       icon: 'checkmark-done-outline' },
  payment_received:   { label: 'Payment Received',     color: '#06b6d4',    bg: '#cffafe',       border: '#a5f3fc',       icon: 'wallet-outline' },
  completed:          { label: 'Completed',            color: '#10b981',    bg: '#d1fae5',       border: '#6ee7b7',       icon: 'ribbon-outline' },
};

const FILTER_TABS = ['All', 'Pending', 'Accepted', 'Rejected', 'Completed'];

function OrderCard({ order, onAccept, onReject, onTrack, onVerifyWeight, onProcessPayment, actionLoading }) {
  const st = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const isPending = order.status === 'pending';
  const isAccepted = order.status === 'accepted';
  const isCommissionPending = order.status === 'commission_pending';
  const isAssigned = order.status === 'assigned';
  const isInProgress = order.status === 'in_progress';
  const isPickedUp = order.status === 'picked_up';
  const isWeightVerified = order.status === 'weight_verified';
  const isVerified = order.status === 'verified';
  const isPaymentReceived = order.status === 'payment_received';
  const isCompleted = order.status === 'completed';
  const isBelowMin = order.belowMinimum && order.minPickupKg > 0;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, []);

  const timeStr = order.createdAt?.toDate?.()?.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  }) ?? 'Just now';

  return (
    <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.orderLabel}>Order Request</Text>
          <Text style={styles.orderId}>#{order.id.slice(-6).toUpperCase()}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: st.bg, borderColor: st.border }]}>
          <Ionicons name={st.icon} size={12} color={st.color} />
          <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
        </View>
      </View>

      {/* Meta */}
      <View style={styles.metaRow}>
        <Ionicons name="calendar-outline" size={13} color={A.textMuted} />
        <Text style={styles.metaText}>{timeStr}</Text>
      </View>

      <View style={styles.divider} />

      {/* Materials */}
      {(order.materials || []).map((mat, i) => (
        <View key={i} style={styles.matRow}>
          <View style={styles.matDot} />
          <Text style={styles.matName}>{mat.materialName}</Text>
          <Text style={styles.matQty}>{mat.quantityKg} kg</Text>
          <Text style={styles.matAmt}>₹{mat.subtotal?.toFixed(0)}</Text>
        </View>
      ))}

      <View style={styles.divider} />

      {/* Totals */}
      <View style={styles.totalsRow}>
        <View style={styles.totalItem}>
          <Text style={styles.totalLabel}>Total Weight</Text>
          <Text style={styles.totalValue}>{order.totalKg} kg</Text>
        </View>
        <View style={styles.totalDivider} />
        <View style={styles.totalItem}>
          <Text style={styles.totalLabel}>Est. Payout</Text>
          <Text style={[styles.totalValue, { color: A.primaryDark }]}>₹{order.estimatedAmount}</Text>
        </View>
      </View>

      {/* Below minimum */}
      {isBelowMin && (
        <View style={styles.belowMinBanner}>
          <Ionicons name="alert-circle-outline" size={14} color={A.primaryDark} />
          <Text style={styles.belowMinText}>
            {order.pickupAgentId
              ? `Agent assigned · ₹${order.commissionPerKg}/kg commission`
              : `Below minimum (${order.minPickupKg} kg) · Awaiting pickup agent`}
          </Text>
        </View>
      )}

      {/* Location */}
      {order.sellerLatitude && (
        <View style={styles.locationChip}>
          <Ionicons name="location-outline" size={13} color={A.success} />
          <Text style={styles.locationText}>
            {order.sellerLatitude.toFixed(4)}, {order.sellerLongitude.toFixed(4)}
          </Text>
        </View>
      )}

      {/* Agent info */}
      {order.pickupAgentId && (
        <View style={styles.agentRow}>
          <Ionicons name="bicycle-outline" size={14} color={A.success} />
          <Text style={styles.agentText}>
            Agent: {order.pickupAgentName || 'Assigned'} · ₹{order.commissionPerKg}/kg
          </Text>
        </View>
      )}

      {/* Actions */}
      {isPending && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.rejectBtn}
            onPress={() => onReject(order.id)}
            disabled={actionLoading === order.id}
          >
            {actionLoading === order.id
              ? <ActivityIndicator size="small" color={A.danger} />
              : <><Ionicons name="close" size={16} color={A.danger} /><Text style={styles.rejectBtnText}>Reject</Text></>
            }
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.acceptBtn}
            onPress={() => onAccept(order.id)}
            disabled={actionLoading === order.id}
          >
            {actionLoading === order.id
              ? <ActivityIndicator size="small" color="#fff" />
              : <><Ionicons name="checkmark" size={16} color="#fff" /><Text style={styles.acceptBtnText}>Accept</Text></>
            }
          </TouchableOpacity>
        </View>
      )}

      {isAccepted && !order.pickupAgentId && (
        <View style={styles.waitingBanner}>
          <Ionicons name="broadcast-outline" size={16} color="#3b82f6" />
          <Text style={styles.waitingText}>Order broadcast to pickup agents. Waiting for offers...</Text>
        </View>
      )}

      {isCommissionPending && (
        <View style={styles.waitingBanner}>
          <Ionicons name="hourglass-outline" size={16} color="#f59e0b" />
          <Text style={styles.waitingText}>Waiting for seller to accept ₹{order.totalCommission} commission</Text>
        </View>
      )}

      {(isAssigned || isInProgress) && (
        <TouchableOpacity style={styles.trackBtn} onPress={() => onTrack(order)}>
          <Ionicons name="car-outline" size={16} color="#fff" />
          <Text style={styles.trackBtnText}>Track Pickup</Text>
        </TouchableOpacity>
      )}

      {isPickedUp && (
        <TouchableOpacity style={styles.verifyWeightBtn} onPress={() => onVerifyWeight(order)}>
          <Ionicons name="scale-outline" size={16} color="#fff" />
          <Text style={styles.trackBtnText}>Verify Weight Now</Text>
        </TouchableOpacity>
      )}

      {isWeightVerified && (
        <View style={styles.waitingBanner}>
          <Ionicons name="hourglass-outline" size={16} color="#f59e0b" />
          <Text style={styles.waitingText}>Waiting for seller to verify weight</Text>
        </View>
      )}

      {isVerified && (
        <TouchableOpacity style={styles.paymentBtn} onPress={() => onProcessPayment(order)}>
          <Ionicons name="wallet-outline" size={16} color="#fff" />
          <Text style={styles.trackBtnText}>Process Payment to Admin</Text>
        </TouchableOpacity>
      )}

      {isPaymentReceived && (
        <View style={styles.waitingBanner}>
          <Ionicons name="hourglass-outline" size={16} color="#06b6d4" />
          <Text style={styles.waitingText}>Waiting for admin to distribute payment</Text>
        </View>
      )}

      {isCompleted && (
        <View style={styles.completedBanner}>
          <Ionicons name="checkmark-circle" size={16} color="#10b981" />
          <Text style={styles.completedText}>Order completed successfully!</Text>
        </View>
      )}
    </Animated.View>
  );
}

export default function AgencyOrders({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    const agencyId = auth.currentUser?.uid;
    if (!agencyId) { setLoading(false); return; }
    const q = query(collection(db, 'orders'), where('agencyId', '==', agencyId), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
      setRefreshing(false);
    }, err => {
      Alert.alert('Error', err.message);
      setLoading(false);
      setRefreshing(false);
    });
    return () => unsub();
  }, []);

  const handleAccept = useCallback(async (orderId) => {
    Alert.alert('Accept Order', 'Confirm you want to accept this order?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Accept',
        onPress: async () => {
          setActionLoading(orderId);
          try {
            const order = orders.find(o => o.id === orderId);
            await updateDoc(doc(db, 'orders', orderId), { status: 'accepted', acceptedAt: serverTimestamp(), updatedAt: serverTimestamp() });
            
            // Send notification to seller
            if (order?.sellerId) {
              const notif = NotificationTemplates.orderAccepted(order.agencyName || 'Agency');
              await sendNotification(order.sellerId, notif.type, notif.message, orderId);
            }
            
            if (order) navigation.navigate('OrderTracking', { order: { ...order, status: 'accepted' } });
          } catch (e) {
            Alert.alert('Error', e.code === 'permission-denied' ? 'Permission denied.' : 'Could not accept. Try again.');
          } finally { setActionLoading(null); }
        },
      },
    ]);
  }, [orders, navigation]);

  const handleReject = useCallback(async (orderId) => {
    Alert.alert('Reject Order', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject', style: 'destructive',
        onPress: async () => {
          setActionLoading(orderId);
          try {
            const order = orders.find(o => o.id === orderId);
            await updateDoc(doc(db, 'orders', orderId), { status: 'rejected', rejectedAt: serverTimestamp(), updatedAt: serverTimestamp() });
            
            // Send notification to seller
            if (order?.sellerId) {
              const notif = NotificationTemplates.orderRejected(order.agencyName || 'Agency');
              await sendNotification(order.sellerId, notif.type, notif.message, orderId);
            }
          } catch (e) {
            Alert.alert('Error', e.code === 'permission-denied' ? 'Permission denied.' : 'Could not reject. Try again.');
          } finally { setActionLoading(null); }
        },
      },
    ]);
  }, []);

  const handleTrack = useCallback((order) => {
    if (order.status === 'accepted' && !order.pickupAgentId) {
      navigation.navigate('RequestPickupAgent', { order });
    } else {
      navigation.navigate('OrderTracking', { order });
    }
  }, [navigation]);

  const handleVerifyWeight = useCallback((order) => {
    navigation.navigate('WeightVerificationScreen', { order });
  }, [navigation]);

  const handleProcessPayment = useCallback((order) => {
    navigation.navigate('PaymentScreen', { order });
  }, [navigation]);

  const filteredOrders = orders.filter(o => {
    if (activeFilter === 'All') return true;
    return o.status === activeFilter.toLowerCase();
  });

  const pendingCount = orders.filter(o => o.status === 'pending').length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={A.bg} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Incoming Orders</Text>
          <Text style={styles.headerSub}>
            {pendingCount > 0 ? `${pendingCount} awaiting review` : 'All orders reviewed'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity 
            style={styles.notificationBtn}
            onPress={() => navigation.navigate('NotificationsScreen')}
          >
            <Ionicons name="notifications" size={22} color={A.textPrimary} />
          </TouchableOpacity>
          {pendingCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingCount}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      >
        {FILTER_TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.filterTab, activeFilter === tab && styles.filterTabActive]}
            onPress={() => setActiveFilter(tab)}
          >
            <Text style={[styles.filterTabText, activeFilter === tab && styles.filterTabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={A.primary} />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      ) : filteredOrders.length === 0 ? (
        <View style={styles.centered}>
          <View style={styles.emptyIcon}><Ionicons name="file-tray-outline" size={36} color={A.textMuted} /></View>
          <Text style={styles.emptyTitle}>No {activeFilter === 'All' ? '' : activeFilter} Orders</Text>
          <Text style={styles.emptySub}>New order requests will appear here.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => setRefreshing(true)} tintColor={A.primary} colors={[A.primary]} />}
        >
          {filteredOrders.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              onAccept={handleAccept}
              onReject={handleReject}
              onTrack={handleTrack}
              onVerifyWeight={handleVerifyWeight}
              onProcessPayment={handleProcessPayment}
              actionLoading={actionLoading}
            />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: A.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
    backgroundColor: A.surface, borderBottomWidth: 1, borderBottomColor: A.border,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: A.textPrimary },
  headerSub: { fontSize: 13, color: A.textMuted, marginTop: 2 },
  badge: {
    backgroundColor: A.primary, borderRadius: 20, minWidth: 32, height: 32,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10,
  },
  badgeText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  notificationBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: A.surfaceAlt, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: A.border,
  },

  filterRow: { maxHeight: 52, backgroundColor: A.surface, borderBottomWidth: 1, borderBottomColor: A.border },
  filterTab: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginVertical: 8,
    backgroundColor: A.surfaceAlt, borderWidth: 1, borderColor: A.border,
  },
  filterTabActive: { backgroundColor: A.primary, borderColor: A.primary },
  filterTabText: { color: A.textSecondary, fontSize: 13, fontWeight: '600' },
  filterTabTextActive: { color: '#fff' },

  list: { padding: 16, gap: 14, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { color: A.textMuted, fontSize: 15 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: A.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: A.textPrimary },
  emptySub: { fontSize: 14, color: A.textMuted, textAlign: 'center' },

  card: {
    backgroundColor: A.surface, borderRadius: AR.xl, padding: 16,
    borderWidth: 1, borderColor: A.border, ...AS.card,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  orderLabel: { fontSize: 11, color: A.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
  orderId: { fontSize: 20, fontWeight: '800', color: A.textPrimary, marginTop: 2 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1,
  },
  statusText: { fontSize: 11, fontWeight: '700' },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10 },
  metaText: { color: A.textMuted, fontSize: 12 },
  divider: { height: 1, backgroundColor: A.border, marginVertical: 10 },

  matRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 7 },
  matDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: A.primary },
  matName: { flex: 1, fontSize: 13, color: A.textSecondary },
  matQty: { fontSize: 13, color: A.textMuted, width: 50, textAlign: 'right' },
  matAmt: { fontSize: 13, fontWeight: '600', color: A.primaryDark, width: 55, textAlign: 'right' },

  totalsRow: { flexDirection: 'row', alignItems: 'center' },
  totalItem: { flex: 1, alignItems: 'center' },
  totalLabel: { fontSize: 12, color: A.textMuted, marginBottom: 4 },
  totalValue: { fontSize: 17, fontWeight: '700', color: A.textPrimary },
  totalDivider: { width: 1, height: 32, backgroundColor: A.border },

  belowMinBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: A.primaryLight, borderRadius: AR.sm, padding: 10,
    marginTop: 10, borderWidth: 1, borderColor: A.border,
  },
  belowMinText: { color: A.primaryDark, fontSize: 12, flex: 1 },

  locationChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: A.successLight, borderRadius: AR.sm, padding: 8,
    marginTop: 8, borderWidth: 1, borderColor: A.successBorder,
  },
  locationText: { color: A.success, fontSize: 11, flex: 1 },

  agentRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: A.successLight, borderRadius: AR.sm, padding: 8,
    marginTop: 8, borderWidth: 1, borderColor: A.successBorder,
  },
  agentText: { color: A.success, fontSize: 12, flex: 1, fontWeight: '600' },

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  rejectBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: AR.md,
    borderWidth: 1.5, borderColor: A.dangerBorder, backgroundColor: A.dangerLight,
  },
  rejectBtnText: { color: A.danger, fontSize: 14, fontWeight: '700' },
  acceptBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: AR.md,
    backgroundColor: A.success, ...AS.btn,
  },
  acceptBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  trackBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginTop: 12, paddingVertical: 12, borderRadius: AR.md,
    backgroundColor: A.primary, ...AS.btn,
  },
  verifyWeightBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginTop: 12, paddingVertical: 12, borderRadius: AR.md,
    backgroundColor: '#8b5cf6', ...AS.btn,
  },
  paymentBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginTop: 12, paddingVertical: 12, borderRadius: AR.md,
    backgroundColor: '#10b981', ...AS.btn,
  },
  trackBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  waitingBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#fef3c7', borderRadius: AR.md, padding: 12,
    marginTop: 12, borderWidth: 1, borderColor: '#fde68a',
  },
  waitingText: { fontSize: 13, color: '#92400e', fontWeight: '600', flex: 1, textAlign: 'center' },

  completedBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#d1fae5', borderRadius: AR.md, padding: 12,
    marginTop: 12, borderWidth: 1, borderColor: '#6ee7b7',
  },
  completedText: { fontSize: 13, color: '#065f46', fontWeight: '700' },
});
