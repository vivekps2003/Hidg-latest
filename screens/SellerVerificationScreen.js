import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { C, S, R } from '../theme';
import { sendNotification, NotificationTemplates } from '../notificationHelper';

export default function SellerVerificationScreen({ route, navigation }) {
  const { order } = route.params;
  const [processing, setProcessing] = useState(false);

  const handleAcceptWeight = async () => {
    Alert.alert(
      'Accept Weight',
      'Confirm the verified weight is correct? Order will proceed to payment.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            setProcessing(true);
            try {
              await updateDoc(doc(db, 'orders', order.id), {
                sellerVerified: true,
                sellerVerifiedAt: serverTimestamp(),
                status: 'verified',
                updatedAt: serverTimestamp(),
              });
              
              // Send notification to agency
              if (order.agencyId) {
                const notif = NotificationTemplates.weightAccepted(order.sellerName || 'Seller');
                await sendNotification(order.agencyId, notif.type, notif.message, order.id);
              }
              
              Alert.alert('Success', 'Weight accepted! Agency will now process payment.', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            } catch (e) {
              Alert.alert('Error', 'Failed to accept. Try again.');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleRequestVisit = async () => {
    Alert.alert(
      'Request Physical Verification',
      'You want to visit the agency to verify weight in person? This will pause the order.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request Visit',
          onPress: async () => {
            setProcessing(true);
            try {
              await updateDoc(doc(db, 'orders', order.id), {
                sellerVisitRequested: true,
                sellerVisitRequestedAt: serverTimestamp(),
                status: 'visit_requested',
                updatedAt: serverTimestamp(),
              });
              
              // Send notification to agency
              if (order.agencyId) {
                const notif = NotificationTemplates.visitRequested(order.sellerName || 'Seller');
                await sendNotification(order.agencyId, notif.type, notif.message, order.id);
              }
              
              Alert.alert('Success', 'Visit request sent! Agency will be notified.', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            } catch (e) {
              Alert.alert('Error', 'Failed to request visit. Try again.');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const originalTotal = order.materials.reduce((sum, mat) => sum + (mat.originalKg || mat.quantityKg), 0);
  const verifiedTotal = order.totalKg;
  const difference = verifiedTotal - originalTotal;
  const diffPercent = originalTotal > 0 ? ((difference / originalTotal) * 100).toFixed(1) : 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verify Weight</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Alert Banner */}
        <View style={styles.alertBanner}>
          <Ionicons name="alert-circle" size={24} color={C.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.alertTitle}>Weight Verification Required</Text>
            <Text style={styles.alertText}>
              Agency has verified the weight. Please review and confirm.
            </Text>
          </View>
        </View>

        {/* Order Info */}
        <View style={styles.card}>
          <Text style={styles.orderLabel}>Order #{order.id.slice(-6).toUpperCase()}</Text>
          <Text style={styles.orderSub}>{order.agencyName || 'Agency'}</Text>
        </View>

        {/* Weight Comparison */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Weight Comparison</Text>
          
          <View style={styles.compareRow}>
            <View style={styles.compareBox}>
              <Text style={styles.compareLabel}>Your Estimate</Text>
              <Text style={styles.compareValue}>{originalTotal.toFixed(2)} kg</Text>
            </View>
            <Ionicons name="arrow-forward" size={24} color={C.textMuted} />
            <View style={[styles.compareBox, styles.compareBoxVerified]}>
              <Text style={styles.compareLabel}>Verified Weight</Text>
              <Text style={[styles.compareValue, { color: C.primary }]}>{verifiedTotal.toFixed(2)} kg</Text>
            </View>
          </View>

          {difference !== 0 && (
            <View style={[styles.diffBanner, difference > 0 ? styles.diffPositive : styles.diffNegative]}>
              <Ionicons 
                name={difference > 0 ? 'trending-up' : 'trending-down'} 
                size={16} 
                color={difference > 0 ? C.success : C.danger} 
              />
              <Text style={[styles.diffText, { color: difference > 0 ? C.success : C.danger }]}>
                {difference > 0 ? '+' : ''}{difference.toFixed(2)} kg ({diffPercent > 0 ? '+' : ''}{diffPercent}%)
              </Text>
            </View>
          )}
        </View>

        {/* Material Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Material Breakdown</Text>
          {order.materials.map((mat, i) => (
            <View key={i} style={styles.matRow}>
              <View style={styles.matDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.matName}>{mat.materialName}</Text>
                <Text style={styles.matDetail}>
                  {mat.quantityKg} kg × ₹{mat.pricePerKg}/kg
                </Text>
              </View>
              <Text style={styles.matAmount}>₹{mat.subtotal?.toFixed(0)}</Text>
            </View>
          ))}
        </View>

        {/* Payment Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Payment Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Weight</Text>
            <Text style={styles.summaryValue}>{order.totalKg} kg</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Gross Amount</Text>
            <Text style={styles.summaryValue}>₹{order.estimatedAmount}</Text>
          </View>
          {order.totalCommission && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: C.danger }]}>Pickup Commission</Text>
              <Text style={[styles.summaryValue, { color: C.danger }]}>−₹{order.totalCommission}</Text>
            </View>
          )}
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>You'll Receive</Text>
            <Text style={styles.totalValue}>
              ₹{(order.sellerNetAmount || order.estimatedAmount).toLocaleString('en-IN')}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.visitBtn, processing && { opacity: 0.6 }]}
            onPress={handleRequestVisit}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator color={C.primary} />
            ) : (
              <>
                <Ionicons name="location" size={18} color={C.primary} />
                <Text style={styles.visitBtnText}>Visit to Verify</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.acceptBtn, processing && { opacity: 0.6 }]}
            onPress={handleAcceptWeight}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={styles.acceptBtnText}>Accept Weight</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Info Note */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={16} color={C.textMuted} />
          <Text style={styles.infoText}>
            If you have doubts about the weight, you can visit the agency to verify in person before payment.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.textPrimary },
  content: { padding: 16, gap: 16, paddingBottom: 40 },

  alertBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.primaryLight, borderRadius: R.lg, padding: 16,
    borderWidth: 1, borderColor: C.border, ...S.card,
  },
  alertTitle: { fontSize: 15, fontWeight: '700', color: C.primary, marginBottom: 2 },
  alertText: { fontSize: 13, color: C.primary, lineHeight: 18 },

  card: { backgroundColor: C.surface, borderRadius: R.xl, padding: 16, borderWidth: 1, borderColor: C.border, ...S.card },
  orderLabel: { fontSize: 18, fontWeight: '800', color: C.textPrimary },
  orderSub: { fontSize: 13, color: C.textMuted, marginTop: 4 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: C.textPrimary, marginBottom: 12 },

  compareRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12 },
  compareBox: {
    flex: 1, backgroundColor: C.surfaceAlt, borderRadius: R.lg, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: C.border,
  },
  compareBoxVerified: { backgroundColor: C.primaryLight, borderColor: C.primary },
  compareLabel: { fontSize: 12, color: C.textMuted, marginBottom: 6, fontWeight: '600' },
  compareValue: { fontSize: 20, fontWeight: '800', color: C.textPrimary },

  diffBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: R.md, padding: 10,
  },
  diffPositive: { backgroundColor: C.successLight },
  diffNegative: { backgroundColor: C.dangerLight },
  diffText: { fontSize: 14, fontWeight: '700' },

  matRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  matDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.primary },
  matName: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
  matDetail: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  matAmount: { fontSize: 14, fontWeight: '700', color: C.success },

  summaryCard: {
    backgroundColor: C.successLight, borderRadius: R.xl, padding: 18,
    borderWidth: 1, borderColor: C.successBorder, ...S.card,
  },
  summaryTitle: { fontSize: 15, fontWeight: '700', color: C.success, marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 14, color: C.textSecondary },
  summaryValue: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
  totalRow: { borderTopWidth: 1, borderTopColor: C.successBorder, paddingTop: 10, marginTop: 4 },
  totalLabel: { fontSize: 16, fontWeight: '700', color: C.textPrimary },
  totalValue: { fontSize: 18, fontWeight: '900', color: C.success },

  actionRow: { flexDirection: 'row', gap: 12 },
  visitBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: C.surface, borderRadius: R.lg, paddingVertical: 14,
    borderWidth: 2, borderColor: C.primary,
  },
  visitBtnText: { fontSize: 15, fontWeight: '700', color: C.primary },
  acceptBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: C.success, borderRadius: R.lg, paddingVertical: 14, ...S.btn,
  },
  acceptBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: C.surfaceAlt, borderRadius: R.md, padding: 12,
  },
  infoText: { flex: 1, fontSize: 12, color: C.textMuted, lineHeight: 16 },
});
