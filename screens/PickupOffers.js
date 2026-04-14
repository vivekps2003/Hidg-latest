import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebase';
import {
  collection, query, where, onSnapshot,
  doc, updateDoc, serverTimestamp, getDoc,
} from 'firebase/firestore';

const getDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export default function PickupOffers({ navigation }) {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [agentLocation, setAgentLocation] = useState(null);
  const [acceptingId, setAcceptingId] = useState(null);
  const [fetchTick, setFetchTick] = useState(0);

  // Load agent's location from their profile
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    getDoc(doc(db, 'users', uid)).then(snap => {
      if (snap.exists()) {
        const d = snap.data();
        if (d.latitude && d.longitude)
          setAgentLocation({ latitude: d.latitude, longitude: d.longitude });
      }
    });
  }, []);

  // Listen for open pickup offers
  useEffect(() => {
    const q = query(
      collection(db, 'orders'),
      where('status', '==', 'pending_pickup'),
      where('pickupRequested', '==', true)
    );

    const unsub = onSnapshot(q, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort by distance if agent location available, else by time
      data.sort((a, b) => {
        const dA = getDistance(agentLocation?.latitude, agentLocation?.longitude, a.sellerLatitude, a.sellerLongitude) ?? 999;
        const dB = getDistance(agentLocation?.latitude, agentLocation?.longitude, b.sellerLatitude, b.sellerLongitude) ?? 999;
        return dA - dB;
      });
      setOffers(data);
      setLoading(false);
      setRefreshing(false);
    }, err => {
      console.error('PickupOffers error:', err.message);
      setLoading(false);
      setRefreshing(false);
    });

    return () => unsub();
  }, [fetchTick, agentLocation]);

  const handleAccept = useCallback(async (offer) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const dist = getDistance(agentLocation?.latitude, agentLocation?.longitude, offer.sellerLatitude, offer.sellerLongitude);
    const distStr = dist != null ? ` (${dist.toFixed(1)} km away)` : '';

    Alert.alert(
      'Accept Pickup Offer',
      `Accept this pickup offer?\n\nCommission: ₹${offer.commissionPerKg}/kg × ${offer.totalKg} kg = ₹${offer.totalCommission}\nSeller location${distStr}\n\nYou will collect from seller and deliver to ${offer.agencyName}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            setAcceptingId(offer.id);
            try {
              // Get agent name
              const agentSnap = await getDoc(doc(db, 'users', uid));
              const agentName = agentSnap.data()?.name || 'Pickup Agent';

              await updateDoc(doc(db, 'orders', offer.id), {
                pickupAgentId: uid,
                pickupAgentName: agentName,
                status: 'assigned',
                assignedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });

              Alert.alert(
                'Offer Accepted!',
                `Go to "My Pickups" to manage this delivery.\n\nCollect from seller and deliver to ${offer.agencyName}.`,
                [{ text: 'OK' }]
              );
            } catch (e) {
              Alert.alert('Error', e.code === 'permission-denied'
                ? 'Permission denied. Check Firestore rules.'
                : 'Could not accept. Try again.');
            } finally {
              setAcceptingId(null);
            }
          },
        },
      ]
    );
  }, [agentLocation]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Finding pickup offers...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Pickup Offers</Text>
          <Text style={styles.headerSub}>
            {offers.length > 0 ? `${offers.length} open offer${offers.length > 1 ? 's' : ''} near you` : 'No open offers right now'}
          </Text>
        </View>
        {offers.length > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{offers.length}</Text>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); setFetchTick(t => t + 1); }}
            tintColor="#2563eb"
          />
        }
      >
        {offers.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="cube-outline" size={56} color="#334155" />
            <Text style={styles.emptyTitle}>No Pickup Offers</Text>
            <Text style={styles.emptySubtitle}>
              When sellers post below-minimum orders with a commission offer, they'll appear here.
            </Text>
          </View>
        ) : (
          offers.map(offer => {
            const dist = getDistance(
              agentLocation?.latitude, agentLocation?.longitude,
              offer.sellerLatitude, offer.sellerLongitude
            );
            const timeStr = offer.createdAt?.toDate?.()?.toLocaleString('en-IN', {
              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
            }) ?? 'Just now';
            const isAccepting = acceptingId === offer.id;

            return (
              <View key={offer.id} style={styles.card}>

                {/* Header */}
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardLabel}>Pickup Offer</Text>
                    <Text style={styles.cardId}>#{offer.id.slice(-6).toUpperCase()}</Text>
                  </View>
                  <View style={styles.commissionBadge}>
                    <Ionicons name="cash-outline" size={12} color="#4ade80" />
                    <Text style={styles.commissionBadgeText}>₹{offer.commissionPerKg}/kg</Text>
                  </View>
                </View>

                {/* Agency + Time */}
                <View style={styles.metaRow}>
                  <Ionicons name="business-outline" size={13} color="#64748b" />
                  <Text style={styles.metaText}>Deliver to: {offer.agencyName}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Ionicons name="calendar-outline" size={13} color="#64748b" />
                  <Text style={styles.metaText}>{timeStr}</Text>
                </View>

                <View style={styles.divider} />

                {/* Stats */}
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Weight</Text>
                    <Text style={styles.statValue}>{offer.totalKg} kg</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Your Earning</Text>
                    <Text style={[styles.statValue, { color: '#4ade80' }]}>₹{offer.totalCommission}</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Distance</Text>
                    <Text style={styles.statValue}>
                      {dist != null ? `${dist.toFixed(1)} km` : '—'}
                    </Text>
                  </View>
                </View>

                {/* Materials */}
                <View style={styles.materialsBox}>
                  {(offer.materials || []).map((mat, i) => (
                    <View key={i} style={styles.matRow}>
                      <View style={styles.matDot} />
                      <Text style={styles.matName}>{mat.materialName}</Text>
                      <Text style={styles.matQty}>{mat.quantityKg} kg</Text>
                    </View>
                  ))}
                </View>

                {/* Location */}
                {offer.sellerLatitude && (
                  <TouchableOpacity
                    style={styles.locationChip}
                    onPress={() => navigation.navigate('PickupMapScreen', { order: offer })}
                  >
                    <Ionicons name="navigate-circle-outline" size={14} color="#34d399" />
                    <Text style={styles.locationText}>
                      {offer.sellerLatitude.toFixed(4)}, {offer.sellerLongitude.toFixed(4)}
                    </Text>
                    <Ionicons name="map-outline" size={13} color="#34d399" />
                    <Text style={styles.locationText}>View Map</Text>
                  </TouchableOpacity>
                )}

                {/* Accept Button */}
                <TouchableOpacity
                  style={[styles.acceptBtn, isAccepting && { opacity: 0.6 }]}
                  onPress={() => handleAccept(offer)}
                  disabled={isAccepting}
                >
                  {isAccepting
                    ? <ActivityIndicator color="#0f172a" />
                    : (
                      <>
                        <Ionicons name="checkmark-circle-outline" size={20} color="#0f172a" />
                        <Text style={styles.acceptBtnText}>Accept — Earn ₹{offer.totalCommission}</Text>
                      </>
                    )
                  }
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
  container: { flex: 1, backgroundColor: '#0f172a' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#64748b', fontSize: 15 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
  },
  headerTitle: { color: '#f1f5f9', fontSize: 24, fontWeight: '800' },
  headerSub: { color: '#64748b', fontSize: 13, marginTop: 2 },
  badge: {
    backgroundColor: '#4ade80', borderRadius: 20, minWidth: 32, height: 32,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10,
  },
  badgeText: { color: '#0f172a', fontSize: 15, fontWeight: '800' },

  listContent: { padding: 16, paddingBottom: 40, gap: 16 },

  emptyBox: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyTitle: { color: '#cbd5e1', fontSize: 20, fontWeight: '700' },
  emptySubtitle: { color: '#64748b', fontSize: 14, textAlign: 'center', paddingHorizontal: 40 },

  card: { backgroundColor: '#1e293b', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#334155' },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  cardLabel: { color: '#64748b', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  cardId: { color: '#f1f5f9', fontSize: 20, fontWeight: '800', marginTop: 2 },
  commissionBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#0a1f0a', borderRadius: 20, paddingHorizontal: 10,
    paddingVertical: 5, borderWidth: 1, borderColor: '#166534',
  },
  commissionBadgeText: { color: '#4ade80', fontSize: 12, fontWeight: '700' },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  metaText: { color: '#64748b', fontSize: 12 },
  divider: { height: 1, backgroundColor: '#334155', marginVertical: 12 },

  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginBottom: 12 },
  statItem: { alignItems: 'center', flex: 1 },
  statLabel: { color: '#64748b', fontSize: 11, marginBottom: 4 },
  statValue: { color: '#f1f5f9', fontSize: 16, fontWeight: '700' },
  statDivider: { width: 1, height: 30, backgroundColor: '#334155' },

  materialsBox: { backgroundColor: '#0f172a', borderRadius: 10, padding: 10, marginBottom: 10, gap: 6 },
  matRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  matDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#2563eb' },
  matName: { color: '#cbd5e1', fontSize: 13, flex: 1 },
  matQty: { color: '#94a3b8', fontSize: 13 },

  locationChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#0a1f17', borderRadius: 8, paddingHorizontal: 10,
    paddingVertical: 6, marginBottom: 12, borderWidth: 1, borderColor: '#134e35',
  },
  locationText: { color: '#34d399', fontSize: 11, flex: 1 },

  acceptBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#4ade80', borderRadius: 14, paddingVertical: 15,
  },
  acceptBtnText: { color: '#0f172a', fontSize: 15, fontWeight: '800' },
});
