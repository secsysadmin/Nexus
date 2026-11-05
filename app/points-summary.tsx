"use client";
import { Check, Circle, ArrowUpRight } from "lucide-react";
import { labels } from "../lib/domain";
import { pointTotals, pointCategories } from "../lib/points";
import type { Credit } from "../lib/types";
const colors = {
  PRT: "var(--chart-prt)",
  STANDARD: "var(--chart-standard)",
  HIGH_IMPACT: "var(--chart-impact)",
};
export default function PointsSummary({
  credits,
  cycleId,
  accountId,
  onHistory,
}: {
  credits: Credit[];
  cycleId: string;
  accountId: string;
  onHistory: () => void;
}) {
  const totals = pointTotals(credits, cycleId, accountId);
  const total = pointCategories.reduce(
    (sum, category) => sum + totals[category],
    0,
  );
  const met = totals.PRT >= 1;
  return (
    <section
      className="points-summary"
      aria-label="Society points visualization"
    >
      <div className="section-head">
        <h2>Society points</h2>
        <button className="text-button" onClick={onHistory}>
          Attendance history <ArrowUpRight size={16} />
        </button>
      </div>
      <div className="points-summary-layout">
        <div className="points-ledger">
          <div className="points-ledger-heading">
            <h3>Points by category</h3>
            <strong>
              {total}
              <span> total points</span>
            </strong>
          </div>
          <p className="points-ledger-note">
            Bars show each category’s share of your earned points.
          </p>
          <table className="points-summary-table">
            <thead>
              <tr>
                <th scope="col">Category</th>
                <th scope="col">Earned</th>
                <th scope="col">Minimum</th>
              </tr>
            </thead>
            <tbody>
              {pointCategories.map((category) => (
                <tr key={category}>
                  <th scope="row">
                    <div className="points-row-label">
                      <span
                        className="points-status-icon"
                        style={{ color: colors[category] }}
                        aria-hidden="true"
                      >
                        {category === "PRT" && met ? (
                          <Check size={19} />
                        ) : (
                          <Circle size={16} />
                        )}
                      </span>
                      <span>
                        {labels[category]}
                        <small>
                          {category === "HIGH_IMPACT"
                            ? "2 points per event"
                            : "1 point per event"}
                        </small>
                      </span>
                    </div>
                    <div className="points-share-track" aria-hidden="true">
                      <span
                        key={`${accountId}-${cycleId}-${category}-${totals[category]}-${total}`}
                        className={
                          totals[category] > 0 ? "points-share-fill" : undefined
                        }
                        style={{
                          width: `${total ? (totals[category] / total) * 100 : 0}%`,
                          background: colors[category],
                        }}
                      />
                    </div>
                  </th>
                  <td className="points-earned">{totals[category]}</td>
                  <td>{category === "PRT" ? "1 point" : "None"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {total === 0 && (
            <p className="points-ledger-note">
              No points recorded yet. Your first credited event will appear
              here.
            </p>
          )}
        </div>
        <div className={"prt-requirement" + (met ? " met" : "")}>
          <h3>PRT requirement</h3>
          <div
            className="prt-ring"
            role="img"
            aria-label={`${Math.min(totals.PRT, 1)} of 1 required PRT point earned. ${totals.PRT} PRT points total.`}
          >
            <svg viewBox="0 0 180 180" aria-hidden="true">
              <circle className="prt-ring-track" cx="90" cy="90" r="76" />
              <circle
                key={`${accountId}-${cycleId}-${met}`}
                className={"prt-ring-fill" + (met ? " prt-ring-draw" : "")}
                cx="90"
                cy="90"
                r="76"
                pathLength="100"
                strokeDasharray={`${met ? 100 : 0} 100`}
              />
            </svg>
            <div>
              <strong>
                {Math.min(totals.PRT, 1)}
                <span> / 1</span>
              </strong>
              <small>required point</small>
            </div>
          </div>
          <strong className="prt-requirement-status">
            {met ? (
              <>
                <Check size={17} /> Minimum met
              </>
            ) : (
              "1 PRT point needed"
            )}
          </strong>
          <p>
            Only PRT has a minimum between point resets. Standard and High
            Impact points have no minimum.
          </p>
        </div>
      </div>
    </section>
  );
}
