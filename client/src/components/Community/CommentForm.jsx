import { useState, useEffect, useRef } from 'react';
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

export default function CommentForm({ eventId, onPosted, replyTo, onCancelReply }) {
  const { user } = useAuth();
  const [body, setBody] = useState('');
  const [type, setType] = useState('general');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const textareaRef = useRef(null);

  // Focus textarea when replying
  useEffect(() => {
    if (replyTo) textareaRef.current?.focus();
  }, [replyTo]);

  if (!user) {
    return (
      <div className="theme-surface2 rounded-xl p-3 text-center text-sm theme-faint border theme-border-s">
        <button
          onClick={() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })}
          className="text-[var(--accent)] hover:underline"
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
      await api.createComment(eventId, {
        body,
        type,
        reply_to_name: replyTo?.display_name || null,
      }, session?.access_token);
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

      {/* Reply-to banner */}
      {replyTo && (
        <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/20">
          <span className="text-xs text-[var(--accent)]">↩ Replying to <strong>{replyTo.display_name}</strong></span>
          <button type="button" onClick={onCancelReply} className="text-xs text-[var(--accent)] hover:opacity-70 ml-2">✕</button>
        </div>
      )}

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
                : 'theme-surface border-[var(--border-subtle)] theme-faint hover:theme-muted'
            }`}
          >
            {type === t.value ? <CommentBadge type={t.value} /> : t.label}
          </button>
        ))}
      </div>

      <textarea
        ref={textareaRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={replyTo ? `Reply to ${replyTo.display_name}…` : 'Add a comment…'}
        rows={3}
        className="w-full text-sm theme-surface2 border theme-border-s rounded-xl px-3 py-2 focus:outline-none focus:border-[var(--accent)] resize-none theme-text"
      />

      <button
        type="submit"
        disabled={submitting || !body.trim()}
        className="w-full bg-official text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? 'Posting…' : replyTo ? `Reply to ${replyTo.display_name}` : 'Post Comment'}
      </button>
    </form>
  );
}
