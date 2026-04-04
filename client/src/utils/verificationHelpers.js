// Parse verification_details JSONB into human-readable results

const CHECK_LABELS = {
  geocode: 'Location verified',
  date: 'Date is valid',
  content: 'Content approved',
  url: 'URL reachable',
  duplicate: 'No duplicate found',
};

export function parseVerificationDetails(details) {
  if (!details) return [];
  return Object.entries(details).map(([key, val]) => ({
    key,
    label: CHECK_LABELS[key] || key,
    passed: val.passed,
    points: val.points,
  }));
}

export function scoreColor(score) {
  if (score >= 80) return 'bg-green-500';
  if (score >= 50) return 'bg-yellow-400';
  return 'bg-red-500';
}

export function scoreLabel(score) {
  if (score >= 80) return 'Looks Good';
  if (score >= 50) return 'Review Needed';
  return 'Needs Attention';
}
