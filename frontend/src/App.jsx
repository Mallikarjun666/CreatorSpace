
import { Navigate, Route, Routes } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import Settings from './pages/Settings';
import Projects from './pages/Projects';
import Notifications from './pages/Notifications';
import Briefs from './pages/Briefs';
import AuthPage from './pages/AuthPage';
import CreatorDashboard from './pages/Creator/CreatorDashboard';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import { useAuth } from './context/AuthContext';
import { api, assetUrl } from './api';
import CreatorProfile from './pages/Creator/CreatorProfile';
import CreatorDiscovery from './pages/Creator/CreatorDiscovery';
import Messages from './pages/Messages';

function ProtectedRoute({ children, role }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/" replace />;

  if (role && user.role !== role) {
    return (
      <Navigate
        to={user.role === 'creator' ? '/c/home' : '/b/home'}
        replace
      />
    );
  }

  return children;
}

function MarketplaceLayout({ children }) {
  return (
    <>
      <Navbar />

      <div className="market-layout">
        <Sidebar />

        <main className="market-main">{children}</main>

        <aside className="market-right">
          <section className="market-panel">
            <h3>Discover CreatorSpace</h3>
            <p>
              Explore creators, campaign briefs, and new opportunities.
            </p>
          </section>

          <section className="market-panel">
            <h3>Quick links</h3>
            <p>Find campaigns that match your creative goals.</p>
          </section>
        </aside>
      </div>
    </>
  );
}

// ---------------- BRAND DASHBOARD ----------------

