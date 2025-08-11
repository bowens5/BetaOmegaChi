// src/ViewDatePage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import './CalendarPage.css';
import './ViewDatePage.css';

import { db, auth } from './firebase';
import {
  addDoc, collection, deleteDoc, doc,
  onSnapshot, orderBy, query, updateDoc, where, serverTimestamp
} from 'firebase/firestore';

const isValidDateKey = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s);

// helpers
const pad2 = (n) => String(n).padStart(2, '0');
const toKey = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const shiftDateKey = (key, deltaDays) => {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + deltaDays);
  return toKey(dt);
};

export default function ViewDatePage() {
  const params = useParams();                  // /view-date/:dateKey
  const location = useLocation();
  const navigate = useNavigate();

  // Always derive dateKey from URL — no local state needed
  const dateKey =
    params?.dateKey ??
    new URLSearchParams(location.search).get('dateKey') ??
    '';

  const invalid = !isValidDateKey(dateKey);

  const [isLoggedIn, setIsLoggedIn] = useState(
    typeof window !== 'undefined' && localStorage.getItem('loggedIn') === 'yes'
  );
  useEffect(() => {
    const onStorage = () => setIsLoggedIn(localStorage.getItem('loggedIn') === 'yes');
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const [events, setEvents] = useState([]);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [err, setErr] = useState('');

  // Clear immediately whenever the date changes (snappy UI), then subscribe
  useEffect(() => {
    // clear list + any in-progress edits/inputs
    setEvents([]);
    setEditingId(null);
    setNewTitle('');
    setNewDesc('');
    setErr('');

    if (invalid) return;

    const qRef = query(
      collection(db, 'events'),
      where('dateKey', '==', dateKey),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(qRef, { includeMetadataChanges: true }, (snap) => {
      const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setEvents(rows);
    });

    return () => unsub();
  }, [dateKey, invalid]);

  const prettyDate = useMemo(() => {
    if (invalid) return '';
    const [y, m, d] = dateKey.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }, [dateKey, invalid]);

  // Day-to-day navigation — clear immediately, then navigate
  const goToDelta = (delta) => {
    setEvents([]);
    setEditingId(null);
    setNewTitle('');
    setNewDesc('');
    setErr('');
    navigate(`/view-date/${shiftDateKey(dateKey, delta)}`);
  };
  const gotoPrevDay = () => goToDelta(-1);
  const gotoNextDay = () => goToDelta(+1);

  // Keyboard shortcuts: ←/→ or PageUp/PageDown
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      const typing = t?.tagName === 'INPUT' || t?.tagName === 'TEXTAREA' || t?.isContentEditable;
      if (typing) return;
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); gotoPrevDay(); }
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); gotoNextDay(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dateKey]); // rebind with latest handlers

  async function addEvent(e) {
    e.preventDefault();
    setErr('');
    if (!isLoggedIn) return;
    const title = newTitle.trim();
    const description = newDesc.trim();
    if (!title) return;

    const user = auth.currentUser;
    if (!user) { setErr('Please sign in.'); return; }

    // optimistic add
    const tempId = `temp-${crypto.randomUUID?.() || Math.random()}`;
    const optimistic = { id: tempId, dateKey, title, description, ownerId: user.uid, createdAt: new Date() };
    setEvents(prev => [optimistic, ...prev]);
    setNewTitle(''); setNewDesc('');

    try {
      const docRef = await addDoc(collection(db, 'events'), {
        dateKey, title, description, ownerId: user.uid, createdAt: serverTimestamp()
      });
      setEvents(prev => prev.map(ev => (ev.id === tempId ? { ...optimistic, id: docRef.id } : ev)));
    } catch (e2) {
      setEvents(prev => prev.filter(ev => ev.id !== tempId));
      setErr(e2?.message || 'Failed to add event.');
    }
  }

  function startEdit(ev) {
    setEditingId(ev.id);
    setEditTitle(ev.title ?? ev.text ?? '');
    setEditDesc(ev.description ?? '');
  }
  function cancelEdit() {
    setEditingId(null); setEditTitle(''); setEditDesc('');
  }
  async function saveEdit(id) {
    if (!isLoggedIn) return;
    const t = editTitle.trim(); const d = editDesc.trim();
    if (!t) return;
    const snapshot = events;
    setEvents(prev => prev.map(ev => ev.id === id ? { ...ev, title: t, description: d } : ev));
    try { await updateDoc(doc(db, 'events', id), { title: t, description: d }); }
    catch (e2) { setEvents(snapshot); setErr(e2?.message || 'Failed to save changes.'); }
    finally { cancelEdit(); }
  }
  async function removeEvent(id) {
    if (!isLoggedIn) return;
    if (!confirm('Delete this event?')) return;
    const snapshot = events;
    setEvents(prev => prev.filter(ev => ev.id !== id));
    try { await deleteDoc(doc(db, 'events', id)); }
    catch (e2) { setEvents(snapshot); setErr(e2?.message || 'Failed to delete event.'); }
  }

  if (invalid) {
    return (
      <section className="view-date-page">
        <div className="error-card">
          <h2>Invalid /view-date URL</h2>
          <p>Expected format: <code>/view-date/YYYY-MM-DD</code></p>
          <button onClick={() => navigate('/calendar')}>Go to Calendar</button>
        </div>
      </section>
    );
  }

  return (
    <section className="view-date-page" key={dateKey}>

      {/* Day-to-day controls */}
      <div className="calendar-controls" aria-label="Day navigation">
        <button type="button" onClick={gotoPrevDay} aria-label="Previous day">◀ Previous</button>
        <div className="current-month">{prettyDate}</div>
        <button type="button" onClick={gotoNextDay} aria-label="Next day">Next ▶</button>
      </div>

      {/* Add Event form (only when logged in) */}
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
          {err && <div className="error" aria-live="polite">{err}</div>}
        </form>
      ) : (
        <p className="calendar-note">Sign in to add events. <Link to="/login">Login</Link></p>
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
                />
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Description"
                  rows={3}
                />
                <div className="actions">
                  <button onClick={() => saveEdit(ev.id)}>Save</button>
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
