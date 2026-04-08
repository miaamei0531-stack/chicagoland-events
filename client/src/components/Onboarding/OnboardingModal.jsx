import { useState } from 'react';
import { ALL_CATEGORIES, CATEGORY_HEX } from '../../utils/categoryColors.js';
import { api } from '../../services/api.js';
import { supabase } from '../../services/supabase.js';

const STEPS = ['What do you love?', 'How do you get around?', 'Who are you planning for?', 'Where do you start from?'];

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

export default function OnboardingModal({ onComplete }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [addressInput, setAddressInput] = useState('');
  const [addressSuggestion, setAddressSuggestion] = useState(null);
  const [geocoding, setGeocoding] = useState(false);

  const [prefs, setPrefs] = useState({
    categories: [],
    mobility: 'driving',
    max_distance_km: 10,
    group_size: 'solo',
    budget: 'any',
    avoid: [],
  });
  const [homeAddress, setHomeAddress] = useState('');

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

  async function handleFinish() {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await api.savePreferences({ preferences: prefs, home_address: homeAddress || undefined }, session?.access_token);
      onComplete(prefs);
    } catch (err) {
      console.error('Failed to save preferences:', err);
      // Still close — non-fatal
      onComplete(prefs);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="theme-surface rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col" style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <div className="px-6 pt-6 pb-4 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold theme-text">Welcome to Chicagoland Events</h2>
              <p className="text-sm theme-muted mt-0.5">Let's personalize your experience</p>
            </div>
            <span className="text-xs theme-faint">{step + 1} / {STEPS.length}</span>
          </div>
          {/* Progress bar */}
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className="h-1 flex-1 rounded-full transition-all duration-300"
                style={{ background: i <= step ? 'var(--accent)' : 'var(--border-subtle)' }}
              />
            ))}
          </div>
          <p className="text-sm font-semibold theme-text mt-3">{STEPS[step]}</p>
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">

          {/* Step 0 — Categories */}
          {step === 0 && (
            <div>
              <p className="text-sm theme-muted mb-4">Select all that apply — we'll prioritize these in your recommendations.</p>
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
              {prefs.categories.length === 0 && (
                <p className="text-xs theme-faint mt-3">Select at least one to get personalized picks</p>
              )}
            </div>
          )}

          {/* Step 1 — Mobility + Distance */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
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
            </div>
          )}

          {/* Step 2 — Group size + Budget */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
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
            </div>
          )}

          {/* Step 3 — Home address */}
          {step === 3 && (
            <div className="space-y-3">
              <p className="text-sm theme-muted">Your home base for recommendations — we measure distances from here.</p>
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
                  className="w-full text-left p-3 rounded-xl border-2 border-[var(--accent)] theme-surface2 transition-all"
                >
                  <p className="text-xs theme-faint mb-0.5">Confirm address</p>
                  <p className="text-sm font-medium theme-text">{addressSuggestion.formatted_address}</p>
                </button>
              )}
              {homeAddress && (
                <div className="flex items-center gap-2 p-3 rounded-xl theme-surface2 border border-[var(--border-subtle)]">
                  <span className="text-green-500">✓</span>
                  <p className="text-sm theme-text">{homeAddress}</p>
                </div>
              )}
              <p className="text-xs theme-faint">You can skip this — we'll use Chicago center as your starting point.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2 flex items-center justify-between shrink-0 border-t border-[var(--border-subtle)]">
          <button
            onClick={step === 0 ? undefined : () => setStep((s) => s - 1)}
            className={`text-sm theme-muted px-4 py-2 rounded-xl transition-colors ${step === 0 ? 'invisible' : 'hover:theme-text'}`}
          >
            Back
          </button>
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="theme-btn-accent px-6 py-2.5 rounded-xl text-sm font-semibold"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={saving}
              className="theme-btn-accent px-6 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60"
            >
              {saving ? 'Saving...' : "All set! Let's find your Saturday →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
