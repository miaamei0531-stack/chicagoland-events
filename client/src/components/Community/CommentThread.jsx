import { useComments } from '../../hooks/useComments.js';
import CommentBadge from './CommentBadge.jsx';
import CommentForm from './CommentForm.jsx';
import { formatDateTime } from '../../utils/formatDate.js';

export default function CommentThread({ eventId }) {
  const { comments, loading, error, refetch } = useComments(eventId);

  return (
    <div className="mt-4 border-t pt-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">
        Comments {comments.length > 0 && <span className="text-gray-400 font-normal">({comments.length})</span>}
      </h3>

      {loading && <p className="text-sm text-gray-400">Loading comments...</p>}
      {error && <p className="text-sm text-red-400">Failed to load comments.</p>}

      {!loading && comments.length === 0 && (
        <p className="text-sm text-gray-400 mb-3">No comments yet. Be the first!</p>
      )}

      <div className="space-y-3 mb-4">
        {comments.map((comment) => (
          <div key={comment.id} className="text-sm">
            <div className="flex items-center gap-2 mb-1">
              {/* Avatar */}
              {comment.user?.avatar_url ? (
                <img
                  src={comment.user.avatar_url}
                  alt={comment.user.display_name}
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500 font-bold">
                  {comment.user?.display_name?.[0]?.toUpperCase() ?? '?'}
                </div>
              )}
              <span className="font-medium text-gray-700">
                {comment.user?.display_name ?? '[deleted]'}
              </span>
              <CommentBadge type={comment.type} />
              <span className="text-gray-400 text-xs ml-auto">
                {formatDateTime(comment.created_at)}
              </span>
            </div>
            <p className={`ml-8 text-gray-600 leading-relaxed ${comment.body === '[removed]' ? 'italic text-gray-400' : ''}`}>
              {comment.body}
            </p>
          </div>
        ))}
      </div>

      <CommentForm eventId={eventId} onPosted={refetch} />
    </div>
  );
}
