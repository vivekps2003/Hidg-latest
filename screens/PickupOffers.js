import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { P, PS, PR } from '../pickupTheme';

const getDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export default function PickupOffers({ navigation }) {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [agentLocation, setAgentLocation] = useState(null);
  const [acceptingId, setAcceptingId] = useState(null);
  const [fetchTick, setFetchTick] = useState(0);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    getDoc(doc(db, 'users', uid)).then(snap => {
      if (snap.exists()) { const d = snap.data(); if (d.latitude && d.longitude) setAgentLocation({ latitude: d.latitude, longitude: d.longitude }); }
    });
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'orders'), where('status', '==', 'pending_pickup'), where('pickupRequested', '==', true));
    const unsub = onSnapshot(q, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (getDistance(agentLocation?.latitude, agentLocation?.longitude, a.sellerLatitude, a.sellerLongitude) ?? 999) - (getDistance(agentLocation?.latitude, agentLocation?.longitude, b.sellerLatitude, b.sellerLongitude) ?? 999));
      setOffers(data); setLoading(false); setRefreshing(false);
    }, err => { setLoading(false); setRefreshing(false); });
    return () => unsub();
  }, [fetchTick, agentLocation]);

  const handleAccept = useCallback(async (offer) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const dist = getDistance(agentLocation?.latitude, agentLocation?.longitude, offer.sellerLatitude, offer.sellerLongitude);
    Alert.alert(
      'Accept Pickup Offer',
      `Commission: ₹${offer.commissionPerKg}/kg × ${offer.totalKg} kg = ₹${offer.totalCommission}\n${dist != null ? `Distance: ${dist.toFixed(1)} km` : ''}\nDeliver to: ${offer.agencyName}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept & Earn ₹' + offer.totalCommission,
          onPress: async () => {
            setAcceptingId(offer.id);
            try {
              const agentSnap = await getDoc(doc(db, 'users', uid));
              await updateDoc(doc(db, 'orders', offer.id), { pickupAgentId: uid, pickupAgentName: agentSnap.data()?.name || 'Agent', status: 'assigned', assignedAt: serverTimestamp(), updatedAt: serverTimestamp() });
              Alert.alert('Accepted! 🎉', `Go to "My Pickups" to manage this delivery.`);
            } catch (e) {
              Alert.alert('Error', e.code === 'permission-denied' ? 'Permission denied.' : 'Could not accept. Try again.');
            } finally { setAcceptingId(null); }
          },
        },
      ]
    );
  }, [agentLocation]);

  if (loading) return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={P.bg} />
      <View style={styles.centered}><ActivityIndicator size="large" color={P.primary} /><Text style={styles.loadingText}>Finding offers...</Text></View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={P.bg} />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Pickup Offers</Text>
          <Text style={styles.headerSub}>{offers.length > 0 ? `${offers.length} open offer${offers.length > 1 ? 's' : ''} near you` : 'No open offers right now'}</Text>
        </View>
        {offers.length > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{offers.length}</Text></View>}
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setFetchTick(t => t + 1); }} tintColor={P.primary} colors={[P.primary]} />}
      >
        {offers.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIcon}><Ionicons name="pricetag-outline" size={36} color={P.textMuted} /></View>
            <Text style={styles.emptyTitle}>No Pickup Offers</Text>
            <Text style={styles.emptySub}>When sellers post below-minimum orders with a commission, they'll appear here.</Text>
          </View>
        ) : (
          offers.map(offer => {
            const dist = getDistance(agentLocation?.latitude, agentLocation?.longitude, offer.sellerLatitude, offer.sellerLongitude);
            const timeStr = offer.createdAt?.toDate?.()?.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) ?? 'Just now';
            const isAccepting = acceptingId === offer.id;

            return (
              <View key={offer.id} style={styles.card}>
                {/* Header */}
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardLabel}>Pickup Offer</Text>
                    <Text style={styles.cardId}>#{offer.id.slice(-6).toUpperCase()}</Text>
                  </View>
                  <View style={styles.commBadge}>
                    <Ionicons name="cash-outline" size={12} color={P.primaryDark} />
                    <Text style={styles.commBadgeText}>₹{offer.commissionPerKg}/kg</Text>
                  </View>
                </View>

                <View style={styles.metaRow}><Ionicons name="business-outline" size={13} color={P.textMuted} /><Text style={styles.metaText}>Deliver to: {offer.agencyName}</Text></View>
                <View style={styles.metaRow}><Ionicons name="calendar-outline" size={13} color={P.textMuted} /><Text style={styles.metaText}>{timeStr}</Text></View>

                <View style={styles.divider} />

                {/* Earning highlight */}
                <View style={styles.earningRow}>
                  <View style={styles.earningItem}>
                    <Text style={styles.earningLabel}>Your Earning</Text>
                    <Text style={styles.earningValue}>₹{offer.totalCommission}</Text>
                  </View>
                  <View style={styles.earningDivider} />
                  <View style={styles.earningItem}>
                    <Text style={styles.earningLabel}>Weight</Text>
                    <Text style={styles.earningValue}>{offer.totalKg} kg</Text>
                  </View>
                  <View style={styles.earningDivider} />
                  <View style={styles.earningItem}>
                    <Text style={styles.earningLabel}>Distance</Text>
                    <Text style={styles.earningValue}>{dist != null ? `${dist.toFixed(1)} km` : '—'}</Text>
                  </View>
                </View>

                {/* Materials */}
                <View style={styles.matsBox}>
                  {(offer.materials || []).map((mat, i) => (
                    <View key={i} style={styles.matRow}>
                      <View style={styles.matDot} />
                      <Text style={styles.matName}>{mat.materialName}</Text>
                      <Text style={styles.matQty}>{mat.quantityKg} kg</Text>
                    </View>
                  ))}
                </View>

                {offer.sellerLatitude && (
                  <TouchableOpacity style={styles.locationChip} onPress={() => navigation.navigate('PickupMapScreen', { order: offer })}>
                    <Ionicons name="location-outline" size={13} color={P.primary} />
                    <Text style={styles.locationText}>{offer.sellerLatitude.toFixed(4)}, {offer.sellerLongitude.toFixed(4)}</Text>
                    <Text style={[styles.locationText, { fontWeight: '700' }]}>View Map →</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={[styles.acceptBtn, isAccepting && { opacity: 0.6 }]} onPress={() => handleAccept(offer)} disabled={isAccepting}>
                  {isAccepting ? <ActivityIndicator color="#fff" /> : (
                    <><Ionicons name="checkmark-circle-outline" size={20} color="#fff" /><Text style={styles.acceptBtnText}>Accept — Earn ₹{offer.totalCommission}</Text></>
                  )}
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: P.textMuted, fontSize: 15 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, backgroundColor: P.surface, borderBottomWidth: 1, borderBottomColor: P.border },
  headerTitle: { fontSize: 22, fontWeight: '800', color: P.textPrimary },
  headerSub: { fontSize: 13, color: P.textMuted, marginTop: 2 },
  badge: { backgroundColor: P.primary, borderRadius: 20, minWidth: 32, height: 32, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  badgeText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  list: { padding: 16, gap: 14, paddingBottom: 40 },
  emptyBox: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: P.primaryLight, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: P.textPrimary },
  emptySub: { fontSize: 14, color: P.textMuted, textAlign: 'center', paddingHorizontal: 40 },

  card: { backgroundColor: P.surface, borderRadius: PR.xl, padding: 16, borderWidth: 1, borderColor: P.border, ...PS.card },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  cardLabel: { fontSize: 11, color: P.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
  cardId: { fontSize: 20, fontWeight: '800', color: P.textPrimary, marginTop: 2 },
  commBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: P.primaryLight, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: P.border },
  commBadgeText: { color: P.primaryDark, fontSize: 12, fontWeight: '700' },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  metaText: { color: P.textMuted, fontSize: 12 },
  divider: { height: 1, backgroundColor: P.border, marginVertical: 12 },

  earningRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: P.primaryLight, borderRadius: PR.md, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: P.border },
  earningItem: { flex: 1, alignItems: 'center' },
  earningLabel: { fontSize: 11, color: P.primaryDark, marginBottom: 3, fontWeight: '600' },
  earningValue: { fontSize: 16, fontWeight: '800', color: P.primaryDark },
  earningDivider: { width: 1, height: 30, backgroundColor: P.border },

  matsBox: { backgroundColor: P.surfaceAlt, borderRadius: PR.md, padding: 10, marginBottom: 10, gap: 6 },
  matRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  matDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: P.primary },
  matName: { flex: 1, fontSize: 13, color: P.textSecondary },
  matQty: { fontSize: 13, color: P.textMuted },

  locationChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: P.primaryLight, borderRadius: PR.sm, paddingHorizontal: 10, paddingVertical: 7, marginBottom: 10, borderWidth: 1, borderColor: P.border },
  locationText: { color: P.primaryDark, fontSize: 11, flex: 1 },

  acceptBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: P.primary, borderRadius: PR.lg, paddingVertical: 14, ...PS.btn },
  acceptBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
