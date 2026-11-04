export default function MaroonRibbons() {
  return (
    <div className="maroon-ribbons" aria-hidden="true">
      {/* SVG stays sharp at every size and needs no client rendering. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/society-ribbon.svg" alt="" width="720" height="900" />
    </div>
  );
}
