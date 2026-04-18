// Pill-style tab switcher — scrollable on narrow screens.
export default function PillTabs({ tabs, active, onChange }) {
  return (
    <div className="tabs">
      {tabs.map(([id, label]) => (
        <div
          key={id}
          className={`tab ${active === id ? "active" : ""}`}
          onClick={() => onChange(id)}
        >
          {label}
        </div>
      ))}
    </div>
  );
}
