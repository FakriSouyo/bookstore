'use client';

import { cn } from '@/lib/utils';

import { Money } from '@/components/shared/Money';
import { PageHeader } from '@/components/shared/PageHeader';
import { PurchaseActions } from '@/components/purchases/PurchaseActions';
import { ResponsiveTable, type DataColumn } from '@/components/tables/ResponsiveTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils/format';

const STEP_INDEX: Record<string, number> = { DRAFT: 0, ORDERED: 1, RECEIVED: 2, COMPLETED: 3, CANCELLED: 0 };
const STEPS = ['Draf', 'Dipesan', 'Diterima', 'Selesai'];

export interface PurchaseDetailRow {
  id: string;
  invoice_number: string;
  status: string;
  payment_status: string;
  purchase_date: string;
  subtotal_cents: number;
  discount_cents: number;
  shipping_cents: number;
  tax_cents: number;
  total_cents: number;
  suppliers?: { name?: string } | null;
  profiles?: { full_name?: string } | null;
}

export function PurchaseDetailClient({
  purchase,
  items,
  canReceive,
}: {
  purchase: PurchaseDetailRow;
  items: Array<Record<string, unknown>>;
  canReceive: boolean;
}) {
  const columns: DataColumn<Record<string, unknown>>[] = [
    { key: 'book', header: 'Buku', render: (row) => String((row.books as { title?: string } | undefined)?.title ?? '—') },
    { key: 'isbn', header: 'ISBN', render: (row) => String((row.books as { isbn?: string } | undefined)?.isbn ?? '—') },
    { key: 'ordered', header: 'Dipesan', align: 'right', render: (row) => <span className="tabular-nums">{String(row.quantity_ordered ?? '—')}</span> },
    { key: 'received', header: 'Diterima', align: 'right', render: (row) => <span className="tabular-nums">{String(row.quantity_received ?? '—')}</span> },
    { key: 'cost', header: 'Harga satuan', align: 'right', render: (row) => <Money cents={Number(row.unit_cost_cents) || 0} /> },
    { key: 'line', header: 'Subtotal baris', align: 'right', render: (row) => <Money cents={Number(row.line_total_cents) || 0} strong /> },
  ];

  const current = STEP_INDEX[purchase.status];

  return (
    <div>
      <PageHeader
        title={purchase.invoice_number}
        breadcrumb={[{ title: 'Pembelian', href: '/purchases' }, { title: purchase.invoice_number }]}
        actions={[
          <PurchaseActions key="actions" id={purchase.id} status={purchase.status as never} canReceive={canReceive} />,
        ]}
      />
      <Card className="mb-4">
        <CardContent className="flex flex-col gap-4">
          {purchase.status === 'CANCELLED' ? (
            <p className="m-0 text-[13px] text-destructive">Pembelian ini dibatalkan.</p>
          ) : (
            <div className="flex items-center gap-1">
              {STEPS.map((s, i) => (
                <div key={s} className="flex items-center gap-1">
                  <span
                    className={cn(
                      'border px-2 py-0.5 text-xs font-medium',
                      i === current
                        ? 'border-primary bg-primary text-primary-foreground'
                        : i < current
                          ? 'border-primary/40 bg-secondary text-secondary-foreground'
                          : 'border-border text-muted-foreground',
                    )}
                  >
                    {s}
                  </span>
                  {i < STEPS.length - 1 && <span className="h-px w-4 bg-border" />}
                </div>
              ))}
            </div>
          )}
          <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
            <Field label="Pemasok">{purchase.suppliers?.name ?? '—'}</Field>
            <Field label="Faktur">{purchase.invoice_number}</Field>
            <Field label="Tanggal">{formatDate(purchase.purchase_date)}</Field>
            <Field label="Dibuat oleh">{purchase.profiles?.full_name ?? '—'}</Field>
            <Field label="Status">
              <Badge variant="info">{purchase.status}</Badge>
            </Field>
            <Field label="Pembayaran">
              <Badge variant="muted">{purchase.payment_status}</Badge>
            </Field>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Item</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveTable<Record<string, unknown>> rowKey="id" columns={columns} data={items} />
          <p className="mt-4 text-right text-[13px] text-muted-foreground">
            Subtotal: <Money cents={purchase.subtotal_cents} /> · Diskon: −<Money cents={purchase.discount_cents} /> · Ongkir: <Money cents={purchase.shipping_cents} /> · Pajak:{' '}
            <Money cents={purchase.tax_cents} />
          </p>
          <p className="m-0 text-right text-lg font-bold">
            Total: <Money cents={purchase.total_cents} />
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/60 py-1.5 last:border-0">
      <span className="shrink-0 text-[12px] text-muted-foreground">{label}</span>
      <span className="text-right text-[13px]">{children}</span>
    </div>
  );
}
