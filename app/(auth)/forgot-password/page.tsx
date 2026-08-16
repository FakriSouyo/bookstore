'use client';

import { Mail } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { forgotPasswordAction } from '../login/actions';

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState('');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await forgotPasswordAction(email);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-[400px]">
        <CardHeader>
          <CardTitle>Atur ulang kata sandi</CardTitle>
          {!sent && <CardDescription>Masukkan email akunmu dan kami akan mengirimkan tautan reset.</CardDescription>}
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="border border-success/30 bg-success/5 px-3 py-3 text-[13px]">
              <p className="font-semibold text-success">Tautan reset terkirim</p>
              <p className="mt-1 text-muted-foreground">Periksa kotak masuk email kamu untuk tautan kata sandi baru.</p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="kamu@bookstore.com"
                    className="pl-8"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? 'Mengirim…' : 'Kirim tautan reset'}
              </Button>
            </form>
          )}
          <div className="mt-3 text-center">
            <a href="/login" className="text-[13px] text-primary hover:underline">
              Kembali ke halaman masuk
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
