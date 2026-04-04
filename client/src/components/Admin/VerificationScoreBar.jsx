import { parseVerificationDetails, scoreColor, scoreLabel } from '../../utils/verificationHelpers';

const CHECK_ICONS = {
  geocode: '📍',
  date: '📅',
  content: '🛡️',
  url: '🔗',
  duplicate: '🔍',
};

export default function VerificationScoreBar({ score, details }) {
  const checks = parseVerificationDetails(details);
  const barColor = scoreColor(score);
  const label = scoreLabel(score);

  const textColor = score >= 80 ? 'text-green-700' : score >= 50 ? 'text-yellow-700' : 'text-red-700';
  const bgColor = score >= 80 ? 'bg-green-100' : score >= 50 ? 'bg-yellow-100' : 'bg-red-100';

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${barColor}`}
            style={{ width: `${score}%` }}
          />
        </div>
        <span className="text-sm font-semibold text-gray-700 w-16 text-right">{score}/100</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${bgColor} ${textColor}`}>
          {label}
        </span>
      </div>

      {checks.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {checks.map(({ key, label: checkLabel, passed, points }) => (
            <span
              key={key}
              title={`${checkLabel} (${points} pts)`}
              className={`text-xs flex items-center gap-1 px-2 py-0.5 rounded-full ${
                passed ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              <span>{CHECK_ICONS[key] || '•'}</span>
              <span>{passed ? '✓' : '✗'}</span>
              <span className="hidden sm:inline">{checkLabel}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
