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
function shiftDateKey(dateKey, deltaDays) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + deltaDays);
  const pad2 = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
}

function normalizeTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':');
  const pad2 = (n) => String(n).padStart(2, '0');
  return `${pad2(+h)}:${pad2(+(m ?? 0))}`;
}

function formatTime12h(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = ((h + 11) % 12) + 1;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

export default function ViewDatePage() {
  const params = useParams(); // /view-date/:dateKey
  const location = useLocation();
  const navigate = useNavigate();

  const dateKey =
    params?.dateKey ??
    new URLSearchParams(location.search).get('dateKey') ??
    '';

  const invalid = !isValidDateKey(dateKey);

  const [isLoggedIn, setIsLoggedIn] = useState(
    typeof window !== 'undefined' && localStorage.getItem('loggedIn') === 'yes'
  );

  const [events, setEvents] = useState([]);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newAllDay, setNewAllDay] = useState(false);
  const [newStartTime, setNewStartTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editAllDay, setEditAllDay] = useState(false);
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    setEvents([]);
    setEditingId(null);
    setNewTitle('');
    setNewDesc('');
    setNewAllDay(false);
    setNewStartTime('');
    setNewEndTime('');
    setErr('');

    if (invalid) return;

    const qRef = query(
      collection(db, 'events'),
      where('dateKey', '==', dateKey),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(qRef, { includeMetadataChanges: true }, (snap) => {
      const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      rows.sort((a,b)=>{
        const ad = a.allDay ? 1 : 0; const bd = b.allDay ? 1 : 0;
        if (ad !== bd) return bd - ad; // all-day first
        const as = (a.startTime || '99:99'); const bs = (b.startTime || '99:99');
        return as.localeCompare(bs);
      });
      setEvents(rows);
    });

    return () => unsub();
  }, [dateKey, invalid]);

  const prettyDate = useMemo(() => {
    if (invalid) return '';
    const [y, m, d] = dateKey.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  }, [dateKey, invalid]);

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
  }, [dateKey]);

  async function addEvent(e) {
    e.preventDefault();
    setErr('');
    if (!isLoggedIn) return;
    const title = newTitle.trim();
    const description = newDesc.trim();
    if (!title) return;

    const user = auth.currentUser;
    if (!user) { setErr('Please sign in.'); return; }

    const allDay = !!newAllDay;
    const st = allDay ? '' : normalizeTime(newStartTime);
    const et = allDay ? '' : normalizeTime(newEndTime);

    if (!allDay) {
      if (!st || !et) { setErr('Please provide start and end times or mark as All Day.'); return; }
      if (st > et) { setErr('Start time must be before end time.'); return; }
    }

    const tempId = `temp-${crypto.randomUUID?.() || Math.random()}`;
    const optimistic = { id: tempId, dateKey, title, description, allDay, startTime: st, endTime: et, ownerId: user.uid, createdAt: new Date() };
    setEvents(prev => [optimistic, ...prev]);

    try {
      const saved = await addDoc(collection(db, 'events'), {
        dateKey, title, description, allDay, startTime: st, endTime: et, ownerId: user.uid, createdAt: serverTimestamp()
      });
      setEvents(prev => prev.map(ev => ev.id === tempId ? { ...optimistic, id: saved.id } : ev));
      setNewTitle(''); setNewDesc(''); setNewAllDay(false); setNewStartTime(''); setNewEndTime('');
    } catch (e2) {
      setErr(e2?.message || 'Failed to add event.');
      setEvents(prev => prev.filter(ev => ev.id !== tempId));
    }
  }

  function beginEdit(ev) {
    setEditingId(ev.id);
    setEditTitle(ev.title ?? '');
    setEditDesc(ev.description ?? '');
    setEditAllDay(!!ev.allDay);
    setEditStartTime(ev.startTime ?? '');
    setEditEndTime(ev.endTime ?? '');
  }
  function cancelEdit() {
    setEditingId(null); setEditTitle(''); setEditDesc('');
    setEditAllDay(false); setEditStartTime(''); setEditEndTime('');
  }
  async function saveEdit(id) {
    if (!isLoggedIn) return;
    const t = editTitle.trim(); const d = editDesc.trim();
    if (!t) return;

    const allDay = !!editAllDay;
    const st = allDay ? '' : normalizeTime(editStartTime);
    const et = allDay ? '' : normalizeTime(editEndTime);
    if (!allDay) {
      if (!st || !et) { setErr('Please provide start and end times or mark as All Day.'); return; }
      if (st > et) { setErr('Start time must be before end time.'); return; }
    }

    const snapshot = events;
    setEvents(prev => prev.map(ev => ev.id === id ? { ...ev, title: t, description: d, allDay, startTime: st, endTime: et } : ev));
    try { await updateDoc(doc(db, 'events', id), { title: t, description: d, allDay, startTime: st, endTime: et }); }
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
    <section className="view-date-page">
      <div className="calendar-controls">
        <button type="button" onClick={gotoPrevDay} aria-label="Previous day">◀ Previous</button>
        <div className="current-month">{prettyDate}</div>
        <button type="button" onClick={gotoNextDay} aria-label="Next day">Next ▶</button>
      </div>

      {/* Add Event form */}
      {isLoggedIn ? (
        <form onSubmit={addEvent}>
          <label className="inline">
            All Day <input 
            type="checkbox" 
            checked={newAllDay} 
            onChange={e=>setNewAllDay(e.target.checked)} 
            /> 
          </label>
          {!newAllDay && (
            <div className="time-row">
              <input type="time" value={newStartTime} onChange={e=>setNewStartTime(e.target.value)} aria-label="Start time" />
              <input type="time" value={newEndTime} onChange={e=>setNewEndTime(e.target.value)} aria-label="End time" />
            </div>
          )}
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
                <label className="inline">
                  All Day <input
                    type="checkbox"
                    checked={editAllDay}
                    onChange={(e)=>setEditAllDay(e.target.checked)}
                  />
                </label>
                {!editAllDay && (
                  <div className="time-row">
                    <input type="time" value={editStartTime} onChange={(e)=>setEditStartTime(e.target.value)} aria-label="Start time" />
                    <input type="time" value={editEndTime} onChange={(e)=>setEditEndTime(e.target.value)} aria-label="End time" />
                  </div>
                )}
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
                  <div className="event-time">
                    {ev.allDay ? 'All Day' : `${formatTime12h(ev.startTime ?? '')}${ev.endTime ? ' – ' + formatTime12h(ev.endTime) : ''}`}
                  </div>
                </div>
                <div className="desc">{ev.description}</div>
                {isLoggedIn && (
                  <div className="actions">
                    <button onClick={() => beginEdit(ev)}>Edit</button>
                    <button className="danger" onClick={() => removeEvent(ev.id)}>Delete</button>
                  </div>
                )}
              </>
            )}
          </li>
        ))}
      </ul>

      <div className="back-row">
        <button
          type="button"
          onClick={() => {
            const [year, month] = dateKey.split("-");
            navigate("/calendar", { state: { year: parseInt(year, 10), month: parseInt(month, 10) - 1 } });
          }}
        >
          Back
        </button>
      </div>
    </section>
  );
}
