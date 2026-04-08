import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Layout/Navbar.jsx';
import { ALL_CATEGORIES, CATEGORY_HEX } from '../utils/categoryColors.js';
import { api } from '../services/api.js';
import { supabase } from '../services/supabase.js';
import { useAuth } from '../hooks/useAuth.js';

const MOBILITY_OPTIONS = [
  { value: 'walking', emoji: '🚶', label: 'Walking', sub: "I prefer to stay in one area" },
  { value: 'driving', emoji: '🚗', label: 'Driving', sub: "I'll go wherever is worth it" },
  { value: 'transit', emoji: '🚌', label: 'Transit', sub: "CTA and Metra are fine" },
];

const DISTANCE_OPTIONS = [
  { value: 2, label: '2 km' },
  { value: 5, label: '5 km' },
  { value: 10, label: '10 km' },
  { value: 25, label: '25 km' },
  { value: 9999, label: 'Any' },
];

const GROUP_OPTIONS = [
  { value: 'solo', emoji: '👤', label: 'Just me' },
  { value: 'couple', emoji: '👫', label: 'Me and someone' },
  { value: 'family', emoji: '👨‍👩‍👧', label: 'Family with kids' },
  { value: 'group', emoji: '👥', label: 'A group' },
];

const BUDGET_OPTIONS = [
  { value: 'free', label: 'Free only' },
  { value: 'low', label: 'Budget-friendly' },
  { value: 'any', label: 'No limit' },
];

