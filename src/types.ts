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
    text: "{salam} Kak {nama}, perkenalkan saya admin J&T Cargo. Kami menginfokan bahwa paket Kakak dengan nomor resi {resi} (berisi {barang}){if_cod} yang memiliki tagihan COD sebesar {cod}{/if_cod}{if_dfod} yang memiliki tagihan ongkos kirim (DFOD) sebesar {dfod}{/if_dfod} mengalami kendala pengantaran ke alamat {alamat} dikarenakan rumah kosong/tutup saat kurir kami tiba. Agar paket tidak otomatis diretur ke pihak pengirim oleh sistem, mohon bantuannya untuk mengonfirmasi jadwal pengantaran ulang ya Kak. Silakan balas pesan ini agar kami bisa segera memprosesnya. Terima kasih banyak atas kerja samanya. 🙏",
    variations: [
      "{salam} Kak {nama}, perkenalkan saya admin J&T Cargo. Kami menginfokan bahwa paket Kakak dengan nomor resi {resi} (berisi {barang}){if_cod} yang memiliki tagihan COD sebesar {cod}{/if_cod}{if_dfod} yang memiliki tagihan ongkos kirim (DFOD) sebesar {dfod}{/if_dfod} mengalami kendala pengantaran ke alamat {alamat} dikarenakan rumah kosong/tutup saat kurir kami tiba. Agar paket tidak otomatis diretur ke pihak pengirim oleh sistem, mohon bantuannya untuk mengonfirmasi jadwal pengantaran ulang ya Kak. Silakan balas pesan ini agar kami bisa segera memprosesnya. Terima kasih banyak atas kerja samanya. 🙏",
      "{salam} Kak {nama}, saya admin dari J&T Cargo memohon maaf mengganggu waktunya. Kami mendapat laporan dari kurir bahwa paket Kakak ({barang}) resi {resi}{if_cod} dengan nominal COD {cod}{/if_cod}{if_dfod} dengan nominal bayar tujuan {dfod}{/if_dfod} belum bisa diserahterimakan karena tidak ada penerima di lokasi ({alamat}). Untuk menghindari status retur otomatis dari sistem, mohon konfirmasinya apakah paket ini ingin diantarkan kembali besok atau ada instruksi lain? Kami tunggu konfirmasinya ya Kak, terima kasih. ✨",
      "Halo Kak {nama}, salam hangat dari tim J&T Cargo. Menginfokan bahwa hari ini paket dengan nomor resi {resi} berisi {barang}{if_cod} beserta tagihan COD {cod}{/if_cod}{if_dfod} beserta tagihan DFOD {dfod}{/if_dfod} gagal diantarkan ke {alamat} (keterangan: rumah kosong/tutup). Boleh dibantu info untuk patokan rumah atau jam berapa sebaiknya kurir kami kembali mengantar? Info dari Kakak sangat kami butuhkan agar paket tidak diretur ke penjual. Terima kasih banyak atas pengertiannya. 📦🙏"
    ]
  },
  {
    id: 'delivery',
    name: '🚚 Proses Pengantaran',
    text: "{salam} Kak {nama}, salam hangat dari J&T Cargo. Menginfokan bahwa hari ini paket Kakak dengan resi {resi} ({barang}) sudah masuk jadwal pengantaran dan sedang dalam perjalanan menuju lokasi ({alamat}). Mohon pastikan nomor HP Kakak selalu aktif agar kurir kami mudah menghubungi saat sudah dekat. {if_cod}Sebagai pengingat, terdapat tagihan COD sebesar {cod} yang perlu dibayarkan tunai ke kurir. {/if_cod}{if_dfod}Sebagai pengingat, terdapat biaya ongkir bayar di tempat (DFOD) sebesar {dfod}. {/if_dfod}Terima kasih telah menggunakan layanan J&T Cargo, semoga harinya menyenangkan! 😊",
    variations: [
      "{salam} Kak {nama}, salam hangat dari J&T Cargo. Menginfokan bahwa hari ini paket Kakak dengan resi {resi} ({barang}) sudah masuk jadwal pengantaran dan sedang dalam perjalanan menuju lokasi ({alamat}). Mohon pastikan nomor HP Kakak selalu aktif agar kurir kami mudah menghubungi saat sudah dekat. {if_cod}Sebagai pengingat, terdapat tagihan COD sebesar {cod} yang perlu dibayarkan tunai ke kurir. {/if_cod}{if_dfod}Sebagai pengingat, terdapat biaya ongkir bayar di tempat (DFOD) sebesar {dfod}. {/if_dfod}Terima kasih telah menggunakan layanan J&T Cargo, semoga harinya menyenangkan! 😊",
      "Halo Kak {nama}! Saya admin J&T Cargo mengabarkan kabar baik, paket resi {resi} ({barang}) sudah dibawa oleh kurir kami dan akan segera tiba di alamat {alamat} pada hari ini. {if_cod}Sesuai data sistem, terdapat tagihan COD sejumlah {cod}. {/if_cod}{if_dfod}Sesuai data sistem, terdapat tagihan ongkos kirim DFOD sejumlah {dfod}. {/if_dfod}Mohon pastikan ada pihak yang bisa menerima paket di lokasi ya Kak. Terima kasih banyak. ✨",
      "{salam} Kak {nama}, perkenalkan saya admin J&T Cargo. Saat ini kurir kami sedang menuju lokasi Kakak di area {alamat} untuk melakukan pengantaran kiriman barang ({barang}). {if_cod}Untuk kelancaran pembayaran COD sebesar {cod}, kami merekomendasikan untuk menyiapkan uang pas jika memungkinkan ya Kak. {/if_cod}{if_dfod}Untuk tagihan bayar ongkir di tempat (DFOD) adalah sebesar {dfod}. {/if_dfod}Terima kasih atas kepercayaannya, sehat selalu Kak! 🙏🚚"
    ]
  },
  {
    id: 'received',
    name: '✅ Konfirmasi Diterima',
    text: "{salam} Kak {nama}, saya dari tim admin J&T Cargo ingin melakukan pengecekan kualitas layanan kami. Berdasarkan update di sistem, paket Kakak dengan nomor resi {resi} ({barang}){if_cod} beserta pembayaran COD sebesar {cod}{/if_cod}{if_dfod} beserta pembayaran DFOD sebesar {dfod}{/if_dfod} telah berstatus 'Diterima'. Apakah benar paket tersebut sudah sampai di tangan Kakak dalam kondisi yang utuh dan aman? Jika ada kendala, mohon jangan ragu untuk menginfokannya kepada kami. Terima kasih banyak! ✨",
    variations: [
      "{salam} Kak {nama}, saya dari tim admin J&T Cargo ingin melakukan pengecekan kualitas layanan kami. Berdasarkan update di sistem, paket Kakak dengan nomor resi {resi} ({barang}){if_cod} beserta pembayaran COD sebesar {cod}{/if_cod}{if_dfod} beserta pembayaran DFOD sebesar {dfod}{/if_dfod} telah berstatus 'Diterima'. Apakah benar paket tersebut sudah sampai di tangan Kakak dalam kondisi yang utuh dan aman? Jika ada kendala, mohon jangan ragu untuk menginfokannya kepada kami. Terima kasih banyak! ✨",
      "Halo Kak {nama}, memohon waktunya sebentar. Menurut laporan penyelesaian tugas dari kurir kami, paket dengan resi *{resi}* ({barang}){if_cod} dan uang COD senilai {cod}{/if_cod}{if_dfod} dan uang ongkir DFOD senilai {dfod}{/if_dfod} sudah diserahkan ke alamat tujuan. Kami dari J&T Cargo hanya ingin memastikan kebenaran bahwa barang sudah Kakak terima dengan baik. Mohon bantu konfirmasinya ya Kak, karena respon Kakak sangat berarti bagi layanan kami. 🙏📦",
      "{salam} Kak {nama}, paket kiriman J&T Cargo dengan resi {resi}{if_cod} (Tagihan COD {cod} lunas){/if_cod}{if_dfod} (Tagihan DFOD {dfod} lunas){/if_dfod} sudah ter-update menjadi status Diterima di sistem. Kami berharap pesanan ({barang}) sesuai dan sampai dengan aman tanpa kekurangan apapun. Terima kasih banyak sudah mempercayakan pengiriman Anda kepada J&T Cargo. Selamat beraktivitas kembali Kak! 😊"
    ]
  },
  {
    id: 'failed_delivery',
    name: '📍 Gagal Kirim (Susah Dicari)',
    text: "{salam} Kak {nama}, mohon maaf mengganggu waktunya. Saya admin J&T Cargo menginfokan bahwa kurir kami saat ini sedang berada di area alamat {alamat} untuk mengantarkan paket Kakak ({resi}){if_cod} yang memiliki tagihan COD {cod}{/if_cod}{if_dfod} yang memiliki tagihan DFOD {dfod}{/if_dfod}. Namun, kurir kami mengalami sedikit kendala kesulitan menemukan titik lokasi rumah Kakak yang pas. Agar paket bisa segera diserahterimakan, bolehkah kami meminta bantuan Kakak untuk mengirimkan *share location* (titik maps) atau detail patokan rumah terdekat? Terima kasih banyak atas pengertiannya Kak. 🙏",
    variations: [
      "{salam} Kak {nama}, mohon maaf mengganggu waktunya. Saya admin J&T Cargo menginfokan bahwa kurir kami saat ini sedang berada di area alamat {alamat} untuk mengantarkan paket Kakak ({resi}){if_cod} yang memiliki tagihan COD {cod}{/if_cod}{if_dfod} yang memiliki tagihan DFOD {dfod}{/if_dfod}. Namun, kurir kami mengalami sedikit kendala kesulitan menemukan titik lokasi rumah Kakak yang pas. Agar paket bisa segera diserahterimakan, bolehkah kami meminta bantuan Kakak untuk mengirimkan *share location* (titik maps) atau detail patokan rumah terdekat? Terima kasih banyak atas pengertiannya Kak. 🙏",
      "Kak {nama}, perkenalkan saya dari tim J&T Cargo. Saat ini kurir kami menginfokan sedang kesulitan mencari alamat akurat untuk pengiriman paket nomor resi {resi} ({barang}){if_cod} dengan nominal COD {cod}{/if_cod}{if_dfod} dengan nominal ongkir tujuan {dfod}{/if_dfod}. Agar pengiriman dapat berjalan lancar tanpa tertunda, kami memohon kesediaan Kakak untuk menginformasikan patokan spesifik (warna cat rumah/pagar/bangunan terdekat) atau nomor yang bisa dihubungi kurir kami. Terima kasih banyak atas kerjasamanya. 📍",
      "Halo Kak {nama}, kami dari admin J&T Cargo menginformasikan bahwa paket {resi}{if_cod} (COD: {cod}){/if_cod}{if_dfod} (DFOD: {dfod}){/if_dfod} gagal terkirim hari ini dikarenakan alamat yang tercantum kurang jelas atau titik koordinat tidak ditemukan oleh kurir lapangan kami. Agar paket dapat segera dijadwalkan ulang besok dengan lancar, kami memohon Kakak berkenan memberikan detail patokan rumahnya. Kami tunggu responnya ya Kak. 🙏"
    ]
  },
  {
    id: 'cod_reminder',
    name: '💰 Pengingat Tagihan',
    text: "{salam} Kak {nama}, perkenalkan saya admin J&T Cargo. Menginfokan bahwa paket Kakak ({barang}) dengan resi {resi} akan segera diantarkan ke lokasi hari ini. {if_cod}Untuk memperlancar proses serah terima barang di lapangan, kami mohon kesediaan Kakak untuk menyiapkan dana COD sebesar {cod}. Jika berkenan, mohon disiapkan uang pas ya Kak agar prosesnya berjalan lebih cepat. {/if_cod}{if_dfod}Untuk kelancaran proses serah terima, mohon agar Kakak dapat menyiapkan biaya ongkos kirim (DFOD) sebesar {dfod}. {/if_dfod}Mohon pastikan ada penerima di lokasi saat kurir kami tiba. Terima kasih atas kerja samanya dan sehat selalu! 🚚",
    variations: [
      "{salam} Kak {nama}, perkenalkan saya admin J&T Cargo. Menginfokan bahwa paket Kakak ({barang}) dengan resi {resi} akan segera diantarkan ke lokasi hari ini. {if_cod}Untuk memperlancar proses serah terima barang di lapangan, kami mohon kesediaan Kakak untuk menyiapkan dana COD sebesar {cod}. Jika berkenan, mohon disiapkan uang pas ya Kak agar prosesnya berjalan lebih cepat. {/if_cod}{if_dfod}Untuk kelancaran proses serah terima, mohon agar Kakak dapat menyiapkan biaya ongkos kirim (DFOD) sebesar {dfod}. {/if_dfod}Mohon pastikan ada penerima di lokasi saat kurir kami tiba. Terima kasih atas kerja samanya dan sehat selalu! 🚚",
      "Reminder pengiriman dari J&T Cargo untuk Kak {nama}! Paket dengan nomor resi {resi} ({barang}) telah kami jadwalkan untuk diantar pada hari ini. {if_cod}Sesuai nota, terdapat total tagihan COD yang harus dibayarkan senilai: {cod}. {/if_cod}{if_dfod}Sesuai nota, terdapat total biaya ongkir DFOD yang harus dibayarkan senilai: {dfod}. {/if_dfod}Kami mohon bantuan Kakak untuk standby di lokasi atau menitipkan pesan/dana kepada orang di rumah. Terima kasih banyak Kak. 🙏",
      "{salam} Kak {nama}, kurir J&T Cargo kami akan segera tiba untuk mengantarkan pesanan barang ({barang}) ke alamat {alamat}. {if_cod}Sebagai informasi awal, jangan lupa menyiapkan pembayaran tunai COD sebesar {cod} ya Kak. {/if_cod}{if_dfod}Sebagai informasi awal, mohon disiapkan pembayaran ongkir di tempat (DFOD) sejumlah {dfod}. {/if_dfod}Semoga pengiriman berjalan lancar dan barangnya memuaskan! 🚚✨"
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
