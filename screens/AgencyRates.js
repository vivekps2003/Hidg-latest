import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, TextInput, ActivityIndicator, Alert,
  Modal, SafeAreaView, KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import {
  getFirestore, collection, query, where, getDocs,
  doc, getDoc, setDoc, updateDoc, serverTimestamp, deleteDoc,
} from 'firebase/firestore';
import { A, AS, AR } from '../agencyTheme';

const DEFAULT_MATERIALS = [
  'Cardboard','Newspaper','White/Text','Notebook','Colour Record',
  'Core Paper','Mixed Paper','Weakly','Plastic','Iron','Aluminium','Copper','E-waste',
];

const MAT_ICONS = {
  'Cardboard': 'cube-outline', 'Newspaper': 'newspaper-outline',
  'White/Text': 'document-outline', 'Notebook': 'book-outline',
  'Colour Record': 'color-palette-outline', 'Core Paper': 'layers-outline',
  'Mixed Paper': 'documents-outline', 'Weakly': 'newspaper-outline',
  'Plastic': 'water-outline', 'Iron': 'hammer-outline',
  'Aluminium': 'flash-outline', 'Copper': 'flash-outline',
  'E-waste': 'hardware-chip-outline',
};

const AgencyRates = () => {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingRate, setEditingRate] = useState(null);
  const [newPrice, setNewPrice] = useState('');
  const [minPickupKg, setMinPickupKg] = useState('');
  const [savingMin, setSavingMin] = useState(false);
  const [focused, setFocused] = useState(false);

  const auth = getAuth();
  const user = auth.currentUser;
  const db = getFirestore();

  const fetchRates = useCallback(async () => {
    if (!user) return;
    try {
      const userSnap = await getDoc(doc(db, 'users', user.uid));
      if (userSnap.exists()) setMinPickupKg(String(userSnap.data().minPickupKg || ''));

      const q = query(collection(db, 'scrap_rates'), where('agencyId', '==', user.uid));
      const snap = await getDocs(q);
      let ratesData = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Remove old 'Paper' if exists
      if (ratesData.find(r => r.materialName === 'Paper')) {
        const paperDoc = ratesData.find(r => r.materialName === 'Paper');
        await deleteDoc(doc(db, 'scrap_rates', paperDoc.id));
        ratesData = ratesData.filter(r => r.materialName !== 'Paper');
      }

      const existing = new Set(ratesData.map(r => r.materialName));
      const missing = DEFAULT_MATERIALS.filter(m => !existing.has(m));
      if (missing.length > 0) {
        await Promise.all(missing.map(m =>
          setDoc(doc(db, 'scrap_rates', `${user.uid}_${m.toLowerCase().replace(/\s+/g, '_').replace(/\//g, '_')}`), {
            agencyId: user.uid, materialName: m, pricePerKg: 0, unit: 'kg', updatedAt: serverTimestamp(),
          })
        ));
        const newSnap = await getDocs(q);
        ratesData = newSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      }

      const paperCats = DEFAULT_MATERIALS.slice(0, 8);
      ratesData.sort((a, b) => {
        const aP = paperCats.includes(a.materialName);
        const bP = paperCats.includes(b.materialName);
        if (aP && !bP) return -1;
        if (!aP && bP) return 1;
        return a.materialName.localeCompare(b.materialName);
      });
      setRates(ratesData);
    } catch (e) {
      Alert.alert('Error', 'Failed to load rates.');
    }
  }, [user, db]);

  useEffect(() => {
    setLoading(true);
    fetchRates().finally(() => setLoading(false));
  }, [fetchRates]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRates();
    setRefreshing(false);
  }, [fetchRates]);

  const saveMinPickupKg = async () => {
    const val = parseFloat(minPickupKg);
    if (isNaN(val) || val < 0) { Alert.alert('Invalid', 'Enter a valid minimum kg (0 = no minimum).'); return; }
    setSavingMin(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), { minPickupKg: val, updatedAt: serverTimestamp() });
      Alert.alert('Saved', `Minimum pickup set to ${val} kg.`);
    } catch { Alert.alert('Error', 'Could not save.'); }
    finally { setSavingMin(false); }
  };

  const openEdit = (rate) => { setEditingRate(rate); setNewPrice(rate.pricePerKg.toString()); setEditModalVisible(true); };

  const savePrice = async () => {
    const val = parseFloat(newPrice);
    if (isNaN(val) || val < 0) { Alert.alert('Invalid', 'Enter a valid price.'); return; }
    try {
      await updateDoc(doc(db, 'scrap_rates', editingRate.id), { pricePerKg: val, updatedAt: serverTimestamp() });
      setRates(prev => prev.map(r => r.id === editingRate.id ? { ...r, pricePerKg: val } : r));
      setEditModalVisible(false);
    } catch { Alert.alert('Error', 'Failed to update price.'); }
  };

  if (loading) return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={A.bg} />
      <View style={styles.centered}><ActivityIndicator size="large" color={A.primary} /></View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={A.bg} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}><Ionicons name="pricetag-outline" size={22} color={A.primaryDark} /></View>
        <View>
          <Text style={styles.headerTitle}>Scrap Rates</Text>
          <Text style={styles.headerSub}>Manage your buying prices</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={A.primary} colors={[A.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Minimum Pickup */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <View style={styles.cardIconBox}><Ionicons name="scale-outline" size={18} color={A.primaryDark} /></View>
            <View>
              <Text style={styles.cardTitle}>Minimum Pickup Weight</Text>
              <Text style={styles.cardSub}>Orders below this will need a pickup agent</Text>
            </View>
          </View>
          <View style={styles.minRow}>
            <View style={[styles.minInputWrap, focused && styles.minInputWrapFocused]}>
              <TextInput
                style={styles.minInput}
                value={minPickupKg}
                onChangeText={setMinPickupKg}
                keyboardType="numeric"
                placeholder="e.g. 50"
                placeholderTextColor={A.textMuted}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
              />
              <Text style={styles.minUnit}>kg</Text>
            </View>
            <TouchableOpacity
              style={[styles.minSaveBtn, savingMin && { opacity: 0.6 }]}
              onPress={saveMinPickupKg}
              disabled={savingMin}
            >
              {savingMin
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.minSaveBtnText}>Save</Text>
              }
            </TouchableOpacity>
          </View>
        </View>

        {/* Rates */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <View style={styles.cardIconBox}><Ionicons name="cash-outline" size={18} color={A.primaryDark} /></View>
            <View>
              <Text style={styles.cardTitle}>Current Buying Rates</Text>
              <Text style={styles.cardSub}>Tap pencil to update any rate</Text>
            </View>
          </View>

          {rates.length === 0 ? (
            <Text style={styles.emptyText}>No rates found</Text>
          ) : (
            rates.map((rate, i) => (
              <View key={rate.id} style={[styles.rateRow, i === rates.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={styles.rateLeft}>
                  <View style={styles.rateIconBox}>
                    <Ionicons name={MAT_ICONS[rate.materialName] || 'cube-outline'} size={16} color={A.primaryDark} />
                  </View>
                  <View>
                    <Text style={styles.rateName}>{rate.materialName}</Text>
                    <Text style={[
                      styles.ratePrice,
                      { color: rate.pricePerKg > 0 ? A.primaryDark : A.textMuted }
                    ]}>
                      {rate.pricePerKg > 0 ? `₹${rate.pricePerKg.toFixed(2)} / kg` : 'Not set'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(rate)}>
                  <Ionicons name="pencil-outline" size={16} color={A.primaryDark} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={editModalVisible} transparent animationType="slide" onRequestClose={() => setEditModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalSheet}>
            {/* Handle */}
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Update Rate</Text>
                <Text style={styles.modalSub}>{editingRate?.materialName}</Text>
              </View>
              <TouchableOpacity onPress={() => setEditModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color={A.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Price per kg (₹)</Text>
            <View style={styles.modalInputWrap}>
              <Text style={styles.modalRupee}>₹</Text>
              <TextInput
                style={styles.modalInput}
                value={newPrice}
                onChangeText={setNewPrice}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={A.textMuted}
                autoFocus
              />
              <Text style={styles.modalPerKg}>/ kg</Text>
            </View>

            <TouchableOpacity style={styles.modalSaveBtn} onPress={savePrice}>
              <Ionicons name="checkmark-outline" size={18} color="#fff" />
              <Text style={styles.modalSaveBtnText}>Save Rate</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setEditModalVisible(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: A.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: A.surface, borderBottomWidth: 1, borderBottomColor: A.border,
  },
  headerIcon: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: A.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: A.textPrimary },
  headerSub: { fontSize: 12, color: A.textMuted, marginTop: 1 },

  scroll: { padding: 16, gap: 14 },

  card: {
    backgroundColor: A.surface, borderRadius: AR.xl, padding: 16,
    borderWidth: 1, borderColor: A.border, ...AS.card,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  cardIconBox: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: A.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: A.textPrimary },
  cardSub: { fontSize: 12, color: A.textMuted, marginTop: 1 },

  minRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  minInputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: A.surfaceAlt, borderRadius: AR.md,
    borderWidth: 1.5, borderColor: A.border, paddingHorizontal: 12,
  },
  minInputWrapFocused: { borderColor: A.primary, backgroundColor: A.primaryLight },
  minInput: { flex: 1, fontSize: 16, color: A.textPrimary, paddingVertical: 11 },
  minUnit: { fontSize: 14, color: A.textMuted, marginLeft: 4 },
  minSaveBtn: {
    backgroundColor: A.primary, borderRadius: AR.md,
    paddingHorizontal: 20, paddingVertical: 12, ...AS.btn,
  },
  minSaveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  emptyText: { color: A.textMuted, fontSize: 15, textAlign: 'center', paddingVertical: 24 },

  rateRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: A.border,
  },
  rateLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rateIconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: A.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  rateName: { fontSize: 14, fontWeight: '600', color: A.textPrimary },
  ratePrice: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  editBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: A.primaryLight, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: A.border,
  },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: A.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 36,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: A.border,
    alignSelf: 'center', marginBottom: 20,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: A.textPrimary },
  modalSub: { fontSize: 13, color: A.textMuted, marginTop: 2 },
  modalCloseBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: A.surfaceAlt, alignItems: 'center', justifyContent: 'center',
  },
  modalLabel: { fontSize: 13, fontWeight: '600', color: A.textSecondary, marginBottom: 8 },
  modalInputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: A.surfaceAlt, borderRadius: AR.lg,
    borderWidth: 1.5, borderColor: A.border, paddingHorizontal: 16,
    marginBottom: 20,
  },
  modalRupee: { fontSize: 22, fontWeight: '700', color: A.primaryDark, marginRight: 8 },
  modalInput: { flex: 1, fontSize: 24, fontWeight: '700', color: A.textPrimary, paddingVertical: 14 },
  modalPerKg: { fontSize: 14, color: A.textMuted },
  modalSaveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: A.primary, borderRadius: AR.lg,
    paddingVertical: 15, marginBottom: 10, ...AS.btn,
  },
  modalSaveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalCancelBtn: {
    alignItems: 'center', paddingVertical: 13,
    borderRadius: AR.lg, borderWidth: 1.5, borderColor: A.border,
  },
  modalCancelText: { color: A.textSecondary, fontSize: 15, fontWeight: '600' },
});

export default AgencyRates;
