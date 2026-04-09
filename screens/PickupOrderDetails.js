import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

const STATUS_STEPS = ['assigned', 'accepted', 'in_progress', 'picked', 'completed'];

const STATUS_CONFIG = {
  assigned:    { label: 'Assigned',    color: '#fbbf24', icon: 'person-outline' },
  accepted:    { label: 'Accepted',    color: '#60a5fa', icon: 'checkmark-circle-outline' },
  in_progress: { label: 'In Progress', color: '#a78bfa', icon: 'car-outline' },
  picked:      { label: 'Picked Up',   color: '#34d399', icon: 'cube-outline' },
  completed:   { label: 'Completed',   color: '#4ade80', icon: 'ribbon-outline' },
};

const NEXT_ACTION = {
  assigned:    { label: 'Accept Pickup',  next: 'accepted',    color: '#60a5fa' },
  accepted:    { label: 'Start Trip',     next: 'in_progress', color: '#a78bfa' },
  in_progress: { label: 'Mark Picked Up', next: 'picked',      color: '#34d399' },
  picked:      { label: 'Complete Order', next: 'completed',   color: '#4ade80' },
};

export default function PickupOrderDetails({ route, navigation }) {
  const { order: initialOrder } = route.params;
  const [status, setStatus] = useState(initialOrder.status);
  const [loading, setLoading] = useState(false);

  const order = { ...initialOrder, status };
  const currentStep = STATUS_STEPS.indexOf(status);
  const action = NEXT_ACTION[status];
  const isCompleted = status === 'completed';

  const handleAction = () => {
    if (!action) return;
    Alert.alert(
      action.label,
      `Confirm: "${action.label}" for this order?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setLoading(true);
            try {
              await updateDoc(doc(db, 'orders', order.id), {
                status: action.next,
                updatedAt: serverTimestamp(),
                ...(action.next === 'in_progress' && { tripStartedAt: serverTimestamp() }),
                ...(action.next === 'picked'      && { pickedUpAt: serverTimestamp() }),
                ...(action.next === 'completed'   && { completedAt: serverTimestamp() }),
              });
              setStatus(action.next);
            } catch (e) {
              Alert.alert('Error', e.code === 'permission-denied'
                ? 'Permission denied. Check Firestore rules.'
                : 'Could not update. Try again.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const timeStr = (ts) => ts?.toDate?.()?.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }) ?? '—';

  const currentCfg = STATUS_CONFIG[status] || STATUS_CONFIG.assigned;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#f1f5f9" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Order ID + Status */}
        <View style={styles.card}>
          <View style={styles.orderTopRow}>
            <View>
              <Text style={styles.orderLabel}>Pickup Assignment</Text>
              <Text style={styles.orderId}>#{order.id.slice(-6).toUpperCase()}</Text>
            </View>
            <View style={[styles.statusBadge, { borderColor: currentCfg.color }]}>
              <Ionicons name={currentCfg.icon} size={13} color={currentCfg.color} />
              <Text style={[styles.statusText, { color: currentCfg.color }]}>{currentCfg.label}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="business-outline" size={14} color="#64748b" />
            <Text style={styles.infoText}>{order.agencyName || 'Agency'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={14} color="#64748b" />
            <Text style={styles.infoText}>{timeStr(order.createdAt)}</Text>
          </View>
        </View>

        {/* Progress Timeline */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Progress Timeline</Text>
          {STATUS_STEPS.map((step, i) => {
            const cfg = STATUS_CONFIG[step];
            const done = i <= currentStep;
            const isLast = i === STATUS_STEPS.length - 1;
            return (
              <View key={step} style={styles.timelineRow}>
                <View style={styles.timelineLeft}>
                  <View style={[styles.timelineDot, done && { backgroundColor: cfg.color, borderColor: cfg.color }]}>
                    {done && <Ionicons name="checkmark" size={11} color="#0f172a" />}
                  </View>
                  {!isLast && <View style={[styles.timelineLine, i < currentStep && { backgroundColor: '#334155' }]} />}
                </View>
                <View style={styles.timelineContent}>
                  <Text style={[styles.timelineLabel, done && { color: cfg.color }]}>{cfg.label}</Text>
                  {i === currentStep && (
                    <Text style={styles.timelineCurrent}>Current status</Text>
                  )}
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
              <Text style={styles.matAmount}>₹{mat.subtotal?.toFixed(0)}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.totalsRow}>
            <View style={styles.totalItem}>
              <Text style={styles.totalLabel}>Total Weight</Text>
              <Text style={styles.totalValue}>{order.totalKg} kg</Text>
            </View>
            <View style={styles.totalDivider} />
            <View style={styles.totalItem}>
              <Text style={styles.totalLabel}>Est. Payout</Text>
              <Text style={[styles.totalValue, { color: '#60a5fa' }]}>₹{order.estimatedAmount}</Text>
            </View>
          </View>
        </View>

        {/* Seller Location */}
        {order.sellerLatitude ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Seller Location</Text>
            <View style={styles.coordRow}>
              <Ionicons name="location-outline" size={15} color="#34d399" />
              <Text style={styles.coordText}>
                {order.sellerLatitude.toFixed(5)}, {order.sellerLongitude.toFixed(5)}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.mapBtn}
              onPress={() => navigation.navigate('PickupMapScreen', { order })}
            >
              <Ionicons name="map-outline" size={18} color="#0f172a" />
              <Text style={styles.mapBtnText}>Open Map</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Seller Location</Text>
            <View style={styles.noLocationRow}>
              <Ionicons name="location-outline" size={15} color="#64748b" />
              <Text style={styles.noLocationText}>Location not provided by seller</Text>
            </View>
          </View>
        )}

        {/* Timestamps */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Activity Log</Text>
          {[
            { label: 'Order Created',  value: timeStr(order.createdAt) },
            { label: 'Last Updated',   value: timeStr(order.updatedAt) },
            { label: 'Trip Started',   value: timeStr(order.tripStartedAt) },
            { label: 'Picked Up',      value: timeStr(order.pickedUpAt) },
            { label: 'Completed',      value: timeStr(order.completedAt) },
          ].map(({ label, value }) => (
            <View key={label} style={styles.logRow}>
              <Text style={styles.logLabel}>{label}</Text>
              <Text style={[styles.logValue, value === '—' && { color: '#334155' }]}>{value}</Text>
            </View>
          ))}
        </View>

      </ScrollView>

      {/* Bottom Action */}
      {!isCompleted && action && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: action.color }, loading && { opacity: 0.6 }]}
            onPress={handleAction}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#0f172a" />
              : (
                <>
                  <Ionicons name="arrow-forward-circle-outline" size={20} color="#0f172a" />
                  <Text style={styles.actionBtnText}>{action.label}</Text>
                </>
              )
            }
          </TouchableOpacity>
        </View>
      )}

      {isCompleted && (
        <View style={styles.bottomBar}>
          <View style={styles.completedBar}>
            <Ionicons name="checkmark-circle" size={20} color="#4ade80" />
            <Text style={styles.completedText}>Order Successfully Completed</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#f1f5f9', fontSize: 20, fontWeight: '700' },

  content: { padding: 16, gap: 16, paddingBottom: 120 },

  card: {
    backgroundColor: '#1e293b', borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: '#334155',
  },
  sectionTitle: {
    color: '#94a3b8', fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14,
  },

  orderTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  orderLabel: { color: '#64748b', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  orderId: { color: '#f1f5f9', fontSize: 26, fontWeight: '800', marginTop: 2 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
  },
  statusText: { fontSize: 12, fontWeight: '700' },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  infoText: { color: '#94a3b8', fontSize: 13 },

  // Timeline
  timelineRow: { flexDirection: 'row', marginBottom: 4 },
  timelineLeft: { alignItems: 'center', width: 28, marginRight: 12 },
  timelineDot: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#1e293b', borderWidth: 2, borderColor: '#334155',
    alignItems: 'center', justifyContent: 'center',
  },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#1e293b', marginVertical: 2, minHeight: 16 },
  timelineContent: { flex: 1, paddingBottom: 16 },
  timelineLabel: { color: '#64748b', fontSize: 14, fontWeight: '600' },
  timelineCurrent: { color: '#2563eb', fontSize: 11, marginTop: 2, fontWeight: '600' },

  // Materials
  matRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  matDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#2563eb' },
  matName: { color: '#cbd5e1', fontSize: 14, flex: 1 },
  matQty: { color: '#94a3b8', fontSize: 13, width: 55, textAlign: 'right' },
  matAmount: { color: '#60a5fa', fontSize: 13, width: 65, textAlign: 'right', fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#334155', marginVertical: 12 },
  totalsRow: { flexDirection: 'row', alignItems: 'center' },
  totalItem: { flex: 1, alignItems: 'center' },
  totalLabel: { color: '#64748b', fontSize: 12, marginBottom: 4 },
  totalValue: { color: '#f1f5f9', fontSize: 18, fontWeight: '700' },
  totalDivider: { width: 1, height: 36, backgroundColor: '#334155' },

  // Location
  coordRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  coordText: { color: '#34d399', fontSize: 13 },
  mapBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#34d399', borderRadius: 12, paddingVertical: 12,
  },
  mapBtnText: { color: '#0f172a', fontSize: 15, fontWeight: '700' },
  noLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  noLocationText: { color: '#64748b', fontSize: 13 },

  // Log
  logRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1e293b',
  },
  logLabel: { color: '#64748b', fontSize: 13 },
  logValue: { color: '#94a3b8', fontSize: 13, fontWeight: '500' },

  // Bottom
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, backgroundColor: '#0f172a',
    borderTopWidth: 1, borderTopColor: '#334155',
  },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 14, paddingVertical: 16,
  },
  actionBtnText: { color: '#0f172a', fontSize: 16, fontWeight: '800' },
  completedBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#0a1f0a', borderRadius: 14, paddingVertical: 16,
    borderWidth: 1, borderColor: '#166534',
  },
  completedText: { color: '#4ade80', fontSize: 15, fontWeight: '700' },
});
