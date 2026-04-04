const BASE = import.meta.env.VITE_API_BASE_URL;

async function request(path, options = {}) {
  const { headers: extraHeaders, ...rest } = options;
  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

// Serialize params to query string, supporting array values as repeated keys
// e.g. { category: ['Music','Food'] } → "category=Music&category=Food"
function toQueryString(params) {
  const parts = [];
  for (const [key, val] of Object.entries(params)) {
    if (val === undefined || val === null) continue;
    if (Array.isArray(val)) {
      val.forEach((v) => parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`));
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(val)}`);
    }
  }
  return parts.join('&');
}

export const api = {
  // Events
  getEvents: (params) => request(`/events?${toQueryString(params)}`),
  getEvent: (id) => request(`/events/${id}`),
  getEventsWithinBounds: (params) => request(`/events/within-bounds?${toQueryString(params)}`),

  // Submissions
  getMySubmissions: (token) => request('/submissions/mine', { headers: { Authorization: `Bearer ${token}` } }),
  createSubmission: (body, token) => request('/submissions', { method: 'POST', body: JSON.stringify(body), headers: { Authorization: `Bearer ${token}` } }),
  updateSubmission: (id, body, token) => request(`/submissions/${id}`, { method: 'PUT', body: JSON.stringify(body), headers: { Authorization: `Bearer ${token}` } }),

  // Comments
  getComments: (eventId) => request(`/events/${eventId}/comments`),
  createComment: (eventId, body, token) => request(`/events/${eventId}/comments`, { method: 'POST', body: JSON.stringify(body), headers: { Authorization: `Bearer ${token}` } }),
  reportComment: (commentId, token) => request(`/comments/${commentId}/report`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }),

  // Auth
  getMe: (token) => request('/auth/me', { headers: { Authorization: `Bearer ${token}` } }),
  geocode: (address, token) => request('/auth/geocode', { method: 'POST', body: JSON.stringify({ address }), headers: { Authorization: `Bearer ${token}` } }),

  // Admin
  getAdminSubmissions: (token) => request('/admin/submissions', { headers: { Authorization: `Bearer ${token}` } }),
  getAdminAllSubmissions: (token, status) => request(`/admin/submissions/all${status ? `?status=${status}` : ''}`, { headers: { Authorization: `Bearer ${token}` } }),
  getAdminFlagged: (token) => request('/admin/flagged', { headers: { Authorization: `Bearer ${token}` } }),
  getReportedComments: (token) => request('/admin/reported-comments', { headers: { Authorization: `Bearer ${token}` } }),
  approveSubmission: (id, token) => request(`/admin/submissions/${id}/approve`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } }),
  rejectSubmission: (id, reason, token) => request(`/admin/submissions/${id}/reject`, { method: 'PUT', body: JSON.stringify({ reason }), headers: { Authorization: `Bearer ${token}` } }),
  flagSubmission: (id, token) => request(`/admin/submissions/${id}/flag`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } }),
  deleteComment: (id, token) => request(`/admin/comments/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }),
  banUser: (id, token) => request(`/admin/users/${id}/ban`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }),
};
