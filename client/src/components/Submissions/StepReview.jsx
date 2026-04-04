import { formatDateTime } from '../../utils/formatDate.js';
import { CATEGORY_COLORS } from '../../utils/categoryColors.js';

function Row({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-gray-400 w-28 shrink-0">{label}</span>
      <span className="text-gray-800">{value}</span>
    </div>
  );
}

export default function StepReview({ data, submitting, onSubmit }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Review your event before submitting. Our team will review it within 48 hours.
      </p>

      <div className="rounded-lg border border-gray-100 p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-gray-900">{data.title}</h3>
          <div className="flex flex-wrap gap-1 mt-1">
            {data.category.map((cat) => (
              <span key={cat} className={`text-xs px-2 py-0.5 rounded-full ${CATEGORY_COLORS[cat]}`}>{cat}</span>
            ))}
          </div>
        </div>

        {data.description && (
          <p className="text-sm text-gray-600">{data.description}</p>
        )}

        <div className="space-y-1.5 pt-1 border-t border-gray-50">
          <Row label="Starts" value={formatDateTime(data.start_datetime)} />
          <Row label="Ends" value={data.end_datetime ? formatDateTime(data.end_datetime) : null} />
          <Row label="Recurring" value={data.is_recurring ? 'Yes' : null} />
          <Row label="Venue" value={data.venue_name} />
          <Row label="Address" value={data.address} />
          <Row
            label="Cost"
            value={
              data.is_free
                ? 'Free'
                : data.price_min && data.price_max
                ? `$${data.price_min} – $${data.price_max}`
                : data.price_min
                ? `$${data.price_min}`
                : 'Paid'
            }
          />
          <Row label="Price Notes" value={data.price_notes} />
          <Row label="Website" value={data.official_url} />
        </div>
      </div>

      {!data.coordinates && (
        <div className="text-sm text-red-500 bg-red-50 rounded-lg p-3">
          Location not confirmed — go back to Step 3 and verify your address.
        </div>
      )}

      <button
        onClick={onSubmit}
        disabled={submitting || !data.coordinates}
        className="w-full bg-community text-white font-medium py-2.5 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? 'Submitting...' : 'Submit Event'}
      </button>
    </div>
  );
}
