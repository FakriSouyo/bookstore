'use client';

import type { CSSProperties, ReactNode } from 'react';

import { Card } from '@/components/ui/card';

/** Card wrapper — the only way RSC pages may render a card surface. */
export function Panel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <Card className="p-4" style={style}>
      {children}
    </Card>
  );
}
