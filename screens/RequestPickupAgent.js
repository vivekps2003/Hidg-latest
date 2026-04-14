// RequestPickupAgent.js
// Agency screen: find nearest pickup agents, set commission/kg, send assignment request

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../firebase';
import {
  collection, query, where, getDocs,
  doc, updateDoc, serverTimestamp,
} from 'firebase/firestore';

// Haversine distance in km
const getDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export default function RequestPickupAgent({ route, navigation }) {
  const { order } = route.params;

  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [commissionPerKg, setCommissionPerKg] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Agency location from auth user doc
  const [agencyCoord, setAgencyCoord] = useState(null);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    try {
      // Get agency location
      const agencyUid = auth.currentUser?.uid;
      const agencySnap = await getDocs(
        query(collection(db, 'users'), where('entityType', '==', 'agency'))
      );
      const agencyDoc = agencySnap.docs.find(d => d.id === agencyUid);
      const agencyData = agencyDoc?.data();
      const aLat = agencyData?.latitude || order.agencyLatitude;
      const aLon = agencyData?.longitude || order.agencyLongitude;
      setAgencyCoord({ latitude: aLat, longitude: aLon });

      // Get all available pickup agents
      const agentsSnap = await getDocs(
        query(
          collection(db, 'users'),
          where('entityType', '==', 'pickup_agent'),
          where('isActive', '==', true)
        )
      );

      const agentsList = agentsSnap.docs.map(d => {
        const data = d.data();
        const dist = getDistance(
          order.sellerLatitude, order.sellerLongitude,
          data.latitude, data.longitude
        );
        return { id: d.id, ...data, distanceKm: dist };
      });

      // Sort by distance to seller
      agentsList.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
      setAgents(agentsList);
    } catch (e) {
      console.error('Fetch agents error:', e);
      Alert.alert('Error', 'Could not load pickup agents.');
    } finally {
      setLoading(false);
    }
  }, [order]);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  const handleAssign = async () => {
    if (!selectedAgent) {
      Alert.alert('Select Agent', 'Please select a pickup agent first.');
      return;
    }
    const commission = parseFloat(commissionPerKg);
    if (isNaN(commission) || commission < 0) {
      Alert.alert('Invalid Commission', 'Enter a valid commission per kg (₹).');
      return;
    }

    const totalCommission = parseFloat((commission * order.totalKg).toFixed(0));

    Alert.alert(
      'Confirm Assignment',
      `Assign to ${selectedAgent.name}?\n\nCommission: ₹${commission}/kg × ${order.totalKg} kg = ₹${totalCommission}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Assign',
          onPress: async () => {
            setAssigning(true);
            try {
              await updateDoc(doc(db, 'orders', order.id), {
                pickupAgentId: selectedAgent.id,
                pickupAgentName: selectedAgent.name || selectedAgent.businessName || 'Agent',
                commissionPerKg: commission,
                totalCommission,
                sellerNetAmount: parseFloat((order.estimatedAmount - totalCommission).toFixed(0)),
                status: 'assigned',
                assignedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
              Alert.alert(
                'Assigned!',
                `${selectedAgent.name} has been assigned. They will receive the pickup request.`,
                [{ text: 'OK', onPress: () => navigation.goBack() }]
              );
            } catch (e) {
              Alert.alert('Error', e.code === 'permission-denied'
                ? 'Permission denied. Check Firestore rules.'
                : 'Could not assign agent. Try again.');
            } finally {
              setAssigning(false);
            }
          },
        },
      ]
    );
  };

  const totalCommission = parseFloat(commissionPerKg) > 0
    ? (parseFloat(commissionPerKg) * order.totalKg).toFixed(0)
    : null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#f1f5f9" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Assign Pickup Agent</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Order Summary */}
        <View style={styles.orderCard}>
          <View style={styles.orderRow}>
            <View>
              <Text style={styles.orderLabel}>Order</Text>
              <Text style={styles.orderId}>#{order.id.slice(-6).toUpperCase()}</Text>
            </View>
            <View style={styles.belowBadge}>
              <Ionicons name="alert-circle-outline" size={13} color="#fbbf24" />
              <Text style={styles.belowBadgeText}>Below Minimum</Text>
            </View>
          </View>
          <View style={styles.orderStats}>
            <View style={styles.orderStat}>
              <Text style={styles.orderStatLabel}>Weight</Text>
              <Text style={styles.orderStatValue}>{order.totalKg} kg</Text>
            </View>
            <View style={styles.orderStatDivider} />
            <View style={styles.orderStat}>
              <Text style={styles.orderStatLabel}>Payout</Text>
              <Text style={[styles.orderStatValue, { color: '#60a5fa' }]}>₹{order.estimatedAmount}</Text>
            </View>
            <View style={styles.orderStatDivider} />
            <View style={styles.orderStat}>
              <Text style={styles.orderStatLabel}>Min Required</Text>
              <Text style={[styles.orderStatValue, { color: '#f87171' }]}>{order.minPickupKg} kg</Text>
            </View>
          </View>
        </View>

        {/* Commission Input */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Set Commission</Text>
          <Text style={styles.commissionDesc}>
            This amount per kg will be paid to the pickup agent from the order payout.
          </Text>
          <View style={styles.commissionRow}>
            <Text style={styles.rupeeSign}>₹</Text>
            <TextInput
              style={styles.commissionInput}
              value={commissionPerKg}
              onChangeText={setCommissionPerKg}
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor="#475569"
            />
            <Text style={styles.perKgLabel}>/ kg</Text>
          </View>
          {totalCommission && (
            <View style={styles.totalCommissionRow}>
              <Ionicons name="calculator-outline" size={14} color="#94a3b8" />
              <Text style={styles.totalCommissionText}>
                Total commission: ₹{totalCommission} for {order.totalKg} kg
              </Text>
            </View>
          )}
        </View>

        {/* Agents List */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Nearest Pickup Agents {agents.length > 0 ? `(${agents.length})` : ''}
          </Text>

          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator color="#2563eb" />
              <Text style={styles.loadingText}>Finding nearby agents...</Text>
            </View>
          ) : agents.length === 0 ? (
            <View style={styles.centered}>
              <Ionicons name="person-outline" size={40} color="#334155" />
              <Text style={styles.emptyText}>No active pickup agents found</Text>
            </View>
          ) : (
            agents.map(agent => {
              const isSelected = selectedAgent?.id === agent.id;
              return (
                <TouchableOpacity
                  key={agent.id}
                  style={[styles.agentCard, isSelected && styles.agentCardSelected]}
                  onPress={() => setSelectedAgent(isSelected ? null : agent)}
                  activeOpacity={0.8}
                >
                  {/* Agent Avatar */}
                  <View style={[styles.agentAvatar, isSelected && { backgroundColor: '#1d4ed8' }]}>
                    <Ionicons name="person" size={20} color={isSelected ? '#fff' : '#94a3b8'} />
                  </View>

                  {/* Agent Info */}
                  <View style={styles.agentInfo}>
                    <Text style={styles.agentName}>{agent.name || 'Pickup Agent'}</Text>
                    <View style={styles.agentMeta}>
                      {agent.distanceKm != null && (
                        <View style={styles.agentMetaItem}>
                          <Ionicons name="location-outline" size={12} color="#64748b" />
                          <Text style={styles.agentMetaText}>
                            {agent.distanceKm.toFixed(1)} km from seller
                          </Text>
                        </View>
                      )}
                      {agent.phone && (
                        <View style={styles.agentMetaItem}>
                          <Ionicons name="call-outline" size={12} color="#64748b" />
                          <Text style={styles.agentMetaText}>{agent.phone}</Text>
                        </View>
                      )}
                    </View>
                    {agent.serviceRadiusKm && (
                      <Text style={styles.agentRadius}>
                        Service radius: {agent.serviceRadiusKm} km
                      </Text>
                    )}
                  </View>

                  {/* Select indicator */}
                  <View style={[styles.selectCircle, isSelected && styles.selectCircleActive]}>
                    {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

      </ScrollView>

      {/* Bottom Assign Button */}
      <View style={styles.bottomBar}>
        {selectedAgent && (
          <Text style={styles.selectedAgentText}>
            Selected: {selectedAgent.name || 'Agent'}
            {selectedAgent.distanceKm != null ? ` · ${selectedAgent.distanceKm.toFixed(1)} km` : ''}
          </Text>
        )}
        <TouchableOpacity
          style={[
            styles.assignBtn,
            (!selectedAgent || assigning) && { opacity: 0.5 },
          ]}
          onPress={handleAssign}
          disabled={!selectedAgent || assigning}
        >
          {assigning ? (
            <ActivityIndicator color="#0f172a" />
          ) : (
            <>
              <Ionicons name="person-add-outline" size={20} color="#0f172a" />
              <Text style={styles.assignBtnText}>Assign Pickup Agent</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#f1f5f9', fontSize: 20, fontWeight: '700' },

  content: { padding: 16, gap: 16, paddingBottom: 140 },

  orderCard: {
    backgroundColor: '#1c1a0f', borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: '#78350f',
  },
  orderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 },
  orderLabel: { color: '#64748b', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  orderId: { color: '#f1f5f9', fontSize: 22, fontWeight: '800', marginTop: 2 },
  belowBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#1c1a0f', borderWidth: 1, borderColor: '#fbbf24',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
  },
  belowBadgeText: { color: '#fbbf24', fontSize: 11, fontWeight: '700' },
  orderStats: { flexDirection: 'row', alignItems: 'center' },
  orderStat: { flex: 1, alignItems: 'center' },
  orderStatLabel: { color: '#64748b', fontSize: 11, marginBottom: 4 },
  orderStatValue: { color: '#f1f5f9', fontSize: 16, fontWeight: '700' },
  orderStatDivider: { width: 1, height: 30, backgroundColor: '#334155' },

  card: {
    backgroundColor: '#1e293b', borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: '#334155',
  },
  sectionTitle: {
    color: '#94a3b8', fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12,
  },

  commissionDesc: { color: '#64748b', fontSize: 13, marginBottom: 14 },
  commissionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rupeeSign: { color: '#f1f5f9', fontSize: 22, fontWeight: '700' },
  commissionInput: {
    flex: 1, backgroundColor: '#0f172a', borderRadius: 12, padding: 14,
    color: '#f1f5f9', fontSize: 20, fontWeight: '700',
    borderWidth: 1, borderColor: '#334155', textAlign: 'center',
  },
  perKgLabel: { color: '#64748b', fontSize: 15 },
  totalCommissionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 10, backgroundColor: '#0f172a', borderRadius: 8,
    padding: 10, borderWidth: 1, borderColor: '#334155',
  },
  totalCommissionText: { color: '#94a3b8', fontSize: 13 },

  centered: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  loadingText: { color: '#64748b', fontSize: 14 },
  emptyText: { color: '#64748b', fontSize: 14 },

  agentCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#0f172a', borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: '#334155',
  },
  agentCardSelected: { borderColor: '#2563eb', backgroundColor: '#0f1f3d' },
  agentAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center',
  },
  agentInfo: { flex: 1 },
  agentName: { color: '#f1f5f9', fontSize: 15, fontWeight: '700', marginBottom: 4 },
  agentMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  agentMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  agentMetaText: { color: '#64748b', fontSize: 12 },
  agentRadius: { color: '#475569', fontSize: 11, marginTop: 4 },
  selectCircle: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: '#334155',
    alignItems: 'center', justifyContent: 'center',
  },
  selectCircleActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, backgroundColor: '#0f172a',
    borderTopWidth: 1, borderTopColor: '#334155', gap: 8,
  },
  selectedAgentText: { color: '#94a3b8', fontSize: 13, textAlign: 'center' },
  assignBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#34d399', borderRadius: 14, paddingVertical: 16,
  },
  assignBtnText: { color: '#0f172a', fontSize: 16, fontWeight: '800' },
});
