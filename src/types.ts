export interface BlastEntry {
  id: string;
  phone: string;
  recipientName: string;
  itemName: string;
  receiptNumber: string;
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
    id: 'shipping',
    name: 'Proses Pengiriman',
    text: "Halo {nama}, pesanan {barang} dengan No Resi {resi} sedang dalam proses pengiriman. Terima kasih!"
  },
  {
    id: 'received',
    name: 'Konfirmasi Diterima',
    text: "Halo {nama}, pesanan {barang} (Resi: {resi}) sudah sampai di tujuan. Mohon konfirmasi jika sudah diterima dengan baik. Terima kasih!"
  }
];
