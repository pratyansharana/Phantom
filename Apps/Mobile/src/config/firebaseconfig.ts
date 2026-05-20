import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Replace these with your actual Firebase project config
const firebaseConfig = {
  apiKey: "AIzaSyCufcFJ5bJqzIYaJxapvVRJ1tUrneEBqcw",
  authDomain: "template-ed3eb.firebaseapp.com",
  projectId: "template-ed3eb",
  storageBucket: "template-ed3eb.firebasestorage.app",
  messagingSenderId: "489538761629",
  appId: "1:489538761629:web:6485a0a6fb9f4f68e5b574"
};
// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth with AsyncStorage for persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

export { auth };