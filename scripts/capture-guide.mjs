// Rekam screenshot asli aplikasi untuk halaman Panduan (video guide).
// Butuh: dev server berjalan (lihat .freebuff/run.md) + puppeteer-core + Chrome.
//   node scripts/capture-guide.mjs
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.GUIDE_BASE_URL ?? 'http://localhost:62526';
const OUT = path.resolve('public/guides');
const CHROME =
  process.env.CHROME_PATH ??
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EMAIL = process.env.GUIDE_EMAIL ?? 'demo.owner@bookstore.test';
const PASSWORD = process.env.GUIDE_PASSWORD ?? 'DemoOwner123!';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let browser;
let shotCount = 0;

async function shot(page, dir, name) {
  const d = path.join(OUT, dir);
  fs.mkdirSync(d, { recursive: true });
  const file = path.join(d, `${String(shotCount++).padStart(2, '0')}-${name}.jpg`);
  await page.screenshot({ path: file, type: 'jpeg', quality: 60 });
  console.log('  📷', path.relative(process.cwd(), file));
  await sleep(350);
}

async function waitForText(page, text, timeout = 30000) {
  await page.waitForFunction(
    (t) => document.body?.innerText?.includes(t),
    { timeout },
    text,
  );
}

/** Klik elemen yang mengandung teks (button/a/role). */
async function clickText(page, text, timeout = 15000) {
  await page.waitForFunction(
    (t) =>
      [...document.querySelectorAll('button,a,[role="button"]')].some(
        (el) => el.textContent?.trim().includes(t) && el.offsetParent !== null,
      ),
    { timeout },
    text,
  );
  const clicked = await page.evaluate((t) => {
    const els = [...document.querySelectorAll('button,a,[role="button"]')];
    const el = els.find((e) => e.textContent?.trim().includes(t) && e.offsetParent !== null);
    if (!el) return false;
    el.click();
    return true;
  }, text);
  if (!clicked) throw new Error(`clickText gagal: "${text}"`);
  await sleep(700);
}

async function typeInto(page, selector, value) {
  await page.waitForSelector(selector, { timeout: 15000 });
  await page.click(selector, { clickCount: 3 });
  await page.type(selector, value, { delay: 25 });
  await sleep(300);
}

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForSelector('#email', { timeout: 30000 });
  fs.mkdirSync(path.join(OUT, 'login'), { recursive: true });
  await page.screenshot({ path: path.join(OUT, 'login', '00-halaman-login.jpg'), type: 'jpeg', quality: 60 });
  console.log('  📷 login/00-halaman-login.jpg');
  await typeInto(page, '#email', EMAIL);
  await typeInto(page, '#password', PASSWORD);
  await clickText(page, 'Masuk');
  await page.waitForSelector('main', { timeout: 45000 });
  await waitForText(page, 'Dasbor', 30000).catch(() => {});
  await sleep(2500);
}

