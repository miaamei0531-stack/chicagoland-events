import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase.js';
import { api } from '../../services/api.js';
import SubmissionStatusBadge from './SubmissionStatusBadge.jsx';
import SubmitEventForm from './SubmitEventForm.jsx';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function ScoreBar({ score }) {
  if (score == null) return null;
  const color = score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-yellow-400' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 bg-gray-200 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs text-gray-400">{score}/100</span>
    </div>
  );
}

export default function MySubmissions() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingSubmission, setEditingSubmission] = useState(null); // { id, initialData }

  async function load() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not signed in');
      const data = await api.getMySubmissions(session.access_token);
      setSubmissions(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function handleEditClose() {
    setEditingSubmission(null);
    load(); // refresh list after resubmit
  }

  if (loading) return <div className="text-gray-400 py-16 text-center">Loading your submissions…</div>;
  if (error) return <div className="text-red-600 py-16 text-center">Error: {error}</div>;

  if (!submissions.length) return (
    <div className="py-16 text-center text-gray-400">
      <div className="text-5xl mb-3">📋</div>
      <p className="font-medium text-gray-500">No submissions yet.</p>
      <p className="text-sm mt-1">Use the "+ Submit Event" button on the map to get started.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Edit/Resubmit modal */}
      {editingSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg h-[85vh] flex flex-col overflow-hidden">
            <SubmitEventForm
              onClose={handleEditClose}
              initialData={editingSubmission.initialData}
              submissionId={editingSubmission.id}
            />
          </div>
        </div>
      )}

      {submissions.map((s) => (
        <div
          key={s.id}
          className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-gray-900 truncate">{s.title}</h3>
                <SubmissionStatusBadge status={s.submission_status} />
              </div>
              <p className="text-sm text-gray-400 mt-0.5">
                {formatDate(s.start_datetime)} · Submitted {formatDate(s.created_at)}
              </p>
            </div>
            <ScoreBar score={s.verification_score} />
          </div>

          {/* Rejection / admin note */}
          {s.submission_notes && (
            <div className={`text-sm rounded-lg px-3 py-2 ${
              s.submission_status === 'rejected'
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              <span className="font-medium">
                {s.submission_status === 'rejected' ? 'Rejection reason: ' : 'Note: '}
              </span>
              {s.submission_notes}
            </div>
          )}

          {/* Edit & Resubmit — only for rejected */}
          {s.submission_status === 'rejected' && (
            <button
              onClick={() =>
                setEditingSubmission({
                  id: s.id,
                  initialData: {
                    title: s.title || '',
                    start_datetime: s.start_datetime || '',
                  },
                })
              }
              className="text-sm px-3 py-1.5 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50"
            >
              Edit & Resubmit
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
