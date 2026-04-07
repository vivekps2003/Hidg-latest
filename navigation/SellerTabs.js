import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import SellerHome from '../screens/SellerHome';
import OrdersScreen from '../screens/SellerOrders';
import AnalyticsScreen from '../screens/SellerAnalytics';
import ProfileScreen from '../screens/profile';


const Tab = createBottomTabNavigator();

export default function SellerTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0f172a',
          borderTopColor: '#334155',
          height: 70,
        },
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarIcon: ({ color, size }) => {
          let icon;
          if (route.name === 'Home') icon = 'home';
          if (route.name === 'Orders') icon = 'cube';
          if (route.name === 'Analytics') icon = 'bar-chart';
          if (route.name === 'Profile') icon = 'person';
          return <Ionicons name={icon} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={SellerHome} />
      <Tab.Screen name="Orders" component={OrdersScreen} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
