import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase.js';
import AdminDashboardComponent from '../components/Admin/AdminDashboard.jsx';

export default function AdminDashboard() {
  const [token, setToken] = useState(null);
  const [isAdmin, setIsAdmin] = useState(null); // null = loading
  const [error, setError] = useState(null);

  useEffect(() => {
    async function checkAdmin() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsAdmin(false);
        return;
      }
      setToken(session.access_token);

      // Verify admin status by hitting a protected endpoint
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/admin/submissions`,
          { headers: { Authorization: `Bearer ${session.access_token}` } }
        );
        if (res.status === 403) {
          setIsAdmin(false);
        } else if (res.ok) {
          setIsAdmin(true);
        } else {
          setError(`Unexpected error (${res.status})`);
        }
      } catch (err) {
        setError(err.message);
      }
    }
    checkAdmin();
  }, []);

  if (isAdmin === null && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Checking access…
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        Error: {error}
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-3">🔒</div>
          <h1 className="text-xl font-semibold text-gray-700">Admin access required</h1>
          <p className="text-gray-400 mt-1 text-sm">You need to be signed in with an admin account.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>
        <AdminDashboardComponent token={token} />
      </div>
    </div>
  );
}
