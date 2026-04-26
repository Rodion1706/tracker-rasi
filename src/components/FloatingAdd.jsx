// Floating + button — mobile-only quick task add. Visible on Day tab
// only. On tap: scrolls the page down to the .add-input field and
// focuses it (so the existing add-form gets used, no separate modal).

export default function FloatingAdd() {
  function handleClick() {
    const input = document.querySelector(".add-input");
    if (input) {
      input.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => input.focus(), 350);
    }
  }
  return (
    <div className="fab" onClick={handleClick} title="Add task" aria-label="Add task">
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </div>
  );
}
