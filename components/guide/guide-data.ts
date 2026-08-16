/**
 * Data halaman Panduan — screenshot direkam dari aplikasi sungguhan
 * (lihat scripts/capture-guide.mjs) lalu diputar seperti video.
 */

export interface GuideStep {
  /** Path di /public (cth. /guides/pos/01-pos-kosong.jpg). */
  image?: string;
  title: string;
  desc?: string;
  /** Tindakan yang dilakukan pada langkah ini (pill). */
  action?: string;
}

export interface Guide {
  id: string;
  title: string;
  short: string;
  steps: GuideStep[];
}

export const GUIDES: Guide[] = [
  {
    id: 'stok',
    title: 'Stok & ubah stok',
    short: 'Cara melihat stok dan mengubah jumlahnya',
    steps: [
      {
        image: '/guides/stok/01-daftar-stok.jpg',
        title: 'Buka menu Stok',
        desc: 'Semua buku tampil dengan stok terkini, harga, dan lokasi. Buku dengan stok rendah diberi tanda.',
        action: 'Menu → Stok',
      },
      {
        image: '/guides/stok/02-modal-ubah-stok.jpg',
        title: 'Klik "Ubah stok" pada buku',
        desc: 'Tombol ada di tiap baris/kartu buku (halaman Stok, Buku, dan detail buku). Kasir tidak melihat tombol ini.',
        action: 'Klik tombol Ubah stok',
      },
      {
        image: '/guides/stok/03-modal-target-10.jpg',
        title: 'Set stok ke angka target',
        desc: 'Pilih "Set stok ke", ketik stok akhir yang diinginkan (cth. 10). Selisih dihitung otomatis: 0 → 10 (+10).',
        action: 'Ketik 10 → Simpan',
      },
    ],
  },
  {
    id: 'pos',
    title: 'POS — transaksi kasir',
    short: 'Cari buku, tambah ke keranjang, bayar, dan cetak struk',
    steps: [
      {
        image: '/guides/pos/01-pos-kosong.jpg',
        title: 'Buka menu POS',
        desc: 'Kolom pencarian siap dipakai — cocok untuk scanner barcode USB (input keyboard otomatis).',
        action: 'Menu → POS',
      },
      {
        image: '/guides/pos/02-hasil-pencarian.jpg',
        title: 'Cari buku',
        desc: 'Ketik judul, ISBN, atau pengarang. Hasil muncul seketika dengan harga dan stok.',
        action: 'Ketik judul / scan barcode',
      },
      {
        image: '/guides/pos/03-item-di-keranjang.jpg',
        title: 'Klik buku untuk menambah',
        desc: 'Buku masuk ke keranjang. Klik lagi untuk menambah qty, atau pakai tombol + / −.',
        action: 'Klik kartu buku',
      },
      {
        image: '/guides/pos/04-qty-2.jpg',
        title: 'Atur jumlah',
        desc: 'Gunakan tombol + dan − untuk mengubah jumlah. Sistem mencegah jual melebihi stok.',
        action: 'Tombol + / −',
      },
      {
        image: '/guides/pos/05-modal-pembayaran.jpg',
        title: 'Klik Bayar',
        desc: 'Pilih metode: Tunai, Kartu, Transfer, atau E-Wallet. Diskon bisa ditambahkan di sini.',
        action: 'Klik Bayar',
      },
      {
        image: '/guides/pos/06-kembalian.jpg',
        title: 'Masukkan nominal uang',
        desc: 'Tombol cepat 10 rb / 50 rb / 100 rb, atau ketik manual. Kembalian dihitung otomatis.',
        action: 'Klik 50 rb',
      },
      {
        image: '/guides/pos/07-struk.jpg',
        title: 'Transaksi selesai',
        desc: 'Struk muncul siap cetak (58/80 mm) atau simpan PDF. Stok berkurang otomatis dan tercatat.',
        action: 'Cetak / Selesai',
      },
    ],
  },
  {
    id: 'buku',
    title: 'Buku — katalog',
    short: 'Lihat daftar buku, cover, dan detail lengkap',
    steps: [
      {
        image: '/guides/buku/01-daftar-buku.jpg',
        title: 'Buka menu Buku',
        desc: 'Daftar buku dengan cover, kategori, harga jual, dan stok. Filter & pencarian di atas.',
        action: 'Menu → Buku',
      },
      {
        image: '/guides/buku/02-detail-buku.jpg',
        title: 'Klik judul buku',
        desc: 'Detail lengkap: cover, ISBN, penerbit, harga beli/jual, lokasi rak, stok — plus tombol Ubah stok.',
        action: 'Klik judul buku',
      },
    ],
  },
  {
    id: 'pembelian',
    title: 'Pembelian — stok masuk',
    short: 'Buat pembelian lalu terima barang agar stok bertambah',
    steps: [
      {
        image: '/guides/pembelian/01-daftar-pembelian.jpg',
        title: 'Buka menu Pembelian',
        desc: 'Semua pembelian tampil dengan status: DRAFT → ORDERED → RECEIVED → COMPLETED.',
        action: 'Menu → Pembelian',
      },
      {
        image: '/guides/pembelian/02-modal-pembelian-baru.jpg',
        title: 'Klik "Pembelian baru"',
        desc: 'Pilih pemasok, isi nomor faktur, dan tambahkan item buku. Stok BELUM berubah sampai barang diterima.',
        action: 'Klik Pembelian baru',
      },
    ],
  },
  {
    id: 'penjualan',
    title: 'Penjualan — riwayat',
    short: 'Lihat transaksi, struk ulang, void, dan refund',
    steps: [
      {
        image: '/guides/penjualan/01-daftar-penjualan.jpg',
        title: 'Buka menu Penjualan',
        desc: 'Riwayat transaksi dengan nomor faktur, kasir, total, dan status. Kasir hanya melihat transaksinya sendiri.',
        action: 'Menu → Penjualan',
      },
    ],
  },
  {
    id: 'laporan',
    title: 'Laporan',
    short: 'Penjualan, laba, stok, dan buku terlaris — export PDF/CSV',
    steps: [
      {
        image: '/guides/laporan/01-laporan-utama.jpg',
        title: 'Buka menu Laporan',
        desc: 'Pilih jenis laporan dan rentang tanggal. Semua dihitung di database, bukan di browser.',
        action: 'Menu → Laporan',
      },
    ],
  },
  {
    id: 'pengeluaran',
    title: 'Pengeluaran',
    short: 'Catat sewa, listrik, gaji, dan biaya lainnya',
    steps: [
      {
        image: '/guides/pengeluaran/01-daftar-pengeluaran.jpg',
        title: 'Buka menu Pengeluaran',
        desc: 'Total pengeluaran bulan ini tampil di atas daftar.',
        action: 'Menu → Pengeluaran',
      },
      {
        image: '/guides/pengeluaran/02-modal-tambah.jpg',
        title: 'Klik "Catat pengeluaran"',
        desc: 'Pilih kategori (Sewa, Listrik, Internet, Gaji…), isi jumlah, tanggal, dan deskripsi.',
        action: 'Klik Catat pengeluaran',
      },
    ],
  },
  {
    id: 'pengguna',
    title: 'Pengguna & peran',
    short: 'Kelola staf: Pemilik, Admin, Kasir',
    steps: [
      {
        image: '/guides/pengguna/01-daftar-pengguna.jpg',
        title: 'Buka menu Pengguna',
        desc: 'Daftar staf dengan peran: Pemilik (semua akses), Admin (inventori & pembelian), Kasir (POS & penjualan).',
        action: 'Menu → Pengguna',
      },
      {
        image: '/guides/pengguna/02-modal-undang.jpg',
        title: 'Klik "Undang pengguna"',
        desc: 'Isi nama, email, dan peran. Pengguna dapat mengatur kata sandinya sendiri.',
        action: 'Klik Undang pengguna',
      },
    ],
  },
  {
    id: 'dasbor',
    title: 'Dasbor',
    short: 'Ringkasan hari ini: pendapatan, profit, stok menipis',
    steps: [
      {
        image: '/guides/dasbor/01-ringkasan-hari-ini.jpg',
        title: 'Pantau toko dari Dasbor',
        desc: 'Pendapatan hari ini, transaksi, item terjual, profit, stok menipis, dan stok habis.',
        action: 'Menu → Dasbor',
      },
      {
        image: '/guides/dasbor/02-grafik.jpg',
        title: 'Grafik penjualan',
        desc: 'Penjualan per waktu, buku terlaris, dan penjualan per kategori.',
      },
    ],
  },
  {
    id: 'login',
    title: 'Masuk',
    short: 'Login dengan akun staf',
    steps: [
      {
        image: '/guides/login/01-halaman-login.jpg',
        title: 'Masuk ke sistem',
        desc: 'Gunakan email dan kata sandi yang dibuat oleh Pemilik. Akses menyesuaikan peran.',
        action: 'Isi email & sandi → Masuk',
      },
    ],
  },
  {
    id: 'mobile',
    title: 'Mode HP (mobile)',
    short: 'Navigasi bawah, menu dari bawah, dan POS di layar kecil',
    steps: [
      {
        image: '/guides/mobile/01-buku-list.jpg',
        title: 'Tampilan kartu di HP',
        desc: 'Tabel berubah jadi kartu di layar kecil — mudah dipindai dengan jempol.',
        action: 'Buka di HP',
      },
      {
        image: '/guides/mobile/02-menu-sheet.jpg',
        title: 'Menu lengkap dari bawah',
        desc: 'Tombol "Menu" membuka sheet berisi semua halaman + profil pengguna.',
        action: 'Ketuk Menu',
      },
      {
        image: '/guides/mobile/03-pos.jpg',
        title: 'POS di HP',
        desc: 'Tombol POS besar di tengah navigasi bawah. Keranjang menempel di bawah layar.',
        action: 'Ketuk POS',
      },
    ],
  },
];
