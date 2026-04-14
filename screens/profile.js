// AdvancedProfile.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { getAuth, signOut } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as DocumentPicker from 'expo-document-picker';
import { useNavigation } from '@react-navigation/native';

const AdvancedProfileScreen = () => {
  const auth = getAuth();
  const db = getFirestore();
  const storage = getStorage();
  const navigation = useNavigation();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isUploadingProfile, setIsUploadingProfile] = useState(false);
  const [isUploadingGst, setIsUploadingGst] = useState(false);
  const [isUploadingLicense, setIsUploadingLicense] = useState(false);

  const [userData, setUserData] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    businessName: '',
    location: '',
    address: '',
    businessCategory: '',
    gstNumber: '',
  });

  // Fetch user profile
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          navigation.replace('Login');
          return;
        }

        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          setUserData(data);

          setFormData({
            name: data.name || '',
            phone: data.phone || '',
            businessName: data.businessName || '',
            location: data.location || '',
            address: data.address || '',
            businessCategory: data.businessCategory || '',
            gstNumber: data.gstNumber || '',
          });
        } else {
          Alert.alert('Error', 'Profile not found');
          navigation.replace('Login');
        }
      } catch (error) {
        console.error('Profile fetch error:', error);
        Alert.alert('Error', 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [auth, db, navigation]);

  // Common upload helper
  const uploadFileToStorage = async (uri, path, contentType) => {
    const storageRef = ref(storage, path);
    const response = await fetch(uri);
    const blob = await response.blob();
    await uploadBytes(storageRef, blob, { contentType });
    return await getDownloadURL(storageRef);
  };

  // Profile Picture Upload
  const handleUploadProfilePicture = async () => {
    try {
      setIsUploadingProfile(true);

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Gallery access is required');
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (pickerResult.canceled || !pickerResult.assets?.length) return;

      // Resize + Compress
      const manipResult = await ImageManipulator.manipulateAsync(
        pickerResult.assets[0].uri,
        [{ resize: { width: 512 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );

      const currentUser = auth.currentUser;
      const storagePath = `profilePictures/${currentUser.uid}.jpg`;
      const downloadURL = await uploadFileToStorage(
        manipResult.uri,
        storagePath,
        'image/jpeg'
      );

      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, {
        profilePictureUrl: downloadURL,
        updatedAt: serverTimestamp(),
      });

      setUserData((prev) => ({ ...prev, profilePictureUrl: downloadURL }));

      Alert.alert('Success', 'Profile picture updated!');
    } catch (error) {
      console.error('Profile picture upload failed:', error);
      Alert.alert('Upload Failed', 'Please try again');
    } finally {
      setIsUploadingProfile(false);
    }
  };

  // KYC Document Upload (GST or Business License)
  const handleUploadKYC = async (type) => {
    const isGst = type === 'gst';
    const setUploading = isGst ? setIsUploadingGst : setIsUploadingLicense;

    try {
      setUploading(true);

      const pickerResult = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png'],
        copyToCacheDirectory: true,
      });

      if (pickerResult.canceled || !pickerResult.assets?.length) return;

      const file = pickerResult.assets[0];

      if (file.size > 5 * 1024 * 1024) {
        Alert.alert('File Too Large', 'Maximum allowed size is 5 MB');
        return;
      }

      const currentUser = auth.currentUser;
      const storagePath = `kyc/${currentUser.uid}/${isGst ? 'gstCertificate' : 'businessLicense'}`;
      const contentType = file.mimeType || (file.name?.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');

      const downloadURL = await uploadFileToStorage(file.uri, storagePath, contentType);

      const userDocRef = doc(db, 'users', currentUser.uid);

      const updatePayload = {
        [`kycDocuments.${isGst ? 'gstCertificateUrl' : 'businessLicenseUrl'}`]: downloadURL,
        updatedAt: serverTimestamp(),
      };

      const currentStatus = userData?.kycStatus || 'not_submitted';
      if (currentStatus !== 'approved') {
        updatePayload.kycStatus = 'pending';
        updatePayload.kycSubmittedAt = serverTimestamp();
        if (currentStatus === 'rejected') {
          updatePayload.kycRejectionReason = '';
        }
      }

      await updateDoc(userDocRef, updatePayload);

      // Optimistic UI update
      setUserData((prev) => ({
        ...prev,
        kycDocuments: {
          ...(prev.kycDocuments || {}),
          [isGst ? 'gstCertificateUrl' : 'businessLicenseUrl']: downloadURL,
        },
        kycStatus: updatePayload.kycStatus || prev.kycStatus,
        kycSubmittedAt: updatePayload.kycSubmittedAt || prev.kycSubmittedAt,
        kycRejectionReason: updatePayload.kycRejectionReason !== undefined ? updatePayload.kycRejectionReason : prev.kycRejectionReason,
      }));

      Alert.alert('Success', `${isGst ? 'GST Certificate' : 'Business License'} uploaded successfully!`);
    } catch (error) {
      console.error('KYC upload error:', error);
      Alert.alert('Upload Failed', 'Please try again');
    } finally {
      setUploading(false);
    }
  };

  // Validation
  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Name is required');
      return false;
    }
    if (!formData.phone || formData.phone.length !== 10 || isNaN(formData.phone)) {
      Alert.alert('Error', 'Valid 10-digit phone number is required');
      return false;
    }

    if (userData?.entityType !== 'individual') {
      if (!formData.businessName.trim() || !formData.location.trim() || !formData.address.trim() || !formData.businessCategory.trim()) {
        Alert.alert('Error', 'All organization fields are required');
        return false;
      }
    }

    if (userData?.entityType === 'agency') {
      const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!formData.gstNumber || !gstRegex.test(formData.gstNumber.toUpperCase())) {
        Alert.alert('Error', 'Please enter a valid GST Number (e.g. 22AAAAA0000A1Z5)');
        return false;
      }
    }

    return true;
  };

  // Update Profile (non-KYC fields)
  const handleUpdateProfile = async () => {
    if (!validateForm()) return;

    setSaving(true);

    try {
      const currentUser = auth.currentUser;
      const userDocRef = doc(db, 'users', currentUser.uid);

      const updatePayload = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        updatedAt: serverTimestamp(),
      };

      if (userData.entityType !== 'individual') {
        Object.assign(updatePayload, {
          businessName: formData.businessName.trim(),
          location: formData.location.trim(),
          address: formData.address.trim(),
          businessCategory: formData.businessCategory.trim(),
        });
      }

      if (userData.entityType === 'agency') {
        updatePayload.gstNumber = formData.gstNumber.trim().toUpperCase();
      }

      await updateDoc(userDocRef, updatePayload);

      setUserData((prev) => ({ ...prev, ...updatePayload, updatedAt: new Date() }));

      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Profile update error:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut(auth);
            navigation.replace('Login');
          } catch (error) {
            Alert.alert('Error', 'Logout failed');
          }
        },
      },
    ]);
  };

  // Helpers
  const getEntityColor = (type) => {
    const colors = {
      individual: '#2196F3',
      shop: '#FF9800',
      mall: '#9C27B0',
      supermarket: '#00BCD4',
      industry: '#FF5722',
      scrap_center: '#4CAF50',
      agency: '#607D8B',
    };
    return colors[type] || '#757575';
  };

  const getKycStatusColor = (status) => {
    switch (status) {
      case 'approved': return '#4CAF50';
      case 'pending': return '#FF9800';
      case 'rejected': return '#f44336';
      default: return '#757575';
    }
  };

  const renderCapability = (label, enabled) => (
    <View style={[styles.capBadge, { backgroundColor: enabled ? '#4CAF50' : '#f44336' }]}>
      <Text style={styles.capText}>
        {label}: {enabled ? 'YES' : 'NO'}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  const isKycEligible = ['agency', 'scrap_center'].includes(userData?.entityType);
  const kycStatus = userData?.kycStatus || 'not_submitted';
  const isVerified = userData?.profileVerified === true;
  const kycDocs = userData?.kycDocuments || {};

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Profile Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleUploadProfilePicture} disabled={isUploadingProfile} style={styles.profilePicContainer}>
              {userData?.profilePictureUrl ? (
                <Image source={{ uri: userData.profilePictureUrl }} style={styles.profileImage} />
              ) : (
                <View style={styles.profilePlaceholder}>
                  <Text style={styles.placeholderInitial}>
                    {(userData?.name || 'U').charAt(0).toUpperCase()}
                  </Text>
                  <Text style={styles.addPhotoLabel}>TAP TO ADD PHOTO</Text>
                </View>
              )}

              {isUploadingProfile && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator color="#fff" />
                </View>
              )}

              {userData?.profilePictureUrl && !isUploadingProfile && (
                <View style={styles.editBadge}>
                  <Text style={styles.editText}>EDIT</Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.name}>{userData?.name || 'User'}</Text>

            <View style={styles.badgesRow}>
              <View style={[styles.entityBadge, { backgroundColor: getEntityColor(userData?.entityType) }]}>
                <Text style={styles.entityText}>
                  {userData?.entityType?.toUpperCase().replace('_', ' ')}
                </Text>
              </View>

              {isVerified && (
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedText}>✓ VERIFIED</Text>
                </View>
              )}
            </View>
          </View>

          {/* Basic & Organization Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profile Information</Text>

            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(t) => setFormData({ ...formData, name: t })}
              editable={!isVerified}
            />

            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={formData.phone}
              onChangeText={(t) => setFormData({ ...formData, phone: t.replace(/[^0-9]/g, '') })}
              keyboardType="phone-pad"
              maxLength={10}
              editable={!isVerified}
            />

            <Text style={styles.label}>Email (non-editable)</Text>
            <Text style={styles.nonEditable}>{userData?.email}</Text>

            {userData?.entityType !== 'individual' && (
              <>
                <Text style={styles.label}>Business Name</Text>
                <TextInput
                  style={styles.input}
                  value={formData.businessName}
                  onChangeText={(t) => setFormData({ ...formData, businessName: t })}
                  editable={!isVerified}
                />

                <Text style={styles.label}>Location / City</Text>
                <TextInput
                  style={styles.input}
                  value={formData.location}
                  onChangeText={(t) => setFormData({ ...formData, location: t })}
                  editable={!isVerified}
                />

                <Text style={styles.label}>Full Address</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.address}
                  onChangeText={(t) => setFormData({ ...formData, address: t })}
                  multiline
                  editable={!isVerified}
                />

                <Text style={styles.label}>Business Category</Text>
                <TextInput
                  style={styles.input}
                  value={formData.businessCategory}
                  onChangeText={(t) => setFormData({ ...formData, businessCategory: t })}
                  editable={!isVerified}
                />
              </>
            )}

            {userData?.entityType === 'agency' && (
              <>
                <Text style={styles.label}>GST Number</Text>
                <TextInput
                  style={styles.input}
                  value={formData.gstNumber}
                  onChangeText={(t) => setFormData({ ...formData, gstNumber: t.toUpperCase() })}
                  maxLength={15}
                  autoCapitalize="characters"
                  editable={!isVerified}
                />
              </>
            )}
          </View>

          {/* Capabilities */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Trading Capabilities</Text>
            <View style={styles.capGrid}>
              {renderCapability('Can Sell', userData?.capabilities?.canSell)}
              {renderCapability('Can Buy', userData?.capabilities?.canBuy)}
              {renderCapability('Request Pickup', userData?.capabilities?.canRequestPickup)}
              {renderCapability('Offer Pickup', userData?.capabilities?.canOfferPickup)}
            </View>
          </View>

          {/* KYC Section - Only for agency & scrap_center */}
          {isKycEligible && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>KYC Verification</Text>

              <View style={[styles.kycStatusBadge, { backgroundColor: getKycStatusColor(kycStatus) }]}>
                <Text style={styles.kycStatusText}>
                  {kycStatus.toUpperCase().replace('_', ' ')}
                </Text>
              </View>

              {kycStatus === 'rejected' && userData?.kycRejectionReason && (
                <Text style={styles.rejectionReason}>
                  Reason: {userData.kycRejectionReason}
                </Text>
              )}

              {/* GST Certificate */}
              <View style={styles.kycRow}>
                <Text style={styles.kycLabel}>GST Certificate</Text>
                <Text style={kycDocs.gstCertificateUrl ? styles.uploadedText : styles.notUploadedText}>
                  {kycDocs.gstCertificateUrl ? '✓ Uploaded' : 'Not uploaded'}
                </Text>
                <TouchableOpacity
                  style={[styles.kycUploadBtn, (isUploadingGst || kycStatus === 'approved') && styles.disabledBtn]}
                  onPress={() => handleUploadKYC('gst')}
                  disabled={isUploadingGst || kycStatus === 'approved'}
                >
                  {isUploadingGst ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.kycUploadText}>
                      {kycDocs.gstCertificateUrl ? 'REPLACE' : 'UPLOAD'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Business License */}
              <View style={styles.kycRow}>
                <Text style={styles.kycLabel}>Business License</Text>
                <Text style={kycDocs.businessLicenseUrl ? styles.uploadedText : styles.notUploadedText}>
                  {kycDocs.businessLicenseUrl ? '✓ Uploaded' : 'Not uploaded'}
                </Text>
                <TouchableOpacity
                  style={[styles.kycUploadBtn, (isUploadingLicense || kycStatus === 'approved') && styles.disabledBtn]}
                  onPress={() => handleUploadKYC('license')}
                  disabled={isUploadingLicense || kycStatus === 'approved'}
                >
                  {isUploadingLicense ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.kycUploadText}>
                      {kycDocs.businessLicenseUrl ? 'REPLACE' : 'UPLOAD'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              {kycStatus === 'approved' && (
                <Text style={styles.approvedNote}>KYC has been approved by admin. You cannot modify documents.</Text>
              )}
            </View>
          )}

          {/* Update Button */}
          <TouchableOpacity
            style={[styles.updateBtn, (saving || isVerified) && styles.disabledBtn]}
            onPress={handleUpdateProfile}
            disabled={saving || isVerified}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.updateBtnText}>UPDATE PROFILE</Text>}
          </TouchableOpacity>

          {/* Logout */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>LOGOUT</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#121212' },
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 100 },
  loadingContainer: { flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#bbb', marginTop: 12, fontSize: 16 },

  header: { alignItems: 'center', marginBottom: 30 },
  profilePicContainer: { width: 130, height: 130, borderRadius: 65, overflow: 'hidden', marginBottom: 16, position: 'relative' },
  profileImage: { width: '100%', height: '100%', borderRadius: 65 },
  profilePlaceholder: { width: '100%', height: '100%', backgroundColor: '#1E1E1E', justifyContent: 'center', alignItems: 'center', borderRadius: 65, borderWidth: 3, borderColor: '#4CAF50' },
  placeholderInitial: { fontSize: 48, color: '#4CAF50', fontWeight: '700' },
  addPhotoLabel: { fontSize: 12, color: '#4CAF50', marginTop: 6 },
  uploadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  editBadge: { position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  editText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  name: { fontSize: 26, fontWeight: '700', color: '#fff', marginBottom: 8 },
  badgesRow: { flexDirection: 'row', gap: 10 },
  entityBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 30 },
  entityText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  verifiedBadge: { backgroundColor: '#4CAF50', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 30 },
  verifiedText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  section: { backgroundColor: '#1E1E1E', borderRadius: 16, padding: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 16 },
  label: { fontSize: 14, color: '#bbb', marginBottom: 6 },
  input: { backgroundColor: '#2A2A2A', borderRadius: 12, padding: 14, color: '#fff', fontSize: 16, marginBottom: 16 },
  textArea: { height: 80, textAlignVertical: 'top' },
  nonEditable: { backgroundColor: '#2A2A2A', borderRadius: 12, padding: 14, color: '#888', fontSize: 16, marginBottom: 16 },

  capGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  capBadge: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 30, minWidth: '47%' },
  capText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  kycStatusBadge: { alignSelf: 'flex-start', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 30, marginBottom: 12 },
  kycStatusText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  rejectionReason: { color: '#f44336', fontSize: 14, marginBottom: 16 },

  kycRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#333' },
  kycLabel: { color: '#ddd', fontSize: 16, flex: 1 },
  uploadedText: { color: '#4CAF50', fontWeight: '600' },
  notUploadedText: { color: '#888' },
  kycUploadBtn: { backgroundColor: '#4CAF50', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  kycUploadText: { color: '#fff', fontWeight: '700' },
  disabledBtn: { opacity: 0.5 },
  approvedNote: { color: '#4CAF50', fontSize: 13, marginTop: 12, textAlign: 'center' },

  updateBtn: { backgroundColor: '#4CAF50', borderRadius: 14, paddingVertical: 18, alignItems: 'center', marginTop: 10 },
  updateBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  logoutBtn: { backgroundColor: '#f44336', borderRadius: 14, paddingVertical: 18, alignItems: 'center', marginTop: 16 },
  logoutText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});

export default AdvancedProfileScreen;