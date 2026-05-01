import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, S, R } from '../theme';

export default function PrivacyPolicyScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.updateBanner}>
          <Ionicons name="shield-checkmark" size={16} color={C.success} />
          <Text style={styles.updateText}>Your privacy is important to us</Text>
        </View>

        <Text style={styles.intro}>
          This Privacy Policy explains how HID-G collects, uses, and protects your personal information. By using our app, you consent to the practices described in this policy.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Information We Collect</Text>
          
          <Text style={styles.subTitle}>1.1 Personal Information</Text>
          <Text style={styles.sectionText}>
            • Full name{'\n'}
            • Email address{'\n'}
            • Phone number{'\n'}
            • Business name (for organizations){'\n'}
            • GST number (for agencies){'\n'}
            • Address and location
          </Text>

          <Text style={styles.subTitle}>1.2 Location Data</Text>
          <Text style={styles.sectionText}>
            • GPS coordinates for order placement{'\n'}
            • Location for matching with nearby agencies{'\n'}
            • Pickup and delivery locations{'\n'}
            • Service area radius
          </Text>

          <Text style={styles.subTitle}>1.3 Transaction Data</Text>
          <Text style={styles.sectionText}>
            • Order details and materials{'\n'}
            • Weight measurements{'\n'}
            • Payment information{'\n'}
            • Commission rates{'\n'}
            • Transaction history
          </Text>

          <Text style={styles.subTitle}>1.4 Device Information</Text>
          <Text style={styles.sectionText}>
            • Device type and model{'\n'}
            • Operating system version{'\n'}
            • App version{'\n'}
            • IP address{'\n'}
            • Device identifiers
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
          <Text style={styles.sectionText}>
            • To create and manage your account{'\n'}
            • To process orders and transactions{'\n'}
            • To match sellers with agencies and pickup agents{'\n'}
            • To calculate payments and commissions{'\n'}
            • To send notifications about orders{'\n'}
            • To verify identity and prevent fraud{'\n'}
            • To improve our services{'\n'}
            • To provide customer support{'\n'}
            • To comply with legal obligations
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Information Sharing</Text>
          
          <Text style={styles.subTitle}>3.1 With Other Users</Text>
          <Text style={styles.sectionText}>
            • Sellers see agency name and location{'\n'}
            • Agencies see seller location and contact{'\n'}
            • Pickup agents see pickup location{'\n'}
            • All parties see order and payment details
          </Text>

          <Text style={styles.subTitle}>3.2 With Third Parties</Text>
          <Text style={styles.sectionText}>
            • Payment processors (for transactions){'\n'}
            • Cloud service providers (Firebase){'\n'}
            • Analytics services (for app improvement){'\n'}
            • Legal authorities (when required by law)
          </Text>

          <Text style={styles.subTitle}>3.3 We DO NOT:</Text>
          <Text style={styles.sectionText}>
            • Sell your personal data to advertisers{'\n'}
            • Share data with unauthorized parties{'\n'}
            • Use data for purposes not disclosed{'\n'}
            • Share data without your consent
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Data Security</Text>
          <Text style={styles.sectionText}>
            • Data encrypted in transit and at rest{'\n'}
            • Secure Firebase authentication{'\n'}
            • Role-based access control{'\n'}
            • Regular security audits{'\n'}
            • Secure payment processing{'\n'}
            • Password protection for accounts{'\n'}
            • Automatic logout after inactivity
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Data Retention</Text>
          <Text style={styles.sectionText}>
            • Account data: Retained while account is active{'\n'}
            • Transaction data: Retained for 7 years (legal requirement){'\n'}
            • Location data: Retained for 90 days{'\n'}
            • Deleted account data: Removed within 30 days{'\n'}
            • Backup data: Removed within 90 days
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Your Rights</Text>
          <Text style={styles.sectionText}>
            • Access your personal data{'\n'}
            • Correct inaccurate data{'\n'}
            • Request data deletion{'\n'}
            • Export your data{'\n'}
            • Opt-out of notifications{'\n'}
            • Withdraw consent{'\n'}
            • File complaints with authorities
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Location Services</Text>
          <Text style={styles.sectionText}>
            • Location access is required for core features{'\n'}
            • Used to match sellers with nearby agencies{'\n'}
            • Used for pickup navigation{'\n'}
            • You can disable location in device settings{'\n'}
            • Disabling may limit app functionality
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Cookies & Tracking</Text>
          <Text style={styles.sectionText}>
            • We use Firebase Analytics for app usage{'\n'}
            • Crash reporting for bug fixes{'\n'}
            • Performance monitoring{'\n'}
            • No third-party advertising cookies{'\n'}
            • You can opt-out in app settings
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Children's Privacy</Text>
          <Text style={styles.sectionText}>
            • Our services are not for users under 18{'\n'}
            • We do not knowingly collect data from minors{'\n'}
            • Parents should monitor children's device usage{'\n'}
            • Contact us if minor data was collected
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. International Data Transfer</Text>
          <Text style={styles.sectionText}>
            • Data may be stored on servers outside India{'\n'}
            • We use Firebase (Google Cloud){'\n'}
            • Data protected by international standards{'\n'}
            • Compliant with data protection laws
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. Changes to Privacy Policy</Text>
          <Text style={styles.sectionText}>
            • We may update this policy periodically{'\n'}
            • Users notified of significant changes{'\n'}
            • Continued use means acceptance{'\n'}
            • Review policy regularly for updates
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>12. Contact Us</Text>
          <Text style={styles.sectionText}>
            For privacy-related questions or requests:{'\n\n'}
            Email: privacy@hidg.com{'\n'}
            Phone: +91 98765 43210{'\n'}
            Address: HID-G Headquarters, India{'\n\n'}
            Data Protection Officer: dpo@hidg.com
          </Text>
        </View>

        <View style={styles.securityBox}>
          <Ionicons name="lock-closed" size={24} color={C.success} />
          <View style={{ flex: 1 }}>
            <Text style={styles.securityTitle}>Your Data is Secure</Text>
            <Text style={styles.securityText}>
              We use industry-standard encryption and security measures to protect your information.
            </Text>
          </View>
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
    backgroundColor: C.successLight, borderRadius: R.md, padding: 12,
    marginBottom: 20, borderWidth: 1, borderColor: C.successBorder,
  },
  updateText: { fontSize: 13, color: C.success, fontWeight: '600' },
  
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
  
  securityBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: C.successLight, borderRadius: R.lg, padding: 16,
    marginTop: 20, borderWidth: 1, borderColor: C.successBorder,
  },
  securityTitle: {
    fontSize: 15, color: C.success, fontWeight: '700', marginBottom: 4,
  },
  securityText: {
    fontSize: 13, color: C.success, lineHeight: 18,
  },
  
  footer: {
    textAlign: 'center', fontSize: 13, color: C.textMuted,
    marginTop: 32, fontStyle: 'italic',
  },
});
