"use client";
import { useId, useState } from "react";
import { Check, ArrowUpRight } from "lucide-react";
import { labels } from "../lib/domain";
import {
  pointHistory,
  pointCategories,
  type PointCategory,
} from "../lib/point-history";
import type { Credit, Semester } from "../lib/types";
const colors = {
  ALL: "#500000",
  PRT: "#500000",
  STANDARD: "#a64b64",
  HIGH_IMPACT: "#5f6682",
};
export default function SemesterPoints({
  credits,
  semester,
  accountId,
  onHistory,
}: {
  credits: Credit[];
  semester: Semester;
  accountId: string;
  onHistory: () => void;
}) {
  const [series, setSeries] = useState<PointCategory | "ALL">("ALL");
  const id = useId();
  const history = pointHistory(credits, semester, accountId);
  const value = (totals: Record<PointCategory, number>) =>
    series === "ALL"
      ? pointCategories.reduce((n, c) => n + totals[c], 0)
      : totals[series];
  const total = value(history.totals),
    max = Math.max(
      4,
      Math.ceil(Math.max(...history.months.map((m) => value(m.totals))) / 4) *
        4,
    );
  const x = (i: number) =>
    history.months.length === 1 ? 50 : (i / (history.months.length - 1)) * 600;
  const y = (n: number) => 190 - (n / max) * 172;
  const plotted = history.months.slice(0, history.lastIndex + 1);
  const path = plotted
    .map((m, i) =>
      i ? `H${x(i)}V${y(value(m.totals))}` : `M${x(0)},${y(value(m.totals))}`,
    )
    .join(" ");
  const area = plotted.length
    ? `${path}L${x(plotted.length - 1)},190L${x(0)},190Z`
    : "";
  const name = series === "ALL" ? "All points" : labels[series];
  return (
    <section
      className="semester-points"
      aria-label="Semester points visualization"
    >
      <div className="section-head">
        <h2>Semester points</h2>
        <button className="text-button" onClick={onHistory}>
          Attendance history <ArrowUpRight size={16} />
        </button>
      </div>
      <div className="points-visual-layout">
        <div className="points-plot-column">
          <div className="points-chart-heading">
            <div>
              <div className="points-chart-total" aria-live="polite">
                {total}
                <span>{total === 1 ? "point" : "points"}</span>
              </div>
              <p>{name} · Monthly running total</p>
            </div>
            <button
              className="points-all"
              aria-pressed={series === "ALL"}
              onClick={() => setSeries("ALL")}
            >
              All categories
            </button>
          </div>
          <figure className="points-figure">
            <div className="points-plot">
              <div className="points-axis" aria-hidden="true">
                {[4, 3, 2, 1, 0].map((n) => (
                  <span key={n} style={{ top: `${18 + (4 - n) * 43}px` }}>
                    {(max * n) / 4}
                  </span>
                ))}
              </div>
              <svg
                viewBox="0 0 600 210"
                preserveAspectRatio="none"
                role="img"
                aria-label={`${name}: ${total} points recorded for ${semester.name}. Monthly values are available below.`}
              >
                <defs>
                  <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                    <stop stopColor={colors[series]} stopOpacity="0.2" />
                    <stop
                      offset="1"
                      stopColor={colors[series]}
                      stopOpacity="0.02"
                    />
                  </linearGradient>
                </defs>
                {[0, 1, 2, 3, 4].map((n) => (
                  <line
                    key={n}
                    x1="0"
                    x2="600"
                    y1={y((max * n) / 4)}
                    y2={y((max * n) / 4)}
                    stroke="#e5e2df"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
                {plotted.length > 0 && (
                  <>
                    <path d={area} fill={`url(#${id})`} />
                    <path
                      d={path}
                      fill="none"
                      stroke={colors[series]}
                      strokeWidth="3"
                      vectorEffect="non-scaling-stroke"
                      strokeLinejoin="round"
                    />
                    <line
                      x1={x(plotted.length - 1)}
                      x2={x(plotted.length - 1)}
                      y1="18"
                      y2="190"
                      stroke={colors[series]}
                      strokeOpacity="0.35"
                      strokeDasharray="3 5"
                      vectorEffect="non-scaling-stroke"
                    />
                  </>
                )}
              </svg>
              {total === 0 && (
                <div className="points-chart-empty">
                  <strong>No points recorded yet</strong>
                  <span>Your first credited event will appear here.</span>
                </div>
              )}
            </div>
            <div className="points-months" aria-hidden="true">
              {history.months.map((m, i) => (
                <span
                  key={m.key}
                  className={i === history.lastIndex ? "current" : ""}
                  style={{
                    left: `${history.months.length === 1 ? 50 : (i / (history.months.length - 1)) * 100}%`,
                  }}
                >
                  {history.months.length <= 8 ||
                  i % Math.ceil(history.months.length / 6) === 0 ||
                  i === history.months.length - 1
                    ? m.shortLabel
                    : ""}
                </span>
              ))}
            </div>
            <figcaption>
              {plotted.length
                ? `Recorded through ${plotted.at(-1)!.label}`
                : "Semester has not started"}{" "}
              · Removed credits excluded.
            </figcaption>
          </figure>
        </div>
        <div
          className="points-breakdown"
          aria-label="Filter chart by point category"
        >
          <h3>Semester breakdown</h3>
          <p>Select a category to explore the chart.</p>
          {pointCategories.map((category) => (
            <button
              key={category}
              className="points-category"
              aria-pressed={series === category}
              onClick={() => setSeries(category)}
            >
              <span className="points-category-name">
                <i
                  style={{ background: colors[category] }}
                  aria-hidden="true"
                />
                {labels[category]}
              </span>
              <strong>
                {history.totals[category]}
                <small>
                  {history.totals[category] === 1 ? "point" : "points"}
                </small>
              </strong>
              <span
                className={
                  category === "PRT" && history.totals.PRT >= 1
                    ? "points-category-rule met"
                    : "points-category-rule"
                }
              >
                {category === "PRT" ? (
                  history.totals.PRT >= 1 ? (
                    <>
                      <Check size={14} />
                      Semester minimum met
                    </>
                  ) : (
                    "1 PRT point needed this semester"
                  )
                ) : category === "STANDARD" ? (
                  "1 point per event · No minimum"
                ) : (
                  "2 points per event · Awarded by SEC"
                )}
              </span>
            </button>
          ))}
        </div>
      </div>
      <details className="points-data">
        <summary>View monthly data</summary>
        <div
          className="table-wrap"
          tabIndex={0}
          role="region"
          aria-label="Monthly points data"
        >
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th>PRT</th>
                <th>Standard</th>
                <th>High Impact</th>
                <th>Total points</th>
              </tr>
            </thead>
            <tbody>
              {history.months.map((m, i) => (
                <tr key={m.key}>
                  <th scope="row">{m.label}</th>
                  {pointCategories.map((c) => (
                    <td key={c}>
                      {i <= history.lastIndex ? m.totals[c] : "—"}
                    </td>
                  ))}
                  <td>
                    {i <= history.lastIndex
                      ? pointCategories.reduce((n, c) => n + m.totals[c], 0)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <small>
          Running totals by date recorded in Central time. Future months have no
          values.
        </small>
      </details>
    </section>
  );
}
