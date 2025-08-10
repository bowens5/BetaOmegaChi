import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./style.css";
import "./HomePage.css";

export default function HomePage() {
  const navigate = useNavigate();

  // Track login status (stored as 'yes' in localStorage)
  const [isLoggedIn, setIsLoggedIn] = useState(
    typeof window !== "undefined" && localStorage.getItem("loggedIn") === "yes"
  );

  // Keep in sync if login changes in another tab
  useEffect(() => {
    const handleStorage = () => {
      setIsLoggedIn(localStorage.getItem("loggedIn") === "yes");
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const login = () => navigate("/login");
  const logout = () => {
    localStorage.removeItem("loggedIn");
    setIsLoggedIn(false);
  };

  return (
    <div className="homepage-container">
      

      <main className="homepage-main">
        <section className="homepage-intro">
          <h1>Welcome to Beta Omega Chi</h1>
          <p>
            Beta Omega Chi is a Christ-centered social club at Harding University focused on brotherhood,
            service, and growth. We host weekly meetings, campus events, and service projects. New members are
            always welcome—check the calendar for upcoming activities and important dates.
          </p>
          <div className="intro-buttons">
            <Link to="/calendar" className="btn-outline">View Calendar</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
