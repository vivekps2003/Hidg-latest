import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, Alert, ActivityIndicator, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../firebase';
import { doc, updateDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { C, S, R } from '../theme';
import { sendNotification, NotificationTemplates } from '../notificationHelper';

const PAYMENT_METHODS = [
  { id: 'upi', label: 'UPI', icon: 'phone-portrait-outline' },
  { id: 'card', label: 'Card', icon: 'card-outline' },
  { id: 'netbanking', label: 'Net Banking', icon: 'globe-outline' },
  { id: 'cash', label: 'Cash on Delivery', icon: 'cash-outline' },
];

export default function PaymentScreen({ route, navigation }) {
  const { order } = route.params;
  const [selectedMethod, setSelectedMethod] = useState('upi');
  const [paymentDetails, setPaymentDetails] = useState('');
  const [processing, setProcessing] = useState(false);

  // Agency pays FULL amount to admin
  const totalAmount = order.estimatedAmount;
  
  // Admin will distribute:
  // - Commission to admin
  // - Payment to pickup agent (if any)
  // - Remaining to seller

  const handlePayment = async () => {
    if (!paymentDetails.trim() && selectedMethod !== 'cash') {
      Alert.alert('Required', 'Please enter payment details');
      return;
    }

    Alert.alert(
      'Confirm Payment',
      `Pay ₹${totalAmount.toLocaleString('en-IN')} to Admin?\n\nAdmin will distribute:\n- Seller: ₹${order.sellerNetAmount || order.estimatedAmount}\n${order.totalCommission ? `- Pickup Agent: ₹${order.totalCommission}\n` : ''}- Admin Commission: ₹${order.adminCommission || 0}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pay Now',
          onPress: async () => {
            setProcessing(true);
            try {
              const paymentData = {
                paymentStatus: 'paid',
                paymentMethod: selectedMethod,
                paymentDetails: paymentDetails,
                paidAmount: totalAmount,
                paidAt: serverTimestamp(),
                paidBy: 'agency',
                paidTo: 'admin',
                status: 'payment_received',
                updatedAt: serverTimestamp(),
                
                // Distribution details
                paymentDistribution: {
                  totalPaid: totalAmount,
                  sellerAmount: order.sellerNetAmount || order.estimatedAmount,
                  pickupAgentAmount: order.totalCommission || 0,
                  adminCommission: order.adminCommission || 0,
                  distributionStatus: 'pending',
                },
              };

              await updateDoc(doc(db, 'orders', order.id), paymentData);
              
              // Send notification to admin
              try {
                const adminQuery = query(collection(db, 'users'), where('role', '==', 'admin'));
                const adminSnap = await getDocs(adminQuery);
                adminSnap.forEach(async (adminDoc) => {
                  const notif = NotificationTemplates.paymentReceivedAdmin(order.agencyName || 'Agency', totalAmount);
                  await sendNotification(adminDoc.id, notif.type, notif.message, order.id);
                });
              } catch (notifErr) {
                console.error('Notification error:', notifErr);
              }
              
              Alert.alert('Success', 'Payment sent to Admin! Admin will distribute to all parties.', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            } catch (e) {
              console.error('Payment error:', e);
              Alert.alert('Error', `Payment failed: ${e.message || 'Please try again.'}`);
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Amount Card */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Total Amount to Admin</Text>
          <Text style={styles.amountValue}>₹{totalAmount.toLocaleString('en-IN')}</Text>
          <Text style={styles.amountSub}>Order #{order.id.slice(-6).toUpperCase()}</Text>
          <Text style={styles.amountNote}>Admin will distribute to all parties</Text>
        </View>

        {/* Payment Methods */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Select Payment Method</Text>
          {PAYMENT_METHODS.map(method => (
            <TouchableOpacity
              key={method.id}
              style={[styles.methodBtn, selectedMethod === method.id && styles.methodBtnActive]}
              onPress={() => setSelectedMethod(method.id)}
            >
              <View style={styles.methodLeft}>
                <View style={[styles.methodIcon, selectedMethod === method.id && styles.methodIconActive]}>
                  <Ionicons name={method.icon} size={20} color={selectedMethod === method.id ? '#fff' : C.primary} />
                </View>
                <Text style={[styles.methodLabel, selectedMethod === method.id && styles.methodLabelActive]}>
                  {method.label}
                </Text>
              </View>
              <View style={[styles.radio, selectedMethod === method.id && styles.radioActive]}>
                {selectedMethod === method.id && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Payment Details */}
        {selectedMethod !== 'cash' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {selectedMethod === 'upi' ? 'UPI ID / Mobile' : selectedMethod === 'card' ? 'Card Number' : 'Account Details'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={selectedMethod === 'upi' ? 'Enter UPI ID or Mobile' : selectedMethod === 'card' ? 'Enter Card Number' : 'Enter Account Details'}
              placeholderTextColor={C.textMuted}
              value={paymentDetails}
              onChangeText={setPaymentDetails}
              keyboardType={selectedMethod === 'card' ? 'numeric' : 'default'}
            />
          </View>
        )}

        {/* Order Summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment Distribution</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Weight</Text>
            <Text style={styles.summaryValue}>{order.totalKg} kg</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Gross Amount</Text>
            <Text style={styles.summaryValue}>₹{order.estimatedAmount}</Text>
          </View>
          <View style={styles.divider} />
          <Text style={styles.distributionTitle}>Admin will distribute:</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>→ To Seller</Text>
            <Text style={[styles.summaryValue, { color: C.success }]}>₹{order.sellerNetAmount || order.estimatedAmount}</Text>
          </View>
          {order.totalCommission > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>→ To Pickup Agent</Text>
              <Text style={[styles.summaryValue, { color: C.info }]}>₹{order.totalCommission}</Text>
            </View>
          )}
          {order.adminCommission > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>→ Admin Commission</Text>
              <Text style={[styles.summaryValue, { color: C.primary }]}>₹{order.adminCommission}</Text>
            </View>
          )}
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>You Pay to Admin</Text>
            <Text style={styles.totalValue}>₹{totalAmount.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        {/* Pay Button */}
        <TouchableOpacity
          style={[styles.payBtn, processing && { opacity: 0.6 }]}
          onPress={handlePayment}
          disabled={processing}
        >
          {processing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.payBtnText}>Pay ₹{totalAmount.toLocaleString('en-IN')} to Admin</Text>
            </>
          )}
        </TouchableOpacity>
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

  amountCard: {
    backgroundColor: C.primaryLight, borderRadius: R.xl, padding: 24,
    alignItems: 'center', borderWidth: 1, borderColor: C.border, ...S.card,
  },
  amountLabel: { fontSize: 13, color: C.primary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  amountValue: { fontSize: 40, fontWeight: '900', color: C.primary, marginVertical: 8 },
  amountSub: { fontSize: 12, color: C.textMuted },
  amountNote: { fontSize: 11, color: C.primary, marginTop: 4, fontStyle: 'italic' },

  card: { backgroundColor: C.surface, borderRadius: R.xl, padding: 16, borderWidth: 1, borderColor: C.border, ...S.card },
  cardTitle: { fontSize: 15, fontWeight: '700', color: C.textPrimary, marginBottom: 12 },

  methodBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderRadius: R.lg, marginBottom: 10,
    backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border,
  },
  methodBtnActive: { backgroundColor: C.primaryLight, borderColor: C.primary },
  methodLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  methodIcon: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: C.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  methodIconActive: { backgroundColor: C.primary },
  methodLabel: { fontSize: 15, fontWeight: '600', color: C.textPrimary },
  methodLabelActive: { color: C.primary },
  radio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    borderColor: C.border, alignItems: 'center', justifyContent: 'center',
  },
  radioActive: { borderColor: C.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.primary },

  input: {
    backgroundColor: C.surfaceAlt, borderRadius: R.md, padding: 14,
    fontSize: 15, color: C.textPrimary, borderWidth: 1, borderColor: C.border,
  },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 14, color: C.textSecondary },
  summaryValue: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 12 },
  distributionTitle: { fontSize: 13, fontWeight: '700', color: C.textPrimary, marginBottom: 8, marginTop: 4 },
  totalRow: { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10, marginTop: 4 },
  totalLabel: { fontSize: 16, fontWeight: '700', color: C.textPrimary },
  totalValue: { fontSize: 18, fontWeight: '800', color: C.success },

  payBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: C.success, borderRadius: R.lg, paddingVertical: 16, ...S.btn,
  },
  payBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
