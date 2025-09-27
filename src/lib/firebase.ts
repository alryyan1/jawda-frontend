// Firebase configuration and initialization
import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { getAuth, signInAnonymously } from "firebase/auth";

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

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Storage
export const storage = getStorage(app);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Analytics (optional)
export const analytics = getAnalytics(app);

// Initialize Auth
export const auth = getAuth(app);

// Function to get Firebase access token
export const getFirebaseAccessToken = async (): Promise<string | null> => {
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

export default app;
