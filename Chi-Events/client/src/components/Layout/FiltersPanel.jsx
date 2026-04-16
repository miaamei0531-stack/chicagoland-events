import CategoryFilter from '../Filters/CategoryFilter.jsx';
import DateRangePicker from '../Filters/DateRangePicker.jsx';
import SearchBar from '../Filters/SearchBar.jsx';
import { useFiltersStore } from '../../store/filters.js';
import { useTripStore } from '../../store/trip.js';
import { CATEGORY_HEX, ALL_CATEGORIES } from '../../utils/categoryColors.js';

const NEIGHBORHOODS = [
  'Loop', 'River North', 'Lincoln Park', 'Wicker Park', 'Bucktown',
  'Logan Square', 'Pilsen', 'Hyde Park', 'Andersonville', 'Lakeview',
  'Wrigleyville', 'South Loop', 'West Loop', 'Evanston', 'Oak Park',
  'Naperville', 'Schaumburg', 'Aurora',
];

const RADIUS_OPTIONS = [
  { label: 'Any', value: null },
  { label: '1 km', value: 1 },
  { label: '2 km', value: 2 },
  { label: '5 km', value: 5 },
  { label: '10 km', value: 10 },
  { label: '25 km', value: 25 },
];

export default function FiltersPanel({ open, onClose }) {
  const { reset, neighborhood, setNeighborhood, radius, setRadius } = useFiltersStore();
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

        {/* Neighborhood */}
        <div>
          <label className="text-xs font-semibold theme-muted uppercase tracking-widest block mb-1">Neighborhood</label>
          <select
            value={neighborhood}
            onChange={(e) => setNeighborhood(e.target.value)}
            className="w-full text-xs theme-text theme-surface2 border theme-border-s rounded-xl px-2.5 py-1.5 outline-none focus:border-[var(--accent)]"
          >
            <option value="">All areas</option>
            {NEIGHBORHOODS.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        {/* Radius */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold theme-muted uppercase tracking-widest">Radius</label>
            <span className="text-xs theme-faint">{radius ? `${radius} km` : 'Any'}</span>
          </div>
          <input
            type="range"
            min={0} max={5} step={1}
            value={RADIUS_OPTIONS.findIndex((r) => r.value === radius)}
            onChange={(e) => setRadius(RADIUS_OPTIONS[Number(e.target.value)].value)}
            className="w-full accent-[var(--accent)]"
          />
          <div className="flex justify-between text-[10px] theme-faint mt-0.5">
            {RADIUS_OPTIONS.map((r) => <span key={r.label}>{r.label}</span>)}
          </div>
        </div>

        <CategoryFilter />
        {tripMode ? (
          <div className="text-xs theme-faint italic">
            Date locked to trip date{tripDate ? `: ${new Date(tripDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ' (pick one in Trip panel)'}
          </div>
        ) : (
          <DateRangePicker />
        )}

        {/* Category legend — desktop only */}
        <div className="hidden md:block pt-2 border-t theme-border-s">
          <p className="text-xs font-semibold theme-muted uppercase tracking-widest mb-2">Event Legend</p>
          <div className="space-y-1">
            {ALL_CATEGORIES.map((cat) => (
              <div key={cat} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_HEX[cat] }} />
                <span className="text-xs theme-text">{cat}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
