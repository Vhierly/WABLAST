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
    name: '⚠️ Konfirmasi Kendala Alamat',
    text: "{salam} Kak {nama}, saya ingin menginformasikan status pengiriman paket Kakak.\n\n📦 *Detail Paket:*\nNo. Resi: {resi}\nBarang: {barang}\nAlamat: {alamat}\n\nSaat ini paket mengalami kendala pengantaran karena kurir tidak menemukan orang di lokasi atau alamat kurang jelas. Mohon konfirmasinya Kak agar paket tidak diproses pengembalian (retur) otomatis oleh sistem. Apakah ada jadwal atau instruksi pengantaran ulang? Terima kasih. 🙏",
    variations: [
      "{salam} Kak {nama}, paket dengan resi *{resi}* ({barang}) saat ini tertahan karena kendala di alamat tujuan ({alamat}).\n\n{if_cod}Mengingat paket ini memiliki tagihan COD sebesar *Rp {cod}*, mohon bantuannya untuk standby di lokasi.{/if_cod}{if_non_cod}Karena paket sudah lunas, Kakak bisa memberikan instruksi jika paket ingin dititipkan.{/if_non_cod}\n\nMohon kerjasamanya agar paket bisa segera diterima. Terima kasih. 🙏"
    ]
  },
  {
    id: 'delivery',
    name: '🚚 Informasi Pengiriman',
    text: "{salam} Kak {nama}, paket Kakak sedang dalam proses pengantaran hari ini.\n\n🚚 *Informasi Kurir:*\nResi: {resi}\nBarang: {barang}\nTujuan: {alamat}\n\n{if_cod}Mohon bantu siapkan dana tunai senilai *Rp {cod}* untuk pembayaran COD saat paket tiba ya Kak.{/if_cod}{if_non_cod}Status paket ini sudah lunas (Non-COD), jadi kurir akan langsung menyerahkan barang.{/if_non_cod}\n\nPastikan HP Kakak tetap aktif agar mudah dihubungi jika kurir sudah dekat. Terima kasih! 😊",
    variations: [
      "{salam} Kak {nama}, paket resi *{resi}* ({barang}) dijadwalkan tiba di alamat {alamat} hari ini.\n\n{if_cod}Mohon siapkan pembayaran tepat *Rp {cod}* untuk memudahkan transaksi.{/if_cod}{if_non_cod}Status: Sudah Terbayar.{/non_cod}\n\nMohon kesediaan Kakak untuk memantau kedatangan paket. Terima kasih atas pengertiannya. ✨"
    ]
  },
  {
    id: 'received',
    name: '✅ Konfirmasi Penerimaan',
    text: "{salam} Kak {nama}, saya ingin melakukan verifikasi status pengiriman.\n\n✅ *Data Kiriman:*\nResi: {resi}\nBarang: {barang}\n\nDi sistem kami, paket sudah berstatus diterima/terkirim. Hanya ingin memastikan kembali, apakah paket tersebut sudah Kakak terima dengan baik di alamat {alamat}? Mohon konfirmasinya ya Kak. Terima kasih banyak. ✨",
    variations: [
      "{salam} Kak {nama}, perihal resi *{resi}* ({barang}).\n\nKami melihat status paket sudah *Delivered*. Kami ingin memastikan apakah kiriman sudah aman di tangan Kakak? Jika sudah, semoga barangnya bermanfaat ya Kak. Terima kasih. 😊📦"
    ]
  },
  {
    id: 'failed_delivery',
    name: '📍 Lokasi Tidak Ditemukan / Sepi',
    text: "{salam} Kak {nama}, saat ini kurir sedang berada di wilayah {alamat} untuk antar paket {resi}.\n\nNamun kurir kesulitan menemukan titik rumah atau lokasi tampak sepi. {if_cod}Karena paket ini COD (Rp {cod}), kurir tidak bisa menitipkan barang tanpa pembayaran.{/if_cod} Boleh bantu share location atau patokan jelasnya Kak agar paket bisa segera sampai? Terima kasih. 🙏",
    variations: [
      "📍 *Panggilan Pengantaran*\n\n{salam} Kak {nama}, kurir sedang di depan lokasi antar paket {resi} ({barang}) tapi tidak ada respon. {if_cod}Mohon bantuannya Kak untuk dana COD Rp {cod} bisa dititipkan jika Kakak sedang tidak di tempat.{/if_cod} Kami tunggu infonya segera Kak agar paket tidak dibawa balik. 🙏"
    ]
  }
];

export interface AppSettings {
  delay: number;
  autoCloseTab: boolean;
  senderName: string;
  manualMode: boolean;
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
  shuffleQueue: boolean;
  hourlyLimit: number;
  stopOnConsecutiveErrors: number;
  longBreakAfter: number;
  longBreakDuration: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  delay: 8000,
  autoCloseTab: false,
  senderName: 'Admin',
  manualMode: false,
  randomizeDelay: true,
  maxDelay: 15000,
  batchSize: 10,
  batchPause: 40000,
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
  hourlyLimit: 45,
  stopOnConsecutiveErrors: 3,
  longBreakAfter: 20,
  longBreakDuration: 10
};
