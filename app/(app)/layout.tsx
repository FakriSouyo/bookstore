import { AppShell } from '@/components/layout/AppShell';
import { requireUser } from '@/lib/auth/guards';
import { SessionProvider } from '@/lib/auth/session-context';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // requireUser() already performs the getUser() + profile lookup — one round trip.
  const session = await requireUser();
  return (
    <SessionProvider user={session}>
      <AppShell>{children}</AppShell>
    </SessionProvider>
  );
}
