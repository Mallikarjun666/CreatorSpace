
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './Settings.css';

export default function Settings() {
  const { user, logout } = useAuth();

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('creatorSpaceTheme') || 'light';
  });

  const [message, setMessage] = useState('');

  function changeTheme(value) {
    setTheme(value);

    localStorage.setItem('creatorSpaceTheme', value);
    document.documentElement.setAttribute('data-theme', value);

    setMessage(`Appearance changed to ${value} mode.`);
  }

  return (
    <section className="settings-page">
      <header className="settings-heading">
        <h1>Settings</h1>
        <p>Manage your CreatorSpace account and preferences.</p>
      </header>

      {/* Account information */}
      <div className="settings-card">
        <h2>Account</h2>

        <div className="settings-row">
          <span>Name</span>
          <strong>{user?.name || 'Not available'}</strong>
        </div>

        <div className="settings-row">
          <span>Email</span>
          <strong>{user?.email || 'Not available'}</strong>
        </div>

        <div className="settings-row">
          <span>Account type</span>
          <strong>{user?.role || 'Not available'}</strong>
        </div>
      </div>

      {/* Appearance settings */}
      
      {/* Security settings */}
      <div className="settings-card settings-security-card">
        <h2>Security</h2>
        <p>Sign out of your CreatorSpace account on this device.</p>

        <button
          type="button"
          className="settings-signout-btn"
          onClick={logout}
        >
          Sign out
        </button>
      </div>
    </section>
  );
}