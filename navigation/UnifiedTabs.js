// navigation/UnifiedTabs.js

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

// Screens
import UnifiedHome from '../screens/Unifiedhome';
import UnifiedOrders from '../screens/UnifiedOrders';
import UnifiedAnalytics from '../screens/UnifiedAnalytics';
import ProfileScreen from '../screens/profile';

const Tab = createBottomTabNavigator();

export default function UnifiedTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0f172a',
          borderTopColor: '#334155',
          borderTopWidth: 1,
          height: 68,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarIcon: ({ color, size }) => {
          if (route.name === 'Home') {
            return <Ionicons name="home" size={size} color={color} />;
          }
          if (route.name === 'Orders') {
            return (
              <MaterialCommunityIcons
                name="truck-fast"
                size={size}
                color={color}
              />
            );
          }
          if (route.name === 'Analytics') {
            return (
              <Ionicons
                name="stats-chart"
                size={size}
                color={color}
              />
            );
          }
          if (route.name === 'Profile') {
            return <Ionicons name="person" size={size} color={color} />;
          }
        },
      })}
    >
      <Tab.Screen name="Home" component={UnifiedHome} />
      <Tab.Screen name="Orders" component={UnifiedOrders} />
      <Tab.Screen name="Analytics" component={UnifiedAnalytics} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
