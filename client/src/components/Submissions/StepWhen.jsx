export default function StepWhen({ data, onChange }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Date & Time <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            value={data.start_datetime}
            onChange={(e) => {
              const start = e.target.value;
              const updates = { start_datetime: start };
              // Auto-set end to start + 1 hour if end is not already set
              if (start && !data.end_datetime) {
                const end = new Date(new Date(start).getTime() + 60 * 60 * 1000);
                // Format as datetime-local string: YYYY-MM-DDTHH:MM
                updates.end_datetime = end.toISOString().slice(0, 16);
              }
              onChange(updates);
            }}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Date & Time</label>
          <input
            type="datetime-local"
            value={data.end_datetime}
            min={data.start_datetime}
            onChange={(e) => onChange({ end_datetime: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="is_recurring"
          checked={data.is_recurring}
          onChange={(e) => onChange({ is_recurring: e.target.checked })}
          className="w-4 h-4 accent-blue-500"
        />
        <label htmlFor="is_recurring" className="text-sm text-gray-700">
          This is a recurring event (weekly class, regular meetup, etc.)
        </label>
      </div>

      {data.is_recurring && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Recurrence</label>
          <select
            value={data.recurrence_rule}
            onChange={(e) => onChange({ recurrence_rule: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
          >
            <option value="">Select frequency...</option>
            <option value="FREQ=WEEKLY">Weekly</option>
            <option value="FREQ=WEEKLY;BYDAY=SA">Every Saturday</option>
            <option value="FREQ=WEEKLY;BYDAY=SU">Every Sunday</option>
            <option value="FREQ=WEEKLY;BYDAY=SA,SU">Every Weekend</option>
            <option value="FREQ=MONTHLY">Monthly</option>
          </select>
        </div>
      )}
    </div>
  );
}
