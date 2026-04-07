// navigation/BuyerTabs.js (or AgencyTabs.js)

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import AgencyHome from '../screens/AgencyHome';
import AgencyOrders from '../screens/AgencyOrders';
import AgencyRates from '../screens/AgencyRates';
import ProfileScreen from '../screens/profile';

const Tab = createBottomTabNavigator();

const BuyerTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: '#888',
        tabBarStyle: {
          backgroundColor: '#121212',
          borderTopColor: '#1e1e1e',
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Orders':
              iconName = focused ? 'list' : 'list-outline';
              break;
            case 'Rates':
              iconName = focused ? 'cash' : 'cash-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'help-circle-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={AgencyHome} />
      <Tab.Screen name="Orders" component={AgencyOrders} />
      <Tab.Screen name="Rates" component={AgencyRates} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export default BuyerTabs;