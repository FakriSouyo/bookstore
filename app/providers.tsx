'use client';

import { Toaster } from '@/components/ui/sonner';
import { SensoryUIProvider } from '@/components/ui/sensory-ui';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Subtle WebAudio feedback layer (sensory-ui). */}
      <SensoryUIProvider>{children}</SensoryUIProvider>
      <Toaster position="top-right" richColors={false} closeButton />
    </>
  );
}
