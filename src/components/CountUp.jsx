// Animated number that counts up from 0 to target on mount.
// Uses requestAnimationFrame, ~1.4s ease-out by default. Re-animates
// only when value changes (not every render). Locale-formatted.

import { useEffect, useState, useRef } from "react";

export default function CountUp({ value, duration = 1400, format = true }) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  const targetRef = useRef(0);
  const rafRef = useRef(0);
  const startRef = useRef(0);

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    fromRef.current = display;
    targetRef.current = value;
    startRef.current = performance.now();

    function tick(now) {
      const t = Math.min(1, (now - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      const v = fromRef.current + (targetRef.current - fromRef.current) * eased;
      setDisplay(v);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  const rounded = Math.round(display);
  return <span>{format ? rounded.toLocaleString("en-US") : rounded}</span>;
}
