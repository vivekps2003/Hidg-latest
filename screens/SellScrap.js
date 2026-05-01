import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { C, S, R } from '../theme';

export default function SellScrap({ navigation }) {
  const [agencies, setAgencies] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const agSnap = await getDocs(query(collection(db, 'users'), where('entityType', '==', 'agency'), where('isActive', '==', true)));
        const ratesSnap = await getDocs(collection(db, 'scrap_rates'));
        const ratesByAgency = {};
        ratesSnap.docs.forEach(d => {
          const r = d.data();
          if (!ratesByAgency[r.agencyId]) ratesByAgency[r.agencyId] = [];
          ratesByAgency[r.agencyId].push({ materialName: r.materialName, pricePerKg: Number(r.pricePerKg) || 0 });
        });
        const list = agSnap.docs
          .map(d => ({ id: d.id, ...d.data(), rates: ratesByAgency[d.id] || [] }))
          .filter(a => a.rates.length > 0)
          .sort((a, b) => (a.businessName || '').localeCompare(b.businessName || ''));
        setAgencies(list);
        setFiltered(list);
      } catch (e) {
        Alert.alert('Error', 'Failed to load agencies.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  useEffect(() => {
    if (!search.trim()) { setFiltered(agencies); return; }
    const q = search.toLowerCase();
    setFiltered(agencies.filter(a =>
      a.businessName?.toLowerCase().includes(q) ||
      a.location?.toLowerCase().includes(q) ||
      a.rates?.some(r => r.materialName?.toLowerCase().includes(q))
    ));
  }, [search, agencies]);

  if (loading) return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <View style={styles.centered}><ActivityIndicator size="large" color={C.primary} /><Text style={styles.loadingText}>Finding scrap buyers...</Text></View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sell Your Scrap</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={C.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search agency or material..."
          placeholderTextColor={C.textMuted}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={C.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIcon}><Ionicons name="storefront-outline" size={36} color={C.textMuted} /></View>
            <Text style={styles.emptyTitle}>No agencies found</Text>
            <Text style={styles.emptySub}>Try a different search or check back later.</Text>
          </View>
        ) : (
          filtered.map(agency => (
            <View key={agency.id} style={styles.card}>
              {/* Card Header */}
              <View style={styles.cardHeader}>
                <View style={styles.agencyIconBox}>
                  <Text style={styles.agencyInitial}>{(agency.businessName || 'A').charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.agencyName}>{agency.businessName || 'Agency'}</Text>
                  <View style={styles.locationRow}>
                    <Ionicons name="location-outline" size={12} color={C.textMuted} />
                    <Text style={styles.locationText}>{agency.location || 'Location not specified'}</Text>
                  </View>
                </View>
                {agency.minPickupKg > 0 && (
                  <View style={styles.minBadge}>
                    <Text style={styles.minBadgeText}>Min {agency.minPickupKg} kg</Text>
                  </View>
                )}
              </View>

              {/* Category */}
              {agency.businessCategory ? (
                <View style={styles.categoryChip}>
                  <Ionicons name="pricetag-outline" size={12} color={C.primary} />
                  <Text style={styles.categoryText}>{agency.businessCategory}</Text>
                </View>
              ) : null}

              {/* Rates */}
              <View style={styles.ratesBox}>
                <Text style={styles.ratesTitle}>Current Buying Rates</Text>
                {agency.rates.slice(0, 5).map((rate, i) => (
                  <View key={i} style={styles.rateRow}>
                    <View style={styles.rateDot} />
                    <Text style={styles.rateMat}>{rate.materialName}</Text>
                    <Text style={styles.ratePrice}>₹{rate.pricePerKg.toFixed(1)} / kg</Text>
                  </View>
                ))}
                {agency.rates.length > 5 && (
                  <Text style={styles.moreRates}>+{agency.rates.length - 5} more materials</Text>
                )}
              </View>

              {/* CTA */}
              <TouchableOpacity
                style={styles.sellBtn}
                onPress={() => navigation.navigate('CreateOrder', { agency })}
                activeOpacity={0.85}
              >
                <Ionicons name="arrow-forward-circle-outline" size={18} color="#fff" />
                <Text style={styles.sellBtnText}>Sell to this Agency</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: C.textMuted, fontSize: 15 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.textPrimary },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, margin: 16, borderRadius: R.lg,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: C.border, ...S.card,
  },
  searchInput: { flex: 1, fontSize: 14, color: C.textPrimary },

  scroll: { paddingHorizontal: 16, paddingBottom: 40, gap: 16 },

  emptyBox: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.textPrimary },
  emptySub: { fontSize: 14, color: C.textMuted, textAlign: 'center' },

  card: { backgroundColor: C.surface, borderRadius: R.xl, padding: 16, borderWidth: 1, borderColor: C.border, ...S.cardMd },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  agencyIconBox: { width: 46, height: 46, borderRadius: 14, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center' },
  agencyInitial: { fontSize: 20, fontWeight: '800', color: C.primary },
  agencyName: { fontSize: 16, fontWeight: '700', color: C.textPrimary, marginBottom: 3 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locationText: { fontSize: 12, color: C.textMuted },
  minBadge: { backgroundColor: C.warningLight, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: C.warningBorder },
  minBadgeText: { fontSize: 11, color: C.warning, fontWeight: '600' },

  categoryChip: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: C.primaryLight, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 12 },
  categoryText: { fontSize: 11, color: C.primary, fontWeight: '600' },

  ratesBox: { backgroundColor: C.surfaceAlt, borderRadius: R.md, padding: 12, marginBottom: 14 },
  ratesTitle: { fontSize: 11, fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 7 },
  rateDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.primary },
  rateMat: { flex: 1, fontSize: 13, color: C.textSecondary },
  ratePrice: { fontSize: 13, fontWeight: '700', color: C.primary },
  moreRates: { fontSize: 12, color: C.textMuted, fontStyle: 'italic', marginTop: 4 },

  sellBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: C.primary, borderRadius: R.lg, paddingVertical: 13, ...S.btn,
  },
  sellBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
