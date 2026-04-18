// Section divider with short red bar, title, count, and trailing line.
// `variant` switches color: default (red) or "overdue" (orange).
export default function SectionHeader({ label, count, total, variant = "default" }) {
  return (
    <div className={`section ${variant === "overdue" ? "overdue" : ""}`}>
      <div className="section-bar" />
      <span className="section-label">{label}</span>
      <div className="section-line" />
      {total !== undefined && (
        <span className="section-count">{count}/{total}</span>
      )}
    </div>
  );
}
