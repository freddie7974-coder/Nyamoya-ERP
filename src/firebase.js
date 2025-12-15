// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // 👈 NEW IMPORT

const firebaseConfig = {
  // ... KEEP YOUR EXISTING CONFIG KEYS HERE ...
  // DO NOT DELETE YOUR KEYS!
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
export const auth = getAuth(app); // 👈 NEW EXPORT