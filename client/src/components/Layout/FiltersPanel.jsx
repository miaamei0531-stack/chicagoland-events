import CategoryFilter from '../Filters/CategoryFilter.jsx';
import DateRangePicker from '../Filters/DateRangePicker.jsx';
import SearchBar from '../Filters/SearchBar.jsx';
import { useFiltersStore } from '../../store/filters.js';
import { useTripStore } from '../../store/trip.js';

export default function FiltersPanel({ open, onClose }) {
  const reset = useFiltersStore((s) => s.reset);
  const tripMode = useTripStore((s) => s.tripMode);
  const tripDate = useTripStore((s) => s.tripDate);

  return (
    <div className={`
      theme-surface border-b theme-border-s
      transition-all duration-200 overflow-hidden
      ${open ? 'max-h-[60vh] opacity-100' : 'max-h-0 md:max-h-none opacity-0 md:opacity-100'}
      md:max-h-none md:opacity-100
    `}>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold theme-muted uppercase tracking-widest">Filters</span>
          <div className="flex items-center gap-3">
            <button
              onClick={reset}
              className="text-xs theme-faint hover:theme-muted transition-colors"
            >
              Reset
            </button>
            <button
              onClick={onClose}
              className="md:hidden theme-faint hover:theme-text text-lg leading-none"
            >
              ×
            </button>
          </div>
        </div>
        <SearchBar />
        <CategoryFilter />
        {tripMode ? (
          <div className="text-xs theme-faint italic">
            Date locked to trip date{tripDate ? `: ${new Date(tripDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ' (pick one in Trip panel)'}
          </div>
        ) : (
          <DateRangePicker />
        )}
      </div>
    </div>
  );
}
