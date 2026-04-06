import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import SubmissionReviewCard from './SubmissionReviewCard';
import ReportedComments from './ReportedComments';

const TABS = [
  { id: 'pending', label: 'Pending Submissions' },
  { id: 'flagged', label: 'Flagged Events' },
  { id: 'comments', label: 'Reported Comments' },
  { id: 'user-reports', label: 'User Reports' },
  { id: 'all', label: 'All Submissions' },
];

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const STATUS_STYLES = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  flagged: 'bg-orange-100 text-orange-700',
};

// ── Pending Submissions Tab ────────────────────────────────────────────────
function PendingTab({ token }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    api.getAdminSubmissions(token)
      .then(setSubmissions)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  function handleAction(id) {
    setSubmissions((prev) => prev.filter((s) => s.id !== id));
  }

  if (loading) return <div className="text-gray-500 py-8 text-center">Loading submissions…</div>;
  if (error) return <div className="text-red-600 py-8 text-center">Error: {error}</div>;
  if (!submissions.length) return (
    <div className="py-12 text-center text-gray-400">
      <div className="text-4xl mb-2">🎉</div>
      <p>Queue is empty — nothing to review.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">{submissions.length} pending submission{submissions.length !== 1 ? 's' : ''}, sorted by verification score</p>
      {submissions.map((s) => (
        <SubmissionReviewCard key={s.id} submission={s} token={token} onAction={handleAction} />
      ))}
    </div>
  );
}

// ── Flagged Events Tab ─────────────────────────────────────────────────────
function FlaggedTab({ token }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    api.getAdminFlagged(token)
      .then(setEvents)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleApprove(id) {
    try {
      await api.approveSubmission(id, token);
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      alert('Failed: ' + err.message);
    }
  }

  if (loading) return <div className="text-gray-500 py-8 text-center">Loading flagged events…</div>;
  if (error) return <div className="text-red-600 py-8 text-center">Error: {error}</div>;
  if (!events.length) return (
    <div className="py-12 text-center text-gray-400">
      <div className="text-4xl mb-2">✅</div>
      <p>No flagged events.</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {events.map((e) => (
        <div key={e.id} className="bg-white border border-orange-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-medium text-gray-900">{e.title}</h3>
              <div className="text-sm text-gray-500 mt-0.5">
                {formatDate(e.start_datetime)} · Score: {e.verification_score ?? '—'}
              </div>
              {e.submission_notes && (
                <p className="text-sm text-amber-700 mt-1">{e.submission_notes}</p>
              )}
              {e.submitter && (
                <p className="text-xs text-gray-400 mt-1">by {e.submitter.display_name}</p>
              )}
            </div>
            <button
              onClick={() => handleApprove(e.id)}
              className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700"
            >
              Approve
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── User Reports Tab ───────────────────────────────────────────────────────
function UserReportsTab({ token }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAdminUserReports(token)
      .then(setReports)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  async function handleReview(id) {
    await api.reviewUserReport(id, token);
    setReports((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleBan(userId, reportId) {
    if (!window.confirm('Ban this user? This cannot be undone.')) return;
    await api.banUser(userId, token);
    await api.reviewUserReport(reportId, token);
    setReports((prev) => prev.filter((r) => r.id !== reportId));
  }

  if (loading) return <div className="text-gray-500 py-8 text-center">Loading…</div>;
  if (!reports.length) return (
    <div className="py-12 text-center text-gray-400">
      <div className="text-4xl mb-2">✅</div>
      <p>No unreviewed user reports.</p>
    </div>
  );

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">{reports.length} unreviewed report{reports.length !== 1 ? 's' : ''}</p>
      {reports.map((r) => (
        <div key={r.id} className="bg-white border border-red-100 rounded-xl p-4 shadow-sm space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium text-gray-900">
                <span className="text-red-500">{r.reporter?.display_name}</span>
                {' reported '}
                <span className="text-gray-800">{r.reported?.display_name}</span>
                {r.reported?.is_banned && <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Banned</span>}
              </p>
              {r.reason && <p className="text-sm text-gray-600 mt-1 italic">"{r.reason}"</p>}
              <p className="text-xs text-gray-400 mt-1">{formatDate(r.created_at)}</p>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => handleReview(r.id)} className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
              Dismiss
            </button>
            {!r.reported?.is_banned && (
              <button onClick={() => handleBan(r.reported_id || r.reported?.id, r.id)} className="px-3 py-1.5 text-xs rounded-lg bg-red-500 text-white hover:bg-red-600">
                Ban User
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── All Submissions Tab ────────────────────────────────────────────────────
function AllSubmissionsTab({ token }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    api.getAdminAllSubmissions(token, statusFilter || undefined)
      .then(setItems)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token, statusFilter]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="flagged">Flagged</option>
        </select>
        {!loading && (
          <span className="text-sm text-gray-500">{items.length} results</span>
        )}
      </div>

      {loading ? (
        <div className="text-gray-500 py-8 text-center">Loading…</div>
      ) : error ? (
        <div className="text-red-600 py-8 text-center">Error: {error}</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Title</th>
                <th className="text-left px-4 py-3">Category</th>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Score</th>
                <th className="text-left px-4 py-3">Submitter</th>
                <th className="text-left px-4 py-3">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate">{item.title}</td>
                  <td className="px-4 py-3 text-gray-500">{(item.category || []).join(', ')}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(item.start_datetime)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[item.submission_status] || 'bg-gray-100 text-gray-600'}`}>
                      {item.submission_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{item.verification_score ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{item.submitter?.display_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{formatDate(item.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!items.length && (
            <div className="py-8 text-center text-gray-400">No submissions found.</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main AdminDashboard component ──────────────────────────────────────────
export default function AdminDashboard({ token }) {
  const [activeTab, setActiveTab] = useState('pending');

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-white border border-b-0 border-gray-200 text-blue-600 -mb-px'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'pending' && <PendingTab token={token} />}
      {activeTab === 'flagged' && <FlaggedTab token={token} />}
      {activeTab === 'comments' && <ReportedComments token={token} />}
      {activeTab === 'user-reports' && <UserReportsTab token={token} />}
      {activeTab === 'all' && <AllSubmissionsTab token={token} />}
    </div>
  );
}
