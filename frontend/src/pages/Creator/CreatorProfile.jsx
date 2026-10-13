
import { useEffect, useRef, useState } from 'react';
import { api, assetUrl } from '../../api';

const emptyProfileForm = {
  headline: '',
  bio: '',
  specialization: '',
  skills: '',
  tools: '',
  content_type: 'Video',
  aspect_ratio: '9:16',
  workflow: '',
  website_url: '',
  instagram: '',
  linkedin: '',
};

const emptyPortfolioForm = {
  title: '',
  description: '',
  media_type: 'Image',
  aspect_ratio: '1:1',
  tools_used: '',
  workflow: '',
  media_url: '',
};

const allowedImageTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

function splitList(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function profileToForm(data) {
  const links = data.social_links || {};

  return {
    headline: data.headline || '',
    bio: data.bio || '',
    specialization: data.specialization || '',
    skills: (data.skills || []).join(', '),
    tools: (data.tools || []).join(', '),
    content_type: data.content_type || 'Video',
    aspect_ratio: data.aspect_ratio || '9:16',
    workflow: data.workflow || '',
    website_url: data.website_url || '',
    instagram: links.instagram || '',
    linkedin: links.linkedin || '',
  };
}

export default function CreatorProfile() {
  const [profile, setProfile] = useState(null);
  const [portfolioItems, setPortfolioItems] = useState([]);
  const [profileForm, setProfileForm] = useState(emptyProfileForm);
  const [portfolioForm, setPortfolioForm] = useState(emptyPortfolioForm);

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPortfolio, setSavingPortfolio] = useState(false);
  const [deletingItem, setDeletingItem] = useState(null);

  const [editingProfile, setEditingProfile] = useState(false);
  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState('');

  const [portfolioFile, setPortfolioFile] = useState(null);
  const [portfolioPreview, setPortfolioPreview] = useState('');

  const profilePictureInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function fetchProfile() {
      try {
        const data = await api.get('/creator/profile');

        if (cancelled) return;

        setProfile(data);
        setPortfolioItems(data.portfolio_items || []);
        setProfileForm(profileToForm(data));
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Could not load your creator profile.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!portfolioPreview) return undefined;

    return () => URL.revokeObjectURL(portfolioPreview);
  }, [portfolioPreview]);

  useEffect(() => {
    if (!profilePicturePreview) return undefined;

    return () => URL.revokeObjectURL(profilePicturePreview);
  }, [profilePicturePreview]);

  async function refreshProfile() {
    const data = await api.get('/creator/profile');

    setProfile(data);
    setPortfolioItems(data.portfolio_items || []);
    setProfileForm(profileToForm(data));

    return data;
  }

  function updateProfileField(event) {
    const { name, value } = event.target;

    setProfileForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function updatePortfolioField(event) {
    const { name, value } = event.target;

    setPortfolioForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function handleProfilePictureChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!allowedImageTypes.includes(file.type)) {
      setError('Choose a JPG, PNG, WEBP, or GIF image.');
      event.target.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Profile picture must be 10 MB or smaller.');
      event.target.value = '';
      return;
    }

    setError('');
    setNotice('');
    setProfilePictureFile(file);
    setProfilePicturePreview(URL.createObjectURL(file));
  }

  async function saveProfile(event) {
    event.preventDefault();
    setError('');
    setNotice('');

    if (!profileForm.headline.trim()) {
      setError('Please enter your professional headline.');
      return;
    }

    setSavingProfile(true);

    try {
      let uploadedPictureUrl;

      // Upload the selected image first.
      if (profilePictureFile) {
        const formData = new FormData();
        formData.append('file', profilePictureFile);

        const uploaded = await api.upload('/upload', formData);

        if (!uploaded?.url) {
          throw new Error(
            'The upload endpoint did not return an image URL.'
          );
        }

        uploadedPictureUrl = uploaded.url;
      }

      const socialLinks = {};

      if (profileForm.instagram.trim()) {
        socialLinks.instagram = profileForm.instagram.trim();
      }

      if (profileForm.linkedin.trim()) {
        socialLinks.linkedin = profileForm.linkedin.trim();
      }

      const payload = {
        headline: profileForm.headline.trim(),
        bio: profileForm.bio.trim(),
        specialization: profileForm.specialization.trim(),
        skills: splitList(profileForm.skills),
        tools: splitList(profileForm.tools),
        content_type: profileForm.content_type || null,
        aspect_ratio: profileForm.aspect_ratio || null,
        workflow: profileForm.workflow.trim(),
        website_url: profileForm.website_url.trim() || null,
        social_links: socialLinks,
      };

      // Preserve the existing picture when no new picture is selected.
      if (uploadedPictureUrl) {
        payload.profile_picture_url = uploadedPictureUrl;
      }

      // Save profile information and the uploaded picture URL.
      const savedProfile = await api.put(
        '/creator/profile',
        payload
      );

      // Do not hide a failed persistence problem.
      if (
        uploadedPictureUrl &&
        !savedProfile?.profile_picture_url
      ) {
        throw new Error(
          'The backend did not return the saved profile picture URL. Check the creator profile update endpoint.'
        );
      }

      // Reload the actual saved data from the backend.
      const updatedProfile = await api.get('/creator/profile');

      if (
        uploadedPictureUrl &&
        !updatedProfile?.profile_picture_url
      ) {
        throw new Error(
          'The profile picture URL was not returned after refreshing the profile. The backend needs to be checked.'
        );
      }

      setProfile(updatedProfile);
      setPortfolioItems(updatedProfile.portfolio_items || []);
      setProfileForm(profileToForm(updatedProfile));

      setProfilePictureFile(null);
      setProfilePicturePreview('');

      if (profilePictureInputRef.current) {
        profilePictureInputRef.current.value = '';
      }

      setEditingProfile(false);
      setNotice('Your creator profile has been saved.');
    } catch (err) {
      setError(err.message || 'Could not save your profile.');
    } finally {
      setSavingProfile(false);
    }
  }

  function handlePortfolioFile(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!allowedImageTypes.includes(file.type)) {
      setError('Choose a JPG, PNG, WEBP, or GIF image.');
      event.target.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Images must be 10 MB or smaller.');
      event.target.value = '';
      return;
    }

    setError('');
    setNotice('');
    setPortfolioFile(file);
    setPortfolioPreview(URL.createObjectURL(file));
  }

  function removePortfolioFile() {
    setPortfolioFile(null);
    setPortfolioPreview('');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function addPortfolioItem(event) {
    event.preventDefault();
    setError('');
    setNotice('');

    if (!portfolioForm.title.trim()) {
      setError('Enter a portfolio project title.');
      return;
    }

    if (
      portfolioForm.media_type === 'Image' &&
      !portfolioFile
    ) {
      setError('Select an image for your portfolio item.');
      return;
    }

    if (
      portfolioForm.media_type !== 'Image' &&
      !portfolioForm.media_url.trim()
    ) {
      setError('Enter a media URL for this portfolio item.');
      return;
    }

    setSavingPortfolio(true);

    try {
      let mediaUrl = portfolioForm.media_url.trim();

      if (portfolioForm.media_type === 'Image') {
        const formData = new FormData();
        formData.append('file', portfolioFile);

        const uploaded = await api.upload('/upload', formData);

        if (!uploaded?.url) {
          throw new Error(
            'The upload endpoint did not return a media URL.'
          );
        }

        mediaUrl = uploaded.url;
      }

      await api.post('/creator/portfolio', {
        title: portfolioForm.title.trim(),
        description: portfolioForm.description.trim(),
        media_url: mediaUrl,
        media_type: portfolioForm.media_type,
        aspect_ratio: portfolioForm.aspect_ratio,
        tools_used: splitList(portfolioForm.tools_used),
        workflow: portfolioForm.workflow.trim(),
        is_featured: false,
      });

      setPortfolioForm({ ...emptyPortfolioForm });
      removePortfolioFile();

      await refreshProfile();

      setNotice('Portfolio item added successfully.');
    } catch (err) {
      setError(err.message || 'Could not add the portfolio item.');
    } finally {
      setSavingPortfolio(false);
    }
  }

  async function deletePortfolioItem(itemId) {
    const confirmed = window.confirm(
      'Delete this portfolio item? This action cannot be undone.'
    );

    if (!confirmed) return;

    setError('');
    setNotice('');
    setDeletingItem(itemId);

    try {
      await api.del(`/creator/portfolio/${itemId}`);
      await refreshProfile();
      setNotice('Portfolio item deleted.');
    } catch (err) {
      setError(err.message || 'Could not delete this portfolio item.');
    } finally {
      setDeletingItem(null);
    }
  }

  function cancelProfileEditing() {
    setProfileForm(profileToForm(profile || {}));
    setProfilePictureFile(null);
    setProfilePicturePreview('');

    if (profilePictureInputRef.current) {
      profilePictureInputRef.current.value = '';
    }

    setEditingProfile(false);
    setError('');
    setNotice('');
  }

  if (loading) {
    return (
      <section className="dashboard-section">
        <p>Loading your creator profile...</p>
      </section>
    );
  }

  const pictureUrl = profilePicturePreview
    ? profilePicturePreview
    : profile?.profile_picture_url
      ? assetUrl(profile.profile_picture_url)
      : '';

  const initials = (profile?.name || 'C').charAt(0).toUpperCase();

  return (
    <div className="creator-profile-page">
      <section className="dashboard-welcome">
        <h1>My Creator Profile</h1>
        <p>
          Show brands your creative skills, AI tools, production
          workflows, and portfolio.
        </p>
      </section>

      {error && (
        <p className="feed-error" role="alert">
          {error}
        </p>
      )}

      {notice && <p role="status">{notice}</p>}

      <section className="dashboard-section">
        <div
          className="dashboard-item"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              width: '88px',
              height: '88px',
              borderRadius: '50%',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#e2e8f0',
              color: '#1e293b',
              fontSize: '30px',
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {pictureUrl ? (
              <img
                src={pictureUrl}
                alt={`${profile?.name || 'Creator'} profile`}
                onError={(event) => {
                  event.currentTarget.style.display = 'none';
                }}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            ) : (
              initials
            )}
          </div>

          <div style={{ flex: 1, minWidth: '180px' }}>
            <h2>{profile?.name || 'Creator'}</h2>
            <p>
              {profile?.headline || 'Add your professional headline'}
            </p>
          </div>

          <button
            className="btn"
            type="button"
            onClick={() => {
              if (editingProfile) {
                cancelProfileEditing();
              } else {
                setEditingProfile(true);
                setError('');
                setNotice('');
              }
            }}
            aria-label={
              editingProfile ? 'Cancel profile editing' : 'Edit profile'
            }
            title={editingProfile ? 'Cancel editing' : 'Edit profile'}
          >
            {editingProfile ? '✕ Cancel' : '✏️ Edit profile'}
          </button>
        </div>
      </section>

      {editingProfile && (
        <section className="dashboard-section">
          <h2>Edit professional profile</h2>

          <form
            className="dashboard-item brand-campaign-form"
            onSubmit={saveProfile}
          >
            <label>
              Creator name
              <input value={profile?.name || ''} disabled />
            </label>

            <label>
              Profile picture
              <input
                ref={profilePictureInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleProfilePictureChange}
              />
            </label>

            <p>JPG, PNG, WEBP, or GIF · Maximum 10 MB</p>

            {profilePicturePreview && (
              <div className="media-image-preview">
                <img
                  src={profilePicturePreview}
                  alt="New profile picture preview"
                  style={{
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                  }}
                />
              </div>
            )}

            <label>
              Professional headline
              <input
                name="headline"
                value={profileForm.headline}
                onChange={updateProfileField}
                placeholder="AI filmmaker | Generative video artist"
                maxLength={150}
                required
              />
            </label>

            <label>
              Bio
              <textarea
                name="bio"
                value={profileForm.bio}
                onChange={updateProfileField}
                placeholder="Tell brands about your creative experience..."
                rows={4}
                maxLength={5000}
              />
            </label>

            <label>
              Specialization
              <input
                name="specialization"
                value={profileForm.specialization}
                onChange={updateProfileField}
                placeholder="AI filmmaking, product ads, animation..."
                maxLength={100}
              />
            </label>

            <label>
              Skills (comma-separated)
              <input
                name="skills"
                value={profileForm.skills}
                onChange={updateProfileField}
                placeholder="Prompt engineering, storytelling, editing"
              />
            </label>

            <label>
              AI tools and models (comma-separated)
              <input
                name="tools"
                value={profileForm.tools}
                onChange={updateProfileField}
                placeholder="Runway, Sora, Midjourney"
              />
            </label>

            <label>
              Main content type
              <select
                name="content_type"
                value={profileForm.content_type}
                onChange={updateProfileField}
              >
                <option value="Video">Video</option>
                <option value="Image">Image</option>
                <option value="Animation">Animation</option>
              </select>
            </label>

            <label>
              Preferred aspect ratio
              <select
                name="aspect_ratio"
                value={profileForm.aspect_ratio}
                onChange={updateProfileField}
              >
                <option value="9:16">9:16 — Vertical</option>
                <option value="16:9">16:9 — Landscape</option>
                <option value="1:1">1:1 — Square</option>
              </select>
            </label>

            <label>
              Production workflow
              <textarea
                name="workflow"
                value={profileForm.workflow}
                onChange={updateProfileField}
                placeholder="Describe how you plan, generate, edit, and deliver work..."
                rows={4}
                maxLength={5000}
              />
            </label>

            <label>
              Website URL
              <input
                type="url"
                name="website_url"
                value={profileForm.website_url}
                onChange={updateProfileField}
                placeholder="https://your-portfolio.com"
              />
            </label>

            <label>
              Instagram URL
              <input
                type="url"
                name="instagram"
                value={profileForm.instagram}
                onChange={updateProfileField}
                placeholder="https://instagram.com/yourname"
              />
            </label>

            <label>
              LinkedIn URL
              <input
                type="url"
                name="linkedin"
                value={profileForm.linkedin}
                onChange={updateProfileField}
                placeholder="https://linkedin.com/in/yourname"
              />
            </label>

            <p>
              Tool verification:{' '}
              {profile?.verified_tools ? 'Verified' : 'Not verified'}
            </p>

            <p>
              Workflow verification:{' '}
              {profile?.verified_workflow ? 'Verified' : 'Not verified'}
            </p>

            <p>
              Past work verification:{' '}
              {profile?.verified_past_work ? 'Verified' : 'Not verified'}
            </p>

            <button
              className="btn"
              type="submit"
              disabled={savingProfile}
            >
              {savingProfile ? 'Saving profile...' : 'Save profile'}
            </button>
          </form>
        </section>
      )}

      <section className="dashboard-section">
        <h2>Add portfolio work</h2>

        <p>
          Add examples of your AI-generated content and explain the
          tools and workflow used to create it.
        </p>

        <form
          className="dashboard-item brand-campaign-form"
          onSubmit={addPortfolioItem}
        >
          <label>
            Project title
            <input
              name="title"
              value={portfolioForm.title}
              onChange={updatePortfolioField}
              required
              maxLength={200}
              placeholder="AI-powered product campaign"
            />
          </label>

          <label>
            Description
            <textarea
              name="description"
              value={portfolioForm.description}
              onChange={updatePortfolioField}
              rows={3}
              maxLength={5000}
              placeholder="What did you create?"
            />
          </label>

          <label>
            Media type
            <select
              name="media_type"
              value={portfolioForm.media_type}
              onChange={(event) => {
                const value = event.target.value;

                setPortfolioForm((previous) => ({
                  ...previous,
                  media_type: value,
                  media_url: '',
                }));

                removePortfolioFile();
              }}
            >
              <option value="Image">Image</option>
              <option value="Video">Video</option>
              <option value="Animation">Animation</option>
              <option value="Other">Other</option>
            </select>
          </label>

          {portfolioForm.media_type === 'Image' ? (
            <>
              <label>
                Select image
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handlePortfolioFile}
                />
              </label>

              <p>JPG, PNG, WEBP, or GIF · Maximum 10 MB</p>

              {portfolioPreview && (
                <div className="media-image-preview">
                  <img
                    src={portfolioPreview}
                    alt="Portfolio preview"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '300px',
                      objectFit: 'contain',
                    }}
                  />

                  <button
                    className="feed-action"
                    type="button"
                    onClick={removePortfolioFile}
                    disabled={savingPortfolio}
                  >
                    Remove image
                  </button>
                </div>
              )}
            </>
          ) : (
            <label>
              Media URL
              <input
                type="url"
                name="media_url"
                value={portfolioForm.media_url}
                onChange={updatePortfolioField}
                placeholder="https://..."
                required
              />
            </label>
          )}

          <label>
            Aspect ratio
            <select
              name="aspect_ratio"
              value={portfolioForm.aspect_ratio}
              onChange={updatePortfolioField}
            >
              <option value="9:16">9:16 — Vertical</option>
              <option value="16:9">16:9 — Landscape</option>
              <option value="1:1">1:1 — Square</option>
            </select>
          </label>

          <label>
            Tools/models used (comma-separated)
            <input
              name="tools_used"
              value={portfolioForm.tools_used}
              onChange={updatePortfolioField}
              placeholder="Runway, Midjourney"
            />
          </label>

          <label>
            Production workflow
            <textarea
              name="workflow"
              value={portfolioForm.workflow}
              onChange={updatePortfolioField}
              rows={3}
              maxLength={5000}
              placeholder="Describe the steps used to produce this work..."
            />
          </label>

          <button
            className="btn"
            type="submit"
            disabled={savingPortfolio}
          >
            {savingPortfolio ? 'Adding portfolio item...' : 'Add portfolio item'}
          </button>
        </form>
      </section>

      <section className="dashboard-section">
        <h2>My AI portfolio ({portfolioItems.length})</h2>

        {portfolioItems.length === 0 ? (
          <section className="dashboard-item">
            <h3>Your portfolio starts here</h3>
            <p>
              Add your first AI-generated project so brands can evaluate
              your creative work.
            </p>
          </section>
        ) : (
          <div className="portfolio-grid">
            {portfolioItems.map((item) => (
              <article
                className="dashboard-item portfolio-card"
                key={item.id}
              >
                {item.media_type === 'Image' ? (
                  <img
                    src={assetUrl(item.media_url)}
                    alt={item.title}
                    loading="lazy"
                    style={{
                      width: '100%',
                      maxHeight: '280px',
                      objectFit: 'contain',
                    }}
                  />
                ) : (
                  <p>
                    <a
                      href={assetUrl(item.media_url)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open {item.media_type.toLowerCase()} work ↗
                    </a>
                  </p>
                )}

                <h3>{item.title}</h3>

                {item.description && <p>{item.description}</p>}

                <p>
                  <strong>Type:</strong> {item.media_type}
                  {' · '}
                  <strong>Format:</strong> {item.aspect_ratio}
                </p>

                {item.tools_used?.length > 0 && (
                  <p>
                    <strong>Tools:</strong> {item.tools_used.join(', ')}
                  </p>
                )}

                {item.workflow && (
                  <p>
                    <strong>Workflow:</strong> {item.workflow}
                  </p>
                )}

                <button
                  className="feed-action"
                  type="button"
                  disabled={deletingItem === item.id}
                  onClick={() => deletePortfolioItem(item.id)}
                >
                  {deletingItem === item.id ? 'Deleting...' : 'Delete project'}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}