'use client';

import { BookOpen, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSensoryUI } from '@/components/ui/sensory-ui';
import { useBreakpoint } from '@/components/layout/useBreakpoint';

import { loginAction } from './actions';

export default function LoginPage() {
  const router = useRouter();
  const { isMobile } = useBreakpoint();
  const { playSound } = useSensoryUI();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    void playSound('interaction.tap');
    if (!email || !password) {
      setError('Email dan kata sandi wajib diisi');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await loginAction(email, password);
      if (res.error) {
        setError(res.error);
        return;
      }
      void playSound('hero.complete');
      router.push('/dashboard');
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Brand panel — desktop only */}
      {!isMobile && (
        <div className="flex flex-[0_0_46%] flex-col justify-between bg-primary p-12 text-primary-foreground">
          <span className="flex items-center gap-2 text-lg font-bold">
            <BookOpen className="size-5" />
            Bookstore
          </span>
          <div>
            <h2 className="mb-3 text-3xl font-bold tracking-tight">Kelola toko bukumu dari satu tempat.</h2>
            <p className="max-w-sm text-sm text-primary-foreground/70">
              Stok, kasir, pembelian, pengeluaran, dan laporan — cepat, rapi, dan aman.
            </p>
          </div>
          <span className="text-xs text-primary-foreground/55">© 2026 Bookstore Management</span>
        </div>
      )}

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center bg-background p-6">
        <div className="w-full max-w-[380px]">
          {isMobile && (
            <span className="mb-6 flex items-center gap-2 text-lg font-bold">
              <BookOpen className="size-5 text-primary" />
              Bookstore
            </span>
          )}
          <h1 className="mb-1 text-xl font-bold">Masuk</h1>
          <p className="mb-7 text-[13px] text-muted-foreground">Sistem internal — khusus staf.</p>

          <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="kamu@bookstore.com"
                  className="pl-8"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Kata sandi</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="pl-8 pr-8"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            {error && (
              <p className="m-0 border border-destructive/30 bg-destructive/5 px-3 py-2 text-[13px] text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" size="lg" disabled={loading} className="mt-1 w-full">
              {loading ? 'Memproses…' : 'Masuk'}
            </Button>
          </form>
          <div className="mt-3 flex justify-end">
            <a href="/forgot-password" className="text-[13px] text-primary hover:underline">
              Lupa kata sandi?
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
