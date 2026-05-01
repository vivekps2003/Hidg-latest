import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity,
  StatusBar, TextInput, Alert, ActivityIndicator, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { C, S, R } from '../theme';

const FAQ_DATA = [
  {
    category: 'Getting Started',
    icon: 'rocket-outline',
    questions: [
      {
        q: 'How do I create an account?',
        a: 'Tap "Create Account" on login screen, fill your details, select account type (Individual/Agency/Pickup Partner), and complete registration.',
      },
      {
        q: 'What account types are available?',
        a: 'Individual/Shop (Sellers), Agency (Buyers), Pickup Partner (Delivery), and Admin. Each has different capabilities.',
      },
      {
        q: 'Can I have multiple accounts?',
        a: 'No. One email can only have one account. Use different emails for different account types.',
      },
    ],
  },
  {
    category: 'Orders & Payments',
    icon: 'cart-outline',
    questions: [
      {
        q: 'How does the payment process work?',
        a: 'Agency pays full amount to Admin after weight verification. Admin then distributes to Seller, Pickup Agent, and keeps 5% commission.',
      },
      {
        q: 'When do I receive payment?',
        a: 'Sellers receive payment after Admin distributes funds, usually within 24-48 hours of weight verification acceptance.',
      },
      {
        q: 'What is the commission structure?',
        a: 'Pickup Agent: Negotiated per kg rate. Admin: 5% of total. Both deducted from seller payout.',
      },
      {
        q: 'Can I cancel an order?',
        a: 'Yes, before agency accepts. After acceptance or pickup assignment, cancellation requires contacting support.',
      },
    ],
  },
  {
    category: 'Weight Verification',
    icon: 'scale-outline',
    questions: [
      {
        q: 'What if verified weight differs from my estimate?',
        a: 'You can either accept the verified weight or request to visit agency for physical verification.',
      },
      {
        q: 'How accurate is weight measurement?',
        a: 'Agencies use calibrated scales. If you doubt accuracy, visit agency to verify in person.',
      },
      {
        q: 'What happens if I reject verified weight?',
        a: 'You can request physical visit. Payment proceeds only after you accept the weight.',
      },
    ],
  },
  {
    category: 'Technical Issues',
    icon: 'construct-outline',
    questions: [
      {
        q: 'App is not loading orders',
        a: 'Check internet connection. Try logging out and back in. Clear app cache. Contact support if issue persists.',
      },
      {
        q: 'Location not working',
        a: 'Enable location permissions in device settings. Ensure GPS is turned on. Restart app.',
      },
      {
        q: 'Payment not received',
        a: 'Check order status. Payment distributed only after Admin processes. Contact support with order ID.',
      },
    ],
  },
];

