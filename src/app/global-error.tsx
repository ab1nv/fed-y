"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body style={{ background: "#0a0a0c", color: "#f0f0f2", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ maxWidth: 520, margin: "15vh auto", padding: 24, textAlign: "center" }}>
          <p style={{ color: "#ffb800", fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase" }}>
            FedY
          </p>
          <h1 style={{ fontSize: 26, margin: "12px 0" }}>The app hit an unexpected error.</h1>
          <p style={{ color: "#9b9ca6", fontSize: 14 }}>{error.message || "Please try again."}</p>
          <button
            onClick={reset}
            style={{
              marginTop: 20,
              padding: "10px 18px",
              borderRadius: 8,
              border: 0,
              background: "#ffb800",
              color: "#1a1400",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </main>
      </body>
    </html>
  );
}
