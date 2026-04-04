import { ALL_CATEGORIES, CATEGORY_COLORS } from '../../utils/categoryColors.js';

export default function StepBasicInfo({ data, onChange }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Event Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={data.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="e.g. Sunday Salsa Dancing in Lincoln Park"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Category <span className="text-red-500">*</span>
        </label>
        <div className="flex flex-wrap gap-1.5">
          {ALL_CATEGORIES.map((cat) => {
            const active = data.category.includes(cat);
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  const next = active
                    ? data.category.filter((c) => c !== cat)
                    : [...data.category, cat];
                  onChange({ category: next });
                }}
                className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                  active
                    ? `${CATEGORY_COLORS[cat]} border-transparent`
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={data.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Tell people what to expect..."
          rows={4}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 resize-none"
        />
      </div>
    </div>
  );
}
