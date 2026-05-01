import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, Alert, ActivityIndicator, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { sendNotification, NotificationTemplates } from '../notificationHelper';

export default function AdminPaymentDistribution({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    const q = query(
      collection(db, 'orders'),
      where('paymentStatus', '==', 'paid'),
      where('paymentDistribution.distributionStatus', '==', 'pending')
    );

    const unsub = onSnapshot(q, snap => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, err => {
      console.error('Error fetching orders:', err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleDistribute = async (order) => {
    const dist = order.paymentDistribution;
    
    Alert.alert(
      'Distribute Payment',
      `Total Received: ₹${dist.totalPaid}\n\nDistribute:\n→ Seller: ₹${dist.sellerAmount}\n→ Pickup: ₹${dist.pickupAgentAmount}\n→ Admin: ₹${dist.adminCommission}\n\nConfirm distribution?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Distribute',
          onPress: async () => {
            setProcessing(order.id);
            try {
              await updateDoc(doc(db, 'orders', order.id), {
                'paymentDistribution.distributionStatus': 'completed',
                'paymentDistribution.distributedAt': serverTimestamp(),
                'paymentDistribution.distributedBy': auth.currentUser?.uid,
                status: 'completed',
                completedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
              
              // Send notifications to seller and pickup agent
              if (order.sellerId) {
                const notif = NotificationTemplates.paymentDistributed(dist.sellerAmount.toFixed(0));
                await sendNotification(order.sellerId, notif.type, notif.message, order.id);
              }
              if (order.pickupAgentId && dist.pickupAgentAmount > 0) {
                const notif = NotificationTemplates.paymentDistributedAgent(dist.pickupAgentAmount.toFixed(0));
                await sendNotification(order.pickupAgentId, notif.type, notif.message, order.id);
              }
              
              Alert.alert('Success', 'Payment distributed to all parties!');
            } catch (e) {
              console.error('Distribution error:', e);
              Alert.alert('Error', `Failed to distribute: ${e.message}`);
            } finally {
              setProcessing(null);
            }
          },
        },
      ]
    );
  };

  const renderOrder = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.orderId}>Order #{item.id.slice(-6).toUpperCase()}</Text>
        <View style={styles.badge}>
          <Ionicons name="cash" size={12} color="#10b981" />
          <Text style={styles.badgeText}>Payment Received</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.infoRow}>
        <Ionicons name="business-outline" size={14} color="#666" />
        <Text style={styles.infoText}>Agency: {item.agencyName || 'N/A'}</Text>
      </View>

      <View style={styles.infoRow}>
        <Ionicons name="person-outline" size={14} color="#666" />
        <Text style={styles.infoText}>Seller: {item.sellerName || 'N/A'}</Text>
      </View>

      <View style={styles.divider} />

      <Text style={styles.sectionTitle}>Distribution Breakdown:</Text>

      <View style={styles.distRow}>
        <Text style={styles.distLabel}>→ To Seller</Text>
        <Text style={[styles.distValue, { color: '#10b981' }]}>
          ₹{item.paymentDistribution.sellerAmount.toFixed(0)}
        </Text>
      </View>

      {item.paymentDistribution.pickupAgentAmount > 0 && (
        <View style={styles.distRow}>
          <Text style={styles.distLabel}>→ To Pickup Agent</Text>
          <Text style={[styles.distValue, { color: '#3b82f6' }]}>
            ₹{item.paymentDistribution.pickupAgentAmount.toFixed(0)}
          </Text>
        </View>
      )}

      <View style={styles.distRow}>
        <Text style={styles.distLabel}>→ Admin Commission</Text>
        <Text style={[styles.distValue, { color: '#8b5cf6' }]}>
          ₹{item.paymentDistribution.adminCommission.toFixed(0)}
        </Text>
      </View>

      <View style={[styles.distRow, styles.totalRow]}>
        <Text style={styles.totalLabel}>Total Received</Text>
        <Text style={styles.totalValue}>
          ₹{item.paymentDistribution.totalPaid.toFixed(0)}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.distributeBtn, processing === item.id && { opacity: 0.6 }]}
        onPress={() => handleDistribute(item)}
        disabled={processing === item.id}
      >
        {processing === item.id ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="checkmark-done" size={18} color="#fff" />
            <Text style={styles.distributeBtnText}>Distribute Payment</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Distribution</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Loading payments...</Text>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.centered}>
          <View style={styles.emptyIcon}>
            <Ionicons name="wallet-outline" size={40} color="#9ca3af" />
          </View>
          <Text style={styles.emptyTitle}>No Pending Distributions</Text>
          <Text style={styles.emptySub}>Payments will appear here when received from agencies</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrder}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111' },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
  loadingText: { color: '#6b7280', fontSize: 15 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111' },
  emptySub: { fontSize: 14, color: '#6b7280', textAlign: 'center' },

  list: { padding: 16, gap: 16, paddingBottom: 40 },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  orderId: { fontSize: 18, fontWeight: '800', color: '#111' },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#d1fae5', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: '#6ee7b7',
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#10b981' },

  divider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 12 },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  infoText: { fontSize: 13, color: '#6b7280' },

  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#111', marginBottom: 10, marginTop: 4 },

  distRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  distLabel: { fontSize: 14, color: '#6b7280' },
  distValue: { fontSize: 14, fontWeight: '700' },

  totalRow: { borderTopWidth: 2, borderTopColor: '#8b5cf6', paddingTop: 10, marginTop: 8 },
  totalLabel: { fontSize: 16, fontWeight: '800', color: '#111' },
  totalValue: { fontSize: 18, fontWeight: '900', color: '#8b5cf6' },

  distributeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#8b5cf6', borderRadius: 12, paddingVertical: 14, marginTop: 16,
  },
  distributeBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
