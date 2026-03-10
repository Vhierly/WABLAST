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
    name: '⚠️ Konfirmasi Retur',
    text: "{salam} Kak {nama}, paket J&T Cargo ({barang}) dengan resi {resi} terkendala saat pengantaran ke {alamat}. Kurir menginfokan alamat kosong/tutup. Mohon konfirmasinya apakah paket ini ingin diantar ulang? Sayang lho Kak kalau sampai diretur ke pengirim. 🙏",
    variations: [
      "{salam} Kak {nama}, paket J&T Cargo ({barang}) resi {resi} mengalami kendala saat pengantaran ke {alamat}. Kurir menginfokan alamat kosong/tutup. Mohon konfirmasinya apakah paket ini ingin diantar ulang? Sayang lho Kak kalau sampai diretur ke pengirim. 🙏",
      "{salam} Kak {nama}, saya admin J&T Cargo. Paket Kakak ({barang}) resi {resi} belum bisa terkirim ke {alamat} karena rumah sepi. Agar tidak otomatis diretur oleh sistem, mohon infokan kapan kurir kami bisa antar ulang ya Kak. Terima kasih. ✨",
      "Halo Kak {nama}, menginfokan bahwa paket {resi} berisi {barang} gagal diantar hari ini (keterangan: rumah kosong). Boleh dibantu share lokasi atau patokan rumahnya Kak? Biar besok bisa langsung diproses antar ulang. 📦🙏"
    ]
  },
  {
    id: 'delivery',
    name: '🚚 Proses Pengantaran',
    text: "{salam} Kak {nama}, paket J&T Cargo ({barang}) dengan resi {resi} sedang dibawa kurir menuju alamat {alamat}. {if_cod}Mohon siapkan uang COD sebesar {cod} ya Kak.{/if_cod} {if_dfod}Mohon siapkan biaya ongkir (DFOD) sebesar {dfod} ya Kak.{/if_dfod} Ditunggu kedatangannya! 😊🚚",
    variations: [
      "{salam} Kak {nama}, paket J&T Cargo ({barang}) dengan resi {resi} sedang dibawa kurir menuju alamat {alamat}. {if_cod}Mohon siapkan uang COD sebesar {cod} ya Kak.{/if_cod} {if_dfod}Mohon siapkan biaya ongkir (DFOD) sebesar {dfod} ya Kak.{/if_dfod} Ditunggu kedatangannya! 😊🚚",
      "Halo Kak {nama}! Paket {resi} ({barang}) sudah masuk jadwal pengantaran hari ini ke {alamat}. {if_cod}Ada tagihan COD sejumlah {cod}.{/if_cod} {if_dfod}Ada tagihan ongkir DFOD sejumlah {dfod}.{/if_dfod} Mohon pastikan ada penerima di lokasi ya Kak. ✨",
      "{salam} Kak {nama}, kurir J&T Cargo sedang menuju lokasi Kakak di {alamat} untuk mengantar paket {barang}. {if_cod}Untuk pembayaran COD {cod}, mohon disiapkan uang pas jika memungkinkan ya Kak.{/if_cod} {if_dfod}Untuk tagihan bayar di tujuan (DFOD) adalah {dfod}.{/if_dfod} Terima kasih banyak! 🙏"
    ]
  },
  {
    id: 'received',
    name: '✅ Konfirmasi Diterima',
    text: "{salam} Kak {nama}, paket {barang} dengan resi {resi} di sistem kami statusnya sudah diterima. Hanya ingin memastikan, apakah paketnya sudah benar-benar Kakak terima dalam kondisi aman? Terima kasih! ✨",
    variations: [
      "{salam} Kak {nama}, paket {barang} dengan resi {resi} di sistem kami statusnya sudah diterima. Hanya ingin memastikan, apakah paketnya sudah benar-benar Kakak terima dalam kondisi aman? Terima kasih! ✨",
      "Halo Kak {nama}, menurut laporan kurir, paket resi *{resi}* ({barang}) sudah diserahkan ke alamat Kakak. Apakah benar sudah diterima? Mohon bantu konfirmasinya ya Kak. 🙏📦",
      "{salam} Kak {nama}, paket J&T Cargo resi {resi} sudah update status diterima ya. Semoga barangnya ({barang}) sesuai pesanan! Terima kasih banyak sudah mempercayakan pengiriman kepada kami. 😊"
    ]
  },
  {
    id: 'failed_delivery',
    name: '📍 Gagal Kirim (Susah Dicari)',
    text: "{salam} Kak {nama}, kurir kami sedang di area {alamat} untuk mengantar paket {resi}, namun kesulitan menemukan titik lokasi yang pas. Boleh minta tolong share location atau patokan rumahnya Kak? 🙏",
    variations: [
      "{salam} Kak {nama}, kurir kami sedang di area {alamat} untuk mengantar paket {resi}, namun kesulitan menemukan titik lokasi yang pas. Boleh minta tolong share location atau patokan rumahnya Kak? 🙏",
      "Kak {nama}, kurir J&T Cargo menginfokan kesulitan mencari alamat untuk pengiriman paket {resi} ({barang}). Agar bisa segera diantar, mohon info patokan terdekat dari rumah Kakak ya. Terima kasih. 📍",
      "Halo Kak {nama}, paket {resi} gagal terkirim karena alamat kurang jelas atau titik lokasi tidak ditemukan. Agar besok bisa diantar dengan lancar, bisa tolong kirimkan patokan rumahnya Kak? 🙏"
    ]
  },
  {
    id: 'cod_reminder',
    name: '💰 Pengingat Tagihan',
    text: "{salam} Kak {nama}, paket {barang} akan segera tiba di lokasi. {if_cod}Sekadar mengingatkan, terdapat tagihan COD sebesar {cod}.{/if_cod} {if_dfod}Terdapat tagihan ongkir DFOD sebesar {dfod}.{/if_dfod} Agar proses serah terima lebih cepat, mohon disiapkan ya Kak. Terima kasih! 💰",
    variations: [
      "{salam} Kak {nama}, paket {barang} akan segera tiba di lokasi. {if_cod}Sekadar mengingatkan, terdapat tagihan COD sebesar {cod}.{/if_cod} {if_dfod}Terdapat tagihan ongkir DFOD sebesar {dfod}.{/if_dfod} Agar proses serah terima lebih cepat, mohon disiapkan uangnya ya Kak. Terima kasih! 💰",
      "Reminder pengiriman Kak {nama}! Paket J&T Cargo resi {resi} diantar hari ini. {if_cod}Total COD yang harus dibayarkan: {cod}.{/if_cod} {if_dfod}Total biaya pengiriman DFOD: {dfod}.{/if_dfod} Mohon standby di lokasi atau titipkan pesan ke orang rumah ya Kak. 🙏",
      "{salam} Kak {nama}, kurir kami segera mengantarkan paket {barang} ke {alamat}. {if_cod}Jangan lupa siapkan pembayaran COD {cod} ya Kak.{/if_cod} {if_dfod}Mohon siapkan pembayaran ongkir di tempat (DFOD) sebesar {dfod}.{/if_dfod} Sehat selalu Kak! 🚚✨"
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
  senderName: 'Admin J&T Cargo',
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
