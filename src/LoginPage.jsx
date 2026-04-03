// src/LoginPage.jsx
//
// Email / password login form backed by Firebase Auth.  On success the user
// is redirected to the home page.  A password-reset flow is also provided.
//
// Auth state → localStorage sync happens here so other components (NavBar,
// ViewDatePage) can cheaply read `localStorage.getItem('loggedIn')` without
// needing a live Firebase listener everywhere.

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from './firebase';
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from 'firebase/auth';
import log from './logger';
import './LoginPage.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [busy,     setBusy]     = useState(false);
  const [err,      setErr]      = useState('');

  // Keep localStorage in sync with Firebase auth so that a page reload while
  // already signed in doesn't flash a "not logged in" state.
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        log.auth('LoginPage: user is signed in, syncing localStorage');
        localStorage.setItem('loggedIn', 'yes');
      } else {
        localStorage.removeItem('loggedIn');
      }
    });
    return () => unsub();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    log.auth('LoginPage: sign-in attempt for', email);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      log.auth('LoginPage: sign-in successful, redirecting home');
      navigate('/');
    } catch (e) {
      log.error('LoginPage: sign-in failed', e.code, e.message);
      setErr(niceAuthError(e));
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword() {
    if (!email) {
      setErr('Enter your email above, then click "Forgot password?".');
      return;
    }
    log.auth('LoginPage: sending password reset to', email);
    try {
      await sendPasswordResetEmail(auth, email);
      alert('Password reset email sent.');
    } catch (e) {
      log.error('LoginPage: password reset failed', e.code);
      setErr(niceAuthError(e));
    }
  }

  return (
    <section className="login-page">
      <h2>Sign in</h2>

      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <div className="pw-row">
          <input
            type={showPw ? 'text' : 'password'}
            placeholder="Password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="button" onClick={() => setShowPw((s) => !s)}>
            {showPw ? 'Hide' : 'Show'}
          </button>
        </div>

        <button type="button" className="link-btn" onClick={resetPassword}>
          Forgot password?
        </button>

        {err && (
          <div className="error" aria-live="polite">
            {err}
          </div>
        )}

        <button type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Converts a Firebase Auth error into a user-friendly string. */
function niceAuthError(e) {
  const code = e?.code || '';
  if (code.includes('auth/invalid-credential') || code.includes('auth/wrong-password'))
    return 'Invalid email or password.';
  if (code.includes('auth/user-not-found'))
    return 'No user found for that email.';
  if (code.includes('auth/too-many-requests'))
    return 'Too many attempts. Try again later.';
  return e?.message || 'Authentication failed.';
}
