import React, { useState, useEffect, useMemo } from 'react';
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
  X,
  Search,
  Sparkles,
  BarChart3,
  History,
  Timer,
  ExternalLink,
  ChevronRight,
  Moon,
  Sun,
  RotateCcw
} from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip 
} from 'recharts';
import { 
  BlastEntry, 
  MessageTemplate, 
  DEFAULT_TEMPLATES, 
  AppSettings, 
  DEFAULT_SETTINGS 
} from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [entries, setEntries] = useState<BlastEntry[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>(DEFAULT_TEMPLATES);
  const [activeTemplateId, setActiveTemplateId] = useState<string>(DEFAULT_TEMPLATES[0].id);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isBlasting, setIsBlasting] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [bulkData, setBulkData] = useState('');
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('wa_blast_theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  
  // Form state
  const [formData, setFormData] = useState({
    phone: '',
    recipientName: '',
    itemName: '',
    receiptNumber: '',
    address: '',
    cod: '',
    dfod: ''
  });

  // Load data
  useEffect(() => {
    const savedEntries = localStorage.getItem('wa_blast_entries');
    const savedTemplates = localStorage.getItem('wa_blast_templates');
    const savedActiveId = localStorage.getItem('wa_blast_active_template_id');
    const savedSettings = localStorage.getItem('wa_blast_settings');
    
    if (savedEntries) setEntries(JSON.parse(savedEntries));
    if (savedTemplates) {
      const parsedTemplates: MessageTemplate[] = JSON.parse(savedTemplates);
      // Merge saved templates with defaults to ensure new default templates appear
      const mergedTemplates = [...parsedTemplates];
      DEFAULT_TEMPLATES.forEach(def => {
        if (!mergedTemplates.find(t => t.id === def.id)) {
          mergedTemplates.push(def);
        }
      });
      setTemplates(mergedTemplates);
    }
    if (savedActiveId) setActiveTemplateId(savedActiveId);
    if (savedSettings) setSettings(JSON.parse(savedSettings));
  }, []);

  // Save data
  useEffect(() => localStorage.setItem('wa_blast_entries', JSON.stringify(entries)), [entries]);
  useEffect(() => localStorage.setItem('wa_blast_templates', JSON.stringify(templates)), [templates]);
  useEffect(() => localStorage.setItem('wa_blast_active_template_id', activeTemplateId), [activeTemplateId]);
  useEffect(() => localStorage.setItem('wa_blast_settings', JSON.stringify(settings)), [settings]);
  useEffect(() => {
    const theme = isDarkMode ? 'dark' : 'light';
    localStorage.setItem('wa_blast_theme', theme);
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleResetDefault = () => {
    if (window.confirm('Apakah Anda yakin ingin menghapus semua data dan kembali ke pengaturan awal? Semua antrean dan template custom akan hilang.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

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
    setFormData({ phone: '', recipientName: '', itemName: '', receiptNumber: '', address: '', cod: '', dfod: '' });
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
      const delimiter = line.includes('\t') ? '\t' : ',';
      const columns = line.split(delimiter).map(col => col.trim());
      
      // Expected format: No, Resi/AWB, Nama Penerima, No HP, Alamat Lengkap, Tanda COD, Nominal COD, DFOD, Nama Barang
      if (columns.length >= 4) {
        // Skip header lines
        const firstCol = columns[0].toLowerCase();
        const secondCol = (columns[1] || '').toLowerCase();
        if (firstCol === 'no' || secondCol === 'resi/awb' || secondCol === 'resi') return;

        const codValue = columns[6] || '-';
        const dfodValue = columns[7] || '-';
        const itemNameValue = columns[8] || '';

        newEntries.push({
          id: crypto.randomUUID(),
          receiptNumber: columns[1] || '',
          recipientName: columns[2] || '',
          phone: columns[3] || '',
          address: columns[4] || '',
          itemName: itemNameValue, 
          cod: (codValue === '-' || codValue === '0' || !codValue) ? '' : codValue,
          dfod: (dfodValue === '--' || dfodValue === '-' || dfodValue === '0' || !dfodValue) ? '' : dfodValue,
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
      toast.error('Format data tidak valid.');
    }
  };

  const clearAll = () => {
    setEntries([]);
    setIsConfirmingClear(false);
    toast.success('Semua data dihapus');
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return 'Selamat Pagi';
    if (hour >= 11 && hour < 15) return 'Selamat Siang';
    if (hour >= 15 && hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  const generateMessage = (entry: BlastEntry) => {
    let text = activeTemplate.text;

    // Handle conditional blocks
    // {if_cod}Text {cod}{/if_cod}
    if (!entry.cod) {
      text = text.replace(/{if_cod}[\s\S]*?{\/if_cod}/gi, '');
    } else {
      text = text.replace(/{if_cod}/gi, '').replace(/{\/if_cod}/gi, '');
    }

    if (!entry.dfod) {
      text = text.replace(/{if_dfod}[\s\S]*?{\/if_dfod}/gi, '');
    } else {
      text = text.replace(/{if_dfod}/gi, '').replace(/{\/if_dfod}/gi, '');
    }

    return text
      .replace(/{salam}/gi, getGreeting())
      .replace(/{pengirim}/gi, settings.senderName || 'Admin')
      .replace(/{nama}/gi, entry.recipientName)
      .replace(/{barang}/gi, entry.itemName || '-')
      .replace(/{resi}/gi, entry.receiptNumber || '-')
      .replace(/{alamat}/gi, entry.address || '-')
      .replace(/{cod}/gi, entry.cod ? `Rp ${entry.cod}` : '-')
      .replace(/{dfod}/gi, entry.dfod ? `Rp ${entry.dfod}` : '-');
  };

  const getWALink = (entry: BlastEntry) => {
    let phone = entry.phone.replace(/\D/g, '');
    if (phone.startsWith('0')) phone = '62' + phone.slice(1);
    if (!phone.startsWith('62')) phone = '62' + phone;
    const message = encodeURIComponent(generateMessage(entry));
    // Force WhatsApp Web instead of wa.me
    return `https://web.whatsapp.com/send?phone=${phone}&text=${message}`;
  };

  const handleSendManual = (entry: BlastEntry) => {
    // Use a named window to reuse the same tab and avoid popup blockers
    window.open(getWALink(entry), 'WAsenderTab');
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

    // Open the first one immediately to "unlock" the popup blocker
    const firstEntry = pending[0];
    const newWindow = window.open(getWALink(firstEntry), 'WAsenderTab');
    
    if (!newWindow) {
      toast.error('Popup terblokir! Harap izinkan popup di browser Anda.', {
        duration: 5000,
        icon: '🚫'
      });
      return;
    }

    updateStatus(firstEntry.id, 'sent');
    setIsBlasting(true);
    setCurrentIndex(0);
  };

  const stopBlast = () => {
    setIsBlasting(false);
    setCurrentIndex(-1);
  };

  useEffect(() => {
    if (isBlasting) {
      const pendingEntries = entries.filter(e => e.status === 'pending');
      
      if (pendingEntries.length > 0) {
        const entry = pendingEntries[0]; // Always take the first pending
        const timer = setTimeout(() => {
          // Use a named window 'WAsenderTab' to reuse the same tab.
          // This is more reliable and avoids opening 100 separate tabs.
          const newWindow = window.open(getWALink(entry), 'WAsenderTab');
          
          if (!newWindow) {
            toast.error('Popup terblokir! Klik tombol "Start Engine" lagi dan pastikan pilih "Always Allow Popups" di pojok kanan atas browser.', {
              duration: 8000,
              icon: '🚫'
            });
            setIsBlasting(false);
            return;
          }

          updateStatus(entry.id, 'sent');
        }, settings.delay);
        return () => clearTimeout(timer);
      } else {
        setIsBlasting(false);
        toast.success('Blast selesai!', {
          icon: '✅'
        });
      }
    }
  }, [isBlasting, entries.length, settings.delay]);

  const filteredEntries = useMemo(() => {
    return entries.filter(e => 
      e.recipientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.phone.includes(searchQuery) ||
      e.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [entries, searchQuery]);

  const statsData = useMemo(() => {
    const sent = entries.filter(e => e.status === 'sent').length;
    const pending = entries.filter(e => e.status === 'pending').length;
    return [
      { name: 'Sent', value: sent, color: '#10b981' },
      { name: 'Pending', value: pending, color: '#f59e0b' }
    ];
  }, [entries]);

  const exportToCSV = () => {
    if (entries.length === 0) return;
    const headers = ['Phone', 'Name', 'Item', 'Receipt', 'Status', 'Created At'];
    const rows = entries.map(e => [
      e.phone,
      e.recipientName,
      e.itemName,
      e.receiptNumber,
      e.status,
      new Date(e.createdAt).toLocaleString()
    ]);
    const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `wasender_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Laporan berhasil diunduh');
  };

  return (
    <div className={cn(
      "min-h-screen bg-[#F8F9FA] dark:bg-[#0F1115] text-[#1A1A1A] dark:text-[#E4E6EB] font-sans selection:bg-emerald-100 dark:selection:bg-emerald-900/30 transition-colors duration-300",
      isDarkMode && "dark"
    )}>
      <Toaster position="top-right" />

      {/* Blast Progress Overlay */}
      {isBlasting && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white dark:bg-[#16191F] rounded-3xl p-8 max-w-md w-full shadow-2xl border border-white/10 text-center space-y-6">
            <div className="relative w-24 h-24 mx-auto">
              <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full" />
              <div className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Play size={32} className="text-emerald-500 fill-current" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Blasting in Progress...</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Sedang mengirim pesan ke <span className="font-bold text-emerald-600 dark:text-emerald-400">{entries.filter(e => e.status === 'sent').length}</span> dari <span className="font-bold">{entries.length}</span> antrean.
              </p>
              <div className="pt-4 flex flex-col gap-2">
                <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-widest animate-pulse">
                  Jangan tutup tab WhatsApp Web yang terbuka!
                </p>
                <p className="text-[9px] text-gray-400 italic">
                  Jika macet, Anda bisa klik "Kirim Berikutnya" atau tunggu delay selesai.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  const pending = entries.filter(e => e.status === 'pending');
                  if (pending.length > 0) {
                    const entry = pending[0];
                    window.open(getWALink(entry), 'WAsenderTab');
                    updateStatus(entry.id, 'sent');
                  }
                }}
                className="w-full py-3 bg-emerald-100 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400 rounded-2xl font-bold text-sm hover:bg-emerald-200 transition-all border border-emerald-200 dark:border-emerald-900/30"
              >
                Kirim Berikutnya (Manual)
              </button>
              <button
                onClick={stopBlast}
                className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold transition-all shadow-lg shadow-red-500/20 text-sm"
              >
                Berhenti
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Sidebar-like Header */}
      <header className="bg-white dark:bg-[#16191F] border-b border-black/5 dark:border-white/5 sticky top-0 z-30 backdrop-blur-md bg-white/80 dark:bg-[#16191F]/80">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-600/20">
              <Send size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">WAsender <span className="text-emerald-600">PRO</span></h1>
              <p className="text-[10px] text-gray-400 font-mono uppercase tracking-widest">Advanced WhatsApp Blast Engine</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-3">
            <button 
              onClick={handleResetDefault}
              className="p-2.5 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 transition-all flex items-center gap-2"
              title="Reset ke Pengaturan Awal"
            >
              <RotateCcw size={18} />
              <span className="hidden lg:inline text-xs font-bold uppercase tracking-wider">Reset</span>
            </button>
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2.5 bg-gray-50 dark:bg-[#1C2128] border border-black/5 dark:border-white/5 rounded-xl text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-[#1C2128] rounded-full border border-black/5 dark:border-white/5">
              <div className={cn("w-2 h-2 rounded-full animate-pulse", isBlasting ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-700")} />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{isBlasting ? 'System Active' : 'System Idle'}</span>
            </div>
            <button 
              onClick={exportToCSV}
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            >
              <Download size={14} /> Export
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Stats & Config */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Stats Card */}
          <section className="bg-white dark:bg-[#16191F] rounded-3xl p-6 shadow-sm border border-black/5 dark:border-white/5">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <BarChart3 size={18} className="text-emerald-500" />
                <h2 className="font-bold">Overview</h2>
              </div>
              <History size={16} className="text-gray-300 dark:text-gray-600" />
            </div>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statsData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ 
                      backgroundColor: isDarkMode ? '#16191F' : '#FFFFFF',
                      borderColor: isDarkMode ? '#2D333B' : '#E5E7EB',
                      color: isDarkMode ? '#E4E6EB' : '#1A1A1A'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              {statsData.map(s => (
                <div key={s.name} className="p-3 rounded-2xl bg-gray-50 dark:bg-[#1C2128] border border-black/5 dark:border-white/5">
                  <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{s.name}</div>
                  <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Settings Card */}
          <section className="bg-white dark:bg-[#16191F] rounded-3xl p-6 shadow-sm border border-black/5 dark:border-white/5">
            <div className="flex items-center gap-2 mb-6">
              <Timer size={18} className="text-emerald-500" />
              <h2 className="font-bold">Engine Settings</h2>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Nama Pengirim</label>
                <input
                  type="text"
                  value={settings.senderName}
                  onChange={(e) => setSettings(prev => ({ ...prev, senderName: e.target.value }))}
                  placeholder="Contoh: Admin JNT"
                  className="w-full p-3 text-sm bg-gray-50 dark:bg-[#1C2128] border border-gray-100 dark:border-white/5 rounded-xl focus:border-emerald-500 outline-none dark:text-white"
                />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Blast Delay</label>
                  <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">{settings.delay / 1000}s</span>
                </div>
                <input 
                  type="range" 
                  min="1000" 
                  max="10000" 
                  step="500"
                  value={settings.delay}
                  onChange={(e) => setSettings(prev => ({ ...prev, delay: parseInt(e.target.value) }))}
                  className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-600 font-mono">
                  <span>FAST</span>
                  <span>SAFE</span>
                </div>
              </div>
            </div>
          </section>

          {/* Template Editor */}
          <section className="bg-white dark:bg-[#16191F] rounded-3xl p-6 shadow-sm border border-black/5 dark:border-white/5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Settings2 size={18} className="text-emerald-500" />
                <h2 className="font-bold">Templates</h2>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-tighter mr-2 animate-pulse">Auto-saved</span>
                <button 
                  onClick={() => {
                    const def = DEFAULT_TEMPLATES.find(t => t.id === activeTemplateId);
                    if (def && confirm('Reset template ini ke pengaturan awal?')) {
                      updateActiveTemplateText(def.text);
                      toast.success('Template direset');
                    }
                  }}
                  className="p-2 text-gray-400 dark:text-gray-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/10 rounded-xl transition-all"
                  title="Reset to Default"
                >
                  <History size={18} />
                </button>
              </div>
            </div>
            
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2 custom-scrollbar">
              {templates.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTemplateId(t.id)}
                  className={cn(
                    "whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                    activeTemplateId === t.id 
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20" 
                      : "bg-gray-50 dark:bg-[#1C2128] text-gray-500 dark:text-gray-400 border-gray-200 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-gray-800"
                  )}
                >
                  {t.name}
                </button>
              ))}
            </div>

            <textarea
              value={activeTemplate.text}
              onChange={(e) => updateActiveTemplateText(e.target.value)}
              className="w-full h-40 p-4 text-sm bg-gray-50 dark:bg-[#1C2128] border border-gray-200 dark:border-white/5 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all resize-none leading-relaxed dark:text-white custom-scrollbar"
              placeholder="Tulis template pesan..."
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {['{salam}', '{pengirim}', '{nama}', '{barang}', '{resi}', '{alamat}', '{cod}', '{dfod}', '{if_cod}', '{/if_cod}', '{if_dfod}', '{/if_dfod}'].map(tag => (
                <button
                  key={tag}
                  onClick={() => updateActiveTemplateText(activeTemplate.text + ' ' + tag)}
                  className="text-[10px] font-bold tracking-wider px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-400 transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column: Queue & Input */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Action Bar */}
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-white dark:bg-[#16191F] p-4 rounded-3xl border border-black/5 dark:border-white/5 shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama, nomor, atau resi..."
                className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-[#1C2128] border border-gray-100 dark:border-white/5 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-sm dark:text-white"
              />
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowBulkModal(true)}
                className="px-6 py-3 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400 rounded-2xl font-bold text-sm hover:bg-emerald-100 dark:hover:bg-emerald-900/20 transition-all flex items-center gap-2"
              >
                <FileSpreadsheet size={18} /> Bulk Import
              </button>
              <button
                onClick={() => setShowPreviewModal(true)}
                disabled={entries.filter(e => e.status === 'pending').length === 0}
                className="px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-2xl font-bold text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Search size={18} /> Preview
              </button>
              <button
                onClick={isBlasting ? stopBlast : startBlast}
                disabled={entries.length === 0}
                className={cn(
                  "px-8 py-3 rounded-2xl font-bold text-sm transition-all flex items-center gap-2 shadow-lg",
                  isBlasting 
                    ? "bg-red-500 text-white shadow-red-500/20" 
                    : "bg-black dark:bg-emerald-600 text-white shadow-black/20 dark:shadow-emerald-600/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                )}
              >
                {isBlasting ? <Square size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                {isBlasting ? 'Stop Blast' : 'Start Engine'}
              </button>
            </div>
          </div>

          {/* Popup Warning */}
          {!isBlasting && entries.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-2xl p-4 flex items-start gap-3">
              <AlertCircle className="text-amber-600 dark:text-amber-400 shrink-0" size={18} />
              <div className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                <span className="font-bold">PENTING:</span> Mesin akan membuka <span className="font-bold">WhatsApp Web</span> di tab yang sama secara bergantian. Pastikan Anda telah <span className="font-bold">MENGIZINKAN POPUP</span> di browser Anda (klik ikon gembok/popup di bar alamat browser). Gunakan delay minimal 5 detik agar WA Web sempat memuat pesan.
              </div>
            </div>
          )}

          {/* Quick Add Form */}
          <section className="bg-white dark:bg-[#16191F] rounded-3xl p-6 shadow-sm border border-black/5 dark:border-white/5">
            <form onSubmit={handleAddEntry} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="0812..."
                    className="w-full p-3 text-sm bg-gray-50 dark:bg-[#1C2128] border border-gray-100 dark:border-white/5 rounded-xl focus:border-emerald-500 outline-none dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Name</label>
                  <input
                    type="text"
                    value={formData.recipientName}
                    onChange={(e) => setFormData(prev => ({ ...prev, recipientName: e.target.value }))}
                    placeholder="Recipient Name"
                    className="w-full p-3 text-sm bg-gray-50 dark:bg-[#1C2128] border border-gray-100 dark:border-white/5 rounded-xl focus:border-emerald-500 outline-none dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Item Name</label>
                  <input
                    type="text"
                    value={formData.itemName}
                    onChange={(e) => setFormData(prev => ({ ...prev, itemName: e.target.value }))}
                    placeholder="Nama Barang"
                    className="w-full p-3 text-sm bg-gray-50 dark:bg-[#1C2128] border border-gray-100 dark:border-white/5 rounded-xl focus:border-emerald-500 outline-none dark:text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Resi</label>
                  <input
                    type="text"
                    value={formData.receiptNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, receiptNumber: e.target.value }))}
                    placeholder="Resi Number"
                    className="w-full p-3 text-sm bg-gray-50 dark:bg-[#1C2128] border border-gray-100 dark:border-white/5 rounded-xl focus:border-emerald-500 outline-none dark:text-white"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Alamat Lengkap"
                    className="w-full p-3 text-sm bg-gray-50 dark:bg-[#1C2128] border border-gray-100 dark:border-white/5 rounded-xl focus:border-emerald-500 outline-none dark:text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">COD</label>
                  <input
                    type="text"
                    value={formData.cod}
                    onChange={(e) => setFormData(prev => ({ ...prev, cod: e.target.value }))}
                    placeholder="274,398"
                    className="w-full p-3 text-sm bg-gray-50 dark:bg-[#1C2128] border border-gray-100 dark:border-white/5 rounded-xl focus:border-emerald-500 outline-none dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">DFOD</label>
                  <input
                    type="text"
                    value={formData.dfod}
                    onChange={(e) => setFormData(prev => ({ ...prev, dfod: e.target.value }))}
                    placeholder="10,000"
                    className="w-full p-3 text-sm bg-gray-50 dark:bg-[#1C2128] border border-gray-100 dark:border-white/5 rounded-xl focus:border-emerald-500 outline-none dark:text-white"
                  />
                </div>
                <button
                  type="submit"
                  className="py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={18} /> Add to Queue
                </button>
              </div>
            </form>
          </section>

          {/* Queue Table */}
          <div className="bg-white dark:bg-[#16191F] rounded-3xl shadow-sm border border-black/5 dark:border-white/5 overflow-hidden">
            <div className="p-6 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-emerald-500" />
                <h2 className="font-bold">Queue Management</h2>
                <span className="ml-2 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-[10px] font-bold text-gray-500 dark:text-gray-400 rounded-md">{filteredEntries.length} items</span>
              </div>
              
              {isConfirmingClear ? (
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                  <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase">Confirm?</span>
                  <button onClick={clearAll} className="px-3 py-1.5 text-[10px] font-bold uppercase bg-red-500 text-white rounded-lg">Yes</button>
                  <button onClick={() => setIsConfirmingClear(false)} className="px-3 py-1.5 text-[10px] font-bold uppercase bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg">No</button>
                </div>
              ) : (
                <button onClick={() => setIsConfirmingClear(true)} className="p-2 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                  <Trash2 size={18} />
                </button>
              )}
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-gray-900/20">
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Recipient</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Details</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                  <AnimatePresence mode="popLayout">
                    {filteredEntries.length === 0 ? (
                      <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                        <td colSpan={4} className="px-6 py-16 text-gray-400 dark:text-gray-600 text-sm italic">
                          No matching records found.
                        </td>
                      </motion.tr>
                    ) : (
                      filteredEntries.map((entry, index) => (
                        <motion.tr
                          key={entry.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className={cn(
                            "group transition-all",
                            isBlasting && index === currentIndex 
                              ? "bg-emerald-50/80 dark:bg-emerald-900/10" 
                              : "hover:bg-gray-50/50 dark:hover:bg-gray-900/10"
                          )}
                        >
                          <td className="px-6 py-5">
                            <div className="font-bold text-sm">{entry.recipientName}</div>
                            <div className="text-xs text-gray-400 dark:text-gray-500 font-mono">{entry.phone}</div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="text-sm font-medium truncate max-w-[200px]" title={entry.itemName}>{entry.itemName || '-'}</div>
                            <div className="flex flex-col gap-1">
                              <div className="text-[10px] text-gray-400 dark:text-gray-500 font-mono uppercase tracking-wider">Resi: {entry.receiptNumber || '-'}</div>
                              {entry.address && <div className="text-[10px] text-gray-400 dark:text-gray-500 truncate max-w-[200px]" title={entry.address}>{entry.address}</div>}
                              <div className="flex gap-2">
                                {entry.cod && <div className="text-[10px] text-amber-600 dark:text-amber-500 font-bold uppercase tracking-wider">COD: Rp {entry.cod}</div>}
                                {entry.dfod && <div className="text-[10px] text-blue-600 dark:text-blue-500 font-bold uppercase tracking-wider">DFOD: Rp {entry.dfod}</div>}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className={cn(
                              "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                              entry.status === 'sent' 
                                ? "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400" 
                                : "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
                            )}>
                              {entry.status === 'sent' ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                              {entry.status}
                            </div>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleSendManual(entry)} className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl"><ExternalLink size={16} /></button>
                              <button onClick={() => setEntries(prev => prev.filter(e => e.id !== entry.id))} className="p-2 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 rounded-xl"><Trash2 size={16} /></button>
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
        </div>
      </main>

      {/* Bulk Import Modal */}
      <AnimatePresence>
        {showBulkModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowBulkModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-2xl bg-white dark:bg-[#16191F] rounded-[2rem] shadow-2xl overflow-hidden border border-black/5 dark:border-white/10">
              <div className="p-8 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center"><FileSpreadsheet size={20} /></div>
                  <div>
                    <h2 className="text-xl font-bold">Bulk Import</h2>
                    <p className="text-xs text-gray-400 dark:text-gray-500">Copy-paste data from Excel or CSV</p>
                  </div>
                </div>
                <button onClick={() => setShowBulkModal(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors"><X size={20} /></button>
              </div>
              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-900/20">
                    <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Step 1</div>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300">Kolom: No, Resi, Nama, HP, Alamat, Tanda COD, Nominal COD, DFOD, Barang</p>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/20">
                    <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">Step 2</div>
                    <p className="text-xs text-blue-800 dark:text-blue-300">Copy range dari Excel & Paste di bawah</p>
                  </div>
                </div>
                <textarea
                  value={bulkData}
                  onChange={(e) => setBulkData(e.target.value)}
                  placeholder="08123456789	Budi Santoso	Sepatu	JX123456	274,398..."
                  className="w-full h-64 p-6 text-sm font-mono bg-gray-50 dark:bg-[#1C2128] border border-gray-100 dark:border-white/5 rounded-[1.5rem] focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all resize-none dark:text-white custom-scrollbar"
                />
                <div className="flex gap-4">
                  <button onClick={() => setShowBulkModal(false)} className="flex-1 py-4 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-2xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all">Cancel</button>
                  <button onClick={handleBulkImport} className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all">Import Data</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreviewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPreviewModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-lg bg-white dark:bg-[#16191F] rounded-[2rem] shadow-2xl overflow-hidden border border-black/5 dark:border-white/10">
              <div className="p-6 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center"><MessageSquare size={20} /></div>
                  <div>
                    <h2 className="text-lg font-bold">Message Preview</h2>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">First Pending Entry</p>
                  </div>
                </div>
                <button onClick={() => setShowPreviewModal(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-4">
                {entries.find(e => e.status === 'pending') ? (
                  <>
                    <div className="p-4 bg-gray-50 dark:bg-[#1C2128] rounded-2xl border border-gray-100 dark:border-white/5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center text-xs font-bold">
                          {entries.find(e => e.status === 'pending')?.recipientName.charAt(0)}
                        </div>
                        <div>
                          <div className="text-xs font-bold">{entries.find(e => e.status === 'pending')?.recipientName}</div>
                          <div className="text-[10px] text-gray-400 font-mono">{entries.find(e => e.status === 'pending')?.phone}</div>
                        </div>
                      </div>
                      <div className="bg-white dark:bg-[#16191F] p-4 rounded-xl border border-black/5 dark:border-white/10 text-sm whitespace-pre-wrap leading-relaxed dark:text-gray-300 font-sans">
                        {generateMessage(entries.find(e => e.status === 'pending')!)}
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => setShowPreviewModal(false)} className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl font-bold text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-all">Close</button>
                      <button 
                        onClick={() => {
                          const entry = entries.find(e => e.status === 'pending');
                          if (entry) {
                            handleSendManual(entry);
                            setShowPreviewModal(false);
                          }
                        }} 
                        className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                      >
                        <Send size={16} /> Send Now
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <Clock size={48} className="mx-auto text-gray-200 dark:text-gray-800 mb-4" />
                    <p className="text-gray-400 dark:text-gray-600 text-sm italic">No pending entries to preview.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-black/5 dark:border-white/5 text-center">
        <div className="text-[10px] text-gray-400 dark:text-gray-600 uppercase tracking-[0.3em] font-mono font-bold">
          WAsender PRO Engine • v2.0.0 • Enterprise Edition
        </div>
      </footer>
    </div>
  );
}
