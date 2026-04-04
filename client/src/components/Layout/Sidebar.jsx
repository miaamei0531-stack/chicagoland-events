import CategoryFilter from '../Filters/CategoryFilter.jsx';
import DateRangePicker from '../Filters/DateRangePicker.jsx';
import { useFiltersStore } from '../../store/filters.js';

export default function Sidebar({ open, onClose }) {
  const reset = useFiltersStore((s) => s.reset);

  return (
    <>
      {/* Mobile overlay backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-20 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          fixed md:static top-0 left-0 h-full md:h-auto z-30 md:z-auto
          w-72 md:w-64 bg-white border-r flex flex-col overflow-hidden
          transform transition-transform duration-200 ease-in-out
          ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="font-semibold text-sm text-gray-700">Filters</span>
          <div className="flex items-center gap-2">
            <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600">
              Reset all
            </button>
            <button
              onClick={onClose}
              className="md:hidden text-gray-400 hover:text-gray-600 text-xl leading-none ml-2"
            >
              &times;
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <CategoryFilter />
          <hr className="border-gray-100" />
          <DateRangePicker />
        </div>
      </aside>
    </>
  );
}
