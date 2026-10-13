
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import './Briefs.css';

function formatBudget(budget) {
  if (budget == null) return 'Budget not specified';
  return `₹${Number(budget).toLocaleString('en-IN')}`;
}

export default function Briefs() {
  const [briefs, setBriefs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [contentType, setContentType] = useState('All');

  const loadBriefs = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await api.get('/briefs');
      setBriefs(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Could not load campaign briefs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchBriefs() {
      try {
        const data = await api.get('/briefs');
        if (!cancelled) {
          setBriefs(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Could not load campaign briefs.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchBriefs();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredBriefs = briefs.filter((brief) => {
    const term = search.toLowerCase();

    const matchesSearch =
      (brief.title || '').toLowerCase().includes(term) ||
      (brief.description || '').toLowerCase().includes(term) ||
      (brief.brand_name || '').toLowerCase().includes(term) ||
      (brief.style || '').toLowerCase().includes(term);

    const matchesType =
      contentType === 'All' || brief.content_type === contentType;

    return matchesSearch && matchesType;
  });

  return (
    <main className="briefs-page">
      <header className="briefs-header">
        <div>
          <p className="briefs-eyebrow">CREATORSPACE MARKETPLACE</p>
          <h1>Campaign Briefs</h1>
          <p>Discover creative opportunities and find your next collaboration.</p>
        </div>

        <button
          className="briefs-refresh"
          type="button"
          onClick={loadBriefs}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </header>

      <section className="briefs-toolbar">
        <input
          type="search"
          aria-label="Search campaigns"
          placeholder="Search campaigns, brands, or styles..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <select
          aria-label="Filter by content type"
          value={contentType}
          onChange={(event) => setContentType(event.target.value)}
        >
          <option value="All">All content types</option>
          <option value="Video">Video</option>
          <option value="Image">Image</option>
          <option value="Animation">Animation</option>
        </select>
      </section>

      {error && (
        <div className="briefs-error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={loadBriefs}>
            Try again
          </button>
        </div>
      )}

      {loading ? (
        <p className="briefs-status">Loading campaigns...</p>
      ) : filteredBriefs.length === 0 ? (
        <section className="briefs-empty">
          <h2>No campaigns found</h2>
          <p>
            {briefs.length === 0
              ? 'Published campaign briefs will appear here.'
              : 'Try changing your search or content-type filter.'}
          </p>
        </section>
      ) : (
        <section className="briefs-grid" aria-label="Campaign listings">
          {filteredBriefs.map((brief) => (
            <article className="brief-card" key={brief.id}>
              <div className="brief-card-top">
                <span className="brief-type">
                  {brief.content_type}
                </span>
                <span className="brief-ratio">
                  {brief.aspect_ratio}
                </span>
              </div>

              <p className="brief-brand">
                {brief.brand_name || 'CreatorSpace brand'}
              </p>

              <h2>{brief.title}</h2>

              <p className="brief-description">
                {brief.description || 'No campaign description provided.'}
              </p>

              {brief.style && (
                <p className="brief-detail">
                  <strong>Style:</strong> {brief.style}
                </p>
              )}

              <div className="brief-card-footer">
                <div>
                  <span className="brief-meta-label">Budget</span>
                  <strong>{formatBudget(brief.budget)}</strong>
                </div>

                <div>
                  <span className="brief-meta-label">Deadline</span>
                  <strong>
                    {brief.deadline
                      ? new Date(`${brief.deadline}T00:00:00`).toLocaleDateString(
                          'en-IN',
                          {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          }
                        )
                      : 'Flexible'}
                  </strong>
                </div>
              </div>

              {brief.commercial_use && (
                <p className="brief-commercial">
                  Commercial use: {brief.commercial_use}
                </p>
              )}
            </article>
          ))}
        </section>
      )}
    </main>
  );
}