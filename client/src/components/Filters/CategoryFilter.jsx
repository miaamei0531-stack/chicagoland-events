import { useFiltersStore } from '../../store/filters.js';
import { ALL_CATEGORIES, CATEGORY_COLORS } from '../../utils/categoryColors.js';

export default function CategoryFilter() {
  const { categories, toggleCategory, setCategories } = useFiltersStore();
  const allSelected = categories.length === 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</span>
        {categories.length > 0 && (
          <button
            onClick={() => setCategories([])}
            className="text-xs text-blue-500 hover:text-blue-700"
          >
            Clear
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {ALL_CATEGORIES.map((cat) => {
          const active = categories.includes(cat);
          return (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
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
  );
}
