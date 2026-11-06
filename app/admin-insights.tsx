"use client";
import { ArrowUpRight } from "lucide-react";
import type { HubData } from "../lib/types";
import { pointActivity } from "../lib/dashboard-visuals";
import PointsActivityChart from "./points-activity-chart";
type AdminInsightsProps = {
  data: HubData;
  counts: NonNullable<HubData["dashboardCounts"]>;
  onActivity: () => void;
  onSocieties: () => void;
  onReviews: () => void;
};
const CATEGORY_LABELS = [
  "Presidents’ Round Table",
  "Standard Event",
  "High Impact Event",
];
export default function AdminInsights({
  data,
  counts,
  onActivity,
  onSocieties,
  onReviews,
}: AdminInsightsProps) {
  const { weeks, categories } = pointActivity(
    data.credits,
    data.pointCycle.id,
    Date.now(),
  );
  const total = categories.reduce((sum, value) => sum + value, 0);
  const met = Math.max(0, counts.activeSocieties - counts.missingPrt);
  const percent = counts.activeSocieties
    ? Math.round((met / counts.activeSocieties) * 100)
    : 0;
  return (
    <div className="admin-insights">
      <section
        className="insight-activity"
        aria-labelledby="activity-insight-title"
      >
        <div className="insight-heading">
          <h2 id="activity-insight-title">Points activity</h2>
          <button className="text-button" onClick={onActivity}>
            View ledger <ArrowUpRight size={15} />
          </button>
        </div>
        <PointsActivityChart weeks={weeks} />
      </section>
      <section className="insight-prt" aria-labelledby="prt-insight-title">
        <div className="insight-heading">
          <h2 id="prt-insight-title">Society readiness</h2>
          <button className="text-button" onClick={onSocieties}>
            View societies <ArrowUpRight size={15} />
          </button>
        </div>
        <div className="readiness-value">
          <strong>
            {percent}
            <span>%</span>
          </strong>
          <span>
            of active societies
            <br />
            have met the PRT minimum
          </span>
        </div>
        <progress
          className="readiness-progress"
          value={met}
          max={Math.max(counts.activeSocieties, 1)}
          aria-label={`${met} of ${counts.activeSocieties} active societies have met the PRT minimum`}
        />
        <div className="readiness-key">
          <span>
            <i />
            {met} minimum met
          </span>
          <span>
            <i />
            {counts.missingPrt} to follow up
          </span>
        </div>
        <div className="readiness-actions">
          <button onClick={onReviews}>
            <strong>{counts.pendingReviews}</strong>
            <span>Awaiting review</span>
            <ArrowUpRight size={16} />
          </button>
          <button onClick={onSocieties}>
            <strong>{counts.awaitingSetup}</strong>
            <span>Awaiting setup</span>
            <ArrowUpRight size={16} />
          </button>
        </div>
        {!counts.activeSocieties && (
          <small>Add society accounts to start tracking readiness.</small>
        )}
      </section>
      <section className="insight-mix" aria-labelledby="mix-insight-title">
        <div className="insight-heading">
          <h2 id="mix-insight-title">Points by category</h2>
          <span>{total} total points</span>
        </div>
        <div className="category-breakdown">
          {CATEGORY_LABELS.map((label, index) => (
            <div key={label}>
              <span>
                <i className={`category-${index}`} />
                {label}
              </span>
              <strong>
                {categories[index]} <small>pts</small>
              </strong>
              <progress
                value={categories[index]}
                max={Math.max(total, 1)}
                aria-label={`${label}: ${categories[index]} of ${total} total points`}
              />
            </div>
          ))}
        </div>
        <small>
          {total
            ? "Share of earned points in the current period. Only PRT has a minimum requirement."
            : "Category totals appear as societies earn points."}
        </small>
      </section>
    </div>
  );
}
