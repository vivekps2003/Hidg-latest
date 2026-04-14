// SellScrap.js - Marketplace view: List of scrap buying agencies with rates
import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { auth, db } from '../firebase';

export default function SellScrap({ navigation }) {
  const [agenciesWithRates, setAgenciesWithRates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAgenciesAndRates = async () => {
      try {
        setLoading(true);

        // 1. Get active agencies
        const agenciesQuery = query(
          collection(db, 'users'),
          where('entityType', '==', 'agency'),
          where('isActive', '==', true)
        );

        const agencySnapshot = await getDocs(agenciesQuery);
        const agencies = agencySnapshot.docs.map(doc => ({
          id: doc.id,           // UID as agency identifier
          ...doc.data(),
        }));

        if (agencies.length === 0) {
          setAgenciesWithRates([]);
          return;
        }

        // 2. Get all scrap rates (we'll filter client-side)
        const ratesSnapshot = await getDocs(collection(db, 'scrap_rates'));
        const allRates = ratesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        // 3. Group rates by agencyId
        const ratesByAgency = {};
        allRates.forEach(rate => {
          if (!ratesByAgency[rate.agencyId]) {
            ratesByAgency[rate.agencyId] = [];
          }
          ratesByAgency[rate.agencyId].push({
            materialName: rate.materialName,
            pricePerKg: Number(rate.pricePerKg) || 0,
            updatedAt: rate.updatedAt,
          });
        });

        // 4. Combine agencies with their rates
        const combined = agencies.map(agency => ({
          ...agency,
          rates: ratesByAgency[agency.id] || [],
        })).filter(agency => agency.rates.length > 0); // optional: hide agencies with no rates

        // Optional: sort by businessName or rating if exists
        combined.sort((a, b) => a.businessName.localeCompare(b.businessName));

        setAgenciesWithRates(combined);
      } catch (error) {
        console.error('Error fetching agencies/rates:', error);
        Alert.alert(
          'Error',
          'Failed to load scrap buyers. Please check your connection and try again.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchAgenciesAndRates();
  }, []);

  const handleSelectAgency = (agency) => {
    navigation.navigate('CreateOrder', { agency });
  };

  const renderAgencyCard = (agency) => {
    return (
      <View key={agency.id} style={styles.agencyCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.agencyName}>{agency.businessName || 'Unnamed Agency'}</Text>
          {agency.rating && (
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={16} color="#fbbf24" />
              <Text style={styles.ratingText}>{agency.rating.toFixed(1)}</Text>
            </View>
          )}
        </View>

        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={16} color="#94a3b8" />
          <Text style={styles.locationText}>
            {agency.location || 'Location not specified'} • {agency.businessCategory || 'Scrap Buyer'}
          </Text>
        </View>

        <View style={styles.ratesContainer}>
          <Text style={styles.ratesTitle}> Current Rates:</Text>
          {agency.rates.length > 0 ? (
            agency.rates.map((rate, index) => (
              <View key={index} style={styles.rateRow}>
                <Text style={styles.materialName}>{rate.materialName}</Text>
                <Text style={styles.priceText}>₹{rate.pricePerKg.toFixed(1)}/kg</Text>
              </View>
            ))
          ) : (
            <Text style={styles.noRatesText}>No rates listed yet</Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.selectButton}
          onPress={() => handleSelectAgency(agency)}
        >
          <Text style={styles.selectButtonText}>Sell to this Agency</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Finding nearby scrap buyers...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#f1f5f9" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sell Your Scrap</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {agenciesWithRates.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="storefront-outline" size={64} color="#475569" />
            <Text style={styles.emptyText}>No agencies available near you</Text>
            <Text style={styles.emptySubText}>
              Check back later or try updating your location
            </Text>
          </View>
        ) : (
          agenciesWithRates.map(renderAgencyCard)
        )}

        <View style={{ height: 100 }} />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    color: '#f1f5f9',
    fontSize: 22,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 16,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 120,
  },
  emptyText: {
    color: '#e2e8f0',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 8,
  },
  emptySubText: {
    color: '#94a3b8',
    fontSize: 15,
    textAlign: 'center',
  },
  agencyCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  agencyName: {
    color: '#f1f5f9',
    fontSize: 19,
    fontWeight: '700',
    flex: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d3748',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    color: '#fbbf24',
    fontWeight: '600',
    marginLeft: 4,
    fontSize: 14,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationText: {
    color: '#94a3b8',
    fontSize: 14,
    marginLeft: 6,
    flex: 1,
  },
  ratesContainer: {
    marginTop: 4,
    marginBottom: 16,
  },
  ratesTitle: {
    color: '#cbd5e1',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  rateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  materialName: {
    color: '#e2e8f0',
    fontSize: 15,
  },
  priceText: {
    color: '#60a5fa',
    fontSize: 15,
    fontWeight: '600',
  },
  noRatesText: {
    color: '#94a3b8',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
  selectButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  selectButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});