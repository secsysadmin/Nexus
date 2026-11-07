"use client";
import { ArrowUpRight } from "lucide-react";
import type { HubData } from "../lib/types";
import { pointActivity } from "../lib/dashboard-visuals";
type AdminInsightsProps = {
  data: HubData;
  counts: NonNullable<HubData["dashboardCounts"]>;
  onActivity: () => void;
  onSocieties: () => void;
  onReviews: () => void;
};
const date = (at: number) =>
  new Date(at).toLocaleDateString("en-US", {
    timeZone: "America/Chicago",
    month: "short",
    day: "numeric",
  });
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
  const max = Math.max(1, ...weeks.map((week) => week.points));
  return (
    <div className="admin-insights">
      <section className="insight-prt" aria-labelledby="prt-insight-title">
        <div className="insight-heading">
          <h2 id="prt-insight-title">Society readiness</h2>
          <button className="text-button" onClick={onSocieties}>
            View societies <ArrowUpRight size={16} />
          </button>
        </div>
        <div className="readiness-value">
          <strong>
            {percent}
            <span>%</span>
          </strong>
          <span>
            of active societies have
            <br />
            met the PRT minimum
          </span>
        </div>
        <div
          className="readiness-track"
          role="img"
          aria-label={`${met} of ${counts.activeSocieties} active societies have met the PRT minimum`}
        >
          <span style={{ width: `${percent}%` }} />
        </div>
        <div className="readiness-key">
          <span>
            <i />
            {met} met
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
            <ArrowUpRight size={17} />
          </button>
          <button onClick={onSocieties}>
            <strong>{counts.awaitingSetup}</strong>
            <span>Awaiting setup</span>
            <ArrowUpRight size={17} />
          </button>
        </div>
        {!counts.activeSocieties && (
          <small>Add society accounts to start tracking readiness.</small>
        )}
      </section>
      <section
        className="insight-activity"
        aria-labelledby="activity-insight-title"
      >
        <div className="insight-heading">
          <h2 id="activity-insight-title">Points activity</h2>
          <button className="text-button" onClick={onActivity}>
            Ledger <ArrowUpRight size={16} />
          </button>
        </div>
        <p>Points awarded in the last eight weeks</p>
        <div
          className="activity-plot"
          role="group"
          aria-label="Weekly points awarded"
        >
          {weeks.map((week, index) => (
            <div className="activity-column" key={index}>
              <span className="activity-number">{week.points}</span>
              <div className="activity-bar-space">
                <div
                  className="activity-bar"
                  style={{ height: `${(week.points / max) * 100}%` }}
                >
                  <span className="sr-only">
                    Week starting {date(week.start)}: {week.points} points from{" "}
                    {week.checkins} attendance records
                  </span>
                </div>
              </div>
              <span className="activity-date">{date(week.start)}</span>
            </div>
          ))}
        </div>
        <small>Current point period only · Removed awards excluded</small>
      </section>
      <section className="insight-mix" aria-labelledby="mix-insight-title">
        <div className="insight-heading">
          <h2 id="mix-insight-title">Points by category</h2>
          <span>{total} total</span>
        </div>
        <div
          className="category-stack"
          role="img"
          aria-label={`PRT ${categories[0]}, Standard ${categories[1]}, High Impact ${categories[2]} points`}
        >
          {categories.map((value, i) => (
            <span
              key={i}
              className={`category-${i}`}
              style={{ width: `${total ? (value / total) * 100 : 0}%` }}
            />
          ))}
        </div>
        <div className="category-breakdown">
          {[
            "Presidents’ Round Table",
            "Standard Event",
            "High Impact Event",
          ].map((label, i) => (
            <div key={label}>
              <span>
                <i className={`category-${i}`} />
                {label}
              </span>
              <strong>
                {categories[i]} <small>pts</small>
              </strong>
            </div>
          ))}
        </div>
        <small>
          {total
            ? "Share of all points in the current period"
            : "Category totals appear as societies earn points."}
        </small>
      </section>
    </div>
  );
}
