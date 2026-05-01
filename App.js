import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ErrorBoundary from './components/ErrorBoundary';
import OfflineBanner from './components/OfflineBanner';

import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeRouter from './screens/HomeRouter';

// Role-based tab navigators
import SellerTabs from './navigation/SellerTabs';
import BuyerTabs from './navigation/BuyerTabs';
import UnifiedTabs from './navigation/UnifiedTabs';
import SellScrap from './screens/SellScrap';
import AgencyHome from './screens/AgencyHome';
import CreateOrder from './screens/CreateOrder';
import PickupTabs from './navigation/PickupTabs';
import OrderTracking from './screens/OrderTracking';
import PickupOrderDetails from './screens/PickupOrderDetails';
import PickupMapScreen from './screens/PickupMapScreen';
import RequestPickupAgent from './screens/RequestPickupAgent';
import PickupOffers from './screens/PickupOffers';
import AdminTabs from './navigation/AdminTabs';
import PaymentScreen from './screens/PaymentScreen';
import WeightVerificationScreen from './screens/WeightVerificationScreen';
import SellerVerificationScreen from './screens/SellerVerificationScreen';
import AdminPaymentDistribution from './screens/AdminPaymentDistribution';
import AvailableOrders from './screens/AvailableOrders';
import PickupOffersForSeller from './screens/PickupOffersForSeller';
import OrderDebugScreen from './screens/OrderDebugScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import AccountDebugScreen from './screens/AccountDebugScreen';
import TermsAndConditionsScreen from './screens/TermsAndConditionsScreen';
import PrivacyPolicyScreen from './screens/PrivacyPolicyScreen';
import SupportScreen from './screens/SupportScreen';
import ComplaintScreen from './screens/ComplaintScreen';
import AdminSupportTicketsScreen from './screens/AdminSupportTicketsScreen';
import AdminComplaintsScreen from './screens/AdminComplaintsScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <ErrorBoundary>
      <OfflineBanner />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
        {/* Auth */}
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />

        {/* Decision gate */}
        <Stack.Screen name="HomeRouter" component={HomeRouter} />

        {/* Role roots (ONLY navigators here) */}
        <Stack.Screen name="SellerTabs" component={SellerTabs} />
        <Stack.Screen name="BuyerTabs" component={BuyerTabs} />
        <Stack.Screen name="UnifiedTabs" component={UnifiedTabs} />
        <Stack.Screen name="SellScrap" component={SellScrap} />
        <Stack.Screen name="AgencyHome" component={BuyerTabs} />
        <Stack.Screen name="CreateOrder" component={CreateOrder} />

        <Stack.Screen name="PickupTabs" component={PickupTabs} />
        <Stack.Screen name="OrderTracking" component={OrderTracking} />
        <Stack.Screen name="PickupOrderDetails" component={PickupOrderDetails} />
        <Stack.Screen name="PickupMapScreen" component={PickupMapScreen} />
        <Stack.Screen name="RequestPickupAgent" component={RequestPickupAgent} />
        <Stack.Screen name="PickupOffers" component={PickupOffers} />
        <Stack.Screen name="AdminTabs" component={AdminTabs} />
        <Stack.Screen name="PaymentScreen" component={PaymentScreen} />
        <Stack.Screen name="WeightVerificationScreen" component={WeightVerificationScreen} />
        <Stack.Screen name="SellerVerificationScreen" component={SellerVerificationScreen} />
        <Stack.Screen name="AdminPaymentDistribution" component={AdminPaymentDistribution} />
        <Stack.Screen name="AvailableOrders" component={AvailableOrders} />
        <Stack.Screen name="PickupOffersForSeller" component={PickupOffersForSeller} />
        <Stack.Screen name="OrderDebugScreen" component={OrderDebugScreen} />
        <Stack.Screen name="NotificationsScreen" component={NotificationsScreen} />
        <Stack.Screen name="AccountDebugScreen" component={AccountDebugScreen} />
        <Stack.Screen name="TermsAndConditionsScreen" component={TermsAndConditionsScreen} />
        <Stack.Screen name="PrivacyPolicyScreen" component={PrivacyPolicyScreen} />
        <Stack.Screen name="SupportScreen" component={SupportScreen} />
        <Stack.Screen name="ComplaintScreen" component={ComplaintScreen} />
        <Stack.Screen name="AdminSupportTicketsScreen" component={AdminSupportTicketsScreen} />
        <Stack.Screen name="AdminComplaintsScreen" component={AdminComplaintsScreen} />

      </Stack.Navigator>
    </NavigationContainer>
    </ErrorBoundary>
  );
}
