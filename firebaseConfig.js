import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAUaQ0_AgGqRCC21ytFM-jtIlIW2r5seZY",
  authDomain: "jobscheck-94a24.firebaseapp.com",
  projectId: "jobscheck-94a24",
  storageBucket: "jobscheck-94a24.firebasestorage.app",
  messagingSenderId: "947248290183",
  appId: "1:947248290183:web:5a61d7629b0cb041cc5b22",
  measurementId: "G-DSXE9QYRRJ"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);

export default app;
