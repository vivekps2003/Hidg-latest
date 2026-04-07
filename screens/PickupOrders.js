import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { onSnapshot, collection, query, where, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { format } from 'date-fns';

const { width } = Dimensions.get('window');

export default function PickupOrders({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
        setOrders([]);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const ordersRef = collection(db, 'orders');
    const q = query(
      ordersRef,
      where('pickupAgentId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedOrders = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));

        // Sort by createdAt descending (newest first)
        fetchedOrders.sort((a, b) => {
          const timeA = a.createdAt?.toMillis?.() || 0;
          const timeB = b.createdAt?.toMillis?.() || 0;
          return timeB - timeA;
        });

        setOrders(fetchedOrders);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching pickup orders:', error);
        Alert.alert('Error', 'Failed to load pickup orders. Please try again.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'assigned':
        return '#f59e0b'; // orange
      case 'accepted':
        return '#3b82f6'; // blue
      case 'in_progress':
        return '#8b5cf6'; // purple
      case 'picked':
        return '#14b8a6'; // teal
      case 'completed':
        return '#10b981'; // green
      default:
        return '#64748b';
    }
  };

  const getStatusLabel = (status) => {
    return status
      ? status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')
      : 'Unknown';
  };

  const getNextAction = (status) => {
    switch (status) {
      case 'assigned':
        return { label: 'Accept Pickup', nextStatus: 'accepted' };
      case 'accepted':
        return { label: 'Start Trip', nextStatus: 'in_progress' };
      case 'in_progress':
        return { label: 'Mark as Picked', nextStatus: 'picked' };
      case 'picked':
        return { label: 'Complete Order', nextStatus: 'completed' };
      default:
        return null;
    }
  };

  const updateOrderStatus = async (orderId, nextStatus) => {
    if (!orderId) return;

    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });

      // Optimistic update is handled by onSnapshot
      Alert.alert('Success', `Order status updated to ${getStatusLabel(nextStatus)}`);
    } catch (error) {
      console.error('Error updating order status:', error);
      Alert.alert('Update Failed', 'Could not update order status. Please try again.');
    }
  };

  const handleOrderPress = (order) => {
    navigation.navigate('PickupOrderDetails', { order });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return format(date, 'dd MMM yyyy, hh:mm a');
    } catch {
      return 'N/A';
    }
  };

  const renderOrderCard = (order) => {
    const action = getNextAction(order.status);
    const totalKg = order.totalKg || 0;
    const estimatedAmount = order.estimatedAmount || 0;

    return (
      <TouchableOpacity
        key={order.id}
        style={styles.orderCard}
        onPress={() => handleOrderPress(order)}
        activeOpacity={0.9}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.agencyName}>{order.agencyName || 'Unknown Agency'}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '30' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
              {getStatusLabel(order.status)}
            </Text>
          </View>
        </View>

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Total Weight</Text>
            <Text style={styles.detailValue}>{totalKg} kg</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Est. Amount</Text>
            <Text style={styles.detailValue}>₹{estimatedAmount.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        <Text style={styles.dateText}>Created: {formatDate(order.createdAt)}</Text>

        {action && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation(); // Prevent navigating when tapping button
              updateOrderStatus(order.id, action.nextStatus);
            }}
          >
            <Text style={styles.actionButtonText}>{action.label}</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading pickup orders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Pickup Orders</Text>
        <Text style={styles.headerSubtitle}>Real-time updates from agencies</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {orders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyTitle}>No pickup orders assigned</Text>
            <Text style={styles.emptySubtitle}>
              New orders from agencies will appear here automatically
            </Text>
          </View>
        ) : (
          orders.map(renderOrderCard)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#f1f5f9',
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#94a3b8',
    marginTop: 4,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  orderCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  agencyName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f1f5f9',
    flex: 1,
    paddingRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#e2e8f0',
  },
  dateText: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#94a3b8',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: '80%',
  },
});