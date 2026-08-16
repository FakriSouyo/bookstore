'use client';

import { InboxIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
      <div className="mb-1 flex size-10 items-center justify-center border border-border bg-muted text-muted-foreground">
        <InboxIcon className="size-5" />
      </div>
      <p className="m-0 text-sm font-semibold">{title}</p>
      {description ? <p className="m-0 max-w-sm text-[13px] text-muted-foreground">{description}</p> : null}
      {actionLabel && onAction ? (
        <Button className="mt-2" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

export function EmptyStateNode({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}
