import { useState, useEffect } from 'react';
import { Link, Outlet, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../services/supabase.js';
import { api } from '../services/api.js';
import NewConversationModal from '../components/Messaging/NewConversationModal.jsx';

function Avatar({ user, size = 9 }) {
  const s = `w-${size} h-${size}`;
  if (user?.avatar_url) {
    return <img src={user.avatar_url} referrerPolicy="no-referrer" className={`${s} rounded-full object-cover shrink-0`} alt="" />;
  }
  return (
    <div className={`${s} rounded-full bg-[var(--accent)] text-white flex items-center justify-center text-sm font-bold shrink-0`}>
      {user?.display_name?.[0]?.toUpperCase() || '?'}
    </div>
  );
}

function ConvItem({ conv, myId, active }) {
  const other = !conv.is_group
    ? conv.members?.find((m) => m.user?.id !== myId)?.user
    : null;
  const name = conv.is_group ? conv.name : other?.display_name || 'Chat';
  const avatarUser = conv.is_group ? null : other;
  const last = conv.last_message;

  return (
    <Link
      to={`/messages/${conv.id}`}
      className={`flex items-center gap-3 px-4 py-3 hover:theme-surface2 transition-colors ${active ? 'theme-surface2 border-l-2 border-[var(--accent)]' : ''}`}
    >
      {conv.is_group ? (
        <div className="w-9 h-9 rounded-full theme-surface2 border theme-border-s flex items-center justify-center text-base shrink-0">
          👥
        </div>
      ) : (
        <Avatar user={avatarUser} />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium theme-text truncate">{name}</span>
          {last && (
            <span className="text-[10px] theme-faint whitespace-nowrap">
              {new Date(last.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
        {last ? (
          <p className="text-xs theme-muted truncate">
            {last.sender?.display_name === myId ? 'You' : last.sender?.display_name}: {last.body}
          </p>
        ) : (
          <p className="text-xs theme-faint italic">No messages yet</p>
        )}
      </div>
    </Link>
  );
}

export default function Messages() {
  const { id: activeId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [session, setSession] = useState(undefined);
  const [convs, setConvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) return;

      // Handle ?dm=userId — open or create a DM immediately
      const dmUserId = searchParams.get('dm');
      if (dmUserId) {
        api.createConversation({ member_ids: [dmUserId] }, session.access_token)
          .then(({ id }) => navigate(`/messages/${id}`, { replace: true }))
          .catch(console.error);
        return;
      }

      api.getConversations(session.access_token)
        .then(setConvs)
        .catch(console.error)
        .finally(() => setLoading(false));
    });
  }, []);

  if (session === undefined) {
    return <div className="min-h-screen theme-bg flex items-center justify-center theme-faint">Loading…</div>;
  }

  if (!session) {
    return (
      <div className="min-h-screen theme-bg flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-3">🔒</div>
          <h1 className="text-xl font-semibold theme-text">Sign in to message</h1>
        </div>
      </div>
    );
  }

  const myId = session.user.id;

  return (
    <div className="flex h-screen theme-bg">
      {/* Sidebar — conversation list */}
      <div className={`flex flex-col border-r theme-border-s theme-surface w-full md:w-72 shrink-0 ${activeId ? 'hidden md:flex' : 'flex'}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b theme-border-s">
          <div className="flex items-center gap-2">
            <Link to="/" className="theme-faint hover:theme-text text-lg">←</Link>
            <h1 className="font-semibold theme-text">Messages</h1>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="w-8 h-8 flex items-center justify-center rounded-full theme-surface2 border theme-border-s theme-muted hover:text-[var(--accent)] transition-colors text-lg"
            title="New message"
          >
            ✏️
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-6 text-center theme-faint text-sm">Loading…</div>
          ) : convs.length === 0 ? (
            <div className="p-6 text-center">
              <div className="text-4xl mb-2">💬</div>
              <p className="text-sm theme-muted">No conversations yet.</p>
              <button
                onClick={() => setShowNew(true)}
                className="mt-3 text-sm text-[var(--accent)] hover:underline"
              >
                Start one
              </button>
            </div>
          ) : (
            convs.map((conv) => (
              <ConvItem key={conv.id} conv={conv} myId={myId} active={conv.id === activeId} />
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className={`flex-1 ${activeId ? 'flex' : 'hidden md:flex'} flex-col`}>
        {activeId ? (
          <Outlet />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-5xl mb-3">💬</div>
              <p className="theme-muted">Select a conversation or start a new one</p>
              <button
                onClick={() => setShowNew(true)}
                className="mt-4 px-4 py-2 rounded-full text-sm font-medium text-white theme-btn-accent"
              >
                New Message
              </button>
            </div>
          </div>
        )}
      </div>

      {showNew && (
        <NewConversationModal
          token={session.access_token}
          onClose={() => setShowNew(false)}
        />
      )}
    </div>
  );
}
