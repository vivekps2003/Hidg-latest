// CreateOrder.js
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import * as Location from 'expo-location';

export default function CreateOrder({ route, navigation }) {
  const { agency } = route.params || {};

  if (!agency) {
    Alert.alert('Error', 'No agency selected. Please go back and choose an agency.');
    navigation.goBack();
    return null;
  }

  const [quantities, setQuantities] = useState({});
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    const initial = {};
    (agency.rates || []).forEach(rate => {
      initial[rate.materialName] = '';
    });
    setQuantities(initial);
  }, [agency.rates]);

  const calculateTotals = () => {
    let totalKg = 0;
    let estimatedAmount = 0;
    (agency.rates || []).forEach(rate => {
      const qty = parseFloat(quantities[rate.materialName] || 0);
      if (!isNaN(qty) && qty > 0) {
        totalKg += qty;
        estimatedAmount += qty * rate.pricePerKg;
      }
    });
    return {
      totalKg: totalKg.toFixed(1),
      estimatedAmount: estimatedAmount.toFixed(0),
    };
  };

  const { totalKg, estimatedAmount } = calculateTotals();

  const handleQuantityChange = (materialName, value) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setQuantities(prev => ({ ...prev, [materialName]: value }));
    }
  };

  const hasAnyQuantity = () =>
    Object.values(quantities).some(q => parseFloat(q) > 0);

  const handleSubmit = async () => {
    if (!hasAnyQuantity()) {
      Alert.alert('No materials selected', 'Please enter quantity for at least one material.');
      return;
    }

    setLoading(true);

    let sellerLatitude = null;
    let sellerLongitude = null;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        sellerLatitude = location.coords.latitude;
        sellerLongitude = location.coords.longitude;
      }
    } catch (locationError) {
      console.log('Location fetch failed:', locationError);
    }

    const selectedMaterials = [];
    let totalKgNum = 0;
    let estimatedAmountNum = 0;

    (agency.rates || []).forEach(rate => {
      const qty = parseFloat(quantities[rate.materialName] || '0');
      if (!isNaN(qty) && qty > 0) {
        selectedMaterials.push({
          materialName: rate.materialName,
          pricePerKg: rate.pricePerKg,
          quantityKg: qty,
          subtotal: qty * rate.pricePerKg,
        });
        totalKgNum += qty;
        estimatedAmountNum += qty * rate.pricePerKg;
      }
    });

    const orderData = {
      sellerId: auth.currentUser?.uid,
      agencyId: agency.id,
      agencyName: agency.businessName || 'Unnamed Agency',
      materials: selectedMaterials,
      totalKg: parseFloat(totalKgNum.toFixed(1)),
      estimatedAmount: parseFloat(estimatedAmountNum.toFixed(0)),
      sellerLatitude,
      sellerLongitude,
      agencyLatitude: agency.latitude || null,
      agencyLongitude: agency.longitude || null,
      // ✅ status is now 'pending' so agency can accept/reject
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, 'orders'), orderData);
      Alert.alert(
        'Order Sent!',
        'Your order request has been sent. Waiting for agency confirmation.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('SellerTabs', { screen: 'Orders' }),
          },
        ]
      );
    } catch (error) {
      console.error('Order creation failed:', error);
      Alert.alert('Error', 'Failed to send order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={28} color="#f1f5f9" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Create Order</Text>
            <View style={{ width: 28 }} />
          </View>

          {/* Agency Info */}
          <View style={styles.agencyCard}>
            <Text style={styles.agencyName}>{agency.businessName || 'Agency'}</Text>
            <View style={styles.agencyInfoRow}>
              <Ionicons name="location-outline" size={16} color="#94a3b8" />
              <Text style={styles.agencyInfoText}>
                {agency.location || 'Location not specified'}
              </Text>
            </View>
            <View style={styles.agencyInfoRow}>
              <Ionicons name="business-outline" size={16} color="#94a3b8" />
              <Text style={styles.agencyInfoText}>
                {agency.businessCategory || 'Scrap Buyer'}
              </Text>
            </View>
          </View>

          {/* Pending Notice */}
          <View style={styles.noticeCard}>
            <Ionicons name="information-circle-outline" size={18} color="#fbbf24" />
            <Text style={styles.noticeText}>
              Agency will review and accept or reject your request.
            </Text>
          </View>

          {/* Materials List */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Enter Approximate Quantities (kg)</Text>
            {(agency.rates || []).length === 0 ? (
              <Text style={styles.emptyText}>No rates available from this agency</Text>
            ) : (
              (agency.rates || []).map((rate, index) => (
                <View key={index} style={styles.materialRow}>
                  <View style={styles.materialInfo}>
                    <Text style={styles.materialName}>{rate.materialName}</Text>
                    <Text style={styles.priceText}>₹{rate.pricePerKg.toFixed(1)} / kg</Text>
                  </View>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.quantityInput}
                      value={quantities[rate.materialName] || ''}
                      onChangeText={val => handleQuantityChange(rate.materialName, val)}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor="#64748b"
                    />
                    <Text style={styles.kgLabel}>kg</Text>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Summary */}
          {hasAnyQuantity() && (
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Weight</Text>
                <Text style={styles.summaryValue}>{totalKg} kg</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Estimated Payout</Text>
                <Text style={[styles.summaryValue, { color: '#60a5fa' }]}>
                  ₹{estimatedAmount}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!hasAnyQuantity() || loading) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!hasAnyQuantity() || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Send Order Request</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scrollContent: { padding: 20, paddingBottom: 120 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerTitle: { color: '#f1f5f9', fontSize: 22, fontWeight: '700' },
  agencyCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  agencyName: { color: '#f1f5f9', fontSize: 20, fontWeight: '700', marginBottom: 12 },
  agencyInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  agencyInfoText: { color: '#94a3b8', fontSize: 15, marginLeft: 8, flex: 1 },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1a0f',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#78350f',
    gap: 8,
  },
  noticeText: { color: '#fbbf24', fontSize: 13, flex: 1 },
  section: { marginBottom: 24 },
  sectionTitle: { color: '#cbd5e1', fontSize: 18, fontWeight: '600', marginBottom: 12 },
  materialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  materialInfo: { flex: 1 },
  materialName: { color: '#e2e8f0', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  priceText: { color: '#60a5fa', fontSize: 15, fontWeight: '500' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
  },
  quantityInput: { width: 90, color: '#f1f5f9', fontSize: 16, textAlign: 'right' },
  kgLabel: { color: '#94a3b8', fontSize: 14, marginLeft: 6 },
  summaryCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 8 },
  summaryLabel: { color: '#cbd5e1', fontSize: 16 },
  summaryValue: { color: '#f1f5f9', fontSize: 16, fontWeight: '600' },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  submitButton: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: { backgroundColor: '#4a5568', shadowOpacity: 0, elevation: 0 },
  submitButtonText: { color: 'white', fontSize: 17, fontWeight: '700' },
  emptyText: { color: '#94a3b8', fontSize: 16, textAlign: 'center', paddingVertical: 40 },
});