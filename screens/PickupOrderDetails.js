import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { P, PS, PR, STATUS, NEXT_ACTION } from '../pickupTheme';

const STEPS = ['assigned', 'accepted', 'in_progress', 'picked_up'];

export default function PickupOrderDetails({ route, navigation }) {
  const { order: initialOrder } = route.params;
  const [status, setStatus] = useState(initialOrder.status);
  const [loading, setLoading] = useState(false);

  const order = { ...initialOrder, status };
  const currentStep = STEPS.indexOf(status);
  const action = NEXT_ACTION[status];
  const isCompleted = status === 'picked_up';
  const currentSt = STATUS[status] || STATUS.assigned;

  const handleAction = () => {
    if (!action) return;
    Alert.alert(action.label, `Confirm "${action.label}" for this order?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          setLoading(true);
          try {
            await updateDoc(doc(db, 'orders', order.id), {
              status: action.next, updatedAt: serverTimestamp(),
              ...(action.next === 'in_progress' && { tripStartedAt: serverTimestamp() }),
              ...(action.next === 'picked_up' && { pickedUpAt: serverTimestamp() }),
            });
            setStatus(action.next);
          } catch (e) {
            Alert.alert('Error', e.code === 'permission-denied' ? 'Permission denied.' : 'Could not update. Try again.');
          } finally { setLoading(false); }
        },
      },
    ]);
  };

  const fmt = (ts) => ts?.toDate?.()?.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) ?? '—';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={P.bg} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={P.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Order ID + Status */}
        <View style={styles.card}>
          <View style={styles.orderTop}>
            <View>
              <Text style={styles.orderLabel}>Pickup Assignment</Text>
              <Text style={styles.orderId}>#{order.id.slice(-6).toUpperCase()}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: currentSt.bg, borderColor: currentSt.border }]}>
              <Ionicons name={currentSt.icon} size={13} color={currentSt.color} />
              <Text style={[styles.statusText, { color: currentSt.color }]}>{currentSt.label}</Text>
            </View>
          </View>
          <View style={styles.infoRow}><Ionicons name="business-outline" size={14} color={P.textMuted} /><Text style={styles.infoText}>{order.agencyName || 'Agency'}</Text></View>
          <View style={styles.infoRow}><Ionicons name="calendar-outline" size={14} color={P.textMuted} /><Text style={styles.infoText}>{fmt(order.createdAt)}</Text></View>
        </View>

        {/* Commission highlight */}
        {order.totalCommission > 0 && (
          <View style={styles.commissionCard}>
            <Ionicons name="cash-outline" size={20} color={P.primaryDark} />
            <View style={{ flex: 1 }}>
              <Text style={styles.commissionLabel}>Your Commission</Text>
              <Text style={styles.commissionValue}>₹{order.totalCommission} (₹{order.commissionPerKg}/kg × {order.totalKg} kg)</Text>
            </View>
          </View>
        )}

        {/* Progress Timeline */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Progress Timeline</Text>
          {STEPS.map((step, i) => {
            const st = STATUS[step];
            const done = i <= currentStep;
            const isLast = i === STEPS.length - 1;
            return (
              <View key={step} style={styles.timelineRow}>
                <View style={styles.timelineLeft}>
                  <View style={[styles.dot, done && { backgroundColor: st.color, borderColor: st.color }]}>
                    {done && <Ionicons name="checkmark" size={11} color="#fff" />}
                  </View>
                  {!isLast && <View style={[styles.line, i < currentStep && { backgroundColor: P.border }]} />}
                </View>
                <View style={styles.timelineContent}>
                  <Text style={[styles.timelineLabel, done && { color: st.color, fontWeight: '700' }]}>{st.label}</Text>
                  {i === currentStep && <Text style={styles.timelineCurrent}>Current status</Text>}
                </View>
              </View>
            );
          })}
        </View>

        {/* Materials */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Materials</Text>
          {(order.materials || []).map((mat, i) => (
            <View key={i} style={styles.matRow}>
              <View style={styles.matDot} />
              <Text style={styles.matName}>{mat.materialName}</Text>
              <Text style={styles.matQty}>{mat.quantityKg} kg</Text>
              <Text style={styles.matAmt}>₹{mat.subtotal?.toFixed(0)}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.totalsRow}>
            <View style={styles.totalItem}><Text style={styles.totalLabel}>Total Weight</Text><Text style={styles.totalValue}>{order.totalKg} kg</Text></View>
            <View style={styles.totalDivider} />
            <View style={styles.totalItem}><Text style={styles.totalLabel}>Est. Value</Text><Text style={[styles.totalValue, { color: P.primary }]}>₹{order.estimatedAmount}</Text></View>
          </View>
        </View>

        {/* Location */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Seller Location</Text>
          {order.sellerLatitude ? (
            <>
              <View style={styles.coordRow}>
                <Ionicons name="location-outline" size={15} color={P.primary} />
                <Text style={styles.coordText}>{order.sellerLatitude.toFixed(5)}, {order.sellerLongitude.toFixed(5)}</Text>
              </View>
              <TouchableOpacity style={styles.mapBtn} onPress={() => navigation.navigate('PickupMapScreen', { order })}>
                <Ionicons name="map-outline" size={18} color="#fff" />
                <Text style={styles.mapBtnText}>Open Map</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.noLocRow}><Ionicons name="location-outline" size={15} color={P.textMuted} /><Text style={styles.noLocText}>Location not provided</Text></View>
          )}
        </View>

        {/* Activity Log */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Activity Log</Text>
          {[
            { label: 'Order Created', value: fmt(order.createdAt) },
            { label: 'Trip Started',  value: fmt(order.tripStartedAt) },
            { label: 'Picked Up',     value: fmt(order.pickedUpAt) },
          ].map(({ label, value }) => (
            <View key={label} style={styles.logRow}>
              <Text style={styles.logLabel}>{label}</Text>
              <Text style={[styles.logValue, value === '—' && { color: P.border }]}>{value}</Text>
            </View>
          ))}
        </View>

      </ScrollView>

      {/* Bottom Action */}
      {!isCompleted && action && (
        <View style={styles.bottomBar}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: action.color }, loading && { opacity: 0.6 }]} onPress={handleAction} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : (
              <><Ionicons name="arrow-forward-circle-outline" size={20} color="#fff" /><Text style={styles.actionBtnText}>{action.label}</Text></>
            )}
          </TouchableOpacity>
        </View>
      )}

      {isCompleted && (
        <View style={styles.bottomBar}>
          <View style={styles.completedBar}>
            <Ionicons name="checkmark-circle" size={20} color={P.primary} />
            <Text style={styles.completedText}>Pickup Delivery Completed</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: P.surface, borderBottomWidth: 1, borderBottomColor: P.border,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: P.textPrimary },

  content: { padding: 16, gap: 14, paddingBottom: 120 },

  card: { backgroundColor: P.surface, borderRadius: PR.xl, padding: 16, borderWidth: 1, borderColor: P.border, ...PS.card },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: P.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 },

  orderTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  orderLabel: { fontSize: 11, color: P.textMuted, fontWeight: '600', textTransform: 'uppercase' },
  orderId: { fontSize: 26, fontWeight: '800', color: P.textPrimary, marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  statusText: { fontSize: 12, fontWeight: '700' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  infoText: { color: P.textSecondary, fontSize: 13 },

  commissionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: P.primaryLight, borderRadius: PR.lg, padding: 14,
    borderWidth: 1, borderColor: P.border,
  },
  commissionLabel: { fontSize: 11, color: P.primaryDark, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  commissionValue: { fontSize: 14, fontWeight: '700', color: P.primaryDark, marginTop: 2 },

  timelineRow: { flexDirection: 'row', marginBottom: 4 },
  timelineLeft: { alignItems: 'center', width: 28, marginRight: 12 },
  dot: { width: 24, height: 24, borderRadius: 12, backgroundColor: P.surface, borderWidth: 2, borderColor: P.border, alignItems: 'center', justifyContent: 'center' },
  line: { width: 2, flex: 1, backgroundColor: P.surface, marginVertical: 2, minHeight: 16 },
  timelineContent: { flex: 1, paddingBottom: 16 },
  timelineLabel: { color: P.textMuted, fontSize: 14, fontWeight: '500' },
  timelineCurrent: { color: P.primary, fontSize: 11, marginTop: 2, fontWeight: '600' },

  matRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  matDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: P.primary },
  matName: { flex: 1, fontSize: 13, color: P.textSecondary },
  matQty: { fontSize: 13, color: P.textMuted, width: 50, textAlign: 'right' },
  matAmt: { fontSize: 13, fontWeight: '600', color: P.primaryDark, width: 60, textAlign: 'right' },
  divider: { height: 1, backgroundColor: P.border, marginVertical: 10 },
  totalsRow: { flexDirection: 'row', alignItems: 'center' },
  totalItem: { flex: 1, alignItems: 'center' },
  totalLabel: { fontSize: 12, color: P.textMuted, marginBottom: 4 },
  totalValue: { fontSize: 18, fontWeight: '700', color: P.textPrimary },
  totalDivider: { width: 1, height: 36, backgroundColor: P.border },

  coordRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  coordText: { color: P.primaryDark, fontSize: 13 },
  mapBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: P.primary, borderRadius: PR.md, paddingVertical: 12, ...PS.btn },
  mapBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  noLocRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  noLocText: { color: P.textMuted, fontSize: 13 },

  logRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: P.border },
  logLabel: { fontSize: 13, color: P.textSecondary },
  logValue: { fontSize: 13, fontWeight: '500', color: P.textPrimary },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: P.surface, borderTopWidth: 1, borderTopColor: P.border },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: PR.lg, paddingVertical: 15, ...PS.btn },
  actionBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  completedBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: P.primaryLight, borderRadius: PR.lg, paddingVertical: 15, borderWidth: 1, borderColor: P.border },
  completedText: { color: P.primaryDark, fontSize: 15, fontWeight: '700' },
});