function BrandDashboard() {
  const { user } = useAuth();

  const emptyForm = {
    title: '',
    description: '',
    content_type: 'Video',
    aspect_ratio: '9:16',
    style: '',
    budget: '',
    deadline: '',
    commercial_use: '',
  };

  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function updateField(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('');
    setError('');
    setSubmitting(true);

    try {
      await api.post('/briefs', {
        ...form,
        title: form.title.trim(),
        budget: form.budget === '' ? null : Number(form.budget),
        deadline: form.deadline || null,
      });

      setMessage('Campaign brief published successfully!');
      setForm({ ...emptyForm });
    } catch (err) {
      setError(err.message || 'Could not publish campaign brief.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <MarketplaceLayout>
      <section className="dashboard-welcome">
        <h1>Welcome{user?.name ? `, ${user.name}` : ''}!</h1>
        <p>Publish campaigns and discover AI creators.</p>
      </section>

      <section className="dashboard-section">
        <h2>Create a campaign brief</h2>

        <form
          className="dashboard-item brand-campaign-form"
          onSubmit={handleSubmit}
        >
          <label>
            Campaign title
            <input
              name="title"
              value={form.title}
              onChange={updateField}
              required
              maxLength={200}
            />
          </label>

          <label>
            Description
            <textarea
              name="description"
              value={form.description}
              onChange={updateField}
              maxLength={5000}
              rows={4}
            />
          </label>

          <label>
            Content type
            <select
              name="content_type"
              value={form.content_type}
              onChange={updateField}
            >
              <option value="Video">Video</option>
              <option value="Image">Image</option>
              <option value="Animation">Animation</option>
            </select>
          </label>

          <label>
            Aspect ratio
            <select
              name="aspect_ratio"
              value={form.aspect_ratio}
              onChange={updateField}
            >
              <option value="9:16">9:16</option>
              <option value="16:9">16:9</option>
              <option value="1:1">1:1</option>
            </select>
          </label>

          <label>
            Visual style
            <input
              name="style"
              value={form.style}
              onChange={updateField}
              maxLength={100}
            />
          </label>

          <label>
            Budget (₹)
            <input
              type="number"
              name="budget"
              value={form.budget}
              onChange={updateField}
              min="0"
            />
          </label>

          <label>
            Deadline
            <input
              type="date"
              name="deadline"
              value={form.deadline}
              onChange={updateField}
            />
          </label>

          <label>
            Commercial use
            <input
              name="commercial_use"
              value={form.commercial_use}
              onChange={updateField}
              maxLength={150}
            />
          </label>

          {message && <p role="status">{message}</p>}
          {error && <p role="alert">{error}</p>}

          <button className="btn" type="submit" disabled={submitting}>
            {submitting ? 'Publishing...' : 'Publish campaign'}
          </button>
        </form>
      </section>
    </MarketplaceLayout>
  );
}

// ---------------- SAVED POSTS ----------------

function SavedPosts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [removingId, setRemovingId] = useState(null);

  const loadSavedPosts = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.get('/saved');
      setPosts(Array.isArray(response) ? response : []);
    } catch (err) {
      setError(err.message || 'Could not load saved posts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSavedPosts();
  }, [loadSavedPosts]);

  async function removeSavedPost(postId) {
    if (removingId !== null) return;

    setRemovingId(postId);
    setError('');

    try {
      await api.post(`/posts/${postId}/save`, {});
      setPosts((current) =>
        current.filter((post) => post.id !== postId)
      );
    } catch (err) {
      setError(err.message || 'Could not remove saved post.');
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <section className="saved-posts-page">
      <header className="saved-posts-header">
        <div>
          <h1>Saved Posts</h1>
          <p>Posts you have saved for later.</p>
        </div>

        <button
          type="button"
          onClick={loadSavedPosts}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </header>

      {error && (
        <div role="alert" className="market-panel">
          <p>{error}</p>
          <button type="button" onClick={loadSavedPosts}>
            Try again
          </button>
        </div>
      )}

      {loading ? (
        <section className="market-panel">
          <p>Loading your saved posts...</p>
        </section>
      ) : posts.length === 0 && !error ? (
        <section className="market-panel">
          <h2>No saved posts yet</h2>
          <p>
            When you save a post from your feed, it will appear here.
          </p>
        </section>
      ) : (
        <div className="saved-posts-list">
          {posts.map((post) => (
            <article
              className="market-panel saved-post-card"
              key={post.id}
            >
              <div className="saved-post-top">
                <div>
                  <h3>{post.author_name || 'CreatorSpace member'}</h3>
                  <p>
                    {post.author_role || 'Member'} · {post.kind || 'Update'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => removeSavedPost(post.id)}
                  disabled={removingId !== null}
                >
                  {removingId === post.id ? 'Removing...' : 'Unsave'}
                </button>
              </div>

              {post.text && (
                <p className="saved-post-text">{post.text}</p>
              )}

              {Array.isArray(post.images) && post.images.length > 0 && (
                <div className="saved-post-images">
                  {post.images.map((image, index) => (
                    <img
                      key={`${post.id}-${image}-${index}`}
                      src={assetUrl(image)}
                      alt={`Post attachment ${index + 1}`}
                      className="saved-post-image"
                      loading="lazy"
                    />
                  ))}
                </div>
              )}

              <p className="saved-post-stats">
                {post.likes_count ?? 0} likes
                {' · '}
                {post.comments?.length ?? 0} comments
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

// ---------------- BRAND PROFILE ----------------

function BrandProfile() {
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    company: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await api.get('/brand/profile');

      setProfile({
        name: data.name || '',
        email: data.email || '',
        company: data.company || '',
      });
    } catch (err) {
      setError(err.message || 'Could not load brand profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  function updateField(event) {
    const { name, value } = event.target;

    setProfile((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('');
    setError('');

    const name = profile.name.trim();
    const company = profile.company.trim();

    if (!name) {
      setError('Brand name cannot be empty.');
      return;
    }

    setSaving(true);

    try {
      const updated = await api.put('/brand/profile', {
        name,
        company,
      });

      setProfile({
        name: updated.name || '',
        email: updated.email || '',
        company: updated.company || '',
      });

      setMessage('Brand profile updated successfully!');
    } catch (err) {
      setError(err.message || 'Could not update brand profile.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="market-panel">
        <p>Loading brand profile...</p>
      </section>
    );
  }

  return (
    <section className="market-panel brand-profile-page">
      <h1>Brand Profile</h1>
      <p>Manage your brand account details.</p>

      {error && <p role="alert">{error}</p>}

      <form className="brand-campaign-form" onSubmit={handleSubmit}>
        <label>
          Brand / Account Name
          <input
            name="name"
            value={profile.name}
            onChange={updateField}
            maxLength={150}
            required
          />
        </label>

        <label>
          Company Name
          <input
            name="company"
            value={profile.company}
            onChange={updateField}
            maxLength={200}
            placeholder="Enter your company name"
          />
        </label>

        <label>
          Email Address
          <input type="email" value={profile.email} readOnly />
        </label>

        {message && <p role="status">{message}</p>}

        <button className="btn" type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>

        <button
          type="button"
          onClick={loadProfile}
          disabled={saving || loading}
        >
          Reload Profile
        </button>
      </form>
    </section>
  );
}

// ---------------- PROFILE ROUTER ----------------

function MyProfilePage() {
  const { user } = useAuth();

  return (
    <MarketplaceLayout>
      {user?.role === 'creator' ? (
        <CreatorProfile />
      ) : (
        <BrandProfile />
      )}
    </MarketplaceLayout>
  );
}

function PlaceholderPage({ title }) {
  return (
    <MarketplaceLayout>
      <section className="market-panel">
        <h2>{title}</h2>
        <p>This section will be available in a future step.</p>
      </section>
    </MarketplaceLayout>
  );
}

// ---------------- APP ROUTES ----------------

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AuthPage />} />

      <Route
        path="/discover"
        element={
          <ProtectedRoute>
            <MarketplaceLayout>
              <CreatorDiscovery />
            </MarketplaceLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/c/home"
        element={
          <ProtectedRoute role="creator">
            <MarketplaceLayout>
              <CreatorDashboard />
            </MarketplaceLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/b/home"
        element={
          <ProtectedRoute role="brand">
            <BrandDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/briefs"
        element={
          <ProtectedRoute>
            <MarketplaceLayout>
              <Briefs />
            </MarketplaceLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <MarketplaceLayout>
              <Notifications />
            </MarketplaceLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/messages"
        element={
          <ProtectedRoute>
            <MarketplaceLayout>
              <Messages />
            </MarketplaceLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/projects"
        element={
          <ProtectedRoute>
            <MarketplaceLayout>
              <Projects />
            </MarketplaceLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <MyProfilePage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/saved"
        element={
          <ProtectedRoute>
            <MarketplaceLayout>
              <SavedPosts />
            </MarketplaceLayout>
          </ProtectedRoute>
        }
      />

      <Route
  path="/settings"
  element={
    <ProtectedRoute>
      <MarketplaceLayout>
        <Settings />
      </MarketplaceLayout>
    </ProtectedRoute>
  }
/>

      <Route path="/c/*" element={<Navigate to="/c/home" replace />} />
      <Route path="/b/*" element={<Navigate to="/b/home" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}