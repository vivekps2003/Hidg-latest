import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, StatusBar,
  TouchableOpacity, ActivityIndicator, Linking, Platform, Alert,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { auth, db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

const ACTIVE_STATUSES = ['assigned', 'accepted', 'in_progress', 'picked'];

export default function PickupMapTab({ navigation }) {
  const mapRef = useRef(null);
  const [activeOrder, setActiveOrder] = useState(null);
  const [myLocation, setMyLocation] = useState(null);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [loadingLoc, setLoadingLoc] = useState(true);

  // Fetch active order
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setLoadingOrder(false); return; }

    const q = query(
      collection(db, 'orders'),
      where('pickupAgentId', '==', uid),
      where('status', 'in', ACTIVE_STATUSES)
    );

    const unsub = onSnapshot(q, snap => {
      const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Pick the most recent active order
      orders.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setActiveOrder(orders[0] || null);
      setLoadingOrder(false);
    }, err => {
      console.error('MapTab order error:', err.message);
      setLoadingOrder(false);
    });

    return () => unsub();
  }, []);

  // Get current location
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Location access is needed to show your position.');
          setLoadingLoc(false);
          return;
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setMyLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      } catch (e) {
        console.warn('Location error:', e.message);
      } finally {
        setLoadingLoc(false);
      }
    })();
  }, []);

  const sellerCoord = activeOrder?.sellerLatitude
    ? { latitude: activeOrder.sellerLatitude, longitude: activeOrder.sellerLongitude }
    : null;

  const agencyCoord = activeOrder?.agencyLatitude
    ? { latitude: activeOrder.agencyLatitude, longitude: activeOrder.agencyLongitude }
    : null;

  const fitAll = () => {
    const coords = [sellerCoord, agencyCoord, myLocation].filter(Boolean);
    if (coords.length < 1 || !mapRef.current) return;
    if (coords.length === 1) {
      mapRef.current.animateToRegion({ ...coords[0], latitudeDelta: 0.02, longitudeDelta: 0.02 }, 600);
      return;
    }
    mapRef.current.fitToCoordinates(coords, {
      edgePadding: { top: 80, right: 60, bottom: 200, left: 60 },
      animated: true,
    });
  };

  const openGoogleMaps = () => {
    if (!sellerCoord) return;
    const url = Platform.select({
      ios: `maps:0,0?q=${sellerCoord.latitude},${sellerCoord.longitude}`,
      android: `geo:0,0?q=${sellerCoord.latitude},${sellerCoord.longitude}(Seller Location)`,
    });
    Linking.openURL(url).catch(() =>
      Linking.openURL(`https://www.google.com/maps?q=${sellerCoord.latitude},${sellerCoord.longitude}`)
    );
  };

  const initialRegion = sellerCoord
    ? { ...sellerCoord, latitudeDelta: 0.04, longitudeDelta: 0.04 }
    : myLocation
    ? { ...myLocation, latitudeDelta: 0.04, longitudeDelta: 0.04 }
    : { latitude: 10.0, longitude: 76.3, latitudeDelta: 0.1, longitudeDelta: 0.1 };

  const isLoading = loadingOrder || loadingLoc;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Live Map</Text>
          <Text style={styles.headerSub}>
            {activeOrder
              ? `Active: #${activeOrder.id.slice(-6).toUpperCase()}`
              : 'No active assignment'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.navBtn, !sellerCoord && { opacity: 0.4 }]}
          onPress={openGoogleMaps}
          disabled={!sellerCoord}
        >
          <Ionicons name="navigate" size={18} color="#34d399" />
          <Text style={styles.navBtnText}>Navigate</Text>
        </TouchableOpacity>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        {isLoading && (
          <View style={styles.mapLoader}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.mapLoaderText}>Loading map...</Text>
          </View>
        )}

        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={initialRegion}
          onMapReady={fitAll}
          showsUserLocation
          showsMyLocationButton={false}
          mapType="standard"
        >
          {sellerCoord && (
            <Marker coordinate={sellerCoord} title="Seller" description="Pickup location">
              <View style={styles.markerSeller}>
                <Ionicons name="person" size={16} color="#fff" />
              </View>
            </Marker>
          )}

          {agencyCoord && (
            <Marker coordinate={agencyCoord} title={activeOrder?.agencyName || 'Agency'} description="Drop off">
              <View style={styles.markerAgency}>
                <Ionicons name="business" size={16} color="#fff" />
              </View>
            </Marker>
          )}

          {myLocation && sellerCoord && (
            <Polyline
              coordinates={[myLocation, sellerCoord]}
              strokeColor="#2563eb"
              strokeWidth={2}
              lineDashPattern={[6, 4]}
            />
          )}

          {sellerCoord && agencyCoord && (
            <Polyline
              coordinates={[sellerCoord, agencyCoord]}
              strokeColor="#34d399"
              strokeWidth={2}
              lineDashPattern={[6, 4]}
            />
          )}
        </MapView>

        {/* Fit button */}
        <TouchableOpacity style={styles.fitBtn} onPress={fitAll}>
          <Ionicons name="scan-outline" size={20} color="#f1f5f9" />
        </TouchableOpacity>
      </View>

      {/* Bottom Info */}
      <View style={styles.infoCard}>
        {!activeOrder ? (
          <View style={styles.noOrderRow}>
            <Ionicons name="cube-outline" size={18} color="#64748b" />
            <Text style={styles.noOrderText}>No active pickup order. Accept an order to see it here.</Text>
          </View>
        ) : (
          <>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#16a34a' }]} />
                <Text style={styles.legendText}>Seller</Text>
              </View>
              {agencyCoord && (
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#d97706' }]} />
                  <Text style={styles.legendText}>Agency</Text>
                </View>
              )}
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#2563eb' }]} />
                <Text style={styles.legendText}>You</Text>
              </View>
            </View>

            <View style={styles.orderInfoRow}>
              <View style={styles.orderStat}>
                <Text style={styles.orderStatLabel}>Weight</Text>
                <Text style={styles.orderStatValue}>{activeOrder.totalKg} kg</Text>
              </View>
              <View style={styles.orderStatDivider} />
              <View style={styles.orderStat}>
                <Text style={styles.orderStatLabel}>Payout</Text>
                <Text style={[styles.orderStatValue, { color: '#60a5fa' }]}>₹{activeOrder.estimatedAmount}</Text>
              </View>
              <View style={styles.orderStatDivider} />
              <View style={styles.orderStat}>
                <Text style={styles.orderStatLabel}>Agency</Text>
                <Text style={styles.orderStatValue} numberOfLines={1}>{activeOrder.agencyName || '—'}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.detailsBtn}
              onPress={() => navigation.navigate('PickupOrderDetails', { order: activeOrder })}
            >
              <Ionicons name="document-text-outline" size={16} color="#0f172a" />
              <Text style={styles.detailsBtnText}>View Order Details</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12,
  },
  headerTitle: { color: '#f1f5f9', fontSize: 22, fontWeight: '800' },
  headerSub: { color: '#64748b', fontSize: 12, marginTop: 2 },
  navBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#0a1f17', borderRadius: 10, paddingHorizontal: 12,
    paddingVertical: 8, borderWidth: 1, borderColor: '#134e35',
  },
  navBtnText: { color: '#34d399', fontSize: 13, fontWeight: '700' },

  mapContainer: { flex: 1, position: 'relative' },
  map: { flex: 1 },
  mapLoader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0f172a', alignItems: 'center',
    justifyContent: 'center', zIndex: 10, gap: 12,
  },
  mapLoaderText: { color: '#64748b', fontSize: 14 },

  fitBtn: {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: '#1e293b', borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: '#334155',
    elevation: 4,
  },

  markerSeller: {
    backgroundColor: '#16a34a', borderRadius: 20, padding: 8,
    borderWidth: 2, borderColor: '#fff', elevation: 5,
  },
  markerAgency: {
    backgroundColor: '#d97706', borderRadius: 20, padding: 8,
    borderWidth: 2, borderColor: '#fff', elevation: 5,
  },

  infoCard: {
    backgroundColor: '#1e293b', borderTopWidth: 1,
    borderTopColor: '#334155', padding: 16, gap: 12,
  },

  noOrderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  noOrderText: { color: '#64748b', fontSize: 13, flex: 1 },

  legendRow: { flexDirection: 'row', gap: 20 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: '#94a3b8', fontSize: 13 },

  orderInfoRow: { flexDirection: 'row', alignItems: 'center' },
  orderStat: { flex: 1, alignItems: 'center' },
  orderStatLabel: { color: '#64748b', fontSize: 11, marginBottom: 3 },
  orderStatValue: { color: '#f1f5f9', fontSize: 15, fontWeight: '700' },
  orderStatDivider: { width: 1, height: 30, backgroundColor: '#334155' },

  detailsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#34d399', borderRadius: 12, paddingVertical: 13,
  },
  detailsBtnText: { color: '#0f172a', fontSize: 15, fontWeight: '700' },
});
