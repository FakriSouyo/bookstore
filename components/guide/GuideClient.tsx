'use client';

import {
  BarChart3,
  BookOpen,
  Boxes,
  CircleHelp,
  LayoutDashboard,
  LogIn,
  Package,
  ReceiptText,
  ShoppingCart,
  Smartphone,
  Users,
  Wallet,
} from 'lucide-react';
import { useState } from 'react';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { GUIDES } from './guide-data';
import { StepPlayer } from './StepPlayer';
import { StockFlowDiagram } from './StockFlowDiagram';

const ICONS: Record<string, React.ReactNode> = {
  stok: <Boxes className="size-4" />,
  pos: <ShoppingCart className="size-4" />,
  buku: <BookOpen className="size-4" />,
  pembelian: <Package className="size-4" />,
  penjualan: <ReceiptText className="size-4" />,
  laporan: <BarChart3 className="size-4" />,
  pengeluaran: <Wallet className="size-4" />,
  pengguna: <Users className="size-4" />,
  dasbor: <LayoutDashboard className="size-4" />,
  login: <LogIn className="size-4" />,
  mobile: <Smartphone className="size-4" />,
};

export function GuideClient() {
  const [activeId, setActiveId] = useState('stok');
  const active = GUIDES.find((g) => g.id === activeId) ?? GUIDES[0];

  return (
    <div className="flex flex-col gap-4">
      {/* Cara kerja stok */}
      <Card className="p-4">
        <div className="mb-3 flex items-start gap-2">
          <CircleHelp className="mt-0.5 size-4 shrink-0 text-primary" />
          <div>
            <h2 className="m-0 text-[15px] font-bold">Stok itu nambah dari mana?</h2>
            <p className="m-0 mt-0.5 text-[13px] text-muted-foreground">
              Stok <strong>tidak</strong> bertambah otomatis saat kamu <em>membuat</em> pembelian. Stok bertambah saat
              barangnya <strong>diterima</strong>, dan berkurang saat terjual atau dikeluarkan. Semua perubahan tercatat
              sebagai <em>pergerakan stok</em> (siapa, kapan, dari berapa ke berapa) — tidak ada yang mengubah stok
              langsung.
            </p>
          </div>
        </div>
        <StockFlowDiagram />
        <ul className="m-0 mt-3 flex list-none flex-col gap-1 p-0 text-[13px] text-muted-foreground">
          <li>
            💡 <strong className="text-foreground">Cara normal menambah stok:</strong> buat Pembelian → status{' '}
            <em>DRAFT</em> → klik <em>Terima</em> → stok bertambah otomatis.
          </li>
          <li>
            ✏️ <strong className="text-foreground">Ubah stok (Set stok ke 10):</strong> untuk koreksi fisik, rusak,
            atau hilang — bukan pengganti pembelian.
          </li>
          <li>
            🛡️ Stok <strong className="text-foreground">tidak bisa negatif</strong> — penjualan ditolak jika stok
            tidak cukup.
          </li>
        </ul>
      </Card>

      {/* Daftar guide */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[250px_1fr]">
        <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
          {GUIDES.map((g) => {
            const isActive = g.id === active.id;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setActiveId(g.id)}
                className={cn(
                  'flex shrink-0 flex-col gap-0.5 rounded border px-3 py-2 text-left transition-colors lg:w-full',
                  isActive
                    ? 'border-primary/50 bg-primary/5'
                    : 'border-border bg-card hover:border-primary/30',
                )}
              >
                <span className={cn('flex items-center gap-2 text-[13px] font-semibold', isActive && 'text-primary')}>
                  {ICONS[g.id]}
                  {g.title}
                </span>
                <span className="line-clamp-1 text-[11px] text-muted-foreground">{g.short}</span>
              </button>
            );
          })}
        </div>

        <Card className="p-4">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-1">
            <h2 className="m-0 text-[15px] font-bold">{active.title}</h2>
            <span className="text-[11px] text-muted-foreground">
              {active.steps.length} langkah · putar otomatis seperti video
            </span>
          </div>
          <StepPlayer key={active.id} steps={active.steps} />
          {/* Langkah tertulis */}
          <ol className="m-0 mt-4 flex list-none flex-col gap-2 p-0">
            {active.steps.map((s, i) => (
              <li key={i} className="flex items-start gap-2.5 border border-border bg-muted/30 p-2.5">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="m-0 text-[13px] font-semibold">{s.title}</p>
                  {s.desc ? <p className="m-0 text-[12px] text-muted-foreground">{s.desc}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}
