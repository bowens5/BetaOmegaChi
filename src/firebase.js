// src/firebase.js
//
// Initializes the Firebase app and exports the two services used across the
// site: `db` (Firestore) for event storage and `auth` (Firebase Auth) for
// member login.  All config values are injected at build time by Webpack's
// DefinePlugin from the project's .env file (see webpack.config.js).

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import log from "./logger";

const firebaseConfig = {
  apiKey:            process.env.FIREBASE_API_KEY,
  authDomain:        process.env.FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.FIREBASE_PROJECT_ID,
  storageBucket:     process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.FIREBASE_APP_ID,
  measurementId:     process.env.FIREBASE_MEASUREMENT_ID,
};

// Warn in development if any required env vars are missing.  A missing key
// means Firestore queries and auth will silently fail at runtime.
if (process.env.NODE_ENV !== 'production') {
  const missing = Object.entries(firebaseConfig)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length) {
    log.warn('Firebase config is missing env vars:', missing.join(', '));
    log.warn('Copy .env.example → .env and fill in your project credentials.');
  } else {
    log.firebase('Config loaded for project:', firebaseConfig.projectId);
  }
}

const app = initializeApp(firebaseConfig);

export const db   = getFirestore(app);
export const auth = getAuth(app);

log.firebase('Firebase initialized — db and auth ready');
