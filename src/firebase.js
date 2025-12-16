// src/firebase.js
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  // ⚠️ PASTE YOUR REAL API KEYS HERE AGAIN (Don't lose them!)
  apiKey: "AIzaSy...", 
  authDomain: "nyamoya-erp.firebaseapp.com",
  projectId: "nyamoya-erp",
  storageBucket: "nyamoya-erp.appspot.com",
  messagingSenderId: "...",
  appId: "..."
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// 🔌 NEW DATABASE SETUP (Fixes Warnings + Allows Multi-Tab)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager() // 👈 This allows multiple tabs to work!
  })
});

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();