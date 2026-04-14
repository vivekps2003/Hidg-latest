// SellerProfile.js
// Production-ready Seller Profile Screen for HidG App
// Dark modern UI | Firebase Auth + Firestore | Real-time analytics

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { signOut } from 'firebase/auth';
import {
  doc,
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
} from 'firebase/firestore';

import { auth, db } from '../firebase'; // Correct path for screens/ folder

const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
  });
};

export default function SellerProfile({ navigation }) {
  const [userProfile, setUserProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Auth + Profile listener
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
      if (!currentUser) {
        navigation.replace('LoginScreen');
        return;
      }

      // Real-time profile listener
      const userRef = doc(db, 'users', currentUser.uid);
      const unsubscribeProfile = onSnapshot(
        userRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.entityType !== 'seller') {
              Alert.alert('Access Denied', 'This profile is for sellers only.');
              navigation.replace('LoginScreen');
              return;
            }
            setUserProfile({ uid: currentUser.uid, ...data });
          } else {
            setError('Profile not found. Please contact support.');
          }
          setLoading(false);
        },
        (err) => {
          console.error('Profile error:', err);
          setError('Failed to load profile');
          setLoading(false);
        }
      );

      return () => unsubscribeProfile();
    });

    return () => unsubscribeAuth();
  }, [navigation]);

  // Real-time Orders listener (only seller's orders)
  useEffect(() => {
    if (!userProfile?.uid) return;

    const ordersQuery = query(
      collection(db, 'orders'),
      where('sellerId', '==', userProfile.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeOrders = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const fetchedOrders = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setOrders(fetchedOrders);
      },
      (err) => {
        console.error('Orders listener error:', err);
        setError('Failed to load orders');
      }
    );

    return () => unsubscribeOrders();
  }, [userProfile?.uid]);

  // Analytics calculations
  const analytics = useMemo(() => {
    const totalOrders = orders.length;
    const totalScrapSold = orders.reduce((sum, order) => sum + (order.totalKg || 0), 0);
    const totalEarnings = orders
      .filter((o) => o.status === 'Completed')
      .reduce((sum, order) => sum + (order.estimatedTotalPayout || 0), 0);

    return {
      totalOrders,
      totalScrapSold: Number(totalScrapSold.toFixed(2)),
      totalEarnings: Number(totalEarnings.toFixed(2)),
    };
  }, [orders]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigation.replace('LoginScreen');
    } catch (err) {
      console.error('Logout error:', err);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const handleEditProfile = () => {
    Alert.alert(
      'Coming Soon',
      'Edit Profile feature is under development.\n\nYou will be able to update name, phone, and profile photo soon.'
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // Listeners already provide real-time updates, so just a small delay for UX
    setTimeout(() => setRefreshing(false), 800);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#3b82f6" style={{ flex: 1 }} />
        <Text style={styles.loadingText}>Loading your profile...</Text>
      </SafeAreaView>
    );
  }

  if (error || !userProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
          <Text style={styles.errorText}>{error || 'Something went wrong'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => navigation.replace('SellerHome')}>
            <Text style={styles.retryText}>Go Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
        }
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={70} color="#64748b" />
            </View>
            <View style={styles.onlineBadge} />
          </View>

          <Text style={styles.userName}>{userProfile.name || 'Seller'}</Text>
          <Text style={styles.userType}>Verified Seller</Text>
        </View>

        {/* Contact Info */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={22} color="#64748b" />
            <Text style={styles.infoText}>{userProfile.email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={22} color="#64748b" />
            <Text style={styles.infoText}>{userProfile.phone || 'Not added yet'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={22} color="#64748b" />
            <Text style={styles.infoText}>
              Member since {formatDate(userProfile.createdAt)}
            </Text>
          </View>
        </View>

        {/* Stats */}
        <Text style={styles.sectionTitle}>Your Performance</Text>
        <View style={styles.statsContainer}>
          {/* Total Orders */}
          <View style={styles.statCard}>
            <Ionicons name="cube-outline" size={32} color="#3b82f6" />
            <Text style={styles.statNumber}>{analytics.totalOrders}</Text>
            <Text style={styles.statLabel}>Total Orders</Text>
          </View>

          {/* Total Scrap Sold */}
          <View style={styles.statCard}>
            <Ionicons name="leaf-outline" size={32} color="#22c55e" />
            <Text style={styles.statNumber}>{analytics.totalScrapSold}</Text>
            <Text style={styles.statLabel}>kg Sold</Text>
          </View>

          {/* Total Earnings */}
          <View style={styles.statCard}>
            <Ionicons name="cash-outline" size={32} color="#eab308" />
            <Text style={styles.statNumber}>₹{analytics.totalEarnings.toLocaleString('en-IN')}</Text>
            <Text style={styles.statLabel}>Total Earnings</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
            <LinearGradient
              colors={['#3b82f6', '#2563eb']}
              style={styles.buttonGradient}
            >
              <Ionicons name="create-outline" size={20} color="#fff" />
              <Text style={styles.buttonText}>Edit Profile</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <View style={styles.logoutButtonInner}>
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
              <Text style={styles.logoutText}>Logout</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#334155',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#22c55e',
    borderWidth: 3,
    borderColor: '#0f172a',
  },
  userName: {
    color: '#f1f5f9',
    fontSize: 26,
    fontWeight: '700',
  },
  userType: {
    color: '#64748b',
    fontSize: 15,
    marginTop: 4,
  },
  infoCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#334155',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  infoText: {
    color: '#e2e8f0',
    fontSize: 16,
    marginLeft: 12,
    flex: 1,
  },
  sectionTitle: {
    color: '#f1f5f9',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  statCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    width: '31%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  statNumber: {
    color: '#f1f5f9',
    fontSize: 22,
    fontWeight: '700',
    marginVertical: 8,
  },
  statLabel: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
  },
  buttonContainer: {
    gap: 12,
  },
  editButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  buttonGradient: {
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  logoutButton: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  logoutButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 18,
    fontWeight: '700',
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    color: '#f1f5f9',
    fontSize: 18,
    textAlign: 'center',
    marginVertical: 20,
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  retryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});