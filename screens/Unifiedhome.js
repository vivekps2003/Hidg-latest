import { View, Text, TouchableOpacity, ScrollView } from 'react-native';

export default function Unifiedhome() {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#0f172a', padding: 20 }}>

      {/* Header */}
      <View style={{ marginBottom: 24 }}>
        <Text style={{ color: '#e5e7eb', fontSize: 22, fontWeight: '700' }}>
          Scrap Center Dashboard ♻️
        </Text>
        <Text style={{ color: '#94a3b8', marginTop: 4 }}>
          Buy from sellers • Sell to agencies
        </Text>
      </View>

      {/* Buy Section */}
      <View style={{ marginBottom: 30 }}>
        <Text style={{ color: '#22c55e', fontSize: 18, fontWeight: '800' }}>
          Buying Scrap
        </Text>

        <TouchableOpacity
          style={{
            backgroundColor: '#16a34a',
            padding: 16,
            borderRadius: 14,
            alignItems: 'center',
            marginTop: 12,
          }}
        >
          <Text style={{ color: '#022c22', fontSize: 16, fontWeight: '800' }}>
            View Seller Requests
          </Text>
        </TouchableOpacity>

        <Text style={{ color: '#94a3b8', marginTop: 12 }}>
          • Paper – 250kg pending
        </Text>
        <Text style={{ color: '#94a3b8' }}>
          • Iron – 500kg pending
        </Text>
      </View>

      {/* Sell Section */}
      <View>
        <Text style={{ color: '#38bdf8', fontSize: 18, fontWeight: '800' }}>
          Selling Scrap
        </Text>

        <TouchableOpacity
          style={{
            backgroundColor: '#0284c7',
            padding: 16,
            borderRadius: 14,
            alignItems: 'center',
            marginTop: 12,
          }}
        >
          <Text style={{ color: '#022c22', fontSize: 16, fontWeight: '800' }}>
            Sell to Recycling Agencies
          </Text>
        </TouchableOpacity>

        <Text style={{ color: '#94a3b8', marginTop: 12 }}>
          • Stock: Paper – 1.2 ton
        </Text>
        <Text style={{ color: '#94a3b8' }}>
          • Stock: Plastic – 600kg
        </Text>
      </View>

    </ScrollView>
  );
}
