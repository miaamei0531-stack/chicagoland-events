import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';

export default function ShareTripModal({ tripId, token, onClose }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(null);
  const [sent, setSent] = useState(null);

  const tripUrl = `${window.location.origin}/trip/${tripId}`;

  useEffect(() => {
    api.getConversations(token)
      .then(setConversations)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  async function sendTo(convId) {
    setSending(convId);
    try {
      await api.sendMessage(convId, `Check out my day trip! ${tripUrl}`, token);
      setSent(convId);
      setTimeout(onClose, 1200);
    } catch (e) {
      console.error(e);
    } finally {
      setSending(null);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-sm theme-surface rounded-2xl theme-shadow-lg border theme-border-s overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b theme-border-s">
          <span className="text-sm font-semibold theme-text">Share Trip</span>
          <button onClick={onClose} className="theme-faint hover:theme-text text-xl leading-none">&times;</button>
        </div>

        {/* Copy link */}
        <div className="px-4 py-3 border-b theme-border-s">
          <p className="text-xs theme-muted mb-2">Copy link</p>
          <div className="flex gap-2">
            <input
              readOnly
              value={tripUrl}
              className="flex-1 text-xs theme-text theme-surface2 border theme-border-s rounded-lg px-2 py-1.5 outline-none truncate"
            />
            <button
              onClick={() => navigator.clipboard.writeText(tripUrl)}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white hover:opacity-90 shrink-0"
            >
              Copy
            </button>
          </div>
        </div>

        {/* Send to conversation */}
        <div className="px-4 py-3">
          <p className="text-xs theme-muted mb-2">Send to a conversation</p>
          {loading ? (
            <p className="text-xs theme-faint py-4 text-center">Loading…</p>
          ) : conversations.length === 0 ? (
            <p className="text-xs theme-faint py-4 text-center">No conversations yet.</p>
          ) : (
            <ul className="space-y-1.5 max-h-56 overflow-y-auto">
              {conversations.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => sendTo(c.id)}
                    disabled={!!sending || sent === c.id}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl border theme-border-s theme-surface2 hover:border-[var(--accent)] transition-all text-left"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium theme-text truncate">
                        {c.name || (c.members?.find((m) => !m.is_self)?.user?.display_name) || 'Conversation'}
                      </p>
                      {c.last_message && (
                        <p className="text-xs theme-faint truncate">{c.last_message}</p>
                      )}
                    </div>
                    <span className="text-xs text-[var(--accent)] shrink-0 ml-2">
                      {sent === c.id ? '✓ Sent!' : sending === c.id ? '…' : 'Send'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
