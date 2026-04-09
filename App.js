import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

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

const Stack = createNativeStackNavigator();

export default function App() {
  return (
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

      </Stack.Navigator>
    </NavigationContainer>
  );
}
