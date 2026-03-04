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
    name: 'Konfirmasi Retur',
    text: "{salam} ka, kami dari JNT Cargo manado mau konfrimasi resi : {resi} dengan nama barang : {barang} tujuan {alamat}. {if_cod}Info Tagihan - COD: {cod}. {/if_cod}{if_dfod}DFOD: {dfod}. {/if_dfod}Sudah ada percobaan delivery tapi masih belum sukses, apakah masih mau diambil atau di retur ka ?"
  },
  {
    id: 'delivery',
    name: 'Proses Pengantaran',
    text: "{salam} kak, perkenalkan saya {pengirim} dari JNT Cargo. Menginfokan bahwa paket kakak with resi {resi} ({barang}) tujuan {alamat} saat ini sedang dalam proses pengantaran oleh kurir kami. {if_cod}Tagihan COD: {cod}. {/if_cod}{if_dfod}DFOD: {dfod}. {/if_dfod}Mohon ditunggu ya kak. Terima kasih!"
  },
  {
    id: 'received',
    name: 'Konfirmasi Diterima',
    text: "{salam} kak, perkenalkan saya {pengirim} dari JNT Cargo, kak mau konfirmasi apakah nomor resi ini: {resi} dengan nama penerima: {nama} tujuan {alamat}, apakah sudah diterima?"
  }
];

export interface AppSettings {
  delay: number; // in milliseconds
  autoCloseTab: boolean;
  senderName: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  delay: 5000,
  autoCloseTab: false,
  senderName: 'Admin JNT'
};
