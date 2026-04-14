import { View, Text, TouchableOpacity, ScrollView } from 'react-native';

export default function BuyerHome() {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#0f172a', padding: 20 }}>

      {/* Header */}
      <View style={{ marginBottom: 24 }}>
        <Text style={{ color: '#e5e7eb', fontSize: 22, fontWeight: '700' }}>
          Buyer Dashboard 🏭
        </Text>
        <Text style={{ color: '#94a3b8', marginTop: 4 }}>
          Recycling Agency / Buyer
        </Text>
      </View>

      {/* Primary Action */}
      <TouchableOpacity
        style={{
          backgroundColor: '#38bdf8',
          padding: 18,
          borderRadius: 14,
          alignItems: 'center',
          marginBottom: 30,
        }}
      >
        <Text style={{ color: '#022c22', fontSize: 18, fontWeight: '800' }}>
          View Scrap Requests
        </Text>
      </TouchableOpacity>

      {/* Incoming Requests */}
      <View style={{ marginBottom: 24 }}>
        <Text style={{ color: '#e5e7eb', fontSize: 18, fontWeight: '700' }}>
          Incoming Requests
        </Text>

        <View style={{ marginTop: 12 }}>
          <Text style={{ color: '#cbd5f5' }}>
            • Paper – 120kg – Thrissur
          </Text>
          <Text style={{ color: '#cbd5f5' }}>
            • Plastic – 80kg – Ernakulam
          </Text>
          <Text style={{ color: '#cbd5f5' }}>
            • Iron – 300kg – Chalakudy
          </Text>
        </View>
      </View>

      {/* Buyer Actions */}
      <View>
        <Text style={{ color: '#e5e7eb', fontSize: 18, fontWeight: '700' }}>
          Buyer Tools
        </Text>

        <View style={{ marginTop: 12 }}>
          <Text style={{ color: '#94a3b8' }}>• Manage pickup vehicles</Text>
          <Text style={{ color: '#94a3b8' }}>• Update scrap prices</Text>
          <Text style={{ color: '#94a3b8' }}>• View completed deals</Text>
        </View>
      </View>

    </ScrollView>
  );
}
