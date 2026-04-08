import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';

export default function UserAvatar() {
  const { user, profile, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!user) return null;

  const avatarUrl = user.user_metadata?.avatar_url;
  const displayName = profile?.display_name || user.user_metadata?.full_name || user.email;
  const isAdmin = profile?.is_admin;

  return (
    <div className="relative">
      <button
        onClick={() => setMenuOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full focus:outline-none"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={displayName} referrerPolicy="no-referrer" className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-official text-white flex items-center justify-center text-sm font-bold">
            {displayName?.[0]?.toUpperCase()}
          </div>
        )}
      </button>

      {menuOpen && (
        <>
          {/* Click-away backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 top-10 z-20 w-52 theme-surface border theme-border-s rounded-xl shadow-lg theme-shadow py-1 overflow-hidden">
            <div className="px-3 py-2.5 border-b theme-border-s">
              <div className="text-sm font-semibold theme-text truncate">{displayName}</div>
              <div className="text-xs theme-faint truncate">{user.email}</div>
              {isAdmin && (
                <span className="text-xs font-medium mt-0.5 block" style={{ color: 'var(--accent)' }}>Admin</span>
              )}
            </div>
            <Link to="/preferences" className="block px-3 py-2 text-sm theme-muted hover:theme-surface2 transition-colors" onClick={() => setMenuOpen(false)}>
              ⚙️ My Preferences
            </Link>
            <Link to="/profile/me" className="block px-3 py-2 text-sm theme-muted hover:theme-surface2 transition-colors" onClick={() => setMenuOpen(false)}>
              👤 My Profile
            </Link>
            <Link to="/messages" className="block px-3 py-2 text-sm theme-muted hover:theme-surface2 transition-colors" onClick={() => setMenuOpen(false)}>
              💬 Messages
            </Link>
            <Link to="/collections" className="block px-3 py-2 text-sm theme-muted hover:theme-surface2 transition-colors" onClick={() => setMenuOpen(false)}>
              🔖 Saved Events
            </Link>
            <Link to="/my-submissions" className="block px-3 py-2 text-sm theme-muted hover:theme-surface2 transition-colors" onClick={() => setMenuOpen(false)}>
              📋 My Submissions
            </Link>
            {isAdmin && (
              <Link to="/admin" className="block px-3 py-2 text-sm font-medium hover:theme-surface2 transition-colors" style={{ color: 'var(--accent)' }} onClick={() => setMenuOpen(false)}>
                🛡️ Admin Dashboard
              </Link>
            )}
            <div className="border-t theme-border-s mt-1">
              <button
                onClick={() => { signOut(); setMenuOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
