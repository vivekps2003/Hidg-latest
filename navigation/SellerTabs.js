import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import SellerHome from '../screens/SellerHome';
import OrdersScreen from '../screens/SellerOrders';
import AnalyticsScreen from '../screens/SellerAnalytics';
import ProfileScreen from '../screens/profile';
import ScanWaste from '../screens/ScanWaste';


const Tab = createBottomTabNavigator();

export default function SellerTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E2E8F0',
          borderTopWidth: 1,
          height: 70,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ focused, color, size }) => {
          let icon;
          if (route.name === 'Home') icon = focused ? 'home' : 'home-outline';
          if (route.name === 'Scan') icon = focused ? 'scan-circle' : 'scan-circle-outline';
          if (route.name === 'Orders') icon = focused ? 'cube' : 'cube-outline';
          if (route.name === 'Analytics') icon = focused ? 'bar-chart' : 'bar-chart-outline';
          if (route.name === 'Profile') icon = focused ? 'person' : 'person-outline';
          return <Ionicons name={icon} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={SellerHome} />
      <Tab.Screen
        name="Scan"
        component={ScanWaste}
        options={{
          tabBarLabel: 'AI Scan',
          tabBarActiveTintColor: '#4ade80',
        }}
      />
      <Tab.Screen name="Orders" component={OrdersScreen} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
