// src/CalendarPage.jsx
//
// Monthly calendar grid.  Fetches events for the visible month from Firestore
// in real time and renders each day as a clickable button.  Supports:
//   • Previous/Next/Today controls
//   • Keyboard navigation  (← → PageUp PageDown = months, T = today)
//   • Swipe-to-change-month on touch devices

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './style.css';
import './CalendarPage.css';

import { db } from './firebase';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import log from './logger';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Converts a Date to a "YYYY-MM-DD" Firestore dateKey. */
function toKey(d) {
  const y  = d.getFullYear();
  const m  = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/**
 * Returns the first and last dateKey strings for a given month.
 * @param {number} year  - Full year (e.g. 2025)
 * @param {number} month - 0-based month index (0 = January)
 */
function monthKeyRange(year, month) {
  const mm   = String(month + 1).padStart(2, '0');
  const start = `${year}-${mm}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const end     = `${year}-${mm}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

/** Converts a 24-hour "HH:MM" string to a 12-hour "h:mm AM/PM" string. */
function formatTime12h(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = ((h + 11) % 12) + 1;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

// ---------------------------------------------------------------------------
// Swipe gesture thresholds — tune here if swipe feels too sensitive/loose
// ---------------------------------------------------------------------------
const SWIPE_MIN_PX   = 48;   // minimum horizontal distance (px)
const SWIPE_MAX_DEG  = 30;   // maximum angle from horizontal (degrees)
const SWIPE_MAX_MS   = 800;  // maximum gesture duration (ms)

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CalendarPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const today    = new Date();
  const todayKey = toKey(today);

  const [viewYear,     setViewYear]     = useState(today.getFullYear());
  const [viewMonth,    setViewMonth]    = useState(today.getMonth()); // 0–11
  const [eventsByDate, setEventsByDate] = useState({});

  // If navigating back from ViewDatePage, restore the month that was open.
  useEffect(() => {
    if (
      location?.state &&
      Number.isInteger(location.state.year) &&
      Number.isInteger(location.state.month)
    ) {
      log.info('CalendarPage: restoring month from navigation state', location.state);
      setViewYear(location.state.year);
      setViewMonth(location.state.month);
    }
    // Only run on mount; location.state is only meaningful on initial load here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------------
  // Live Firestore subscription for the visible month
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const { start, end } = monthKeyRange(viewYear, viewMonth);
    log.firebase(`CalendarPage: subscribing to events ${start} → ${end}`);

    const qRef = query(
      collection(db, 'events'),
      where('dateKey', '>=', start),
      where('dateKey', '<=', end),
      orderBy('dateKey', 'asc')
    );

    const unsub = onSnapshot(
      qRef,
      (snap) => {
        log.firebase(`CalendarPage: snapshot — ${snap.size} event(s) for month`);

        // Group events by dateKey so each calendar cell can look up its list in O(1).
        const map = {};
        snap.forEach((docSnap) => {
          const ev = { id: docSnap.id, ...docSnap.data() };
          if (!map[ev.dateKey]) map[ev.dateKey] = [];
          map[ev.dateKey].push(ev);
        });
        setEventsByDate(map);
      },
      (err) => {
        log.error('CalendarPage: Firestore snapshot error', err);
      }
    );

    return () => {
      log.firebase('CalendarPage: unsubscribing');
      unsub();
    };
  }, [viewYear, viewMonth]);

  // ---------------------------------------------------------------------------
  // Month navigation
  // ---------------------------------------------------------------------------

  const goPrevMonth = () => {
    const d = new Date(viewYear, viewMonth - 1, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };
  const goNextMonth = () => {
    const d = new Date(viewYear, viewMonth + 1, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };
  const goToday = () => {
    const t = new Date();
    setViewYear(t.getFullYear());
    setViewMonth(t.getMonth());
  };

  // Keyboard shortcuts — only fires when the user isn't typing in a field.
  useEffect(() => {
    const onKey = (e) => {
      const target  = e.target;
      const isTyping = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
      if (isTyping) return;

      if (e.key === 'ArrowLeft'  || e.key === 'PageUp')   { e.preventDefault(); goPrevMonth(); }
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); goNextMonth(); }
      if (e.key === 't'          || e.key === 'T')         { e.preventDefault(); goToday();     }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewYear, viewMonth]);

  // ---------------------------------------------------------------------------
  // Swipe gesture (Pointer Events API)
  //
  // Strategy: record the pointer-down position and time, then on pointer-up
  // decide whether the motion qualifies as a horizontal swipe.  If it does we
  // flip the month AND set a short-lived flag so the subsequent "click" event
  // fired by the browser doesn't accidentally open a day.
  // ---------------------------------------------------------------------------

  const pointerStart = useRef({ x: 0, y: 0 });
  const isDragging   = useRef(false);
  const didSwipe     = useRef(false);
  const pointerTime  = useRef(0);

  // Set the flag and clear it after the synthetic click fires (next tick).
  const markSwipeAndClear = () => {
    didSwipe.current = true;
    setTimeout(() => { didSwipe.current = false; }, 0);
  };

  const onPointerDown = (e) => {
    if (e.pointerType !== 'touch' && e.button !== 0) return;
    isDragging.current   = true;
    pointerTime.current  = performance.now();
    pointerStart.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (/* e */) => {
    // Decision is deferred to pointer-up so we don't need to do anything here.
  };

  const onPointerUp = (e) => {
    if (!isDragging.current) return;
    isDragging.current = false;

    const elapsed   = performance.now() - pointerTime.current;
    const dx        = e.clientX - pointerStart.current.x;
    const dy        = e.clientY - pointerStart.current.y;
    const angle     = Math.abs(Math.atan2(dy, dx) * (180 / Math.PI));
    const isHoriz   = angle <= SWIPE_MAX_DEG || angle >= (180 - SWIPE_MAX_DEG);
    const longEnough = Math.abs(dx) >= SWIPE_MIN_PX;
    const fastEnough = elapsed <= SWIPE_MAX_MS;

    if (isHoriz && longEnough && fastEnough) {
      log.info(`CalendarPage: swipe ${dx < 0 ? 'left (next)' : 'right (prev)'} — dx=${dx}px, dt=${Math.round(elapsed)}ms`);
      dx < 0 ? goNextMonth() : goPrevMonth();
      markSwipeAndClear();
    }
  };

  const openDate = (day) => {
    if (didSwipe.current) return; // swipe ended on this cell — ignore the synthetic click
    const dateKey = toKey(new Date(viewYear, viewMonth, day));
    log.info('CalendarPage: opening date', dateKey);
    navigate(`/view-date/${dateKey}`);
  };

  // ---------------------------------------------------------------------------
  // Calendar grid
  // ---------------------------------------------------------------------------

  const weekDays    = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const firstOfMonth = useMemo(() => new Date(viewYear, viewMonth, 1), [viewYear, viewMonth]);
  const firstDay     = firstOfMonth.getDay(); // 0 (Sun) – 6 (Sat)
  const daysInMonth  = new Date(viewYear, viewMonth + 1, 0).getDate();

  const monthName = useMemo(() =>
    new Date(viewYear, viewMonth, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' }),
    [viewYear, viewMonth]
  );

  // Build the flat array of cells: header row + leading blanks + day buttons.
  const cells = [];

  // Day-of-week header row
  for (const day of weekDays) {
    cells.push(<div key={'h' + day} className="calendar-cell header">{day}</div>);
  }

  // Blank cells before the 1st of the month
  for (let i = 0; i < firstDay; i++) {
    cells.push(<div key={'e' + i} className="calendar-cell" />);
  }

  // One button per day
  for (let day = 1; day <= daysInMonth; day++) {
    const date    = new Date(viewYear, viewMonth, day);
    const dateKey = toKey(date);
    const isToday = dateKey === todayKey;

    // Sort the day's events: all-day first, then by start time.
    const events = [...(eventsByDate[dateKey] || [])].sort((a, b) => {
      const aIsAllDay = a.allDay ? 1 : 0;
      const bIsAllDay = b.allDay ? 1 : 0;
      if (aIsAllDay !== bIsAllDay) return bIsAllDay - aIsAllDay;
      return (a.startTime || '99:99').localeCompare(b.startTime || '99:99');
    });

    const ariaLabel = `${date.toLocaleDateString(undefined, {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    })}${events.length ? `, ${events.length} event${events.length > 1 ? 's' : ''}` : ''}`;

    cells.push(
      <button
        key={'d' + day}
        className={`calendar-cell day ${events.length ? 'has-events' : ''} ${isToday ? 'today' : ''}`}
        onClick={() => openDate(day)}
        type="button"
        aria-label={ariaLabel}
        title={ariaLabel}
      >
        <div className="day-number">{day}</div>

        {events.length > 0 && (
          <div className="event-list">
            {/* Show at most 2 event titles to keep cells compact */}
            {events.slice(0, 2).map((ev) => {
              const title = ev.title ?? ev.text ?? '';
              const when  = ev.allDay
                ? 'All Day'
                : ev.startTime
                  ? `${formatTime12h(ev.startTime)}${ev.endTime ? '–' + formatTime12h(ev.endTime) : ''}`
                  : '';
              return (
                <div key={ev.id} className="event-title">
                  {title.length > 16 ? title.slice(0, 16) + '…' : title}
                  <div className="event-time">{when}</div>
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

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <section className="calendar-page">

      <div className="calendar-controls">
        <button type="button" onClick={goPrevMonth} aria-label="Previous month">◀</button>
        <div className="current-month" aria-live="polite">{monthName}</div>
        <button type="button" onClick={goNextMonth} aria-label="Next month">▶</button>
        <button type="button" onClick={goToday}     aria-label="Jump to today">Today</button>
      </div>

      <h2>Club Calendar</h2>
      <p className="calendar-note">Click a date to view and (if logged in) add events for that day.</p>

      <div
        id="calendarGrid"
        className="calendar-grid"
        key={`${viewYear}-${viewMonth}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {cells}
      </div>

    </section>
  );
}
