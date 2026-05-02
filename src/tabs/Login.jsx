import Monad from "../components/Monad";

export default function Login({ onLogin, busy }) {
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

      <div className="brand-katakana" style={{ fontSize: 38, marginBottom: 14 }}>Seal</div>
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
    </div>
  );
}
