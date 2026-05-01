import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, ActivityIndicator, Alert, TextInput, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { P, PS, PR } from '../pickupTheme';

export default function AvailableOrders({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [commissionPerKg, setCommissionPerKg] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    // Listen to orders with status 'accepted' (broadcast to all pickup agents)
    const q = query(collection(db, 'orders'), where('status', '==', 'accepted'));
    const unsub = onSnapshot(q, snap => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, err => {
      Alert.alert('Error', err.message);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSendOffer = async () => {
    const commission = parseFloat(commissionPerKg);
    if (isNaN(commission) || commission <= 0) {
      Alert.alert('Invalid', 'Enter a valid commission per kg');
      return;
    }

    const totalCommission = parseFloat((commission * selectedOrder.totalKg).toFixed(0));
    const sellerNet = parseFloat((selectedOrder.estimatedAmount - totalCommission).toFixed(0));

    if (sellerNet < 0) {
      Alert.alert('Too High', 'Commission cannot exceed seller payout');
      return;
    }

    setSending(true);
    try {
      const uid = auth.currentUser?.uid;
      const userSnap = await getDocs(query(collection(db, 'users'), where('__name__', '==', uid)));
      const userName = userSnap.docs[0]?.data()?.name || 'Pickup Agent';

      await addDoc(collection(db, 'pickup_offers'), {
        orderId: selectedOrder.id,
        sellerId: selectedOrder.sellerId,
        agencyId: selectedOrder.agencyId,
        pickupAgentId: uid,
        pickupAgentName: userName,
        commissionPerKg: commission,
        totalCommission,
        sellerNetAmount: sellerNet,
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      Alert.alert('Offer Sent!', `Your commission offer of ₹${commission}/kg has been sent to the seller.`);
      setSelectedOrder(null);
      setCommissionPerKg('');
    } catch (e) {
      Alert.alert('Error', 'Failed to send offer. Try again.');
    } finally {
      setSending(false);
    }
  };

  if (loading) return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={P.bg} />
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={P.primary} />
        <Text style={styles.loadingText}>Loading available orders...</Text>
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={P.bg} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Available Orders</Text>
        <Text style={styles.headerSub}>{orders.length} order{orders.length !== 1 ? 's' : ''} available</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {orders.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIcon}><Ionicons name="cube-outline" size={36} color={P.textMuted} /></View>
            <Text style={styles.emptyTitle}>No Available Orders</Text>
            <Text style={styles.emptySub}>New orders will appear here when agencies accept them.</Text>
          </View>
        ) : (
          orders.map(order => (
            <View key={order.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardLabel}>Order</Text>
                  <Text style={styles.cardId}>#{order.id.slice(-6).toUpperCase()}</Text>
                </View>
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>NEW</Text>
                </View>
              </View>

              <View style={styles.agencyRow}>
                <Ionicons name="business-outline" size={14} color={P.textMuted} />
                <Text style={styles.agencyText}>{order.agencyName || 'Agency'}</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Weight</Text>
                  <Text style={styles.statValue}>{order.totalKg} kg</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Seller Payout</Text>
                  <Text style={[styles.statValue, { color: P.primary }]}>₹{order.estimatedAmount}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Items</Text>
                  <Text style={styles.statValue}>{order.materials?.length ?? 0}</Text>
                </View>
              </View>

              {order.sellerLatitude && (
                <View style={styles.locationChip}>
                  <Ionicons name="location-outline" size={13} color={P.success} />
                  <Text style={styles.locationText}>
                    {order.sellerLatitude.toFixed(4)}, {order.sellerLongitude.toFixed(4)}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.offerBtn}
                onPress={() => setSelectedOrder(order)}
              >
                <Ionicons name="cash-outline" size={16} color="#fff" />
                <Text style={styles.offerBtnText}>Send Commission Offer</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* Commission Offer Modal */}
      <Modal visible={!!selectedOrder} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Send Commission Offer</Text>
              <TouchableOpacity onPress={() => setSelectedOrder(null)}>
                <Ionicons name="close" size={24} color={P.textPrimary} />
              </TouchableOpacity>
            </View>

            {selectedOrder && (
              <>
                <View style={styles.orderSummary}>
                  <Text style={styles.summaryLabel}>Order #{selectedOrder.id.slice(-6).toUpperCase()}</Text>
                  <Text style={styles.summaryValue}>{selectedOrder.totalKg} kg · ₹{selectedOrder.estimatedAmount}</Text>
                </View>

                <Text style={styles.inputLabel}>Your Commission (₹ / kg)</Text>
                <View style={styles.commissionInputRow}>
                  <Text style={styles.rupee}>₹</Text>
                  <TextInput
                    style={styles.commissionInput}
                    value={commissionPerKg}
                    onChangeText={setCommissionPerKg}
                    keyboardType="numeric"
                    placeholder="e.g. 5"
                    placeholderTextColor={P.textMuted}
                  />
                  <Text style={styles.perKg}>/ kg</Text>
                </View>

                {parseFloat(commissionPerKg) > 0 && (
                  <View style={styles.breakdown}>
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>Seller's Gross Payout</Text>
                      <Text style={styles.breakdownValue}>₹{selectedOrder.estimatedAmount}</Text>
                    </View>
                    <View style={styles.breakdownRow}>
                      <Text style={[styles.breakdownLabel, { color: P.danger }]}>
                        − Your Commission (₹{commissionPerKg} × {selectedOrder.totalKg} kg)
                      </Text>
                      <Text style={[styles.breakdownValue, { color: P.danger }]}>
                        ₹{(parseFloat(commissionPerKg) * selectedOrder.totalKg).toFixed(0)}
                      </Text>
                    </View>
                    <View style={[styles.breakdownRow, styles.netRow]}>
                      <Text style={styles.netLabel}>Seller's Net Payout</Text>
                      <Text style={styles.netValue}>
                        ₹{(selectedOrder.estimatedAmount - parseFloat(commissionPerKg) * selectedOrder.totalKg).toFixed(0)}
                      </Text>
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.sendBtn, sending && { opacity: 0.6 }]}
                  onPress={handleSendOffer}
                  disabled={sending}
                >
                  {sending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="send" size={18} color="#fff" />
                      <Text style={styles.sendBtnText}>Send Offer to Seller</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: P.textMuted, fontSize: 15 },

  header: {
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
    backgroundColor: P.surface, borderBottomWidth: 1, borderBottomColor: P.border,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: P.textPrimary },
  headerSub: { fontSize: 13, color: P.textMuted, marginTop: 2 },

  list: { padding: 16, gap: 14, paddingBottom: 40 },
  emptyBox: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: P.primaryLight, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: P.textPrimary },
  emptySub: { fontSize: 14, color: P.textMuted, textAlign: 'center', paddingHorizontal: 40 },

  card: { backgroundColor: P.surface, borderRadius: PR.xl, padding: 16, borderWidth: 1, borderColor: P.border, ...PS.card },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  cardLabel: { fontSize: 11, color: P.textMuted, fontWeight: '600', textTransform: 'uppercase' },
  cardId: { fontSize: 20, fontWeight: '800', color: P.textPrimary, marginTop: 2 },
  newBadge: { backgroundColor: P.primary, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  newBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  agencyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  agencyText: { color: P.textSecondary, fontSize: 13 },
  divider: { height: 1, backgroundColor: P.border, marginBottom: 12 },

  statsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  statItem: { flex: 1, alignItems: 'center' },
  statLabel: { color: P.textMuted, fontSize: 11, marginBottom: 4 },
  statValue: { color: P.textPrimary, fontSize: 16, fontWeight: '700' },
  statDivider: { width: 1, height: 30, backgroundColor: P.border },

  locationChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: P.successLight, borderRadius: PR.sm, padding: 8,
    marginBottom: 12, borderWidth: 1, borderColor: P.successBorder,
  },
  locationText: { color: P.success, fontSize: 11, flex: 1 },

  offerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: P.primary, borderRadius: PR.md, paddingVertical: 13, ...PS.btn,
  },
  offerBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: P.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: P.textPrimary },

  orderSummary: {
    backgroundColor: P.primaryLight, borderRadius: PR.md, padding: 12,
    marginBottom: 20, borderWidth: 1, borderColor: P.border,
  },
  summaryLabel: { fontSize: 12, color: P.textMuted, marginBottom: 4 },
  summaryValue: { fontSize: 16, fontWeight: '700', color: P.textPrimary },

  inputLabel: { fontSize: 14, fontWeight: '600', color: P.textSecondary, marginBottom: 8 },
  commissionInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  rupee: { fontSize: 20, fontWeight: '700', color: P.textPrimary },
  commissionInput: {
    flex: 1, backgroundColor: P.surfaceAlt, borderRadius: PR.md, padding: 14,
    fontSize: 18, fontWeight: '700', color: P.textPrimary,
    borderWidth: 1, borderColor: P.border, textAlign: 'center',
  },
  perKg: { fontSize: 14, color: P.textMuted },

  breakdown: { backgroundColor: P.surfaceAlt, borderRadius: PR.md, padding: 12, marginBottom: 20 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  breakdownLabel: { fontSize: 13, color: P.textSecondary },
  breakdownValue: { fontSize: 13, fontWeight: '600', color: P.textSecondary },
  netRow: { borderTopWidth: 1, borderTopColor: P.border, paddingTop: 8, marginTop: 4 },
  netLabel: { fontSize: 15, fontWeight: '700', color: P.textPrimary },
  netValue: { fontSize: 16, fontWeight: '800', color: P.success },

  sendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: P.primary, borderRadius: PR.md, paddingVertical: 16, ...PS.btn,
  },
  sendBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
