// Brief slide-in toast announcing what got rolled over into today.
// Auto-dismisses after ~7s. Different style for hard-mode drops.

export default function RolloverToast({ info }) {
  if (!info) return null;
  const { rolled, dropped } = info;
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
      {dropped.length > 0 && (
        <div className="rollover-toast-line drop">
          <span className="rollover-toast-icon">✕</span>
          <span>
            Hard Mode dropped <strong>{dropped.length}</strong>: {dropped.map(d => d.text).slice(0, 2).join(", ")}
            {dropped.length > 2 && ` +${dropped.length - 2}`}
          </span>
        </div>
      )}
    </div>
  );
}
