"use client";
import { useState } from "react";
import type { pointActivity } from "../lib/dashboard-visuals";
type ActivityWeek = ReturnType<typeof pointActivity>["weeks"][number];
type PointsActivityChartProps = { weeks: ActivityWeek[] };
const CHART_WIDTH = 600;
const CHART_HEIGHT = 170;
const CHART_LEFT = 28;
const CHART_TOP = 14;
const CHART_BOTTOM = 150;
const CHART_RIGHT = 14;
const GRID_STEPS = [0, 0.5, 1];
const weekLabel = (start: number) =>
  new Date(start).toLocaleDateString("en-US", {
    timeZone: "America/Chicago",
    month: "short",
    day: "numeric",
  });
export default function PointsActivityChart({
  weeks,
}: PointsActivityChartProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const selectedWeek = selected === null ? null : weeks[selected];
  const points = selectedWeek
    ? selectedWeek.points
    : weeks.reduce((sum, week) => sum + week.points, 0);
  const checkins = selectedWeek
    ? selectedWeek.checkins
    : weeks.reduce((sum, week) => sum + week.checkins, 0);
  const maximum = Math.max(1, ...weeks.map((week) => week.points));
  const plotWidth = CHART_WIDTH - CHART_LEFT - CHART_RIGHT;
  const plotHeight = CHART_BOTTOM - CHART_TOP;
  const coordinates = weeks.map((week, index) => ({
    x: CHART_LEFT + (index * plotWidth) / Math.max(weeks.length - 1, 1),
    y: CHART_BOTTOM - (week.points / maximum) * plotHeight,
  }));
  const line = coordinates
    .map((point, index) => `${index ? "L" : "M"}${point.x},${point.y}`)
    .join(" ");
  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];
  const area =
    first && last
      ? `${line} L${last.x},${CHART_BOTTOM} L${first.x},${CHART_BOTTOM} Z`
      : "";
  return (
    <div className="points-activity-chart">
      <div className="activity-summary" aria-live="polite" aria-atomic="true">
        <div>
          <strong>
            {points}
            <span>{points === 1 ? "point awarded" : "points awarded"}</span>
          </strong>
          <p>
            {selectedWeek
              ? `Week of ${weekLabel(selectedWeek.start)}`
              : "Across the last eight weeks"}{" "}
            · {checkins}{" "}
            {checkins === 1 ? "attendance record" : "attendance records"}
          </p>
        </div>
        {selectedWeek ? (
          <button
            className="text-button chart-reset"
            onClick={() => setSelected(null)}
          >
            All eight weeks
          </button>
        ) : (
          <span>Select a week to inspect</span>
        )}
      </div>
      <svg
        className="points-chart"
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        role="img"
        aria-label="Weekly points awarded over the last eight weeks"
      >
        <title>
          {weeks
            .map(
              (week) =>
                `Week of ${weekLabel(week.start)}: ${week.points} points`,
            )
            .join("; ")}
        </title>
        {GRID_STEPS.map((step) => (
          <g key={step}>
            <line
              className="chart-grid"
              x1={CHART_LEFT}
              x2={CHART_WIDTH - CHART_RIGHT}
              y1={CHART_BOTTOM - step * plotHeight}
              y2={CHART_BOTTOM - step * plotHeight}
            />
            <text
              className="chart-scale"
              x={0}
              y={CHART_BOTTOM - step * plotHeight + 4}
            >
              {Math.round(maximum * step * 10) / 10}
            </text>
          </g>
        ))}
        <path className="chart-area" d={area} />
        <path className="chart-line" d={line} />
        {coordinates.map((point, index) => (
          <circle
            key={weeks[index].start}
            className={
              "chart-dot" + (selected === index ? " chart-selected" : "")
            }
            cx={point.x}
            cy={point.y}
            r={selected === index ? 6 : 4}
          />
        ))}
      </svg>
      <div
        className="chart-weeks"
        role="group"
        aria-label="Inspect a week of points activity"
      >
        {weeks.map((week, index) => (
          <button
            key={week.start}
            aria-pressed={selected === index}
            aria-label={`Week of ${weekLabel(week.start)}: ${week.points} points`}
            onClick={() => setSelected(selected === index ? null : index)}
          >
            {weekLabel(week.start)}
          </button>
        ))}
      </div>
      <p className="chart-note">
        Current point period · Removed awards excluded
      </p>
    </div>
  );
}
