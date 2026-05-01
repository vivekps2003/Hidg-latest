import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, StyleSheet, StatusBar,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import * as Location from 'expo-location';
import { C, S, R } from '../theme';

const BUSINESS_TYPES = ['Select Type','Mall','Supermarket','Hospital','Industry / Factory','Hotel / Restaurant','Shop / Retail Store','Other'];
const SCRAP_TYPES = ['Select Type','Metal Scrap Dealer (Iron/Steel)','Non-Ferrous Metal Dealer (Copper/Aluminium/Brass)','E-Waste / Electronic Scrap','Plastic Scrap Dealer','Paper / Cardboard Scrap','Vehicle / Automobile Scrap','Construction & Demolition Waste','General Waste Collector','Recycling Agency / Processor','Other'];
const ENTITY_OPTIONS = [
  { label: 'Individual', value: 'individual', icon: 'person-outline' },
  { label: 'Shop / Retail', value: 'shop', icon: 'storefront-outline' },
  { label: 'Mall', value: 'mall', icon: 'business-outline' },
  { label: 'Supermarket', value: 'supermarket', icon: 'cart-outline' },
  { label: 'Industry', value: 'industry', icon: 'construct-outline' },
  { label: 'Scrap Center', value: 'scrap_center', icon: 'layers-outline' },
  { label: 'Agency', value: 'agency', icon: 'briefcase-outline' },
  { label: 'Pickup Partner', value: 'pickup_agent', icon: 'bicycle-outline' },
];

