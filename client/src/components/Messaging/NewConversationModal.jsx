import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api.js';

function UserResult({ user, selected, onToggle }) {
  return (
    <button
      onClick={() => onToggle(user)}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all ${
        selected ? 'theme-surface2 border border-[var(--accent)]' : 'hover:theme-surface2'
      }`}
    >
      {user.avatar_url ? (
        <img src={user.avatar_url} referrerPolicy="no-referrer" className="w-8 h-8 rounded-full object-cover" alt="" />
      ) : (
        <div className="w-8 h-8 rounded-full bg-[var(--accent)] text-white flex items-center justify-center text-sm font-bold">
          {user.display_name?.[0]?.toUpperCase()}
        </div>
      )}
      <span className="text-sm theme-text flex-1">{user.display_name}</span>
      {selected && <span className="text-[var(--accent)] text-lg">✓</span>}
    </button>
  );
}

export default function NewConversationModal({ token, onClose, initialUserId = null, initialUserName = null, forEventId = null, forEventTitle = null }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(
    initialUserId ? [{ id: initialUserId, display_name: initialUserName }] : []
  );
  // Pre-set as group if launched from an event
  const [isGroup, setIsGroup] = useState(!!forEventId);
  const [groupName, setGroupName] = useState(forEventTitle ? `${forEventTitle} Group` : '');
  const [isPublic, setIsPublic] = useState(!!forEventId);
  const [creating, setCreating] = useState(false);
  const searchTimer = useRef(null);

  function handleSearch(e) {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(searchTimer.current);
    if (!val.trim()) { setResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      try {
        const data = await api.searchUsers(val, token);
        setResults(data);
      } catch {}
    }, 300);
  }

  function toggleUser(user) {
    setSelected((prev) =>
      prev.find((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user]
    );
  }

  async function handleCreate() {
    if (!selected.length) return;
    const shouldBeGroup = selected.length > 1 || isGroup;
    if (shouldBeGroup && !groupName.trim()) return;

    setCreating(true);
    try {
      const { id } = await api.createConversation({
        member_ids: selected.map((u) => u.id),
        is_group: shouldBeGroup,
        name: shouldBeGroup ? groupName.trim() : undefined,
        is_public: shouldBeGroup ? isPublic : false,
        event_id: forEventId || undefined,
      }, token);
      onClose();
      navigate(`/messages/${id}`);
    } catch (err) {
      alert('Failed to create conversation: ' + err.message);
    } finally {
      setCreating(false);
    }
  }

  const isMulti = selected.length > 1 || isGroup;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="theme-surface rounded-3xl w-full max-w-md theme-shadow-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b theme-border-s">
          <h2 className="font-semibold theme-text">New Message</h2>
          <button onClick={onClose} className="theme-faint hover:theme-text text-xl leading-none">&times;</button>
        </div>

        <div className="p-4 space-y-3">
          {/* Selected chips */}
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selected.map((u) => (
                <span
                  key={u.id}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs theme-surface2 border theme-border-s theme-text"
                >
                  {u.display_name}
                  <button onClick={() => toggleUser(u)} className="theme-faint hover:theme-text ml-0.5">×</button>
                </span>
              ))}
            </div>
          )}

          {/* Search */}
          <input
            type="text"
            value={query}
            onChange={handleSearch}
            placeholder="Search people…"
            className="w-full px-3 py-2 text-sm rounded-xl border theme-input"
            autoFocus={!initialUserId}
          />

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-0.5 max-h-40 overflow-y-auto">
              {results.map((u) => (
                <UserResult
                  key={u.id}
                  user={u}
                  selected={!!selected.find((s) => s.id === u.id)}
                  onToggle={toggleUser}
                />
              ))}
            </div>
          )}

          {/* Group options — show when multiple selected or explicitly toggled */}
          {selected.length === 1 && (
            <button
              onClick={() => setIsGroup(true)}
              className="text-xs text-[var(--accent)] hover:underline"
            >
              + Create a group instead
            </button>
          )}

          {isMulti && (
            <div className="space-y-2 pt-1 border-t theme-border-s">
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Group name (required)"
                className="w-full px-3 py-2 text-sm rounded-xl border theme-input"
              />
              <label className="flex items-center gap-2 text-sm theme-text cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-4 h-4 accent-[var(--accent)]"
                />
                Make group public (visible on event pages)
              </label>
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={!selected.length || (isMulti && !groupName.trim()) || creating}
            className="w-full py-2.5 rounded-xl text-sm font-medium text-white theme-btn-accent disabled:opacity-40 transition-all"
          >
            {creating ? 'Creating…' : selected.length === 1 && !isGroup ? 'Start Chat' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
}
