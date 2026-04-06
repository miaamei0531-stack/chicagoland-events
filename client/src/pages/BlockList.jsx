import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase.js';
import { api } from '../services/api.js';
import Navbar from '../components/Layout/Navbar.jsx';

export default function BlockList() {
  const navigate = useNavigate();
  const [token, setToken] = useState(null);
  const [blocked, setBlocked] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unblocking, setUnblocking] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navigate('/'); return; }
      setToken(session.access_token);
      api.getMyBlocks(session.access_token)
        .then(setBlocked)
        .catch(console.error)
        .finally(() => setLoading(false));
    });
  }, []);

  async function unblock(userId) {
    setUnblocking(userId);
    try {
      await api.unblockUser(userId, token);
      setBlocked((prev) => prev.filter((u) => u.id !== userId));
    } catch (e) {
      console.error(e);
    } finally {
      setUnblocking(null);
    }
  }

  return (
    <div className="flex flex-col min-h-screen theme-bg pb-20">
      <Navbar />
      <main className="max-w-lg mx-auto w-full px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="theme-faint hover:theme-text text-lg">←</button>
          <h1 className="text-xl font-bold theme-text">Blocked Users</h1>
        </div>

        {loading && <p className="theme-faint text-sm text-center py-12">Loading…</p>}

        {!loading && blocked.length === 0 && (
          <p className="theme-faint text-sm text-center py-12">You haven't blocked anyone.</p>
        )}

        <div className="space-y-2">
          {blocked.map((user) => (
            <div key={user.id} className="flex items-center gap-3 p-3 rounded-xl border theme-border-s theme-surface">
              {user.avatar_url
                ? <img src={user.avatar_url} referrerPolicy="no-referrer" className="w-10 h-10 rounded-full object-cover shrink-0" alt="" />
                : <div className="w-10 h-10 rounded-full bg-[var(--accent)] text-white flex items-center justify-center font-bold shrink-0">{user.display_name?.[0]?.toUpperCase()}</div>
              }
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium theme-text truncate">{user.display_name}</p>
                <p className="text-xs theme-faint">Blocked {new Date(user.blocked_at).toLocaleDateString()}</p>
              </div>
              <button
                onClick={() => unblock(user.id)}
                disabled={unblocking === user.id}
                className="text-xs px-3 py-1.5 rounded-full border theme-border-s theme-surface2 theme-muted hover:text-[var(--accent)] transition-colors shrink-0"
              >
                {unblocking === user.id ? '…' : 'Unblock'}
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
