// Firebase configuration and initialization
import { initializeApp } from "firebase/app";
import type { FirebaseApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import type { FirebaseStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";
import type { Firestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import type { Analytics } from "firebase/analytics";
import { getAuth, signInAnonymously } from "firebase/auth";
import type { Auth } from "firebase/auth";

// Firebase configuration - same project as backend (sales-9e9b8)
// Add VITE_FIREBASE_API_KEY and VITE_FIREBASE_APP_ID to .env from Firebase Console (sales-9e9b8)
// Fallback to hospitalapp when env not set (admissions Firestore needs sales-9e9b8)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAkjo7wFjRMjyDfssFPVqG-nfoNDfv_jk0",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "hospitalapp-681f1.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "hospitalapp-681f1",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "hospitalapp-681f1.firebasestorage.app",
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || "340060147561",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:340060147561:web:f09f004b0acb873fdc77f8",
  measurementId: (import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string) || "G-X6T5P6YK10",
};

// Check if Firebase is enabled (defaults to true if not set)
const isFirebaseEnabled = (): boolean => {
  const stored = localStorage.getItem('firebase_enabled');
  if (stored === null) {
    return true;
  }
  return stored === 'true';
};

const hasFirebaseConfig = (): boolean => {
  return !!(firebaseConfig.apiKey && firebaseConfig.appId);
};

// Note: Admissions Firestore (pharmacies/one_care/admissions) lives in sales-9e9b8.
// Set VITE_FIREBASE_* in .env for sales-9e9b8 to get real-time admission updates.

// Initialize Firebase only if enabled and config present
let app: FirebaseApp | null = null;
let storage: FirebaseStorage | null = null;
let db: Firestore | null = null;
let analytics: Analytics | null = null;
let auth: Auth | null = null;

if (isFirebaseEnabled() && hasFirebaseConfig()) {
  try {
    app = initializeApp(firebaseConfig);
    storage = getStorage(app);
    db = getFirestore(app);
    analytics = getAnalytics(app);
    auth = getAuth(app);
  } catch (error) {
    console.error('Error initializing Firebase:', error);
  }
}

// Export Firebase services (may be null if disabled)
export { storage, db, analytics, auth };

// Function to get Firebase access token
export const getFirebaseAccessToken = async (): Promise<string | null> => {
  if (!auth) {
    console.warn('Firebase is disabled. Cannot get access token.');
    return null;
  }
  try {
    // Sign in anonymously to get access token
    const userCredential = await signInAnonymously(auth);
    const token = await userCredential.user.getIdToken();
    return token;
  } catch (error) {
    console.error('Error getting Firebase access token:', error);
    return null;
  }
};

// Utility function to check if Firebase is enabled
export const checkFirebaseEnabled = (): boolean => {
  return isFirebaseEnabled();
};

// Utility function to enable/disable Firebase (requires page reload to take effect)
export const setFirebaseEnabled = (enabled: boolean): void => {
  localStorage.setItem('firebase_enabled', enabled.toString());
};

export const firebaseProjectId: string = firebaseConfig.projectId;

export default app;
