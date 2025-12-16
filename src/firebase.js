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

// 🔌 NEW DATABASE SETUP (Fixes Warnings + Allows Multi-Tab)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager() // 👈 This allows multiple tabs to work!
  })
});

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();