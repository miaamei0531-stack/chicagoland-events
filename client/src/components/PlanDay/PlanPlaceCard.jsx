const PRICE_LABELS = { 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' };

export default function PlanPlaceCard({ place, isAdded, onAdd, onRemove }) {
  if (!place) return null;

  return (
    <div
      className={`w-full text-left p-3 rounded-xl border transition-all ${
        isAdded
          ? 'border-l-[3px] border-l-purple-500 border-[var(--border-subtle)] theme-surface'
          : 'border-[var(--border-subtle)] theme-surface hover:border-purple-400'
      }`}
    >
      {/* Row 1: Name + category */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {isAdded && <span className="text-purple-500 text-xs shrink-0">✓</span>}
            <h3 className="text-sm font-semibold theme-text truncate">{place.name}</h3>
          </div>
        </div>
        {place.category?.length > 0 && (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 bg-purple-100 text-purple-700">
            {place.category[0]}
          </span>
        )}
      </div>

      {/* Row 2: Rating + address */}
      <div className="flex items-center gap-1.5 mt-1">
        {place.rating && (
          <span className="text-xs text-amber-500">★ {place.rating}</span>
        )}
        {place.price_level && (
          <>
            <span className="text-xs theme-faint">·</span>
            <span className="text-xs theme-faint">{PRICE_LABELS[place.price_level]}</span>
          </>
        )}
        {place.address && (
          <>
            <span className="text-xs theme-faint">·</span>
            <span className="text-xs theme-faint truncate">{place.address}</span>
          </>
        )}
      </div>

      {/* Row 3: Add button */}
      <div className="flex items-center justify-end mt-1.5">
        {isAdded ? (
          <span
            onClick={() => onRemove(place.id)}
            className="text-[10px] px-2.5 py-1 rounded-full border border-red-200 text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
          >
            Remove
          </span>
        ) : (
          <span
            onClick={() => onAdd(place)}
            className="text-[10px] px-2.5 py-1 rounded-full font-semibold cursor-pointer"
            style={{ backgroundColor: '#8B5CF6', color: '#fff' }}
          >
            + Add
          </span>
        )}
      </div>
    </div>
  );
}
