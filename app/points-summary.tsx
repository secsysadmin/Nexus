"use client";
import { ArrowUpRight, Check } from "lucide-react";
import ReferenceMetrics from "./reference-metrics";
import { labels } from "../lib/domain";
import { pointTotals, pointCategories } from "../lib/points";
import type { Credit } from "../lib/types";
type PointsSummaryProps = {
  credits: Credit[];
  cycleId: string;
  accountId: string;
  onHistory: () => void;
};
export default function PointsSummary({
  credits,
  cycleId,
  accountId,
  onHistory,
}: PointsSummaryProps) {
  const totals = pointTotals(credits, cycleId, accountId);
  const total = pointCategories.reduce(
    (sum, category) => sum + totals[category],
    0,
  );
  const met = totals.PRT >= 1;
  const attendance = credits.filter(
    (c) =>
      c.cycle_id === cycleId && c.account_id === accountId && !c.revoked_at,
  ).length;
  return (
    <>
      <ReferenceMetrics
        metrics={[
          {
            label: "Total points",
            value: total,
            detail: "Earned in the current point period.",
          },
          {
            label: "Events attended",
            value: attendance,
            detail: "One attendance record per society, per event.",
          },
          {
            label: "PRT requirement",
            value: `${Math.min(totals.PRT, 1)} / 1`,
            detail: met
              ? "Your PRT minimum is complete."
              : "One PRT point still to earn.",
          },
        ]}
      />
      <section
        className="point-category-section"
        aria-label="Society points visualization"
      >
        <div className="reference-section-head">
          <h2>Points by category</h2>
          <button className="text-button" onClick={onHistory}>
            Attendance history <ArrowUpRight size={16} />
          </button>
        </div>
        <div className="point-category-grid">
          {pointCategories.map((category) => (
            <article className="point-category" key={category}>
              <div className="point-category-title">
                <h3>{labels[category]}</h3>
                {category === "PRT" && (
                  <span className="pill">
                    {met ? (
                      <>
                        <Check size={13} aria-hidden="true" /> Minimum met
                      </>
                    ) : (
                      "1 to earn"
                    )}
                  </span>
                )}
              </div>
              <p className="point-category-amount">
                <strong>{totals[category]}</strong> earned
                {category === "PRT" ? " · 1 required" : " · no minimum"}
              </p>
              <progress
                value={
                  category === "PRT"
                    ? Math.min(totals.PRT, 1)
                    : totals[category]
                }
                max={category === "PRT" ? 1 : Math.max(total, 1)}
                aria-label={
                  category === "PRT"
                    ? "PRT minimum progress"
                    : `${labels[category]} share of earned points`
                }
              />
              <small>
                {category === "PRT"
                  ? met
                    ? "PRT minimum met for this point period."
                    : "Attend a Presidents’ Round Table to meet the minimum."
                  : `${category === "HIGH_IMPACT" ? 2 : 1} ${category === "HIGH_IMPACT" ? "points" : "point"} per event · Bar shows share of earned points.`}
              </small>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
