// Seed the Bookstore POS with realistic data, flowing through the same
// business paths the app uses: RLS-gated inserts (catalog/books/expenses),
// create_purchase -> ORDERED -> receive_purchase (stock in), create_sale
// (stock out, invoice numbers, payments), adjust_inventory (low/out-of-stock).
//
// Catalog: LKS (Lembar Kerja Siswa) tahun ajaran 2026/2027 — Kurikulum
// Merdeka, SD/MI · SMP/MTs · SMA/MA · SMK (penerbit Intan Pariwara,
// Srikandi, Mediatama, Graha Pustaka, Ratih, Media Karya Putra).
//
// Usage:
//   node --env-file=.env scripts/seed-demo.mjs          # seed (aborts if data exists)
//   node --env-file=.env scripts/seed-demo.mjs --force  # wipe demo data first, then seed
//
// Demo accounts created (password below in DEMO_USERS):
//   demo.owner@bookstore.test (OWNER) | demo.admin@bookstore.test (ADMIN) | demo.cashier@bookstore.test (CASHIER)

import { deflateSync } from 'zlib';

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anonKey || !serviceKey) {
  console.error('Missing env: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const force = process.argv.includes('--force');
const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

const day = 24 * 60 * 60 * 1000;
const now = Date.now();
const rnd = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rnd(arr.length)];
const daysAgo = (d, hour = 12, min = 0) => new Date(now - d * day).setUTCHours(hour, min, 0, 0);
const hoursAgo = (h) => new Date(now - h * 3600 * 1000).toISOString();

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function genIsbn13() {
  const base = '978' + Array.from({ length: 9 }, () => rnd(10)).join('');
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(base[i]) * (i % 2 === 0 ? 1 : 3);
  return base + ((10 - (sum % 10)) % 10);
}

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

const CATEGORIES = ['SD/MI', 'SMP/MTs', 'SMA/MA', 'SMK'];
const PUBLISHERS = ['Intan Pariwara', 'Srikandi', 'Mediatama', 'Graha Pustaka', 'Ratih', 'Media Karya Putra'];
const SUPPLIERS = [
  { name: 'CV Sinar Dunia', contact_person: 'Budi Santoso', phone: '021-5551234', email: 'sales@sinardunia.co.id', address: 'Jl. Raya Bogor KM 25, Jakarta Timur' },
  { name: 'PD Sumber Ilmu', contact_person: 'Siti Rahayu', phone: '024-7654321', email: 'sumberilmu@gmail.com', address: 'Jl. Pandanaran No. 88, Semarang' },
  { name: 'Toko Buku Maju Jaya', contact_person: 'Agus Salim', phone: '031-8889900', email: 'majujaya@yahoo.com', address: 'Jl. Tunjungan No. 12, Surabaya' },
  { name: 'PT Mitra Distribusi Buku', contact_person: 'Dewi Lestari', phone: '022-4445566', email: 'halo@mitradistribusi.co.id', address: 'Jl. Dago No. 5, Bandung' },
];

// [title, author, categoryIdx, publisherIdx, year, purchaseRp, sellRp, minStock, lang]
// LKS tahun ajaran 2026/2027 — Kurikulum Merdeka.
const BOOKS = [
  // SD/MI (0)
  ['LKS Matematika Kelas 1 Semester 1 Kurikulum Merdeka 2026/2027', 'Tim Penyusun', 0, 0, 2026, 10000, 15000, 8, 'Indonesia'],
  ['LKS Matematika Kelas 1 Semester 2 Kurikulum Merdeka 2026/2027', 'Tim Penyusun', 0, 0, 2027, 10000, 15000, 8, 'Indonesia'],
  ['LKS Matematika Kelas 2 Semester 1 Kurikulum Merdeka 2026/2027', 'Tim Penyusun', 0, 1, 2026, 10000, 15000, 8, 'Indonesia'],
  ['LKS Matematika Kelas 3 Semester 1 Kurikulum Merdeka 2026/2027', 'Tim Penyusun', 0, 2, 2026, 10000, 15000, 8, 'Indonesia'],
  ['LKS Matematika Kelas 4 Semester 1 Kurikulum Merdeka 2026/2027', 'Tim Penyusun', 0, 0, 2026, 10000, 15000, 8, 'Indonesia'],
  ['LKS Matematika Kelas 5 Semester 1 Kurikulum Merdeka 2026/2027', 'Tim Penyusun', 0, 3, 2026, 10000, 15000, 8, 'Indonesia'],
  ['LKS Bahasa Indonesia Kelas 1 Semester 1 Kurikulum Merdeka 2026/2027', 'Tim Penyusun', 0, 2, 2026, 10000, 15000, 8, 'Indonesia'],
  ['LKS Bahasa Indonesia Kelas 2 Semester 1 Kurikulum Merdeka 2026/2027', 'Tim Penyusun', 0, 4, 2026, 10000, 15000, 8, 'Indonesia'],
  ['LKS IPAS Kelas 3 Semester 1 Kurikulum Merdeka 2026/2027', 'Tim Penyusun', 0, 1, 2026, 10500, 16000, 8, 'Indonesia'],
  ['LKS IPAS Kelas 4 Semester 1 Kurikulum Merdeka 2026/2027', 'Tim Penyusun', 0, 5, 2026, 10500, 16000, 8, 'Indonesia'],
  ['LKS IPAS Kelas 5 Semester 1 Kurikulum Merdeka 2026/2027', 'Tim Penyusun', 0, 0, 2026, 10500, 16000, 8, 'Indonesia'],
  ['LKS Pendidikan Pancasila Kelas 1 Semester 1 Kurikulum Merdeka 2026/2027', 'Tim Penyusun', 0, 2, 2026, 10000, 15000, 8, 'Indonesia'],
  ['LKS Pendidikan Pancasila Kelas 5 Semester 1 Kurikulum Merdeka 2026/2027', 'Tim Penyusun', 0, 5, 2026, 10000, 15000, 8, 'Indonesia'],
  ['LKS Bahasa Inggris Kelas 4 Semester 1 Kurikulum Merdeka 2026/2027', 'Tim Penyusun', 0, 0, 2026, 11000, 17000, 8, 'Indonesia'],
  ['LKS Bahasa Inggris Kelas 5 Semester 1 Kurikulum Merdeka 2026/2027', 'Tim Penyusun', 0, 1, 2026, 11000, 17000, 8, 'Indonesia'],
  ['LKS PJOK Kelas 1 Semester 1 Kurikulum Merdeka 2026/2027', 'Tim Penyusun', 0, 3, 2026, 10000, 15000, 8, 'Indonesia'],
  ['LKS Seni Budaya Kelas 5 Semester 1 Kurikulum Merdeka 2026/2027', 'Tim Penyusun', 0, 4, 2026, 10000, 15000, 8, 'Indonesia'],
  ['LKS Agama Islam Kelas 3 Semester 1 Kurikulum Merdeka 2026/2027', 'Tim Penyusun', 0, 2, 2026, 10000, 15000, 8, 'Indonesia'],
  ['LKS Bahasa Jawa Kelas 4 Semester 1 Kurikulum Merdeka 2026/2027', 'Tim Penyusun', 0, 5, 2026, 10000, 15000, 8, 'Indonesia'],
  // SMP/MTs (1)
  ['LKS Matematika Kelas 7 Semester 1 Kurikulum Merdeka 2026/2027', 'Tim Penyusun', 1, 0, 2026, 13000, 20000, 6, 'Indonesia'],
  ['LKS Matematika Kelas 8 Semester 1 Kurikulum Merdeka 2026/2027', 'Tim Penyusun', 1, 0, 2026, 13000, 20000, 6, 'Indonesia'],
  ['LKS Matematika Kelas 9 Semester 1 Kurikulum Merdeka 2026/2027', 'Tim Penyusun', 1, 1, 2026, 13000, 20000, 6, 'Indonesia'],
  ['LKS IPA Kelas 7 Semester 1 Kurikulum Merdeka 2026/2027', 'Tim Penyusun', 1, 1, 2026, 13500, 21000, 6, 'Indonesia'],
  ['LKS IPA Kelas 8 Semester 1 Kurikulum Merdeka 2026/2027', 'Tim Penyusun', 1, 2, 2026, 13500, 21000, 6, 'Indonesia'],
  ['LKS IPA Kelas 9 Semester 1 Kurikulum Merdeka 2026/2027', 'Tim Penyusun', 1, 2, 2026, 13500, 21000, 6, 'Indonesia'],
  ['LKS IPS Kelas 7 Semester 1 Kurikulum Merdeka 2026/2027', 'Tim Penyusun', 1, 3, 2026, 13000, 20000, 6, 'Indonesia'],
  ['LKS IPS Kelas 8 Semester 1 Kurikulum Merdeka 2026/2027', 'Tim Penyusun', 1, 3, 2026, 13000, 20000, 6, 'Indonesia'],
  ['LKS Bahasa Indonesia Kelas 7 Semester 1 Kurikulum Merdeka 2026/2027', 'Tim Penyusun', 1, 4, 2026, 13000, 20000, 6, 'Indonesia'],
  ['LKS Bahasa Indonesia Kelas 8 Semester 1 Kurikulum Merdeka 2026/2027', 'Tim Penyusun', 1, 4, 2026, 13000, 20000, 6, 'Indonesia'],
  ['LKS Bahasa Inggris Kelas 7 Semester 1 Kurikulum Merdeka 2026/2027', 'Tim Penyusun', 1, 0, 2026, 13500, 21000, 6, 'Indonesia'],
  ['LKS Bahasa Inggris Kelas 8 Semester 1 Kurikulum Merdeka 2026/2027', 'Tim Penyusun', 1, 5, 2026, 13500, 21000, 6, 'Indonesia'],
  ['LKS PPKn Kelas 7 Semester 1 Kurikulum Merdeka 2026/2027', 'Tim Penyusun', 1, 1, 2026, 13000, 20000, 6, 'Indonesia'],
  ['LKS PPKn Kelas 9 Semester 1 Kurikulum Merdeka 2026/2027', 'Tim Penyusun', 1, 2, 2026, 13000, 20000, 6, 'Indonesia'],
  ['LKS Informatika Kelas 7 Semester 1 Kurikulum Merdeka 2026/2027', 'Tim Penyusun', 1, 0, 2026, 14000, 22000, 6, 'Indonesia'],
  ['LKS PJOK Kelas 7 Semester 1 Kurikulum Merdeka 2026/2027', 'Tim Penyusun', 1, 5, 2026, 13000, 20000, 6, 'Indonesia'],
  ['LKS Agama Islam Kelas 8 Semester 1 Kurikulum Merdeka 2026/2027', 'Tim Penyusun', 1, 3, 2026, 13000, 20000, 6, 'Indonesia'],
  // SMA/MA (2)
  ['LKS Matematika Kelas 10 Semester 1 Kurikulum Merdeka 2026/2027', 'Tim Penyusun', 2, 0, 2026, 16000, 25000, 5, 'Indonesia'],
  ['LKS Matematika Kelas 11 Semester 1 Kurikulum Merdeka 2026/2027', 'Tim Penyusun', 2, 0, 2026, 16000, 25000, 5, 'Indonesia'],
  ['LKS Fisika Kelas 10 Semester 1 Kurikulum Merdeka 2026/2027', 'Tim Penyusun', 2, 1, 2026, 17000, 26000, 5, 'Indonesia'],
  ['LKS Fisika Kelas 11 Semester 1 Kurikulum Merdeka 2026/2027', 'Tim Penyusun', 2, 1, 2026, 17000, 26000, 5, 'Indonesia'],
  ['LKS Kimia Kelas 10 Semester 1 Kurikulum Merdeka 2026/2027', 'Tim Penyusun', 2, 2, 2026, 17000, 26000, 5, 'Indonesia'],
  ['LKS Biologi Kelas 10 Semester 1 Kurikulum Merdeka 2026/2027', 'Tim Penyusun', 2, 2, 2026, 17000, 26000, 5, 'Indonesia'],
  ['LKS Biologi Kelas 12 Semester 1 Kurikulum Merdeka 2026/2027', 'Tim Penyusun', 2, 3, 2026, 17000, 26000, 5, 'Indonesia'],
  ['LKS Ekonomi Kelas 10 Semester 1 Kurikulum Merdeka 2026/2027', 'Tim Penyusun', 2, 3, 2026, 16500, 25000, 5, 'Indonesia'],
  ['LKS Sejarah Kelas 10 Semester 1 Kurikulum Merdeka 2026/2027', 'Tim Penyusun', 2, 4, 2026, 16500, 25000, 5, 'Indonesia'],
  ['LKS Bahasa Indonesia Kelas 10 Semester 1 Kurikulum Merdeka 2026/2027', 'Tim Penyusun', 2, 5, 2026, 16000, 25000, 5, 'Indonesia'],
  ['LKS Bahasa Inggris Kelas 10 Semester 1 Kurikulum Merdeka 2026/2027', 'Tim Penyusun', 2, 0, 2026, 16500, 25000, 5, 'Indonesia'],
  ['LKS PPKn Kelas 11 Semester 1 Kurikulum Merdeka 2026/2027', 'Tim Penyusun', 2, 1, 2026, 16000, 25000, 5, 'Indonesia'],
  ['LKS Informatika Kelas 10 Semester 1 Kurikulum Merdeka 2026/2027', 'Tim Penyusun', 2, 2, 2026, 17000, 26000, 5, 'Indonesia'],
  // SMK (3)
  ['LKS Matematika SMK Kelas 10 Semester 1 Kurikulum Merdeka 2026/2027', 'Tim Penyusun', 3, 0, 2026, 16000, 25000, 5, 'Indonesia'],
  ['LKS Bahasa Indonesia SMK Kelas 10 Semester 1 Kurikulum Merdeka 2026/2027', 'Tim Penyusun', 3, 1, 2026, 16000, 25000, 5, 'Indonesia'],
  ['LKS Bahasa Inggris SMK Kelas 10 Semester 1 Kurikulum Merdeka 2026/2027', 'Tim Penyusun', 3, 2, 2026, 16000, 25000, 5, 'Indonesia'],
  ['LKS PPKn SMK Kelas 10 Semester 1 Kurikulum Merdeka 2026/2027', 'Tim Penyusun', 3, 3, 2026, 16000, 25000, 5, 'Indonesia'],
];

const DEMO_USERS = [
  { email: 'demo.owner@bookstore.test', password: 'DemoOwner123!', full_name: 'Demo Owner', role: 'OWNER' },
  { email: 'demo.admin@bookstore.test', password: 'DemoAdmin123!', full_name: 'Demo Admin', role: 'ADMIN' },
  { email: 'demo.cashier@bookstore.test', password: 'DemoCashier123!', full_name: 'Demo Kasir', role: 'CASHIER' },
];

const EXPENSE_CATEGORIES = ['RENT', 'ELECTRICITY', 'INTERNET', 'SALARY', 'TRANSPORTATION', 'OTHER'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function count(table) {
  const { count, error } = await admin.from(table).select('id', { count: 'exact', head: true });
  if (error) throw new Error(`count ${table}: ${error.message}`);
  return count ?? 0;
}

async function wipe() {
  console.log('--force: wiping demo data…');
  const order = [
    'payments', 'sale_items', 'sales', 'stock_movements', 'purchase_items',
    'purchases', 'book_images', 'books', 'expenses', 'audit_logs',
    'categories', 'publishers', 'suppliers',
  ];
  for (const t of order) {
    const { error } = await admin.from(t).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) throw new Error(`wipe ${t}: ${error.message}`);
  }
  console.log('wipe done.');
}

/** Cashier-side estimate of create_sale's server total, then a round tendered. */
function tenderedFor(items, discountCents, method) {
  const subtotal = items.reduce((s, it) => s + it.sellCents * it.qty, 0);
  const total = Math.max(0, subtotal - discountCents);
  if (method === 'CASH') return Math.ceil(total / 10_000) * 10_000; // round up to Rp 10k
  return total; // non-cash: exact amount
}

async function signIn(email, password) {
  const sb = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`signIn ${email}: ${error.message}`);
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function uniqueSlugFor(base, table) {
  const root = slugify(base);
  let candidate = root;
  let i = 2;
  for (;;) {
    const { data } = await admin.from(table).select('id').eq('slug', candidate).maybeSingle();
    if (!data) return candidate;
    candidate = `${root}-${i++}`;
  }
}

function makePng(w, h, rgb) {
  // Minimal valid PNG (single-color), zlib deflate of scanlines.
  const crcTable = [];
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcTable[n] = c >>> 0; }
  const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const row = Buffer.alloc(1 + w * 3);
  for (let x = 0; x < w; x++) { row[1 + x * 3] = rgb[0]; row[2 + x * 3] = rgb[1]; row[3 + x * 3] = rgb[2]; }
  const scanlines = Buffer.concat(Array.from({ length: h }, () => row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(scanlines)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

const existingBooks = await count('books');
if (force) {
  await wipe();
} else if (existingBooks > 0) {
  console.error(`books table already has ${existingBooks} rows. Run with --force to wipe and re-seed.`);
  process.exit(1);
}

const t0 = performance.now();

// ---- Users first (service role: auth user + profile role) -------------------
const userIds = {};
for (const u of DEMO_USERS) {
  const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const found = existing.users.find((x) => x.email === u.email);
  let id = found?.id;
  if (!found) {
    const { data, error } = await admin.auth.admin.createUser({ email: u.email, password: u.password, email_confirm: true, user_metadata: { full_name: u.full_name } });
    if (error) throw new Error(`createUser ${u.email}: ${error.message}`);
    id = data.user.id;
  }
  const { error: pe } = await admin.from('profiles').update({ role: u.role, full_name: u.full_name }).eq('id', id);
  if (pe) throw new Error(`profile ${u.email}: ${pe.message}`);
  userIds[u.role] = id;
}
console.log(`✓ users: ${DEMO_USERS.length} (${Object.values(userIds).length} profiles updated)`);

const sb = await signIn(DEMO_USERS[0].email, DEMO_USERS[0].password); // demo OWNER session
console.log('✓ signed in as', DEMO_USERS[0].email);

// ---- Categories / Publishers / Suppliers (session client, RLS-gated) --------
const catIds = {};
for (const name of CATEGORIES) {
  const slug = await uniqueSlugFor(name, 'categories');
  const { data, error } = await sb.from('categories').insert({ name, slug, description: `Kategori ${name}` }).select('id').single();
  if (error) throw new Error(`category ${name}: ${error.message}`);
  catIds[name] = data.id;
}
const pubIds = {};
for (const name of PUBLISHERS) {
  const slug = await uniqueSlugFor(name, 'publishers');
  const { data, error } = await sb.from('publishers').insert({ name, slug, country: 'Indonesia' }).select('id').single();
  if (error) throw new Error(`publisher ${name}: ${error.message}`);
  pubIds[name] = data.id;
}
const supIds = {};
for (const s of SUPPLIERS) {
  // suppliers has no slug column (only categories/publishers do).
  const { data, error } = await sb.from('suppliers').insert({ ...s }).select('id').single();
  if (error) throw new Error(`supplier ${s.name}: ${error.message}`);
  supIds[s.name] = data.id;
}
console.log(`✓ catalog: ${CATEGORIES.length} categories, ${PUBLISHERS.length} publishers, ${SUPPLIERS.length} suppliers`);

// ---- Books (session client) --------------------------------------------------
const bookRows = [];
for (const [title, author, ci, pi, year, buyRp, sellRp, minStock, lang] of BOOKS) {
  const slug = await uniqueSlugFor(title, 'books');
  const isbn = genIsbn13();
  const { data, error } = await sb
    .from('books')
    .insert({
      title, slug, author, isbn, category_id: catIds[CATEGORIES[ci]], publisher_id: pubIds[PUBLISHERS[pi]],
      publication_year: year, language: lang, purchase_price_cents: buyRp * 100, selling_price_cents: sellRp * 100,
      stock: 0, minimum_stock: minStock, status: 'ACTIVE', location: `Rak ${String((bookRows.length % 12) + 1).padStart(2, '0')}-${String((bookRows.length % 8) + 1).padStart(2, '0')}`,
    })
    .select('id,title')
    .single();
  if (error) throw new Error(`book ${title}: ${error.message}`);
  bookRows.push({ id: data.id, title, buyCents: buyRp * 100, sellCents: sellRp * 100 });
}
console.log(`✓ books: ${bookRows.length}`);

// ---- Covers (upload via session storage client + book_images) ----------------
const PALETTE = [
  [23, 132, 203], [15, 118, 110], [180, 83, 9], [109, 40, 217],
  [190, 18, 60], [13, 148, 136], [217, 119, 6], [79, 70, 229],
];
let covers = 0;
for (let i = 0; i < Math.min(10, bookRows.length); i++) {
  const book = bookRows[i];
  const png = makePng(600, 900, PALETTE[i % PALETTE.length]);
  const fileName = `${crypto.randomUUID()}.png`;
  const path = `books/${book.id}/${fileName}`;
  const { error: upErr } = await sb.storage.from('book-covers').upload(path, png, { contentType: 'image/png' });
  if (upErr) throw new Error(`cover upload ${book.title}: ${upErr.message}`);
  const { data: pub } = sb.storage.from('book-covers').getPublicUrl(path);
  const { error: imgErr } = await sb.from('book_images').insert({ book_id: book.id, storage_path: path, url: pub.publicUrl, is_primary: true, sort_order: 0 });
  if (imgErr) throw new Error(`book_images ${book.title}: ${imgErr.message}`);
  covers++;
}
console.log(`✓ covers: ${covers} uploaded + attached`);

// ---- Purchases: create -> ORDERED -> receive (stock in via RPC) --------------
const supplierNames = Object.keys(supIds);
const purchaseIds = [];
const purchaseDates = []; // daysAgo values, ascending
for (let p = 0; p < 6; p++) {
  const dAgo = 50 - p * 8 + rnd(3); // spread over ~last 55 days
  const supplier = pick(supplierNames);
  const itemCount = 4 + rnd(6);
  const chosen = [...bookRows].sort(() => Math.random() - 0.5).slice(0, itemCount);
  const items = chosen.map((b) => ({ book_id: b.id, quantity: 6 + rnd(20), unit_cost_cents: b.buyCents }));
  const discount = rnd(3) === 0 ? 50000 : 0;
  const shipping = rnd(3) === 0 ? 75000 : 0;
  const invoice = `PO-2026-${String(p + 1).padStart(3, '0')}-${rnd(1000)}`;
  const { data: pid, error } = await sb.rpc('create_purchase', {
    p_supplier_id: supIds[supplier], p_invoice_number: invoice,
    p_purchase_date: new Date(daysAgo(dAgo)).toISOString().slice(0, 10),
    p_items: items, p_discount_cents: discount, p_shipping_cents: shipping, p_tax_cents: 0, p_notes: `Pembelian ${supplier}`,
  });
  if (error) throw new Error(`create_purchase: ${error.message}`);
  const { error: stErr } = await sb.from('purchases').update({ status: 'ORDERED' }).eq('id', pid);
  if (stErr) throw new Error(`purchase ORDERED: ${stErr.message}`);
  const { error: rvErr } = await sb.rpc('receive_purchase', { p_purchase_id: pid });
  if (rvErr) throw new Error(`receive_purchase: ${rvErr.message}`);
  purchaseIds.push(pid);
  purchaseDates.push(dAgo);
}
console.log(`✓ purchases: ${purchaseIds.length} created+ordered+received`);

// ---- Backdate purchases + their stock movements (service role) ---------------
for (let i = 0; i < purchaseIds.length; i++) {
  const ts = new Date(daysAgo(purchaseDates[i], 9 + rnd(8), rnd(60))).toISOString();
  await admin.from('purchases').update({ created_at: ts }).eq('id', purchaseIds[i]);
  await admin.from('stock_movements').update({ created_at: ts }).eq('reference_id', purchaseIds[i]);
}

// ---- Sales: create_sale RPC, spread over last 30 days + today ----------------
// Only sell books that actually have stock, tracking it locally so we never
// attempt a sale the RPC would reject (INSUFFICIENT_STOCK).
const { data: stockedRows } = await admin.from('books').select('id, stock');
const stockLeft = new Map((stockedRows ?? []).map((r) => [r.id, r.stock]));
const pickStocked = () => bookRows.filter((b) => (stockLeft.get(b.id) ?? 0) > 0);

const saleIds = [];
const saleDays = [];
const makeSaleItems = (maxItems) => {
  const pool = pickStocked();
  const count = Math.min(maxItems, pool.length);
  const chosen = [...pool].sort(() => Math.random() - 0.5).slice(0, count);
  return chosen.map((b) => {
    const max = stockLeft.get(b.id) ?? 1;
    const qty = Math.min(1 + rnd(2), max);
    stockLeft.set(b.id, (stockLeft.get(b.id) ?? 0) - qty);
    return { book_id: b.id, sellCents: b.sellCents, qty };
  });
};

for (let d = 0; d < 30; d++) {
  const perDay = 2 + rnd(3);
  for (let k = 0; k < perDay; k++) {
    const items = makeSaleItems(1 + rnd(3));
    if (items.length === 0) continue; // no stock left
    const method = ['CASH', 'CASH', 'CASH', 'TRANSFER', 'MOBILE_MONEY', 'CARD'][rnd(6)];
    const discount = rnd(4) === 0 ? 5000 * (1 + rnd(3)) : 0;
    const tendered = tenderedFor(items, discount, method);
    const { data: sid, error } = await sb.rpc('create_sale', {
      p_items: items.map((i) => ({ book_id: i.book_id, quantity: i.qty })),
      p_payment_method: method, p_tendered_cents: tendered, p_discount_cents: discount, p_notes: null,
    });
    if (error) throw new Error(`create_sale day=${d}: ${error.message}`);
    saleIds.push(sid);
    saleDays.push(d);
  }
}
// today's sales (UTC) so "Pendapatan Hari Ini" is non-zero
for (let k = 0; k < 5; k++) {
  const items = makeSaleItems(1 + rnd(2));
  if (items.length === 0) continue;
  const tendered = tenderedFor(items, 0, 'CASH');
  const { data: sid, error } = await sb.rpc('create_sale', {
    p_items: items.map((i) => ({ book_id: i.book_id, quantity: i.qty })),
    p_payment_method: 'CASH', p_tendered_cents: tendered, p_discount_cents: 0, p_notes: null,
  });
  if (error) throw new Error(`create_sale today: ${error.message}`);
  saleIds.push(sid);
  saleDays.push(0);
}
console.log(`✓ sales: ${saleIds.length} created via create_sale`);

// ---- Backdate sales + movements (service role) -------------------------------
for (let i = 0; i < saleIds.length; i++) {
  const ts = new Date(daysAgo(saleDays[i], 8 + rnd(12), rnd(60))).toISOString();
  await admin.from('sales').update({ created_at: ts }).eq('id', saleIds[i]);
  await admin.from('stock_movements').update({ created_at: ts }).eq('reference_id', saleIds[i]);
}

// ---- Low / out of stock examples via adjust_inventory RPC ---------------------
// record_movement blocks negative stock, so drain by exactly the current stock.
async function drainTo(bookId, target, note) {
  const { data: row } = await admin.from('books').select('stock,minimum_stock').eq('id', bookId).single();
  const qty = row.stock - target;
  if (qty > 0) {
    const { error } = await sb.rpc('adjust_inventory', { p_book_id: bookId, p_quantity: -qty, p_movement_type: 'ADJUSTMENT_OUT', p_notes: note });
    if (error) throw new Error(`adjust ${bookId}: ${error.message}`);
  }
  return { before: row.stock, after: target, minimum: row.minimum_stock };
}
const outA = await drainTo(bookRows[0].id, 0, 'Demo: stok habis');
const outB = await drainTo(bookRows[15].id, 0, 'Demo: stok habis');
const lowA = await drainTo(bookRows[4].id, Math.max(0, 1), 'Demo: menipis');
const lowB = await drainTo(bookRows[20].id, Math.max(0, 1), 'Demo: menipis');
console.log('✓ inventory: out-of-stock', JSON.stringify(outA), JSON.stringify(outB), '· low-stock', JSON.stringify(lowA), JSON.stringify(lowB));

// ---- Expenses (session client, backdated) -------------------------------------
for (let i = 0; i < 12; i++) {
  const dAgo = rnd(28);
  const cat = EXPENSE_CATEGORIES[rnd(EXPENSE_CATEGORIES.length)];
  const amount = cat === 'RENT' ? 4_500_000 : cat === 'SALARY' ? 3_000_000 + rnd(3) * 250_000 : 100_000 + rnd(8) * 50_000;
  const { error } = await sb.from('expenses').insert({
    category: cat, amount_cents: amount * 100, expense_date: new Date(daysAgo(dAgo)).toISOString().slice(0, 10),
    description: `Pengeluaran ${cat.toLowerCase()}`, created_by: userIds.OWNER,
  });
  if (error) throw new Error(`expense: ${error.message}`);
}
console.log('✓ expenses: 12 seeded');

// ---- Audit trail (session client — insert policy is staff-open by design) ----
const auditSamples = [
  ['books.create', 'book', bookRows[0].id, { title: bookRows[0].title }],
  ['purchases.receive', 'purchase', purchaseIds[0], {}],
  ['sales.create', 'sale', saleIds[0], {}],
  ['inventory.adjust', 'book', bookRows[0].id, { notes: 'Demo' }],
  ['expenses.create', 'expense', 'expense', { amount_cents: 50000000 }],
];
for (const [action, type, id, meta] of auditSamples) {
  await sb.from('audit_logs').insert({ user_id: userIds.OWNER, action, entity_type: type, entity_id: id, metadata: meta });
}
console.log('✓ audit_logs: 5 sample entries');

// ---- Verify: read back key numbers --------------------------------------------
const { data: kpis } = await sb.rpc('dashboard_kpis', { p_from: new Date(daysAgo(30)).toISOString(), p_to: new Date(now + day).toISOString() });
const { data: stock } = await admin.from('books').select('stock').neq('id', '00000000-0000-0000-0000-000000000000');
const { count: salesCount } = await admin.from('sales').select('id', { count: 'exact', head: true });
const { count: movCount } = await admin.from('stock_movements').select('id', { count: 'exact', head: true });
console.log('---');
console.log(`seeded in ${((performance.now() - t0) / 1000).toFixed(1)}s`);
console.log(`KPIs (30d): revenue=Rp${(kpis.revenue_cents / 100).toLocaleString('id-ID')} · transactions=${kpis.transactions} · items=${kpis.items_sold} · profit=Rp${(kpis.profit_cents / 100).toLocaleString('id-ID')} · low=${kpis.low_stock_count} · out=${kpis.out_of_stock_count}`);
console.log(`stock total: ${(stock ?? []).reduce((s, b) => s + (b.stock ?? 0), 0)} units across ${stock?.length ?? 0} books`);
console.log(`sales rows: ${salesCount} · stock_movements: ${movCount}`);
