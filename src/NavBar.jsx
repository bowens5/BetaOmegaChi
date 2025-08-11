// src/NavBar.jsx
import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import './NavBar.css';

function InstagramIcon(props) {
  return (
    <svg
      aria-hidden="true"
      width="18" height="18" viewBox="0 0 24 24" fill="none"
      xmlns="http://www.w3.org/2000/svg" {...props}
    >
      <path d="M7 2h10a5 5 0 015 5v10a5 5 0 01-5 5H7a5 5 0 01-5-5V7a5 5 0 015-5Z" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="17.5" cy="6.5" r="1.25" fill="currentColor"/>
    </svg>
  );
}

export default function NavBar() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(!!auth.currentUser);

  // Keep UI in sync with Firebase auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setLoggedIn(!!u));
    return () => unsub();
  }, []);

  const handleLogout = async (e) => {
    // prevent the parent nav's onClick from closing before we finish
    e.preventDefault();
    e.stopPropagation();
    try {
      await signOut(auth);
    } catch {}
    localStorage.removeItem('loggedIn'); // if you still use this flag elsewhere
    setLoggedIn(false);
    setOpen(false);
    navigate('/login');
  };

  const linkClass = ({ isActive }) => (isActive ? 'nav-link active' : 'nav-link');

  return (
    <header className="bx-navbar">
      <div className="bx-nav-inner">
        <button className="bx-brand" onClick={() => { setOpen(false); navigate('/'); }}>
          <span className="bx-logo">ΒΩΧ</span><span className="bx-name">Beta Omega Chi</span>
        </button>

        <button
          className={`bx-burger ${open ? 'open' : ''}`}
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen(v => !v)}
        >
          <span/> <span/> <span/>
        </button>

        {/* ✅ Remove the old onClick on the whole <nav>.
            Close the menu per-link instead. */}
        <nav className={`bx-links ${open ? 'open' : ''}`}>
          <NavLink to="/" className={linkClass} end onClick={() => setOpen(false)}>Home</NavLink>
          <NavLink to="/calendar" className={linkClass} onClick={() => setOpen(false)}>Calendar</NavLink>
          {/* Instagram (external) */}
          <a
            href="https://instagram.com/huinstabox?utm_source=site&utm_medium=nav&utm_campaign=header"
            className="nav-link social"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open our Instagram (opens in a new tab)"
            onClick={() => setOpen(false)} // close mobile menu after tap
          >
            <InstagramIcon />
            <span className="sr-only">Instagram</span>
          </a>



          {loggedIn ? (
            <button
              type="button"
              className="nav-link as-button"
              onClick={handleLogout}
            >
              Logout
            </button>
          ) : (
            <NavLink to="/login" className={linkClass} onClick={() => setOpen(false)}>Login</NavLink>
          )}
        </nav>
      </div>
    </header>
  );
}
