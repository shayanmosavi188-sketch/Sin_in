// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCULgDnqWMrSpeZa0gRwcO43C06WyBpBLc",
  authDomain: "test2-9cc6a.firebaseapp.com",
  projectId: "test2-9cc6a",
  storageBucket: "test2-9cc6a.firebasestorage.app",
  messagingSenderId: "693256655140",
  appId: "1:693256655140:web:9a7254aaedac3c034ea3b1",
  measurementId: "G-Q8014L43JZ"
};

// Initialize Firebase safely
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

// Initialize Analytics safely on client only
let analytics = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

export { db, analytics };
