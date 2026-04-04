export default function StepDetails({ data, onChange }) {
  return (
    <div className="space-y-4">
      {/* Free toggle */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="is_free"
          checked={data.is_free}
          onChange={(e) => onChange({ is_free: e.target.checked })}
          className="w-4 h-4 accent-blue-500"
        />
        <label htmlFor="is_free" className="text-sm text-gray-700 font-medium">
          This event is free
        </label>
      </div>

      {!data.is_free && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Price ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={data.price_min}
              onChange={(e) => onChange({ price_min: e.target.value })}
              placeholder="0.00"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Price ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={data.price_max}
              onChange={(e) => onChange({ price_max: e.target.value })}
              placeholder="0.00"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Price Notes</label>
        <input
          type="text"
          value={data.price_notes}
          onChange={(e) => onChange({ price_notes: e.target.value })}
          placeholder="e.g. Free with museum admission, sliding scale $10–$30"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Official Website</label>
        <input
          type="url"
          value={data.official_url}
          onChange={(e) => onChange({ official_url: e.target.value })}
          placeholder="https://..."
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Contact Email
          <span className="text-gray-400 font-normal ml-1">(not shown publicly)</span>
        </label>
        <input
          type="email"
          value={data.contact_email}
          onChange={(e) => onChange({ contact_email: e.target.value })}
          placeholder="you@example.com"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
        />
      </div>
    </div>
  );
}
