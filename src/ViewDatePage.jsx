// src/ViewDatePage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import './CalendarPage.css';
import './ViewDatePage.css';   // optional if you created it

import { db, auth } from './firebase';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  serverTimestamp
} from 'firebase/firestore';

const isValidDateKey = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s);

export default function ViewDatePage() {
  const params = useParams();                 // expects /view-date/:dateKey
  const location = useLocation();
  const navigate = useNavigate();

  // allow fallback via ?dateKey=YYYY-MM-DD
  const dateKeyParam =
    params?.dateKey ??
    new URLSearchParams(location.search).get('dateKey') ??
    '';

  const [dateKey, setDateKey] = useState(dateKeyParam);
  useEffect(() => { setDateKey(dateKeyParam); }, [dateKeyParam]);

  const [isLoggedIn, setIsLoggedIn] = useState(
    typeof window !== 'undefined' && localStorage.getItem('loggedIn') === 'yes'
  );
  useEffect(() => {
    const onStorage = () => setIsLoggedIn(localStorage.getItem('loggedIn') === 'yes');
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const invalid = !isValidDateKey(dateKey);

  const [events, setEvents] = useState([]);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [err, setErr] = useState('');

  // Live subscribe to this day's events
  useEffect(() => {
    if (invalid) return;
    const qRef = query(
      collection(db, 'events'),
      where('dateKey', '==', dateKey),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(
      qRef,
      { includeMetadataChanges: true },
      (snap) => {
        const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setEvents(rows);
      }
    );
    return () => unsub();
  }, [dateKey, invalid]);

  const prettyDate = useMemo(() => {
    if (invalid) return '';
    const [y, m, d] = dateKey.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }, [dateKey, invalid]);

  async function addEvent(e) {
    e.preventDefault();
    setErr('');
    if (!isLoggedIn) return; // form won't render when logged out anyway
    const title = newTitle.trim();
    const description = newDesc.trim();
    if (!title) return;

    const user = auth.currentUser;
    if (!user) { setErr('Please sign in.'); return; }

    // Optimistic add
    const tempId = `temp-${crypto.randomUUID?.() || Math.random()}`;
    const optimistic = {
      id: tempId,
      dateKey,
      title,
      description,
      ownerId: user.uid,
      createdAt: new Date()
    };
    setEvents(prev => [optimistic, ...prev]);
    setNewTitle('');
    setNewDesc('');

    try {
      const docRef = await addDoc(collection(db, 'events'), {
        dateKey,
        title,
        description,
        ownerId: user.uid,
        createdAt: serverTimestamp()
      });
      setEvents(prev =>
        prev.map(ev => (ev.id === tempId ? { ...optimistic, id: docRef.id } : ev))
      );
    } catch (e) {
      setEvents(prev => prev.filter(ev => ev.id !== tempId)); // rollback
      setErr(e?.message || 'Failed to add event.');
    }
  }

  function startEdit(ev) {
    setEditingId(ev.id);
    setEditTitle(ev.title ?? ev.text ?? '');
    setEditDesc(ev.description ?? '');
  }
  function cancelEdit() {
    setEditingId(null);
    setEditTitle('');
    setEditDesc('');
  }
  async function saveEdit(id) {
    if (!isLoggedIn) return;
    const t = editTitle.trim();
    const d = editDesc.trim();
    if (!t) return;

    const snapshot = events; // rollback snapshot
    setEvents(prev => prev.map(ev => ev.id === id ? { ...ev, title: t, description: d } : ev));
    try {
      await updateDoc(doc(db, 'events', id), { title: t, description: d });
    } catch (e) {
      setEvents(snapshot);
      setErr(e?.message || 'Failed to save changes.');
    } finally {
      cancelEdit();
    }
  }
  async function removeEvent(id) {
    if (!isLoggedIn) return;
    if (!confirm('Delete this event?')) return;

    const snapshot = events;
    setEvents(prev => prev.filter(ev => ev.id !== id));
    try {
      await deleteDoc(doc(db, 'events', id));
    } catch (e) {
      setEvents(snapshot);
      setErr(e?.message || 'Failed to delete event.');
    }
  }

  if (invalid) {
    return (
      <section className="view-date-page">
        <div className="error-card">
          <nav className="nav">
            <Link to="/">Home</Link>
            <Link to="/calendar">Calendar</Link>
          </nav>
          <h2>Invalid /view-date URL</h2>
          <p>Expected format: <code>/view-date/YYYY-MM-DD</code></p>
          <button onClick={() => navigate('/calendar')}>Go to Calendar</button>
        </div>
      </section>
    );
  }

  return (
    <section className="view-date-page">
      <h2>{prettyDate}</h2>

      {/* Render the add form ONLY when logged in */}
      {isLoggedIn ? (
        <form onSubmit={addEvent}>
          <input
            placeholder="Title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <textarea
            placeholder="Description (optional)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            rows={3}
          />
          <button type="submit">Add Event</button>
          {err && <div style={{ color: 'crimson', marginTop: 6, fontSize: 14 }}>{err}</div>}
        </form>
      ) : (
        <p style={{ margin: '8px 0 16px' }}>
          Sign in to add events. <Link to="/login">Login</Link>
        </p>
      )}

      <ul>
        {events.map((ev) => (
          <li key={ev.id}>
            {editingId === ev.id ? (
              <>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Title"
                  disabled={!isLoggedIn}
                />
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Description"
                  rows={3}
                  disabled={!isLoggedIn}
                />
                <div className="actions">
                  <button onClick={() => saveEdit(ev.id)} disabled={!isLoggedIn}>Save</button>
                  <button onClick={cancelEdit}>Cancel</button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <strong>{ev.title ?? ev.text}</strong>
                  {(ev.description ?? '') && (
                    <div className="description">{ev.description}</div>
                  )}
                </div>
                {isLoggedIn && (
                  <div className="actions">
                    <button onClick={() => startEdit(ev)}>Edit</button>
                    <button onClick={() => removeEvent(ev.id)}>Delete</button>
                  </div>
                )}
              </>
            )}
          </li>
        ))}
      </ul>

      <div className="back-row">
        <button type="button" onClick={() => navigate(-1)}>Back</button>
      </div>
    </section>
  );
}
