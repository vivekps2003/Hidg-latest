import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, StatusBar, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

const STATUS_STEPS = ['pending', 'accepted', 'picked_up', 'completed'];

const STATUS_CONFIG = {
  pending:   { label: 'Awaiting Review', color: '#fbbf24', icon: 'time-outline' },
  accepted:  { label: 'Accepted',        color: '#34d399', icon: 'checkmark-circle-outline' },
  picked_up: { label: 'Picked Up',       color: '#60a5fa', icon: 'car-outline' },
  completed: { label: 'Completed',       color: '#a78bfa', icon: 'ribbon-outline' },
  rejected:  { label: 'Rejected',        color: '#f87171', icon: 'close-circle-outline' },
};

export default function OrderTracking({ route, navigation }) {
  const { order } = route.params;
  const [currentStatus, setCurrentStatus] = useState(order.status);
  const [loading, setLoading] = useState(false);

  const statusCfg = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.pending;
  const currentStep = STATUS_STEPS.indexOf(currentStatus);

  const advanceStatus = async () => {
    const nextStatus = STATUS_STEPS[currentStep + 1];
    if (!nextStatus) return;

    Alert.alert(
      'Update Status',
      `Mark order as "${STATUS_CONFIG[nextStatus].label}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setLoading(true);
            try {
              await updateDoc(doc(db, 'orders', order.id), {
                status: nextStatus,
                updatedAt: serverTimestamp(),
                ...(nextStatus === 'picked_up' && { pickedUpAt: serverTimestamp() }),
                ...(nextStatus === 'completed' && { completedAt: serverTimestamp() }),
              });
              setCurrentStatus(nextStatus);
            } catch (e) {
              Alert.alert('Error', e.code === 'permission-denied'
                ? 'Permission denied. Check Firestore rules.'
                : 'Could not update status. Try again.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const nextStatus = STATUS_STEPS[currentStep + 1];
  const isTerminal = currentStatus === 'completed' || currentStatus === 'rejected';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={26} color="#f1f5f9" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Tracking</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Order ID + Status */}
        <View style={styles.card}>
          <Text style={styles.orderIdLabel}>Order</Text>
          <Text style={styles.orderId}>#{order.id.slice(-6).toUpperCase()}</Text>
          <View style={[styles.statusBadge, { borderColor: statusCfg.color }]}>
            <Ionicons name={statusCfg.icon} size={14} color={statusCfg.color} />
            <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
          </View>
        </View>

        {/* Progress Steps */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Progress</Text>
          {STATUS_STEPS.map((step, i) => {
            const done = i <= currentStep;
            const cfg = STATUS_CONFIG[step];
            return (
              <View key={step} style={styles.stepRow}>
                <View style={[styles.stepDot, done && { backgroundColor: cfg.color }]}>
                  {done && <Ionicons name="checkmark" size={12} color="#0f172a" />}
                </View>
                {i < STATUS_STEPS.length - 1 && (
                  <View style={[styles.stepLine, i < currentStep && { backgroundColor: '#34d399' }]} />
                )}
                <Text style={[styles.stepLabel, done && { color: cfg.color }]}>{cfg.label}</Text>
              </View>
            );
          })}
        </View>

        {/* Materials */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Materials</Text>
          {(order.materials || []).map((mat, i) => (
            <View key={i} style={styles.matRow}>
              <Text style={styles.matName}>{mat.materialName}</Text>
              <Text style={styles.matQty}>{mat.quantityKg} kg</Text>
              <Text style={styles.matAmount}>₹{mat.subtotal?.toFixed(0)}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.matRow}>
            <Text style={[styles.matName, { color: '#f1f5f9', fontWeight: '700' }]}>Total</Text>
            <Text style={[styles.matQty, { color: '#f1f5f9' }]}>{order.totalKg} kg</Text>
            <Text style={[styles.matAmount, { color: '#60a5fa', fontWeight: '700' }]}>₹{order.estimatedAmount}</Text>
          </View>
        </View>

        {/* Location */}
        {order.sellerLatitude && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Seller Location</Text>
            <View style={styles.locationRow}>
              <Ionicons name="navigate-circle-outline" size={16} color="#34d399" />
              <Text style={styles.locationText}>
                {order.sellerLatitude.toFixed(5)}, {order.sellerLongitude.toFixed(5)}
              </Text>
            </View>
          </View>
        )}

        {/* Advance Status Button */}
        {!isTerminal && nextStatus && (
          <TouchableOpacity
            style={[styles.advanceBtn, loading && { opacity: 0.6 }]}
            onPress={advanceStatus}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#0f172a" />
            ) : (
              <>
                <Ionicons name="arrow-forward-circle-outline" size={20} color="#0f172a" />
                <Text style={styles.advanceBtnText}>
                  Mark as {STATUS_CONFIG[nextStatus].label}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {isTerminal && (
          <View style={styles.terminalBadge}>
            <Ionicons name={statusCfg.icon} size={18} color={statusCfg.color} />
            <Text style={[styles.terminalText, { color: statusCfg.color }]}>
              Order {statusCfg.label}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
  },
  headerTitle: { color: '#f1f5f9', fontSize: 20, fontWeight: '700' },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#1e293b', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#334155',
  },
  orderIdLabel: { color: '#64748b', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  orderId: { color: '#f1f5f9', fontSize: 26, fontWeight: '800', marginVertical: 4 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5, marginTop: 4,
  },
  statusText: { fontSize: 13, fontWeight: '700' },
  sectionTitle: { color: '#94a3b8', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginBottom: 12 },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 },
  stepDot: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: '#334155',
    alignItems: 'center', justifyContent: 'center',
  },
  stepLine: { position: 'absolute', left: 10, top: 22, width: 2, height: 16, backgroundColor: '#334155' },
  stepLabel: { color: '#64748b', fontSize: 14, fontWeight: '600' },
  matRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  matName: { color: '#cbd5e1', fontSize: 14, flex: 1 },
  matQty: { color: '#94a3b8', fontSize: 13, width: 60, textAlign: 'right' },
  matAmount: { color: '#60a5fa', fontSize: 13, width: 70, textAlign: 'right' },
  divider: { height: 1, backgroundColor: '#334155', marginVertical: 8 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locationText: { color: '#34d399', fontSize: 13 },
  advanceBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#34d399', borderRadius: 14, paddingVertical: 16,
  },
  advanceBtnText: { color: '#0f172a', fontSize: 16, fontWeight: '800' },
  terminalBadge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 14, paddingVertical: 16,
    backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155',
  },
  terminalText: { fontSize: 16, fontWeight: '700' },
});
