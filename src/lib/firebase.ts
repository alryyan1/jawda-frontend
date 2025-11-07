// Firebase configuration and initialization
import { initializeApp, FirebaseApp } from "firebase/app";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAnalytics, Analytics } from "firebase/analytics";
import { getAuth, Auth, signInAnonymously } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAkjo7wFjRMjyDfssFPVqG-nfoNDfv_jk0",
  authDomain: "hospitalapp-681f1.firebaseapp.com",
  projectId: "hospitalapp-681f1",
  storageBucket: "hospitalapp-681f1.firebasestorage.app",
  messagingSenderId: "340060147561",
  appId: "1:340060147561:web:f09f004b0acb873fdc77f8",
  measurementId: "G-X6T5P6YK10"
};

// Check if Firebase is enabled (defaults to true if not set)
const isFirebaseEnabled = (): boolean => {
  const stored = localStorage.getItem('firebase_enabled');
  if (stored === null) {
    // Default to enabled if not set
    return true;
  }
  return stored === 'true';
};

// Initialize Firebase only if enabled
let app: FirebaseApp | null = null;
let storage: FirebaseStorage | null = null;
let db: Firestore | null = null;
let analytics: Analytics | null = null;
let auth: Auth | null = null;

if (isFirebaseEnabled()) {
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

export default app;
