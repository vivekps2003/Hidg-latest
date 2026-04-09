// screens/AgencyRates.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  deleteDoc,
} from 'firebase/firestore';

const DEFAULT_MATERIALS = [
  'Cardboard',
  'Newspaper',
  'White/Text',
  'Notebook',
  'Colour Record',
  'Core Paper',
  'Mixed Paper',
  'Weakly',
  'Plastic',
  'Iron',
  'Aluminium',
  'Copper',
  'E-waste',
];

const AgencyRates = () => {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingRate, setEditingRate] = useState(null);
  const [newPrice, setNewPrice] = useState('');
  const [minPickupKg, setMinPickupKg] = useState('');
  const [savingMin, setSavingMin] = useState(false);

  const auth = getAuth();
  const user = auth.currentUser;
  const db = getFirestore();

  const fetchRates = useCallback(async () => {
    if (!user) return;

    try {
      // Fetch minPickupKg from users doc
      const userSnap = await getDoc(doc(db, 'users', user.uid));
      if (userSnap.exists()) {
        setMinPickupKg(String(userSnap.data().minPickupKg || ''));
      }
      const q = query(
        collection(db, 'scrap_rates'),
        where('agencyId', '==', user.uid)
      );
      const querySnapshot = await getDocs(q);
      let ratesData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Get list of current material names
      const existingMaterials = new Set(ratesData.map((r) => r.materialName));

      // If old "Paper" exists, remove it and create new paper categories
      if (existingMaterials.has('Paper')) {
        const paperDoc = ratesData.find((r) => r.materialName === 'Paper');
        if (paperDoc) {
          await deleteDoc(doc(db, 'scrap_rates', paperDoc.id));
        }
        // Remove "Paper" from local array
        ratesData = ratesData.filter((r) => r.materialName !== 'Paper');
      }

      // Check which default materials are missing
      const missingMaterials = DEFAULT_MATERIALS.filter(
        (material) => !existingMaterials.has(material)
      );

      // Create missing default rates
      if (missingMaterials.length > 0) {
        const batchPromises = missingMaterials.map((material) =>
          setDoc(
            doc(
              db,
              'scrap_rates',
              `${user.uid}_${material
                .toLowerCase()
                .replace(/\s+/g, '_')
                .replace(/\//g, '_')}`
            ),
            {
              agencyId: user.uid,
              materialName: material,
              pricePerKg: 0,
              unit: 'kg',
              updatedAt: serverTimestamp(),
            }
          )
        );

        await Promise.all(batchPromises);

        // Re-fetch after creating missing ones
        const newSnapshot = await getDocs(q);
        ratesData = newSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
      }

      // Sort: Paper categories first, then others
      const paperCategories = DEFAULT_MATERIALS.slice(0, 8);
      const sortedRates = [...ratesData].sort((a, b) => {
        const aIsPaper = paperCategories.includes(a.materialName);
        const bIsPaper = paperCategories.includes(b.materialName);

        if (aIsPaper && !bIsPaper) return -1;
        if (!aIsPaper && bIsPaper) return 1;
        return a.materialName.localeCompare(b.materialName);
      });

      setRates(sortedRates);
    } catch (error) {
      console.error('Error fetching rates:', error);
      Alert.alert('Error', 'Failed to load scrap rates.');
    }
  }, [user, db]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchRates();
      setLoading(false);
    };
    load();
  }, [fetchRates]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRates();
    setRefreshing(false);
  }, [fetchRates]);

  const saveMinPickupKg = async () => {
    const val = parseFloat(minPickupKg);
    if (isNaN(val) || val < 0) {
      Alert.alert('Invalid', 'Enter a valid minimum kg (0 = no minimum).');
      return;
    }
    setSavingMin(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        minPickupKg: val,
        updatedAt: serverTimestamp(),
      });
      Alert.alert('Saved', `Minimum pickup set to ${val} kg.`);
    } catch (e) {
      Alert.alert('Error', 'Could not save. Try again.');
    } finally {
      setSavingMin(false);
    }
  };

  const openEditModal = (rate) => {
    setEditingRate(rate);
    setNewPrice(rate.pricePerKg.toString());
    setEditModalVisible(true);
  };

  const savePrice = async () => {
    if (!editingRate || !newPrice.trim()) {
      Alert.alert('Invalid Input', 'Please enter a valid price.');
      return;
    }

    const priceValue = parseFloat(newPrice);
    if (isNaN(priceValue) || priceValue < 0) {
      Alert.alert('Invalid Price', 'Price must be a non-negative number.');
      return;
    }

    try {
      const rateRef = doc(db, 'scrap_rates', editingRate.id);
      await updateDoc(rateRef, {
        pricePerKg: priceValue,
        updatedAt: serverTimestamp(),
      });

      setRates((prev) =>
        prev.map((r) =>
          r.id === editingRate.id ? { ...r, pricePerKg: priceValue } : r
        )
      );

      setEditModalVisible(false);
      setEditingRate(null);
      setNewPrice('');
    } catch (error) {
      console.error('Error updating price:', error);
      Alert.alert('Error', 'Failed to update price. Please try again.');
    }
  };

  const formatPrice = (price) => {
    return price === 0 ? '₹0' : `₹${price.toFixed(2)}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4CAF50"
            colors={['#4CAF50']}
          />
        }
      >
        <Text style={styles.screenTitle}>Agency Scrap Rates</Text>

        {/* Minimum Pickup Setting */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="scale-outline" size={24} color="#60a5fa" />
            <Text style={styles.cardTitle}>Minimum Pickup Weight</Text>
          </View>
          <Text style={styles.minDesc}>
            Orders below this weight will be flagged for pickup agent assignment.
          </Text>
          <View style={styles.minRow}>
            <TextInput
              style={styles.minInput}
              value={minPickupKg}
              onChangeText={setMinPickupKg}
              keyboardType="numeric"
              placeholder="e.g. 50"
              placeholderTextColor="#475569"
            />
            <Text style={styles.minUnit}>kg</Text>
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

        {/* Current Buying Rates */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="pricetag-outline" size={24} color="#FFCA28" />
            <Text style={styles.cardTitle}>Current Buying Rates</Text>
          </View>

          {rates.length === 0 ? (
            <Text style={styles.emptyText}>No rates found</Text>
          ) : (
            rates.map((rate) => (
              <View key={rate.id} style={styles.rateRow}>
                <View style={styles.materialInfo}>
                  <Text style={styles.materialName}>{rate.materialName}</Text>
                  <Text style={styles.priceText}>
                    {formatPrice(rate.pricePerKg)} / kg
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => openEditModal(rate)}
                >
                  <Ionicons name="pencil" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Update {editingRate?.materialName} Rate
              </Text>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Price per kg (₹)</Text>
              <TextInput
                style={styles.priceInput}
                value={newPrice}
                onChangeText={setNewPrice}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor="#757575"
                autoFocus
              />
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={savePrice}>
              <Text style={styles.saveButtonText}>Save Price</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setEditModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollContent: {
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 24,
    marginTop: 8,
  },
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  rateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  materialInfo: {
    flex: 1,
  },
  materialName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  priceText: {
    color: '#81C784',
    fontSize: 18,
    fontWeight: '600',
  },
  editButton: {
    backgroundColor: '#424242',
    borderRadius: 12,
    padding: 10,
  },
  emptyText: {
    color: '#78909C',
    fontSize: 16,
    textAlign: 'center',
    paddingVertical: 40,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    color: '#B0BEC5',
    fontSize: 14,
    marginBottom: 8,
  },
  priceInput: {
    backgroundColor: '#252525',
    borderRadius: 12,
    padding: 14,
    fontSize: 18,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#424242',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#616161',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  minDesc: { color: '#94a3b8', fontSize: 13, marginBottom: 12 },
  minRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  minInput: {
    flex: 1, backgroundColor: '#252525', borderRadius: 10, padding: 12,
    color: '#fff', fontSize: 16, borderWidth: 1, borderColor: '#424242',
  },
  minUnit: { color: '#94a3b8', fontSize: 15 },
  minSaveBtn: {
    backgroundColor: '#2563eb', borderRadius: 10,
    paddingHorizontal: 18, paddingVertical: 12,
  },
  minSaveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

export default AgencyRates;