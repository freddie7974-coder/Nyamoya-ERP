// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth"; // 👈 Added GoogleAuthProvider

const firebaseConfig = {
  apiKey: "AIzaSyDG4EQb7a_yVWVK23ljdFYEVklZj4QIkDA",
  authDomain: "nyamoya-36486.firebaseapp.com",
  projectId: "nyamoya-36486",
  storageBucket: "nyamoya-36486.firebasestorage.app",
  messagingSenderId: "497346686010",
  appId: "1:497346686010:web:efc8211cd0528ca5fdd903",
  measurementId: "G-SF6G3KLJD5"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider(); // 👈 NEW EXPORT