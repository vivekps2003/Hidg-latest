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

      </Stack.Navigator>
    </NavigationContainer>
  );
}
