// Floating + button — quick task add. Visible on Day tab on every
// device. Tap focuses the .add-input synchronously (so iOS Safari
// pops up the keyboard) then scrolls it into view.

export default function FloatingAdd() {
  function handleClick() {
    const input = document.querySelector(".add-input");
    if (!input) return;
    // Focus FIRST, synchronously, inside the user-gesture event handler.
    // iOS Safari only opens the keyboard when focus() runs in the same
    // tick as the tap event. Any setTimeout/await before focus would
    // make the keyboard refuse to appear.
    try { input.focus({ preventScroll: true }); } catch { input.focus(); }
    // Then bring the input into view smoothly.
    input.scrollIntoView({ behavior: "smooth", block: "center" });
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
