// src/LoginPage.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from './firebase';
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // Keep localStorage in sync with Firebase auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) localStorage.setItem('loggedIn', 'yes');
      else localStorage.removeItem('loggedIn');
    });
    return () => unsub();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/'); // or '/calendar'
    } catch (e) {
      setErr(niceAuthError(e));
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword() {
    if (!email) return setErr('Enter your email above, then click “Forgot password?”.');
    try {
      await sendPasswordResetEmail(auth, email);
      alert('Password reset email sent.');
    } catch (e) {
      setErr(niceAuthError(e));
    }
  }

  return (
    <section style={{ maxWidth: 420, margin: '2rem auto', padding: 16 }}>
      <h2>Sign in</h2>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 10 }}>
        <input
          type="email"
          placeholder="Email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type={showPw ? 'text' : 'password'}
            placeholder="Password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ flex: 1 }}
          />
          <button type="button" onClick={() => setShowPw((s) => !s)}>
            {showPw ? 'Hide' : 'Show'}
          </button>
        </div>

        <button type="button" onClick={resetPassword} style={{ justifySelf: 'start' }}>
          Forgot password?
        </button>

        {err && <div style={{ color: 'crimson', fontSize: 14 }}>{err}</div>}

        <button type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </section>
  );
}

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
