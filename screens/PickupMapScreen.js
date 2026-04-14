import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, StatusBar,
  TouchableOpacity, ActivityIndicator, Alert, Linking, Platform,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

export default function PickupMapScreen({ route, navigation }) {
  const { order } = route.params;
  const mapRef = useRef(null);

  const [myLocation, setMyLocation] = useState(null);
  const [locLoading, setLocLoading] = useState(true);

  const sellerCoord = order.sellerLatitude
    ? { latitude: order.sellerLatitude, longitude: order.sellerLongitude }
    : null;

  const agencyCoord = order.agencyLatitude
    ? { latitude: order.agencyLatitude, longitude: order.agencyLongitude }
    : null;

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Location access is needed to show your position on the map.');
          setLocLoading(false);
          return;
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setMyLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      } catch (e) {
        console.warn('Location error:', e.message);
      } finally {
        setLocLoading(false);
      }
    })();
  }, []);

  const fitAll = () => {
    const coords = [sellerCoord, agencyCoord, myLocation].filter(Boolean);
    if (coords.length < 2 || !mapRef.current) return;
    mapRef.current.fitToCoordinates(coords, {
      edgePadding: { top: 80, right: 60, bottom: 80, left: 60 },
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#f1f5f9" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Pickup Location</Text>
          <Text style={styles.headerSub}>Order #{order.id.slice(-6).toUpperCase()}</Text>
        </View>
        <TouchableOpacity style={styles.externalBtn} onPress={openGoogleMaps} disabled={!sellerCoord}>
          <Ionicons name="navigate-outline" size={20} color={sellerCoord ? '#34d399' : '#334155'} />
        </TouchableOpacity>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        {locLoading && (
          <View style={styles.mapLoader}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.mapLoaderText}>Getting your location...</Text>
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
          {/* Seller Marker */}
          {sellerCoord && (
            <Marker coordinate={sellerCoord} title="Seller Location" description="Pickup from here">
              <View style={styles.markerSeller}>
                <Ionicons name="person" size={16} color="#fff" />
              </View>
            </Marker>
          )}

          {/* Agency Marker */}
          {agencyCoord && (
            <Marker coordinate={agencyCoord} title={order.agencyName || 'Agency'} description="Drop off here">
              <View style={styles.markerAgency}>
                <Ionicons name="business" size={16} color="#fff" />
              </View>
            </Marker>
          )}

          {/* My Location Marker */}
          {myLocation && (
            <Marker coordinate={myLocation} title="You" description="Your current location">
              <View style={styles.markerMe}>
                <Ionicons name="navigate" size={14} color="#fff" />
              </View>
            </Marker>
          )}

          {/* Route line: me → seller */}
          {myLocation && sellerCoord && (
            <Polyline
              coordinates={[myLocation, sellerCoord]}
              strokeColor="#2563eb"
              strokeWidth={2}
              lineDashPattern={[6, 4]}
            />
          )}

          {/* Route line: seller → agency */}
          {sellerCoord && agencyCoord && (
            <Polyline
              coordinates={[sellerCoord, agencyCoord]}
              strokeColor="#34d399"
              strokeWidth={2}
              lineDashPattern={[6, 4]}
            />
          )}
        </MapView>

        {/* Fit All Button */}
        <TouchableOpacity style={styles.fitBtn} onPress={fitAll}>
          <Ionicons name="scan-outline" size={20} color="#f1f5f9" />
        </TouchableOpacity>
      </View>

      {/* Bottom Info Card */}
      <View style={styles.infoCard}>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#34d399' }]} />
            <Text style={styles.legendText}>Seller</Text>
          </View>
          {agencyCoord && (
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#fbbf24' }]} />
              <Text style={styles.legendText}>Agency</Text>
            </View>
          )}
          {myLocation && (
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#2563eb' }]} />
              <Text style={styles.legendText}>You</Text>
            </View>
          )}
        </View>

        {sellerCoord && (
          <View style={styles.coordRow}>
            <Ionicons name="location-outline" size={14} color="#64748b" />
            <Text style={styles.coordText}>
              {sellerCoord.latitude.toFixed(5)}, {sellerCoord.longitude.toFixed(5)}
            </Text>
          </View>
        )}

        <TouchableOpacity style={styles.directionsBtn} onPress={openGoogleMaps} disabled={!sellerCoord}>
          <Ionicons name="navigate" size={18} color="#0f172a" />
          <Text style={styles.directionsBtnText}>Open in Google Maps</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, gap: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#f1f5f9', fontSize: 18, fontWeight: '700' },
  headerSub: { color: '#64748b', fontSize: 12, marginTop: 1 },
  externalBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

  mapContainer: { flex: 1, position: 'relative' },
  map: { flex: 1 },
  mapLoader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center',
    zIndex: 10, gap: 12,
  },
  mapLoaderText: { color: '#64748b', fontSize: 14 },

  fitBtn: {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: '#1e293b', borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: '#334155',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
  },

  markerSeller: {
    backgroundColor: '#16a34a', borderRadius: 20, padding: 8,
    borderWidth: 2, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4, shadowRadius: 4, elevation: 5,
  },
  markerAgency: {
    backgroundColor: '#d97706', borderRadius: 20, padding: 8,
    borderWidth: 2, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4, shadowRadius: 4, elevation: 5,
  },
  markerMe: {
    backgroundColor: '#2563eb', borderRadius: 20, padding: 8,
    borderWidth: 2, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4, shadowRadius: 4, elevation: 5,
  },

  infoCard: {
    backgroundColor: '#1e293b', borderTopWidth: 1, borderTopColor: '#334155',
    padding: 16, gap: 10,
  },
  legendRow: { flexDirection: 'row', gap: 20 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: '#94a3b8', fontSize: 13 },
  coordRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  coordText: { color: '#64748b', fontSize: 12 },
  directionsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#34d399', borderRadius: 12, paddingVertical: 13,
  },
  directionsBtnText: { color: '#0f172a', fontSize: 15, fontWeight: '700' },
});
