import React from 'react';

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';

function LoginPage() {
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === '2004') {
      localStorage.setItem('loggedIn', 'yes');
      navigate('/'); // Redirect to HomePage after login
    } else {
      alert('Incorrect password');
    }
  };

  return (
    <section id="login">
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <label htmlFor="password">Password:</label>
        <input
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Login</button>
      </form>
    </section>
  );
}

export default LoginPage;