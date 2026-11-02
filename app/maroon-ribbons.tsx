// Static ruled surface: a single twisted maroon ribbon, rendered without animation.
const strips = 64;
const samples = 100;
function edge(u: number) {
  return Array.from({ length: samples + 1 }, (_, i) => {
    const t = i / samples;
    const angle = t * 6.1 - 1.45;
    const x = 600 + 75 * Math.sin(angle) + u * 190 * Math.cos(angle);
    return `${x.toFixed(2)},${(-80 + t * 1260).toFixed(2)}`;
  });
}
const panels = Array.from({ length: strips }, (_, i) => {
  const a = edge(-1 + (2 * i) / strips);
  const b = edge(-1 + (2 * (i + 1)) / strips).reverse();
  return `M${a.join("L")}L${b.join("L")}Z`;
});
export default function MaroonRibbons() {
  return (
    <div className="maroon-ribbons" aria-hidden="true">
      <svg
        viewBox="0 0 720 1100"
        preserveAspectRatio="xMidYMid slice"
        focusable="false"
      >
        <defs>
          <linearGradient
            id="spiral-fabric"
            x1="0"
            y1="0"
            x2="0.8"
            y2="1"
            gradientUnits="objectBoundingBox"
          >
            <stop offset="0" stopColor="#ead1cd" />
            <stop offset="0.23" stopColor="#b7656d" />
            <stop offset="0.47" stopColor="#680d27" />
            <stop offset="0.62" stopColor="#500000" />
            <stop offset="0.72" stopColor="#d4a5a4" />
            <stop offset="1" stopColor="#9a344b" />
          </linearGradient>
        </defs>
        <g
          fill="url(#spiral-fabric)"
          stroke="#fff"
          strokeOpacity="0.18"
          strokeWidth="0.55"
        >
          {panels.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
      </svg>
    </div>
  );
}
