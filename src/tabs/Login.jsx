import Monad from "../components/Monad";

export default function Login({ onLogin, busy, error, canLocalPreview, onLocalPreview }) {
  return (
    <div style={{
      background: "var(--bg)",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
      position: "relative",
    }}>
      <div className="top-strip" />

      <div style={{ marginBottom: 32, opacity: 0.85 }}>
        <Monad size={160} />
      </div>

      <div className="brand-katakana" style={{ fontSize: 38, marginBottom: 14 }}>ロディオン</div>
      <div className="brand-sub" style={{ fontSize: 12, marginBottom: 48, textAlign: "center" }}>Command · Center</div>

      <div
        onClick={busy ? undefined : onLogin}
        style={{
          padding: "14px 36px",
          background: "rgba(232, 16, 42, 0.15)",
          color: "var(--red)",
          borderRadius: 10,
          cursor: busy ? "wait" : "pointer",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.2em",
          border: "1px solid rgba(232, 16, 42, 0.4)",
          opacity: busy ? 0.5 : 1,
          fontFamily: "'Cinzel', serif",
          textTransform: "uppercase",
          transition: "all 0.2s",
          boxShadow: "0 4px 24px rgba(232, 16, 42, 0.2)",
        }}
        onMouseEnter={e => { if (!busy) e.currentTarget.style.boxShadow = "0 4px 40px rgba(232, 16, 42, 0.4)"; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 4px 24px rgba(232, 16, 42, 0.2)"; }}
      >
        {busy ? "CONNECTING..." : "SIGN IN WITH GOOGLE"}
      </div>
      {error && (
        <div style={{
          maxWidth: 360,
          marginTop: 18,
          color: "var(--red-b)",
          fontSize: 10,
          lineHeight: 1.5,
          letterSpacing: "0.12em",
          textAlign: "center",
          fontFamily: "'JetBrains Mono', monospace",
          textTransform: "uppercase",
        }}>
          {error}
        </div>
      )}
      {canLocalPreview && (
        <div
          onClick={onLocalPreview}
          style={{
            marginTop: error ? 16 : 22,
            padding: "11px 24px",
            color: "var(--t2)",
            border: "1px dashed rgba(232, 16, 42, 0.35)",
            borderRadius: 10,
            cursor: "pointer",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.18em",
            fontFamily: "'Cinzel', serif",
            textTransform: "uppercase",
            background: "rgba(232, 16, 42, 0.05)",
          }}
        >
          LOCAL PREVIEW WITHOUT GOOGLE
        </div>
      )}
    </div>
  );
}
