
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const { user } = useAuth();

  return (
    <aside className="market-sidebar">
      <section className="sidebar-profile">
        <div className="sidebar-cover" />

        <div className="sidebar-avatar">
          {user?.name?.charAt(0)?.toUpperCase() || 'U'}
        </div>

        <h3>{user?.name || 'CreatorSpace Member'}</h3>

        <p>
          {user?.role === 'brand' ? 'Brand Member' : 'Creator Member'}
        </p>
      </section>

      <nav className="sidebar-menu">
        <NavLink to="/discover">Discover Creators</NavLink>
        <NavLink to="/profile">My Profile</NavLink>
        <NavLink to="/projects">My Projects</NavLink>
        <NavLink to="/briefs">Campaign Briefs</NavLink>
        <NavLink to="/saved">Saved Posts</NavLink>
        <NavLink to="/settings">Settings</NavLink>
      </nav>
    </aside>
  );
}