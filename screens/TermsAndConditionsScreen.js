import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, S, R } from '../theme';

export default function TermsAndConditionsScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms & Conditions</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.updateBanner}>
          <Ionicons name="calendar-outline" size={16} color={C.primary} />
          <Text style={styles.updateText}>Last Updated: January 2025</Text>
        </View>

        <Text style={styles.intro}>
          Welcome to HID-G Scrap Collection App. By accessing or using our services, you agree to be bound by these Terms and Conditions. Please read them carefully.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
          <Text style={styles.sectionText}>
            By registering an account and using HID-G, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions, along with our Privacy Policy.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. User Accounts</Text>
          <Text style={styles.sectionText}>
            • You must provide accurate and complete information during registration{'\n'}
            • You are responsible for maintaining the confidentiality of your account credentials{'\n'}
            • You must be at least 18 years old to use our services{'\n'}
            • One email address can only be associated with one account{'\n'}
            • You are responsible for all activities under your account
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. User Roles & Responsibilities</Text>
          
          <Text style={styles.subTitle}>3.1 Sellers (Individuals/Businesses)</Text>
          <Text style={styles.sectionText}>
            • Must provide accurate information about scrap materials{'\n'}
            • Must ensure scrap is accessible for pickup at specified location{'\n'}
            • Must verify weight measurements before accepting payment{'\n'}
            • Cannot cancel orders after pickup agent has been assigned{'\n'}
            • Must maintain scrap in safe and accessible condition
          </Text>

          <Text style={styles.subTitle}>3.2 Agencies</Text>
          <Text style={styles.sectionText}>
            • Must have valid GST registration{'\n'}
            • Must provide accurate pricing and rates{'\n'}
            • Must verify weight accurately and honestly{'\n'}
            • Must process payments within 24 hours of weight verification{'\n'}
            • Must maintain proper documentation for all transactions{'\n'}
            • Responsible for ensuring pickup agents complete deliveries
          </Text>

          <Text style={styles.subTitle}>3.3 Pickup Agents</Text>
          <Text style={styles.sectionText}>
            • Must have valid identification and vehicle documents{'\n'}
            • Must complete pickups within agreed timeframe{'\n'}
            • Must handle materials safely and professionally{'\n'}
            • Must deliver materials to agency without tampering{'\n'}
            • Cannot demand additional payments from sellers{'\n'}
            • Must maintain professional conduct at all times
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Payment Terms</Text>
          <Text style={styles.sectionText}>
            • All payments are processed through the app{'\n'}
            • Agency pays full amount to Admin after weight verification{'\n'}
            • Admin distributes payments to Seller and Pickup Agent{'\n'}
            • Admin retains 5% commission on all transactions{'\n'}
            • Pickup agent commission is deducted from seller's payout{'\n'}
            • Payments are non-refundable once distributed{'\n'}
            • Disputes must be raised within 48 hours of transaction
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Weight Verification</Text>
          <Text style={styles.sectionText}>
            • Agency must verify actual weight after pickup{'\n'}
            • Seller has right to verify weight in person if doubtful{'\n'}
            • Seller must accept or reject verified weight within 24 hours{'\n'}
            • Payment proceeds only after seller accepts verified weight{'\n'}
            • Disputes regarding weight must be resolved before payment
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Prohibited Activities</Text>
          <Text style={styles.sectionText}>
            • Providing false or misleading information{'\n'}
            • Manipulating weights or measurements{'\n'}
            • Creating multiple accounts with same identity{'\n'}
            • Engaging in fraudulent transactions{'\n'}
            • Harassing or threatening other users{'\n'}
            • Selling hazardous or illegal materials{'\n'}
            • Attempting to bypass payment system{'\n'}
            • Using the platform for money laundering
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Commission Structure</Text>
          <Text style={styles.sectionText}>
            • Pickup Agent Commission: Negotiated per kg rate{'\n'}
            • Admin Commission: 5% of total transaction value{'\n'}
            • Commissions are automatically calculated and deducted{'\n'}
            • Commission rates are subject to change with notice
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Cancellation & Refunds</Text>
          <Text style={styles.sectionText}>
            • Sellers can cancel orders before agency acceptance{'\n'}
            • Orders cannot be cancelled after pickup agent assignment{'\n'}
            • Agencies can reject orders before acceptance{'\n'}
            • No refunds after payment distribution{'\n'}
            • Disputes are handled through complaint system
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Liability & Disclaimers</Text>
          <Text style={styles.sectionText}>
            • HID-G acts as a platform connecting users{'\n'}
            • We are not responsible for quality of materials{'\n'}
            • We are not liable for disputes between users{'\n'}
            • Users are responsible for their own safety{'\n'}
            • We do not guarantee availability of services{'\n'}
            • Platform may be unavailable due to maintenance{'\n'}
            • We are not liable for indirect or consequential damages
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Data & Privacy</Text>
          <Text style={styles.sectionText}>
            • We collect and process data as per Privacy Policy{'\n'}
            • Location data is used for matching and tracking{'\n'}
            • Transaction data is stored for record keeping{'\n'}
            • We do not sell user data to third parties{'\n'}
            • Users can request data deletion by contacting support
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. Intellectual Property</Text>
          <Text style={styles.sectionText}>
            • All content, logos, and trademarks belong to HID-G{'\n'}
            • Users cannot reproduce or distribute app content{'\n'}
            • Users retain ownership of their uploaded content{'\n'}
            • By uploading, users grant us license to use content
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>12. Termination</Text>
          <Text style={styles.sectionText}>
            • We reserve right to suspend or terminate accounts{'\n'}
            • Accounts may be terminated for violating terms{'\n'}
            • Users can delete their account anytime{'\n'}
            • Pending transactions must be completed before deletion{'\n'}
            • Terminated users cannot create new accounts
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>13. Dispute Resolution</Text>
          <Text style={styles.sectionText}>
            • Disputes should be reported through complaint system{'\n'}
            • We will mediate disputes between users{'\n'}
            • Final decisions are at our discretion{'\n'}
            • Legal disputes are subject to Indian jurisdiction{'\n'}
            • Arbitration may be required for major disputes
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>14. Changes to Terms</Text>
          <Text style={styles.sectionText}>
            • We may update these terms at any time{'\n'}
            • Users will be notified of significant changes{'\n'}
            • Continued use constitutes acceptance of new terms{'\n'}
            • Users should review terms periodically
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>15. Contact Information</Text>
          <Text style={styles.sectionText}>
            For questions about these Terms and Conditions:{'\n\n'}
            Email: support@hidg.com{'\n'}
            Phone: +91 98765 43210{'\n'}
            Address: HID-G Headquarters, India
          </Text>
        </View>

        <View style={styles.agreementBox}>
          <Ionicons name="checkmark-circle" size={24} color={C.success} />
          <Text style={styles.agreementText}>
            By using HID-G, you agree to these Terms and Conditions
          </Text>
        </View>

        <Text style={styles.footer}>
          © 2025 HID-G. All rights reserved.
        </Text>
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
  
  content: { padding: 20, paddingBottom: 60 },
  
  updateBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.primaryLight, borderRadius: R.md, padding: 12,
    marginBottom: 20, borderWidth: 1, borderColor: C.border,
  },
  updateText: { fontSize: 13, color: C.primary, fontWeight: '600' },
  
  intro: {
    fontSize: 15, color: C.textSecondary, lineHeight: 24,
    marginBottom: 24, fontStyle: 'italic',
  },
  
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 17, fontWeight: '700', color: C.textPrimary,
    marginBottom: 12,
  },
  subTitle: {
    fontSize: 15, fontWeight: '600', color: C.primary,
    marginTop: 12, marginBottom: 8,
  },
  sectionText: {
    fontSize: 14, color: C.textSecondary, lineHeight: 22,
  },
  
  agreementBox: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.successLight, borderRadius: R.lg, padding: 16,
    marginTop: 20, borderWidth: 1, borderColor: C.successBorder,
  },
  agreementText: {
    flex: 1, fontSize: 14, color: C.success, fontWeight: '600', lineHeight: 20,
  },
  
  footer: {
    textAlign: 'center', fontSize: 13, color: C.textMuted,
    marginTop: 32, fontStyle: 'italic',
  },
});
