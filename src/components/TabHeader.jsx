import Monad from "./Monad";

// Reusable per-tab hero — small Monad + title + subtitle.
// Keeps visual consistency across all tabs.
export default function TabHeader({ title, subtitle, monadSize = 70, monadImage = null }) {
  return (
    <div className="tab-header">
      <Monad size={monadSize} config={monadImage} />
      <div>
        <div className="tab-header-title">{title}</div>
        {subtitle && <div className="tab-header-sub">{subtitle}</div>}
      </div>
    </div>
  );
}
