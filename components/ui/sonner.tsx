'use client';

import { Toaster as Sonner, type ToasterProps } from 'sonner';

function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--success-text': 'var(--success)',
          '--warning-text': 'var(--warning)',
          '--error-text': 'var(--destructive)',
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: 'group toast rounded-none border border-border bg-popover text-popover-foreground shadow-none',
          title: 'text-[13px] font-semibold',
          description: 'text-xs text-muted-foreground',
          actionButton: 'h-7 rounded-none bg-primary text-[13px] text-primary-foreground',
          cancelButton: 'h-7 rounded-none border border-border bg-transparent text-[13px]',
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
