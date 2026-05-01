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
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#FDE68A',
          borderTopWidth: 1.5,
          height: 70,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarActiveTintColor: '#D97706',
        tabBarInactiveTintColor: '#A8A29E',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Home:    focused ? 'home'         : 'home-outline',
            Orders:  focused ? 'list'         : 'list-outline',
            Rates:   focused ? 'pricetag'     : 'pricetag-outline',
            Profile: focused ? 'person'       : 'person-outline',
          };
          return <Ionicons name={icons[route.name] || 'help-circle-outline'} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home"    component={AgencyHome} />
      <Tab.Screen name="Orders"  component={AgencyOrders} />
      <Tab.Screen name="Rates"   component={AgencyRates} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export default BuyerTabs;
