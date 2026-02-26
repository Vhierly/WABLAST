import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Send, 
  Trash2, 
  Play, 
  Square, 
  MessageSquare, 
  User, 
  Package, 
  Hash, 
  Phone,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Settings2,
  Download,
  FileSpreadsheet,
  X
} from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { BlastEntry, MessageTemplate, DEFAULT_TEMPLATES } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [entries, setEntries] = useState<BlastEntry[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>(DEFAULT_TEMPLATES);
  const [activeTemplateId, setActiveTemplateId] = useState<string>(DEFAULT_TEMPLATES[0].id);
  const [isBlasting, setIsBlasting] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkData, setBulkData] = useState('');
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    phone: '',
    recipientName: '',
    itemName: '',
    receiptNumber: ''
  });

  // Load data
  useEffect(() => {
    const savedEntries = localStorage.getItem('wa_blast_entries');
    const savedTemplates = localStorage.getItem('wa_blast_templates');
    const savedActiveId = localStorage.getItem('wa_blast_active_template_id');
    
    if (savedEntries) setEntries(JSON.parse(savedEntries));
    if (savedTemplates) setTemplates(JSON.parse(savedTemplates));
    if (savedActiveId) setActiveTemplateId(savedActiveId);
  }, []);

  // Save data
  useEffect(() => {
    localStorage.setItem('wa_blast_entries', JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    localStorage.setItem('wa_blast_templates', JSON.stringify(templates));
  }, [templates]);

  useEffect(() => {
    localStorage.setItem('wa_blast_active_template_id', activeTemplateId);
  }, [activeTemplateId]);

  const activeTemplate = templates.find(t => t.id === activeTemplateId) || templates[0];

  const updateActiveTemplateText = (text: string) => {
    setTemplates(prev => prev.map(t => t.id === activeTemplateId ? { ...t, text } : t));
  };

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.phone || !formData.recipientName) {
      toast.error('Nomor HP dan Nama Penerima wajib diisi');
      return;
    }

    const newEntry: BlastEntry = {
      id: crypto.randomUUID(),
      ...formData,
      status: 'pending',
      createdAt: Date.now()
    };

    setEntries(prev => [newEntry, ...prev]);
    setFormData({ phone: '', recipientName: '', itemName: '', receiptNumber: '' });
    toast.success('Data ditambahkan');
  };

  const handleBulkImport = () => {
    if (!bulkData.trim()) {
      toast.error('Data kosong');
      return;
    }

    const lines = bulkData.trim().split(/\r?\n/);
    const newEntries: BlastEntry[] = [];
    let successCount = 0;

    lines.forEach(line => {
      // Detect delimiter: Tab (Excel) or Comma (CSV)
      const delimiter = line.includes('\t') ? '\t' : ',';
      const columns = line.split(delimiter).map(col => col.trim());
      
      // Expected format: Phone, Name, Item, Receipt
      if (columns.length >= 2) {
        newEntries.push({
          id: crypto.randomUUID(),
          phone: columns[0],
          recipientName: columns[1],
          itemName: columns[2] || '',
          receiptNumber: columns[3] || '',
          status: 'pending',
          createdAt: Date.now()
        });
        successCount++;
      }
    });

    if (newEntries.length > 0) {
      setEntries(prev => [...newEntries, ...prev]);
      setBulkData('');
      setShowBulkModal(false);
      toast.success(`${successCount} data berhasil diimpor`);
    } else {
      toast.error('Format data tidak valid. Pastikan minimal ada kolom Nomor dan Nama.');
    }
  };

  const removeEntry = (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const clearAll = () => {
    setEntries([]);
    setIsConfirmingClear(false);
    toast.success('Semua data dihapus');
  };

  const generateMessage = (entry: BlastEntry) => {
    return activeTemplate.text
      .replace(/{nama}/gi, entry.recipientName)
      .replace(/{barang}/gi, entry.itemName || '-')
      .replace(/{resi}/gi, entry.receiptNumber || '-');
  };

  const getWALink = (entry: BlastEntry) => {
    let phone = entry.phone.replace(/\D/g, '');
    if (phone.startsWith('0')) phone = '62' + phone.slice(1);
    if (!phone.startsWith('62')) phone = '62' + phone;
    
    const message = encodeURIComponent(generateMessage(entry));
    return `https://wa.me/${phone}?text=${message}`;
  };

  const handleSendManual = (entry: BlastEntry) => {
    window.open(getWALink(entry), '_blank');
    updateStatus(entry.id, 'sent');
  };

  const updateStatus = (id: string, status: BlastEntry['status']) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, status } : e));
  };

  const startBlast = () => {
    const pending = entries.filter(e => e.status === 'pending');
    if (pending.length === 0) {
      toast.error('Tidak ada pesan pending');
      return;
    }
    setIsBlasting(true);
    setCurrentIndex(0);
  };

  const stopBlast = () => {
    setIsBlasting(false);
    setCurrentIndex(-1);
  };

  // Blast effect
  useEffect(() => {
    if (isBlasting && currentIndex >= 0) {
      const pendingEntries = entries.filter(e => e.status === 'pending');
      if (currentIndex < pendingEntries.length) {
        const entry = pendingEntries[currentIndex];
        
        // Simulate "automation" feel
        const timer = setTimeout(() => {
          window.open(getWALink(entry), '_blank');
          updateStatus(entry.id, 'sent');
          setCurrentIndex(prev => prev + 1);
        }, 2000); // 2 second delay between messages

        return () => clearTimeout(timer);
      } else {
        setIsBlasting(false);
        setCurrentIndex(-1);
        toast.success('Blast selesai!');
      }
    }
  }, [isBlasting, currentIndex, entries]);

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#1A1A1A] font-sans">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="bg-white border-b border-black/5 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white">
              <Send size={18} />
            </div>
            <h1 className="text-lg font-semibold tracking-tight">WAsender</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-xs font-mono text-gray-400 uppercase tracking-widest">
              Status: {isBlasting ? 'Blasting...' : 'Idle'}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Controls */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Template Editor */}
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Settings2 size={18} className="text-emerald-500" />
                <h2 className="font-medium">Template Pesan</h2>
              </div>
            </div>
            
            {/* Template Selector */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
              {templates.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTemplateId(t.id)}
                  className={cn(
                    "whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                    activeTemplateId === t.id 
                      ? "bg-emerald-500 text-white border-emerald-500 shadow-sm" 
                      : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                  )}
                >
                  {t.name}
                </button>
              ))}
            </div>

            <textarea
              value={activeTemplate.text}
              onChange={(e) => updateActiveTemplateText(e.target.value)}
              className="w-full h-32 p-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all resize-none"
              placeholder="Tulis template pesan..."
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {['{nama}', '{barang}', '{resi}'].map(tag => (
                <button
                  key={tag}
                  onClick={() => updateActiveTemplateText(activeTemplate.text + ' ' + tag)}
                  className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-600 transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          </section>

          {/* Add Entry Form */}
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Plus size={18} className="text-emerald-500" />
                <h2 className="font-medium">Tambah Penerima</h2>
              </div>
              <button 
                onClick={() => setShowBulkModal(true)}
                className="text-[10px] uppercase font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded transition-colors"
              >
                <FileSpreadsheet size={12} /> Bulk Import
              </button>
            </div>
            <form onSubmit={handleAddEntry} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider flex items-center gap-1">
                  <Phone size={10} /> Nomor WhatsApp
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="08123456789"
                  className="w-full p-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider flex items-center gap-1">
                  <User size={10} /> Nama Penerima
                </label>
                <input
                  type="text"
                  value={formData.recipientName}
                  onChange={(e) => setFormData(prev => ({ ...prev, recipientName: e.target.value }))}
                  placeholder="Budi Santoso"
                  className="w-full p-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider flex items-center gap-1">
                    <Package size={10} /> Nama Barang
                  </label>
                  <input
                    type="text"
                    value={formData.itemName}
                    onChange={(e) => setFormData(prev => ({ ...prev, itemName: e.target.value }))}
                    placeholder="Sepatu"
                    className="w-full p-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider flex items-center gap-1">
                    <Hash size={10} /> No Resi
                  </label>
                  <input
                    type="text"
                    value={formData.receiptNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, receiptNumber: e.target.value }))}
                    placeholder="JX123456"
                    className="w-full p-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
              >
                <Plus size={18} /> Tambah Ke Antrean
              </button>
            </form>
          </section>

          {/* Stats & Actions */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-black/5">
              <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Total</div>
              <div className="text-2xl font-light">{entries.length}</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-black/5">
              <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Pending</div>
              <div className="text-2xl font-light text-amber-500">
                {entries.filter(e => e.status === 'pending').length}
              </div>
            </div>
          </div>

          <button
            onClick={isBlasting ? stopBlast : startBlast}
            disabled={entries.length === 0}
            className={cn(
              "w-full py-4 rounded-2xl font-semibold text-lg transition-all flex items-center justify-center gap-3 shadow-xl",
              isBlasting 
                ? "bg-red-500 hover:bg-red-600 text-white shadow-red-500/20" 
                : "bg-black hover:bg-gray-900 text-white shadow-black/20 disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {isBlasting ? (
              <>
                <Square size={20} fill="currentColor" /> Stop Blasting
              </>
            ) : (
              <>
                <Play size={20} fill="currentColor" /> Mulai Blast Otomatis
              </>
            )}
          </button>
        </div>

        {/* Right Column: List */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
            <div className="p-6 border-b border-black/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-emerald-500" />
                <h2 className="font-medium">Antrean Pesan</h2>
              </div>
              <div className="flex items-center gap-2">
                {isConfirmingClear ? (
                  <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                    <span className="text-[10px] font-bold text-red-600 uppercase">Yakin?</span>
                    <button
                      onClick={clearAll}
                      className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                      Ya, Hapus
                    </button>
                    <button
                      onClick={() => setIsConfirmingClear(false)}
                      className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Batal
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsConfirmingClear(true)}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-red-100"
                    title="Hapus Semua Antrean"
                  >
                    <Trash2 size={14} />
                    Hapus Semua
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-6 py-4 text-[10px] uppercase font-bold text-gray-400 tracking-wider">Penerima</th>
                    <th className="px-6 py-4 text-[10px] uppercase font-bold text-gray-400 tracking-wider">Barang / Resi</th>
                    <th className="px-6 py-4 text-[10px] uppercase font-bold text-gray-400 tracking-wider">Status</th>
                    <th className="px-6 py-4 text-[10px] uppercase font-bold text-gray-400 tracking-wider text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  <AnimatePresence mode="popLayout">
                    {entries.length === 0 ? (
                      <motion.tr
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center"
                      >
                        <td colSpan={4} className="px-6 py-12 text-gray-400 text-sm">
                          Belum ada data antrean.
                        </td>
                      </motion.tr>
                    ) : (
                      entries.map((entry, index) => (
                        <motion.tr
                          key={entry.id}
                          layout
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className={cn(
                            "group transition-colors",
                            isBlasting && index === currentIndex ? "bg-emerald-50/50" : "hover:bg-gray-50/50"
                          )}
                        >
                          <td className="px-6 py-4">
                            <div className="font-medium text-sm">{entry.recipientName}</div>
                            <div className="text-xs text-gray-400 flex items-center gap-1">
                              <Phone size={10} /> {entry.phone}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm">{entry.itemName || '-'}</div>
                            <div className="text-xs text-gray-400 font-mono">{entry.receiptNumber || '-'}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                              entry.status === 'sent' ? "bg-emerald-100 text-emerald-700" :
                              entry.status === 'pending' ? "bg-amber-100 text-amber-700" :
                              "bg-red-100 text-red-700"
                            )}>
                              {entry.status === 'sent' ? <CheckCircle2 size={10} /> :
                               entry.status === 'pending' ? <Clock size={10} /> :
                               <AlertCircle size={10} />}
                              {entry.status === 'sent' ? 'Terkirim' :
                               entry.status === 'pending' ? 'Pending' :
                               'Gagal'}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleSendManual(entry)}
                                className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="Kirim Manual"
                              >
                                <MessageSquare size={18} />
                              </button>
                              <button
                                onClick={() => removeEntry(entry.id)}
                                className="p-2 text-gray-300 hover:text-red-500 rounded-lg transition-colors"
                                title="Hapus"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6">
            <h3 className="text-emerald-900 font-medium mb-2 flex items-center gap-2">
              <AlertCircle size={18} /> Tips Penggunaan
            </h3>
            <ul className="text-sm text-emerald-800 space-y-2 list-disc list-inside opacity-80">
              <li>Pastikan pop-up diizinkan (allow popups) di browser Anda.</li>
              <li>Gunakan format nomor HP diawali 08... atau 62...</li>
              <li>Fitur "Blast Otomatis" akan membuka tab baru setiap 2 detik.</li>
              <li>Anda tetap harus menekan tombol "Kirim" di WhatsApp Web (batasan keamanan browser).</li>
            </ul>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-4 py-12 border-t border-black/5 text-center">
        <div className="text-xs text-gray-400 uppercase tracking-widest font-mono">
          WAsender v1.0 • Crafted for Efficiency
        </div>
      </footer>

      {/* Bulk Import Modal */}
      <AnimatePresence>
        {showBulkModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBulkModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-black/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="text-emerald-500" size={20} />
                  <h2 className="font-semibold">Bulk Import dari Excel / CSV</h2>
                </div>
                <button 
                  onClick={() => setShowBulkModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl text-xs text-amber-800">
                  <p className="font-bold mb-1">Format Kolom:</p>
                  <p>Nomor HP [Tab/Koma] Nama [Tab/Koma] Nama Barang [Tab/Koma] No Resi</p>
                  <p className="mt-2 opacity-70 italic">* Anda bisa langsung copy-paste range dari Excel.</p>
                </div>
                <textarea
                  value={bulkData}
                  onChange={(e) => setBulkData(e.target.value)}
                  placeholder="Paste data di sini..."
                  className="w-full h-64 p-4 text-sm font-mono bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all resize-none"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowBulkModal(false)}
                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-medium transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleBulkImport}
                    className="flex-2 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors shadow-lg shadow-emerald-500/20"
                  >
                    Impor Sekarang
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
