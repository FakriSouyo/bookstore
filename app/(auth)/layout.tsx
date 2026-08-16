import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Masuk · Bookstore Management' };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
