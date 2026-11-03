"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="standalone">
      <img
        src="/sec-logo.png"
        alt="Student Engineers’ Council"
        width={48}
        height={48}
        className="brand-logo"
      />
      <h1>We couldn’t load SocietyHub.</h1>
      <p>Please try again. If this continues, contact SEC.</p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
