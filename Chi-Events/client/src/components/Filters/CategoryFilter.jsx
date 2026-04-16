import { useFiltersStore } from '../../store/filters.js';
import { ALL_CATEGORIES, CATEGORY_COLORS, CATEGORY_HEX } from '../../utils/categoryColors.js';

export default function CategoryFilter() {
  const { categories, toggleCategory, setCategories } = useFiltersStore();

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold theme-muted uppercase tracking-widest">Event Category</span>
        {categories.length > 0 && (
          <button
            onClick={() => setCategories([])}
            className="text-xs theme-faint hover:theme-muted transition-colors"
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
              className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all duration-150 flex items-center gap-1 ${
                active
                  ? 'border-transparent shadow-sm text-white'
                  : 'theme-surface2 theme-muted border-[var(--border-subtle)] hover:border-[var(--accent)]'
              }`}
              style={active ? { backgroundColor: CATEGORY_HEX[cat] } : {}}
            >
              {active && <span className="text-white leading-none">✓</span>}
              {cat}
            </button>
          );
        })}
      </div>
    </div>
  );
}