export default function SupportScreen({ navigation }) {
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [expandedQuestion, setExpandedQuestion] = useState(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSendMessage = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Required', 'Please fill all fields');
      return;
    }

    setSending(true);
    try {
      const user = auth.currentUser;
      await addDoc(collection(db, 'support_tickets'), {
        userId: user?.uid,
        userEmail: user?.email,
        subject: subject.trim(),
        message: message.trim(),
        status: 'open',
        createdAt: serverTimestamp(),
      });

      Alert.alert('Success', 'Your message has been sent. We will respond within 24 hours.');
      setSubject('');
      setMessage('');
      setShowContactForm(false);
    } catch (e) {
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleCall = () => {
    Linking.openURL('tel:+919876543210');
  };

  const handleEmail = () => {
    Linking.openURL('mailto:support@hidg.com');
  };

  const handleWhatsApp = () => {
    Linking.openURL('https://wa.me/919876543210');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Quick Contact */}
        <View style={styles.quickContactCard}>
          <Text style={styles.quickContactTitle}>Need Quick Help?</Text>
          <View style={styles.quickContactRow}>
            <TouchableOpacity style={styles.quickContactBtn} onPress={handleCall}>
              <Ionicons name="call" size={24} color={C.primary} />
              <Text style={styles.quickContactText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickContactBtn} onPress={handleWhatsApp}>
              <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
              <Text style={styles.quickContactText}>WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickContactBtn} onPress={handleEmail}>
              <Ionicons name="mail" size={24} color={C.danger} />
              <Text style={styles.quickContactText}>Email</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* FAQ */}
        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        
        {FAQ_DATA.map((category, catIndex) => (
          <View key={catIndex} style={styles.categoryCard}>
            <TouchableOpacity
              style={styles.categoryHeader}
              onPress={() => setExpandedCategory(expandedCategory === catIndex ? null : catIndex)}
            >
              <View style={styles.categoryLeft}>
                <View style={styles.categoryIcon}>
                  <Ionicons name={category.icon} size={20} color={C.primary} />
                </View>
                <Text style={styles.categoryTitle}>{category.category}</Text>
              </View>
              <Ionicons
                name={expandedCategory === catIndex ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={C.textMuted}
              />
            </TouchableOpacity>

            {expandedCategory === catIndex && (
              <View style={styles.questionsContainer}>
                {category.questions.map((item, qIndex) => (
                  <View key={qIndex} style={styles.questionCard}>
                    <TouchableOpacity
                      style={styles.questionHeader}
                      onPress={() => setExpandedQuestion(expandedQuestion === `${catIndex}-${qIndex}` ? null : `${catIndex}-${qIndex}`)}
                    >
                      <Text style={styles.questionText}>{item.q}</Text>
                      <Ionicons
                        name={expandedQuestion === `${catIndex}-${qIndex}` ? 'remove-circle-outline' : 'add-circle-outline'}
                        size={20}
                        color={C.primary}
                      />
                    </TouchableOpacity>
                    {expandedQuestion === `${catIndex}-${qIndex}` && (
                      <Text style={styles.answerText}>{item.a}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}

        {/* Contact Form */}
        {!showContactForm ? (
          <TouchableOpacity
            style={styles.contactFormBtn}
            onPress={() => setShowContactForm(true)}
          >
            <Ionicons name="chatbubbles" size={20} color="#fff" />
            <Text style={styles.contactFormBtnText}>Still Need Help? Contact Us</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.contactFormCard}>
            <Text style={styles.contactFormTitle}>Send us a message</Text>
            
            <Text style={styles.inputLabel}>Subject</Text>
            <TextInput
              style={styles.input}
              value={subject}
              onChangeText={setSubject}
              placeholder="Brief description of your issue"
              placeholderTextColor={C.textMuted}
            />

            <Text style={styles.inputLabel}>Message</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={message}
              onChangeText={setMessage}
              placeholder="Describe your issue in detail..."
              placeholderTextColor={C.textMuted}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />

            <View style={styles.formActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowContactForm(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sendBtn, sending && { opacity: 0.6 }]}
                onPress={handleSendMessage}
                disabled={sending}
              >
                {sending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="send" size={18} color="#fff" />
                    <Text style={styles.sendBtnText}>Send Message</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Contact Info */}
        <View style={styles.contactInfoCard}>
          <Text style={styles.contactInfoTitle}>Contact Information</Text>
          <View style={styles.contactInfoRow}>
            <Ionicons name="mail-outline" size={18} color={C.textMuted} />
            <Text style={styles.contactInfoText}>support@hidg.com</Text>
          </View>
          <View style={styles.contactInfoRow}>
            <Ionicons name="call-outline" size={18} color={C.textMuted} />
            <Text style={styles.contactInfoText}>+91 98765 43210</Text>
          </View>
          <View style={styles.contactInfoRow}>
            <Ionicons name="time-outline" size={18} color={C.textMuted} />
            <Text style={styles.contactInfoText}>Mon-Sat: 9 AM - 6 PM IST</Text>
          </View>
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
  
  content: { padding: 16, paddingBottom: 60 },
  
  quickContactCard: {
    backgroundColor: C.primaryLight, borderRadius: R.xl, padding: 20,
    marginBottom: 24, borderWidth: 1, borderColor: C.border,
  },
  quickContactTitle: { fontSize: 16, fontWeight: '700', color: C.primary, marginBottom: 16, textAlign: 'center' },
  quickContactRow: { flexDirection: 'row', justifyContent: 'space-around' },
  quickContactBtn: { alignItems: 'center', gap: 8 },
  quickContactText: { fontSize: 13, color: C.textSecondary, fontWeight: '600' },
  
  sectionTitle: { fontSize: 18, fontWeight: '700', color: C.textPrimary, marginBottom: 16 },
  
  categoryCard: {
    backgroundColor: C.surface, borderRadius: R.lg, marginBottom: 12,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16,
  },
  categoryLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  categoryIcon: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: C.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  categoryTitle: { fontSize: 16, fontWeight: '700', color: C.textPrimary },
  
  questionsContainer: { paddingHorizontal: 16, paddingBottom: 12 },
  questionCard: {
    backgroundColor: C.surfaceAlt, borderRadius: R.md, padding: 12, marginBottom: 8,
  },
  questionHeader: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
  },
  questionText: { flex: 1, fontSize: 14, fontWeight: '600', color: C.textPrimary, lineHeight: 20 },
  answerText: { fontSize: 14, color: C.textSecondary, marginTop: 12, lineHeight: 20 },
  
  contactFormBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.primary, borderRadius: R.lg, paddingVertical: 16,
    marginTop: 8, ...S.btn,
  },
  contactFormBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  
  contactFormCard: {
    backgroundColor: C.surface, borderRadius: R.xl, padding: 20,
    marginTop: 8, borderWidth: 1, borderColor: C.border,
  },
  contactFormTitle: { fontSize: 18, fontWeight: '700', color: C.textPrimary, marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: C.textSecondary, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: C.surfaceAlt, borderRadius: R.md, padding: 14,
    fontSize: 15, color: C.textPrimary, borderWidth: 1, borderColor: C.border,
  },
  textArea: { minHeight: 120, paddingTop: 14 },
  formActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: {
    flex: 1, borderRadius: R.md, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1.5, borderColor: C.border,
  },
  cancelBtnText: { color: C.textSecondary, fontSize: 15, fontWeight: '700' },
  sendBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.success, borderRadius: R.md, paddingVertical: 14, ...S.btn,
  },
  sendBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  
  contactInfoCard: {
    backgroundColor: C.surface, borderRadius: R.lg, padding: 16,
    marginTop: 24, borderWidth: 1, borderColor: C.border,
  },
  contactInfoTitle: { fontSize: 15, fontWeight: '700', color: C.textPrimary, marginBottom: 12 },
  contactInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  contactInfoText: { fontSize: 14, color: C.textSecondary },
});
