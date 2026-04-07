import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Screens
import PickupOrders from '../screens/PickupOrders';
import ProfileScreen from '../screens/profile';

const Tab = createBottomTabNavigator();

export default function PickupTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,

        // Dark theme (consistent with your app)
        tabBarStyle: {
          backgroundColor: '#0f172a',
          borderTopColor: '#334155',
          height: 70,
          paddingBottom: 6,
        },

        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#94a3b8',

        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginBottom: 4,
        },

        tabBarIcon: ({ color, size }) => {
          let icon;

          if (route.name === 'Orders') icon = 'list';
          else if (route.name === 'Profile') icon = 'person';
          else icon = 'help-circle';

          return <Ionicons name={icon} size={size} color={color} />;
        },
      })}
    >
      {/* Pickup Orders */}
      <Tab.Screen name="Orders" component={PickupOrders} />

      {/* Profile */}
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}