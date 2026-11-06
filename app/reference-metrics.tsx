import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
type Metric = {
  label: string;
  value: ReactNode;
  detail: string;
  onSelect?: () => void;
};
type ReferenceMetricsProps = { metrics: Metric[] };
export default function ReferenceMetrics({ metrics }: ReferenceMetricsProps) {
  return (
    <section className="reference-metrics" aria-label="At a glance">
      {metrics.map((metric) => (
        <article className="reference-metric" key={metric.label}>
          <h2>{metric.label}</h2>
          <div>
            <strong>{metric.value}</strong>
            <p>{metric.detail}</p>
          </div>
          {metric.onSelect && (
            <button
              className="metric-link"
              aria-label={`View ${metric.label.toLowerCase()}`}
              onClick={metric.onSelect}
            >
              <ArrowUpRight size={15} aria-hidden="true" />
            </button>
          )}
        </article>
      ))}
    </section>
  );
}
