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

// Available Firebase project configurations
const configs = {
  sales: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBivFl3oyBtjUOCUhycPW51P_2GzQ7E2Jw",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "sales-9e9b8.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "sales-9e9b8",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "sales-9e9b8.firebasestorage.app",
    messagingSenderId: "849598643135", // Taken from appId parts
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:849598643135:web:e866e665a0eb7acbafff0a",
  },
  hospital: {
    apiKey: "AIzaSyAkjo7wFjRMjyDfssFPVqG-nfoNDfv_jk0",
    authDomain: "hospitalapp-681f1.firebaseapp.com",
    projectId: "hospitalapp-681f1",
    storageBucket: "hospitalapp-681f1.firebasestorage.app",
    messagingSenderId: "340060147561",
    appId: "1:340060147561:web:f09f004b0acb873fdc77f8",
    measurementId: "G-X6T5P6YK10",
  }
};

/**
 * Gets the current Firebase project target from localStorage.
 * Defaults to 'sales' if not set.
 */
export const getFirebaseUploadTarget = (): 'sales' | 'hospital' | 'both' => {
  const target = localStorage.getItem('firebase_upload_target');
  if (target === 'both') return 'both';
  return (target === 'hospital') ? 'hospital' : 'sales';
};

/**
 * Sets the Firebase project target in localStorage.
 * Requires page reload to take effect for the active connection.
 */
export const setFirebaseUploadTarget = (target: 'sales' | 'hospital' | 'both'): void => {
  localStorage.setItem('firebase_upload_target', target);
};

/**
 * Gets the dedicated Lab-to-Lab Firebase source from localStorage.
 * Defaults to 'sales' if not set.
 */
export const getLabToLabFirebaseSource = (): 'sales' | 'hospital' => {
  const source = localStorage.getItem('lab_to_lab_firebase_source');
  return (source === 'hospital') ? 'hospital' : 'sales';
};

/**
 * Sets the dedicated Lab-to-Lab Firebase source in localStorage.
 */
export const setLabToLabFirebaseSource = (source: 'sales' | 'hospital'): void => {
  localStorage.setItem('lab_to_lab_firebase_source', source);
};

// Select configuration based on setting
const activeTarget = getFirebaseUploadTarget();
const primaryConfigTarget = (activeTarget === 'both') ? 'sales' : activeTarget;
const firebaseConfig = configs[primaryConfigTarget];

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

// Secondary instances for "both" mode
let secondaryStorage: FirebaseStorage | null = null;
let secondaryDb: Firestore | null = null;

if (isFirebaseEnabled() && hasFirebaseConfig()) {
  try {
    app = initializeApp(firebaseConfig);
    storage = getStorage(app);
    db = getFirestore(app);
    analytics = getAnalytics(app);
    auth = getAuth(app);

    // Initialize secondary if mode is "both"
    if (activeTarget === 'both') {
      const secondaryConfig = configs.hospital; // Default secondary is hospital if primary is sales
      const secondaryApp = initializeApp(secondaryConfig, "secondary");
      secondaryStorage = getStorage(secondaryApp);
      secondaryDb = getFirestore(secondaryApp);
      console.log(`[Firebase] Initialized secondary connection to: ${secondaryConfig.projectId}`);
    }
  } catch (error) {
    console.error('Error initializing Firebase:', error);
  }
}

// Dedicated Lab-to-Lab instances
let labToLabDb: Firestore | null = null;
let labToLabStorage: FirebaseStorage | null = null;

if (isFirebaseEnabled()) {
  const labSource = getLabToLabFirebaseSource();
  console.log(`[Firebase] Initializing Lab-to-Lab with source: ${labSource}`);
  
  if (labSource === primaryConfigTarget && db && storage) {
    console.log(`[Firebase] Lab-to-Lab reusing primary connection (${primaryConfigTarget})`);
    labToLabDb = db;
    labToLabStorage = storage;
  } else if (activeTarget === 'both' && labSource === 'hospital' && secondaryDb && secondaryStorage) {
    console.log(`[Firebase] Lab-to-Lab reusing secondary connection (hospital)`);
    labToLabDb = secondaryDb;
    labToLabStorage = secondaryStorage;
  } else {
    try {
      console.log(`[Firebase] Lab-to-Lab creating separate connection to: ${configs[labSource].projectId}`);
      const labApp = initializeApp(configs[labSource], "labToLab");
      labToLabDb = getFirestore(labApp);
      labToLabStorage = getStorage(labApp);
    } catch (error) {
      console.error('Error initializing Lab-to-Lab Firebase:', error);
    }
  }
}

// Export Firebase services (may be null if disabled)
export { storage, db, analytics, auth, labToLabDb, labToLabStorage, secondaryStorage, secondaryDb };
export const isBothTargetsEnabled = activeTarget === 'both';

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

export const firebaseProjectId: string = (activeTarget === 'both') 
  ? "Both (Sales & Hospital)" 
  : firebaseConfig.projectId;
export const labToLabProjectId: string = configs[getLabToLabFirebaseSource()].projectId;

export default app;
