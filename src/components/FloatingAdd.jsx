// Floating + button — quick task add. Visible on Day tab on every
// device. Tap focuses the .add-input synchronously (so iOS Safari
// pops up the keyboard), then scrolls the WHOLE add-form into view
// so the day picker + tag chips below the input stay visible above
// the on-screen keyboard.

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.04.04a2 2 0 0 1-2.83 2.83l-.04-.04a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.06a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.04.04a2 2 0 0 1-2.83-2.83l.04-.04a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.06a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.04-.04a2 2 0 0 1 2.83-2.83l.04.04a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.06a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.04-.04a2 2 0 0 1 2.83 2.83l-.04.04a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.06a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export default function FloatingAdd({ showAdd = true, onSettings }) {
  function handleClick() {
    const input = document.querySelector(".add-input");
    if (!input) return;
    // Focus FIRST, synchronously inside the user-gesture handler.
    // iOS Safari only opens the keyboard when focus runs in the same
    // tick as the tap event.
    try { input.focus({ preventScroll: true }); } catch { input.focus(); }
    // Bring the entire add-form into view so the chips/date picker
    // below the input aren't covered by the keyboard.
    const form = input.closest(".add-form") || input;
    // Slight delay lets the browser open the keyboard first; then we
    // scroll into the new (smaller) viewport that excludes the keyboard.
    setTimeout(() => {
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }
  return (
    <div className="fab-stack">
      <button className="fab fab-settings" type="button" onClick={onSettings} title="Settings" aria-label="Settings">
        <GearIcon />
      </button>
      {showAdd && (
        <button className="fab fab-add" type="button" onClick={handleClick} title="Add task" aria-label="Add task">
          <PlusIcon />
        </button>
      )}
    </div>
  );
}
