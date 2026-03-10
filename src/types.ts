export interface LogEntry {
  id: string;
  timestamp: number;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

export interface BlastEntry {
  id: string;
  phone: string;
  recipientName: string;
  itemName: string;
  receiptNumber: string;
  address: string;
  cod: string;
  dfod: string;
  status: 'pending' | 'sending' | 'sent' | 'failed';
  isReceived: boolean;
  createdAt: number;
  retryCount?: number;
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
    text: "{salam} Kak {nama}, paketnya ({barang}) ada kendala nih di alamat {alamat}. Kurir udah coba anter tapi rumah sepi/alamat kurang jelas. Sayang kalau otomatis balik ke pengirim, mau dianter ulang kapan ya Kak? 🙏",
    variations: [
      "{salam} Kak {nama}, paketnya ({barang}) ada kendala nih di alamat {alamat}. Kurir udah coba anter tapi rumah sepi/alamat kurang jelas. Sayang kalau otomatis balik ke pengirim, mau dianter ulang kapan ya Kak? 🙏",
      "Halo Kak {nama}, paket J&T Cargo resi *{resi}* ({barang}) ada masalah di alamat {alamat}. Kabari ya Kak mau dianter ulang atau gimana, biar gak keburu di-retur sama sistem. Makasih. 🙏",
      "Pagi/Siang Kak {nama}, kurir bilang paket {resi} ({barang}) gagal anter ke {alamat}. Mau nanya Kak, ini paketnya masih mau diambil atau gimana? Sayang ongkirnya kalau balik ke pengirim. 🙏📦"
    ]
  },
  {
    id: 'delivery',
    name: '🚚 Proses Pengantaran',
    text: "{salam} Kak {nama}, paket {barang} ({resi}) lagi dibawa kurir ya, otw ke {alamat}. {if_cod}Siapin dana COD-nya ya Kak Rp {cod}.{/if_cod} Ditunggu ya! 😊",
    variations: [
      "{salam} Kak {nama}, paket {barang} ({resi}) lagi dibawa kurir ya, otw ke {alamat}. {if_cod}Siapin dana COD-nya ya Kak Rp {cod}.{/if_cod} Ditunggu ya! 😊",
      "Halo Kak {nama}, saya kurir J&T Cargo mau anter paket {resi} ({barang}) ke {alamat}. {if_cod}Ada tagihan COD Rp {cod} ya Kak.{/if_cod} Mohon HP aktif ya biar gampang dihubungi. ✨",
      "Kak {nama}, paketnya lagi dijalan ya! Resi {resi} ({barang}). {if_cod}Siapin uang pas Rp {cod} ya Kak.{/if_cod} Ditunggu kurirnya sampai lokasi. Makasih! 😊🚚"
    ]
  },
  {
    id: 'received',
    name: '✅ Konfirmasi Diterima',
    text: "{salam} Kak {nama}, paket {barang} resi {resi} udah sampai belum ya? Di sistem keterangannya sudah diterima. Cuma mau mastiin aja udah aman di tangan Kakak. Makasih ya! ✨",
    variations: [
      "{salam} Kak {nama}, paket {barang} resi {resi} udah sampai belum ya? Di sistem keterangannya sudah diterima. Cuma mau mastiin aja udah aman di tangan Kakak. Makasih ya! ✨",
      "Halo Kak {nama}, paket resi *{resi}* ({barang}) sudah berstatus diterima di sistem kami. Apakah benar sudah Kakak terima? Mohon konfirmasinya ya Kak. 🙏",
      "Kak {nama}, paket J&T Cargo resi {resi} sudah diterima ya? Semoga barangnya cocok! Makasih banyak sudah langganan. 😊📦"
    ]
  },
  {
    id: 'failed_delivery',
    name: '📍 Gagal Kirim (Alamat/Kosong)',
    text: "{salam} Kak {nama}, kurir lagi di depan rumah/lokasi nih buat anter paket {resi}, tapi kok sepi ya? Bisa minta share loc atau patokan rumahnya Kak biar cepet ketemu? Makasih 🙏",
    variations: [
      "{salam} Kak {nama}, kurir lagi di depan rumah/lokasi nih buat anter paket {resi}, tapi kok sepi ya? Bisa minta share loc atau patokan rumahnya Kak biar cepet ketemu? Makasih 🙏",
      "Kak {nama}, kurir kami kesulitan cari alamat {alamat} buat paket {resi}. Boleh minta patokan rumah atau nomor yang bisa di-telpon Kak? 📍",
      "Halo Kak {nama}, paket {resi} gagal anter karena rumah kosong/tutup. Bisa kami titipkan ke tetangga atau mau diantar jam berapa Kak? Kabari ya. 🙏"
    ]
  },
  {
    id: 'cod_reminder',
    name: '💰 Pengingat Tagihan (COD/DFOD)',
    text: "{salam} Kak {nama}, paket {barang} mau dianter hari ini ya. {if_cod}Jangan lupa siapin uang pas Rp {cod} ya Kak biar kurirnya enak gak nyari kembalian. Hehe. Makasih! 🙏",
    variations: [
      "{salam} Kak {nama}, paket {barang} mau dianter hari ini ya. {if_cod}Jangan lupa siapin uang pas Rp {cod} ya Kak biar kurirnya enak gak nyari kembalian. Hehe. Makasih! 🙏",
      "Reminder COD Kak {nama}! Paket {resi} ({barang}) diantar hari ini. {if_cod}Tagihannya Rp {cod} ya.{/if_cod} Mohon standby di lokasi ya Kak. 🙏",
      "Halo Kak {nama}, kurir J&T Cargo segera meluncur ke {alamat} bawa paket Kakak. {if_cod}Siapin pembayaran COD Rp {cod} ya Kak.{/if_cod} Makasih! 🚚💰"
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
  speedMode: 'safe' | 'normal' | 'fast' | 'turbo' | 'custom';
  useRandomGreetings: boolean;
  addRandomSuffix: boolean;
  useInvisibleChars: boolean;
  simulateTyping: boolean;
  adaptiveDelay: boolean;
  randomizeFormatting: boolean;
  rotateTemplates: boolean;
  randomizeEmojis: boolean;
  useGlobalSpintax: boolean;
  autoSend: boolean;
  autoRetry: boolean;
  maxRetries: number;
  // New deep-dive anti-spam settings
  shuffleQueue: boolean;
  hourlyLimit: number;
  stopOnConsecutiveErrors: number;
  longBreakAfter: number; // messages
  longBreakDuration: number; // minutes
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
  speedMode: 'normal',
  useRandomGreetings: true,
  addRandomSuffix: true,
  useInvisibleChars: true,
  simulateTyping: true,
  adaptiveDelay: true,
  randomizeFormatting: true,
  rotateTemplates: true,
  randomizeEmojis: true,
  useGlobalSpintax: true,
  autoSend: true,
  autoRetry: true,
  maxRetries: 3,
  shuffleQueue: true,
  hourlyLimit: 50,
  stopOnConsecutiveErrors: 3,
  longBreakAfter: 25,
  longBreakDuration: 10
};
