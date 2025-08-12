// src/CalendarPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './style.css';
import './CalendarPage.css';

import { db } from './firebase';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';

// Helpers
function toKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
function monthKeyRange(year, month /* 0-based */) {
  const y = year;
  const m = month + 1;
  const mm = String(m).padStart(2,'0');
  const start = `${y}-${mm}-01`;
  const last = new Date(y, month + 1, 0).getDate();
  const end = `${y}-${mm}-${String(last).padStart(2,'0')}`;
  return { start, end };
}

export default function CalendarPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const today = new Date();
  const todayKey = toKey(today);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-11

  // eventsByDate: { 'YYYY-MM-DD': [{id, title/text, dateKey, createdAt}, ...] }
  const [eventsByDate, setEventsByDate] = useState({});

  useEffect(() => {
    if (
      location &&
      location.state &&
      Number.isInteger(location.state.year) &&
      Number.isInteger(location.state.month)
    ) {
      setViewYear(location.state.year);
      setViewMonth(location.state.month); // expected 0–11
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live subscribe for the visible month
  useEffect(() => {
    const { start, end } = monthKeyRange(viewYear, viewMonth);
    const qRef = query(
      collection(db, 'events'),
      where('dateKey', '>=', start),
      where('dateKey', '<=', end),
      orderBy('dateKey', 'asc')
    );

    const unsub = onSnapshot(qRef, (snap) => {
      const map = {};
      snap.forEach((docSnap) => {
        const ev = { id: docSnap.id, ...docSnap.data() };
        if (!map[ev.dateKey]) map[ev.dateKey] = [];
        map[ev.dateKey].push(ev);
      });
      setEventsByDate(map);
    });

    return () => unsub();
  }, [viewYear, viewMonth]);

  // Calendar grid calculations
  const weekDays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const firstOfMonth = useMemo(() => new Date(viewYear, viewMonth, 1), [viewYear, viewMonth]);
  const firstDay = firstOfMonth.getDay(); // 0-6
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const goPrevMonth = () => {
    const d = new Date(viewYear, viewMonth, 1);
    d.setMonth(d.getMonth() - 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };
  const goNextMonth = () => {
    const d = new Date(viewYear, viewMonth, 1);
    d.setMonth(d.getMonth() + 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };
  const goToday = () => {
    const t = new Date();
    setViewYear(t.getFullYear());
    setViewMonth(t.getMonth());
  };

  // Keyboard month navigation: Left/PageUp = previous, Right/PageDown = next
useEffect(() => {
  const onKey = (e) => {
    const t = e.target;
    const typing =
      t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    if (typing) return;

    if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      goPrevMonth();
    }
    if (e.key === 'ArrowRight' || e.key === 'PageDown') {
      e.preventDefault();
      goNextMonth();
    }
  };

  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}, [goPrevMonth, goNextMonth]);

  const openDate = (day) => {
    const date = new Date(viewYear, viewMonth, day);
    const dateKey = toKey(date);
    navigate(`/view-date/${dateKey}`);
  };

  // Build cells
  const cells = [];
  for (const d of weekDays) {
    cells.push(<div key={'h' + d} className="calendar-cell header">{d}</div>);
  }
  for (let i = 0; i < firstDay; i++) {
    cells.push(<div key={'e' + i} className="calendar-cell" />);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(viewYear, viewMonth, day);
    const dateKey = toKey(date);
    const events = eventsByDate[dateKey] || [];
    const isToday = dateKey === todayKey;

    const label = `${date.toLocaleDateString(undefined, {
      weekday:'long', month:'long', day:'numeric', year:'numeric'
    })}${events.length ? `, ${events.length} event${events.length>1?'s':''}` : ''}`;

    cells.push(
      <button
        key={'d' + day}
        className={`calendar-cell day ${events.length ? 'has-events' : ''} ${isToday ? 'today' : ''}`}
        onClick={() => openDate(day)}
        type="button"
        aria-label={label}
        title={label}
      >
        <div className="day-number">{day}</div>

        {events.length > 0 && (
          <div className="event-list">
            {events.slice(0, 2).map((ev) => {
              const title = ev.title ?? ev.text ?? '';
              return (
                <div key={ev.id} className="event-title">
                  {title.length > 16 ? title.slice(0, 16) + '…' : title}
                </div>
              );
            })}
            {events.length > 2 && (
              <div className="event-more">+{events.length - 2} more</div>
            )}
          </div>
        )}
      </button>
    );
  }

  const monthName = useMemo(() => {
    return new Date(viewYear, viewMonth, 1).toLocaleString(undefined, {
      month: 'long', year: 'numeric'
    });
  }, [viewYear, viewMonth]);

  return (
    <section className="calendar-page">
      <div className="calendar-controls">
        <button type="button" onClick={goPrevMonth} aria-label="Previous month">◀</button>
        <div className="current-month" aria-live="polite">{monthName}</div>
        <button type="button" onClick={goNextMonth} aria-label="Next month">▶</button>
        <button type="button" onClick={goToday} aria-label="Jump to today">Today</button>
      </div>

      <h2>Club Calendar</h2>
      <p className="calendar-note">Click a date to view and (if logged in) add events for that day.</p>

      <div id="calendarGrid" className="calendar-grid" key={`${viewYear}-${viewMonth}`}>
        {cells}
      </div>
    </section>
  );
}
