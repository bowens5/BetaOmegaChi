import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./style.css";
import "./HomePage.css";
import logo from "./assets/BOXBoxer.png";

// Firestore (uses your existing src/firebase.js)
import { db } from "./firebase";
import { collection, query, where, orderBy, onSnapshot, limit } from "firebase/firestore";

// Helpers
const pad2 = (n) => String(n).padStart(2, "0");
const toKey = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const prettyFromKey = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
};

export default function HomePage() {
  const navigate = useNavigate();

  // login flag from your existing simple auth
  const [isLoggedIn, setIsLoggedIn] = useState(
    typeof window !== "undefined" && localStorage.getItem("loggedIn") === "yes"
  );
  useEffect(() => {
    const onStorage = () => setIsLoggedIn(localStorage.getItem("loggedIn") === "yes");
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // --- Upcoming Events from Firestore ---
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const todayKey = useMemo(() => toKey(new Date()), []);

  useEffect(() => {
    try {
      // We store events with a string field `dateKey` = YYYY-MM-DD (as used in CalendarPage & ViewDatePage)
      const qRef = query(
        collection(db, "events"),
        where("dateKey", ">=", todayKey),
        orderBy("dateKey", "asc"),
        limit(10)
      );

      const unsub = onSnapshot(
        qRef,
        (snap) => {
          const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setEvents(rows);
          setLoading(false);
        },
        (err) => {
          console.error("Upcoming events subscription error", err);
          setError("Failed to load events.");
          setLoading(false);
        }
      );
      return () => unsub();
    } catch (e) {
      console.error(e);
      setError("Failed to connect to events.");
      setLoading(false);
    }
  }, [todayKey]);

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

      {/* UPCOMING EVENTS */}
      <section className="events-section">
        <div className="section-header">
          <h2 className="section-title">Upcoming Events</h2>
        </div>

        {loading && <p className="muted">Loading events…</p>}
        {error && <p className="error">{error}</p>}

        {!loading && !error && events.length === 0 && (
          <div className="empty">
            <p>No upcoming events yet. Check back soon!</p>
            {isLoggedIn && (
              <button className="btn" onClick={() => navigate(`/view-date/${todayKey}`)}>
                Create the first event
              </button>
            )}
          </div>
        )}

        <ul className="event-list">
          {events.slice(0, 5).map((ev) => (
            <li key={ev.id} className="event-item">
              <div className="event-main">
                <span className="event-title">{ev.title || ev.text || "Untitled Event"}</span>
                <span className="event-date">{ev.dateKey ? prettyFromKey(ev.dateKey) : null}</span>
                {ev.description && (
                  <div className="event-desc">{ev.description}</div>
                )}
              </div>
              {ev.dateKey && (
                <div className="event-cta">
                  <button
                    className="btn small"
                    onClick={() => navigate(`/view-date/${ev.dateKey}`)}
                  >
                    View Details
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>


        <div className="events-button">
          <Link to="/calendar" className="btn-outline">See All Events</Link>
        </div>
      </section>
    </div>
  );
}
