import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, ActivityIndicator, Alert, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { doc, getDoc } from 'firebase/firestore';

// ─── Groq API config ──────────────────────────────────────────────────────────
const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// ─── Known scrap materials (must match agency rate materialNames) ──────────────
const KNOWN_MATERIALS = [
  'Cardboard', 'Newspaper', 'White/Text', 'Notebook',
  'Colour Record', 'Core Paper', 'Mixed Paper', 'Weakly',
  'Plastic', 'Iron', 'Aluminium', 'Copper', 'E-waste',
];

const MATERIAL_ICONS = {
  'Cardboard':     { icon: 'cube-outline',          color: '#f59e0b' },
  'Newspaper':     { icon: 'newspaper-outline',     color: '#94a3b8' },
  'White/Text':    { icon: 'document-outline',      color: '#e2e8f0' },
  'Notebook':      { icon: 'book-outline',           color: '#60a5fa' },
  'Colour Record': { icon: 'color-palette-outline', color: '#a78bfa' },
  'Core Paper':    { icon: 'layers-outline',         color: '#fbbf24' },
  'Mixed Paper':   { icon: 'documents-outline',     color: '#94a3b8' },
  'Weakly':        { icon: 'newspaper-outline',     color: '#64748b' },
  'Plastic':       { icon: 'water-outline',          color: '#34d399' },
  'Iron':          { icon: 'hammer-outline',         color: '#9ca3af' },
  'Aluminium':     { icon: 'flash-outline',          color: '#60a5fa' },
  'Copper':        { icon: 'flash-outline',          color: '#f97316' },
  'E-waste':       { icon: 'hardware-chip-outline', color: '#22d3ee' },
};

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

