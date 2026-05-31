import { getApps, getApp, initializeApp } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';
import { getFirestore } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';
import type { Firestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import type { Auth } from 'firebase/auth';


// Your dedicated Hospital project configuration
const firebaseConfig = {
    apiKey: "AIzaSyAkjo7wFjRMjyDfssFPVqG-nfoNDfv_jk0",
    authDomain: "hospitalapp-681f1.firebaseapp.com",
    projectId: "hospitalapp-681f1",
    storageBucket: "hospitalapp-681f1.firebasestorage.app",
    messagingSenderId: "340060147561",
    appId: "1:340060147561:web:f09f004b0acb873fdc77f8",
    measurementId: "G-X6T5P6YK10"
};


//intialize firebase app
let app: FirebaseApp
if (!getApps().length) {
    app = initializeApp(firebaseConfig, 'hospital');
} else {
    try {
        app = getApp('hospital');
    } catch (err) {
        app = initializeApp(firebaseConfig, 'hospital');
    }
}


// Initialize Firebase services
const storage:FirebaseStorage = getStorage(app);
const firestoreDb:Firestore = getFirestore(app);
const auth:Auth = getAuth(app);

export { app, storage, firestoreDb, auth };