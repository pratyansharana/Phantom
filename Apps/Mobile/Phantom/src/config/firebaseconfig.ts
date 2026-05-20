import { initializeApp } from 'firebase/app';

import {
  initializeAuth
} from 'firebase/auth';

import {
  getFirestore
} from 'firebase/firestore';

import AsyncStorage from '@react-native-async-storage/async-storage';

const { getReactNativePersistence } = require('@firebase/auth');

const firebaseConfig = {
  apiKey: "AIzaSyDUs1wPAv49ygYVi1aJ9zdwxXP1Nc8TEeg",
  authDomain: "phantom-c41cc.firebaseapp.com",
  projectId: "phantom-c41cc",
  storageBucket: "phantom-c41cc.firebasestorage.app",
  messagingSenderId: "452872181456",
  appId: "1:452872181456:web:6726eb376d921ceafa70d5",
  measurementId: "G-984ETNEXQW"
};

const app = initializeApp(firebaseConfig);

const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

const db = getFirestore(app);

export {
  auth,
  db
};
