export default function Loading() {
  return (
    <main className="standalone" aria-busy="true">
      <img
        src="/sec-logo.png"
        alt="Student Engineers’ Council"
        width={48}
        height={48}
        className="brand-logo"
      />
      <h1>SocietyHub</h1>
      <p>Opening your workspace…</p>
    </main>
  );
}
