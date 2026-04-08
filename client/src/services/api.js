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
  getPreferences: (token) => request('/auth/preferences', { headers: { Authorization: `Bearer ${token}` } }),
  savePreferences: (body, token) => request('/auth/preferences', { method: 'PUT', body: JSON.stringify(body), headers: { Authorization: `Bearer ${token}` } }),

  // Weather (public)
  getWeather: (params = {}) => request(`/weather?${toQueryString(params)}`),

  // Recommendations (auth required)
  getRecommendations: (date, token) => request(`/recommendations?date=${date}`, { headers: { Authorization: `Bearer ${token}` } }),

  // Itinerary
  buildItinerary: (body, token) => request('/itinerary/build', { method: 'POST', body: JSON.stringify(body), headers: { Authorization: `Bearer ${token}` } }),
  getMyItineraries: (token) => request('/itinerary/mine', { headers: { Authorization: `Bearer ${token}` } }),
  saveItinerary: (body, token) => request('/itinerary', { method: 'POST', body: JSON.stringify(body), headers: { Authorization: `Bearer ${token}` } }),
  updateItinerary: (id, body, token) => request(`/itinerary/${id}`, { method: 'PUT', body: JSON.stringify(body), headers: { Authorization: `Bearer ${token}` } }),
  getSharedItinerary: (token) => request(`/itinerary/share/${token}`),

  // Trips
  getTrip: (id, token) => request(`/trips/${id}`, token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
  getMyTrips: (token) => request('/trips/me/list', { headers: { Authorization: `Bearer ${token}` } }),
  createTrip: (body, token) => request('/trips', { method: 'POST', body: JSON.stringify(body), headers: { Authorization: `Bearer ${token}` } }),
  updateTrip: (id, body, token) => request(`/trips/${id}`, { method: 'PUT', body: JSON.stringify(body), headers: { Authorization: `Bearer ${token}` } }),
  deleteTrip: (id, token) => request(`/trips/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }),
  addEventToTrip: (tripId, event_id, token) => request(`/trips/${tripId}/events`, { method: 'POST', body: JSON.stringify({ event_id }), headers: { Authorization: `Bearer ${token}` } }),
  removeEventFromTrip: (tripId, eventId, token) => request(`/trips/${tripId}/events/${eventId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }),
  reorderTripEvents: (tripId, order, token) => request(`/trips/${tripId}/events/reorder`, { method: 'PUT', body: JSON.stringify({ order }), headers: { Authorization: `Bearer ${token}` } }),

  // Conversations / Messaging
  getConversations: (token) => request('/conversations', { headers: { Authorization: `Bearer ${token}` } }),
  getConversation: (id, token) => request(`/conversations/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
  createConversation: (body, token) => request('/conversations', { method: 'POST', body: JSON.stringify(body), headers: { Authorization: `Bearer ${token}` } }),
  getMessages: (convId, token, before) => request(`/conversations/${convId}/messages${before ? `?before=${before}` : ''}`, { headers: { Authorization: `Bearer ${token}` } }),
  sendMessage: (convId, body, token) => request(`/conversations/${convId}/messages`, { method: 'POST', body: JSON.stringify({ body }), headers: { Authorization: `Bearer ${token}` } }),
  addMember: (convId, user_id, token) => request(`/conversations/${convId}/members`, { method: 'POST', body: JSON.stringify({ user_id }), headers: { Authorization: `Bearer ${token}` } }),
  leaveConversation: (convId, token) => request(`/conversations/${convId}/members/me`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }),
  getEventGroups: (eventId, token) => request(`/events/${eventId}/groups`, { headers: { Authorization: `Bearer ${token}` } }),
  searchUsers: (q, token) => request(`/auth/users/search?q=${encodeURIComponent(q)}`, { headers: { Authorization: `Bearer ${token}` } }),

  // Collections
  toggleSave: (eventId, token) => request(`/events/${eventId}/save`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }),
  checkSaved: (eventId, token) => request(`/events/${eventId}/saved`, { headers: { Authorization: `Bearer ${token}` } }),
  getCollections: (token) => request('/me/collections', { headers: { Authorization: `Bearer ${token}` } }),

  // User profiles + safety
  getProfile: (userId, token) => request(`/users/${userId}`, token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
  updateProfile: (body, token) => request('/users/me', { method: 'PUT', body: JSON.stringify(body), headers: { Authorization: `Bearer ${token}` } }),
  blockUser: (userId, token) => request(`/users/${userId}/block`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }),
  unblockUser: (userId, token) => request(`/users/${userId}/block`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }),
  getMyBlocks: (token) => request('/users/me/blocks', { headers: { Authorization: `Bearer ${token}` } }),
  reportUser: (userId, reason, token) => request(`/users/${userId}/report`, { method: 'POST', body: JSON.stringify({ reason }), headers: { Authorization: `Bearer ${token}` } }),
  getAdminUserReports: (token) => request('/admin/user-reports', { headers: { Authorization: `Bearer ${token}` } }),
  reviewUserReport: (id, token) => request(`/admin/user-reports/${id}/review`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }),

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
