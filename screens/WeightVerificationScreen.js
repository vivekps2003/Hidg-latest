import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, Alert, ActivityIndicator, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { A, AS, AR } from '../agencyTheme';
import { sendNotification, NotificationTemplates } from '../notificationHelper';

export default function WeightVerificationScreen({ route, navigation }) {
  const { order } = route.params;
  const [verifiedWeights, setVerifiedWeights] = useState(
    (order.materials || []).map(mat => ({
      materialName: mat.materialName,
      originalKg: mat.quantityKg,
      verifiedKg: mat.quantityKg.toString(),
      pricePerKg: mat.pricePerKg,
    }))
  );
  const [processing, setProcessing] = useState(false);

  const updateWeight = (index, value) => {
    const updated = [...verifiedWeights];
    updated[index].verifiedKg = value;
    setVerifiedWeights(updated);
  };

  const copyOriginalWeights = () => {
    const updated = verifiedWeights.map(mat => ({
      ...mat,
      verifiedKg: mat.originalKg.toString(),
    }));
    setVerifiedWeights(updated);
    Alert.alert('Copied', 'Original weights copied to verified fields');
  };

  const calculateTotals = () => {
    let totalKg = 0;
    let totalAmount = 0;
    const materials = verifiedWeights.map(mat => {
      const kg = parseFloat(mat.verifiedKg) || 0;
      const subtotal = kg * mat.pricePerKg;
      totalKg += kg;
      totalAmount += subtotal;
      return { ...mat, quantityKg: kg, subtotal };
    });
    return { materials, totalKg, totalAmount };
  };

  const handleVerify = async () => {
    const { materials, totalKg, totalAmount } = calculateTotals();

    if (totalKg === 0) {
      Alert.alert('Invalid', 'Total weight cannot be zero');
      return;
    }

    // Validate all weights are entered
    const hasEmptyWeight = verifiedWeights.some(mat => !mat.verifiedKg || mat.verifiedKg.trim() === '');
    if (hasEmptyWeight) {
      Alert.alert('Missing Weight', 'Please enter weight for all materials');
      return;
    }

    // Calculate distribution
    const pickupCommission = order.commissionPerKg ? totalKg * order.commissionPerKg : 0;
    const adminCommissionRate = 0.05; // 5% admin commission
    const adminCommission = totalAmount * adminCommissionRate;
    const sellerAmount = totalAmount - pickupCommission - adminCommission;

    Alert.alert(
      'Confirm Weight',
      `Verified weight: ${totalKg.toFixed(2)} kg\nTotal: ₹${totalAmount.toFixed(0)}\n\nDistribution:\nSeller: ₹${sellerAmount.toFixed(0)}\nPickup: ₹${pickupCommission.toFixed(0)}\nAdmin: ₹${adminCommission.toFixed(0)}\n\nSeller will be notified.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setProcessing(true);
            try {
              const updateData = {
                materials,
                totalKg,
                estimatedAmount: totalAmount,
                weightVerified: true,
                weightVerifiedAt: serverTimestamp(),
                status: 'weight_verified',
                sellerVerificationRequired: true,
                updatedAt: serverTimestamp(),
                
                // Payment distribution
                totalCommission: pickupCommission,
                adminCommission: adminCommission,
                sellerNetAmount: sellerAmount,
              };

              await updateDoc(doc(db, 'orders', order.id), updateData);
              
              // Send notification to seller
              if (order.sellerId) {
                const notif = NotificationTemplates.weightVerified(totalKg.toFixed(2), totalAmount.toFixed(0));
                await sendNotification(order.sellerId, notif.type, notif.message, order.id);
              }
              
              Alert.alert('Success', 'Weight verified! Seller will be notified.', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            } catch (e) {
              console.error('Weight verification error:', e);
              Alert.alert('Error', `Failed to verify weight: ${e.message || 'Please try again.'}`);
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const { totalKg, totalAmount } = calculateTotals();
  const pickupCommission = order.commissionPerKg ? totalKg * order.commissionPerKg : 0;
  const adminCommission = totalAmount * 0.05; // 5% admin commission
  const sellerAmount = totalAmount - pickupCommission - adminCommission;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={A.bg} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={A.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Weight Verification</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle" size={20} color={A.info} />
          <Text style={styles.infoText}>
            Enter the exact weight measured at your facility. Seller will be notified to verify.
          </Text>
        </View>

        {/* Order Info */}
        <View style={styles.card}>
          <Text style={styles.orderLabel}>Order #{order.id.slice(-6).toUpperCase()}</Text>
          <Text style={styles.orderSub}>Original Total: {order.totalKg} kg</Text>
          <Text style={styles.orderNote}>Enter verified weight for each material below</Text>
        </View>

        {/* Weight Inputs */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Verify Material Weights</Text>
            <TouchableOpacity 
              style={styles.copyBtn}
              onPress={copyOriginalWeights}
            >
              <Ionicons name="copy-outline" size={14} color={A.primary} />
              <Text style={styles.copyBtnText}>Use Original</Text>
            </TouchableOpacity>
          </View>
          {verifiedWeights.map((mat, i) => (
            <View key={i} style={styles.matCard}>
              <View style={styles.matHeader}>
                <Text style={styles.matName}>{mat.materialName}</Text>
                <Text style={styles.matPrice}>₹{mat.pricePerKg}/kg</Text>
              </View>
              <View style={styles.matRow}>
                <View style={styles.inputWrap}>
                  <Text style={styles.inputLabel}>Original Weight</Text>
                  <View style={styles.inputBox}>
                    <Text style={styles.inputValue}>{mat.originalKg} kg</Text>
                  </View>
                </View>
                <Ionicons name="arrow-forward" size={20} color={A.textMuted} style={{ marginTop: 20 }} />
                <View style={styles.inputWrap}>
                  <Text style={styles.inputLabel}>Verified Weight *</Text>
                  <View style={{ position: 'relative' }}>
                    <TextInput
                      style={styles.input}
                      value={mat.verifiedKg}
                      onChangeText={(val) => updateWeight(i, val)}
                      keyboardType="decimal-pad"
                      placeholder="0.0"
                      placeholderTextColor={A.textMuted}
                      returnKeyType="done"
                    />
                    <Text style={styles.inputUnit}>kg</Text>
                  </View>
                </View>
              </View>
              <View style={styles.matFooter}>
                <Text style={styles.matSubtotal}>
                  Subtotal: ₹{((parseFloat(mat.verifiedKg) || 0) * mat.pricePerKg).toFixed(0)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Verified Weight</Text>
            <Text style={styles.summaryValue}>{totalKg.toFixed(2)} kg</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Gross Amount</Text>
            <Text style={[styles.summaryValue, { color: A.success }]}>₹{totalAmount.toFixed(0)}</Text>
          </View>
          <View style={styles.divider} />
          <Text style={styles.distributionTitle}>Payment Distribution:</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>→ Seller Amount</Text>
            <Text style={[styles.summaryValue, { color: A.success }]}>₹{sellerAmount.toFixed(0)}</Text>
          </View>
          {pickupCommission > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>→ Pickup Commission</Text>
              <Text style={[styles.summaryValue, { color: A.info }]}>₹{pickupCommission.toFixed(0)}</Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>→ Admin Commission (5%)</Text>
            <Text style={[styles.summaryValue, { color: A.primary }]}>₹{adminCommission.toFixed(0)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.netLabel}>Agency Pays Total</Text>
            <Text style={styles.netValue}>₹{totalAmount.toFixed(0)}</Text>
          </View>
        </View>

        {/* Verify Button */}
        <TouchableOpacity
          style={[styles.verifyBtn, processing && { opacity: 0.6 }]}
          onPress={handleVerify}
          disabled={processing}
        >
          {processing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-done" size={20} color="#fff" />
              <Text style={styles.verifyBtnText}>Verify & Notify Seller</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: A.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: A.surface, borderBottomWidth: 1, borderBottomColor: A.border,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: A.textPrimary },
  content: { padding: 16, gap: 16, paddingBottom: 40 },

  infoBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: A.infoLight, borderRadius: AR.lg, padding: 14,
    borderWidth: 1, borderColor: A.infoBorder,
  },
  infoText: { flex: 1, fontSize: 13, color: A.info, lineHeight: 18 },

  card: { backgroundColor: A.surface, borderRadius: AR.xl, padding: 16, borderWidth: 1, borderColor: A.border, ...AS.card },
  orderLabel: { fontSize: 18, fontWeight: '800', color: A.textPrimary },
  orderSub: { fontSize: 13, color: A.textMuted, marginTop: 4 },
  orderNote: { fontSize: 12, color: A.info, marginTop: 8, fontStyle: 'italic' },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: A.textPrimary, marginBottom: 12 },
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: A.primaryLight, borderRadius: AR.sm, paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: A.primary,
  },
  copyBtnText: { fontSize: 12, fontWeight: '600', color: A.primary },

  matCard: {
    backgroundColor: A.surfaceAlt, borderRadius: AR.lg, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: A.border,
  },
  matHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  matName: { fontSize: 15, fontWeight: '700', color: A.textPrimary },
  matPrice: { fontSize: 13, fontWeight: '600', color: A.primary },
  matRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  inputWrap: { flex: 1, position: 'relative' },
  inputLabel: { fontSize: 11, color: A.textMuted, marginBottom: 6, fontWeight: '600', textTransform: 'uppercase' },
  inputBox: {
    backgroundColor: A.bg, borderRadius: AR.md, padding: 12,
    borderWidth: 1, borderColor: A.border,
  },
  inputValue: { fontSize: 15, fontWeight: '600', color: A.textSecondary },
  input: {
    backgroundColor: A.bg, borderRadius: AR.md, padding: 12,
    fontSize: 15, fontWeight: '600', color: A.textPrimary,
    borderWidth: 1, borderColor: A.primary, paddingRight: 36,
  },
  inputUnit: {
    position: 'absolute', right: 12, bottom: 12,
    fontSize: 13, color: A.textMuted, fontWeight: '600',
  },
  matFooter: { alignItems: 'flex-end' },
  matSubtotal: { fontSize: 14, fontWeight: '700', color: A.success },

  summaryCard: {
    backgroundColor: A.primaryLight, borderRadius: AR.xl, padding: 18,
    borderWidth: 1, borderColor: A.border, ...AS.card,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  summaryLabel: { fontSize: 14, color: A.textSecondary, fontWeight: '600' },
  summaryValue: { fontSize: 16, fontWeight: '700', color: A.textPrimary },
  divider: { height: 1, backgroundColor: A.border, marginVertical: 8 },
  distributionTitle: { fontSize: 13, fontWeight: '700', color: A.textPrimary, marginBottom: 8, marginTop: 4 },
  totalRow: { borderTopWidth: 2, borderTopColor: A.primary, paddingTop: 12, marginTop: 8 },
  netLabel: { fontSize: 16, fontWeight: '800', color: A.textPrimary },
  netValue: { fontSize: 18, fontWeight: '900', color: A.success },

  verifyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: A.success, borderRadius: AR.lg, paddingVertical: 16, ...AS.btn,
  },
  verifyBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
