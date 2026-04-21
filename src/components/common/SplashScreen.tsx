export function SplashScreen() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        background: 'var(--color-bg)',
        color: 'var(--color-text)'
      }}
    >
      <div style={{ fontSize: 48 }}>🍳</div>
      <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 0.5 }}>CookBattle</div>
      <div style={{ fontSize: 13, color: 'var(--color-text-dim)' }}>Разогреваем плиту…</div>
    </div>
  );
}
