import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./style.css";
import "./HomePage.css";
import logo from "./assets/BOXBoxer.png";

// Firestore
import { db } from "./firebase";
import { collection, query, where, orderBy, onSnapshot, limit } from "firebase/firestore";

// Helpers
const pad2 = (n) => String(n).padStart(2, "0");
const toKey = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const formatTime12h = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = ((h + 11) % 12) + 1;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
};
const prettyFromKey = (key) => {
  if (!key) return "";
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export default function HomePage() {
  // Next 5 upcoming events
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [nextFive, setNextFive] = useState([]);

  useEffect(() => {
    setLoadingEvents(true);

    const now = new Date();
    const todayKey = toKey(now);
    const nowTime = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;

    // Pull a chunk of future events, then compute next 5 client-side
    const qRef = query(
      collection(db, "events"),
      where("dateKey", ">=", todayKey),
      orderBy("dateKey", "asc"),
      limit(120)
    );

    const unsub = onSnapshot(
      qRef,
      (snap) => {
        const rows = [];
        snap.forEach((doc) => rows.push({ id: doc.id, ...doc.data() }));

        // Keep upcoming only
        const upcoming = rows.filter((ev) => {
          if (!ev?.dateKey) return false;
          if (ev.dateKey > todayKey) return true;
          if (ev.dateKey < todayKey) return false;
          // Same day
          if (ev.allDay) return true;
          const st = ev.startTime || "";
          const et = ev.endTime || "";
          if (et) return et >= nowTime; // include ongoing/upcoming
          if (st) return st >= nowTime;
          return true; // if no times, treat as upcoming for today
        });

        // Sort: date → all-day first → start time
        upcoming.sort((a, b) => {
          if (a.dateKey !== b.dateKey) return a.dateKey.localeCompare(b.dateKey);
          const ad = a.allDay ? 1 : 0;
          const bd = b.allDay ? 1 : 0;
          if (ad !== bd) return bd - ad; // all-day first
          const as = a.startTime || "99:99";
          const bs = b.startTime || "99:99";
          return as.localeCompare(bs);
        });

        setNextFive(upcoming.slice(0, 5));
        setLoadingEvents(false);
      },
      () => {
        setNextFive([]);
        setLoadingEvents(false);
      }
    );

    return () => unsub();
  }, []);

  return (
    <div className="homepage-container">
      {/* Intro / Hero */}
      <section className="homepage-intro">
        <img
          src={logo}
          alt="Beta Omega Chi Logo"
          className="homepage-image"
        />

        <h1>Welcome to Beta Omega Chi</h1>
        <p className="tagline">
          A brotherhood Built On Christ.
        </p>
      </section>

      {/* About Us */}
      <section className="homepage-about">
        <h2>About Us</h2>
        <p>
          Beta Omega Chi is a brotherhood Built On Christ at Harding University.
          We strive to shine God’s light through service, friendship, and example,
          building strong bonds among our members while encouraging one another
          toward spiritual growth and unity.
        </p>
      </section>

      {/* Upcoming Events (next 5) */}
      <section className="homepage-events">
        <div className="section-header">
          <h2>Upcoming Events</h2>
          <Link className="btn-outline" to="/calendar">Open Calendar</Link>
        </div>

        {loadingEvents && <p className="muted">Loading events…</p>}
        {!loadingEvents && nextFive.length === 0 && (
          <p className="muted">No upcoming events yet.</p>
        )}

        <ul className="event-list">
          {nextFive.map((ev) => {
            const title = ev.title ?? ev.text ?? "";
            const when = ev.allDay
              ? "All Day"
              : ev.startTime
                ? `${formatTime12h(ev.startTime)}${ev.endTime ? " – " + formatTime12h(ev.endTime) : ""}`
                : "";

            return (
              <li key={ev.id} className="event-row">
                <div className="event-title">
                  <Link to={`/view-date/${ev.dateKey}`}>{title}</Link>
                  <div className="event-time">{when}</div>
                </div>
                <div className="event-meta">{prettyFromKey(ev.dateKey)}</div>
                <div className="event-actions">
                  <Link className="btn small" to={`/view-date/${ev.dateKey}`}>Open</Link>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
