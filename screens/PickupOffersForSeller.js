import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { C, S, R } from '../theme';
import { sendNotification, NotificationTemplates } from '../notificationHelper';

export default function PickupOffersForSeller({ route, navigation }) {
  const { order } = route.params;
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(null);

  useEffect(() => {
    const q = query(
      collection(db, 'pickup_offers'),
      where('orderId', '==', order.id),
      where('status', '==', 'pending')
    );
    const unsub = onSnapshot(q, snap => {
      setOffers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, err => {
      Alert.alert('Error', err.message);
      setLoading(false);
    });
    return () => unsub();
  }, [order.id]);

  const handleAcceptOffer = async (offer) => {
    Alert.alert(
      'Accept Offer',
      `Accept ${offer.pickupAgentName}'s offer of ₹${offer.commissionPerKg}/kg?\n\nYour net payout: ₹${offer.sellerNetAmount}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            setAccepting(offer.id);
            try {
              // Update order with pickup agent details
              await updateDoc(doc(db, 'orders', order.id), {
                pickupAgentId: offer.pickupAgentId,
                pickupAgentName: offer.pickupAgentName,
                commissionPerKg: offer.commissionPerKg,
                totalCommission: offer.totalCommission,
                sellerNetAmount: offer.sellerNetAmount,
                status: 'assigned',
                assignedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });

              // Update offer status
              await updateDoc(doc(db, 'pickup_offers', offer.id), {
                status: 'accepted',
                acceptedAt: serverTimestamp(),
              });

              // Send notification to pickup agent
              try {
                const notif = NotificationTemplates.offerAccepted(order.sellerName || 'Seller');
                await sendNotification(offer.pickupAgentId, notif.type, notif.message, order.id);
              } catch (notifErr) {
                console.error('Notification error:', notifErr);
              }

              Alert.alert('Success!', 'Pickup agent assigned. They will contact you soon.');
              navigation.goBack();
            } catch (e) {
              Alert.alert('Error', 'Failed to accept offer. Try again.');
            } finally {
              setAccepting(null);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pickup Offers</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.orderCard}>
        <Text style={styles.orderLabel}>Order #{order.id.slice(-6).toUpperCase()}</Text>
        <View style={styles.orderStats}>
          <View style={styles.orderStat}>
            <Text style={styles.orderStatLabel}>Weight</Text>
            <Text style={styles.orderStatValue}>{order.totalKg} kg</Text>
          </View>
          <View style={styles.orderStatDivider} />
          <View style={styles.orderStat}>
            <Text style={styles.orderStatLabel}>Gross Payout</Text>
            <Text style={[styles.orderStatValue, { color: C.primary }]}>₹{order.estimatedAmount}</Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loadingText}>Loading offers...</Text>
        </View>
      ) : offers.length === 0 ? (
        <View style={styles.centered}>
          <View style={styles.emptyIcon}><Ionicons name="hourglass-outline" size={36} color={C.textMuted} /></View>
          <Text style={styles.emptyTitle}>No Offers Yet</Text>
          <Text style={styles.emptySub}>Pickup agents will send commission offers soon.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          <Text style={styles.sectionTitle}>{offers.length} Offer{offers.length !== 1 ? 's' : ''} Received</Text>
          {offers.map(offer => (
            <View key={offer.id} style={styles.offerCard}>
              <View style={styles.offerHeader}>
                <View style={styles.agentAvatar}>
                  <Ionicons name="person" size={20} color={C.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.agentName}>{offer.pickupAgentName}</Text>
                  <Text style={styles.offerTime}>
                    {offer.createdAt?.toDate?.()?.toLocaleString('en-IN', { 
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
                    }) || 'Just now'}
                  </Text>
                </View>
              </View>

              <View style={styles.commissionBox}>
                <View style={styles.commissionRow}>
                  <Text style={styles.commissionLabel}>Commission Rate</Text>
                  <Text style={styles.commissionValue}>₹{offer.commissionPerKg}/kg</Text>
                </View>
                <View style={styles.commissionRow}>
                  <Text style={styles.commissionLabel}>Total Commission</Text>
                  <Text style={[styles.commissionValue, { color: C.danger }]}>−₹{offer.totalCommission}</Text>
                </View>
                <View style={[styles.commissionRow, styles.netRow]}>
                  <Text style={styles.netLabel}>Your Net Payout</Text>
                  <Text style={styles.netValue}>₹{offer.sellerNetAmount}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.acceptBtn, accepting === offer.id && { opacity: 0.6 }]}
                onPress={() => handleAcceptOffer(offer)}
                disabled={accepting === offer.id}
              >
                {accepting === offer.id ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="#fff" />
                    <Text style={styles.acceptBtnText}>Accept Offer</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
  loadingText: { color: C.textMuted, fontSize: 15 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.textPrimary },

  orderCard: {
    backgroundColor: C.primaryLight, margin: 16, borderRadius: R.lg, padding: 14,
    borderWidth: 1, borderColor: C.border,
  },
  orderLabel: { fontSize: 13, fontWeight: '600', color: C.textSecondary, marginBottom: 8 },
  orderStats: { flexDirection: 'row', alignItems: 'center' },
  orderStat: { flex: 1, alignItems: 'center' },
  orderStatLabel: { fontSize: 11, color: C.textMuted, marginBottom: 4 },
  orderStatValue: { fontSize: 16, fontWeight: '700', color: C.textPrimary },
  orderStatDivider: { width: 1, height: 30, backgroundColor: C.border },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.textPrimary, marginBottom: 12, paddingHorizontal: 16 },
  list: { paddingBottom: 40 },

  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.textPrimary },
  emptySub: { fontSize: 14, color: C.textMuted, textAlign: 'center' },

  offerCard: {
    backgroundColor: C.surface, marginHorizontal: 16, marginBottom: 12,
    borderRadius: R.xl, padding: 16, borderWidth: 1, borderColor: C.border, ...S.card,
  },
  offerHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  agentAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  agentName: { fontSize: 16, fontWeight: '700', color: C.textPrimary },
  offerTime: { fontSize: 12, color: C.textMuted, marginTop: 2 },

  commissionBox: { backgroundColor: C.surfaceAlt, borderRadius: R.md, padding: 12, marginBottom: 14 },
  commissionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  commissionLabel: { fontSize: 13, color: C.textSecondary },
  commissionValue: { fontSize: 13, fontWeight: '600', color: C.textPrimary },
  netRow: { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 8, marginTop: 4 },
  netLabel: { fontSize: 15, fontWeight: '700', color: C.textPrimary },
  netValue: { fontSize: 16, fontWeight: '800', color: C.success },

  acceptBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.success, borderRadius: R.md, paddingVertical: 13, ...S.btn,
  },
  acceptBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
