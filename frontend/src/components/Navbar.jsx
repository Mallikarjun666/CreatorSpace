
import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, assetUrl } from '../api';
import CameraLogo from './CameraLogo';

const links = [
  { label: 'Home', to: '/c/home', icon: '⌂', role: 'creator' },
  { label: 'Home', to: '/b/home', icon: '⌂', role: 'brand' },
  { label: 'Briefs', to: '/briefs', icon: '▤' },
  { label: 'Notifications', to: '/notifications', icon: '♧' },
  { label: 'Messages', to: '/messages', icon: '✉' },
  { label: 'Projects', to: '/projects', icon: '▦' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [photo, setPhoto] = useState('');

  // Load the saved creator profile photo.
  useEffect(() => {
    let cancelled = false;

    async function loadPhoto() {
      if (user?.role !== 'creator') {
        setPhoto('');
        return;
      }

      try {
        const profile = await api.get('/creator/profile');

        if (!cancelled) {
          setPhoto(profile?.profile_picture_url || '');
        }
      } catch {
        if (!cancelled) setPhoto('');
      }
    }

    loadPhoto();

    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.role]);

  async function handleSearch(event) {
    event.preventDefault();

    const term = query.trim();

    if (!term) {
      setResults([]);
      setSearchError('Enter something to search.');
      setShowResults(true);
      return;
    }

    setSearching(true);
    setSearchError('');
    setResults([]);
    setShowResults(true);

    try {
      const [creatorResponse, briefResponse, postResponse] =
        await Promise.allSettled([
          api.get('/creators', { q: term }),
          api.get('/briefs', { q: term }),
          api.get('/posts'),
        ]);

      const matches = [];
      const searchTerm = term.toLowerCase();

      if (creatorResponse.status === 'fulfilled') {
        const creators = Array.isArray(creatorResponse.value)
          ? creatorResponse.value
          : [];

        creators
          .filter((creator) =>
            [
              creator.name,
              creator.headline,
              creator.specialization,
              creator.bio,
              ...(Array.isArray(creator.skills) ? creator.skills : []),
            ]
              .filter(Boolean)
              .join(' ')
              .toLowerCase()
              .includes(searchTerm)
          )
          .slice(0, 5)
          .forEach((creator) => {
            matches.push({
              key: `creator-${creator.id}`,
              type: 'Creator',
              title: creator.name || 'Creator',
              subtitle: creator.headline || 'Creator profile',
              image: creator.profile_picture_url || '',
              destination: '/discover',
            });
          });
      }

      if (briefResponse.status === 'fulfilled') {
        const briefs = Array.isArray(briefResponse.value)
          ? briefResponse.value
          : [];

        briefs
          .filter((brief) =>
            [brief.title, brief.brand_name, brief.description]
              .filter(Boolean)
              .join(' ')
              .toLowerCase()
              .includes(searchTerm)
          )
          .slice(0, 5)
          .forEach((brief) => {
            matches.push({
              key: `brief-${brief.id}`,
              type: 'Brief',
              title: brief.title || 'Campaign brief',
              subtitle: brief.brand_name || 'Campaign',
              destination: '/briefs',
            });
          });
      }

      if (postResponse.status === 'fulfilled') {
        const posts = Array.isArray(postResponse.value)
          ? postResponse.value
          : [];

        posts
          .filter((post) =>
            [post.text, post.author_name, post.kind]
              .filter(Boolean)
              .join(' ')
              .toLowerCase()
              .includes(searchTerm)
          )
          .slice(0, 5)
          .forEach((post) => {
            matches.push({
              key: `post-${post.id}`,
              type: 'Post',
              title: (post.text || 'Post').slice(0, 90),
              subtitle: `By ${post.author_name || 'CreatorSpace member'}`,
              destination:
                user?.role === 'creator' ? '/c/home' : '/b/home',
            });
          });
      }

      setResults(matches);

      if (
        creatorResponse.status === 'rejected' &&
        briefResponse.status === 'rejected' &&
        postResponse.status === 'rejected'
      ) {
        setSearchError('Search failed. Check that your backend is running.');
      } else if (matches.length === 0) {
        setSearchError('No matching creators, posts, or briefs found.');
      }
    } catch {
      setSearchError('Something went wrong. Please try again.');
    } finally {
      setSearching(false);
    }
  }

  function openResult(result) {
    setShowResults(false);

    navigate(
      `${result.destination}?${new URLSearchParams({
        search: query.trim(),
      }).toString()}`
    );
  }

  function clearSearch() {
    setQuery('');
    setResults([]);
    setSearchError('');
    setShowResults(false);
  }

  function handleLogout() {
    logout();
    navigate('/', { replace: true });
  }

  const initials = (user?.name || 'U').trim().charAt(0).toUpperCase();

  return (
    <header className="market-navbar">
      {/* Camera-C logo only */}
      <NavLink
        to={user?.role === 'creator' ? '/c/home' : '/b/home'}
        className="market-logo"
        aria-label="CreatorSpace home"
        title="CreatorSpace"
      >
        <CameraLogo small />
      </NavLink>

      {/* Search bar */}
      <div className="market-search-wrapper">
        <form className="market-search" onSubmit={handleSearch}>
          <button
            type="submit"
            className="market-search-icon"
            aria-label="Search"
            disabled={searching}
          >
            {searching ? '…' : ''}
          </button>

          <input
            type="search"
            placeholder="Search creators, posts, briefs..."
            aria-label="Search CreatorSpace"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSearchError('');

              if (!event.target.value.trim()) {
                setResults([]);
                setShowResults(false);
              }
            }}
            onFocus={() => {
              if (results.length || searchError) setShowResults(true);
            }}
          />

          {query && (
            <button
              type="button"
              className="market-search-clear"
              aria-label="Clear search"
              onClick={clearSearch}
            >
              ×
            </button>
          )}

          
<button
  type="submit"
  className="market-search-submit"
  aria-label="Submit search"
  title="Search"
  disabled={searching}
>
  {searching ? '…' : '⌕'}
</button>
        </form>

        {showResults && (
          <div className="market-search-results">
            {searching ? (
              <p className="market-search-message">Searching...</p>
            ) : results.length > 0 ? (
              results.map((result) => (
                <button
                  type="button"
                  className="market-search-result"
                  key={result.key}
                  onClick={() => openResult(result)}
                >
                  {result.type === 'Creator' &&
                    (result.image ? (
                      <img
                        src={assetUrl(result.image)}
                        alt=""
                        className="market-search-avatar"
                      />
                    ) : (
                      <span className="market-search-avatar market-avatar-fallback">
                        {result.title.charAt(0).toUpperCase()}
                      </span>
                    ))}

                  <span className="market-search-result-text">
                    <strong>{result.title}</strong>
                    <small>{result.type} · {result.subtitle}</small>
                  </span>
                </button>
              ))
            ) : (
              <p className="market-search-message">
                {searchError || 'No results found.'}
              </p>
            )}

            <button
              type="button"
              className="market-search-close"
              onClick={() => setShowResults(false)}
            >
              Close
            </button>
          </div>
        )}
      </div>

      {/* Navigation links */}
      <nav className="market-nav-links">
        {links
          .filter((link) => !link.role || link.role === user?.role)
          .map((link) => (
            <NavLink
              key={link.label + link.to}
              to={link.to}
              className={({ isActive }) =>
                `market-nav-link ${isActive ? 'active' : ''}`
              }
            >
              <span className="market-nav-icon">{link.icon}</span>
              <span>{link.label}</span>
            </NavLink>
          ))}

        <NavLink to="/profile" className="market-nav-link">
          {photo ? (
            <img
              src={assetUrl(photo)}
              alt="Profile"
              className="market-avatar market-avatar-image"
            />
          ) : (
            <span className="market-avatar">{initials}</span>
          )}
          <span>Profile</span>
        </NavLink>

        <button
          type="button"
          className="market-logout-btn"
          onClick={handleLogout}
        >
          Sign out
        </button>
      </nav>
    </header>
  );
}