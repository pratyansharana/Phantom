import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? 'AIzaSyDUs1wPAv49ygYVi1aJ9zdwxXP1Nc8TEeg',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? 'phantom-c41cc.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'phantom-c41cc',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? 'phantom-c41cc.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '452872181456',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '1:452872181456:web:6726eb376d921ceafa70d5',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
