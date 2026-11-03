export default function Loading() {
  return (
    <main className="standalone" aria-busy="true">
      <img
        className="brand-logo standalone-logo"
        src="/sec-logo.png"
        width={48}
        height={48}
        alt="Student Engineers’ Council"
      />
      <p>Loading SocietyHub…</p>
    </main>
  );
}
