"use client";
type ErrorPageProps = {
  reset: () => void;
};
export default function ErrorPage({ reset }: ErrorPageProps) {
  return (
    <main className="standalone">
      <img
        className="brand-logo standalone-logo"
        src="/sec-logo.png"
        width={48}
        height={48}
        alt="Student Engineers’ Council"
      />
      <h1>We couldn’t load SocietyHub.</h1>
      <p>Please try again. If this continues, contact SEC.</p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