export default function Preferences() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [addressInput, setAddressInput] = useState('');
  const [addressSuggestion, setAddressSuggestion] = useState(null);
  const [geocoding, setGeocoding] = useState(false);
  const [homeAddress, setHomeAddress] = useState('');

  const [prefs, setPrefs] = useState({
    categories: [],
    mobility: 'driving',
    max_distance_km: 10,
    group_size: 'solo',
    budget: 'any',
    avoid: [],
  });

  // Load existing preferences
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const data = await api.getPreferences(session?.access_token);
        if (data.preferences && Object.keys(data.preferences).length > 0) {
          setPrefs((p) => ({ ...p, ...data.preferences }));
        }
        if (data.home_address) {
          setHomeAddress(data.home_address);
          setAddressInput(data.home_address);
        }
      } catch {
        // Non-fatal — just use defaults
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  function toggleCategory(cat) {
    setPrefs((p) => ({
      ...p,
      categories: p.categories.includes(cat)
        ? p.categories.filter((c) => c !== cat)
        : [...p.categories, cat],
    }));
  }

  async function geocodeAddress(addr) {
    if (!addr.trim()) return;
    setGeocoding(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const result = await api.geocode(addr, session?.access_token);
      setAddressSuggestion(result);
    } catch {
      setAddressSuggestion(null);
    } finally {
      setGeocoding(false);
    }
  }

  function confirmAddress(suggestion) {
    setHomeAddress(suggestion.formatted_address);
    setAddressInput(suggestion.formatted_address);
    setAddressSuggestion(null);
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await api.savePreferences(
        { preferences: prefs, home_address: homeAddress || undefined },
        session?.access_token
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save preferences:', err);
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen theme-bg">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <p className="theme-muted text-sm">Sign in to manage your preferences.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen theme-bg">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <p className="theme-muted text-sm">Loading your preferences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen theme-bg pb-20 md:pb-8">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <button onClick={() => navigate(-1)} className="text-sm theme-muted hover:theme-text mb-4 flex items-center gap-1">
            ← Back
          </button>
          <h1 className="text-2xl font-bold theme-text">Your Preferences</h1>
          <p className="text-sm theme-muted mt-1">Help us recommend events you'll actually love.</p>
        </div>

        <div className="space-y-8">

          {/* Categories */}
          <section className="theme-surface rounded-2xl p-5 border border-[var(--border-subtle)]">
            <h2 className="text-base font-semibold theme-text mb-1">What do you love?</h2>
            <p className="text-sm theme-muted mb-4">Select all that apply.</p>
            <div className="flex flex-wrap gap-2">
              {ALL_CATEGORIES.map((cat) => {
                const active = prefs.categories.includes(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className={`text-sm px-4 py-2 rounded-full border font-medium transition-all flex items-center gap-1.5 ${
                      active ? 'border-transparent text-white shadow-sm' : 'theme-surface2 theme-muted border-[var(--border-subtle)]'
                    }`}
                    style={active ? { backgroundColor: CATEGORY_HEX[cat] } : {}}
                  >
                    {active && <span className="leading-none">✓</span>}
                    {cat}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Mobility + Distance */}
          <section className="theme-surface rounded-2xl p-5 border border-[var(--border-subtle)]">
            <h2 className="text-base font-semibold theme-text mb-4">How do you get around?</h2>
            <div className="grid grid-cols-3 gap-3 mb-5">
              {MOBILITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPrefs((p) => ({ ...p, mobility: opt.value }))}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                    prefs.mobility === opt.value
                      ? 'border-[var(--accent)] theme-surface2'
                      : 'border-[var(--border-subtle)] theme-surface2'
                  }`}
                >
                  <span className="text-2xl">{opt.emoji}</span>
                  <span className="text-sm font-semibold theme-text">{opt.label}</span>
                  <span className="text-xs theme-faint text-center leading-tight">{opt.sub}</span>
                </button>
              ))}
            </div>
            <div>
              <p className="text-sm font-medium theme-text mb-2">How far are you willing to go?</p>
              <div className="flex gap-2 flex-wrap">
                {DISTANCE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setPrefs((p) => ({ ...p, max_distance_km: opt.value }))}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                      prefs.max_distance_km === opt.value
                        ? 'border-[var(--accent)] text-[var(--accent)] theme-surface2'
                        : 'border-[var(--border-subtle)] theme-muted theme-surface2'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Group + Budget */}
          <section className="theme-surface rounded-2xl p-5 border border-[var(--border-subtle)]">
            <h2 className="text-base font-semibold theme-text mb-4">Who are you planning for?</h2>
            <div className="grid grid-cols-2 gap-3 mb-5">
              {GROUP_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPrefs((p) => ({ ...p, group_size: opt.value }))}
                  className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                    prefs.group_size === opt.value
                      ? 'border-[var(--accent)] theme-surface2'
                      : 'border-[var(--border-subtle)] theme-surface2'
                  }`}
                >
                  <span className="text-2xl">{opt.emoji}</span>
                  <span className="text-sm font-semibold theme-text">{opt.label}</span>
                </button>
              ))}
            </div>
            <div>
              <p className="text-sm font-medium theme-text mb-2">What's your budget?</p>
              <div className="flex gap-2">
                {BUDGET_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setPrefs((p) => ({ ...p, budget: opt.value }))}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                      prefs.budget === opt.value
                        ? 'border-[var(--accent)] text-[var(--accent)] theme-surface2'
                        : 'border-[var(--border-subtle)] theme-muted theme-surface2'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Home Address */}
          <section className="theme-surface rounded-2xl p-5 border border-[var(--border-subtle)]">
            <h2 className="text-base font-semibold theme-text mb-1">Where do you start from?</h2>
            <p className="text-sm theme-muted mb-4">Your home base for recommendations.</p>
            <div className="relative">
              <input
                type="text"
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && geocodeAddress(addressInput)}
                placeholder="e.g. 123 N Michigan Ave, Chicago"
                className="w-full theme-input rounded-xl px-4 py-3 text-sm pr-24"
              />
              <button
                onClick={() => geocodeAddress(addressInput)}
                disabled={geocoding || !addressInput.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium px-3 py-1.5 rounded-lg theme-btn-accent disabled:opacity-40 transition-all"
              >
                {geocoding ? '...' : 'Look up'}
              </button>
            </div>
            {addressSuggestion && (
              <button
                onClick={() => confirmAddress(addressSuggestion)}
                className="w-full text-left p-3 mt-2 rounded-xl border-2 border-[var(--accent)] theme-surface2 transition-all"
              >
                <p className="text-xs theme-faint mb-0.5">Confirm address</p>
                <p className="text-sm font-medium theme-text">{addressSuggestion.formatted_address}</p>
              </button>
            )}
            {homeAddress && (
              <div className="flex items-center gap-2 p-3 mt-2 rounded-xl theme-surface2 border border-[var(--border-subtle)]">
                <span className="text-green-500">✓</span>
                <p className="text-sm theme-text">{homeAddress}</p>
              </div>
            )}
          </section>

          {/* Save button */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="theme-btn-accent px-8 py-3 rounded-xl text-sm font-semibold disabled:opacity-60 transition-all"
            >
              {saving ? 'Saving...' : 'Update Preferences'}
            </button>
            {saved && <span className="text-sm text-green-600 font-medium">✓ Saved!</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
