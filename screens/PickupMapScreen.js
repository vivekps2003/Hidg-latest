import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, StatusBar,
  TouchableOpacity, ActivityIndicator, Alert, Linking, Platform,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { P, PS, PR } from '../pickupTheme';

export default function PickupMapScreen({ route, navigation }) {
  const { order } = route.params;
  const mapRef = useRef(null);
  const [myLocation, setMyLocation] = useState(null);
  const [locLoading, setLocLoading] = useState(true);

  const sellerCoord = order.sellerLatitude ? { latitude: order.sellerLatitude, longitude: order.sellerLongitude } : null;
  const agencyCoord = order.agencyLatitude ? { latitude: order.agencyLatitude, longitude: order.agencyLongitude } : null;

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') { setLocLoading(false); return; }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setMyLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      } catch (e) { console.warn(e.message); }
      finally { setLocLoading(false); }
    })();
  }, []);

  const fitAll = () => {
    const coords = [sellerCoord, agencyCoord, myLocation].filter(Boolean);
    if (coords.length < 2 || !mapRef.current) return;
    mapRef.current.fitToCoordinates(coords, { edgePadding: { top: 80, right: 60, bottom: 80, left: 60 }, animated: true });
  };

  const openMaps = () => {
    if (!sellerCoord) return;
    const url = Platform.select({ ios: `maps:0,0?q=${sellerCoord.latitude},${sellerCoord.longitude}`, android: `geo:0,0?q=${sellerCoord.latitude},${sellerCoord.longitude}(Seller)` });
    Linking.openURL(url).catch(() => Linking.openURL(`https://www.google.com/maps?q=${sellerCoord.latitude},${sellerCoord.longitude}`));
  };

  const initialRegion = sellerCoord ? { ...sellerCoord, latitudeDelta: 0.04, longitudeDelta: 0.04 }
    : myLocation ? { ...myLocation, latitudeDelta: 0.04, longitudeDelta: 0.04 }
    : { latitude: 10.0, longitude: 76.3, latitudeDelta: 0.1, longitudeDelta: 0.1 };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={P.surface} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={P.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Pickup Location</Text>
          <Text style={styles.headerSub}>Order #{order.id.slice(-6).toUpperCase()}</Text>
        </View>
        <TouchableOpacity style={[styles.navBtn, !sellerCoord && { opacity: 0.4 }]} onPress={openMaps} disabled={!sellerCoord}>
          <Ionicons name="navigate" size={16} color={P.primaryDark} />
          <Text style={styles.navBtnText}>Navigate</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.mapContainer}>
        {locLoading && (
          <View style={styles.mapLoader}>
            <ActivityIndicator size="large" color={P.primary} />
            <Text style={styles.mapLoaderText}>Getting location...</Text>
          </View>
        )}
        <MapView ref={mapRef} style={styles.map} provider={PROVIDER_GOOGLE} initialRegion={initialRegion} onMapReady={fitAll} showsUserLocation showsMyLocationButton={false}>
          {sellerCoord && (
            <Marker coordinate={sellerCoord} title="Seller" description="Pickup here">
              <View style={styles.markerSeller}><Ionicons name="person" size={16} color="#fff" /></View>
            </Marker>
          )}
          {agencyCoord && (
            <Marker coordinate={agencyCoord} title={order.agencyName || 'Agency'} description="Drop off">
              <View style={styles.markerAgency}><Ionicons name="business" size={16} color="#fff" /></View>
            </Marker>
          )}
          {myLocation && sellerCoord && <Polyline coordinates={[myLocation, sellerCoord]} strokeColor={P.blue} strokeWidth={2} lineDashPattern={[6, 4]} />}
          {sellerCoord && agencyCoord && <Polyline coordinates={[sellerCoord, agencyCoord]} strokeColor={P.primary} strokeWidth={2} lineDashPattern={[6, 4]} />}
        </MapView>
        <TouchableOpacity style={styles.fitBtn} onPress={fitAll}>
          <Ionicons name="scan-outline" size={20} color={P.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.infoCard}>
        <View style={styles.legendRow}>
          {[{ color: P.primary, label: 'Seller' }, agencyCoord && { color: P.warning, label: 'Agency' }, myLocation && { color: P.blue, label: 'You' }].filter(Boolean).map((l, i) => (
            <View key={i} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: l.color }]} />
              <Text style={styles.legendText}>{l.label}</Text>
            </View>
          ))}
        </View>
        {sellerCoord && (
          <View style={styles.coordRow}>
            <Ionicons name="location-outline" size={14} color={P.textMuted} />
            <Text style={styles.coordText}>{sellerCoord.latitude.toFixed(5)}, {sellerCoord.longitude.toFixed(5)}</Text>
          </View>
        )}
        <TouchableOpacity style={[styles.mapsBtn, !sellerCoord && { opacity: 0.4 }]} onPress={openMaps} disabled={!sellerCoord}>
          <Ionicons name="navigate" size={18} color="#fff" />
          <Text style={styles.mapsBtnText}>Open in Google Maps</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: P.surface, borderBottomWidth: 1, borderBottomColor: P.border, gap: 12 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: P.textPrimary },
  headerSub: { fontSize: 12, color: P.textMuted, marginTop: 1 },
  navBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: P.primaryLight, borderRadius: PR.md, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: P.border },
  navBtnText: { color: P.primaryDark, fontSize: 13, fontWeight: '700' },

  mapContainer: { flex: 1, position: 'relative' },
  map: { flex: 1 },
  mapLoader: { ...StyleSheet.absoluteFillObject, backgroundColor: P.bg, alignItems: 'center', justifyContent: 'center', zIndex: 10, gap: 12 },
  mapLoaderText: { color: P.textMuted, fontSize: 14 },
  fitBtn: { position: 'absolute', top: 12, right: 12, backgroundColor: P.surface, borderRadius: PR.md, padding: 10, borderWidth: 1, borderColor: P.border, elevation: 4 },

  markerSeller: { backgroundColor: P.primary, borderRadius: 20, padding: 8, borderWidth: 2, borderColor: '#fff', elevation: 5 },
  markerAgency: { backgroundColor: P.warning, borderRadius: 20, padding: 8, borderWidth: 2, borderColor: '#fff', elevation: 5 },

  infoCard: { backgroundColor: P.surface, borderTopWidth: 1, borderTopColor: P.border, padding: 16, gap: 10 },
  legendRow: { flexDirection: 'row', gap: 20 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: P.textSecondary, fontSize: 13 },
  coordRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  coordText: { color: P.textMuted, fontSize: 12 },
  mapsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: P.primary, borderRadius: PR.lg, paddingVertical: 13, ...PS.btn },
  mapsBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
