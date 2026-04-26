// Odometer-style number — each digit is a vertical column 0-9 that
// translates by -value*1em. CSS transition handles the rolling animation
// when value changes. Multi-digit numbers split into per-digit columns.

import { useEffect, useRef, useState } from "react";

export default function Odometer({ value, minDigits = 1 }) {
  const v = Math.max(0, Math.floor(value || 0));
  const str = String(v).padStart(minDigits, "0");
  const digits = str.split("");

  // When the digit count grows (e.g. 9 → 10), the new leading digit
  // would otherwise pop in instantly. We keep a ref of last length so we
  // can apply a fade-in to newly added leading digits.
  const lastLenRef = useRef(digits.length);
  const [grew, setGrew] = useState(false);
  useEffect(() => {
    if (digits.length > lastLenRef.current) {
      setGrew(true);
      const t = setTimeout(() => setGrew(false), 600);
      return () => clearTimeout(t);
    }
    lastLenRef.current = digits.length;
  }, [digits.length]);

  return (
    <span className="odometer">
      {digits.map((d, idx) => {
        const dnum = parseInt(d, 10);
        const isLeadingNew = grew && idx === 0;
        return (
          <span
            key={idx}
            className={`odometer-digit ${isLeadingNew ? "odometer-grow" : ""}`}
          >
            <span
              className="odometer-col"
              style={{ transform: `translateY(${-dnum}em)` }}
            >
              {[0,1,2,3,4,5,6,7,8,9].map(n => (
                <span key={n} className="odometer-cell">{n}</span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
}
