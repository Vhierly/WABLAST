export interface BlastEntry {
  id: string;
  phone: string;
  recipientName: string;
  itemName: string;
  receiptNumber: string;
  address: string;
  cod: string;
  dfod: string;
  status: 'pending' | 'sent' | 'failed';
  isReceived: boolean;
  createdAt: number;
}

export interface MessageTemplate {
  id: string;
  name: string;
  text: string;
  variations?: string[];
}

export const DEFAULT_TEMPLATES: MessageTemplate[] = [
  {
    id: 'retur',
    name: '⚠️ Konfirmasi Retur (Urgent)',
    text: "{salam} Kak {nama}, 📦\n\nKami dari J&T Cargo menginfokan paket resi: *{resi}* ({barang}) tujuan {alamat} mengalami kendala pengantaran.\n\n{if_cod}💰 Tagihan COD: *{cod}*\n{/if_cod}{if_dfod}💳 DFOD: *{dfod}*\n{/if_dfod}\nSudah ada percobaan delivery namun belum sukses. Mohon konfirmasinya apakah paket masih mau diambil atau di-retur (kembali ke pengirim) ya Kak? 🙏",
    variations: [
      "{salam} Kak {nama}, 📦\n\nKami dari J&T Cargo menginfokan paket resi: *{resi}* ({barang}) tujuan {alamat} mengalami kendala pengantaran.\n\n{if_cod}💰 Tagihan COD: *{cod}*\n{/if_cod}{if_dfod}💳 DFOD: *{dfod}*\n{/if_dfod}\nSudah ada percobaan delivery namun belum sukses. Mohon konfirmasinya apakah paket masih mau diambil atau di-retur (kembali ke pengirim) ya Kak? 🙏",
      "{salam} Kak {nama}, paket J&T Cargo resi *{resi}* ({barang}) ada kendala di alamat {alamat}. Mohon infonya Kak apakah paket mau diantar ulang atau retur? Terima kasih. 🙏",
      "Halo Kak {nama}, kurir kami menginfokan paket {resi} ({barang}) gagal antar ke {alamat}. Mohon konfirmasi segera ya Kak agar tidak otomatis retur ke pengirim. 🙏📦"
    ]
  },
  {
    id: 'delivery',
    name: '🚚 Proses Pengantaran',
    text: "{salam} Kak {nama}, 📦\n\nSaya {pengirim} dari J&T Cargo. Menginfokan paket Kakak dengan resi: *{resi}* ({barang}) tujuan {alamat} saat ini *SEDANG DALAM PROSES PENGANTARAN* oleh kurir kami.\n\n{if_cod}💰 Mohon siapkan dana COD: *{cod}*\n{/if_cod}{if_dfod}💳 Biaya DFOD: *{dfod}*\n{/if_dfod}\nMohon HP selalu aktif ya Kak agar kurir mudah menghubungi. Terima kasih! 😊",
    variations: [
      "{salam} Kak {nama}, 📦\n\nSaya {pengirim} dari J&T Cargo. Menginfokan paket Kakak dengan resi: *{resi}* ({barang}) tujuan {alamat} saat ini *SEDANG DALAM PROSES PENGANTARAN* oleh kurir kami.\n\n{if_cod}💰 Mohon siapkan dana COD: *{cod}*\n{/if_cod}{if_dfod}💳 Biaya DFOD: *{dfod}*\n{/if_dfod}\nMohon HP selalu aktif ya Kak agar kurir mudah menghubungi. Terima kasih! 😊",
      "Halo Kak {nama}, paket resi *{resi}* ({barang}) sedang dibawa kurir J&T Cargo ke alamat {alamat}. {if_cod}Siapkan dana COD Rp {cod} ya Kak.{/if_cod} Mohon ditunggu! 🚚",
      "{salam} Kak {nama}, kurir J&T Cargo sedang menuju lokasi Kakak untuk antar paket {resi}. Mohon standby HP ya Kak. Terima kasih! ✨"
    ]
  },
  {
    id: 'received',
    name: '✅ Konfirmasi Diterima',
    text: "{salam} Kak {nama}, 📦\n\nKami dari J&T Cargo ingin mengonfirmasi apakah paket dengan resi: *{resi}* ({barang}) tujuan {alamat} sudah diterima dengan baik?\n\n{if_cod}💰 Konfirmasi Pembayaran COD: *{cod}*\n{/if_cod}{if_dfod}💳 Konfirmasi Pembayaran DFOD: *{dfod}*\n{/if_dfod}\nTerima kasih telah menggunakan layanan J&T Cargo. Senang bisa melayani Anda! 🙏✨",
    variations: [
      "{salam} Kak {nama}, 📦\n\nKami dari J&T Cargo ingin mengonfirmasi apakah paket dengan resi: *{resi}* ({barang}) tujuan {alamat} sudah diterima dengan baik?\n\n{if_cod}💰 Konfirmasi Pembayaran COD: *{cod}*\n{/if_cod}{if_dfod}💳 Konfirmasi Pembayaran DFOD: *{dfod}*\n{/if_dfod}\nTerima kasih telah menggunakan layanan J&T Cargo. Senang bisa melayani Anda! 🙏✨",
      "Halo Kak {nama}, paket resi *{resi}* ({barang}) sudah berstatus diterima di sistem kami. Apakah benar sudah Kakak terima? Mohon konfirmasinya ya Kak. 🙏",
      "{salam} Kak {nama}, paket J&T Cargo resi {resi} sudah sampai ya? Semoga barangnya memuaskan! Terima kasih sudah berlangganan. 😊📦"
    ]
  },
  {
    id: 'failed_delivery',
    name: '📍 Gagal Kirim (Alamat/Kosong)',
    text: "{salam} Kak {nama}, 📦\n\nKurir J&T Cargo sedang di lokasi untuk antar paket resi: *{resi}* ({barang}) tujuan {alamat}, namun rumah terlihat kosong/alamat sulit ditemukan.\n\n{if_cod}💰 Tagihan COD: *{cod}*\n{/if_cod}{if_dfod}💳 DFOD: *{dfod}*\n{/if_dfod}\nMohon bantuannya untuk *Share Location* atau berikan patokan rumah yang jelas agar paket bisa segera sampai. Terima kasih! 🙏",
    variations: [
      "{salam} Kak {nama}, 📦\n\nKurir J&T Cargo sedang di lokasi untuk antar paket resi: *{resi}* ({barang}) tujuan {alamat}, namun rumah terlihat kosong/alamat sulit ditemukan.\n\n{if_cod}💰 Tagihan COD: *{cod}*\n{/if_cod}{if_dfod}💳 DFOD: *{dfod}*\n{/if_dfod}\nMohon bantuannya untuk *Share Location* atau berikan patokan rumah yang jelas agar paket bisa segera sampai. Terima kasih! 🙏",
      "Kak {nama}, kurir kami kesulitan cari alamat {alamat} untuk paket {resi}. Bisa minta Share Loc atau patokan rumahnya Kak? 📍",
      "Halo Kak {nama}, paket {resi} gagal antar karena rumah kosong. Bisa kami titipkan ke tetangga atau mau diantar jam berapa Kak? Mohon infonya. 🙏"
    ]
  },
  {
    id: 'cod_reminder',
    name: '💰 Pengingat Tagihan (COD/DFOD)',
    text: "{salam} Kak {nama}, 📦\n\nPaket J&T Cargo Kakak dengan resi: *{resi}* ({barang}) akan segera diantar hari ini.\n\n{if_cod}💰 Total COD yang harus dibayar: *{cod}*\n{/if_cod}{if_dfod}💳 Biaya DFOD: *{dfod}*\n{/if_dfod}\nMohon siapkan uang pas ya Kak agar proses serah terima lebih cepat. Terima kasih! 😊",
    variations: [
      "{salam} Kak {nama}, 📦\n\nPaket J&T Cargo Kakak dengan resi: *{resi}* ({barang}) akan segera diantar hari ini.\n\n{if_cod}💰 Total COD yang harus dibayar: *{cod}*\n{/if_cod}{if_dfod}💳 Biaya DFOD: *{dfod}*\n{/if_dfod}\nMohon siapkan uang pas ya Kak agar proses serah terima lebih cepat. Terima kasih! 😊",
      "Reminder COD Kak {nama}! Paket {resi} ({barang}) diantar hari ini. {if_cod}Total tagihan: Rp {cod}.{/if_cod} Mohon siapkan dananya ya Kak. 🙏",
      "Halo Kak {nama}, kurir J&T Cargo segera meluncur ke {alamat} bawa paket Kakak. {if_cod}Jangan lupa siapkan pembayaran COD Rp {cod} ya.{/if_cod} Terima kasih! 🚚💰"
    ]
  }
];

export interface AppSettings {
  delay: number; // in milliseconds
  autoCloseTab: boolean;
  senderName: string;
  manualMode: boolean;
  // Anti-spam settings
  randomizeDelay: boolean;
  maxDelay: number;
  batchSize: number;
  batchPause: number;
  useRandomGreetings: boolean;
  addRandomSuffix: boolean;
  useInvisibleChars: boolean;
  simulateTyping: boolean;
  adaptiveDelay: boolean;
  randomizeFormatting: boolean;
  rotateTemplates: boolean;
  randomizeEmojis: boolean;
  useGlobalSpintax: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  delay: 5000,
  autoCloseTab: false,
  senderName: 'Admin JNT',
  manualMode: false,
  randomizeDelay: true,
  maxDelay: 10000,
  batchSize: 10,
  batchPause: 30000,
  useRandomGreetings: true,
  addRandomSuffix: false,
  useInvisibleChars: true,
  simulateTyping: true,
  adaptiveDelay: true,
  randomizeFormatting: true,
  rotateTemplates: false,
  randomizeEmojis: true,
  useGlobalSpintax: true
};
