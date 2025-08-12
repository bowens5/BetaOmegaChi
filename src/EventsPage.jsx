import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { db } from "./firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";

const pad2 = (n) => String(n).padStart(2, "0");
const toDateKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};
const prettyDateKey = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
};

export default function EventsPage() {
  const navigate = useNavigate();

  // simple auth flag (matches HomePage / your app)
  const [isLoggedIn] = useState(
    typeof window !== "undefined" && localStorage.getItem("loggedIn") === "yes"
  );

  // list + loading
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const todayKey = useMemo(() => toDateKey(new Date()), []);

  useEffect(() => {
    try {
      // show all upcoming first; users can toggle "show past"
      const qRef = query(
        collection(db, "events"),
        where("dateKey", ">=", todayKey),
        orderBy("dateKey", "asc")
      );
      const unsub = onSnapshot(
        qRef,
        (snap) => {
          setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
          setLoading(false);
        },
        (err) => {
          console.error(err);
          setError("Failed to load events.");
          setLoading(false);
        }
      );
      return () => unsub();
    } catch (e) {
      console.error(e);
      setError("Failed to connect to Firestore.");
      setLoading(false);
    }
  }, [todayKey]);

  // add event form state
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(""); // from <input type="date">
  const [time, setTime] = useState(""); // optional HH:MM
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  async function addEvent(e) {
    e.preventDefault();
    setFormError("");

    if (!isLoggedIn) {
      setFormError("You must be logged in to add events.");
      return;
    }
    if (!title.trim()) {
      setFormError("Title is required.");
      return;
    }
    if (!date) {
      setFormError("Date is required.");
      return;
    }

    const dateKey = toDateKey(date);
    const payload = {
      title: title.trim(),
      dateKey, // canonical key used across the app
      // keep optional fields aligned with HomePage.jsx
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      time: time || undefined, // store as simple string e.g. "18:30"
      createdAt: serverTimestamp(),
    };

    try {
      setSaving(true);
      await addDoc(collection(db, "events"), payload);
      // clear only title/desc, keep date so user can add multiples for same day
      setTitle("");
      setDescription("");
      setLocation("");
      setTime("");
    } catch (err) {
      console.error(err);
      setFormError("Failed to save event. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function removeEvent(id) {
    if (!isLoggedIn) return;
    if (!window.confirm("Delete this event?")) return;
    try {
      await deleteDoc(doc(db, "events", id));
    } catch (err) {
      console.error(err);
      alert("Failed to delete event.");
    }
  }

  return (
    <div className="page events-page">
      <header className="page-header">
        <h1>Events</h1>
        <div className="header-actions">
          <Link className="btn-outline" to="/calendar">Calendar View</Link>
          <Link className="btn-outline" to={`/view-date/${todayKey}`}>Edit Today</Link>
        </div>
      </header>

      <section className="add-event-card">
        <h2>Add Event</h2>
        {!isLoggedIn && <p className="muted">Login to add or manage events.</p>}
        <form onSubmit={addEvent} className="event-form">
          <div className="row">
            <label>
              <span>Title *</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Club Meeting"
                required
              />
            </label>
          </div>
          <div className="row grid">
            <label>
              <span>Date *</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </label>
            <label>
              <span>Time</span>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </label>
            <label>
              <span>Location</span>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Reynolds C202"
              />
            </label>
          </div>
          <div className="row">
            <label>
              <span>Description</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What to bring, dress code, etc."
                rows={3}
              />
            </label>
          </div>
          {formError && <p className="error" role="alert">{formError}</p>}
          <div className="actions">
            <button className="btn" type="submit" disabled={saving || !isLoggedIn}>
              {saving ? "Saving…" : "Add Event"}
            </button>
          </div>
        </form>
      </section>

      <section className="list-card">
        <div className="section-header">
          <h2>Upcoming</h2>
          <span className="muted">{events.length} event{events.length === 1 ? "" : "s"}</span>
        </div>

        {loading && <p className="muted">Loading…</p>}
        {error && <p className="error">{error}</p>}

        {!loading && !error && events.length === 0 && (
          <p className="muted">Nothing scheduled yet. Add something above!</p>
        )}

        <ul className="event-list">
          {events.map((ev) => (
            <li key={ev.id} className="event-item">
              <div className="event-main">
                <div className="event-title-row">
                  <strong className="event-title">{ev.title || ev.text || "Untitled Event"}</strong>
                  <span className="event-date">{ev.dateKey ? prettyDateKey(ev.dateKey) : null}{ev.time ? ` • ${ev.time}` : ""}</span>
                </div>
                {ev.location && <div className="event-location">{ev.location}</div>}
                {ev.description && <div className="event-desc">{ev.description}</div>}
              </div>
              {isLoggedIn && (
                <div className="event-actions">
                  <button className="btn small danger" onClick={() => removeEvent(ev.id)}>Delete</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <footer className="page-footer">
        <Link className="btn-outline" to="/">Back to Home</Link>
      </footer>
    </div>
  );
}
