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
import { P, PS, PR } from '../pickupTheme';

const ACTIVE = ['assigned', 'accepted', 'in_progress', 'picked'];

export default function PickupMapTab({ navigation }) {
  const mapRef = useRef(null);
  const [activeOrder, setActiveOrder] = useState(null);
  const [myLocation, setMyLocation] = useState(null);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [loadingLoc, setLoadingLoc] = useState(true);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setLoadingOrder(false); return; }
    const q = query(collection(db, 'orders'), where('pickupAgentId', '==', uid), where('status', 'in', ACTIVE));
    const unsub = onSnapshot(q, snap => {
      const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      orders.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setActiveOrder(orders[0] || null);
      setLoadingOrder(false);
    }, () => setLoadingOrder(false));
    return () => unsub();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') { setLoadingLoc(false); return; }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setMyLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      } catch (e) { console.warn(e.message); }
      finally { setLoadingLoc(false); }
    })();
  }, []);

  const sellerCoord = activeOrder?.sellerLatitude ? { latitude: activeOrder.sellerLatitude, longitude: activeOrder.sellerLongitude } : null;
  const agencyCoord = activeOrder?.agencyLatitude ? { latitude: activeOrder.agencyLatitude, longitude: activeOrder.agencyLongitude } : null;

  const fitAll = () => {
    const coords = [sellerCoord, agencyCoord, myLocation].filter(Boolean);
    if (!coords.length || !mapRef.current) return;
    if (coords.length === 1) { mapRef.current.animateToRegion({ ...coords[0], latitudeDelta: 0.02, longitudeDelta: 0.02 }, 600); return; }
    mapRef.current.fitToCoordinates(coords, { edgePadding: { top: 80, right: 60, bottom: 200, left: 60 }, animated: true });
  };

  const openMaps = () => {
    if (!sellerCoord) return;
    const url = Platform.select({ ios: `maps:0,0?q=${sellerCoord.latitude},${sellerCoord.longitude}`, android: `geo:0,0?q=${sellerCoord.latitude},${sellerCoord.longitude}(Seller)` });
    Linking.openURL(url).catch(() => Linking.openURL(`https://www.google.com/maps?q=${sellerCoord.latitude},${sellerCoord.longitude}`));
  };

  const initialRegion = sellerCoord ? { ...sellerCoord, latitudeDelta: 0.04, longitudeDelta: 0.04 }
    : myLocation ? { ...myLocation, latitudeDelta: 0.04, longitudeDelta: 0.04 }
    : { latitude: 10.0, longitude: 76.3, latitudeDelta: 0.1, longitudeDelta: 0.1 };

  const isLoading = loadingOrder || loadingLoc;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={P.surface} />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Live Map</Text>
          <Text style={styles.headerSub}>{activeOrder ? `Active: #${activeOrder.id.slice(-6).toUpperCase()}` : 'No active assignment'}</Text>
        </View>
        <TouchableOpacity style={[styles.navBtn, !sellerCoord && { opacity: 0.4 }]} onPress={openMaps} disabled={!sellerCoord}>
          <Ionicons name="navigate" size={16} color={P.primaryDark} />
          <Text style={styles.navBtnText}>Navigate</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.mapContainer}>
        {isLoading && (
          <View style={styles.mapLoader}>
            <ActivityIndicator size="large" color={P.primary} />
            <Text style={styles.mapLoaderText}>Loading map...</Text>
          </View>
        )}
        <MapView ref={mapRef} style={styles.map} provider={PROVIDER_GOOGLE} initialRegion={initialRegion} onMapReady={fitAll} showsUserLocation showsMyLocationButton={false}>
          {sellerCoord && <Marker coordinate={sellerCoord} title="Seller"><View style={styles.markerSeller}><Ionicons name="person" size={16} color="#fff" /></View></Marker>}
          {agencyCoord && <Marker coordinate={agencyCoord} title={activeOrder?.agencyName || 'Agency'}><View style={styles.markerAgency}><Ionicons name="business" size={16} color="#fff" /></View></Marker>}
          {myLocation && sellerCoord && <Polyline coordinates={[myLocation, sellerCoord]} strokeColor={P.blue} strokeWidth={2} lineDashPattern={[6, 4]} />}
          {sellerCoord && agencyCoord && <Polyline coordinates={[sellerCoord, agencyCoord]} strokeColor={P.primary} strokeWidth={2} lineDashPattern={[6, 4]} />}
        </MapView>
        <TouchableOpacity style={styles.fitBtn} onPress={fitAll}>
          <Ionicons name="scan-outline" size={20} color={P.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.infoCard}>
        {!activeOrder ? (
          <View style={styles.noOrderRow}>
            <View style={styles.noOrderIcon}><Ionicons name="cube-outline" size={20} color={P.textMuted} /></View>
            <Text style={styles.noOrderText}>No active pickup. Accept an offer to see it here.</Text>
          </View>
        ) : (
          <>
            <View style={styles.legendRow}>
              {[{ color: P.primary, label: 'Seller' }, agencyCoord && { color: P.warning, label: 'Agency' }, { color: P.blue, label: 'You' }].filter(Boolean).map((l, i) => (
                <View key={i} style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: l.color }]} /><Text style={styles.legendText}>{l.label}</Text></View>
              ))}
            </View>
            <View style={styles.statsRow}>
              {[
                { label: 'Weight', value: `${activeOrder.totalKg} kg` },
                { label: 'Commission', value: `₹${activeOrder.totalCommission || '—'}`, color: P.primary },
                { label: 'Agency', value: activeOrder.agencyName || '—' },
              ].map((s, i, arr) => (
                <React.Fragment key={i}>
                  <View style={styles.statItem}><Text style={styles.statLabel}>{s.label}</Text><Text style={[styles.statValue, s.color && { color: s.color }]} numberOfLines={1}>{s.value}</Text></View>
                  {i < arr.length - 1 && <View style={styles.statDivider} />}
                </React.Fragment>
              ))}
            </View>
            <TouchableOpacity style={styles.detailsBtn} onPress={() => navigation.navigate('PickupOrderDetails', { order: activeOrder })}>
              <Ionicons name="document-text-outline" size={16} color="#fff" />
              <Text style={styles.detailsBtnText}>View Order Details</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: P.surface, borderBottomWidth: 1, borderBottomColor: P.border },
  headerTitle: { fontSize: 20, fontWeight: '800', color: P.textPrimary },
  headerSub: { fontSize: 12, color: P.textMuted, marginTop: 2 },
  navBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: P.primaryLight, borderRadius: PR.md, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: P.border },
  navBtnText: { color: P.primaryDark, fontSize: 13, fontWeight: '700' },

  mapContainer: { flex: 1, position: 'relative' },
  map: { flex: 1 },
  mapLoader: { ...StyleSheet.absoluteFillObject, backgroundColor: P.bg, alignItems: 'center', justifyContent: 'center', zIndex: 10, gap: 12 },
  mapLoaderText: { color: P.textMuted, fontSize: 14 },
  fitBtn: { position: 'absolute', top: 12, right: 12, backgroundColor: P.surface, borderRadius: PR.md, padding: 10, borderWidth: 1, borderColor: P.border, elevation: 4 },

  markerSeller: { backgroundColor: P.primary, borderRadius: 20, padding: 8, borderWidth: 2, borderColor: '#fff', elevation: 5 },
  markerAgency: { backgroundColor: P.warning, borderRadius: 20, padding: 8, borderWidth: 2, borderColor: '#fff', elevation: 5 },

  infoCard: { backgroundColor: P.surface, borderTopWidth: 1, borderTopColor: P.border, padding: 16, gap: 12 },
  noOrderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  noOrderIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: P.primaryLight, alignItems: 'center', justifyContent: 'center' },
  noOrderText: { color: P.textMuted, fontSize: 13, flex: 1 },

  legendRow: { flexDirection: 'row', gap: 20 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: P.textSecondary, fontSize: 13 },

  statsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: P.primaryLight, borderRadius: PR.md, padding: 12, borderWidth: 1, borderColor: P.border },
  statItem: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 11, color: P.primaryDark, marginBottom: 3, fontWeight: '600' },
  statValue: { fontSize: 14, fontWeight: '700', color: P.textPrimary },
  statDivider: { width: 1, height: 30, backgroundColor: P.border },

  detailsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: P.primary, borderRadius: PR.lg, paddingVertical: 13, ...PS.btn },
  detailsBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
