const TYPE_COLORS = {
  general: 'bg-gray-200 text-gray-700',
  looking_to_join: 'bg-green-100 text-green-700',
  carpool_offer: 'bg-blue-100 text-blue-700',
  carpool_request: 'bg-orange-100 text-orange-700',
  question: 'bg-purple-100 text-purple-700',
};

const TYPE_LABELS = {
  general: 'General',
  looking_to_join: 'Looking to Join',
  carpool_offer: 'Carpool Offer',
  carpool_request: 'Carpool Request',
  question: 'Question',
};

export default function CommentBadge({ type }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[type] || TYPE_COLORS.general}`}>
      {TYPE_LABELS[type] || type}
    </span>
  );
}
