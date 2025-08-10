// src/ViewDatePage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import './ViewDatePage.css';
import './style.css';

import { db } from './firebase';
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
  const params = useParams();                 // expects :dateKey
  const location = useLocation();
  const navigate = useNavigate();

  // allow fallback via ?dateKey=YYYY-MM-DD if someone links that way
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

  // Live subscribe to this day's events (reflect local writes immediately)
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
    if (!isLoggedIn) return alert('You must be logged in to add events.');
    const title = newTitle.trim();
    const description = newDesc.trim();
    if (!title) return;

    // Optimistic add
    const tempId = `temp-${crypto.randomUUID?.() || Math.random()}`;
    const optimistic = {
      id: tempId,
      dateKey,
      title,
      description,
      createdAt: new Date()
    };
    setEvents(prev => [optimistic, ...prev]);
    setNewTitle('');
    setNewDesc('');

    try {
      const ref = await addDoc(collection(db, 'events'), {
        dateKey,
        title,
        description,
        createdAt: serverTimestamp()
      });
      // Optional immediate reconcile (snapshot will also bring the real doc)
      setEvents(prev =>
        prev.map(ev => (ev.id === tempId ? { ...optimistic, id: ref.id } : ev))
      );
    } catch (err) {
      // rollback on error
      setEvents(prev => prev.filter(ev => ev.id !== tempId));
      alert('Failed to add event: ' + err.message);
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

    // Optimistic edit
    const snapshot = events; // for rollback
    setEvents(prev => prev.map(ev => ev.id === id ? { ...ev, title: t, description: d } : ev));
    try {
      await updateDoc(doc(db, 'events', id), { title: t, description: d });
    } catch (err) {
      setEvents(snapshot);
      alert('Failed to save: ' + err.message);
    } finally {
      cancelEdit();
    }
  }
  async function removeEvent(id) {
    if (!isLoggedIn) return;
    if (!confirm('Delete this event?')) return;

    // Optimistic delete
    const snapshot = events;
    setEvents(prev => prev.filter(ev => ev.id !== id));
    try {
      await deleteDoc(doc(db, 'events', id));
    } catch (err) {
      setEvents(snapshot);
      alert('Failed to delete: ' + err.message);
    }
  }

  if (invalid) {
    return (
      <section style={{ maxWidth: 600, margin: '2rem auto', padding: 16 }}>
        <nav className="top-nav">
          <Link to="/">Home</Link>
          <Link to="/calendar">Calendar</Link>
        </nav>
        <h2>Invalid /view-date URL</h2>
        <p>Expected format: <code>/view-date/YYYY-MM-DD</code></p>
        <button onClick={() => navigate('/calendar')}>Go to Calendar</button>
      </section>
    );
  }

  return (
    <section className="view-date-page" style={{ maxWidth: 640, margin: '2rem auto', padding: 16 }}>

      <h2>{prettyDate}</h2>

      <form onSubmit={addEvent} style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
        <input
          placeholder="Title"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          disabled={!isLoggedIn}
        />
        <textarea
          placeholder="Description (optional)"
          value={newDesc}
          onChange={(e) => setNewDesc(e.target.value)}
          rows={3}
          disabled={!isLoggedIn}
        />
        <button type="submit" disabled={!isLoggedIn}>Add Event</button>
      </form>

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {events.map((ev) => (
          <li key={ev.id} style={{ borderBottom: '1px solid #eee', padding: '10px 0', display: 'grid', gap: 6 }}>
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
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => saveEdit(ev.id)} disabled={!isLoggedIn}>Save</button>
                  <button onClick={cancelEdit}>Cancel</button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <strong style={{ display: 'block' }}>{ev.title ?? ev.text}</strong>
                  {(ev.description ?? '') && (
                    <div style={{ fontSize: 13, opacity: 0.9, whiteSpace: 'pre-wrap' }}>
                      {ev.description}
                    </div>
                  )}
                </div>
                {isLoggedIn && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => startEdit(ev)}>Edit</button>
                    <button onClick={() => removeEvent(ev.id)}>Delete</button>
                  </div>
                )}
              </>
            )}
          </li>
        ))}
      </ul>

      <div style={{ marginTop: 16 }}>
        <button type="button" onClick={() => navigate(-1)}>Back</button>
      </div>
    </section>
  );
}
