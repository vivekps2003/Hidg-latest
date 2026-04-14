import { initializeApp } from "firebase/app";
import {
  initializeAuth,
  getReactNativePersistence
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyAnWGY9mN9PvPlNeHxGQXvc40igYj42MJs",
  authDomain: "myauthapp-cb466.firebaseapp.com",
  projectId: "myauthapp-cb466",
  storageBucket: "myauthapp-cb466.firebasestorage.app",
  messagingSenderId: "562177144654",
  appId: "1:562177144654:web:4eb163b48da147e475d01f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// ✅ AUTH (with persistence)
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

// ✅ FIRESTORE (THIS WAS MISSING)
export const db = getFirestore(app);
