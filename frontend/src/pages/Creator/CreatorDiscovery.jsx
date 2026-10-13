
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, assetUrl } from '../../api';
import './CreatorDiscovery.css';

const initialFilters = {
  q: '',
  skill: '',
  specialization: '',
  tools: '',
  content_type: '',
  aspect_ratio: '',
  verified_only: false,
};

function splitList(value) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

export default function CreatorDiscovery() {
  const navigate = useNavigate();

  const [filters, setFilters] = useState(initialFilters);
  const [creators, setCreators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadCreators() {
      try {
        const data = await api.get('/creators');
        if (!cancelled) {
          setCreators(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Could not load creators.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadCreators();

    return () => {
      cancelled = true;
    };
  }, []);

  function updateFilter(event) {
    const { name, value, checked, type } = event.target;

    setFilters((previous) => ({
      ...previous,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }

  async function searchCreators(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSelectedProfile(null);
    setProfileError('');

    const params = {
      q: filters.q.trim() || undefined,
      skill: filters.skill.trim() || undefined,
      specialization: filters.specialization.trim() || undefined,
      tools: splitList(filters.tools),
      content_type: filters.content_type || undefined,
      aspect_ratio: filters.aspect_ratio || undefined,
      verified_only: filters.verified_only || undefined,
    };

    try {
      const data = await api.get('/creators', params);
      setCreators(data);
    } catch (err) {
      setError(err.message || 'Could not search creators.');
    } finally {
      setLoading(false);
    }
  }

  async function resetFilters() {
    setFilters({ ...initialFilters });
    setSelectedProfile(null);
    setError('');
    setProfileError('');
    setLoading(true);

    try {
      const data = await api.get('/creators');
      setCreators(data);
    } catch (err) {
      setError(err.message || 'Could not load creators.');
    } finally {
      setLoading(false);
    }
  }

  async function viewProfile(creatorId) {
    setSelectedProfile(null);
    setProfileError('');
    setProfileLoading(true);

    try {
      const data = await api.get(`/creators/${creatorId}/profile`);
      setSelectedProfile(data);
    } catch (err) {
      setProfileError(
        err.message || 'Could not load this creator profile.'
      );
    } finally {
      setProfileLoading(false);
    }
  }

  function openMessages(userId) {
    const id = Number(userId);

    if (!Number.isInteger(id) || id < 1) {
      setError(
        'This creator profile does not include a valid user ID. The backend response needs to include user_id.'
      );
      return;
    }

    navigate(`/messages?user_id=${id}`);
  }

  return (
    <div className="creator-discovery">
      <header className="discovery-header">
        <p className="discovery-eyebrow">CREATORSPACE MARKETPLACE</p>
        <h1>Discover AI Creators</h1>
        <p>
          Find filmmakers, visual artists, animators, and AI-native
          creators for your next campaign.
        </p>
      </header>

      <form className="discovery-filters" onSubmit={searchCreators}>
        <h2>Find the right creator</h2>

        <label>
          Search
          <input
            name="q"
            value={filters.q}
            onChange={updateFilter}
            placeholder="Name, headline, workflow, tool..."
          />
        </label>

        <div className="discovery-filter-grid">
          <label>
            Skill
            <input
              name="skill"
              value={filters.skill}
              onChange={updateFilter}
              placeholder="e.g. Prompt engineering"
            />
          </label>

          <label>
            Specialization
            <input
              name="specialization"
              value={filters.specialization}
              onChange={updateFilter}
              placeholder="e.g. Product ads"
            />
          </label>

          <label>
            AI tools/models
            <input
              name="tools"
              value={filters.tools}
              onChange={updateFilter}
              placeholder="e.g. Runway, Midjourney"
            />
          </label>

          <label>
            Content type
            <select
              name="content_type"
              value={filters.content_type}
              onChange={updateFilter}
            >
              <option value="">All content types</option>
              <option value="Video">Video</option>
              <option value="Image">Image</option>
              <option value="Animation">Animation</option>
            </select>
          </label>

          <label>
            Aspect ratio
            <select
              name="aspect_ratio"
              value={filters.aspect_ratio}
              onChange={updateFilter}
            >
              <option value="">All formats</option>
              <option value="9:16">9:16 — Vertical</option>
              <option value="16:9">16:9 — Landscape</option>
              <option value="1:1">1:1 — Square</option>
            </select>
          </label>
        </div>

        <label className="discovery-checkbox">
          <input
            type="checkbox"
            name="verified_only"
            checked={filters.verified_only}
            onChange={updateFilter}
          />
          Show creators with verified tools only
        </label>

        <div className="discovery-filter-actions">
          <button type="submit" className="discovery-primary-button">
            Search creators
          </button>

          <button
            type="button"
            className="discovery-secondary-button"
            onClick={resetFilters}
          >
            Reset filters
          </button>
        </div>
      </form>

      {error && (
        <p className="discovery-error" role="alert">
          {error}
        </p>
      )}

      {profileError && (
        <p className="discovery-error" role="alert">
          {profileError}
        </p>
      )}

      {profileLoading && (
        <p className="discovery-message">Loading creator profile...</p>
      )}

      {selectedProfile && (
        <section className="discovery-profile">
          <div className="discovery-profile-heading">
            <div>
              <p className="discovery-eyebrow">CREATOR PROFILE</p>
              <h2>{selectedProfile.name}</h2>
              <p>{selectedProfile.headline}</p>
            </div>

            <div className="discovery-profile-actions">
              <button
                type="button"
                className="discovery-primary-button"
                onClick={() =>
                  openMessages(selectedProfile.user_id)
                }
              >
                Message
              </button>

              <button
                type="button"
                className="discovery-secondary-button"
                onClick={() => setSelectedProfile(null)}
              >
                Close profile
              </button>
            </div>
          </div>

          {selectedProfile.bio && <p>{selectedProfile.bio}</p>}

          <div className="discovery-profile-details">
            {selectedProfile.specialization && (
              <p>
                <strong>Specialization:</strong>{' '}
                {selectedProfile.specialization}
              </p>
            )}

            <p>
              <strong>Skills:</strong>{' '}
              {selectedProfile.skills?.join(', ') || 'Not added yet'}
            </p>

            <p>
              <strong>AI tools:</strong>{' '}
              {selectedProfile.tools?.join(', ') || 'Not added yet'}
            </p>

            {selectedProfile.workflow && (
              <p>
                <strong>Workflow:</strong> {selectedProfile.workflow}
              </p>
            )}
          </div>

          <div className="discovery-badges">
            {selectedProfile.verified_tools && (
              <span className="discovery-badge">Tools verified</span>
            )}

            {selectedProfile.verified_workflow && (
              <span className="discovery-badge">Workflow verified</span>
            )}

            {selectedProfile.verified_past_work && (
              <span className="discovery-badge">Past work verified</span>
            )}

            {!selectedProfile.verified_tools &&
              !selectedProfile.verified_workflow &&
              !selectedProfile.verified_past_work && (
                <span className="discovery-unverified">
                  Verification not yet established
                </span>
              )}
          </div>

          <h3>Portfolio</h3>

          {selectedProfile.portfolio_items?.length ? (
            <div className="discovery-portfolio-grid">
              {selectedProfile.portfolio_items.map((item) => (
                <article
                  className="discovery-portfolio-card"
                  key={item.id}
                >
                  {item.media_type === 'Image' ? (
                    <img
                      src={assetUrl(item.media_url)}
                      alt={item.title}
                      loading="lazy"
                    />
                  ) : (
                    <a
                      className="discovery-media-link"
                      href={assetUrl(item.media_url)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open {item.media_type.toLowerCase()} work ↗
                    </a>
                  )}

                  <div className="discovery-portfolio-content">
                    <h4>{item.title}</h4>

                    {item.description && <p>{item.description}</p>}

                    <p>
                      <strong>Format:</strong> {item.aspect_ratio}
                    </p>

                    {item.tools_used?.length > 0 && (
                      <p>
                        <strong>Tools:</strong>{' '}
                        {item.tools_used.join(', ')}
                      </p>
                    )}

                    {item.workflow && (
                      <p>
                        <strong>Workflow:</strong> {item.workflow}
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="discovery-message">
              This creator has not added portfolio work yet.
            </p>
          )}
        </section>
      )}

      <div className="discovery-results-heading">
        <h2>Creators</h2>
        {!loading && <span>{creators.length} found</span>}
      </div>

      {loading ? (
        <p className="discovery-message">Loading creators...</p>
      ) : creators.length === 0 ? (
        <section className="discovery-empty">
          <h3>No creators found</h3>
          <p>
            Try different keywords, remove a filter, or reset your search.
          </p>

          <button
            type="button"
            className="discovery-secondary-button"
            onClick={resetFilters}
          >
            Reset search
          </button>
        </section>
      ) : (
        <div className="discovery-creator-grid">
          {creators.map((creator) => (
            <article
              className="discovery-creator-card"
              key={creator.id}
            >
              <div className="discovery-creator-avatar">
                {creator.name?.charAt(0)?.toUpperCase() || 'C'}
              </div>

              <h3>{creator.name}</h3>
              <p className="discovery-headline">{creator.headline}</p>

              {creator.specialization && (
                <p className="discovery-specialization">
                  {creator.specialization}
                </p>
              )}

              {creator.bio && (
                <p className="discovery-bio">{creator.bio}</p>
              )}

              <div className="discovery-tags">
                {creator.content_type && (
                  <span>{creator.content_type}</span>
                )}

                {creator.aspect_ratio && (
                  <span>{creator.aspect_ratio}</span>
                )}

                {creator.verified_tools && (
                  <span className="discovery-verified-tag">
                    Verified tools
                  </span>
                )}
              </div>

              {creator.skills?.length > 0 && (
                <p className="discovery-card-meta">
                  <strong>Skills:</strong> {creator.skills.join(', ')}
                </p>
              )}

              <p className="discovery-card-meta">
                <strong>AI tools:</strong>{' '}
                {creator.tools?.join(', ') || 'Not listed'}
              </p>

              <div className="discovery-card-actions">
                <button
                  type="button"
                  className="discovery-primary-button discovery-view-button"
                  onClick={() => viewProfile(creator.id)}
                >
                  View profile and portfolio
                </button>

                <button
                  type="button"
                  className="discovery-secondary-button"
                  onClick={() => openMessages(creator.user_id)}
                >
                  Message
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}