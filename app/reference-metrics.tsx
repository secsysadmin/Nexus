import type { ReactNode } from "react";
type Metric = { label: string; value: ReactNode; detail: string };
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
        </article>
      ))}
    </section>
  );
}
