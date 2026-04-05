import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../services/supabase.js';
import { api } from '../../services/api.js';
import { useMessages } from '../../hooks/useMessages.js';
import NewConversationModal from './NewConversationModal.jsx';

function Avatar({ user, size = 8 }) {
  const s = `w-${size} h-${size}`;
  if (user?.avatar_url) {
    return <img src={user.avatar_url} referrerPolicy="no-referrer" className={`${s} rounded-full object-cover shrink-0`} alt="" />;
  }
  return (
    <div className={`${s} rounded-full bg-[var(--accent)] text-white flex items-center justify-center text-xs font-bold shrink-0`}>
      {user?.display_name?.[0]?.toUpperCase() || '?'}
    </div>
  );
}

function MessageBubble({ msg, isMe }) {
  if (msg.is_deleted) {
    return <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
      <span className="text-xs theme-faint italic px-3 py-1.5">[deleted]</span>
    </div>;
  }

  return (
    <div className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isMe && <Avatar user={msg.sender} size={6} />}
      <div className={`max-w-[72%] space-y-0.5 ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
        {!isMe && (
          <span className="text-[10px] theme-faint px-1">{msg.sender?.display_name}</span>
        )}
        <div className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
          isMe
            ? 'bg-[var(--accent)] text-white rounded-br-sm'
            : 'theme-surface2 border theme-border-s theme-text rounded-bl-sm'
        }`}>
          {msg.body}
        </div>
        <span className="text-[10px] theme-faint px-1">
          {new Date(msg.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}

export default function ChatView() {
  const { id } = useParams();
  const [token, setToken] = useState(null);
  const [myId, setMyId] = useState(null);
  const [conv, setConv] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const bottomRef = useRef(null);

  const { messages, loading } = useMessages(id, token);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      setToken(session.access_token);
      setMyId(session.user.id);
      api.getConversation(id, session.access_token)
        .then(setConv)
        .catch(console.error);
    });
  }, [id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await api.sendMessage(id, text.trim(), token);
      setText('');
    } catch (err) {
      alert('Failed to send: ' + err.message);
    } finally {
      setSending(false);
    }
  }

  function getConvName() {
    if (!conv) return '…';
    if (conv.is_group) return conv.name;
    // DM: show the other person's name
    const other = conv.members?.find((m) => m.user?.id !== myId);
    return other?.user?.display_name || 'Chat';
  }

  const isAdmin = conv?.my_role === 'admin';

  return (
    <div className="flex flex-col h-full theme-bg">
      {/* Header */}
      <div className="theme-surface border-b theme-border-s px-4 py-3 flex items-center gap-3 shrink-0">
        <Link to="/messages" className="theme-faint hover:theme-text text-lg leading-none mr-1">←</Link>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold theme-text truncate">{getConvName()}</h2>
          {conv?.is_group && (
            <button
              onClick={() => setShowMembers((v) => !v)}
              className="text-xs theme-muted hover:theme-text"
            >
              {conv.members?.length || 0} members
            </button>
          )}
          {conv?.event && (
            <p className="text-xs theme-faint truncate">re: {conv.event.title}</p>
          )}
        </div>
        {isAdmin && conv?.is_group && (
          <button
            onClick={() => setShowAddMember(true)}
            className="text-xs px-3 py-1.5 rounded-full border theme-border-s theme-surface2 theme-muted hover:text-[var(--accent)] transition-colors"
          >
            + Add
          </button>
        )}
      </div>

      {/* Members panel */}
      {showMembers && conv?.is_group && (
        <div className="theme-surface2 border-b theme-border-s px-4 py-3 flex flex-wrap gap-2">
          {conv.members?.map((m) => (
            <span key={m.user?.id} className="flex items-center gap-1.5 text-xs theme-surface px-2.5 py-1 rounded-full border theme-border-s theme-text">
              <Avatar user={m.user} size={4} />
              {m.user?.display_name}
              {m.role === 'admin' && <span className="text-[var(--accent)]">★</span>}
            </span>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading && (
          <div className="text-center theme-faint text-sm py-8">Loading messages…</div>
        )}
        {!loading && messages.length === 0 && (
          <div className="text-center theme-faint text-sm py-8">
            No messages yet. Say hello! 👋
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} isMe={msg.sender?.id === myId || msg.sender_id === myId} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Send box */}
      <form onSubmit={handleSend} className="theme-surface border-t theme-border-s px-4 py-3 flex gap-2 shrink-0">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message…"
          className="flex-1 px-4 py-2 text-sm rounded-2xl border theme-input"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="px-4 py-2 rounded-2xl text-sm font-medium text-white theme-btn-accent disabled:opacity-40 transition-all"
        >
          Send
        </button>
      </form>

      {/* Add member modal */}
      {showAddMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="theme-surface rounded-3xl w-full max-w-sm theme-shadow-lg overflow-hidden p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold theme-text">Add Member</h3>
              <button onClick={() => setShowAddMember(false)} className="theme-faint hover:theme-text text-xl">&times;</button>
            </div>
            <AddMemberSearch convId={id} token={token} onClose={() => setShowAddMember(false)} onAdded={(u) => {
              setConv((c) => c ? { ...c, members: [...(c.members || []), { user: u, role: 'member' }] } : c);
            }} />
          </div>
        </div>
      )}
    </div>
  );
}

function AddMemberSearch({ convId, token, onClose, onAdded }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const timer = useRef(null);

  function handleSearch(e) {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(timer.current);
    if (!val.trim()) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      const data = await api.searchUsers(val, token);
      setResults(data);
    }, 300);
  }

  async function add(user) {
    try {
      await api.addMember(convId, user.id, token);
      onAdded(user);
      onClose();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={query}
        onChange={handleSearch}
        placeholder="Search people…"
        className="w-full px-3 py-2 text-sm rounded-xl border theme-input"
        autoFocus
      />
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {results.map((u) => (
          <button
            key={u.id}
            onClick={() => add(u)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:theme-surface2 text-left"
          >
            {u.avatar_url
              ? <img src={u.avatar_url} referrerPolicy="no-referrer" className="w-7 h-7 rounded-full object-cover" alt="" />
              : <div className="w-7 h-7 rounded-full bg-[var(--accent)] text-white flex items-center justify-center text-xs font-bold">{u.display_name?.[0]?.toUpperCase()}</div>
            }
            <span className="text-sm theme-text">{u.display_name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
