
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api, assetUrl } from '../../api';

export default function CreatorDashboard() {
  const { user } = useAuth();

  const [posts, setPosts] = useState([]);
  const [text, setText] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [comments, setComments] = useState({});
  const [commenting, setCommenting] = useState(null);

  const fileInputRef = useRef(null);
  const previewUrlRef = useRef('');
  const composerRef = useRef(null);

  // Revoke the previous preview URL whenever a new one is created.
  const clearImagePreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = '';
    }

    setImagePreview('');
  }, []);

  // Load posts from the existing backend endpoint.
  const loadPosts = useCallback(async () => {
    setError('');

    try {
      const data = await api.get('/posts');
      setPosts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Could not load posts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchPosts() {
      try {
        const data = await api.get('/posts');

        if (!cancelled) {
          setPosts(Array.isArray(data) ? data : []);
          setError('');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Could not load posts.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchPosts();

    return () => {
      cancelled = true;
    };
  }, []);

  // Clean up the final preview URL when this component unmounts.
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = '';
      }
    };
  }, []);

  const resetComposer = useCallback(() => {
    setText('');
    setImageFile(null);
    clearImagePreview();
    setError('');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [clearImagePreview]);

  const openComposer = () => {
    setError('');
    setComposerOpen(true);
  };

  const closeComposer = () => {
    if (publishing) return;

    resetComposer();
    setComposerOpen(false);
  };

  function handleImageChange(event) {
    const file = event.target.files?.[0] || null;

    if (!file) return;

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
    ];

    if (!allowedTypes.includes(file.type)) {
      setError('Choose a JPG, JPEG, PNG, WEBP, or GIF image.');
      event.target.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image size must be 10 MB or less.');
      event.target.value = '';
      return;
    }

    clearImagePreview();

    const previewUrl = URL.createObjectURL(file);
    previewUrlRef.current = previewUrl;

    setImageFile(file);
    setImagePreview(previewUrl);
    setError('');
  }

  function removeImage() {
    if (publishing) return;

    setImageFile(null);
    clearImagePreview();

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function publishPost(event) {
    event.preventDefault();

    if (publishing) return;

    if (!text.trim() && !imageFile) {
      setError('Write something or select an image before publishing.');
      return;
    }

    setPublishing(true);
    setError('');

    try {
      let images = [];

      if (imageFile) {
        const formData = new FormData();
        formData.append('file', imageFile);

        const uploadedImage = await api.upload('/upload', formData);
        images = [uploadedImage.url];
      }

      await api.post('/posts', {
        text: text.trim(),
        kind: 'Creator update',
        images,
      });

      // Close and clear the composer after successful publishing.
      resetComposer();
      setComposerOpen(false);

      // Refresh the feed using the same GET /posts endpoint.
      await loadPosts();
    } catch (err) {
      setError(err.message || 'Could not publish your post.');
    } finally {
      setPublishing(false);
    }
  }

  async function toggleLike(postId) {
    try {
      const result = await api.post(`/posts/${postId}/like`, {});

      setPosts((previous) =>
        previous.map((post) =>
          post.id === postId
            ? {
                ...post,
                liked_by_me: result.liked,
                likes_count: result.likes_count,
              }
            : post
        )
      );
    } catch (err) {
      setError(err.message || 'Could not update like.');
    }
  }

  async function toggleSave(postId) {
    try {
      const result = await api.post(`/posts/${postId}/save`, {});

      setPosts((previous) =>
        previous.map((post) =>
          post.id === postId
            ? { ...post, saved_by_me: result.saved }
            : post
        )
      );
    } catch (err) {
      setError(err.message || 'Could not save post.');
    }
  }

  async function submitComment(event, postId) {
    event.preventDefault();

    const commentText = (comments[postId] || '').trim();

    if (!commentText || commenting !== null) return;

    setCommenting(postId);
    setError('');

    try {
      await api.post(`/posts/${postId}/comments`, {
        text: commentText,
      });

      setComments((previous) => ({
        ...previous,
        [postId]: '',
      }));

      await loadPosts();
    } catch (err) {
      setError(err.message || 'Could not add comment.');
    } finally {
      setCommenting(null);
    }
  }

  const initials = user?.name?.charAt(0)?.toUpperCase() || 'U';

  return (
    <div className="creator-dashboard">
      {error && (
        <p className="feed-error" role="alert">
          {error}
        </p>
      )}

      <div className="feed-heading">
        <h2>Creator feed</h2>

        <div className="feed-heading-actions">
          <button
            className="btn"
            type="button"
            onClick={openComposer}
            disabled={publishing}
          >
            + Post
          </button>

          <button
            className="feed-refresh"
            type="button"
            onClick={() => {
              setLoading(true);
              loadPosts();
            }}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {composerOpen && (
        <form
          ref={composerRef}
          className="post-composer"
          onSubmit={publishPost}
        >
          <div className="composer-top">
            <div className="feed-avatar">{initials}</div>
            <span>Share something with the community</span>
          </div>

          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="What are you creating today?"
            maxLength={5000}
            rows={4}
            disabled={publishing}
          />

          <div className="media-upload-section">
            <label
              className="media-upload-label"
              htmlFor="creator-image-upload"
            >
              <span aria-hidden="true">＋</span>
              Add an image
            </label>

            <input
              ref={fileInputRef}
              id="creator-image-upload"
              className="media-file-input"
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif"
              onChange={handleImageChange}
              disabled={publishing}
            />

            <p className="media-upload-hint">
              JPG, JPEG, PNG, WEBP, or GIF · Maximum 10 MB
            </p>

            {imagePreview && (
              <div className="media-image-preview">
                <img
                  src={imagePreview}
                  alt="Selected image preview"
                />

                <div className="media-preview-footer">
                  <span>{imageFile?.name}</span>

                  <button
                    type="button"
                    className="media-remove-button"
                    onClick={removeImage}
                    disabled={publishing}
                  >
                    Remove image
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="composer-actions">
            <span className="composer-hint">
              Share your latest creative work
            </span>

            <button
              className="btn"
              type="submit"
              disabled={publishing || (!text.trim() && !imageFile)}
            >
              {publishing ? 'Publishing...' : 'Publish post'}
            </button>

            <button
              className="feed-refresh"
              type="button"
              onClick={closeComposer}
              disabled={publishing}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading && (
        <p className="feed-empty">Loading posts...</p>
      )}

      {!loading && posts.length === 0 && (
        <section className="feed-empty">
          <h3>Your feed starts here</h3>
          <p>Be the first to share a creative update.</p>
        </section>
      )}

      {!loading &&
        posts.map((post) => (
          <article className="feed-post" key={post.id}>
            <header className="feed-post-header">
              <div className="feed-avatar">
                {post.author_name?.charAt(0)?.toUpperCase() || 'U'}
              </div>

              <div className="feed-author">
                <strong>{post.author_name || 'Unknown user'}</strong>

                <span>
                  {post.author_role === 'brand' ? 'Brand' : 'Creator'}
                  {' · '}
                  {post.kind}
                </span>

                <time dateTime={post.created_at || undefined}>
                  {post.created_at
                    ? new Date(post.created_at).toLocaleString()
                    : ''}
                </time>
              </div>
            </header>

            {post.text && (
              <p className="feed-post-text">{post.text}</p>
            )}

            {post.images?.map((url, index) => (
              <div className="feed-media" key={`${url}-${index}`}>
                <img
                  src={assetUrl(url)}
                  alt="Creator shared work"
                  loading="lazy"
                  onError={(event) => {
                    event.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            ))}

            <div className="feed-post-stats">
              <span>{post.likes_count ?? 0} likes</span>
              <span>{post.comments?.length || 0} comments</span>
            </div>

            <div className="feed-post-actions">
              <button
                type="button"
                className={
                  post.liked_by_me
                    ? 'feed-action selected'
                    : 'feed-action'
                }
                onClick={() => toggleLike(post.id)}
              >
                {post.liked_by_me ? '♥ Liked' : '♡ Like'}
              </button>

              <button
                type="button"
                className="feed-action"
                onClick={() =>
                  document.getElementById(`comment-${post.id}`)?.focus()
                }
              >
                Comment
              </button>

              <button
                type="button"
                className={
                  post.saved_by_me
                    ? 'feed-action selected'
                    : 'feed-action'
                }
                onClick={() => toggleSave(post.id)}
              >
                {post.saved_by_me ? '✓ Saved' : 'Save'}
              </button>
            </div>

            <div className="feed-comments">
              {post.comments?.map((comment) => (
                <div className="feed-comment" key={comment.id}>
                  <strong>{comment.user_name}</strong>
                  <p>{comment.text}</p>
                </div>
              ))}

              <form
                className="comment-form"
                onSubmit={(event) => submitComment(event, post.id)}
              >
                <input
                  id={`comment-${post.id}`}
                  value={comments[post.id] || ''}
                  onChange={(event) =>
                    setComments((previous) => ({
                      ...previous,
                      [post.id]: event.target.value,
                    }))
                  }
                  placeholder="Write a comment..."
                  maxLength={2000}
                  disabled={commenting !== null}
                />

                <button
                  className="btn"
                  type="submit"
                  disabled={
                    commenting !== null ||
                    !(comments[post.id] || '').trim()
                  }
                >
                  {commenting === post.id ? 'Sending...' : 'Send'}
                </button>
              </form>
            </div>
          </article>
        ))}
    </div>
  );
}