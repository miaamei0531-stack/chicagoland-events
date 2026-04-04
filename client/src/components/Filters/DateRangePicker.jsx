import { useFiltersStore } from '../../store/filters.js';

export default function DateRangePicker() {
  const { startDate, endDate, setDateRange } = useFiltersStore();

  const handleStart = (e) => setDateRange(e.target.value || null, endDate);
  const handleEnd = (e) => setDateRange(startDate, e.target.value || null);
  const clear = () => setDateRange(null, null);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date Range</span>
        {(startDate || endDate) && (
          <button onClick={clear} className="text-xs text-blue-500 hover:text-blue-700">
            Clear
          </button>
        )}
      </div>
      <div className="space-y-1.5">
        <div>
          <label className="text-xs text-gray-400 mb-0.5 block">From</label>
          <input
            type="date"
            value={startDate || ''}
            onChange={handleStart}
            className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-400"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-0.5 block">To</label>
          <input
            type="date"
            value={endDate || ''}
            onChange={handleEnd}
            min={startDate || ''}
            className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-400"
          />
        </div>
      </div>
    </div>
  );
}
