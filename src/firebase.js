// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore"; // 👈 Added enableIndexedDbPersistence
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  // ... KEEP YOUR EXISTING KEYS HERE ...
  apiKey: "YOUR_EXISTING_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
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