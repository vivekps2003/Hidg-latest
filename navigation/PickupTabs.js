import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import PickupOrders from '../screens/PickupOrders';
import ProfileScreen from '../screens/profile';
import PickupMapTab from '../screens/PickupMapTab';
import PickupOffers from '../screens/PickupOffers';
import AvailableOrders from '../screens/AvailableOrders';

const Tab = createBottomTabNavigator();

export default function PickupTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#BBF7D0',
          borderTopWidth: 1.5,
          height: 70,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarActiveTintColor: '#15803D',
        tabBarInactiveTintColor: '#A8A29E',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            'Available':  focused ? 'search'    : 'search-outline',
            'My Pickups': focused ? 'list'      : 'list-outline',
            'Map':        focused ? 'map'        : 'map-outline',
            'Profile':    focused ? 'person'     : 'person-outline',
          };
          return <Ionicons name={icons[route.name] || 'help-circle'} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Available" component={AvailableOrders} />
      <Tab.Screen name="My Pickups" component={PickupOrders} />
      <Tab.Screen name="Map"        component={PickupMapTab} />
      <Tab.Screen name="Profile"    component={ProfileScreen} />
    </Tab.Navigator>
  );
}
