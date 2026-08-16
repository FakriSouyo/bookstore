/**
 * Route-level loading skeleton (pure CSS — no antd, safe as a Server Component).
 * Rendered inside the app shell via app/(app)/loading.tsx so navigations show
 * instant feedback instead of a blank flash.
 */

const bar = (w: string, h = 14, style: React.CSSProperties = {}) => (
  <div className="skel-bar" style={{ width: w, height: h, ...style }} />
);

export function PageSkeleton({ variant = 'table' }: { variant?: 'table' | 'kpis' | 'pos' }) {
  if (variant === 'kpis') {
    return (
      <div>
        <div style={{ marginBottom: 20 }}>
          {bar('140px', 22)}
          <div style={{ marginTop: 8 }}>{bar('260px', 12)}</div>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 12,
            marginBottom: 20,
          }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skel-card" style={{ padding: 16 }}>
              {bar('90px', 10)}
              <div style={{ marginTop: 12 }}>{bar('120px', 24)}</div>
            </div>
          ))}
        </div>
        <div className="skel-card" style={{ padding: 20 }}>
          {bar('160px', 12)}
          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                {bar('40%', 12)}
                {bar('20%', 12)}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'pos') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16 }}>
        <div className="skel-card" style={{ padding: 16 }}>
          {bar('50%', 36)}
          <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skel-card" style={{ padding: 12, height: 110 }}>
                {bar('70%', 12)}
                <div style={{ marginTop: 10 }}>{bar('50%', 12)}</div>
                <div style={{ marginTop: 10 }}>{bar('80%', 16)}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="skel-card" style={{ padding: 16, height: 'fit-content' }}>
          {bar('60%', 16)}
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                {bar('45%', 12)}
                {bar('20%', 12)}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20 }}>{bar('100%', 40)}</div>
        </div>
      </div>
    );
  }

  // default: page header + table
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        {bar('150px', 22)}
        <div style={{ marginTop: 8 }}>{bar('280px', 12)}</div>
      </div>
      <div className="skel-card" style={{ padding: 16 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: i < 7 ? '1px solid var(--bs-border-soft)' : 'none' }}
          >
            <div style={{ width: '45%' }}>{bar('100%', 14)}</div>
            <div style={{ width: '15%' }}>{bar('100%', 14)}</div>
            <div style={{ width: '12%' }}>{bar('100%', 14)}</div>
            <div style={{ width: '60px' }}>{bar('100%', 24)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
