import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useComments } from '../../hooks/useComments.js';
import CommentBadge from './CommentBadge.jsx';
import CommentForm from './CommentForm.jsx';
import { formatDateTime } from '../../utils/formatDate.js';

function UserAvatar({ user, onClick }) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 hover:opacity-80 transition-opacity focus:outline-none"
      title={`View ${user?.display_name}'s profile`}
    >
      {user?.avatar_url ? (
        <img
          src={user.avatar_url}
          referrerPolicy="no-referrer"
          alt={user.display_name}
          className="w-6 h-6 rounded-full object-cover"
        />
      ) : (
        <div className="w-6 h-6 rounded-full bg-[var(--accent)]/20 flex items-center justify-center text-xs font-bold text-[var(--accent)]">
          {user?.display_name?.[0]?.toUpperCase() ?? '?'}
        </div>
      )}
    </button>
  );
}

export default function CommentThread({ eventId }) {
  const navigate = useNavigate();
  const { comments, loading, error, refetch } = useComments(eventId);
  const [replyTo, setReplyTo] = useState(null); // { id, display_name }

  function handleAvatarClick(user) {
    if (!user?.id) return;
    navigate(`/profile/${user.id}`);
  }

  return (
    <div className="mt-4 border-t theme-border-s pt-4">
      <h3 className="text-sm font-semibold theme-text mb-3">
        Comments {comments.length > 0 && <span className="theme-faint font-normal">({comments.length})</span>}
      </h3>

      {loading && <p className="text-sm theme-faint">Loading comments...</p>}
      {error && <p className="text-sm text-red-400">Failed to load comments.</p>}

      {!loading && comments.length === 0 && (
        <p className="text-sm theme-faint mb-3">No comments yet. Be the first!</p>
      )}

      <div className="space-y-3 mb-4">
        {comments.map((comment) => (
          <div key={comment.id} className="text-sm group">
            <div className="flex items-center gap-2 mb-1">
              <UserAvatar user={comment.user} onClick={() => handleAvatarClick(comment.user)} />
              <button
                onClick={() => handleAvatarClick(comment.user)}
                className="font-medium theme-text hover:text-[var(--accent)] transition-colors"
              >
                {comment.user?.display_name ?? '[deleted]'}
              </button>
              <CommentBadge type={comment.type} />
              <span className="theme-faint text-xs ml-auto">{formatDateTime(comment.created_at)}</span>
            </div>

            {/* Reply-to quote */}
            {comment.reply_to_name && (
              <p className="ml-8 text-xs theme-faint italic mb-0.5">↩ replying to {comment.reply_to_name}</p>
            )}

            <div className="ml-8 flex items-start gap-2">
              <p className={`flex-1 theme-muted leading-relaxed ${comment.body === '[removed]' ? 'italic theme-faint' : ''}`}>
                {comment.body}
              </p>
              {/* Reply button — shows on hover */}
              {comment.user?.id && comment.body !== '[removed]' && (
                <button
                  onClick={() => setReplyTo(replyTo?.id === comment.id ? null : { id: comment.id, display_name: comment.user?.display_name })}
                  className="opacity-0 group-hover:opacity-100 text-xs theme-faint hover:text-[var(--accent)] transition-all shrink-0 mt-0.5"
                >
                  Reply
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <CommentForm
        eventId={eventId}
        onPosted={() => { refetch(); setReplyTo(null); }}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
      />
    </div>
  );
}
