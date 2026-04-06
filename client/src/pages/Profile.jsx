import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase.js';
import { api } from '../services/api.js';
import Navbar from '../components/Layout/Navbar.jsx';

const GENDER_OPTIONS = ['Prefer not to say', 'Woman', 'Man', 'Non-binary', 'Other'];

function Avatar({ user, size = 20 }) {
  const s = `w-${size} h-${size}`;
  if (user?.avatar_url) {
    return <img src={user.avatar_url} referrerPolicy="no-referrer" className={`${s} rounded-full object-cover`} alt="" />;
  }
  return (
    <div className={`${s} rounded-full bg-[var(--accent)] text-white flex items-center justify-center text-2xl font-bold`}>
      {user?.display_name?.[0]?.toUpperCase() || '?'}
    </div>
  );
}

export default function Profile() {
  const { userId } = useParams(); // undefined on /profile/me
  const navigate = useNavigate();
  const [token, setToken] = useState(null);
  const [myId, setMyId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({});
  const [interestInput, setInterestInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setToken(session.access_token);
        setMyId(session.user.id);
      }
    });
  }, []);

  const targetId = userId || myId;
  const isOwnProfile = !userId || userId === myId;

  useEffect(() => {
    if (!targetId) return;
    setLoading(true);
    api.getProfile(targetId, token)
      .then((p) => { setProfile(p); setForm({ display_name: p.display_name, bio: p.bio || '', age: p.age || '', gender: p.gender || '', interests: p.interests || [] }); })
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [targetId, token]);

  async function saveProfile() {
    setSaving(true);
    try {
      const updated = await api.updateProfile({
        display_name: form.display_name,
        bio: form.bio,
        age: form.age ? Number(form.age) : null,
        gender: form.gender,
        interests: form.interests,
      }, token);
      setProfile((p) => ({ ...p, ...updated }));
      setIsEditing(false);
    } catch (e) {
      alert('Failed to save: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function blockUser() {
    if (!window.confirm(`Block ${profile.display_name}? They won't be able to message you.`)) return;
    await api.blockUser(profile.id, token);
    setActionMsg('User blocked.');
  }

  async function reportUser() {
    await api.reportUser(profile.id, reportReason, token);
    setShowReport(false);
    setReportReason('');
    setActionMsg('Report submitted. Thank you.');
  }

  function addInterest(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = interestInput.trim().replace(/,$/, '');
      if (val && !form.interests.includes(val)) {
        setForm((f) => ({ ...f, interests: [...f.interests, val] }));
      }
      setInterestInput('');
    }
  }

  function removeInterest(tag) {
    setForm((f) => ({ ...f, interests: f.interests.filter((t) => t !== tag) }));
  }

  if (loading) return (
    <div className="flex flex-col h-screen theme-bg">
      <Navbar />
      <div className="flex-1 flex items-center justify-center theme-faint text-sm">Loading…</div>
    </div>
  );

  if (!profile) return (
    <div className="flex flex-col h-screen theme-bg">
      <Navbar />
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <p className="theme-muted text-sm">This profile is not available.</p>
        <button onClick={() => navigate(-1)} className="text-xs text-[var(--accent)] hover:underline">← Go back</button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen theme-bg pb-20">
      <Navbar />
      <main className="max-w-lg mx-auto w-full px-4 py-8">
        {/* Avatar + name */}
        <div className="flex flex-col items-center gap-3 mb-6">
          <Avatar user={profile} size={24} />
          {isEditing ? (
            <input
              value={form.display_name}
              onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
              className="text-xl font-bold theme-text bg-transparent border-b-2 border-[var(--accent)] outline-none text-center"
              maxLength={50}
            />
          ) : (
            <h1 className="text-xl font-bold theme-text">{profile.display_name}</h1>
          )}
          <p className="text-xs theme-faint">
            Member since {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Profile card */}
        <div className="theme-surface rounded-2xl border theme-border-s p-5 space-y-4">
          {/* Bio */}
          <div>
            <label className="text-xs font-semibold theme-muted uppercase tracking-widest block mb-1">About</label>
            {isEditing ? (
              <textarea
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                placeholder="Tell people about yourself…"
                maxLength={500}
                rows={3}
                className="w-full text-sm theme-text theme-surface2 border theme-border-s rounded-xl px-3 py-2 outline-none focus:border-[var(--accent)] resize-none"
              />
            ) : (
              <p className="text-sm theme-muted">{profile.bio || <span className="theme-faint italic">No bio yet.</span>}</p>
            )}
          </div>

          {/* Age + Gender — own profile shows age in edit, never to others */}
          {(isOwnProfile || profile.gender) && (
            <div className="flex gap-4">
              {isOwnProfile && (
                <div className="flex-1">
                  <label className="text-xs font-semibold theme-muted uppercase tracking-widest block mb-1">Age</label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={form.age}
                      onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
                      min={13} max={120}
                      className="w-full text-sm theme-text theme-surface2 border theme-border-s rounded-xl px-3 py-1.5 outline-none focus:border-[var(--accent)]"
                    />
                  ) : (
                    <p className="text-sm theme-muted">{profile.age || <span className="theme-faint italic">—</span>}</p>
                  )}
                </div>
              )}
              <div className="flex-1">
                <label className="text-xs font-semibold theme-muted uppercase tracking-widest block mb-1">Gender</label>
                {isEditing ? (
                  <select
                    value={form.gender}
                    onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                    className="w-full text-sm theme-text theme-surface2 border theme-border-s rounded-xl px-3 py-1.5 outline-none focus:border-[var(--accent)]"
                  >
                    <option value="">Not specified</option>
                    {GENDER_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                ) : (
                  <p className="text-sm theme-muted">{profile.gender || <span className="theme-faint italic">—</span>}</p>
                )}
              </div>
            </div>
          )}

          {/* Interests */}
          <div>
            <label className="text-xs font-semibold theme-muted uppercase tracking-widest block mb-1.5">Interests</label>
            <div className="flex flex-wrap gap-1.5">
              {(isEditing ? form.interests : profile.interests || []).map((tag) => (
                <span key={tag} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] font-medium">
                  {tag}
                  {isEditing && (
                    <button onClick={() => removeInterest(tag)} className="ml-0.5 opacity-60 hover:opacity-100">×</button>
                  )}
                </span>
              ))}
              {isEditing && (
                <input
                  value={interestInput}
                  onChange={(e) => setInterestInput(e.target.value)}
                  onKeyDown={addInterest}
                  placeholder="Add interest, press Enter"
                  className="text-xs px-2.5 py-1 rounded-full border theme-border-s theme-surface2 theme-text outline-none focus:border-[var(--accent)] min-w-[120px]"
                />
              )}
              {!isEditing && (profile.interests || []).length === 0 && (
                <span className="text-sm theme-faint italic">No interests listed.</span>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-4 flex gap-2">
          {isOwnProfile ? (
            isEditing ? (
              <>
                <button onClick={saveProfile} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-40">
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => setIsEditing(false)} className="px-4 py-2.5 rounded-xl border theme-border-s theme-surface2 theme-muted text-sm">
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setIsEditing(true)} className="flex-1 py-2.5 rounded-xl bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90">
                  Edit Profile
                </button>
                <button onClick={() => navigate('/settings/blocks')} className="px-4 py-2.5 rounded-xl border theme-border-s theme-surface2 theme-muted text-sm">
                  Block List
                </button>
              </>
            )
          ) : (
            <>
              <button
                onClick={() => navigate(`/messages?dm=${profile.id}`)}
                className="flex-1 py-2.5 rounded-xl bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90"
              >
                Message
              </button>
              <button onClick={blockUser} className="px-4 py-2.5 rounded-xl border theme-border-s theme-surface2 text-sm theme-muted hover:text-red-500 transition-colors">
                Block
              </button>
              <button onClick={() => setShowReport(true)} className="px-4 py-2.5 rounded-xl border theme-border-s theme-surface2 text-sm theme-muted hover:text-red-500 transition-colors">
                Report
              </button>
            </>
          )}
        </div>

        {actionMsg && <p className="text-center text-sm text-green-600 mt-3">{actionMsg}</p>}

        {/* Report modal */}
        {showReport && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="w-full max-w-sm theme-surface rounded-2xl border theme-border-s p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold theme-text">Report {profile.display_name}</h3>
                <button onClick={() => setShowReport(false)} className="theme-faint hover:theme-text text-xl">&times;</button>
              </div>
              <textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Describe why you're reporting this user (optional)"
                rows={3}
                className="w-full text-sm theme-text theme-surface2 border theme-border-s rounded-xl px-3 py-2 outline-none focus:border-[var(--accent)] resize-none"
              />
              <button onClick={reportUser} className="w-full py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600">
                Submit Report
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
