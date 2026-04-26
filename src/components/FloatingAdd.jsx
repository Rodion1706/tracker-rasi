// Floating + button — quick task add. Visible on Day tab on every
// device. Tap focuses the .add-input synchronously (so iOS Safari
// pops up the keyboard), then scrolls the WHOLE add-form into view
// so the day picker + tag chips below the input stay visible above
// the on-screen keyboard.

export default function FloatingAdd() {
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
    <div className="fab" onClick={handleClick} title="Add task" aria-label="Add task">
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </div>
  );
}
