import type { PaymentMethod } from '@/types/database';

export interface ReceiptItem {
  title: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
}

export interface ReceiptData {
  store: {
    name: string;
    address?: string | null;
    phone?: string | null;
    footer?: string | null;
    width: '58' | '80';
  };
  sale: {
    id: string;
    invoiceNumber: string;
    createdAt: string;
    cashier: string;
    status: string;
    voidReason?: string | null;
    refundedAmountCents: number;
  };
  items: ReceiptItem[];
  totals: { subtotalCents: number; discountCents: number; totalCents: number };
  payment: { method: PaymentMethod; tenderedCents: number; changeCents: number };
}
