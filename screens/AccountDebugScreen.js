import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

export default function AccountDebugScreen({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'No user logged in');
        return;
      }

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        setUserData({ uid: user.uid, email: user.email, ...userDoc.data() });
      }
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        onPress: async () => {
          try {
            await signOut(auth);
            navigation.replace('Login');
          } catch (e) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loading}>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account Debug</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🔍 Current Account Information</Text>

          <View style={styles.row}>
            <Text style={styles.label}>User ID:</Text>
            <Text style={styles.value}>{userData?.uid?.slice(0, 20)}...</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{userData?.email}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Name:</Text>
            <Text style={styles.value}>{userData?.name}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Phone:</Text>
            <Text style={styles.value}>{userData?.phone}</Text>
          </View>

          <View style={[styles.row, styles.highlightRow]}>
            <Text style={styles.label}>Account Type:</Text>
            <Text style={[styles.value, styles.highlight]}>
              {userData?.entityType?.toUpperCase()}
            </Text>
          </View>

          {userData?.businessName && (
            <View style={styles.row}>
              <Text style={styles.label}>Business:</Text>
              <Text style={styles.value}>{userData?.businessName}</Text>
            </View>
          )}

          {userData?.location && (
            <View style={styles.row}>
              <Text style={styles.label}>Location:</Text>
              <Text style={styles.value}>{userData?.location}</Text>
            </View>
          )}

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Capabilities:</Text>
          {userData?.capabilities && (
            <>
              <View style={styles.capRow}>
                <Ionicons
                  name={userData.capabilities.canSell ? 'checkmark-circle' : 'close-circle'}
                  size={20}
                  color={userData.capabilities.canSell ? '#10b981' : '#ef4444'}
                />
                <Text style={styles.capText}>Can Sell Scrap</Text>
              </View>
              <View style={styles.capRow}>
                <Ionicons
                  name={userData.capabilities.canBuy ? 'checkmark-circle' : 'close-circle'}
                  size={20}
                  color={userData.capabilities.canBuy ? '#10b981' : '#ef4444'}
                />
                <Text style={styles.capText}>Can Buy Scrap</Text>
              </View>
              <View style={styles.capRow}>
                <Ionicons
                  name={userData.capabilities.canOfferPickup ? 'checkmark-circle' : 'close-circle'}
                  size={20}
                  color={userData.capabilities.canOfferPickup ? '#10b981' : '#ef4444'}
                />
                <Text style={styles.capText}>Can Offer Pickup</Text>
              </View>
            </>
          )}
        </View>

        <View style={styles.warningCard}>
          <Ionicons name="information-circle" size={24} color="#f59e0b" />
          <View style={{ flex: 1 }}>
            <Text style={styles.warningTitle}>Important Note</Text>
            <Text style={styles.warningText}>
              If you're seeing the wrong account type, you're logged in with the wrong email/password.
              Each account type needs a separate email address.
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out" size={20} color="#fff" />
          <Text style={styles.logoutText}>Logout & Switch Account</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111' },
  loading: { textAlign: 'center', marginTop: 40, fontSize: 16, color: '#6b7280' },
  content: { padding: 16, paddingBottom: 40 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#111', marginBottom: 16 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  highlightRow: { backgroundColor: '#fef3c7', marginHorizontal: -20, paddingHorizontal: 20 },
  label: { fontSize: 14, color: '#6b7280', fontWeight: '600' },
  value: { fontSize: 14, color: '#111', fontWeight: '500', flex: 1, textAlign: 'right' },
  highlight: { color: '#f59e0b', fontWeight: '800' },
  divider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111', marginBottom: 12 },
  capRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  capText: { fontSize: 14, color: '#374151' },

  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  warningTitle: { fontSize: 15, fontWeight: '700', color: '#92400e', marginBottom: 4 },
  warningText: { fontSize: 13, color: '#78350f', lineHeight: 18 },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 14,
  },
  logoutText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
