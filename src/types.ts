export interface BlastEntry {
  id: string;
  phone: string;
  recipientName: string;
  itemName: string;
  receiptNumber: string;
  cod: string;
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
    text: "{salam} ka, kami dari JNT Cargo manado mau konfrimasi resi : {resi} dengan nama barang : {barang} dengan COD : {cod} sudah ada percobaan delivery tapi msaih belum sukses apakah masih mau diambil atau di retur ka ?"
  },
  {
    id: 'delivery',
    name: 'Proses Pengantaran',
    text: "{salam} kak, perkenalkan saya {pengirim} dari JNT Cargo. Menginfokan bahwa paket kakak dengan resi {resi} ({barang}) saat ini sedang dalam proses pengantaran oleh kurir kami ke alamat tujuan. Mohon ditunggu ya kak. Terima kasih!"
  },
  {
    id: 'received',
    name: 'Konfirmasi Diterima',
    text: "{salam} kak, perkenalkan saya {pengirim} dari JNT Cargo, kak mau konfirmasi apakah nomor resi ini: {resi} dengan nama penerima: {nama} dengan barang: {barang}, apakah sudah diterima?"
  }
];

export interface AppSettings {
  delay: number; // in milliseconds
  autoCloseTab: boolean;
  senderName: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  delay: 2000,
  autoCloseTab: false,
  senderName: 'Admin JNT'
};
