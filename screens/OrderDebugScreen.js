import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { C, R } from '../theme';

const ALL_STATUSES = [
  'pending', 'accepted', 'assigned', 'in_progress', 'picked_up',
  'weight_verified', 'verified', 'payment_received', 'completed'
];

export default function OrderDebugScreen({ navigation }) {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const q = query(collection(db, 'orders'), where('sellerId', '==', uid));
    const unsub = onSnapshot(q, snap => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const changeStatus = async (orderId, newStatus) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      Alert.alert('Success', `Status changed to: ${newStatus}`);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Debug</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.info}>
          Use this screen to manually change order status for testing.
        </Text>

        {orders.map(order => (
          <View key={order.id} style={styles.card}>
            <Text style={styles.orderId}>Order #{order.id.slice(-6).toUpperCase()}</Text>
            <Text style={styles.currentStatus}>
              Current Status: <Text style={{ color: C.primary, fontWeight: '700' }}>{order.status}</Text>
            </Text>

            <Text style={styles.sectionTitle}>Change Status To:</Text>
            <View style={styles.statusGrid}>
              {ALL_STATUSES.map(status => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.statusBtn,
                    order.status === status && styles.statusBtnActive
                  ]}
                  onPress={() => changeStatus(order.id, status)}
                >
                  <Text style={[
                    styles.statusBtnText,
                    order.status === status && styles.statusBtnTextActive
                  ]}>
                    {status}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>Order Details:</Text>
              <Text style={styles.infoText}>Agency: {order.agencyName}</Text>
              <Text style={styles.infoText}>Weight: {order.totalKg} kg</Text>
              <Text style={styles.infoText}>Amount: ₹{order.estimatedAmount}</Text>
              {order.pickupAgentName && (
                <Text style={styles.infoText}>Pickup Agent: {order.pickupAgentName}</Text>
              )}
              {order.commissionPerKg && (
                <Text style={styles.infoText}>Commission: ₹{order.commissionPerKg}/kg</Text>
              )}
            </View>
          </View>
        ))}

        {orders.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No orders found. Create an order first.</Text>
          </View>
        )}
      </ScrollView>
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
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.textPrimary },
  content: { padding: 16, paddingBottom: 40 },
  info: {
    backgroundColor: '#fef3c7', padding: 12, borderRadius: R.md,
    marginBottom: 16, color: '#92400e', fontSize: 13,
  },
  card: {
    backgroundColor: C.surface, borderRadius: R.xl, padding: 16,
    borderWidth: 1, borderColor: C.border, marginBottom: 16,
  },
  orderId: { fontSize: 18, fontWeight: '700', color: C.textPrimary, marginBottom: 8 },
  currentStatus: { fontSize: 14, color: C.textSecondary, marginBottom: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: C.textMuted, marginBottom: 12 },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  statusBtn: {
    backgroundColor: C.surfaceAlt, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: R.sm, borderWidth: 1, borderColor: C.border,
  },
  statusBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  statusBtnText: { fontSize: 11, color: C.textSecondary, fontWeight: '600' },
  statusBtnTextActive: { color: '#fff' },
  infoBox: {
    backgroundColor: C.surfaceAlt, padding: 12, borderRadius: R.md,
  },
  infoTitle: { fontSize: 12, fontWeight: '700', color: C.textMuted, marginBottom: 8 },
  infoText: { fontSize: 12, color: C.textSecondary, marginBottom: 4 },
  empty: { alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 14, color: C.textMuted, textAlign: 'center' },
});
