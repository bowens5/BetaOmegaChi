// src/auth.js
//
// Thin wrappers around Firebase Auth so the rest of the app imports from here
// rather than directly from 'firebase/auth'.  This keeps Firebase as a single
// dependency boundary and makes auth calls easy to trace in the dev console.

import { auth } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import log from "./logger";

/** Creates a new Firebase account with the given email and password. */
export const signUp = (email, password) => {
  log.auth('signUp attempt for', email);
  return createUserWithEmailAndPassword(auth, email, password);
};

/** Signs in an existing Firebase user. */
export const signIn = (email, password) => {
  log.auth('signIn attempt for', email);
  return signInWithEmailAndPassword(auth, email, password);
};

/** Signs the current user out. */
export const logOut = () => {
  log.auth('logOut called');
  return signOut(auth);
};

/**
 * Subscribes to auth state changes.
 * @param {function} cb - Called with the Firebase User object (or null when signed out).
 * @returns {function} Unsubscribe function — call it in a useEffect cleanup.
 */
export const watchUser = (cb) => onAuthStateChanged(auth, (user) => {
  log.auth('auth state changed — user:', user ? user.email : 'null (signed out)');
  cb(user);
});
