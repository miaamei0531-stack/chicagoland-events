// Blue for Official, teal for Community
export default function SourceBadge({ isUserSubmitted }) {
  return isUserSubmitted ? (
    <span className="bg-community text-white text-xs px-2 py-0.5 rounded-full">Community Event</span>
  ) : (
    <span className="bg-official text-white text-xs px-2 py-0.5 rounded-full">Official</span>
  );
}
