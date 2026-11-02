"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="standalone">
      <h1>We couldn’t load SocietyHub.</h1>
      <p>Please try again. If this continues, contact SEC.</p>
      <button onClick={reset}>Try again</button>
    </main>
  );
}
