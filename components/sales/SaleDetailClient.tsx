'use client';

import { cn } from '@/lib/utils';

import { ReprintButton } from '@/components/sales/ReprintButton';
import { SaleActions } from '@/components/sales/SaleActions';
import { Money } from '@/components/shared/Money';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusTag } from '@/components/shared/StatusTag';
import { ResponsiveTable, type DataColumn } from '@/components/tables/ResponsiveTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTime } from '@/lib/utils/format';

export interface SaleDetailRow {
  id: string;
  invoice_number: string;
  created_at: string;
  status: string;
  payment_method: string;
  tendered_cents: number;
  change_cents: number;
  subtotal_cents: number;
  discount_cents: number;
  total_cents: number;
  void_reason?: string | null;
  refunded_amount_cents: number;
  cashier?: { full_name?: string } | null;
}

interface MovementRow {
  quantity: number;
  movement_type: string;
  created_at: string;
  notes: string | null;
}

export function SaleDetailClient({
  sale,
  items,
  payments,
  movements,
  canVoid,
  canRefund,
  canPrint,
}: {
  sale: SaleDetailRow;
  items: Array<Record<string, unknown>>;
  payments: Array<Record<string, unknown>>;
  movements: MovementRow[];
  canVoid: boolean;
  canRefund: boolean;
  canPrint: boolean;
}) {
  const itemColumns: DataColumn<Record<string, unknown>>[] = [
    { key: 'title', header: 'Judul', render: (row) => <span className="block max-w-[280px] truncate">{String(row.title_snapshot ?? '—')}</span> },
    { key: 'isbn', header: 'ISBN', priority: 'tablet', render: (row) => String(row.isbn_snapshot ?? '—') },
    { key: 'qty', header: 'Jml', align: 'right', render: (row) => <span className="tabular-nums">{String(row.quantity ?? '—')}</span> },
    { key: 'price', header: 'Harga satuan', align: 'right', render: (row) => <Money cents={Number(row.unit_price_cents) || 0} /> },
    { key: 'line', header: 'Subtotal baris', align: 'right', render: (row) => <Money cents={Number(row.line_total_cents) || 0} strong /> },
  ];

  const paymentColumns: DataColumn<Record<string, unknown>>[] = [
    { key: 'method', header: 'Metode', render: (row) => String(row.method ?? '—') },
    { key: 'amount', header: 'Jumlah', align: 'right', render: (row) => <Money cents={Number(row.amount_cents) || 0} /> },
    { key: 'ref', header: 'Ref', render: (row) => String(row.reference ?? '—') },
  ];

  return (
    <div>
      <PageHeader
        title={sale.invoice_number}
        breadcrumb={[{ title: 'Penjualan', href: '/sales' }, { title: sale.invoice_number }]}
        actions={[
          <SaleActions
            key="actions"
            saleId={sale.id}
            status={sale.status as never}
            items={items as never[]}
            canVoid={canVoid}
            canRefund={canRefund}
          />,
          canPrint ? <ReprintButton key="print" saleId={sale.id} /> : null,
        ]}
      />
      <Card className="mb-4">
        <CardContent>
          <div className="grid gap-x-6 gap-y-1 sm:grid-cols-3">
            <Field label="Tanggal">{formatDateTime(sale.created_at)}</Field>
            <Field label="Kasir">{sale.cashier?.full_name ?? '—'}</Field>
            <Field label="Status">
              <StatusTag domain="sale" value={sale.status} />
            </Field>
            <Field label="Metode pembayaran">{sale.payment_method}</Field>
            <Field label="Dibayar">
              <Money cents={sale.tendered_cents} />
            </Field>
            <Field label="Kembalian">
              <Money cents={sale.change_cents} />
            </Field>
            {sale.void_reason ? <Field label="Alasan void">{sale.void_reason}</Field> : null}
            {sale.refunded_amount_cents > 0 ? (
              <Field label="Dikembalikan">
                <Money cents={sale.refunded_amount_cents} />
              </Field>
            ) : null}
          </div>
        </CardContent>
      </Card>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Item</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveTable<Record<string, unknown>> rowKey="id" columns={itemColumns} data={items} />
          <p className="mt-4 text-right text-[13px] text-muted-foreground">
            Subtotal: <Money cents={sale.subtotal_cents} />
            {sale.discount_cents > 0 ? (
              <>
                {' '}
                · Diskon: −<Money cents={sale.discount_cents} />
              </>
            ) : null}
          </p>
          <p className="m-0 text-right text-lg font-bold">
            Total: <Money cents={sale.total_cents} />
          </p>
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pembayaran</CardTitle>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <p className="m-0 text-muted-foreground">Tidak ada pembayaran</p>
            ) : (
              <ResponsiveTable<Record<string, unknown>> rowKey="id" columns={paymentColumns} data={payments} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pergerakan stok</CardTitle>
          </CardHeader>
          <CardContent>
            {movements.length === 0 ? (
              <p className="m-0 text-muted-foreground">Tidak ada pergerakan</p>
            ) : (
              <div className="flex flex-col gap-2">
                {movements.map((m) => (
                  <div key={m.created_at + m.movement_type + m.quantity} className="flex flex-col gap-0.5 border-l-2 border-border pl-3">
                    <span className="text-[13px]">
                      <span className={cn('tabular-nums font-semibold', m.quantity > 0 ? 'text-success' : 'text-destructive')}>
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                      </span>{' '}
                      {m.movement_type.replace(/_/g, ' ')} · {formatDateTime(m.created_at)}
                    </span>
                    {m.notes ? <span className="text-xs text-muted-foreground">{m.notes}</span> : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
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
