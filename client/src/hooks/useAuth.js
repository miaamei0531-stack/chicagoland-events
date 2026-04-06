import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase.js';
import { api } from '../services/api.js';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null); // our users table record
  const [loading, setLoading] = useState(true);

  async function syncUserRecord(supabaseUser) {
    if (!supabaseUser) return;
    try {
      // Upsert into our users table on every login
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: supabaseUser.id,
          email: supabaseUser.email,
          display_name:
            supabaseUser.user_metadata?.full_name ||
            supabaseUser.email?.split('@')[0],
          avatar_url: supabaseUser.user_metadata?.avatar_url || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
    } catch (err) {
      console.error('Failed to sync user record:', err);
    }
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) syncUserRecord(u);
      setLoading(false);
    });

    // Listen for auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const u = session?.user ?? null;
        setUser(u);
        if (u) await syncUserRecord(u);
        else setProfile(null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function signIn() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
        skipBrowserRedirect: false,
      },
    });
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }

  return { user, profile, loading, signIn, signOut };
}
