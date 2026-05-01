import React, { useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, StatusBar, ActivityIndicator,
  Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import * as Location from 'expo-location';
import { sendNotification, NotificationTemplates } from '../notificationHelper';

export default function CreateOrder({ route, navigation }) {
  const { agency } = route.params || {};

  if (!agency) {
    Alert.alert('Error', 'No agency selected.');
    navigation.goBack();
    return null;
  }

  const [quantities, setQuantities] = useState({});
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    const initial = {};
    (agency.rates || []).forEach(r => { initial[r.materialName] = ''; });
    setQuantities(initial);
  }, [agency.rates]);

  const calculateTotals = () => {
    let totalKg = 0, estimatedAmount = 0;
    (agency.rates || []).forEach(rate => {
      const qty = parseFloat(quantities[rate.materialName] || 0);
      if (!isNaN(qty) && qty > 0) {
        totalKg += qty;
        estimatedAmount += qty * rate.pricePerKg;
      }
    });
    return { totalKg: parseFloat(totalKg.toFixed(1)), estimatedAmount: parseFloat(estimatedAmount.toFixed(0)) };
  };

  const { totalKg, estimatedAmount } = calculateTotals();
  const minKg = agency.minPickupKg || 0;
  const isBelowMin = minKg > 0 && totalKg > 0 && totalKg < minKg;

  const hasAnyQuantity = () => Object.values(quantities).some(q => parseFloat(q) > 0);

  const handleQuantityChange = (materialName, value) => {
    if (value === '' || /^\d*\.?\d*$/.test(value))
      setQuantities(prev => ({ ...prev, [materialName]: value }));
  };

  const handleSubmit = async () => {
    if (!hasAnyQuantity()) {
      Alert.alert('No materials', 'Enter quantity for at least one material.');
      return;
    }

    setLoading(true);
    let sellerLatitude = null, sellerLongitude = null;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        sellerLatitude = loc.coords.latitude;
        sellerLongitude = loc.coords.longitude;
      }
    } catch (e) { console.log('Location failed:', e); }

    const selectedMaterials = [];
    let totalKgNum = 0, estimatedAmountNum = 0;
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

    const finalTotalKg = parseFloat(totalKgNum.toFixed(1));
    const finalEstimated = parseFloat(estimatedAmountNum.toFixed(0));
    const belowMinimum = minKg > 0 && finalTotalKg < minKg;

    // Get seller name
    let sellerName = 'Seller';
    try {
      const userQuery = query(collection(db, 'users'), where('__name__', '==', auth.currentUser.uid));
      const userSnap = await getDocs(userQuery);
      if (!userSnap.empty) {
        sellerName = userSnap.docs[0].data().name || 'Seller';
      }
    } catch (e) {
      console.log('Failed to get seller name:', e);
    }

    const orderData = {
      sellerId: auth.currentUser?.uid,
      sellerName: sellerName,
      agencyId: agency.id,
      agencyName: agency.businessName || 'Unnamed Agency',
      agencyLatitude: agency.latitude || null,
      agencyLongitude: agency.longitude || null,
      materials: selectedMaterials,
      totalKg: finalTotalKg,
      estimatedAmount: finalEstimated,
      sellerLatitude,
      sellerLongitude,
      minPickupKg: minKg,
      belowMinimum,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      const docRef = await addDoc(collection(db, 'orders'), orderData);
      
      // Send notification to agency
      const notif = NotificationTemplates.newOrder(sellerName, finalTotalKg);
      await sendNotification(agency.id, notif.type, notif.message, docRef.id);
      
      Alert.alert(
        'Order Sent!',
        'Your order has been sent to the agency for review.',
        [{ text: 'OK', onPress: () => navigation.navigate('SellerTabs', { screen: 'Orders' }) }]
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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
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
              <Text style={styles.agencyInfoText}>{agency.location || 'Location not specified'}</Text>
            </View>
            {minKg > 0 && (
              <View style={styles.agencyInfoRow}>
                <Ionicons name="scale-outline" size={16} color="#94a3b8" />
                <Text style={styles.agencyInfoText}>Minimum pickup: {minKg} kg</Text>
              </View>
            )}
          </View>

          {/* Materials */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Enter Quantities (kg)</Text>
            {(agency.rates || []).map((rate, i) => (
              <View key={i} style={styles.materialRow}>
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
            ))}
          </View>

          {/* Summary + Commission if below min */}
          {hasAnyQuantity() && (
            <View style={styles.summaryCard}>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Weight</Text>
                <Text style={styles.summaryValue}>{totalKg} kg</Text>
              </View>

              {/* Normal payout */}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Estimated Payout</Text>
                <Text style={[styles.summaryValue, { color: '#60a5fa' }]}>₹{estimatedAmount}</Text>
              </View>

              {isBelowMin && (
                <View style={styles.belowMinWarning}>
                  <Ionicons name="information-circle" size={16} color="#fbbf24" />
                  <Text style={styles.belowMinWarningText}>
                    Below minimum ({minKg} kg). Agency will assign pickup agent after accepting.
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* Submit */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={[styles.submitButton, (!hasAnyQuantity() || loading) && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!hasAnyQuantity() || loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.submitButtonText}>Send Order Request</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scrollContent: { padding: 20, paddingBottom: 120 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  headerTitle: { color: '#f1f5f9', fontSize: 22, fontWeight: '700' },

  agencyCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#334155' },
  agencyName: { color: '#f1f5f9', fontSize: 20, fontWeight: '700', marginBottom: 10 },
  agencyInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  agencyInfoText: { color: '#94a3b8', fontSize: 14, marginLeft: 8, flex: 1 },

  section: { marginBottom: 24 },
  sectionTitle: { color: '#cbd5e1', fontSize: 17, fontWeight: '600', marginBottom: 12 },
  materialRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#334155' },
  materialInfo: { flex: 1 },
  materialName: { color: '#e2e8f0', fontSize: 15, fontWeight: '600', marginBottom: 3 },
  priceText: { color: '#60a5fa', fontSize: 14 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', borderRadius: 10, borderWidth: 1, borderColor: '#334155', paddingHorizontal: 10 },
  quantityInput: { width: 80, color: '#f1f5f9', fontSize: 16, textAlign: 'right', paddingVertical: 8 },
  kgLabel: { color: '#94a3b8', fontSize: 13, marginLeft: 4 },

  summaryCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#334155' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 6 },
  summaryLabel: { color: '#cbd5e1', fontSize: 15 },
  summaryValue: { color: '#f1f5f9', fontSize: 15, fontWeight: '600' },

  belowMinWarning: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#1c1a0f', borderRadius: 8, padding: 10,
    marginTop: 10, borderWidth: 1, borderColor: '#78350f',
  },
  belowMinWarningText: { flex: 1, color: '#fbbf24', fontSize: 12 },

  bottomContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: '#0f172a', borderTopWidth: 1, borderTopColor: '#334155' },
  submitButton: { backgroundColor: '#2563eb', borderRadius: 14, paddingVertical: 16, alignItems: 'center', elevation: 6 },
  submitButtonDisabled: { backgroundColor: '#4a5568', elevation: 0 },
  submitButtonText: { color: 'white', fontSize: 17, fontWeight: '700' },
});