async function main() {
  console.log('Launching Chrome…');
  browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--window-size=1440,900'],
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(45000);

  await login(page);
  console.log('✅ Login OK');

  // ---- 1. Dasbor ----
  console.log('== dasbor ==');
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle2' });
  await waitForText(page, 'Pendapatan', 30000);
  await sleep(1500);
  await shot(page, 'dasbor', 'ringkasan-hari-ini');
  await shot(page, 'dasbor', 'grafik');

  // ---- 2. Stok: cara ubah stok ----
  console.log('== stok ==');
  await page.goto(`${BASE}/inventory`, { waitUntil: 'networkidle2' });
  await waitForText(page, 'Stok', 30000);
  await sleep(1500);
  await shot(page, 'stok', 'daftar-stok');
  await clickText(page, 'Ubah stok');
  await page.waitForSelector('[role="dialog"]', { timeout: 15000 });
  await waitForText(page, 'Set stok ke', 10000).catch(() => {});
  await sleep(800);
  await shot(page, 'stok', 'modal-ubah-stok');
  // isi target 10
  const targetInput = await page.$('#adj-target, input[inputmode="numeric"], input[type="number"]');
  if (targetInput) {
    await page.evaluate(() => {
      const el = document.querySelector('#adj-target') ?? document.querySelector('[role="dialog"] input[type="number"]');
      if (el) {
        el.focus();
        el.value = '';
      }
    });
    await targetInput.type('10', { delay: 40 });
    await sleep(600);
    await shot(page, 'stok', 'modal-target-10');
  }
  await page.keyboard.press('Escape');
  await sleep(600);

  // ---- 3. POS ----
  console.log('== pos ==');
  await page.goto(`${BASE}/pos`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('input[placeholder*="Scan barcode"]', { timeout: 30000 });
  await sleep(1200);
  await shot(page, 'pos', 'pos-kosong');
  await typeInto(page, 'input[placeholder*="Scan barcode"]', 'Bahasa Inggris Kelas 7');
  await waitForText(page, 'Stok:', 15000);
  await sleep(800);
  await shot(page, 'pos', 'hasil-pencarian');
  // tambah item pertama yang stok > 0
  const added = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter(
      (b) => b.textContent?.includes('Stok:') && !b.disabled && b.offsetParent !== null,
    );
    if (!btns.length) return false;
    btns[0].click();
    return true;
  });
  if (!added) throw new Error('POS: tidak ada buku berstok');
  await waitForText(page, 'Keranjang (1 item)', 10000);
  await sleep(700);
  await shot(page, 'pos', 'item-di-keranjang');
  // qty jadi 2
  await page.evaluate(() => {
    const plus = document.querySelector('button[aria-label="Tambah"]');
    if (plus) plus.click();
  });
  await sleep(600);
  await shot(page, 'pos', 'qty-2');
  await clickText(page, 'Bayar — ');
  await page.waitForSelector('[role="dialog"]', { timeout: 15000 });
  await sleep(800);
  await shot(page, 'pos', 'modal-pembayaran');
  await clickText(page, '50 rb');
  await sleep(600);
  await shot(page, 'pos', 'kembalian');
  // klik Bayar pada footer modal
  const payBtn = await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
    const btns = [...(dialog?.querySelectorAll('button') ?? [])];
    const b = btns.find((x) => x.textContent?.includes('Bayar'));
    if (!b) return false;
    b.click();
    return true;
  });
  if (!payBtn) throw new Error('POS: tombol Bayar modal tidak ditemukan');
  await waitForText(page, 'INV-', 30000);
  await sleep(1500);
  await shot(page, 'pos', 'struk');
  // tutup struk
  await clickText(page, 'Selesai', 10000).catch(() => {});
  await page.keyboard.press('Escape');
  await sleep(500);

  // ---- 4. Buku ----
  console.log('== buku ==');
  await page.goto(`${BASE}/books`, { waitUntil: 'networkidle2' });
  await waitForText(page, 'Buku', 30000);
  await sleep(1500);
  await shot(page, 'buku', 'daftar-buku');
  await page.evaluate(() => {
    const a = document.querySelector('main a[href^="/books/"]');
    if (a) a.click();
  });
  await waitForText(page, 'Stok', 30000).catch(() => {});
  await sleep(1500);
  await shot(page, 'buku', 'detail-buku');

  // ---- 5. Pembelian ----
  console.log('== pembelian ==');
  await page.goto(`${BASE}/purchases`, { waitUntil: 'networkidle2' });
  await waitForText(page, 'Pembelian', 30000);
  await sleep(1500);
  await shot(page, 'pembelian', 'daftar-pembelian');
  await clickText(page, 'Pembelian baru');
  await page.waitForSelector('[role="dialog"]', { timeout: 15000 });
  await sleep(800);
  await shot(page, 'pembelian', 'modal-pembelian-baru');
  await page.keyboard.press('Escape');
  await sleep(500);

  // ---- 6. Penjualan ----
  console.log('== penjualan ==');
  await page.goto(`${BASE}/sales`, { waitUntil: 'networkidle2' });
  await waitForText(page, 'Penjualan', 30000);
  await sleep(1500);
  await shot(page, 'penjualan', 'daftar-penjualan');

  // ---- 7. Laporan ----
  console.log('== laporan ==');
  await page.goto(`${BASE}/reports`, { waitUntil: 'networkidle2' });
  await waitForText(page, 'Laporan', 30000);
  await sleep(2000);
  await shot(page, 'laporan', 'laporan-utama');

  // ---- 8. Pengeluaran ----
  console.log('== pengeluaran ==');
  await page.goto(`${BASE}/expenses`, { waitUntil: 'networkidle2' });
  await waitForText(page, 'Pengeluaran', 30000);
  await sleep(1500);
  await shot(page, 'pengeluaran', 'daftar-pengeluaran');
  await clickText(page, 'Catat pengeluaran');
  await page.waitForSelector('[role="dialog"]', { timeout: 15000 });
  await sleep(800);
  await shot(page, 'pengeluaran', 'modal-tambah');
  await page.keyboard.press('Escape');
  await sleep(500);

  // ---- 9. Pengguna ----
  console.log('== pengguna ==');
  await page.goto(`${BASE}/users`, { waitUntil: 'networkidle2' });
  await waitForText(page, 'Pengguna', 30000);
  await sleep(1500);
  await shot(page, 'pengguna', 'daftar-pengguna');
  await clickText(page, 'Undang pengguna');
  await page.waitForSelector('[role="dialog"]', { timeout: 15000 });
  await sleep(800);
  await shot(page, 'pengguna', 'modal-undang');
  await page.keyboard.press('Escape');
  await sleep(500);

  // ---- 10. Mobile ----
  console.log('== mobile ==');
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.goto(`${BASE}/books`, { waitUntil: 'networkidle2' });
  await sleep(2000);
  await shot(page, 'mobile', 'buku-list');
  // buka menu bottom sheet
  await clickText(page, 'Menu');
  await page.waitForSelector('[role="dialog"]', { timeout: 15000 });
  await sleep(800);
  await shot(page, 'mobile', 'menu-sheet');
  await page.keyboard.press('Escape');
  await sleep(500);
  await page.goto(`${BASE}/pos`, { waitUntil: 'networkidle2' });
  await sleep(2000);
  await shot(page, 'mobile', 'pos');

  console.log(`\n✅ Selesai — ${shotCount} screenshot di public/guides/`);
  await browser.close();
}

main().catch(async (e) => {
  console.error('❌ Gagal:', e.message);
  if (browser) await browser.close().catch(() => {});
  process.exit(1);
});
