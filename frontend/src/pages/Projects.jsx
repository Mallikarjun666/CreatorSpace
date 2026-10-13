
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import './Projects.css';

const STATUS_LABELS = {
  pending: 'Pending',
  accepted: 'Accepted',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const STATUS_OPTIONS = {
  pending: ['accepted', 'cancelled'],
  accepted: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

function formatDate(value) {
  if (!value) return 'Not available';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Not available';

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatStatus(status) {
  return STATUS_LABELS[status] || status || 'Unknown';
}

export default function Projects() {
  const { user } = useAuth();
  const isBrand = user?.role === 'brand';

  const [projects, setProjects] = useState([]);
  const [creators, setCreators] = useState([]);
  const [briefs, setBriefs] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [filter, setFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    creator_id: '',
    brief_id: '',
  });

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.get('/projects');
      setProjects(Array.isArray(response) ? response : []);
    } catch (err) {
      setError(err.message || 'Unable to load projects. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFormOptions = useCallback(async () => {
    if (!isBrand) return;

    setLoadingOptions(true);
    setFormError('');

    try {
      const [creatorResponse, briefResponse] = await Promise.all([
        api.get('/creators'),
        api.get('/briefs'),
      ]);

      setCreators(
        Array.isArray(creatorResponse) ? creatorResponse : []
      );

      setBriefs(
        Array.isArray(briefResponse) ? briefResponse : []
      );
    } catch (err) {
      setFormError(
        err.message || 'Unable to load creators and campaign briefs.'
      );
    } finally {
      setLoadingOptions(false);
    }
  }, [isBrand]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (isBrand) {
      loadFormOptions();
    }
  }, [isBrand, loadFormOptions]);

  function updateForm(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function createProject(event) {
    event.preventDefault();

    setFormError('');
    setNotice('');

    const title = form.title.trim();

    if (!title) {
      setFormError('Please enter a project title.');
      return;
    }

    if (!form.creator_id) {
      setFormError('Please select a creator.');
      return;
    }

    setCreating(true);

    try {
      await api.post('/projects', {
        title,
        description: form.description.trim() || null,
        creator_id: Number(form.creator_id),
        brief_id: form.brief_id ? Number(form.brief_id) : null,
      });

      setForm({
        title: '',
        description: '',
        creator_id: '',
        brief_id: '',
      });

      setShowForm(false);

      await loadProjects();

      setNotice('Project created successfully.');
    } catch (err) {
      setFormError(err.message || 'Unable to create the project.');
    } finally {
      setCreating(false);
    }
  }

  async function updateStatus(project, nextStatus) {
    if (!nextStatus || updatingId !== null) return;

    setUpdatingId(project.id);
    setError('');
    setNotice('');

    try {
      const response = await api.patch(
        `/projects/${project.id}/status`,
        { status: nextStatus }
      );

      setProjects((currentProjects) =>
        currentProjects.map((item) =>
          item.id === project.id
            ? {
                ...item,
                ...(response && typeof response === 'object'
                  ? response
                  : {}),
                status: nextStatus,
              }
            : item
        )
      );

      setNotice(
        `“${project.title}” is now ${formatStatus(nextStatus).toLowerCase()}.`
      );
    } catch (err) {
      setError(err.message || 'Unable to update project status.');
    } finally {
      setUpdatingId(null);
    }
  }

  const visibleProjects = projects.filter(
    (project) => filter === 'all' || project.status === filter
  );

  const counts = projects.reduce((result, project) => {
    result[project.status] = (result[project.status] || 0) + 1;
    return result;
  }, {});

  return (
    <main className="projects-page">
      <header className="projects-header">
        <div className="projects-heading">
          <p className="projects-eyebrow">CREATORSPACE WORKSPACE</p>
          <h1>My Projects</h1>
          <p>Manage collaborations and track your project progress.</p>
        </div>

        <div className="projects-header-actions">
          {isBrand && (
            <button
              className="projects-create-button"
              type="button"
              onClick={() => {
                setShowForm((current) => !current);
                setFormError('');
              }}
            >
              {showForm ? 'Cancel' : '+ Create Project'}
            </button>
          )}

          <button
            className="projects-refresh"
            type="button"
            onClick={loadProjects}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </header>

      {isBrand && showForm && (
        <section className="projects-form-card">
          <div className="projects-form-heading">
            <h2>Create a project</h2>
            <p>Start a collaboration by assigning a creator.</p>
          </div>

          {formError && (
            <div className="projects-alert projects-alert-error" role="alert">
              <p>{formError}</p>
            </div>
          )}

          {loadingOptions ? (
            <div className="projects-form-loading">
              Loading creators and campaign briefs...
            </div>
          ) : (
            <form className="projects-form" onSubmit={createProject}>
              <label className="projects-field">
                <span>Project title *</span>
                <input
                  name="title"
                  value={form.title}
                  onChange={updateForm}
                  placeholder="e.g. Summer campaign video"
                  maxLength={200}
                  required
                />
              </label>

              <label className="projects-field">
                <span>Assign creator *</span>
                <select
                  name="creator_id"
                  value={form.creator_id}
                  onChange={updateForm}
                  required
                >
                  <option value="">Select a creator</option>
                  {creators.map((creator) => (
                    <option key={creator.id} value={creator.id}>
                      {creator.name}
                      {creator.headline ? ` — ${creator.headline}` : ''}
                    </option>
                  ))}
                </select>
                {creators.length === 0 && (
                  <small>No creators are available yet.</small>
                )}
              </label>

              <label className="projects-field">
                <span>Campaign brief (optional)</span>
                <select
                  name="brief_id"
                  value={form.brief_id}
                  onChange={updateForm}
                >
                  <option value="">No campaign brief</option>
                  {briefs.map((brief) => (
                    <option key={brief.id} value={brief.id}>
                      {brief.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="projects-field">
                <span>Description (optional)</span>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={updateForm}
                  placeholder="Describe the work, deliverables, or expectations..."
                  rows={4}
                  maxLength={5000}
                />
              </label>

              <div className="projects-form-actions">
                <button
                  className="projects-secondary-button"
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setFormError('');
                  }}
                  disabled={creating}
                >
                  Cancel
                </button>

                <button
                  className="projects-create-button"
                  type="submit"
                  disabled={creating || creators.length === 0}
                >
                  {creating ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      <section className="projects-stats" aria-label="Project statistics">
        <article className="project-stat">
          <span>Total Projects</span>
          <strong>{projects.length}</strong>
        </article>

        <article className="project-stat">
          <span>Pending</span>
          <strong>{counts.pending || 0}</strong>
        </article>

        <article className="project-stat">
          <span>In Progress</span>
          <strong>{counts.in_progress || 0}</strong>
        </article>

        <article className="project-stat">
          <span>Completed</span>
          <strong>{counts.completed || 0}</strong>
        </article>
      </section>

      <section className="projects-toolbar">
        <div>
          <h2>All Projects</h2>
          <p>View and manage your assigned collaborations.</p>
        </div>

        <label className="projects-filter">
          <span>Filter by status</span>
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
      </section>

      {error && (
        <div className="projects-alert projects-alert-error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={loadProjects} disabled={loading}>
            Try again
          </button>
        </div>
      )}

      {notice && (
        <p className="projects-alert projects-alert-success" role="status">
          {notice}
        </p>
      )}

      {loading ? (
        <div className="projects-state" role="status">
          <span className="projects-loader" />
          <p>Loading your projects...</p>
        </div>
      ) : visibleProjects.length === 0 ? (
        <section className="projects-empty">
          <div className="projects-empty-icon" aria-hidden="true">
            <span>▤</span>
          </div>
          <h2>No projects found</h2>
          <p>
            {projects.length === 0
              ? isBrand
                ? 'Create a project and assign it to a creator to get started.'
                : 'Projects assigned to your account will appear here.'
              : 'There are no projects with this status. Try another filter.'}
          </p>

          {isBrand && projects.length === 0 && (
            <button
              className="projects-create-button"
              type="button"
              onClick={() => setShowForm(true)}
            >
              + Create Project
            </button>
          )}

          {filter !== 'all' && (
            <button
              className="projects-secondary-button"
              type="button"
              onClick={() => setFilter('all')}
            >
              View all projects
            </button>
          )}
        </section>
      ) : (
        <section className="projects-grid" aria-label="Project list">
          {visibleProjects.map((project) => {
            const allowedStatuses = STATUS_OPTIONS[project.status] || [];
            const isUpdating = updatingId === project.id;

            return (
              <article className="project-card" key={project.id}>
                <div className="project-card-top">
                  <span className="project-id">PROJECT #{project.id}</span>

                  <span className={`project-status status-${project.status}`}>
                    <span className="project-status-dot" />
                    {formatStatus(project.status)}
                  </span>
                </div>

                <h3 className="project-title">
                  {project.title || 'Untitled project'}
                </h3>

                <p className="project-description">
                  {project.description || 'No description provided.'}
                </p>

                <div className="project-details">
                  {project.brief_id != null && (
                    <div className="project-detail">
                      <span>Campaign brief</span>
                      <strong>#{project.brief_id}</strong>
                    </div>
                  )}

                  <div className="project-detail">
                    <span>Created</span>
                    <strong>{formatDate(project.created_at)}</strong>
                  </div>

                  <div className="project-detail">
                    <span>Last updated</span>
                    <strong>{formatDate(project.updated_at)}</strong>
                  </div>
                </div>

                {allowedStatuses.length > 0 ? (
                  <div className="project-actions">
                    <label htmlFor={`project-status-${project.id}`}>
                      Update status
                    </label>

                    <select
                      id={`project-status-${project.id}`}
                      value=""
                      disabled={isUpdating || updatingId !== null}
                      onChange={(event) => {
                        const value = event.target.value;
                        if (value) updateStatus(project, value);
                      }}
                    >
                      <option value="">Choose an action</option>
                      {allowedStatuses.map((status) => (
                        <option key={status} value={status}>
                          Mark as {formatStatus(status)}
                        </option>
                      ))}
                    </select>

                    {isUpdating && (
                      <span className="project-updating">Saving...</span>
                    )}
                  </div>
                ) : (
                  <p className="project-final-status">
                    {project.status === 'completed'
                      ? 'This project has been completed.'
                      : 'This project is closed.'}
                  </p>
                )}
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}