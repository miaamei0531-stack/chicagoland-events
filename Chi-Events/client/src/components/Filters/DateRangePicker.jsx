import { useFiltersStore } from '../../store/filters.js';

const TODAY = new Date().toISOString().split('T')[0];

export default function DateRangePicker() {
  const { startDate, endDate, setDateRange } = useFiltersStore();

  const handleStart = (e) => setDateRange(e.target.value || null, endDate);
  const handleEnd = (e) => setDateRange(startDate, e.target.value || null);
  const clear = () => setDateRange(null, null);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold theme-muted uppercase tracking-widest">Date Range</span>
        {(startDate || endDate) && (
          <button onClick={clear} className="text-xs theme-faint hover:theme-muted transition-colors">
            Clear
          </button>
        )}
      </div>
      <div className="space-y-1.5">
        <div>
          <label className="text-xs theme-faint mb-0.5 block">From</label>
          <input
            type="date"
            value={startDate || ''}
            min={TODAY}
            placeholder={TODAY}
            onChange={handleStart}
            className="w-full text-xs rounded-xl border theme-input px-2.5 py-1.5 transition-colors"
          />
        </div>
        <div>
          <label className="text-xs theme-faint mb-0.5 block">To</label>
          <input
            type="date"
            value={endDate || ''}
            onChange={handleEnd}
            min={startDate || ''}
            className="w-full text-xs rounded-xl border theme-input px-2.5 py-1.5 transition-colors"
          />
        </div>
      </div>
    </div>
  );
}
