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
  createdAt: number;
}

export interface MessageTemplate {
  id: string;
  name: string;
  text: string;
}

export const DEFAULT_TEMPLATES: MessageTemplate[] = [
  {
    id: 'retur',
    name: '⚠️ Konfirmasi Retur (Urgent)',
    text: "{salam} Kak {nama}, 📦\n\nKami dari J&T Cargo menginfokan paket resi: *{resi}* ({barang}) tujuan {alamat} mengalami kendala pengantaran.\n\n{if_cod}💰 Tagihan COD: *{cod}*\n{/if_cod}{if_dfod}💳 DFOD: *{dfod}*\n{/if_dfod}\nSudah ada percobaan delivery namun belum sukses. Mohon konfirmasinya apakah paket masih mau diambil atau di-retur (kembali ke pengirim) ya Kak? 🙏"
  },
  {
    id: 'delivery',
    name: '🚚 Proses Pengantaran',
    text: "{salam} Kak {nama}, 📦\n\nSaya {pengirim} dari J&T Cargo. Menginfokan paket Kakak dengan resi: *{resi}* ({barang}) tujuan {alamat} saat ini *SEDANG DALAM PROSES PENGANTARAN* oleh kurir kami.\n\n{if_cod}💰 Mohon siapkan dana COD: *{cod}*\n{/if_cod}{if_dfod}💳 Biaya DFOD: *{dfod}*\n{/if_dfod}\nMohon HP selalu aktif ya Kak agar kurir mudah menghubungi. Terima kasih! 😊"
  },
  {
    id: 'received',
    name: '✅ Konfirmasi Diterima',
    text: "{salam} Kak {nama}, 📦\n\nKami dari J&T Cargo ingin mengonfirmasi apakah paket dengan resi: *{resi}* ({barang}) tujuan {alamat} sudah diterima dengan baik?\n\n{if_cod}💰 Konfirmasi Pembayaran COD: *{cod}*\n{/if_cod}{if_dfod}💳 Konfirmasi Pembayaran DFOD: *{dfod}*\n{/if_dfod}\nTerima kasih telah menggunakan layanan J&T Cargo. Senang bisa melayani Anda! 🙏✨"
  },
  {
    id: 'failed_delivery',
    name: '📍 Gagal Kirim (Alamat/Kosong)',
    text: "{salam} Kak {nama}, 📦\n\nKurir J&T Cargo sedang di lokasi untuk antar paket resi: *{resi}* ({barang}) tujuan {alamat}, namun rumah terlihat kosong/alamat sulit ditemukan.\n\n{if_cod}💰 Tagihan COD: *{cod}*\n{/if_cod}{if_dfod}💳 DFOD: *{dfod}*\n{/if_dfod}\nMohon bantuannya untuk *Share Location* atau berikan patokan rumah yang jelas agar paket bisa segera sampai. Terima kasih! 🙏"
  },
  {
    id: 'cod_reminder',
    name: '💰 Pengingat Tagihan (COD/DFOD)',
    text: "{salam} Kak {nama}, 📦\n\nPaket J&T Cargo Kakak dengan resi: *{resi}* ({barang}) akan segera diantar hari ini.\n\n{if_cod}💰 Total COD yang harus dibayar: *{cod}*\n{/if_cod}{if_dfod}💳 Biaya DFOD: *{dfod}*\n{/if_dfod}\nMohon siapkan uang pas ya Kak agar proses serah terima lebih cepat. Terima kasih! 😊"
  }
];

export interface AppSettings {
  delay: number; // in milliseconds
  autoCloseTab: boolean;
  senderName: string;
  manualMode: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  delay: 5000,
  autoCloseTab: false,
  senderName: 'Admin JNT',
  manualMode: false
};