const getCapabilities = (type) => {
  switch (type) {
    case 'individual': case 'shop': case 'mall': case 'supermarket': case 'industry':
      return { canSell: true, canBuy: false, canRequestPickup: true, canOfferPickup: false };
    case 'scrap_center':
      return { canSell: true, canBuy: true, canRequestPickup: false, canOfferPickup: true };
    case 'agency':
      return { canSell: false, canBuy: true, canRequestPickup: false, canOfferPickup: true };
    case 'pickup_agent':
      return { canSell: false, canBuy: false, canRequestPickup: false, canOfferPickup: true };
    default:
      return { canSell: false, canBuy: false, canRequestPickup: false, canOfferPickup: false };
  }
};

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [entityType, setEntityType] = useState('individual');
  const [businessName, setBusinessName] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState('');
  const [businessCategory, setBusinessCategory] = useState('Select Type');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(null);
  const [logoTaps, setLogoTaps] = useState(0);
  const [adminUnlocked, setAdminUnlocked] = useState(false);

  const handleLogoTap = () => {
    const next = logoTaps + 1;
    setLogoTaps(next);
    if (next === 5) {
      setAdminUnlocked(true);
      Alert.alert('🔐 Admin Mode', 'Admin registration unlocked.');
    }
  };

  const isOrganization = entityType !== 'individual' && entityType !== 'admin';
  const isAdmin = entityType === 'admin';
  const isAgency = entityType === 'agency';
  const isPickupAgent = entityType === 'pickup_agent';

  useEffect(() => {
    if (!isOrganization) {
      setBusinessName(''); setLocation(''); setAddress('');
      setBusinessCategory('Select Type'); setGstNumber('');
    } else if (isPickupAgent) {
      setGstNumber(''); setBusinessCategory('Select Type');
    }
  }, [entityType]);

  const validateGST = (gst) => /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gst.trim().toUpperCase());

  const validate = () => {
    if (!name.trim() || !phone.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please fill all required fields'); return false;
    }
    if (password.length < 6) { Alert.alert('Weak Password', 'Minimum 6 characters'); return false; }
    if (password !== confirmPassword) { Alert.alert('Mismatch', 'Passwords do not match'); return false; }
    if (phone.replace(/[^0-9]/g, '').length < 10) { Alert.alert('Invalid Phone', 'Enter a valid 10-digit number'); return false; }
    if (isAdmin) return true;
    if (isOrganization) {
      if (!businessName.trim()) { Alert.alert('Missing', 'Enter business name'); return false; }
      if (!location.trim()) { Alert.alert('Missing', 'Enter location'); return false; }
      if (!address.trim()) { Alert.alert('Missing', 'Enter address'); return false; }
      if (!isPickupAgent && businessCategory === 'Select Type') { Alert.alert('Missing', 'Select business type'); return false; }
      if (isAgency) {
        if (!gstNumber.trim()) { Alert.alert('Required', 'GST Number is mandatory for agencies'); return false; }
        if (!validateGST(gstNumber)) { Alert.alert('Invalid GST', 'Enter a valid GST number (e.g. 22AAAAA0000A1Z5)'); return false; }
      }
    }
    return true;
  };

  const captureLocation = async () => {
    if (!isAgency && !isPickupAgent) return { latitude: null, longitude: null };
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return { latitude: null, longitude: null };
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
    } catch { return { latitude: null, longitude: null }; }
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      const uid = userCred.user.uid;
      const { latitude, longitude } = await captureLocation();
      const now = serverTimestamp();
      const userData = isAdmin ? {
        role: 'admin',
        entityType: 'admin',
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        profileCompleted: true,
        createdAt: now,
        updatedAt: now,
      } : {
        role: 'participant', entityType, capabilities: getCapabilities(entityType),
        name: name.trim(), phone: phone.trim(), email: email.trim().toLowerCase(),
        businessName: isOrganization ? businessName.trim() : '',
        location: isOrganization ? location.trim() : '',
        address: isOrganization ? address.trim() : '',
        latitude, longitude,
        serviceRadiusKm: isAgency ? 10 : isPickupAgent ? 15 : null,
        isActive: isAgency || isPickupAgent,
        kycStatus: (isAgency || isPickupAgent) ? 'pending' : null,
        businessCategory: (!isPickupAgent && businessCategory !== 'Select Type') ? businessCategory.trim() : '',
        gstNumber: isAgency ? gstNumber.trim().toUpperCase() : '',
        profileCompleted: true, createdAt: now, updatedAt: now,
      };
      await setDoc(doc(db, 'users', uid), userData);
      if (!isAdmin && isAgency) {
        await setDoc(doc(db, 'agencies', uid), {
          agencyId: uid, businessName: businessName.trim(),
          email: email.trim().toLowerCase(), phone: phone.trim(),
          locationName: location.trim(), latitude, longitude,
          capabilities: getCapabilities(entityType), isActive: true, rates: [], createdAt: now,
        });
      }
      if (!isAdmin && isPickupAgent) {
        await setDoc(doc(db, 'pickup_agents', uid), {
          agentId: uid, name: name.trim(), phone: phone.trim(),
          email: email.trim().toLowerCase(), locationName: location.trim(),
          latitude, longitude, isAvailable: true, serviceRadiusKm: 15, createdAt: now,
        });
      }
      Alert.alert('Welcome to HidG! ♻️', 'Your account has been created successfully.');
      navigation.replace('HomeRouter');
    } catch (error) {
      const msgs = {
        'auth/email-already-in-use': 'This email is already registered',
        'auth/invalid-email': 'Invalid email format',
        'auth/weak-password': 'Password is too weak',
      };
      Alert.alert('Registration Failed', msgs[error.code] || error.message);
    } finally {
      setLoading(false);
    }
  };

  const wrap = (field) => [styles.inputWrap, focused === field && styles.inputWrapFocused];
  const focus = (f) => setFocused(f);
  const blur = () => setFocused(null);

  const Field = ({ label, icon, children }) => (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={children.props?.focused !== undefined ? wrap(children.props.focused) : styles.inputWrap}>
        {icon && <Ionicons name={icon} size={17} color={C.textMuted} style={styles.inputIcon} />}
        {children}
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Logo */}
        <View style={styles.logoArea}>
          <TouchableOpacity onPress={handleLogoTap} activeOpacity={1}>
            <View style={styles.logoBox}>
              <Text style={styles.logoHid}>Hid</Text>
              <Text style={styles.logoG}>G</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.tagline}>Scrap Smart • Recycle Better</Text>
          {adminUnlocked && (
            <View style={styles.adminUnlockedBadge}>
              <Ionicons name="shield-checkmark-outline" size={12} color="#4F46E5" />
              <Text style={styles.adminUnlockedText}>Admin mode active</Text>
            </View>
          )}
        </View>

        <Text style={styles.pageTitle}>Create Account</Text>
        <Text style={styles.pageSub}>Join the HidG recycling community ♻️</Text>

        {/* Personal Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Full Name</Text>
            <View style={[styles.inputWrap, focused === 'name' && styles.inputWrapFocused]}>
              <Ionicons name="person-outline" size={17} color={C.textMuted} style={styles.inputIcon} />
              <TextInput style={styles.inputInner} value={name} onChangeText={setName}
                placeholder="Your full name" placeholderTextColor={C.textMuted}
                autoCapitalize="words" onFocus={() => focus('name')} onBlur={blur} />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={[styles.inputWrap, focused === 'phone' && styles.inputWrapFocused]}>
              <Ionicons name="call-outline" size={17} color={C.textMuted} style={styles.inputIcon} />
              <TextInput style={styles.inputInner} value={phone} onChangeText={setPhone}
                keyboardType="phone-pad" placeholder="+91 98765 43210" placeholderTextColor={C.textMuted}
                maxLength={15} onFocus={() => focus('phone')} onBlur={blur} />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email Address</Text>
            <View style={[styles.inputWrap, focused === 'email' && styles.inputWrapFocused]}>
              <Ionicons name="mail-outline" size={17} color={C.textMuted} style={styles.inputIcon} />
              <TextInput style={styles.inputInner} value={email} onChangeText={setEmail}
                keyboardType="email-address" autoCapitalize="none"
                placeholder="yourname@example.com" placeholderTextColor={C.textMuted}
                onFocus={() => focus('email')} onBlur={blur} />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={[styles.inputWrap, focused === 'pass' && styles.inputWrapFocused]}>
              <Ionicons name="lock-closed-outline" size={17} color={C.textMuted} style={styles.inputIcon} />
              <TextInput style={styles.inputInner} value={password} onChangeText={setPassword}
                secureTextEntry={!showPassword} placeholder="Min. 6 characters" placeholderTextColor={C.textMuted}
                autoCapitalize="none" onFocus={() => focus('pass')} onBlur={blur} />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={17} color={C.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={[styles.inputWrap, focused === 'cpass' && styles.inputWrapFocused]}>
              <Ionicons name="lock-closed-outline" size={17} color={C.textMuted} style={styles.inputIcon} />
              <TextInput style={styles.inputInner} value={confirmPassword} onChangeText={setConfirmPassword}
                secureTextEntry placeholder="Repeat password" placeholderTextColor={C.textMuted}
                autoCapitalize="none" onFocus={() => focus('cpass')} onBlur={blur} />
            </View>
          </View>
        </View>

        {/* Account Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Type</Text>
          <View style={styles.entityGrid}>
            {ENTITY_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.entityBtn, entityType === opt.value && styles.entityBtnActive]}
                onPress={() => setEntityType(opt.value)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={opt.icon}
                  size={20}
                  color={entityType === opt.value ? C.primary : C.textMuted}
                />
                <Text style={[styles.entityBtnText, entityType === opt.value && styles.entityBtnTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
            {adminUnlocked && (
              <TouchableOpacity
                style={[styles.entityBtn, styles.adminBtn, entityType === 'admin' && styles.adminBtnActive]}
                onPress={() => setEntityType('admin')}
                activeOpacity={0.7}
              >
                <Ionicons name="shield-checkmark-outline" size={20} color={entityType === 'admin' ? '#4F46E5' : '#9CA3AF'} />
                <Text style={[styles.entityBtnText, entityType === 'admin' && styles.adminBtnText]}>Admin</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Organization Details */}
        {isOrganization && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Organization Details</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Business Name</Text>
              <View style={[styles.inputWrap, focused === 'bname' && styles.inputWrapFocused]}>
                <Ionicons name="business-outline" size={17} color={C.textMuted} style={styles.inputIcon} />
                <TextInput style={styles.inputInner} value={businessName} onChangeText={setBusinessName}
                  placeholder="Enter business name" placeholderTextColor={C.textMuted}
                  onFocus={() => focus('bname')} onBlur={blur} />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Location (Town / City)</Text>
              <View style={[styles.inputWrap, focused === 'loc' && styles.inputWrapFocused]}>
                <Ionicons name="location-outline" size={17} color={C.textMuted} style={styles.inputIcon} />
                <TextInput style={styles.inputInner} value={location} onChangeText={setLocation}
                  placeholder="e.g. Chalakkudy, Thrissur" placeholderTextColor={C.textMuted}
                  onFocus={() => focus('loc')} onBlur={blur} />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Full Address</Text>
              <View style={[styles.inputWrap, styles.textAreaWrap, focused === 'addr' && styles.inputWrapFocused]}>
                <TextInput style={[styles.inputInner, styles.textAreaInner]} value={address} onChangeText={setAddress}
                  placeholder="House No, Street, Landmark..." placeholderTextColor={C.textMuted}
                  multiline numberOfLines={3} textAlignVertical="top"
                  onFocus={() => focus('addr')} onBlur={blur} />
              </View>
            </View>

            {!isPickupAgent && (
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Business Category</Text>
                <View style={[styles.inputWrap, styles.pickerWrap]}>
                  <Picker
                    selectedValue={businessCategory}
                    onValueChange={setBusinessCategory}
                    style={styles.picker}
                    dropdownIconColor={C.textSecondary}
                    mode="dropdown"
                  >
                    {(isAgency || entityType === 'scrap_center' ? SCRAP_TYPES : BUSINESS_TYPES).map(t => (
                      <Picker.Item key={t} label={t} value={t} color={C.textPrimary} />
                    ))}
                  </Picker>
                </View>
              </View>
            )}

            {isAgency && (
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>
                  GST Number <Text style={styles.required}>*</Text>
                </Text>
                <View style={[styles.inputWrap, focused === 'gst' && styles.inputWrapFocused]}>
                  <Ionicons name="document-text-outline" size={17} color={C.textMuted} style={styles.inputIcon} />
                  <TextInput style={styles.inputInner} value={gstNumber} onChangeText={setGstNumber}
                    placeholder="22AAAAA0000A1Z5" placeholderTextColor={C.textMuted}
                    autoCapitalize="characters" maxLength={15}
                    onFocus={() => focus('gst')} onBlur={blur} />
                </View>
              </View>
            )}
          </View>
        )}

        {/* Submit */}
        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleRegister}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.btnText}>Create Account</Text>
          }
        </TouchableOpacity>

        <View style={styles.loginRow}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginLink}>Sign In</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>♻️ Convert your waste to value</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 52, paddingBottom: 60 },

  logoArea: { alignItems: 'center', marginBottom: 28 },
  logoBox: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  logoHid: { fontSize: 48, fontWeight: '900', color: C.textPrimary, letterSpacing: -1 },
  logoG: { fontSize: 48, fontWeight: '900', color: C.primary, letterSpacing: -1, marginLeft: -4 },
  tagline: { fontSize: 13, color: C.textMuted, fontWeight: '500' },

  pageTitle: { fontSize: 26, fontWeight: '800', color: C.textPrimary, textAlign: 'center', marginBottom: 4 },
  pageSub: { fontSize: 14, color: C.textSecondary, textAlign: 'center', marginBottom: 28 },

  section: {
    backgroundColor: C.surface, borderRadius: R.xl, padding: 20,
    marginBottom: 16, borderWidth: 1, borderColor: C.border, ...S.card,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 16 },

  fieldGroup: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: C.textSecondary, marginBottom: 6 },
  required: { color: C.danger },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surfaceAlt, borderRadius: R.md,
    borderWidth: 1.5, borderColor: C.border, paddingHorizontal: 12,
  },
  inputWrapFocused: { borderColor: C.primary, backgroundColor: C.primaryLight },
  textAreaWrap: { alignItems: 'flex-start', paddingTop: 10 },
  inputIcon: { marginRight: 8 },
  inputInner: { flex: 1, fontSize: 15, color: C.textPrimary, paddingVertical: 12 },
  textAreaInner: { minHeight: 72, paddingVertical: 0 },
  eyeBtn: { padding: 4 },
  pickerWrap: { paddingHorizontal: 4 },
  picker: { flex: 1, color: C.textPrimary, height: 50 },

  entityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  entityBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 10, paddingHorizontal: 14, borderRadius: R.md,
    backgroundColor: C.surfaceAlt, borderWidth: 1.5, borderColor: C.border,
  },
  entityBtnActive: { backgroundColor: C.primaryLight, borderColor: C.primary },
  entityBtnText: { fontSize: 13, fontWeight: '600', color: C.textSecondary },
  entityBtnTextActive: { color: C.primary },

  btn: {
    backgroundColor: C.primary, borderRadius: R.lg,
    paddingVertical: 16, alignItems: 'center', marginTop: 8, ...S.btn,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  loginText: { fontSize: 14, color: C.textSecondary },
  loginLink: { fontSize: 14, color: C.primary, fontWeight: '700' },
  footer: { textAlign: 'center', color: C.textMuted, fontSize: 13, marginTop: 20 },

  adminUnlockedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EEF2FF', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginTop: 6, borderWidth: 1, borderColor: '#E0E7FF' },
  adminUnlockedText: { fontSize: 11, color: '#4F46E5', fontWeight: '600' },
  adminBtn: { borderColor: '#E0E7FF', backgroundColor: '#EEF2FF' },
  adminBtnActive: { borderColor: '#4F46E5', backgroundColor: '#EEF2FF' },
  adminBtnText: { color: '#4F46E5', fontWeight: '700' },
});
