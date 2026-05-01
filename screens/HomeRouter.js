import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

export default function HomeRouter({ navigation }) {

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {

      // 1️⃣ Not logged in → go to Login
      if (!user) {
        navigation.replace('Login');
        return;
      }

      try {
        // 2️⃣ Fetch user profile
        const userRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
          // corrupted / deleted user profile
          navigation.replace('Login');
          return;
        }

        const { entityType } = snap.data();

        // 3️⃣ ROLE → ROOT TAB NAVIGATOR
        switch (entityType) {

          case 'scrap_center':
            navigation.replace('UnifiedTabs');
            break;

          case 'individual':
          case 'shop':
          case 'mall':
          case 'supermarket':
          case 'industry':
            navigation.replace('SellerTabs');
            break;

          case 'agency':
            navigation.replace('BuyerTabs');
            break;
         case 'pickup_agent':
            navigation.replace('PickupTabs');
            break;

          case 'admin':
            navigation.replace('AdminTabs');
            break;

          default:
            // safety fallback
            navigation.replace('Login');
        }

      } catch (error) {
        console.error('HomeRouter error:', error);
        navigation.replace('Login');
      }
      
    });

    return unsubscribe;
  }, []);

  // 4️⃣ Loader while routing
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0f172a',
      }}
    >
      <ActivityIndicator size="large" color="#2563eb" />
    </View>
  );
}