export default function ScanWaste({ navigation }) {
  const [image, setImage] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [agencies, setAgencies] = useState([]);
  const [loadingAgencies, setLoadingAgencies] = useState(false);
  const [sellerLocation, setSellerLocation] = useState(null);

  React.useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    getDoc(doc(db, 'users', uid)).then(snap => {
      if (snap.exists()) {
        const d = snap.data();
        setSellerLocation({ latitude: d.latitude, longitude: d.longitude });
      }
    });
  }, []);

  const pickImage = useCallback(async (fromCamera) => {
    try {
      let pickerResult;
      if (fromCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Camera access is required.');
          return;
        }
        pickerResult = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.8,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Gallery access is required.');
          return;
        }
        pickerResult = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.8,
        });
      }

      if (pickerResult.canceled || !pickerResult.assets?.length) return;

      const compressed = await ImageManipulator.manipulateAsync(
        pickerResult.assets[0].uri,
        [{ resize: { width: 800 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      setImage(compressed.uri);
      setResult(null);
      setAgencies([]);
      await classifyImage(compressed.base64);
    } catch (e) {
      console.error('Image pick error:', e);
      Alert.alert('Error', 'Could not load image. Try again.');
    }
  }, [sellerLocation]);

  const classifyImage = async (base64) => {
    setScanning(true);
    try {
      const response = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
          max_tokens: 256,
          temperature: 0.1,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64}`,
                },
              },
              {
                type: 'text',
                text: `You are a scrap material classifier for a recycling app in India.

Analyze this image and identify the type of waste/scrap material.
You MUST classify it as one of these exact categories:
${KNOWN_MATERIALS.join(', ')}

Respond ONLY in this exact JSON format (no markdown, no extra text):
{
  "material": "<exact category name from the list>",
  "confidence": "<High/Medium/Low>",
  "description": "<one sentence describing what you see>",
  "tips": "<one sentence tip on how to prepare this material for selling>"
}

If the image does not contain any recognizable scrap material, use:
{
  "material": "Unknown",
  "confidence": "Low",
  "description": "Could not identify a known scrap material in this image.",
  "tips": "Try taking a clearer photo of the material."
}`,
              },
            ],
          }],
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err?.error?.message || `API error ${response.status}`);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content?.trim();

      if (!text) throw new Error('Empty response from AI');

      const clean = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);

      setResult(parsed);

      if (parsed.material && parsed.material !== 'Unknown') {
        await fetchAgenciesForMaterial(parsed.material);
      }
    } catch (e) {
      console.error('Classify error:', e);
      Alert.alert(
        'Classification Failed',
        e.message.includes('401') || e.message.includes('403')
          ? 'Invalid Groq API key. Check your EXPO_PUBLIC_GROQ_API_KEY in .env'
          : e.message.includes('429')
          ? 'Too many requests. Please wait a moment and try again.'
          : 'Could not classify image. Check your connection and try again.'
      );
    } finally {
      setScanning(false);
    }
  };

  const fetchAgenciesForMaterial = async (materialName) => {
    setLoadingAgencies(true);
    try {
      const agenciesSnap = await getDocs(
        query(collection(db, 'users'), where('entityType', '==', 'agency'), where('isActive', '==', true))
      );

      const ratesSnap = await getDocs(
        query(collection(db, 'scrap_rates'), where('materialName', '==', materialName))
      );

      const ratesByAgency = {};
      ratesSnap.docs.forEach(d => {
        const r = d.data();
        if (r.pricePerKg > 0) ratesByAgency[r.agencyId] = r.pricePerKg;
      });

      const result = agenciesSnap.docs
        .map(d => {
          const data = d.data();
          const pricePerKg = ratesByAgency[d.id];
          if (!pricePerKg) return null;
          const dist = getDistance(
            sellerLocation?.latitude, sellerLocation?.longitude,
            data.latitude, data.longitude
          );
          return { id: d.id, ...data, pricePerKg, distanceKm: dist };
        })
        .filter(Boolean)
        .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));

      setAgencies(result);
    } catch (e) {
      console.error('Fetch agencies error:', e);
    } finally {
      setLoadingAgencies(false);
    }
  };

  const handleSellNow = (agency) => {
    navigation.navigate('CreateOrder', {
      agency: {
        ...agency,
        rates: [{ materialName: result.material, pricePerKg: agency.pricePerKg }],
      },
    });
  };

  const matIcon = result ? (MATERIAL_ICONS[result.material] || { icon: 'help-circle-outline', color: '#94a3b8' }) : null;
  const confidenceColor = result?.confidence === 'High' ? '#4ade80' : result?.confidence === 'Medium' ? '#fbbf24' : '#f87171';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI Waste Scanner</Text>
        <Text style={styles.headerSub}>Identify your scrap & find best rates</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <View style={styles.captureRow}>
          <TouchableOpacity style={styles.captureBtn} onPress={() => pickImage(true)} disabled={scanning}>
            <Ionicons name="camera" size={28} color="#2563eb" />
            <Text style={styles.captureBtnText}>Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.captureBtn} onPress={() => pickImage(false)} disabled={scanning}>
            <Ionicons name="images" size={28} color="#2563eb" />
            <Text style={styles.captureBtnText}>Gallery</Text>
          </TouchableOpacity>
        </View>

        {image && (
          <View style={styles.imageBox}>
            <Image source={{ uri: image }} style={styles.previewImage} resizeMode="cover" />
            {scanning && (
              <View style={styles.scanOverlay}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={styles.scanningText}>Analysing with AI...</Text>
              </View>
            )}
          </View>
        )}

        {!image && !scanning && (
          <View style={styles.placeholder}>
            <Ionicons name="scan-outline" size={64} color="#334155" />
            <Text style={styles.placeholderTitle}>Scan Your Waste</Text>
            <Text style={styles.placeholderSub}>
              Take or upload a photo of your scrap material. AI will identify the type and show you the best nearby rates.
            </Text>
          </View>
        )}

        {result && !scanning && (
          <View style={styles.resultCard}>
            <Text style={styles.resultSectionTitle}>AI Classification Result</Text>

            <View style={styles.resultTop}>
              <View style={[styles.materialIconBox, { backgroundColor: matIcon.color + '20', borderColor: matIcon.color }]}>
                <Ionicons name={matIcon.icon} size={32} color={matIcon.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.materialName}>{result.material}</Text>
                <View style={styles.confidenceRow}>
                  <View style={[styles.confidenceDot, { backgroundColor: confidenceColor }]} />
                  <Text style={[styles.confidenceText, { color: confidenceColor }]}>
                    {result.confidence} Confidence
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Ionicons name="eye-outline" size={15} color="#64748b" />
              <Text style={styles.infoText}>{result.description}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="bulb-outline" size={15} color="#fbbf24" />
              <Text style={[styles.infoText, { color: '#fbbf24' }]}>{result.tips}</Text>
            </View>

            {result.material === 'Unknown' && (
              <TouchableOpacity style={styles.retryBtn} onPress={() => { setImage(null); setResult(null); }}>
                <Ionicons name="refresh-outline" size={16} color="#0f172a" />
                <Text style={styles.retryBtnText}>Try Again</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {result && result.material !== 'Unknown' && (
          <View style={styles.agenciesSection}>
            <Text style={styles.agenciesSectionTitle}>
              Agencies Buying {result.material}
            </Text>

            {loadingAgencies ? (
              <View style={styles.centered}>
                <ActivityIndicator color="#2563eb" />
                <Text style={styles.loadingText}>Finding best rates...</Text>
              </View>
            ) : agencies.length === 0 ? (
              <View style={styles.noAgencyBox}>
                <Ionicons name="storefront-outline" size={32} color="#334155" />
                <Text style={styles.noAgencyText}>No agencies found for this material</Text>
              </View>
            ) : (
              agencies.map((agency, i) => (
                <View key={agency.id} style={[styles.agencyCard, i === 0 && styles.agencyCardBest]}>
                  {i === 0 && (
                    <View style={styles.bestBadge}>
                      <Ionicons name="trophy-outline" size={11} color="#0f172a" />
                      <Text style={styles.bestBadgeText}>Best Rate</Text>
                    </View>
                  )}

                  <View style={styles.agencyTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.agencyName}>{agency.businessName || 'Agency'}</Text>
                      <View style={styles.agencyMeta}>
                        <Ionicons name="location-outline" size={12} color="#64748b" />
                        <Text style={styles.agencyMetaText}>
                          {agency.distanceKm != null ? `${agency.distanceKm.toFixed(1)} km away` : agency.location || 'Nearby'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.rateBox}>
                      <Text style={styles.rateValue}>₹{agency.pricePerKg.toFixed(1)}</Text>
                      <Text style={styles.rateUnit}>/ kg</Text>
                    </View>
                  </View>

                  <TouchableOpacity style={styles.sellBtn} onPress={() => handleSellNow(agency)}>
                    <Ionicons name="arrow-forward-circle-outline" size={18} color="#0f172a" />
                    <Text style={styles.sellBtnText}>Sell to this Agency</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  headerTitle: { color: '#f1f5f9', fontSize: 24, fontWeight: '800' },
  headerSub: { color: '#64748b', fontSize: 13, marginTop: 2 },
  content: { padding: 16, gap: 16 },
  captureRow: { flexDirection: 'row', gap: 12 },
  captureBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: '#1e293b', borderRadius: 16, paddingVertical: 18,
    borderWidth: 1, borderColor: '#334155',
  },
  captureBtnText: { color: '#f1f5f9', fontSize: 15, fontWeight: '600' },
  imageBox: { borderRadius: 16, overflow: 'hidden', position: 'relative' },
  previewImage: { width: '100%', height: 240, borderRadius: 16 },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.75)',
    alignItems: 'center', justifyContent: 'center', gap: 12, borderRadius: 16,
  },
  scanningText: { color: '#f1f5f9', fontSize: 15, fontWeight: '600' },
  placeholder: {
    alignItems: 'center', paddingVertical: 48, gap: 12,
    backgroundColor: '#1e293b', borderRadius: 16,
    borderWidth: 1, borderColor: '#334155', borderStyle: 'dashed',
  },
  placeholderTitle: { color: '#cbd5e1', fontSize: 18, fontWeight: '700' },
  placeholderSub: { color: '#64748b', fontSize: 13, textAlign: 'center', paddingHorizontal: 32, lineHeight: 20 },
  resultCard: { backgroundColor: '#1e293b', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#334155' },
  resultSectionTitle: { color: '#94a3b8', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 },
  resultTop: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  materialIconBox: { width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  materialName: { color: '#f1f5f9', fontSize: 22, fontWeight: '800', marginBottom: 6 },
  confidenceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  confidenceDot: { width: 8, height: 8, borderRadius: 4 },
  confidenceText: { fontSize: 13, fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#334155', marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  infoText: { color: '#94a3b8', fontSize: 13, flex: 1, lineHeight: 19 },
  retryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#fbbf24', borderRadius: 12, paddingVertical: 12, marginTop: 10 },
  retryBtnText: { color: '#0f172a', fontSize: 14, fontWeight: '700' },
  agenciesSection: { gap: 12 },
  agenciesSectionTitle: { color: '#f1f5f9', fontSize: 18, fontWeight: '700' },
  centered: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  loadingText: { color: '#64748b', fontSize: 13 },
  noAgencyBox: { alignItems: 'center', paddingVertical: 24, gap: 8, backgroundColor: '#1e293b', borderRadius: 14, borderWidth: 1, borderColor: '#334155' },
  noAgencyText: { color: '#64748b', fontSize: 14 },
  agencyCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#334155' },
  agencyCardBest: { borderColor: '#4ade80', backgroundColor: '#0a1f0a' },
  bestBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#4ade80', alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10 },
  bestBadgeText: { color: '#0f172a', fontSize: 11, fontWeight: '800' },
  agencyTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  agencyName: { color: '#f1f5f9', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  agencyMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  agencyMetaText: { color: '#64748b', fontSize: 12 },
  rateBox: { alignItems: 'flex-end' },
  rateValue: { color: '#4ade80', fontSize: 24, fontWeight: '800' },
  rateUnit: { color: '#64748b', fontSize: 12 },
  sellBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#4ade80', borderRadius: 12, paddingVertical: 13 },
  sellBtnText: { color: '#0f172a', fontSize: 15, fontWeight: '700' },
});