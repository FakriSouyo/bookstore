'use client';

import { Minus, Plus, Search, Trash2 } from 'lucide-react';
import { useReducer, useRef, useState } from 'react';
import { toast } from 'sonner';

import { useBreakpoint } from '@/components/layout/useBreakpoint';
import { ReceiptModal } from '@/components/receipt/ReceiptModal';
import { useSensoryUI } from '@/components/ui/sensory-ui';
import { checkoutAction, searchPosBooks, type PosBook } from '@/app/(app)/pos/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { computeChange } from '@/lib/pricing/pricing';
import { safeMessage } from '@/lib/utils/errors';
import { formatMoney } from '@/lib/utils/money';

interface CartItem {
  bookId: string;
  title: string;
  priceCents: number;
  stock: number;
  quantity: number;
}

type CartAction =
  | { type: 'add'; book: PosBook }
  | { type: 'inc'; bookId: string }
  | { type: 'dec'; bookId: string }
  | { type: 'remove'; bookId: string }
  | { type: 'clear' };

function cartReducer(state: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case 'add': {
      const existing = state.find((i) => i.bookId === action.book.id);
      if (existing) {
        if (existing.quantity >= existing.stock) return state;
        return state.map((i) => (i.bookId === action.book.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      if (action.book.stock <= 0) return state;
      return [...state, { bookId: action.book.id, title: action.book.title, priceCents: action.book.selling_price_cents, stock: action.book.stock, quantity: 1 }];
    }
    case 'inc':
      return state.map((i) => (i.bookId === action.bookId && i.quantity < i.stock ? { ...i, quantity: i.quantity + 1 } : i));
    case 'dec':
      return state.map((i) => (i.bookId === action.bookId ? { ...i, quantity: i.quantity - 1 } : i)).filter((i) => i.quantity > 0);
    case 'remove':
      return state.filter((i) => i.bookId !== action.bookId);
    case 'clear':
      return [];
    default:
      return state;
  }
}

/** Quick-tender denominations in Rupiah. */
const QUICK_TENDERS = [
  { value: 10_000, label: '10 rb' },
  { value: 50_000, label: '50 rb' },
  { value: 100_000, label: '100 rb' },
];

const PAYMENT_OPTIONS = [
  { label: 'Tunai', value: 'CASH' },
  { label: 'Kartu', value: 'CARD' },
  { label: 'Transfer', value: 'TRANSFER' },
  { label: 'E-Wallet', value: 'MOBILE_MONEY' },
  { label: 'Lainnya', value: 'OTHER' },
] as const;

type PaymentMethod = (typeof PAYMENT_OPTIONS)[number]['value'];

export function PosClient() {
  const { isMobile } = useBreakpoint();
  const [cart, dispatch] = useReducer(cartReducer, []);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PosBook[]>([]);
  const [searching, setSearching] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [tendered, setTendered] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [checkingOut, setCheckingOut] = useState(false);
  const [receiptSaleId, setReceiptSaleId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { playSound } = useSensoryUI();

  const addBook = (book: PosBook) => {
    void playSound('interaction.tap');
    dispatch({ type: 'add', book });
  };
  const adjustQuantity = (type: 'inc' | 'dec' | 'remove', bookId: string) => {
    void playSound('interaction.subtle');
    dispatch({ type, bookId });
  };

  const subtotalCents = cart.reduce((s, i) => s + i.priceCents * i.quantity, 0);
  const discountCents = Math.round((discount / 100) * subtotalCents);
  const totalCents = Math.max(0, subtotalCents - discountCents);
  const changeCents = computeChange(totalCents, Math.round(tendered * 100));

  const runSearch = (term: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!term.trim()) {
        setResults([]);
        return;
      }
      setSearching(true);
      try {
        setResults(await searchPosBooks(term));
      } finally {
        setSearching(false);
      }
    }, 250);
  };

  const onEnter = async () => {
    const term = query.trim();
    if (!term) return;
    // Barcode wedge: a long digit string resolves the book directly.
    if (term.length >= 8 && /^[\dX]+$/.test(term)) {
      const [book] = await searchPosBooks(term, 1);
      if (book) {
        addBook(book);
        setQuery('');
        toast.success(`${book.title} ditambahkan`);
        return;
      }
      toast.warning('Tidak ditemukan — periksa barcode/ISBN.');
      setQuery('');
      return;
    }
    if (results.length > 0) {
      addBook(results[0]);
      setQuery('');
    }
  };

  const openPayment = () => {
    void playSound('overlay.open');
    setTendered(Math.ceil(totalCents / 100));
    setPaymentOpen(true);
  };

  const confirmCheckout = async () => {
    setCheckingOut(true);
    try {
      const { saleId } = await checkoutAction({
        items: cart.map((i) => ({ book_id: i.bookId, quantity: i.quantity })),
        payment_method: method,
        tendered_cents: method === 'CASH' ? Math.round(tendered * 100) : totalCents,
        discount_cents: discountCents,
      });
      void playSound('hero.complete');
      dispatch({ type: 'clear' });
      setPaymentOpen(false);
      setDiscount(0);
      setReceiptSaleId(saleId);
    } catch (e) {
      // cart stays intact on failure (bookstore-pos)
      toast.error(safeMessage(e));
    } finally {
      setCheckingOut(false);
    }
  };

  const grid = (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
      {results.length === 0 ? (
        <div className="col-span-full flex flex-col items-center gap-1 py-8 text-center text-muted-foreground">
          <Search className="mb-1 size-5" />
          <p className="m-0 text-[13px]">Ketik judul, ISBN, atau scan barcode</p>
        </div>
      ) : (
        results.map((book) => (
          <button
            key={book.id}
            type="button"
            disabled={book.stock <= 0}
            onClick={() => addBook(book)}
            className={cn(
              'flex flex-col gap-1 border border-border bg-card p-3 text-left transition-colors hover:border-primary/60',
              book.stock <= 0 && 'cursor-not-allowed opacity-50',
            )}
          >
            <span className="line-clamp-2 text-[13px] font-semibold">{book.title}</span>
            <span className="text-xs text-muted-foreground">{book.author || '—'}</span>
            <span className="tabular-nums text-lg font-bold text-primary">{formatMoney(book.selling_price_cents)}</span>
            <span className="text-xs text-muted-foreground">Stok: {book.stock}</span>
          </button>
        ))
      )}
    </div>
  );

  const cartPanel = (
    <Card>
      <CardHeader className="flex-row items-center justify-between !py-2">
        <CardTitle className="text-[13px]">Keranjang ({cart.reduce((s, i) => s + i.quantity, 0)} item)</CardTitle>
        {cart.length > 0 ? (
          <Button variant="ghost" size="sm" className="h-6 text-xs text-destructive hover:text-destructive" onClick={() => dispatch({ type: 'clear' })}>
            Hapus
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {cart.length === 0 ? (
          <p className="m-0 py-4 text-center text-muted-foreground">Keranjang kosong</p>
        ) : (
          <>
            {cart.map((item) => (
              <div key={item.bookId} className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="m-0 truncate text-[13px] font-medium">{item.title}</p>
                  <p className="m-0 text-xs text-muted-foreground tabular-nums">{formatMoney(item.priceCents * item.quantity)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon-sm" onClick={() => adjustQuantity('dec', item.bookId)} aria-label="Kurangi">
                    <Minus className="size-3.5" />
                  </Button>
                  <span className="tabular-nums text-center text-[13px] font-semibold" style={{ width: 28 }}>
                    {item.quantity}
                  </span>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    disabled={item.quantity >= item.stock}
                    onClick={() => adjustQuantity('inc', item.bookId)}
                    aria-label="Tambah"
                  >
                    <Plus className="size-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" onClick={() => adjustQuantity('remove', item.bookId)} aria-label="Hapus item">
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-border pt-2">
              <span className="text-[13px] font-semibold">Total</span>
              <span className="tabular-nums text-lg font-bold">{formatMoney(totalCents)}</span>
            </div>
            <Button size="lg" className="w-full" disabled={cart.length === 0} onClick={openPayment}>
              Bayar — {formatMoney(totalCents)}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div>
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={searchRef}
          autoFocus
          autoComplete="off"
          className="h-9 pl-9"
          placeholder="Scan barcode atau cari judul / ISBN / pengarang"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            runSearch(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void onEnter();
          }}
        />
        {searching && <span className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin rounded-full border-2 border-border border-t-primary" />}
      </div>
      {isMobile ? (
        <div className="flex flex-col gap-3">
          {grid}
          <div className="sticky bottom-[72px] z-5">{cartPanel}</div>
        </div>
      ) : (
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">{grid}</div>
          <div className="w-[380px] shrink-0">{cartPanel}</div>
        </div>
      )}

      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Pembayaran</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div>
              <p className="m-0 mb-1.5 text-xs text-muted-foreground">Metode</p>
              <div className="grid grid-cols-5 border border-border">
                {PAYMENT_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setMethod(o.value)}
                    className={cn(
                      'border-r border-border px-1 py-1.5 text-[12px] font-medium transition-colors last:border-r-0',
                      method === o.value ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted',
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums">{formatMoney(subtotalCents)}</span>
            </div>
            <div className="flex items-center justify-between gap-2 text-[13px]">
              <span className="text-muted-foreground">Diskon</span>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  className="w-20 text-right"
                  value={discount}
                  onChange={(e) => setDiscount(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold">Total</span>
              <span className="tabular-nums text-xl font-bold">{formatMoney(totalCents)}</span>
            </div>
            {method === 'CASH' ? (
              <>
                <div className="flex items-center justify-between gap-2 text-[13px]">
                  <span className="text-muted-foreground">Dibayar</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">Rp</span>
                    <Input
                      type="number"
                      min={0}
                      className="w-32 text-right"
                      value={tendered}
                      onChange={(e) => setTendered(Math.max(0, Number(e.target.value) || 0))}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_TENDERS.map((q) => (
                    <Button key={q.value} variant="outline" size="sm" onClick={() => setTendered(Math.max(totalCents / 100, Math.ceil((tendered + 0.01) / q.value) * q.value))}>
                      {q.label}
                    </Button>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => setTendered(Math.ceil(totalCents / 100))}>
                    Uang pas
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setTendered(Math.ceil(totalCents / 10000) * 100)}>
                    Bulatkan
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold">Kembalian</span>
                  <span className="tabular-nums text-[26px] font-bold text-success">{formatMoney(changeCents)}</span>
                </div>
              </>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentOpen(false)}>
              Batal
            </Button>
            <Button disabled={method === 'CASH' && Math.round(tendered * 100) < totalCents} onClick={() => void confirmCheckout()}>
              {checkingOut ? 'Memproses…' : `Bayar ${formatMoney(totalCents)}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReceiptModal
        key={receiptSaleId ?? 'none'}
        saleId={receiptSaleId}
        open={!!receiptSaleId}
        onClose={() => setReceiptSaleId(null)}
        onDone={() => setReceiptSaleId(null)}
      />
    </div>
  );
}
