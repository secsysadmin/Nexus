"use client";
import { Check, Circle, ArrowUpRight } from "lucide-react";
import { labels } from "../lib/domain";
import { pointHistory, pointCategories } from "../lib/point-history";
import type { Credit, Semester } from "../lib/types";
const colors = { PRT: "#500000", STANDARD: "#a64b64", HIGH_IMPACT: "#5f6682" };
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
  const { totals } = pointHistory(credits, semester, accountId);
  const total = pointCategories.reduce(
    (sum, category) => sum + totals[category],
    0,
  );
  const met = totals.PRT >= 1;
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
                            ? "2 points per event · Awarded by SEC"
                            : "1 point per event"}
                        </small>
                      </span>
                    </div>
                    <div className="points-share-track" aria-hidden="true">
                      <span
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
                className="prt-ring-fill"
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
                <Check size={17} /> Semester minimum met
              </>
            ) : (
              "1 PRT point still needed"
            )}
          </strong>
          <p>
            Only PRT has a semester minimum. Standard and High Impact points
            have no minimum.
          </p>
        </div>
      </div>
    </section>
  );
}
