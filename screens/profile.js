import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Alert,
  ActivityIndicator, StyleSheet, SafeAreaView, KeyboardAvoidingView,
  Platform, Image, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAuth, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as DocumentPicker from 'expo-document-picker';
import { useNavigation } from '@react-navigation/native';
import { C, S, R } from '../theme';

const ENTITY_LABELS = {
  individual: 'Individual', shop: 'Shop', mall: 'Mall',
  supermarket: 'Supermarket', industry: 'Industry',
  scrap_center: 'Scrap Center', agency: 'Agency', pickup_agent: 'Pickup Agent',
};

const ENTITY_COLORS = {
  individual: '#3B82F6', shop: '#F59E0B', mall: '#8B5CF6',
  supermarket: '#06B6D4', industry: '#EF4444', scrap_center: '#10B981',
  agency: '#6366F1', pickup_agent: '#F97316',
};

export default function ProfileScreen() {
  const auth = getAuth();
  const db = getFirestore();
  const storage = getStorage();
  const navigation = useNavigation();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingGst, setUploadingGst] = useState(false);
  const [uploadingLicense, setUploadingLicense] = useState(false);
  const [userData, setUserData] = useState(null);
  const [focused, setFocused] = useState(null);
  const [form, setForm] = useState({
    name: '', phone: '', businessName: '', location: '', address: '', businessCategory: '', gstNumber: '',
  });

  useEffect(() => {
    const fetch = async () => {
      try {
        const user = auth.currentUser;
        if (!user) { navigation.replace('Login'); return; }
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (!snap.exists()) { navigation.replace('Login'); return; }
        const d = snap.data();
        setUserData(d);
        setForm({ name: d.name || '', phone: d.phone || '', businessName: d.businessName || '', location: d.location || '', address: d.address || '', businessCategory: d.businessCategory || '', gstNumber: d.gstNumber || '' });
      } catch (e) {
        Alert.alert('Error', 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const uploadFile = async (uri, path, contentType) => {
    const storageRef = ref(storage, path);
    const blob = await (await fetch(uri)).blob();
    await uploadBytes(storageRef, blob, { contentType });
    return getDownloadURL(storageRef);
  };

  const handlePhotoUpload = async () => {
    try {
      setUploadingPhoto(true);
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission Denied', 'Gallery access required'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      if (result.canceled || !result.assets?.length) return;
      const compressed = await ImageManipulator.manipulateAsync(result.assets[0].uri, [{ resize: { width: 512 } }], { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG });
      const url = await uploadFile(compressed.uri, `profilePictures/${auth.currentUser.uid}.jpg`, 'image/jpeg');
      await updateDoc(doc(db, 'users', auth.currentUser.uid), { profilePictureUrl: url, updatedAt: serverTimestamp() });
      setUserData(p => ({ ...p, profilePictureUrl: url }));
      Alert.alert('Success', 'Profile photo updated!');
    } catch (e) {
      Alert.alert('Error', 'Upload failed. Try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleKycUpload = async (type) => {
    const isGst = type === 'gst';
    const setUploading = isGst ? setUploadingGst : setUploadingLicense;
    try {
      setUploading(true);
      const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/jpeg', 'image/png'], copyToCacheDirectory: true });
      if (result.canceled || !result.assets?.length) return;
      const file = result.assets[0];
      if (file.size > 5 * 1024 * 1024) { Alert.alert('Too Large', 'Max file size is 5 MB'); return; }
      const path = `kyc/${auth.currentUser.uid}/${isGst ? 'gstCertificate' : 'businessLicense'}`;
      const url = await uploadFile(file.uri, path, file.mimeType || 'application/pdf');
      const payload = {
        [`kycDocuments.${isGst ? 'gstCertificateUrl' : 'businessLicenseUrl'}`]: url,
        updatedAt: serverTimestamp(),
      };
      if (userData?.kycStatus !== 'approved') { payload.kycStatus = 'pending'; payload.kycSubmittedAt = serverTimestamp(); }
      await updateDoc(doc(db, 'users', auth.currentUser.uid), payload);
      setUserData(p => ({ ...p, kycDocuments: { ...(p.kycDocuments || {}), [isGst ? 'gstCertificateUrl' : 'businessLicenseUrl']: url }, kycStatus: payload.kycStatus || p.kycStatus }));
      Alert.alert('Uploaded', `${isGst ? 'GST Certificate' : 'Business License'} uploaded!`);
    } catch (e) {
      Alert.alert('Error', 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Required', 'Name is required'); return; }
    if (!form.phone || form.phone.replace(/\D/g, '').length < 10) { Alert.alert('Invalid', 'Enter a valid 10-digit phone number'); return; }
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), phone: form.phone.trim(), updatedAt: serverTimestamp() };
      if (userData.entityType !== 'individual') {
        Object.assign(payload, { businessName: form.businessName.trim(), location: form.location.trim(), address: form.address.trim(), businessCategory: form.businessCategory.trim() });
      }
      if (userData.entityType === 'agency') payload.gstNumber = form.gstNumber.trim().toUpperCase();
      await updateDoc(doc(db, 'users', auth.currentUser.uid), payload);
      setUserData(p => ({ ...p, ...payload }));
      Alert.alert('Saved', 'Profile updated successfully!');
    } catch (e) {
      Alert.alert('Error', 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Sign Out', 
        style: 'destructive', 
        onPress: async () => {
          try {
            await signOut(auth);
            navigation.replace('Login');
          } catch (err) {
            console.error('Logout error:', err);
            Alert.alert('Error', 'Failed to logout');
          }
        }
      },
    ]);
  };

  if (loading) return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <View style={styles.centered}><ActivityIndicator size="large" color={C.primary} /></View>
    </SafeAreaView>
  );

  const isOrg = userData?.entityType !== 'individual';
  const isAgency = userData?.entityType === 'agency';
  const isKycEligible = ['agency', 'scrap_center'].includes(userData?.entityType);
  const kycStatus = userData?.kycStatus || 'not_submitted';
  const kycDocs = userData?.kycDocuments || {};
  const entityColor = ENTITY_COLORS[userData?.entityType] || C.primary;
  const inputWrap = (f) => [styles.inputWrap, focused === f && styles.inputWrapFocused];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <TouchableOpacity onPress={handlePhotoUpload} disabled={uploadingPhoto} style={styles.photoWrap}>
              {userData?.profilePictureUrl
                ? <Image source={{ uri: userData.profilePictureUrl }} style={styles.photo} />
                : (
                  <View style={[styles.photoPlaceholder, { backgroundColor: entityColor + '20', borderColor: entityColor }]}>
                    <Text style={[styles.photoInitial, { color: entityColor }]}>{(userData?.name || 'U').charAt(0).toUpperCase()}</Text>
                  </View>
                )
              }
              {uploadingPhoto
                ? <View style={styles.photoOverlay}><ActivityIndicator color="#fff" /></View>
                : <View style={styles.editPhotoBtn}><Ionicons name="camera" size={14} color="#fff" /></View>
              }
            </TouchableOpacity>

            <Text style={styles.profileName}>{userData?.name || 'User'}</Text>
            <Text style={styles.profileEmail}>{userData?.email}</Text>

            <View style={styles.badgesRow}>
              <View style={[styles.entityBadge, { backgroundColor: entityColor + '15', borderColor: entityColor }]}>
                <Text style={[styles.entityBadgeText, { color: entityColor }]}>
                  {ENTITY_LABELS[userData?.entityType] || userData?.entityType}
                </Text>
              </View>
              {userData?.profileVerified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={13} color={C.success} />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              )}
            </View>
          </View>

          {/* Profile Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profile Information</Text>

            {[
              { label: 'Full Name', key: 'name', icon: 'person-outline', keyboard: 'default' },
              { label: 'Phone Number', key: 'phone', icon: 'call-outline', keyboard: 'phone-pad' },
            ].map(f => (
              <View key={f.key} style={styles.fieldGroup}>
                <Text style={styles.label}>{f.label}</Text>
                <View style={inputWrap(f.key)}>
                  <Ionicons name={f.icon} size={16} color={focused === f.key ? C.primary : C.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.inputInner}
                    value={form[f.key]}
                    onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))}
                    keyboardType={f.keyboard}
                    onFocus={() => setFocused(f.key)}
                    onBlur={() => setFocused(null)}
                  />
                </View>
              </View>
            ))}

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.readonlyWrap}>
                <Ionicons name="mail-outline" size={16} color={C.textMuted} style={styles.inputIcon} />
                <Text style={styles.readonlyText}>{userData?.email}</Text>
                <View style={styles.lockIcon}><Ionicons name="lock-closed-outline" size={13} color={C.textMuted} /></View>
              </View>
            </View>

            {isOrg && [
              { label: 'Business Name', key: 'businessName', icon: 'business-outline' },
              { label: 'Location / City', key: 'location', icon: 'location-outline' },
              { label: 'Full Address', key: 'address', icon: 'map-outline', multiline: true },
              { label: 'Business Category', key: 'businessCategory', icon: 'pricetag-outline' },
            ].map(f => (
              <View key={f.key} style={styles.fieldGroup}>
                <Text style={styles.label}>{f.label}</Text>
                <View style={[inputWrap(f.key), f.multiline && styles.textAreaWrap]}>
                  <Ionicons name={f.icon} size={16} color={focused === f.key ? C.primary : C.textMuted} style={[styles.inputIcon, f.multiline && { marginTop: 2 }]} />
                  <TextInput
                    style={[styles.inputInner, f.multiline && styles.textAreaInner]}
                    value={form[f.key]}
                    onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))}
                    multiline={f.multiline}
                    textAlignVertical={f.multiline ? 'top' : 'center'}
                    onFocus={() => setFocused(f.key)}
                    onBlur={() => setFocused(null)}
                  />
                </View>
              </View>
            ))}

            {isAgency && (
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>GST Number</Text>
                <View style={inputWrap('gst')}>
                  <Ionicons name="document-text-outline" size={16} color={focused === 'gst' ? C.primary : C.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.inputInner}
                    value={form.gstNumber}
                    onChangeText={v => setForm(p => ({ ...p, gstNumber: v.toUpperCase() }))}
                    autoCapitalize="characters"
                    maxLength={15}
                    onFocus={() => setFocused('gst')}
                    onBlur={() => setFocused(null)}
                  />
                </View>
              </View>
            )}
          </View>

          {/* Capabilities */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Capabilities</Text>
            <View style={styles.capsGrid}>
              {[
                { label: 'Can Sell', val: userData?.capabilities?.canSell },
                { label: 'Can Buy', val: userData?.capabilities?.canBuy },
                { label: 'Request Pickup', val: userData?.capabilities?.canRequestPickup },
                { label: 'Offer Pickup', val: userData?.capabilities?.canOfferPickup },
              ].map((cap, i) => (
                <View key={i} style={[styles.capBadge, { backgroundColor: cap.val ? C.successLight : C.surfaceAlt, borderColor: cap.val ? C.successBorder : C.border }]}>
                  <Ionicons name={cap.val ? 'checkmark-circle' : 'close-circle'} size={14} color={cap.val ? C.success : C.textMuted} />
                  <Text style={[styles.capText, { color: cap.val ? C.success : C.textMuted }]}>{cap.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* KYC */}
          {isKycEligible && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>KYC Verification</Text>

              <View style={[styles.kycStatusBox, {
                backgroundColor: kycStatus === 'approved' ? C.successLight : kycStatus === 'pending' ? C.warningLight : C.dangerLight,
                borderColor: kycStatus === 'approved' ? C.successBorder : kycStatus === 'pending' ? C.warningBorder : C.dangerBorder,
              }]}>
                <Ionicons
                  name={kycStatus === 'approved' ? 'shield-checkmark-outline' : kycStatus === 'pending' ? 'time-outline' : 'alert-circle-outline'}
                  size={18}
                  color={kycStatus === 'approved' ? C.success : kycStatus === 'pending' ? C.warning : C.danger}
                />
                <Text style={[styles.kycStatusText, { color: kycStatus === 'approved' ? C.success : kycStatus === 'pending' ? C.warning : C.danger }]}>
                  KYC {kycStatus.replace('_', ' ').toUpperCase()}
                </Text>
              </View>

              {[
                { label: 'GST Certificate', key: 'gstCertificateUrl', type: 'gst', uploading: uploadingGst },
                { label: 'Business License', key: 'businessLicenseUrl', type: 'license', uploading: uploadingLicense },
              ].map(doc => (
                <View key={doc.key} style={styles.kycRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.kycDocLabel}>{doc.label}</Text>
                    <Text style={[styles.kycDocStatus, { color: kycDocs[doc.key] ? C.success : C.textMuted }]}>
                      {kycDocs[doc.key] ? '✓ Uploaded' : 'Not uploaded'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.kycUploadBtn, (doc.uploading || kycStatus === 'approved') && styles.kycUploadBtnDisabled]}
                    onPress={() => handleKycUpload(doc.type)}
                    disabled={doc.uploading || kycStatus === 'approved'}
                  >
                    {doc.uploading
                      ? <ActivityIndicator size="small" color={C.primary} />
                      : <Text style={styles.kycUploadText}>{kycDocs[doc.key] ? 'Replace' : 'Upload'}</Text>
                    }
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Save Button */}
          <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="checkmark-outline" size={18} color="#fff" />
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Support & Legal Links */}
          <View style={styles.linksSection}>
            <TouchableOpacity 
              style={styles.linkBtn}
              onPress={() => navigation.navigate('SupportScreen')}
            >
              <Ionicons name="help-circle-outline" size={20} color="#3b82f6" />
              <Text style={styles.linkText}>Help & Support</Text>
              <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.linkBtn}
              onPress={() => navigation.navigate('ComplaintScreen')}
            >
              <Ionicons name="alert-circle-outline" size={20} color="#ef4444" />
              <Text style={styles.linkText}>File Complaint</Text>
              <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.linkBtn}
              onPress={() => navigation.navigate('TermsAndConditionsScreen')}
            >
              <Ionicons name="document-text-outline" size={20} color="#8b5cf6" />
              <Text style={styles.linkText}>Terms & Conditions</Text>
              <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.linkBtn}
              onPress={() => navigation.navigate('PrivacyPolicyScreen')}
            >
              <Ionicons name="shield-checkmark-outline" size={20} color="#10b981" />
              <Text style={styles.linkText}>Privacy Policy</Text>
              <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Logout */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={18} color={C.danger} />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 20, paddingBottom: 60 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  profileHeader: { alignItems: 'center', marginBottom: 28 },
  photoWrap: { width: 100, height: 100, borderRadius: 50, marginBottom: 14, position: 'relative' },
  photo: { width: 100, height: 100, borderRadius: 50 },
  photoPlaceholder: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  photoInitial: { fontSize: 40, fontWeight: '800' },
  photoOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  editPhotoBtn: { position: 'absolute', bottom: 2, right: 2, width: 28, height: 28, borderRadius: 14, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.bg },
  profileName: { fontSize: 22, fontWeight: '800', color: C.textPrimary, marginBottom: 4 },
  profileEmail: { fontSize: 13, color: C.textMuted, marginBottom: 12 },
  badgesRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  entityBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  entityBadgeText: { fontSize: 12, fontWeight: '700' },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.successLight, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: C.successBorder },
  verifiedText: { fontSize: 12, fontWeight: '700', color: C.success },

  section: { backgroundColor: C.surface, borderRadius: R.xl, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: C.border, ...S.card },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 16 },

  fieldGroup: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: C.textSecondary, marginBottom: 6 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surfaceAlt, borderRadius: R.md, borderWidth: 1.5, borderColor: C.border, paddingHorizontal: 12 },
  inputWrapFocused: { borderColor: C.primary, backgroundColor: C.primaryLight },
  textAreaWrap: { alignItems: 'flex-start', paddingTop: 10 },
  inputIcon: { marginRight: 8 },
  inputInner: { flex: 1, fontSize: 14, color: C.textPrimary, paddingVertical: 11 },
  textAreaInner: { minHeight: 70, paddingVertical: 0 },
  readonlyWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surfaceAlt, borderRadius: R.md, borderWidth: 1.5, borderColor: C.border, paddingHorizontal: 12, paddingVertical: 11 },
  readonlyText: { flex: 1, fontSize: 14, color: C.textMuted },
  lockIcon: { marginLeft: 4 },

  capsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  capBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  capText: { fontSize: 12, fontWeight: '600' },

  kycStatusBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: R.md, padding: 12, marginBottom: 14, borderWidth: 1 },
  kycStatusText: { fontSize: 13, fontWeight: '700' },
  kycRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: C.border },
  kycDocLabel: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
  kycDocStatus: { fontSize: 12, marginTop: 2 },
  kycUploadBtn: { backgroundColor: C.primaryLight, borderRadius: R.md, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: C.primary },
  kycUploadBtnDisabled: { opacity: 0.4 },
  kycUploadText: { color: C.primary, fontSize: 13, fontWeight: '700' },

  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.primary, borderRadius: R.lg, paddingVertical: 15, marginBottom: 12, ...S.btn },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  linksSection: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: R.md,
  },
  linkText: {
    flex: 1,
    color: C.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: R.lg, paddingVertical: 14, borderWidth: 1.5, borderColor: C.dangerBorder, backgroundColor: C.dangerLight },
  logoutText: { color: C.danger, fontSize: 15, fontWeight: '700' },
});
