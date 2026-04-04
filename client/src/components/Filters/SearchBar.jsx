import { useRef } from 'react';
import { useFiltersStore } from '../../store/filters.js';

export default function SearchBar() {
  const { searchQuery, setSearchQuery } = useFiltersStore();
  const timer = useRef(null);

  const handleChange = (e) => {
    const val = e.target.value;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setSearchQuery(val), 300);
  };

  return (
    <div className="relative">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
        fill="none" stroke="currentColor" strokeWidth={2}
        viewBox="0 0 24 24"
      >
        <circle cx={11} cy={11} r={8} />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <input
        type="text"
        defaultValue={searchQuery}
        onChange={handleChange}
        placeholder="Search events..."
        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
      />
    </div>
  );
}
