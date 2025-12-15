// src/utils/logger.js
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'

export const logAction = async (userRole, action, details) => {
  try {
    await addDoc(collection(db, "audit_logs"), {
      user: userRole || 'Unknown',
      action: action,
      details: details,
      timestamp: serverTimestamp(),
      deviceInfo: navigator.userAgent // Captures if they used mobile/laptop
    })
    console.log("📝 Logged:", action)
  } catch (error) {
    console.error("Failed to log action:", error)
  }
}