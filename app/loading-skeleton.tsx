export default function LoadingSkeleton() {
  return (
    <main
      className="loading-shell"
      aria-busy="true"
      aria-label="Loading SocietyHub"
    >
      <p className="sr-only" role="status">
        Loading your workspace…
      </p>
      <aside className="loading-sidebar" aria-hidden="true">
        <div className="loading-brand">
          <img src="/societyhub-mark.svg" width={42} height={42} alt="" />
          <strong>SocietyHub</strong>
        </div>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="skeleton skeleton-nav" />
        ))}
      </aside>
      <div className="loading-content" aria-hidden="true">
        <div className="loading-top">
          <span className="skeleton skeleton-line" />
        </div>
        <div className="loading-body">
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-subtitle" />
          <div className="loading-stats">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i}>
                <div className="skeleton skeleton-label" />
                <div className="skeleton skeleton-number" />
              </div>
            ))}
          </div>
          <div className="skeleton skeleton-section" />
          {Array.from({ length: 3 }, (_, i) => (
            <div className="loading-row" key={i}>
              <div className="skeleton skeleton-date" />
              <div>
                <div className="skeleton skeleton-row-title" />
                <div className="skeleton skeleton-row-detail" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
