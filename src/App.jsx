import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './LoginPage';
import CalendarPage from './CalendarPage';
import EventsPage from "./EventsPage";
import NavBar from './NavBar';
import HomePage from './HomePage';
import ViewDatePage from './ViewDatePage';
import './style.css';


function App() {
  return (
    <BrowserRouter basename="/BetaOmegaChi">
      <NavBar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/view-date/:dateKey" element={<ViewDatePage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/events" element={<EventsPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
