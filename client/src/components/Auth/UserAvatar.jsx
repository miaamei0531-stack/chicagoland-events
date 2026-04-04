import { useState } from 'react';
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
          <div className="absolute right-0 top-10 z-20 w-48 bg-white border rounded-lg shadow-lg py-1">
            <div className="px-3 py-2 border-b">
              <div className="text-sm font-medium text-gray-800 truncate">{displayName}</div>
              <div className="text-xs text-gray-400 truncate">{user.email}</div>
              {isAdmin && (
                <span className="text-xs text-purple-600 font-medium">Admin</span>
              )}
            </div>
            <a
              href="/my-submissions"
              className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              onClick={() => setMenuOpen(false)}
            >
              My Submissions
            </a>
            {isAdmin && (
              <a
                href="/admin"
                className="block px-3 py-2 text-sm text-purple-600 hover:bg-purple-50"
                onClick={() => setMenuOpen(false)}
              >
                Admin Dashboard
              </a>
            )}
            <button
              onClick={() => { signOut(); setMenuOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50"
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
