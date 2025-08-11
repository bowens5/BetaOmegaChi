// src/NavBar.jsx
import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
  import { signOut } from 'firebase/auth';
  import { auth } from './firebase';
import './NavBar.css';

export default function NavBar() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(
    typeof window !== 'undefined' && localStorage.getItem('loggedIn') === 'yes'
  );

  useEffect(() => {
    const onStorage = () => setLoggedIn(localStorage.getItem('loggedIn') === 'yes');
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);


  const logout = async () => {
    await signOut(auth);
    localStorage.removeItem('loggedIn');
    setLoggedIn(false);
    navigate('/login');
  };

  const linkClass = ({ isActive }) => (isActive ? 'nav-link active' : 'nav-link');

  return (
    <header className="bx-navbar">
      <div className="bx-nav-inner">
        <button className="bx-brand" onClick={() => navigate('/')} aria-label="Go home">
          <span className="bx-logo">ΒΩΧ</span>
          <span className="bx-name">Beta Omega Chi</span>
        </button>

        <button
          className={`bx-burger ${open ? 'open' : ''}`}
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen(v => !v)}
        >
          <span />
          <span />
          <span />
        </button>

        <nav className={`bx-links ${open ? 'open' : ''}`} onClick={() => setOpen(false)}>
          <NavLink to="/" className={linkClass} end>Home</NavLink>
          <NavLink to="/calendar" className={linkClass}>Calendar</NavLink>
          {/* Add more links as needed:
              <NavLink to="/events" className={linkClass}>Events</NavLink>
          */}
          {loggedIn ? (
            <button className="nav-link as-button" onClick={logout}>Logout</button>
          ) : (
            <NavLink to="/login" className={linkClass}>Login</NavLink>
          )}
        </nav>
      </div>
    </header>
  );
}
