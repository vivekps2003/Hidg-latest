import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import * as Location from 'expo-location';

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [entityType, setEntityType] = useState('individual');
  const [businessName, setBusinessName] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState('');
  const [businessCategory, setBusinessCategory] = useState('Select Type');
  const [loading, setLoading] = useState(false);

  const BUSINESS_TYPES = [
    'Select Type',
    'Mall',
    'Supermarket',
    'Hospital',
    'Industry / Factory',
    'Hotel / Restaurant',
    'Shop / Retail Store',
    'Other',
  ];

  const SCRAP_TYPES = [
    'Select Type',
    'Metal Scrap Dealer (Iron/Steel)',
    'Non-Ferrous Metal Dealer (Copper/Aluminium/Brass)',
    'E-Waste / Electronic Scrap',
    'Plastic Scrap Dealer',
    'Paper / Cardboard Scrap',
    'Vehicle / Automobile Scrap',
    'Construction & Demolition Waste',
    'General Waste Collector',
    'Recycling Agency / Processor',
    'Other',
  ];

  const ENTITY_OPTIONS = [
    { label: 'Individual', value: 'individual' },
    { label: 'Shop / Retail', value: 'shop' },
    { label: 'Mall', value: 'mall' },
    { label: 'Supermarket', value: 'supermarket' },
    { label: 'Industry / Factory', value: 'industry' },
    { label: 'Scrap Center', value: 'scrap_center' },
    { label: 'Recycling Agency', value: 'agency' },
    { label: 'Pickup Partner', value: 'pickup_agent' },
  ];

  const getCapabilities = (type) => {
    switch (type) {
      case 'individual':
      case 'shop':
      case 'mall':
      case 'supermarket':
      case 'industry':
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

  const isOrganization = entityType !== 'individual';
  const isAgency = entityType === 'agency';
  const isPickupAgent = entityType === 'pickup_agent';
  const requiresGST = isAgency;
  const requiresCategory = isOrganization && !isPickupAgent;
  const requiresBusinessName = isOrganization;
  const requiresLocation = isOrganization;
  const requiresAddress = isOrganization;

  const getCategoryOptions = () => {
    return entityType === 'agency' || entityType === 'scrap_center' 
      ? SCRAP_TYPES 
      : BUSINESS_TYPES;
  };

  const getNameLabel = () => {
    const labels = {
      shop: 'Shop',
      mall: 'Mall',
      supermarket: 'Supermarket',
      industry: 'Industry',
      scrap_center: 'Scrap Center',
      agency: 'Agency',
      pickup_agent: 'Pickup Partner',
    };
    return labels[entityType] || 'Organization';
  };

  const validateGST = (gst) => {
    const cleaned = gst.trim().toUpperCase();
    return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(cleaned);
  };

  useEffect(() => {
    if (!isOrganization) {
      setBusinessName('');
      setLocation('');
      setAddress('');
      setBusinessCategory('Select Type');
      setGstNumber('');
    } else if (isPickupAgent) {
      // Pickup agents don't need GST or category
      setGstNumber('');
      setBusinessCategory('Select Type');
    }
  }, [entityType]);

  const validateForm = () => {
    if (!name.trim() || !phone.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please fill all required fields');
      return false;
    }

    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password should be at least 6 characters');
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match');
      return false;
    }

    const phoneDigits = phone.replace(/[^0-9]/g, '');
    if (phoneDigits.length < 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid Indian phone number');
      return false;
    }

    if (isOrganization) {
      if (requiresBusinessName && !businessName.trim()) {
        Alert.alert('Missing Field', `Please enter ${getNameLabel()} name`);
        return false;
      }
      if (requiresLocation && !location.trim()) {
        Alert.alert('Missing Field', 'Please enter location (town/city)');
        return false;
      }
      if (requiresAddress && !address.trim()) {
        Alert.alert('Missing Field', 'Please enter full address');
        return false;
      }
      if (requiresCategory && businessCategory === 'Select Type') {
        Alert.alert('Missing Field', 'Please select type of business / activity');
        return false;
      }
      if (requiresGST) {
        if (!gstNumber.trim()) {
          Alert.alert('Mandatory', 'GST Number is required for Recycling Agencies');
          return false;
        }
        if (!validateGST(gstNumber)) {
          Alert.alert('Invalid GST', 'Please enter a valid 15-character GST number (e.g. 22AAAAA0000A1Z5)');
          return false;
        }
      }
    }

    return true;
  };

  // Location capture (non-blocking, only for agency & pickup_agent)
  const captureLocation = async () => {
    if (!isAgency && !isPickupAgent) return { latitude: null, longitude: null };

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Location Permission',
          'We need location access to help buyers find you. You can skip now and add it later in your profile.'
        );
        return { latitude: null, longitude: null };
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = position.coords;
      return { latitude, longitude };
    } catch (err) {
      console.error('Location capture error:', err);
      Alert.alert(
        'Location Unavailable',
        'Could not retrieve your current location. Registration will continue without coordinates. You can update later.'
      );
      return { latitude: null, longitude: null };
    }
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      // 1. Create Firebase Auth user
      const userCred = await createUserWithEmailAndPassword(
        auth,
        email.trim().toLowerCase(),
        password
      );

      const uid = userCred.user.uid;
      const capabilities = getCapabilities(entityType);
      const finalGst = requiresGST ? gstNumber.trim().toUpperCase() : '';
      const { latitude, longitude } = await captureLocation();

      const now = serverTimestamp();

      // 2. Prepare common user data (users collection)
      const userData = {
        role: 'participant',
        entityType,
        capabilities,

        name: name.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),

        businessName: isOrganization ? businessName.trim() : '',
        location: isOrganization ? location.trim() : '',
        address: isOrganization ? address.trim() : '',

        latitude,
        longitude,

        serviceRadiusKm: isAgency ? 10 : isPickupAgent ? 15 : null,
        isActive: isAgency || isPickupAgent,
        kycStatus: (isAgency || isPickupAgent) ? 'pending' : null,

        businessCategory:
          requiresCategory && businessCategory !== 'Select Type'
            ? businessCategory.trim()
            : '',

        gstNumber: finalGst,

        profileCompleted: true,

        createdAt: now,
        updatedAt: now,
      };

      // 3. Save to main users collection
      await setDoc(doc(db, 'users', uid), userData);

      // 4. Save to specialized collections if needed
      if (isAgency) {
        await setDoc(doc(db, 'agencies', uid), {
          agencyId: uid,
          businessName: businessName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          locationName: location.trim(),
          latitude,
          longitude,
          capabilities,
          isActive: true,
          rates: [],
          createdAt: now,
        });
      }

      if (isPickupAgent) {
        await setDoc(doc(db, 'pickup_agents', uid), {
          agentId: uid,
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim().toLowerCase(),
          locationName: location.trim(),
          latitude,
          longitude,
          isAvailable: true,
          serviceRadiusKm: 15,
          createdAt: now,
        });
      }

      Alert.alert(
        'Registration Successful',
        'Welcome to HidG! Your account has been created. ♻️'
      );
      navigation.replace('HomeRouter');
    } catch (error) {
      console.error('Registration error:', error);
      let msg = 'Something went wrong. Please try again.';
      
      if (error.code === 'auth/email-already-in-use') msg = 'This email is already registered';
      else if (error.code === 'auth/invalid-email') msg = 'Invalid email format';
      else if (error.code === 'auth/weak-password') msg = 'Password is too weak';
      else if (error.code === 'auth/operation-not-allowed') msg = 'Email/password accounts are not enabled';

      Alert.alert('Registration Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const EntityButton = ({ label, value, selected, onPress }) => (
    <TouchableOpacity
      onPress={() => onPress(value)}
      activeOpacity={0.8}
      style={[
        styles.roleButton,
        selected ? styles.roleButtonSelected : styles.roleButtonUnselected,
      ]}
    >
      <Text
        style={[
          styles.roleButtonText,
          selected ? styles.roleButtonTextSelected : styles.roleButtonTextUnselected,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.branding}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.logoHid}>Hid</Text>
            <Text style={styles.logoG}>G</Text>
          </View>
          <Text style={styles.tagline}>Scrap Smart • Recycle Better</Text>
        </View>

        <Text style={styles.title}>Join Our Digital Trade Market Platform</Text>
        <Text style={styles.subtitle}>Be part of our HidG community ♻️</Text>

        <View style={styles.form}>
          <View>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your full name"
              placeholderTextColor="#94a3b8"
              autoCapitalize="words"
            />
          </View>

          <View>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="+91 98765 43210"
              placeholderTextColor="#94a3b8"
              maxLength={15}
            />
          </View>

          <View>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              placeholder="yourname@example.com"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
            />
          </View>

          <View>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••••••"
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View>
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholder="••••••••••••"
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={styles.roleSection}>
            <Text style={styles.label}>I want to register as</Text>
            <View style={styles.roleContainer}>
              {ENTITY_OPTIONS.map((opt) => (
                <EntityButton
                  key={opt.value}
                  label={opt.label}
                  value={opt.value}
                  selected={entityType === opt.value}
                  onPress={setEntityType}
                />
              ))}
            </View>
          </View>

          {isOrganization && (
            <>
              <View style={styles.sectionDivider}>
                <View style={styles.dividerLine} />
                <Text style={styles.sectionTitle}>Organization Details</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.expandContent}>
                <View>
                  <Text style={styles.label}>{getNameLabel()} Name</Text>
                  <TextInput
                    style={styles.input}
                    value={businessName}
                    onChangeText={setBusinessName}
                    placeholder="Enter name"
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                <View>
                  <Text style={styles.label}>Location (Town/City)</Text>
                  <TextInput
                    style={styles.input}
                    value={location}
                    onChangeText={setLocation}
                    placeholder="e.g. chalakkudy, Thrissur"
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                <View>
                  <Text style={styles.label}>Full Address</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={address}
                    onChangeText={setAddress}
                    placeholder="House No, Street, Landmark..."
                    placeholderTextColor="#94a3b8"
                    multiline
                    numberOfLines={4}
                  />
                </View>

                {requiresCategory && (
                  <View>
                    <Text style={styles.label}>Type of Business / Activity</Text>
                    <View
                      style={[
                        styles.pickerContainer,
                        businessCategory !== 'Select Type' && styles.pickerContainerSelected,
                      ]}
                    >
                      <Picker
                        selectedValue={businessCategory}
                        onValueChange={setBusinessCategory}
                        style={[
                          styles.picker,
                          businessCategory !== 'Select Type' && styles.pickerSelected,
                        ]}
                        dropdownIconColor={businessCategory !== 'Select Type' ? '#3b82f6' : '#94a3b8'}
                        mode="dropdown"
                      >
                        {getCategoryOptions().map((type) => (
                          <Picker.Item
                            key={type}
                            label={type}
                            value={type}
                            color={type === businessCategory ? '#3b82f6' : '#94a3b8'}
                          />
                        ))}
                      </Picker>
                    </View>
                  </View>
                )}

                {requiresGST && (
                  <View>
                    <Text style={[styles.label, styles.mandatoryLabel]}>
                      GST Number <Text style={styles.asterisk}>*</Text> (Mandatory)
                    </Text>
                    <TextInput
                      style={styles.input}
                      value={gstNumber}
                      onChangeText={setGstNumber}
                      placeholder="22AAAAA0000A1Z5"
                      placeholderTextColor="#94a3b8"
                      autoCapitalize="characters"
                      maxLength={15}
                    />
                  </View>
                )}
              </View>
            </>
          )}

          <TouchableOpacity
            style={[styles.registerButton, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.registerButtonText}>Register</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.footerText}>Convert your waste to Gold ♻️</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 50,
    paddingBottom: 160,
  },
  branding: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoHid: {
    fontSize: 60,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -1.5,
  },
  logoG: {
    fontSize: 60,
    fontWeight: '900',
    color: '#3b82f6',
    letterSpacing: -1.5,
    marginLeft: -6,
  },
  tagline: {
    fontSize: 18,
    fontWeight: '700',
    color: '#60a5fa',
    marginTop: 6,
    opacity: 0.9,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#f1f5f9',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 40,
  },
  form: {
    gap: 28,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 8,
  },
  mandatoryLabel: {
    color: '#ef4444',
  },
  asterisk: {
    color: '#f87171',
    fontWeight: '900',
  },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#f1f5f9',
    borderWidth: 1.5,
    borderColor: '#334155',
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  roleSection: {
    marginTop: 12,
  },
  roleContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  roleButton: {
    flex: 0,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 110,
    maxWidth: '48%',
  },
  roleButtonSelected: {
    backgroundColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
  roleButtonUnselected: {
    backgroundColor: '#1e293b',
    borderWidth: 1.5,
    borderColor: '#475569',
  },
  roleButtonText: {
    fontWeight: '700',
    fontSize: 14,
  },
  roleButtonTextSelected: {
    color: 'white',
  },
  roleButtonTextUnselected: {
    color: '#e2e8f0',
  },
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#334155',
  },
  sectionTitle: {
    color: '#60a5fa',
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 16,
  },
  expandContent: {
    marginTop: 8,
    paddingHorizontal: 4,
    gap: 32,
  },
  pickerContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  pickerContainerSelected: {
    borderWidth: 2.5,
    borderColor: '#3b82f6',
    backgroundColor: '#1e40af10',
  },
  picker: {
    height: 54,
    color: '#cbd5e1',
  },
  pickerSelected: {
    color: '#60a5fa',
  },
  registerButton: {
    marginTop: 44,
    backgroundColor: '#2563eb',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  registerButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  footerText: {
    textAlign: 'center',
    color: '#64748b',
    marginTop: 36,
    fontSize: 13,
  },
});