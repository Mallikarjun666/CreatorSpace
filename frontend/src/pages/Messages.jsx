
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import './Messages.css';

export default function Messages() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedUserId = searchParams.get('user_id') || '';

  const [recipientId, setRecipientId] = useState(selectedUserId);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [search, setSearch] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setRecipientId(selectedUserId);
  }, [selectedUserId]);

  const loadConversations = useCallback(async () => {
    try {
      const data = await api.get('/messages/conversations');
      setConversations(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Could not load conversations.');
    }
  }, []);

  const loadMessages = useCallback(async () => {
    if (!recipientId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const data = await api.get(
        `/messages?with_user_id=${encodeURIComponent(recipientId)}`
      );
      setMessages(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load messages.');
    } finally {
      setLoading(false);
    }
  }, [recipientId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  function openConversation(id) {
    setRecipientId(String(id));
    setSearchParams({ user_id: String(id) });
    setError('');
  }

  async function handleSend(event) {
    event.preventDefault();

    const trimmed = content.trim();
    const id = Number(recipientId);

    if (!Number.isInteger(id) || id < 1) {
      setError('Select a person to start messaging.');
      return;
    }

    if (!trimmed) return;

    setSending(true);
    setError('');

    try {
      await api.post('/messages', {
        recipient_id: id,
        content: trimmed,
      });

      setContent('');
      await Promise.all([loadMessages(), loadConversations()]);
    } catch (err) {
      setError(err.message || 'Could not send message.');
    } finally {
      setSending(false);
    }
  }

  const activeConversation = conversations.find(
    (item) => String(item.user_id) === String(recipientId)
  );

  const filteredConversations = conversations.filter((item) =>
    (item.name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <section className="cs-messages">
      <aside className="cs-inbox">
        <div className="cs-inbox-heading">
          <h1>Messages</h1>
          <p>Your CreatorSpace conversations</p>
        </div>

        <div className="cs-search">
          <input
            type="search"
            placeholder="Search conversations..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search conversations"
          />
        </div>

        <div className="cs-conversation-list">
          {filteredConversations.map((item) => (
            <button
              type="button"
              key={item.user_id}
              className={`cs-conversation ${
                String(item.user_id) === String(recipientId)
                  ? 'active'
                  : ''
              }`}
              onClick={() => openConversation(item.user_id)}
            >
              <span className="cs-avatar">
                {(item.name || '?').charAt(0).toUpperCase()}
              </span>

              <span className="cs-conversation-info">
                <strong>{item.name || `User #${item.user_id}`}</strong>
                <span className="cs-last-message">
                  {item.last_message || 'Start a conversation'}
                </span>
              </span>

              {item.unread_count > 0 && (
                <span className="cs-unread">
                  {item.unread_count}
                </span>
              )}
            </button>
          ))}

          {filteredConversations.length === 0 && (
            <p className="cs-empty">
              {search
                ? 'No matching conversations.'
                : 'No conversations yet. Visit Discover to message a creator.'}
            </p>
          )}
        </div>
      </aside>

      <div className="cs-chat">
        {recipientId ? (
          <>
            <header className="cs-chat-header">
              <span className="cs-avatar">
                {(
                  activeConversation?.name ||
                  `U${recipientId}`
                ).charAt(0).toUpperCase()}
              </span>

              <div>
                <h2>
                  {activeConversation?.name || `User #${recipientId}`}
                </h2>
                <p>
                  {activeConversation?.role || 'CreatorSpace member'}
                </p>
              </div>
            </header>

            {error && (
              <p className="cs-error" role="alert">
                {error}
              </p>
            )}

            <div className="cs-chat-body">
              {loading ? (
                <p className="cs-empty">Loading messages...</p>
              ) : messages.length === 0 ? (
                <div className="cs-empty cs-first-message">
                  <span className="cs-avatar cs-avatar-large">
                    {(activeConversation?.name || '?')
                      .charAt(0)
                      .toUpperCase()}
                  </span>
                  <h3>
                    {activeConversation?.name || 'Start a conversation'}
                  </h3>
                  <p>Connect, collaborate, and create something great.</p>
                </div>
              ) : (
                messages.map((message) => {
                  const incoming =
                    message.sender_id === Number(recipientId);

                  return (
                    <article
                      key={message.id}
                      className={`cs-message-row ${
                        incoming ? 'incoming' : 'outgoing'
                      }`}
                    >
                      <div className="cs-message-bubble">
                        <p>{message.content}</p>
                        <time>
                          {message.created_at
                            ? new Date(message.created_at).toLocaleString(
                                undefined,
                                {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                }
                              )
                            : ''}
                        </time>
                      </div>
                    </article>
                  );
                })
              )}
            </div>

            <form className="cs-composer" onSubmit={handleSend}>
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Write a message..."
                maxLength={5000}
                rows={1}
                aria-label="Message"
                required
              />

              <button type="submit" disabled={sending || !content.trim()}>
                {sending ? 'Sending...' : 'Send'}
              </button>
            </form>
          </>
        ) : (
          <div className="cs-welcome">
            <div className="cs-welcome-icon">✉</div>
            <h2>Your messages</h2>
            <p>
              Select a conversation or visit Discover to connect with
              creators and brands.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}