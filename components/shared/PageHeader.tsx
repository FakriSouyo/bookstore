'use client';

import type { ReactNode } from 'react';

export function PageHeader({
  title,
  subtitle,
  breadcrumb,
  actions,
}: {
  title: string;
  subtitle?: string;
  breadcrumb?: { title: string; href?: string }[];
  actions?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-1">
      {breadcrumb ? (
        <nav className="flex items-center gap-1 text-[13px] text-muted-foreground">
          {breadcrumb.map((b, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span aria-hidden>›</span>}
              {b.href ? (
                <a href={b.href} className="hover:text-foreground">
                  {b.title}
                </a>
              ) : (
                <span className="text-foreground">{b.title}</span>
              )}
            </span>
          ))}
        </nav>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="m-0 text-xl font-bold tracking-tight">{title}</h1>
          {subtitle ? <p className="m-0 text-[13px] text-muted-foreground">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
