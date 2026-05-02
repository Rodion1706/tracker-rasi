// Monas Hieroglyphica (John Dee, 1564).
// Three layered SVGs: outer ring (counter-rotating), main monad (rotating), inner glow.
// Color comes from currentColor so the .monad CSS rule can paint it
// per-theme — Command red, Seal Day green, Seal Night blue. Pass an
// explicit `color` to opt out (Login uses #e8102a since it renders
// pre-theme).
export default function Monad({ size = 180, color }) {
  const h = Math.round(size * (240 / 180));
  const stroke = color || "currentColor";
  const filterColor = color || "currentColor";
  return (
    <div
      className="monad"
      style={{ width: size, height: h, color: color || undefined }}
    >
      {/* Outer dashed ring */}
      <svg
        className="monad-ring"
        viewBox="0 0 212 272"
        fill="none"
        stroke={stroke}
        strokeWidth="0.6"
      >
        <ellipse cx="106" cy="136" rx="100" ry="128" strokeDasharray="4 3" opacity="0.5" />
      </svg>
      {/* Main monad */}
      <svg
        className="monad-rotate"
        viewBox="0 0 180 240"
        fill="none"
        stroke={stroke}
        strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 10px ${filterColor})` }}
      >
        {/* Crescent moon (horns up) */}
        <path d="M 50 42 A 40 40 0 0 0 130 42" strokeWidth="2.4" />
        <path d="M 60 46 A 30 30 0 0 0 120 46" strokeWidth="1.6" opacity="0.7" />
        {/* Sun circle */}
        <circle cx="90" cy="110" r="30" strokeWidth="2" />
        <circle cx="90" cy="110" r="3" fill={stroke} stroke="none" />
        {/* Cross */}
        <line x1="90" y1="140" x2="90" y2="198" strokeWidth="2" />
        <line x1="72" y1="170" x2="108" y2="170" strokeWidth="2" />
        {/* Aries horns */}
        <path d="M 68 200 A 14 14 0 0 0 90 200" strokeWidth="2" />
        <path d="M 90 200 A 14 14 0 0 0 112 200" strokeWidth="2" />
        <path d="M 68 200 A 10 14 0 0 1 66 224" strokeWidth="1.8" />
        <path d="M 112 200 A 10 14 0 0 0 114 224" strokeWidth="1.8" />
      </svg>
      {/* Inner pulsing core */}
      <svg
        className="monad-core"
        viewBox="0 0 180 240"
        fill="none"
        stroke={stroke}
        strokeWidth="1"
        style={{ opacity: 0.5, filter: `drop-shadow(0 0 4px ${filterColor})` }}
      >
        <circle cx="90" cy="110" r="20" strokeDasharray="1 2" />
      </svg>
    </div>
  );
}
