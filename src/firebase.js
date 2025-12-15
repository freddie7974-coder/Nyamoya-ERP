// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth"; 

// 👇 PASTE YOUR REAL KEYS FROM FIREBASE CONSOLE HERE
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

// Initialize Services (Exporting these so the app can use them)
export const db = getFirestore(app);
export const auth = getAuth(app);