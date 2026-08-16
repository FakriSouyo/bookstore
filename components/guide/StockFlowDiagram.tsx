'use client';

import { ArrowDown, ArrowUp, Boxes } from 'lucide-react';

/** Diagram alur stok: dari mana stok bertambah & berkurang. */
export function StockFlowDiagram() {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
      {/* Masuk */}
      <div className="flex-1 rounded border border-success/30 bg-success/5 p-3">
        <p className="m-0 mb-2 flex items-center gap-1.5 text-[12px] font-bold text-success">
          <ArrowDown className="size-3.5" /> Stok BERTAMBAH (+)
        </p>
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[13px]">
          <li className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-success" />
            <span>
              <strong>Pembelian diterima</strong>
              <span className="text-muted-foreground"> (saat status jadi RECEIVED/COMPLETED — bukan saat PO dibuat)</span>
            </span>
          </li>
          <li className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-success" />
            <span>
              <strong>Penyesuaian masuk</strong>
              <span className="text-muted-foreground"> (stok opname, koreksi)</span>
            </span>
          </li>
          <li className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-success" />
            <span>
              <strong>Retur masuk</strong>
              <span className="text-muted-foreground"> (pembeli mengembalikan buku)</span>
            </span>
          </li>
        </ul>
      </div>

      {/* Tengah */}
      <div className="flex items-center justify-center md:flex-col md:gap-1">
        <span className="hidden text-muted-foreground md:block" aria-hidden>
          →
        </span>
        <div className="flex flex-col items-center gap-1 rounded border-2 border-primary bg-primary/5 px-5 py-3">
          <Boxes className="size-5 text-primary" />
          <span className="text-[13px] font-bold">STOK BUKU</span>
          <span className="text-[11px] text-muted-foreground">kolom stok di buku</span>
        </div>
        <span className="text-muted-foreground md:hidden" aria-hidden>
          ↓
        </span>
      </div>

      {/* Keluar */}
      <div className="flex-1 rounded border border-destructive/30 bg-destructive/5 p-3">
        <p className="m-0 mb-2 flex items-center gap-1.5 text-[12px] font-bold text-destructive">
          <ArrowUp className="size-3.5" /> Stok BERKURANG (−)
        </p>
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[13px]">
          <li className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-destructive" />
            <span>
              <strong>Penjualan</strong>
              <span className="text-muted-foreground"> (tiap transaksi selesai)</span>
            </span>
          </li>
          <li className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-destructive" />
            <span>
              <strong>Rusak / hilang</strong>
              <span className="text-muted-foreground"> (dicatat lewat Ubah stok)</span>
            </span>
          </li>
          <li className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-destructive" />
            <span>
              <strong>Penyesuaian keluar</strong>
              <span className="text-muted-foreground"> & retur ke pemasok</span>
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
