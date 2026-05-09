// Brief slide-in toast announcing what got rolled over into today.
// Auto-dismisses after ~7s.

export default function RolloverToast({ info }) {
  if (!info) return null;
  const { rolled } = info;
  return (
    <div className="rollover-toast">
      {rolled > 0 && (
        <div className="rollover-toast-line">
          <span className="rollover-toast-icon">↻</span>
          <span>
            <strong>{rolled}</strong> task{rolled > 1 ? "s" : ""} rolled into today
          </span>
        </div>
      )}
    </div>
  );
}
