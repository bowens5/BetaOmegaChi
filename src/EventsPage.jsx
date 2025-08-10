// src/EventsPage.jsx
import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import {
  collection,
  addDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";

export default function EventsPage() {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [events, setEvents] = useState([]);

  // live updates
  useEffect(() => {
    const q = query(collection(db, "events"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  async function addEvent(e) {
    e.preventDefault();
    if (!title.trim() || !date) return;
    await addDoc(collection(db, "events"), {
      title: title.trim(),
      date,
      createdAt: serverTimestamp(),
    });
    setTitle("");
    setDate("");
  }

  async function removeEvent(id) {
    await deleteDoc(doc(db, "events", id));
  }

  return (
    <section style={{ maxWidth: 540, margin: "2rem auto", padding: 16 }}>
      <h2>Events</h2>
      <form onSubmit={addEvent} style={{ display: "grid", gap: 8, marginBottom: 16 }}>
        <input
          placeholder="Event title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <button type="submit">Add Event</button>
      </form>

      <ul style={{ listStyle: "none", padding: 0 }}>
        {events.map((ev) => (
          <li key={ev.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #eee" }}>
            <div>
              <strong>{ev.title}</strong>
              <div style={{ fontSize: 12, opacity: 0.8 }}>{ev.date}</div>
            </div>
            <button onClick={() => removeEvent(ev.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
