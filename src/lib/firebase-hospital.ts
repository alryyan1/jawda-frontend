import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import type { Firestore } from "firebase/firestore";

const hospitalFirebaseConfig = {
  apiKey: "AIzaSyAkjo7wFjRMjyDfssFPVqG-nfoNDfv_jk0",
  authDomain: "hospitalapp-681f1.firebaseapp.com",
  projectId: "hospitalapp-681f1",
  storageBucket: "hospitalapp-681f1.firebasestorage.app",
  messagingSenderId: "340060147561",
  appId: "1:340060147561:web:f09f004b0acb873fdc77f8",
  measurementId: "G-X6T5P6YK10",
};

const APP_NAME = "hospitalapp";

const hospitalApp =
  getApps().find((a) => a.name === APP_NAME) ??
  initializeApp(hospitalFirebaseConfig, APP_NAME);

export const hospitalDb: Firestore = getFirestore(hospitalApp);
export const hospitalProjectId: string = hospitalFirebaseConfig.projectId;
