// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore"; // 👈 Added enableIndexedDbPersistence
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDG4EQb7a_yVWVK23ljdFYEVklZj4QIkDA",
  authDomain: "nyamoya-36486.firebaseapp.com",
  projectId: "nyamoya-36486",
  storageBucket: "nyamoya-36486.firebasestorage.app",
  messagingSenderId: "497346686010",
  appId: "1:497346686010:web:efc8211cd0528ca5fdd903",
  measurementId: "G-SF6G3KLJD5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// 🔌 ENABLE OFFLINE MODE
enableIndexedDbPersistence(db)
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled in one tab at a time.
      console.warn("Offline mode failed: Close other tabs.");
    } else if (err.code === 'unimplemented') {
      // The current browser does not support all of the features required to enable persistence
      console.warn("Offline mode not supported in this browser.");
    }
  });