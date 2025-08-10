// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// ⬇️ Replace with the config from Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyB8xYwghDeDQVlHvQ9Nlb9pWYN5tQZQVcM",
  authDomain: "beta-omega-chi.firebaseapp.com",
  projectId: "beta-omega-chi",
  storageBucket: "beta-omega-chi.firebasestorage.app",
  messagingSenderId: "985142616884",
  appId: "1:985142616884:web:3fef12db738d78ea15bb61",
  measurementId: "G-517GQWSH9F"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
