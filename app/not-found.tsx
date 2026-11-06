export default function NotFound() {
  return (
    <main className="standalone">
      <img
        className="brand-logo standalone-logo"
        src="/societyhub-mark.svg"
        width={48}
        height={48}
        alt="SocietyHub"
      />
      <h1>This page isn’t here.</h1>
      <a className="button" href="/">
        Return to SocietyHub
      </a>
    </main>
  );
}
