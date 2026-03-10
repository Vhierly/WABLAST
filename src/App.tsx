import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Send, 
  Trash2, 
  Play, 
  Square, 
  MessageSquare, 
  User, 
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
  Moon,
  Sun,
  RotateCcw,
  Puzzle,
  Loader2,
  Zap
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
  LogEntry,
  MessageTemplate, 
  DEFAULT_TEMPLATES, 
  AppSettings, 
  DEFAULT_SETTINGS 
} from './types';
import { downloadExtensionZip } from './utils/extensionDownloader';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [entries, setEntries] = useState<BlastEntry[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>(DEFAULT_TEMPLATES);
  const [activeTemplateId, setActiveTemplateId] = useState<string>(DEFAULT_TEMPLATES[0].id);
  const [activeVariationIndex, setActiveVariationIndex] = useState(0);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isBlasting, setIsBlasting] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'general' | 'antispam'>('general');
  const [countdown, setCountdown] = useState(0);
  const [nextBatchPauseAt, setNextBatchPauseAt] = useState(0);
  const [bulkData, setBulkData] = useState('');
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isExtensionDetected, setIsExtensionDetected] = useState(false);
  const [lastHeartbeat, setLastHeartbeat] = useState(0);
  const [sentThisHour, setSentThisHour] = useState(0);
  const [lastHourReset, setLastHourReset] = useState(Date.now());
  const [isLongBreak, setIsLongBreak] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('wa_blast_theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  const [nextActionTime, setNextActionTime] = useState(0);
  
  const [formData, setFormData] = useState({
    phone: '',
    recipientName: '',
    itemName: '',
    receiptNumber: '',
    address: '',
    cod: '',
    dfod: ''
  });

  // Data Persistence
  useEffect(() => {
    const savedEntries = localStorage.getItem('wa_blast_entries');
    const savedTemplates = localStorage.getItem('wa_blast_templates');
    const savedActiveId = localStorage.getItem('wa_blast_active_template_id');
    const savedSettings = localStorage.getItem('wa_blast_settings');
    
    if (savedEntries) setEntries(JSON.parse(savedEntries));
    if (savedTemplates) setTemplates(JSON.parse(savedTemplates));
    if (savedActiveId) setActiveTemplateId(savedActiveId);
    if (savedSettings) setSettings(JSON.parse(savedSettings));
  }, []);

  useEffect(() => localStorage.setItem('wa_blast_entries', JSON.stringify(entries)), [entries]);
  useEffect(() => localStorage.setItem('wa_blast_templates', JSON.stringify(templates)), [templates]);
  useEffect(() => localStorage.setItem('wa_blast_active_template_id', activeTemplateId), [activeTemplateId]);
  useEffect(() => localStorage.setItem('wa_blast_settings', JSON.stringify(settings)), [settings]);
  
  useEffect(() => {
    const theme = isDarkMode ? 'dark' : 'light';
    localStorage.setItem('wa_blast_theme', theme);
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  const activeTemplate = templates.find(t => t.id === activeTemplateId) || templates[0];
  const currentTemplateText = activeTemplate.variations?.[activeVariationIndex] || activeTemplate.text;

  const updateActiveTemplateText = (text: string) => {
    setTemplates(prev => prev.map(t => {
      if (t.id === activeTemplateId) {
        const variations = t.variations || [t.text, t.text, t.text];
        const newVariations = [...variations];
        newVariations[activeVariationIndex] = text;
        return { ...t, text: activeVariationIndex === 0 ? text : t.text, variations: newVariations };
      }
      return t;
    }));
  };

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    const newLog: LogEntry = { id: crypto.randomUUID(), timestamp: Date.now(), message, type };
    setLogs(prev => [newLog, ...prev].slice(0, 100));
  };

  const updateStatus = (id: string, status: BlastEntry['status']) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, status } : e));
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    let base = hour >= 5 && hour < 11 ? 'Pagi' : hour >= 11 && hour < 15 ? 'Siang' : hour >= 15 && hour < 18 ? 'Sore' : 'Malam';
    if (settings.useRandomGreetings) {
      const variations = [`Selamat ${base}`, `${base} Kak`, `Halo, Selamat ${base}`, `Halo Kak`, `Permisi, Selamat ${base}`, base];
      return variations[Math.floor(Math.random() * variations.length)];
    }
    return `Selamat ${base}`;
  };

  // LOGIC: DYNAMIC MESSAGE GENERATOR
  const generateMessage = (entry: BlastEntry, templateText?: string) => {
    let text = templateText || activeTemplate.text;

    // Handle COD Logic
    const isCOD = entry.cod && entry.cod !== '0' && entry.cod !== '-';
    if (isCOD) {
      text = text.replace(/{if_cod}/gi, '').replace(/{\/if_cod}/gi, '');
      text = text.replace(/{if_non_cod}[\s\S]*?{\/if_non_cod}/gi, '');
    } else {
      text = text.replace(/{if_cod}[\s\S]*?{\/if_cod}/gi, '');
      text = text.replace(/{if_non_cod}/gi, '').replace(/{\/if_non_cod}/gi, '');
    }

    // Handle DFOD Logic
    const isDFOD = entry.dfod && entry.dfod !== '0' && entry.dfod !== '-';
    if (isDFOD) {
      text = text.replace(/{if_dfod}/gi, '').replace(/{\/if_dfod}/gi, '');
    } else {
      text = text.replace(/{if_dfod}[\s\S]*?{\/if_dfod}/gi, '');
    }

    let finalMessage = text
      .replace(/{salam}/gi, getGreeting())
      .replace(/{pengirim}/gi, settings.senderName || 'Admin')
      .replace(/{nama}/gi, entry.recipientName)
      .replace(/{barang}/gi, entry.itemName || '-')
      .replace(/{resi}/gi, entry.receiptNumber || '-')
      .replace(/{alamat}/gi, entry.address || '-')
      .replace(/{cod}/gi, entry.cod || '-')
      .replace(/{dfod}/gi, entry.dfod || '-');

    // Anti-Spam Post-Processing
    if (settings.useGlobalSpintax) {
      finalMessage = finalMessage.replace(/{([^{}]+)}/g, (_, p1) => p1.includes('|') ? p1.split('|')[Math.floor(Math.random() * p1.split('|').length)] : _);
    }
    if (settings.randomizeEmojis) {
      const emojis = ['😊', '🙏', '📦', '🚚', '✨', '✅', '📍'];
      finalMessage = finalMessage.split(' ').map(word => Math.random() > 0.9 ? word + ' ' + emojis[Math.floor(Math.random() * emojis.length)] : word).join(' ');
    }
    if (settings.addRandomSuffix) finalMessage += `\n\n_Ref: ${Math.random().toString(36).substring(7).toUpperCase()}_`;
    if (settings.useInvisibleChars) finalMessage = finalMessage.split(' ').map(word => Math.random() > 0.7 ? word + '\u200B' : word).join(' ');

    return finalMessage;
  };

  const getWALink = (entry: BlastEntry, sentCountOverride?: number) => {
    let phone = entry.phone.replace(/\D/g, '');
    if (phone.startsWith('0')) phone = '62' + phone.slice(1);
    if (!phone.startsWith('62')) phone = '62' + phone;
    
    let templateText = activeTemplate.text;
    
    // FIX: Only rotate variations of the CURRENTLY SELECTED template
    if (settings.rotateTemplates && activeTemplate.variations && activeTemplate.variations.length > 0) {
      const count = sentCountOverride !== undefined ? sentCountOverride : entries.filter(e => e.status === 'sent').length;
      templateText = activeTemplate.variations[count % activeTemplate.variations.length] || activeTemplate.text;
    }
    
    const message = encodeURIComponent(generateMessage(entry, templateText));
    let link = `https://web.whatsapp.com/send?phone=${phone}&text=${message}`;
    if (settings.autoSend) link += '&autosend=true';
    link += `&entryid=${entry.id}`;
    return link;
  };

  // Blast Engine Tick
  useEffect(() => {
    if (!isBlasting || settings.manualMode) { setCountdown(0); return; }
    
    const interval = setInterval(() => {
      const now = Date.now();
      if (now - lastHourReset > 3600000) { setSentThisHour(0); setLastHourReset(now); }
      if (sentThisHour >= settings.hourlyLimit) { setIsBlasting(false); addLog('⏳ Limit per jam tercapai', 'warning'); return; }

      const pending = entries.filter(e => e.status === 'pending');
      if (entries.some(e => e.status === 'sending')) return;

      if (pending.length > 0) {
        if (now >= nextActionTime) {
          const entry = pending[0];
          const newWindow = window.open(getWALink(entry), 'WAsenderTab');
          if (newWindow) {
            window.focus();
            if (settings.autoSend) updateStatus(entry.id, 'sending');
            else {
              updateStatus(entry.id, 'sent');
              setNextActionTime(Date.now() + calculateNextDelay());
            }
          } else {
            setNextActionTime(Date.now() + 3000);
            toast.error('Popup terblokir!');
          }
        } else {
          setCountdown(Math.ceil((nextActionTime - now) / 1000));
        }
      } else {
        setIsBlasting(false);
        addLog('🏁 Blast Selesai!', 'success');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isBlasting, entries, nextActionTime, settings, sentThisHour]);

  const calculateNextDelay = () => {
    let delay = settings.delay;
    if (settings.randomizeDelay) {
      delay = Math.floor(Math.random() * (settings.maxDelay - settings.delay + 1)) + settings.delay;
    }
    return delay;
  };

  const startBlast = () => {
    const pending = entries.filter(e => e.status === 'pending');
    if (pending.length === 0) return toast.error('Antrean kosong');
    
    setIsBlasting(true);
    setNextActionTime(Date.now()); // Start immediately
  };

  // Keyboard Support
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (isBlasting && settings.manualMode && (e.code === 'Space' || e.code === 'Enter')) {
        const pending = entries.filter(ent => ent.status === 'pending');
        if (pending.length > 0) {
          window.open(getWALink(pending[0]), 'WAsenderTab');
          updateStatus(pending[0].id, 'sent');
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isBlasting, entries, settings.manualMode]);

  return (
    <div className={cn("min-h-screen bg-[#F8F9FA] dark:bg-[#0F1115] text-[#1A1A1A] dark:text-[#E4E6EB] transition-colors", isDarkMode && "dark")}>
      <Toaster position="top-right" />

      {/* Progress UI */}
      {isBlasting && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white dark:bg-[#16191F] rounded-3xl p-8 max-w-md w-full text-center space-y-6 shadow-2xl border border-white/10">
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full" />
              <div className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center"><Play size={24} className="text-emerald-500 fill-current" /></div>
            </div>
            <div>
              <h3 className="text-xl font-bold">{entries.some(e => e.status === 'sending') ? '⏳ Memuat WA...' : '🚀 Engine Running'}</h3>
              <p className="text-sm text-gray-500 mt-1">Selesai: {entries.filter(e => e.status === 'sent').length} / {entries.length}</p>
              {!settings.manualMode && (
                <div className="text-4xl font-black text-emerald-600 mt-4 tabular-nums">
                   {entries.some(e => e.status === 'sending') ? '--:--' : `${Math.floor(countdown / 60)}:${(countdown % 60).toString().padStart(2, '0')}`}
                </div>
              )}
            </div>
            <button onClick={() => setIsBlasting(false)} className="w-full py-3 bg-red-500 text-white rounded-2xl font-bold">Stop Blast</button>
          </div>
        </div>
      )}

      <header className="h-20 border-b border-black/5 dark:border-white/5 bg-white/80 dark:bg-[#16191F]/80 backdrop-blur-md sticky top-0 z-30 px-6">
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg"><Send size={20} /></div>
            <h1 className="text-xl font-bold">WAsender <span className="text-emerald-600">PRO</span></h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl">{isDarkMode ? <Sun size={18} /> : <Moon size={18} />}</button>
            <button onClick={() => setShowSettingsModal(true)} className="p-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl"><Settings2 size={18} /></button>
            <button onClick={startBlast} disabled={isBlasting || entries.length === 0} className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold disabled:opacity-50 flex items-center gap-2"><Play size={16} fill="white" /> Start</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Config */}
        <div className="lg:col-span-4 space-y-6">
          <section className="bg-white dark:bg-[#16191F] rounded-3xl p-6 border border-black/5 shadow-sm">
            <h2 className="font-bold flex items-center gap-2 mb-4"><MessageSquare size={18} className="text-emerald-500" /> Templates</h2>
            <div className="flex gap-2 overflow-x-auto pb-3 custom-scrollbar">
              {templates.map(t => (
                <button key={t.id} onClick={() => { setActiveTemplateId(t.id); setActiveVariationIndex(0); }} className={cn("px-4 py-2 rounded-xl text-xs font-bold border whitespace-nowrap", activeTemplateId === t.id ? "bg-emerald-600 text-white border-emerald-600" : "bg-gray-50 dark:bg-gray-800 text-gray-500 border-gray-100")}>{t.name}</button>
              ))}
            </div>
            <div className="flex gap-2 mb-3 mt-2">
              {[0, 1, 2].map(i => (
                <button key={i} onClick={() => setActiveVariationIndex(i)} className={cn("w-8 h-8 rounded-lg text-xs font-bold border", activeVariationIndex === i ? "bg-emerald-100 text-emerald-600 border-emerald-200" : "bg-gray-50 text-gray-400 border-gray-100")}>{i + 1}</button>
              ))}
            </div>
            <textarea value={currentTemplateText} onChange={(e) => updateActiveTemplateText(e.target.value)} className="w-full h-48 p-4 text-sm bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none" placeholder="Tulis template..." />
            <div className="mt-4 flex flex-wrap gap-2">
               {['{salam}', '{nama}', '{barang}', '{resi}', '{alamat}', '{cod}', '{if_cod}', '{if_non_cod}'].map(tag => (
                 <button key={tag} onClick={() => updateActiveTemplateText(currentTemplateText + ' ' + tag)} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-[10px] font-mono">{tag}</button>
               ))}
            </div>
          </section>
        </div>

        {/* Right: Queue */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex gap-4 items-center bg-white dark:bg-[#16191F] p-4 rounded-3xl border border-black/5">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Cari nomor, nama, atau resi..." className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none text-sm" />
            </div>
            <button onClick={() => setShowBulkModal(true)} className="px-6 py-3 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 rounded-2xl font-bold text-sm flex items-center gap-2"><FileSpreadsheet size={18} /> Bulk Import</button>
          </div>

          <div className="bg-white dark:bg-[#16191F] rounded-3xl border border-black/5 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-black/5 flex items-center justify-between">
              <h2 className="font-bold flex items-center gap-2"><FileText size={18} className="text-emerald-500" /> Antrean Pesan</h2>
              <button onClick={() => setEntries([])} className="p-2 text-gray-300 hover:text-red-500"><Trash2 size={18} /></button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-gray-900/20 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    <th className="px-6 py-4">Penerima</th>
                    <th className="px-6 py-4">Detail Paket</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {entries.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic text-sm">Belum ada data antrean. Silakan import dari Excel.</td></tr>
                  ) : (
                    entries.filter(e => e.recipientName.toLowerCase().includes(searchQuery.toLowerCase()) || e.receiptNumber.includes(searchQuery)).map((entry, idx) => (
                      <tr key={entry.id} className={cn("hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors", idx === currentIndex && "bg-emerald-50/50")}>
                        <td className="px-6 py-4">
                          <div className="font-bold text-sm">{entry.recipientName}</div>
                          <div className="text-xs text-gray-400">{entry.phone}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs font-medium">{entry.itemName}</div>
                          <div className="text-[10px] text-gray-400">Resi: {entry.receiptNumber}</div>
                          {entry.cod && entry.cod !== '0' && <div className="text-[10px] text-amber-600 font-bold">COD: Rp {entry.cod}</div>}
                        </td>
                        <td className="px-6 py-4">
                          <div className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase", entry.status === 'sent' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
                            {entry.status}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => window.open(getWALink(entry), 'WAsenderTab')} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"><ExternalLink size={16} /></button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettingsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setShowSettingsModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full max-w-md bg-white dark:bg-[#16191F] rounded-[2rem] p-8 shadow-2xl">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Settings2 className="text-emerald-500" /> Pengaturan Engine</h2>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Nama Pengirim</label>
                  <input type="text" value={settings.senderName} onChange={e => setSettings(p => ({...p, senderName: e.target.value}))} className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none" />
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                  <div className="text-sm font-bold">Rotasi Template</div>
                  <button onClick={() => setSettings(p => ({...p, rotateTemplates: !p.rotateTemplates}))} className={cn("w-10 h-5 rounded-full relative transition-all", settings.rotateTemplates ? "bg-emerald-500" : "bg-gray-300")}>
                    <div className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all", settings.rotateTemplates ? "left-5.5" : "left-0.5")} />
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                  <div className="text-sm font-bold">Auto Send (Extension)</div>
                  <button onClick={() => setSettings(p => ({...p, autoSend: !p.autoSend}))} className={cn("w-10 h-5 rounded-full relative transition-all", settings.autoSend ? "bg-emerald-500" : "bg-gray-300")}>
                    <div className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all", settings.autoSend ? "left-5.5" : "left-0.5")} />
                  </button>
                </div>
              </div>
              <button onClick={() => setShowSettingsModal(false)} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold mt-6 shadow-lg">Simpan Konfigurasi</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Import Modal */}
      <AnimatePresence>
        {showBulkModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setShowBulkModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-2xl bg-white dark:bg-[#16191F] rounded-[2rem] p-8 shadow-2xl flex flex-col">
              <h2 className="text-xl font-bold mb-2 flex items-center gap-2"><FileSpreadsheet className="text-emerald-500" /> Import dari Excel</h2>
              <p className="text-xs text-gray-400 mb-6">Copy baris dari Excel dan paste di bawah ini. Pastikan urutan kolom sesuai.</p>
              <textarea value={bulkData} onChange={e => setBulkData(e.target.value)} placeholder="No | Resi | Nama | HP | Alamat | Tanda | COD | DFOD | Barang" className="w-full h-64 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl font-mono text-xs outline-none border-none resize-none" />
              <div className="flex gap-4 mt-6">
                <button onClick={() => setShowBulkModal(false)} className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl font-bold">Batal</button>
                <button onClick={() => {
                   const lines = bulkData.trim().split('\n');
                   const newEntries: BlastEntry[] = lines.map(line => {
                     const cols = line.split('\t');
                     return {
                       id: crypto.randomUUID(),
                       receiptNumber: cols[1] || '',
                       recipientName: cols[2] || '',
                       phone: cols[3] || '',
                       address: cols[4] || '',
                       cod: cols[6] || '0',
                       dfod: cols[7] || '0',
                       itemName: cols[8] || '',
                       status: 'pending',
                       isReceived: false,
                       createdAt: Date.now()
                     };
                   });
                   setEntries(prev => [...newEntries, ...prev]);
                   setBulkData('');
                   setShowBulkModal(false);
                   toast.success(`${newEntries.length} data berhasil diimport`);
                }} className="flex-[2] py-3 bg-emerald-600 text-white rounded-xl font-bold">Import Sekarang</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
