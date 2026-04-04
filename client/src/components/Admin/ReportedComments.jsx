import { useState, useEffect } from 'react';
import { api } from '../../services/api';

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ReportedComments({ token }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await api.getReportedComments(token);
        setComments(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  async function handleDelete(id) {
    setDeleting(id);
    try {
      await api.deleteComment(id, token);
      setComments((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      alert('Failed to delete comment: ' + err.message);
    } finally {
      setDeleting(null);
    }
  }

  if (loading) return <div className="text-gray-500 py-8 text-center">Loading reported comments…</div>;
  if (error) return <div className="text-red-600 py-8 text-center">Error: {error}</div>;
  if (!comments.length) return (
    <div className="py-12 text-center text-gray-400">
      <div className="text-4xl mb-2">✅</div>
      <p>No reported comments.</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {comments.map((comment) => (
        <div key={comment.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="font-medium text-gray-800 text-sm">
                  {comment.user?.display_name || 'Unknown user'}
                </span>
                <span className="text-gray-300">•</span>
                <span className="text-xs text-gray-400">{formatDate(comment.created_at)}</span>
                {comment.event && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="text-xs text-gray-500 truncate">on "{comment.event.title}"</span>
                  </>
                )}
              </div>
              <p className="text-sm text-gray-700 line-clamp-3">{comment.body}</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                🚩 {comment.reported_count} report{comment.reported_count !== 1 ? 's' : ''}
              </span>
              <button
                onClick={() => handleDelete(comment.id)}
                disabled={deleting === comment.id}
                className="px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleting === comment.id ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
