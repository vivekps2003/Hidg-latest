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

// ─── Theme ────────────────────────────────────────────────────────────────────
const C = {
  bg:            '#F8FAFC',
  surface:       '#FFFFFF',
  surfaceAlt:    '#F1F5F9',
  border:        '#E2E8F0',
  borderFocus:   '#2563EB',
  textPrimary:   '#0F172A',
  textSecondary: '#475569',
  textMuted:     '#94A3B8',
  textInverse:   '#FFFFFF',
  primary:       '#2563EB',
  primaryLight:  '#EFF6FF',
  primaryDark:   '#1D4ED8',
  success:       '#16A34A',
  successLight:  '#F0FDF4',
  successBorder: '#BBF7D0',
  warning:       '#D97706',
  warningLight:  '#FFFBEB',
  warningBorder: '#FDE68A',
  danger:        '#DC2626',
  dangerLight:   '#FEF2F2',
  dangerBorder:  '#FECACA',
  info:          '#0891B2',
  infoLight:     '#ECFEFF',
};

const S = {
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardMd: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  btn: {
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
};

const R = { sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 };

// ─── Groq API config ──────────────────────────────────────────────────────────
const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// ─── Known scrap materials ────────────────────────────────────────────────────
const KNOWN_MATERIALS = [
  'Cardboard', 'Newspaper', 'White/Text', 'Notebook',
  'Colour Record', 'Core Paper', 'Mixed Paper', 'Weakly',
  'Plastic', 'Iron', 'Aluminium', 'Copper', 'E-waste',
];

const MATERIAL_ICONS = {
  'Cardboard':     { icon: 'cube-outline',          color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  'Newspaper':     { icon: 'newspaper-outline',     color: '#475569', bg: '#F1F5F9', border: '#E2E8F0' },
  'White/Text':    { icon: 'document-outline',      color: '#475569', bg: '#F8FAFC', border: '#E2E8F0' },
  'Notebook':      { icon: 'book-outline',          color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  'Colour Record': { icon: 'color-palette-outline', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  'Core Paper':    { icon: 'layers-outline',        color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  'Mixed Paper':   { icon: 'documents-outline',     color: '#475569', bg: '#F1F5F9', border: '#E2E8F0' },
  'Weakly':        { icon: 'newspaper-outline',     color: '#475569', bg: '#F1F5F9', border: '#E2E8F0' },
  'Plastic':       { icon: 'water-outline',         color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
  'Iron':          { icon: 'hammer-outline',        color: '#475569', bg: '#F1F5F9', border: '#E2E8F0' },
  'Aluminium':     { icon: 'flash-outline',         color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  'Copper':        { icon: 'flash-outline',         color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  'E-waste':       { icon: 'hardware-chip-outline', color: '#0891B2', bg: '#ECFEFF', border: '#A5F3FC' },
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
          mediaTypes: ['images'], quality: 0.8,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Gallery access is required.');
          return;
        }
        pickerResult = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'], quality: 0.8,
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
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } },
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
      const res = agenciesSnap.docs
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
      setAgencies(res);
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

  const matIcon = result
    ? (MATERIAL_ICONS[result.material] || { icon: 'help-circle-outline', color: C.textMuted, bg: C.surfaceAlt, border: C.border })
    : null;

  const confidenceConfig = {
    High:   { color: C.success,  bg: C.successLight,  border: C.successBorder },
    Medium: { color: C.warning,  bg: C.warningLight,  border: C.warningBorder },
    Low:    { color: C.danger,   bg: C.dangerLight,   border: C.dangerBorder  },
  };
  const confStyle = result ? (confidenceConfig[result.confidence] || confidenceConfig.Low) : null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>AI Waste Scanner</Text>
          <Text style={styles.headerSub}>Identify your scrap & find best rates</Text>
        </View>
        <View style={styles.headerBadge}>
          <Ionicons name="sparkles" size={14} color={C.primary} />
          <Text style={styles.headerBadgeText}>AI Powered</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Capture Buttons ── */}
        <View style={styles.captureRow}>
          <TouchableOpacity
            style={styles.captureBtn}
            onPress={() => pickImage(true)}
            disabled={scanning}
            activeOpacity={0.75}
          >
            <View style={styles.captureBtnIcon}>
              <Ionicons name="camera" size={22} color={C.primary} />
            </View>
            <Text style={styles.captureBtnText}>Take Photo</Text>
            <Text style={styles.captureBtnSub}>Use camera</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.captureBtn}
            onPress={() => pickImage(false)}
            disabled={scanning}
            activeOpacity={0.75}
          >
            <View style={styles.captureBtnIcon}>
              <Ionicons name="images" size={22} color={C.primary} />
            </View>
            <Text style={styles.captureBtnText}>Gallery</Text>
            <Text style={styles.captureBtnSub}>From library</Text>
          </TouchableOpacity>
        </View>

        {/* ── Image Preview ── */}
        {image && (
          <View style={styles.imageBox}>
            <Image source={{ uri: image }} style={styles.previewImage} resizeMode="cover" />
            {scanning && (
              <View style={styles.scanOverlay}>
                <View style={styles.scanSpinnerBox}>
                  <ActivityIndicator size="large" color={C.primary} />
                  <Text style={styles.scanningText}>Analysing with AI…</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ── Placeholder ── */}
        {!image && !scanning && (
          <View style={styles.placeholder}>
            <View style={styles.placeholderIconWrap}>
              <Ionicons name="scan-outline" size={40} color={C.primary} />
            </View>
            <Text style={styles.placeholderTitle}>Scan Your Waste</Text>
            <Text style={styles.placeholderSub}>
              Take or upload a photo of your scrap material. AI will identify the type and show you the best nearby rates.
            </Text>
          </View>
        )}

        {/* ── Classification Result ── */}
        {result && !scanning && (
          <View style={[styles.resultCard, S.cardMd]}>
            <View style={styles.resultHeader}>
              <View style={styles.resultHeaderLeft}>
                <Ionicons name="checkmark-circle" size={14} color={C.success} />
                <Text style={styles.resultSectionTitle}>AI Classification Result</Text>
              </View>
              {/* Confidence pill */}
              <View style={[styles.confidencePill, { backgroundColor: confStyle.bg, borderColor: confStyle.border }]}>
                <View style={[styles.confidenceDot, { backgroundColor: confStyle.color }]} />
                <Text style={[styles.confidenceText, { color: confStyle.color }]}>
                  {result.confidence}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.resultTop}>
              <View style={[styles.materialIconBox, { backgroundColor: matIcon.bg, borderColor: matIcon.border }]}>
                <Ionicons name={matIcon.icon} size={28} color={matIcon.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.materialName}>{result.material}</Text>
                <Text style={styles.materialSubLabel}>Detected Material</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={[styles.infoIconWrap, { backgroundColor: C.infoLight }]}>
                <Ionicons name="eye-outline" size={14} color={C.info} />
              </View>
              <Text style={styles.infoText}>{result.description}</Text>
            </View>
            <View style={[styles.infoRow, { marginBottom: 0 }]}>
              <View style={[styles.infoIconWrap, { backgroundColor: C.warningLight }]}>
                <Ionicons name="bulb-outline" size={14} color={C.warning} />
              </View>
              <Text style={[styles.infoText, { color: C.warning }]}>{result.tips}</Text>
            </View>

            {result.material === 'Unknown' && (
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => { setImage(null); setResult(null); }}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh-outline" size={16} color={C.textInverse} />
                <Text style={styles.retryBtnText}>Try Again</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── Agencies ── */}
        {result && result.material !== 'Unknown' && (
          <View style={styles.agenciesSection}>
            <View style={styles.agenciesSectionHeader}>
              <Text style={styles.agenciesSectionTitle}>Agencies Buying</Text>
              <View style={[styles.materialChip, { backgroundColor: matIcon?.bg, borderColor: matIcon?.border }]}>
                <Text style={[styles.materialChipText, { color: matIcon?.color }]}>{result.material}</Text>
              </View>
            </View>

            {loadingAgencies ? (
              <View style={[styles.centered, S.card, { backgroundColor: C.surface, borderRadius: R.lg }]}>
                <ActivityIndicator color={C.primary} />
                <Text style={styles.loadingText}>Finding best rates…</Text>
              </View>
            ) : agencies.length === 0 ? (
              <View style={[styles.noAgencyBox, S.card]}>
                <View style={styles.noAgencyIconWrap}>
                  <Ionicons name="storefront-outline" size={28} color={C.textMuted} />
                </View>
                <Text style={styles.noAgencyText}>No agencies found for this material</Text>
                <Text style={styles.noAgencySubText}>Try scanning a different material</Text>
              </View>
            ) : (
              agencies.map((agency, i) => (
                <View
                  key={agency.id}
                  style={[
                    styles.agencyCard,
                    i === 0 ? styles.agencyCardBest : S.card,
                  ]}
                >
                  {i === 0 && (
                    <View style={styles.bestBadge}>
                      <Ionicons name="trophy" size={11} color={C.textInverse} />
                      <Text style={styles.bestBadgeText}>Best Rate</Text>
                    </View>
                  )}

                  <View style={styles.agencyTop}>
                    <View style={styles.agencyAvatarWrap}>
                      <Text style={styles.agencyAvatarText}>
                        {(agency.businessName || 'A')[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.agencyName}>{agency.businessName || 'Agency'}</Text>
                      <View style={styles.agencyMeta}>
                        <Ionicons name="location-outline" size={12} color={C.textMuted} />
                        <Text style={styles.agencyMetaText}>
                          {agency.distanceKm != null
                            ? `${agency.distanceKm.toFixed(1)} km away`
                            : agency.location || 'Nearby'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.rateBox}>
                      <Text style={styles.rateValue}>₹{agency.pricePerKg.toFixed(1)}</Text>
                      <Text style={styles.rateUnit}>per kg</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.sellBtn, i === 0 ? styles.sellBtnBest : styles.sellBtnDefault, S.btn]}
                    onPress={() => handleSellNow(agency)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.sellBtnText, i !== 0 && { color: C.primary }]}>
                      Sell to this Agency
                    </Text>
                    <Ionicons
                      name="arrow-forward"
                      size={16}
                      color={i === 0 ? C.textInverse : C.primary}
                    />
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
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerTitle: {
    color: C.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  headerSub: {
    color: C.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.primaryLight,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  headerBadgeText: {
    color: C.primary,
    fontSize: 11,
    fontWeight: '700',
  },

  // ── Content ──
  content: {
    padding: 16,
    gap: 14,
  },

  // ── Capture Buttons ──
  captureRow: {
    flexDirection: 'row',
    gap: 12,
  },
  captureBtn: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: R.xl,
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: C.border,
    gap: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  captureBtnIcon: {
    width: 44,
    height: 44,
    borderRadius: R.md,
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  captureBtnText: {
    color: C.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  captureBtnSub: {
    color: C.textMuted,
    fontSize: 11,
  },

  // ── Image Preview ──
  imageBox: {
    borderRadius: R.xl,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: C.border,
  },
  previewImage: {
    width: '100%',
    height: 240,
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(248,250,252,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanSpinnerBox: {
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.surface,
    borderRadius: R.xl,
    paddingHorizontal: 28,
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  scanningText: {
    color: C.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },

  // ── Placeholder ──
  placeholder: {
    alignItems: 'center',
    paddingVertical: 44,
    gap: 10,
    backgroundColor: C.surface,
    borderRadius: R.xl,
    borderWidth: 1.5,
    borderColor: C.border,
    borderStyle: 'dashed',
  },
  placeholderIconWrap: {
    width: 72,
    height: 72,
    borderRadius: R.xxl,
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  placeholderTitle: {
    color: C.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  placeholderSub: {
    color: C.textMuted,
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 28,
    lineHeight: 20,
  },

  // ── Result Card ──
  resultCard: {
    backgroundColor: C.surface,
    borderRadius: R.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  resultHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resultSectionTitle: {
    color: C.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  confidencePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  confidenceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginBottom: 14,
  },
  resultTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  materialIconBox: {
    width: 60,
    height: 60,
    borderRadius: R.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  materialName: {
    color: C.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 3,
  },
  materialSubLabel: {
    color: C.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  infoIconWrap: {
    width: 26,
    height: 26,
    borderRadius: R.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  infoText: {
    color: C.textSecondary,
    fontSize: 13,
    flex: 1,
    lineHeight: 19,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.danger,
    borderRadius: R.md,
    paddingVertical: 13,
    marginTop: 12,
  },
  retryBtnText: {
    color: C.textInverse,
    fontSize: 14,
    fontWeight: '700',
  },

  // ── Agencies Section ──
  agenciesSection: {
    gap: 12,
  },
  agenciesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  agenciesSectionTitle: {
    color: C.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  materialChip: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
  },
  materialChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  centered: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  loadingText: {
    color: C.textMuted,
    fontSize: 13,
  },
  noAgencyBox: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 6,
    backgroundColor: C.surface,
    borderRadius: R.xl,
    borderWidth: 1,
    borderColor: C.border,
  },
  noAgencyIconWrap: {
    width: 52,
    height: 52,
    borderRadius: R.xl,
    backgroundColor: C.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  noAgencyText: {
    color: C.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  noAgencySubText: {
    color: C.textMuted,
    fontSize: 12,
  },

  // ── Agency Cards ──
  agencyCard: {
    backgroundColor: C.surface,
    borderRadius: R.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  agencyCardBest: {
    backgroundColor: C.successLight,
    borderColor: C.successBorder,
    borderWidth: 1.5,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  bestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.success,
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 12,
  },
  bestBadgeText: {
    color: C.textInverse,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  agencyTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  agencyAvatarWrap: {
    width: 42,
    height: 42,
    borderRadius: R.md,
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  agencyAvatarText: {
    color: C.primary,
    fontSize: 18,
    fontWeight: '800',
  },
  agencyName: {
    color: C.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  agencyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  agencyMetaText: {
    color: C.textMuted,
    fontSize: 12,
  },
  rateBox: {
    alignItems: 'flex-end',
  },
  rateValue: {
    color: C.success,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  rateUnit: {
    color: C.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  sellBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: R.md,
    paddingVertical: 13,
  },
  sellBtnBest: {
    backgroundColor: C.primary,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  sellBtnDefault: {
    backgroundColor: C.primaryLight,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  sellBtnText: {
    color: C.textInverse,
    fontSize: 14,
    fontWeight: '700',
  },
});