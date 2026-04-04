import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase.js';
import MySubmissionsComponent from '../components/Submissions/MySubmissions.jsx';

export default function MySubmissions() {
  const [session, setSession] = useState(undefined); // undefined = loading

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
  }, []);

  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Loading…
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-3">🔒</div>
          <h1 className="text-xl font-semibold text-gray-700">Sign in to view your submissions</h1>
          <p className="text-gray-400 mt-1 text-sm">Use the sign-in button in the top-right corner.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Submissions</h1>
        <MySubmissionsComponent />
      </div>
    </div>
  );
}
