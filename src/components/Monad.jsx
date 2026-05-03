export const MONAD_PRESETS = [
  { id: "original", label: "MONAD" },
  { id: "pentagram", label: "PENTAGRAM" },
  { id: "hex-eye", label: "HEXAGRAM EYE" },
  { id: "blade", label: "BLADE" },
  { id: "crown", label: "CROWN" },
];

function OuterRing({ color }) {
  return (
    <svg className="monad-ring" viewBox="0 0 212 272" fill="none" stroke={color} strokeWidth="0.6">
      <ellipse cx="106" cy="136" rx="100" ry="128" strokeDasharray="4 3" opacity="0.5" />
    </svg>
  );
}

function Core({ color }) {
  return (
    <svg
      className="monad-core"
      viewBox="0 0 180 240"
      fill="none"
      stroke={color}
      strokeWidth="1"
      style={{ opacity: 0.5, filter: `drop-shadow(0 0 4px ${color})` }}
    >
      <circle cx="90" cy="110" r="20" strokeDasharray="1 2" />
    </svg>
  );
}

function PresetGlyph({ variant, color }) {
  const common = {
    className: "monad-main",
    viewBox: "0 0 180 240",
    fill: "none",
    stroke: color,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: { filter: `drop-shadow(0 0 10px ${color})` },
  };

  if (variant === "pentagram") {
    return (
      <svg {...common}>
        <circle cx="90" cy="120" r="72" strokeWidth="1.1" opacity="0.36" />
        <path d="M 90 48 L132 178 L24 98 L156 98 L48 178 Z" strokeWidth="2.8" />
        <path d="M 90 48 L132 178 L24 98 L156 98 L48 178 Z" strokeWidth="1.1" opacity="0.38" />
        <circle cx="90" cy="120" r="38" strokeWidth="1" opacity="0.22" strokeDasharray="2 5" />
      </svg>
    );
  }

  if (variant === "hex-eye") {
    return (
      <svg {...common}>
        <g opacity="0.24">
          <circle cx="90" cy="120" r="74" strokeWidth="0.9" strokeDasharray="3 7" />
          <circle cx="90" cy="120" r="52" strokeWidth="0.7" strokeDasharray="2 6" opacity="0.5" />
          <path d="M 90 44 L90 28" strokeWidth="1.1" />
          <path d="M 90 196 L90 212" strokeWidth="1.1" />
          <path d="M 32 88 L18 80" strokeWidth="1.1" />
          <path d="M 148 88 L162 80" strokeWidth="1.1" />
          <path d="M 32 152 L18 160" strokeWidth="1.1" />
          <path d="M 148 152 L162 160" strokeWidth="1.1" />
        </g>
        <path d="M 90 44 L148 152 L32 152 Z" strokeWidth="2.4" opacity="0.82" />
        <path d="M 90 196 L32 88 L148 88 Z" strokeWidth="2.4" opacity="0.82" />
        <path d="M 54 120 C 70 101 110 101 126 120 C 110 139 70 139 54 120 Z" strokeWidth="2.6" />
        <circle cx="90" cy="120" r="9.5" strokeWidth="1.7" />
        <ellipse cx="90" cy="120" rx="3.8" ry="6.4" fill={color} stroke="none" />
      </svg>
    );
  }

  if (variant === "blade") {
    return (
      <svg {...common}>
        <path d="M 90 26 L112 104 L90 214 L68 104 Z" strokeWidth="2.2" />
        <path d="M 90 26 L90 214" strokeWidth="1.4" opacity="0.65" />
        <path d="M 52 148 L128 76" strokeWidth="1.8" opacity="0.78" />
        <path d="M 54 170 C 76 188 104 188 126 170" strokeWidth="2" />
        <path d="M 64 64 C 78 54 102 54 116 64" strokeWidth="1.6" opacity="0.5" />
      </svg>
    );
  }

  if (variant === "crown") {
    return (
      <svg {...common}>
        <path d="M 34 132 L54 76 L76 116 L90 50 L104 116 L126 76 L146 132 Z" strokeWidth="2.2" />
        <path d="M 42 132 C 70 146 110 146 138 132" strokeWidth="1.8" opacity="0.82" />
        <path d="M 58 158 L122 158" strokeWidth="1.8" opacity="0.72" />
        <path d="M 70 184 C 82 192 98 192 110 184" strokeWidth="1.8" opacity="0.58" />
        <path d="M 56 52 L124 52" strokeWidth="1.4" opacity="0.5" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M 50 42 A 40 40 0 0 0 130 42" strokeWidth="2.4" />
      <path d="M 60 46 A 30 30 0 0 0 120 46" strokeWidth="1.6" opacity="0.7" />
      <circle cx="90" cy="110" r="30" strokeWidth="2" />
      <circle cx="90" cy="110" r="3" fill={color} stroke="none" />
      <line x1="90" y1="140" x2="90" y2="198" strokeWidth="2" />
      <line x1="72" y1="170" x2="108" y2="170" strokeWidth="2" />
      <path d="M 68 200 A 14 14 0 0 0 90 200" strokeWidth="2" />
      <path d="M 90 200 A 14 14 0 0 0 112 200" strokeWidth="2" />
      <path d="M 68 200 A 10 14 0 0 1 66 224" strokeWidth="1.8" />
      <path d="M 112 200 A 10 14 0 0 0 114 224" strokeWidth="1.8" />
    </svg>
  );
}

export default function Monad({ size = 180, color, config = null }) {
  const h = Math.round(size * (240 / 180));
  const rawVariant = config && config.variant ? config.variant : "original";
  const variant = rawVariant === "monas" ? "original" : rawVariant === "eclipse" ? "pentagram" : rawVariant;
  const customSrc = config && config.customSrc;
  const stroke = color || "currentColor";

  return (
    <div
      className={`monad monad-${variant}`}
      style={{ width: size, height: h, color: color || undefined, "--monad-color": stroke }}
    >
      {variant === "original" ? (
        <>
          <OuterRing color={stroke} />
          <PresetGlyph variant={variant} color={stroke} />
          <Core color={stroke} />
        </>
      ) : variant === "custom" && customSrc ? (
        <div className="monad-custom-shell">
          <img className="monad-custom-img" src={customSrc} alt="" draggable="false" />
        </div>
      ) : (
        <PresetGlyph variant={variant} color={stroke} />
      )}
    </div>
  );
}
