import { useRef, useEffect } from 'react';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getDays(count = 14) {
  const days = [];
  for (let i = 0; i < count; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push({
      dateStr: d.toISOString().split('T')[0],
      dayName: DAY_NAMES[d.getDay()],
      dayNum: d.getDate(),
      monthName: MONTH_NAMES[d.getMonth()],
      isToday: i === 0,
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
    });
  }
  return days;
}

export default function DateScrollPicker({ selectedDate, onSelect, weatherMap }) {
  const scrollRef = useRef(null);
  const days = getDays(14);

  // Scroll to selected date on mount
  useEffect(() => {
    const idx = days.findIndex((d) => d.dateStr === selectedDate);
    if (idx > 0 && scrollRef.current) {
      scrollRef.current.scrollTo({ left: idx * 68 - 40, behavior: 'smooth' });
    }
  }, [selectedDate]);

  return (
    <div ref={scrollRef} className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
      {days.map((day) => {
        const active = day.dateStr === selectedDate;
        const weather = weatherMap?.[day.dateStr];
        return (
          <button
            key={day.dateStr}
            onClick={() => onSelect(day.dateStr)}
            className={`shrink-0 w-[60px] flex flex-col items-center py-2 px-1 rounded-xl border transition-all ${
              active
                ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                : 'theme-surface2 theme-text border-[var(--border-subtle)] hover:border-[var(--accent)]'
            }`}
          >
            <span className={`text-[10px] font-semibold uppercase ${active ? 'text-white/80' : 'theme-faint'}`}>
              {day.isToday ? 'Today' : day.dayName}
            </span>
            <span className="text-lg font-bold leading-tight">{day.dayNum}</span>
            {weather ? (
              <div className="flex flex-col items-center mt-0.5">
                <span className="text-xs leading-none">{weather.emoji}</span>
                <span className={`text-[9px] leading-none ${active ? 'text-white/70' : 'theme-faint'}`}>{weather.tempHighF}°</span>
              </div>
            ) : (
              <span className={`text-[9px] mt-1 ${active ? 'text-white/60' : 'theme-faint'}`}>{day.monthName}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
