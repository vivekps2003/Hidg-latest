import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, SafeAreaView,
  StatusBar, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore';
import { C, S, R } from '../theme';

const NOTIFICATION_TYPES = {
  order_accepted: { icon: 'checkmark-circle', color: '#10b981', title: 'Order Accepted' },
  order_rejected: { icon: 'close-circle', color: '#ef4444', title: 'Order Rejected' },
  pickup_assigned: { icon: 'bicycle', color: '#8b5cf6', title: 'Pickup Assigned' },
  pickup_started: { icon: 'car', color: '#3b82f6', title: 'Pickup Started' },
  pickup_completed: { icon: 'cube', color: '#10b981', title: 'Pickup Completed' },
  weight_verified: { icon: 'scale', color: '#f59e0b', title: 'Weight Verified' },
  weight_accepted: { icon: 'checkmark-done', color: '#10b981', title: 'Weight Accepted' },
  visit_requested: { icon: 'location', color: '#ef4444', title: 'Visit Requested' },
  payment_received: { icon: 'wallet', color: '#06b6d4', title: 'Payment Received' },
  payment_distributed: { icon: 'cash', color: '#10b981', title: 'Payment Distributed' },
  order_completed: { icon: 'ribbon', color: '#10b981', title: 'Order Completed' },
  new_order: { icon: 'document-text', color: '#3b82f6', title: 'New Order' },
  pickup_offer: { icon: 'people', color: '#8b5cf6', title: 'Pickup Offer' },
};

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setLoading(false); return; }

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', uid)
    );

    const unsub = onSnapshot(q, snap => {
      // Sort in memory instead of in query
      const notifs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      notifs.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime; // desc order (newest first)
      });
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);
      setLoading(false);
    }, err => {
      console.error('Notification error:', err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const markAsRead = async (notifId) => {
    try {
      await updateDoc(doc(db, 'notifications', notifId), { read: true });
    } catch (err) {
      console.error('Mark read error:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unread = notifications.filter(n => !n.read);
      await Promise.all(unread.map(n => updateDoc(doc(db, 'notifications', n.id), { read: true })));
      Alert.alert('Success', 'All notifications marked as read');
    } catch (err) {
      Alert.alert('Error', 'Failed to mark all as read');
    }
  };

  const handleNotificationPress = (notif) => {
    markAsRead(notif.id);
    
    // Navigate based on notification type
    if (notif.orderId) {
      navigation.navigate('OrderTracking', { order: { id: notif.orderId } });
    }
  };

  const renderNotification = ({ item }) => {
    const config = NOTIFICATION_TYPES[item.type] || { icon: 'notifications', color: C.primary, title: 'Notification' };
    const timeStr = item.createdAt?.toDate?.()?.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    }) ?? 'Just now';

    return (
      <TouchableOpacity
        style={[styles.notifCard, !item.read && styles.notifCardUnread]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconCircle, { backgroundColor: config.color + '20' }]}>
          <Ionicons name={config.icon} size={20} color={config.color} />
        </View>
        
        <View style={styles.notifContent}>
          <View style={styles.notifHeader}>
            <Text style={styles.notifTitle}>{config.title}</Text>
            {!item.read && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.notifMessage}>{item.message}</Text>
          <Text style={styles.notifTime}>{timeStr}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={C.textPrimary} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <Text style={styles.headerSub}>{unreadCount} unread</Text>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllAsRead} style={styles.markAllBtn}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
        {unreadCount === 0 && <View style={{ width: 40 }} />}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.centered}>
          <View style={styles.emptyIcon}>
            <Ionicons name="notifications-off-outline" size={40} color={C.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>No Notifications</Text>
          <Text style={styles.emptySub}>You're all caught up!</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  headerSub: { fontSize: 12, color: C.primary, marginTop: 2 },
  markAllBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  markAllText: { fontSize: 13, color: C.primary, fontWeight: '600' },

  list: { padding: 16, gap: 10, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
  loadingText: { color: C.textMuted, fontSize: 15 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.textPrimary },
  emptySub: { fontSize: 14, color: C.textMuted, textAlign: 'center' },

  notifCard: {
    flexDirection: 'row', backgroundColor: C.surface, borderRadius: R.lg,
    padding: 14, borderWidth: 1, borderColor: C.border, ...S.card,
  },
  notifCardUnread: { backgroundColor: C.primaryLight, borderColor: C.primary },
  
  iconCircle: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  
  notifContent: { flex: 1 },
  notifHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  notifTitle: { fontSize: 15, fontWeight: '700', color: C.textPrimary },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.primary },
  notifMessage: { fontSize: 14, color: C.textSecondary, marginBottom: 6, lineHeight: 20 },
  notifTime: { fontSize: 12, color: C.textMuted },
});
