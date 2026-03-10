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
    text: "{salam} Kak {nama}, kami dari J&T Cargo ingin menginformasikan paket Kakak ({barang}) terkendala di alamat {alamat}. Kurir sudah mencoba antar namun lokasi kosong. Sayang kalau paketnya otomatis balik ke pengirim, kira-kira bisa diantar ulang kapan ya Kak? 🙏",
    variations: [
      "{salam} Kak {nama}, paket {barang} ada kendala pengiriman di {alamat}. Mohon konfirmasinya Kak agar bisa kami jadwalkan antar ulang segera dan paket tidak keburu di-retur oleh sistem. Terima kasih. 🙏",
      "Halo Kak {nama}, informasi dari J&T Cargo untuk resi *{resi}* ({barang}). Saat ini paket Kakak tertahan di gudang karena alamat {alamat} tidak ada orang. Mohon infonya Kak mau diantar ulang kapan atau mau diambil sendiri? 🙏",
      "Selamat {salam} Kak {nama}, paket J&T Cargo resi {resi} ({barang}) tujuan {alamat} gagal antar. Boleh bantu info nomor yang bisa dihubungi atau patokan rumahnya Kak? Biar kurir kami coba antar ulang besok. 🙏📦"
    ]
  },
  {
    id: 'delivery',
    name: '🚚 Proses Pengantaran',
    text: "{salam} Kak {nama}, paket J&T Cargo {barang} ({resi}) sedang dalam pengantaran kurir ke alamat {alamat}. {if_cod}Mohon dibantu siapkan dana COD senilai Rp {cod} ya Kak.{/if_cod} Ditunggu paketnya! 😊",
    variations: [
      "{salam} Kak {nama}, kurir kami sedang menuju lokasi {alamat} untuk antar paket {barang} ({resi}). {if_cod}Ada tagihan COD Rp {cod} ya Kak.{/if_cod} Mohon HP selalu aktif agar mudah dihubungi kurir. ✨",
      "Halo Kak {nama}, paket resi {resi} ({barang}) sudah dijadwalkan antar hari ini ke {alamat}. {if_cod}Siapkan uang pas Rp {cod} ya Kak untuk pembayarannya.{/if_cod} Terima kasih banyak. 😊🚚",
      "Kak {nama}, paket J&T Cargo Kakak lagi dijalan ya! Resi {resi} ({barang}). {if_cod}Mohon bantu siapkan dana COD Rp {cod} ya Kak.{/if_cod} Sampai ketemu di lokasi. Makasih! 😊"
    ]
  },
  {
    id: 'received',
    name: '✅ Konfirmasi Diterima',
    text: "{salam} Kak {nama}, paket {barang} resi {resi} sudah diterima ya? Di sistem kami statusnya sudah terkirim. Hanya ingin memastikan paket sudah aman di tangan Kakak. Terima kasih! ✨",
    variations: [
      "{salam} Kak {nama}, paket J&T Cargo resi *{resi}* ({barang}) statusnya sudah diterima di sistem. Apakah benar sudah Kakak terima? Mohon konfirmasinya ya Kak untuk kelengkapan data kami. 🙏",
      "Kak {nama}, kiriman resi {resi} ({barang}) sudah sampai ya? Semoga isinya sesuai dan tidak ada kendala. Terima kasih sudah menggunakan J&T Cargo! 😊📦",
      "Selamat {salam} Kak {nama}, cuma mau cek apakah paket {resi} sudah diterima dengan baik? Kalau sudah aman, mohon bantuannya untuk konfirmasi ya Kak. Terima kasih. ✨"
    ]
  },
  {
    id: 'failed_delivery',
    name: '📍 Gagal Kirim (Alamat/Kosong)',
    text: "{salam} Kak {nama}, kurir J&T Cargo sedang di alamat {alamat} mau antar paket {resi}, tapi lokasi sepi/tutup. Boleh minta share loc atau patokan rumahnya Kak biar paket bisa langsung dititipkan? 🙏",
    variations: [
      "{salam} Kak {nama}, paket resi {resi} gagal antar karena rumah kosong. Apakah paketnya boleh dititipkan ke tetangga atau mau diantar jam berapa Kak? Mohon kabari kurir kami ya. 🙏",
      "Kak {nama}, kurir kami kesulitan cari alamat {alamat} untuk paket {resi}. Boleh minta petunjuk jalan atau nomor yang bisa di-telpon Kak? Biar paketnya cepat sampai. 📍",
      "Halo Kak {nama}, paket {resi} gagal kami kirim karena alamat kurang jelas/rumah kosong. Mohon bantuan konfirmasi alamat atau patokan detailnya Kak untuk antar ulang besok. 🙏"
    ]
  },
  {
    id: 'cod_reminder',
    name: '💰 Pengingat Tagihan (COD/DFOD)',
    text: "{salam} Kak {nama}, paket {barang} mau diantar hari ini ya. {if_cod}Mohon bantu siapkan uang pas Rp {cod} untuk pembayaran COD-nya ya Kak biar prosesnya cepat. Terima kasih! 🙏",
    variations: [
      "Reminder COD: Kak {nama}, paket resi {resi} ({barang}) akan dikirim hari ini. {if_cod}Tagihannya Rp {cod} ya Kak.{/if_cod} Mohon standby di lokasi atau bisa dititipkan dananya ke orang rumah. 🙏",
      "{salam} Kak {nama}, kurir J&T Cargo segera meluncur ke {alamat} bawa paket Kakak. {if_cod}Siapkan dana COD/DFOD Rp {cod} ya Kak.{/if_cod} Terima kasih banyak! 🚚💰",
      "Selamat {salam} Kak {nama}, paket {barang} sedang diproses kurir untuk antar hari ini ke {alamat}. {if_cod}Jangan lupa siapkan dana Rp {cod} untuk pembayaran di tempat ya Kak.{/if_cod} Sampai jumpa! 😊"
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
  senderName: 'Admin J&T Cargo',
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
