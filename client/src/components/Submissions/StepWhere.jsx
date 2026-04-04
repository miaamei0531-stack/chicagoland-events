import { useState, useRef, useEffect } from 'react';

export default function StepWhere({ data, onChange }) {
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const timer = useRef(null);

  async function geocode(address) {
    if (!address?.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/geocode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await getToken()}` },
        body: JSON.stringify({ address }),
      });
      if (!res.ok) throw new Error('Address not found');
      const { lat, lng, formatted_address } = await res.json();
      onChange({
        coordinates: `POINT(${lng} ${lat})`,
        coords_preview: { lat, lng },
        address: formatted_address,
      });
    } catch (err) {
      setError('Could not find that address. Try being more specific.');
      onChange({ coordinates: null, coords_preview: null });
    } finally {
      setSearching(false);
    }
  }

  async function getToken() {
    const { supabase } = await import('../../services/supabase.js');
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  }

  function handleAddressChange(e) {
    const val = e.target.value;
    onChange({ address: val, coordinates: null, coords_preview: null });
    clearTimeout(timer.current);
    if (val.length > 5) {
      timer.current = setTimeout(() => geocode(val), 800);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Address <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={data.address}
          onChange={handleAddressChange}
          placeholder="e.g. 1801 N Clark St, Chicago, IL"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
        />
        {searching && <p className="text-xs text-gray-400 mt-1">Looking up address...</p>}
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Venue Name</label>
        <input
          type="text"
          value={data.venue_name}
          onChange={(e) => onChange({ venue_name: e.target.value })}
          placeholder="e.g. Lincoln Park Conservatory"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
        />
      </div>

      {/* Geocoded preview */}
      {data.coords_preview && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Location confirmed: {data.address}
        </div>
      )}

      {!data.coords_preview && data.address && !searching && !error && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-700">
          Type a full street address to confirm the location.
        </div>
      )}
    </div>
  );
}
