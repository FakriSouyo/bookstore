'use server';

import { saveSettings } from '@/lib/services/settings';

export async function saveSettingsAction(input: {
  store_name: string;
  store_address?: string | null;
  store_phone?: string | null;
  receipt_footer?: string | null;
  receipt_width: '58' | '80';
  currency: string;
  allow_negative_stock: boolean;
  max_discount_percent: number;
  tax_rate_bps: number;
}) {
  return saveSettings(input);
}
