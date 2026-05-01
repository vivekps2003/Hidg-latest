import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import AdminDashboard from '../screens/AdminDashboard';
import AdminUsers from '../screens/AdminUsers';
import AdminOrders from '../screens/AdminOrders';
import AdminKYC from '../screens/AdminKYC';
import AdminSupportTicketsScreen from '../screens/AdminSupportTicketsScreen';
import AdminComplaintsScreen from '../screens/AdminComplaintsScreen';

const Tab = createBottomTabNavigator();

export default function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E7EB',
          borderTopWidth: 1,
          height: 65,
          paddingBottom: 10,
          paddingTop: 8,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
        },
        tabBarActiveTintColor: '#4F46E5',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarLabelStyle: { 
          fontSize: 10, 
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Dashboard: focused ? 'grid'         : 'grid-outline',
            Users:     focused ? 'people'        : 'people-outline',
            Orders:    focused ? 'cube'          : 'cube-outline',
            Support:   focused ? 'help-circle'   : 'help-circle-outline',
            Complaints: focused ? 'alert-circle' : 'alert-circle-outline',
          };
          return <Ionicons name={icons[route.name] || 'help-circle'} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={AdminDashboard} />
      <Tab.Screen name="Users"     component={AdminUsers} />
      <Tab.Screen name="Orders"    component={AdminOrders} />
      <Tab.Screen name="Support"   component={AdminSupportTicketsScreen} />
      <Tab.Screen name="Complaints" component={AdminComplaintsScreen} />
    </Tab.Navigator>
  );
}
