import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Screens
import PickupOrders from '../screens/PickupOrders';
import ProfileScreen from '../screens/profile';
import PickupMapTab from '../screens/PickupMapTab';
import PickupOffers from '../screens/PickupOffers';

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

        tabBarIcon: ({ focused, color, size }) => {
          let icon;
          if (route.name === 'My Pickups') icon = focused ? 'list' : 'list-outline';
          else if (route.name === 'Offers') icon = focused ? 'pricetag' : 'pricetag-outline';
          else if (route.name === 'Map') icon = focused ? 'map' : 'map-outline';
          else if (route.name === 'Profile') icon = focused ? 'person' : 'person-outline';
          else icon = 'help-circle';
          return <Ionicons name={icon} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="My Pickups" component={PickupOrders} />
      <Tab.Screen name="Offers" component={PickupOffers} />
      <Tab.Screen name="Map" component={PickupMapTab} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}