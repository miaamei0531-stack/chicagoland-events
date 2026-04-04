import { useState } from 'react';
import { api } from '../../services/api';
import VerificationScoreBar from './VerificationScoreBar';

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

export default function SubmissionReviewCard({ submission, token, onAction }) {
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [loading, setLoading] = useState(null); // 'approve' | 'reject' | 'flag'

  async function handleApprove() {
    setLoading('approve');
    try {
      await api.approveSubmission(submission.id, token);
      onAction(submission.id, 'approved');
    } catch (err) {
      alert('Failed to approve: ' + err.message);
    } finally {
      setLoading(null);
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) return;
    setLoading('reject');
    try {
      await api.rejectSubmission(submission.id, rejectReason.trim(), token);
      onAction(submission.id, 'rejected');
    } catch (err) {
      alert('Failed to reject: ' + err.message);
    } finally {
      setLoading(null);
    }
  }

  async function handleFlag() {
    setLoading('flag');
    try {
      await api.flagSubmission(submission.id, token);
      onAction(submission.id, 'flagged');
    } catch (err) {
      alert('Failed to flag: ' + err.message);
    } finally {
      setLoading(null);
    }
  }

  const submitter = submission.submitter;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-gray-900 text-lg leading-tight">{submission.title}</h3>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {(submission.category || []).map((cat) => (
              <span key={cat} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                {cat}
              </span>
            ))}
          </div>
        </div>
        <span className="text-xs text-gray-400 whitespace-nowrap">
          {formatDateTime(submission.created_at)}
        </span>
      </div>

      {/* Event details */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-600">
        <div><span className="font-medium">Start:</span> {formatDateTime(submission.start_datetime)}</div>
        {submission.end_datetime && (
          <div><span className="font-medium">End:</span> {formatDateTime(submission.end_datetime)}</div>
        )}
        {submission.venue_name && (
          <div className="col-span-2"><span className="font-medium">Venue:</span> {submission.venue_name}</div>
        )}
        {submission.address && (
          <div className="col-span-2"><span className="font-medium">Address:</span> {submission.address}{submission.city ? `, ${submission.city}` : ''}</div>
        )}
        <div>
          <span className="font-medium">Price:</span>{' '}
          {submission.is_free ? 'Free' : submission.price_min != null ? `$${submission.price_min}${submission.price_max ? `–$${submission.price_max}` : '+'}` : 'Paid'}
        </div>
        {submission.official_url && (
          <div>
            <a
              href={submission.official_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline truncate"
            >
              Official URL ↗
            </a>
          </div>
        )}
      </div>

      {/* Description */}
      {submission.description && (
        <p className="text-sm text-gray-600 line-clamp-3">{submission.description}</p>
      )}

      {/* Verification score */}
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Verification</p>
        <VerificationScoreBar score={submission.verification_score ?? 0} details={submission.verification_details} />
      </div>

      {/* Submitter */}
      {submitter && (
        <div className="text-sm text-gray-500 flex items-center gap-3">
          <span>
            Submitted by <span className="font-medium text-gray-700">{submitter.display_name || submitter.email}</span>
          </span>
          <span className="text-gray-300">|</span>
          <span>{submitter.submission_count ?? 0} submissions</span>
          <span className="text-gray-300">|</span>
          <span>{submitter.approved_count ?? 0} approved</span>
        </div>
      )}

      {/* Submission notes */}
      {submission.submission_notes && (
        <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {submission.submission_notes}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleApprove}
          disabled={!!loading}
          className="px-4 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {loading === 'approve' ? 'Approving…' : 'Approve'}
        </button>
        <button
          onClick={() => setShowRejectForm((v) => !v)}
          disabled={!!loading}
          className="px-4 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"
        >
          Reject
        </button>
        <button
          onClick={handleFlag}
          disabled={!!loading}
          className="px-4 py-1.5 bg-yellow-500 text-white text-sm rounded-lg hover:bg-yellow-600 disabled:opacity-50"
        >
          {loading === 'flag' ? 'Flagging…' : 'Flag'}
        </button>
      </div>

      {/* Reject reason form */}
      {showRejectForm && (
        <div className="flex gap-2">
          <input
            type="text"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason for rejection (required)"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          />
          <button
            onClick={handleReject}
            disabled={!rejectReason.trim() || !!loading}
            className="px-4 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {loading === 'reject' ? 'Rejecting…' : 'Confirm Reject'}
          </button>
        </div>
      )}
    </div>
  );
}
