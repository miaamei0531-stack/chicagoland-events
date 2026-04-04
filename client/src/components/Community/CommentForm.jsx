import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { supabase } from '../../services/supabase.js';
import { api } from '../../services/api.js';
import CommentBadge from './CommentBadge.jsx';

const TYPES = [
  { value: 'general', label: 'General' },
  { value: 'looking_to_join', label: 'Looking to Join' },
  { value: 'carpool_offer', label: 'Carpool Offer' },
  { value: 'carpool_request', label: 'Carpool Request' },
  { value: 'question', label: 'Question' },
];

export default function CommentForm({ eventId, onPosted }) {
  const { user } = useAuth();
  const [body, setBody] = useState('');
  const [type, setType] = useState('general');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!user) {
    return (
      <div className="bg-gray-50 rounded-lg p-3 text-center text-sm text-gray-500">
        <button
          onClick={() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })}
          className="text-blue-500 hover:underline"
        >
          Sign in
        </button>{' '}
        to leave a comment.
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!body.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await api.createComment(eventId, { body, type }, session?.access_token);
      setBody('');
      setType('general');
      onPosted?.();
    } catch (err) {
      setError('Failed to post comment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {error && <p className="text-xs text-red-500">{error}</p>}

      {/* Type selector */}
      <div className="flex flex-wrap gap-1.5">
        {TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setType(t.value)}
            className={`text-xs px-2 py-1 rounded-full border transition-colors ${
              type === t.value
                ? 'border-transparent'
                : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
            }`}
            style={type === t.value ? {} : {}}
          >
            {type === t.value ? <CommentBadge type={t.value} /> : t.label}
          </button>
        ))}
      </div>

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Add a comment..."
        rows={3}
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400 resize-none"
      />

      <button
        type="submit"
        disabled={submitting || !body.trim()}
        className="w-full bg-official text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? 'Posting...' : 'Post Comment'}
      </button>
    </form>
  );
}
