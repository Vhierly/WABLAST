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
  RotateCcw,
  Shield,
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

const formatCurrency = (val: string) => {
  if (!val) return '';
  const num = parseInt(val.replace(/\D/g, ''));
  return isNaN(num) ? val : new Intl.NumberFormat('id-ID').format(num);
};

// Toggle Switch Component
const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
  <button
    onClick={onChange}
    className={cn(
      "relative w-11 h-6 rounded-full transition-all duration-300 border",
      checked 
        ? "bg-[#00FF88]/20 border-[#00FF88]/50" 
        : "bg-[#0A0F14] border-[#1E2D3D]"
    )}
  >
    <div className={cn(
      "absolute top-0.5 w-5 h-5 rounded-full transition-all duration-300 shadow-sm",
      checked 
        ? "left-5 bg-[#00FF88] shadow-[0_0_8px_#00FF88]" 
        : "left-0.5 bg-[#2A3F52]"
    )} />
  </button>
);

// Input Component
const GlassInput = ({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className={cn(
      "w-full px-4 py-2.5 text-sm bg-[#060C12] border border-[#1E2D3D] rounded-lg",
      "text-[#C8D8E8] placeholder-[#3A5068] outline-none",
      "focus:border-[#00FF88]/50 focus:bg-[#060C12] focus:shadow-[0_0_0_1px_rgba(0,255,136,0.15)]",
      "transition-all duration-200 font-mono",
      className
    )}
  />
);

// Label Component
const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <label className="text-[9px] font-bold text-[#3A5068] uppercase tracking-[0.2em] font-mono">{children}</label>
);

// Card Component
const GlassCard = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={cn(
    "bg-[#0A0F14]/80 border border-[#1E2D3D] rounded-2xl backdrop-blur-sm",
    "shadow-[0_4px_32px_rgba(0,0,0,0.4)]",
    className
  )}>
    {children}
  </div>
);

// Section Header
const SectionHeader = ({ icon: Icon, title, right }: { icon: any; title: string; right?: React.ReactNode }) => (
  <div className="flex items-center justify-between mb-5">
    <div className="flex items-center gap-2.5">
      <div className="w-6 h-6 rounded-md bg-[#00FF88]/10 flex items-center justify-center">
        <Icon size={13} className="text-[#00FF88]" />
      </div>
      <span className="text-sm font-bold text-[#C8D8E8] tracking-wide font-mono">{title}</span>
    </div>
    {right}
  </div>
);

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
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);
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

  useEffect(() => {
    const savedEntries = localStorage.getItem('wa_blast_entries');
    const savedTemplates = localStorage.getItem('wa_blast_templates');
    const savedActiveId = localStorage.getItem('wa_blast_active_template_id');
    const savedSettings = localStorage.getItem('wa_blast_settings');
    
    if (savedEntries) setEntries(JSON.parse(savedEntries));
    if (savedTemplates) {
      const parsedTemplates: MessageTemplate[] = JSON.parse(savedTemplates);
      const mergedTemplates = [...parsedTemplates];
      DEFAULT_TEMPLATES.forEach(def => {
        if (!mergedTemplates.find(t => t.id === def.id)) mergedTemplates.push(def);
      });
      setTemplates(mergedTemplates);
    }
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
      addLog(`🔄 Sistem direset ke pengaturan awal`, 'warning');
      localStorage.clear();
      window.location.reload();
    }
  };

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
      isReceived: false,
      createdAt: Date.now()
    };
    setEntries(prev => [newEntry, ...prev]);
    setFormData({ phone: '', recipientName: '', itemName: '', receiptNumber: '', address: '', cod: '', dfod: '' });
    addLog(`➕ Data ditambahkan: ${newEntry.recipientName} (${newEntry.phone})`, 'info');
    toast.success('Data ditambahkan');
  };

  const handleBulkImport = () => {
    if (!bulkData.trim()) { toast.error('Data kosong'); return; }
    const lines = bulkData.trim().split(/\r?\n/);
    const newEntries: BlastEntry[] = [];
    let successCount = 0;
    lines.forEach(line => {
      const delimiter = line.includes('\t') ? '\t' : ',';
      const columns = line.split(delimiter).map(col => col.trim());
      if (columns.length >= 4) {
        const firstCol = columns[0].toLowerCase();
        const secondCol = (columns[1] || '').toLowerCase();
        if (firstCol === 'no' || secondCol === 'resi/awb' || secondCol === 'resi') return;
        const tanda = (columns[5] || '').toUpperCase();
        const rawCod = columns[6] || '';
        const rawDfod = columns[7] || '';
        const itemNameValue = columns[8] || '';
        let cod = '';
        let dfod = '';
        if (tanda === 'COD') {
          const cleanCod = rawCod.replace(/[^0-9]/g, '');
          if (cleanCod && !isNaN(Number(cleanCod))) cod = cleanCod;
        } else if (tanda === 'DFOD') {
          const cleanDfod = rawDfod.replace(/[^0-9]/g, '');
          if (cleanDfod && !isNaN(Number(cleanDfod))) dfod = cleanDfod;
        }
        newEntries.push({ id: crypto.randomUUID(), receiptNumber: columns[1] || '', recipientName: columns[2] || '', phone: columns[3] || '', address: columns[4] || '', itemName: itemNameValue, cod, dfod, status: 'pending', isReceived: false, createdAt: Date.now() });
        successCount++;
      }
    });
    if (newEntries.length > 0) {
      setEntries(prev => [...newEntries, ...prev]);
      setBulkData('');
      setShowBulkModal(false);
      addLog(`📥 Bulk Import: ${successCount} data berhasil diimpor`, 'success');
      toast.success(`${successCount} data berhasil diimpor`);
    } else {
      toast.error('Format data tidak valid.');
    }
  };

  const clearAll = () => {
    setEntries([]);
    setIsConfirmingClear(false);
    addLog(`🗑️ Semua data antrean dihapus`, 'warning');
    toast.success('Semua data dihapus');
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    let base = '';
    if (hour >= 5 && hour < 11) base = 'Pagi';
    else if (hour >= 11 && hour < 15) base = 'Siang';
    else if (hour >= 15 && hour < 18) base = 'Sore';
    else base = 'Malam';
    if (settings.useRandomGreetings) {
      const variations = [`Selamat ${base}`, `${base} Kak`, `Halo, Selamat ${base}`, `Halo Kak, Selamat ${base}`, `Permisi, Selamat ${base}`, `Halo`, base];
      return variations[Math.floor(Math.random() * variations.length)];
    }
    return `Selamat ${base}`;
  };

  const generateMessage = (entry: BlastEntry, templateText?: string) => {
    let text = templateText || activeTemplate.text;
    if (!entry.cod) text = text.replace(/{if_cod}[\s\S]*?{\/if_cod}/gi, '');
    else text = text.replace(/{if_cod}/gi, '').replace(/{\/if_cod}/gi, '');
    if (!entry.dfod) text = text.replace(/{if_dfod}[\s\S]*?{\/if_dfod}/gi, '');
    else text = text.replace(/{if_dfod}/gi, '').replace(/{\/if_dfod}/gi, '');
    let finalMessage = text
      .replace(/{salam}/gi, getGreeting())
      .replace(/{pengirim}/gi, settings.senderName || 'Admin')
      .replace(/{nama}/gi, entry.recipientName)
      .replace(/{barang}/gi, entry.itemName || '-')
      .replace(/{resi}/gi, entry.receiptNumber || '-')
      .replace(/{alamat}/gi, entry.address || '-')
      .replace(/{cod}/gi, entry.cod ? `Rp ${formatCurrency(entry.cod)}` : '-')
      .replace(/{dfod}/gi, entry.dfod ? `Rp ${formatCurrency(entry.dfod)}` : '-');
    if (settings.useGlobalSpintax) {
      finalMessage = finalMessage.replace(/{([^{}]+)}/g, (match, p1) => {
        if (p1.includes('|')) { const choices = p1.split('|'); return choices[Math.floor(Math.random() * choices.length)]; }
        return match;
      });
    }
    if (settings.randomizeEmojis) {
      const emojis = ['😊', '🙏', '📦', '🚚', '✨', '✅', '📍', '🚚', '📦', '🚛'];
      const words = finalMessage.split(' ');
      finalMessage = words.map(word => { if (Math.random() > 0.9) return word + ' ' + emojis[Math.floor(Math.random() * emojis.length)]; return word; }).join(' ');
    }
    if (settings.addRandomSuffix) finalMessage += `\n\n_Ref: ${Math.random().toString(36).substring(7).toUpperCase()}_`;
    if (settings.useInvisibleChars) {
      const zwsp = '\u200B';
      const words = finalMessage.split(' ');
      finalMessage = words.map(word => { if (Math.random() > 0.7) return word + zwsp; return word; }).join(' ');
    }
    if (settings.randomizeFormatting) {
      const paragraphs = finalMessage.split('\n\n');
      finalMessage = paragraphs.map((p, i) => {
        if (i === paragraphs.length - 1) return p;
        const rand = Math.random();
        if (rand > 0.8) return p + '\n\n\n';
        if (rand > 0.6) return p + '\n';
        return p + '\n\n';
      }).join('');
    }
    return finalMessage;
  };

  const getWALink = (entry: BlastEntry, sentCountOverride?: number) => {
    let phone = entry.phone.replace(/\D/g, '');
    if (phone.startsWith('0')) phone = '62' + phone.slice(1);
    if (!phone.startsWith('62')) phone = '62' + phone;
    let templateText = activeTemplate.text;
    if (settings.rotateTemplates) {
      const count = sentCountOverride !== undefined ? sentCountOverride : entries.filter(e => e.status === 'sent').length;
      const variations = activeTemplate.variations && activeTemplate.variations.length > 0 ? activeTemplate.variations : [activeTemplate.text];
      templateText = variations[count % variations.length];
    }
    const message = encodeURIComponent(generateMessage(entry, templateText));
    let link = `https://web.whatsapp.com/send?phone=${phone}&text=${message}`;
    if (settings.autoSend) link += '&autosend=true';
    link += `&entryid=${entry.id}`;
    return link;
  };

  const handleSendManual = (entry: BlastEntry) => {
    const newWindow = window.open(getWALink(entry), 'WAsenderTab');
    if (newWindow) window.focus();
    addLog(`🚀 Mengirim manual ke ${entry.recipientName} (${entry.receiptNumber})`, 'info');
    updateStatus(entry.id, 'sent');
  };

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    const newLog: LogEntry = { id: crypto.randomUUID(), timestamp: Date.now(), message, type };
    setLogs(prev => [newLog, ...prev].slice(0, 100));
  };

  const updateStatus = (id: string, status: BlastEntry['status']) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, status } : e));
  };

  const toggleReceived = (id: string) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, isReceived: !e.isReceived } : e));
  };

  const calculateNextDelay = (sentCount: number, entry: BlastEntry) => {
    let minDelay = settings.delay;
    let maxDelay = settings.maxDelay;
    let useTyping = settings.simulateTyping;
    let useAdaptive = settings.adaptiveDelay;
    if (settings.speedMode === 'safe') { minDelay = 15000; maxDelay = 30000; useTyping = true; useAdaptive = true; }
    else if (settings.speedMode === 'normal') { minDelay = 8000; maxDelay = 15000; useTyping = true; useAdaptive = true; }
    else if (settings.speedMode === 'fast') { minDelay = 3000; maxDelay = 7000; useTyping = false; useAdaptive = false; }
    else if (settings.speedMode === 'turbo') { minDelay = 1000; maxDelay = 2000; useTyping = false; useAdaptive = false; }
    let currentDelay = settings.randomizeDelay || settings.speedMode !== 'custom' ? Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay : minDelay;
    if (useAdaptive) currentDelay += Math.floor(sentCount / 10) * 500;
    if (useTyping) {
      let templateText = activeTemplate.text;
      if (settings.rotateTemplates) {
        const variations = activeTemplate.variations && activeTemplate.variations.length > 0 ? activeTemplate.variations : [activeTemplate.text];
        templateText = variations[sentCount % variations.length];
      }
      const message = generateMessage(entry, templateText);
      currentDelay += Math.min(message.length * 50, 5000);
    }
    if (settings.batchSize > 0 && sentCount >= nextBatchPauseAt && nextBatchPauseAt > 0) {
      currentDelay = settings.batchPause;
      toast(`Anti-Spam: Istirahat sejenak selama ${settings.batchPause / 1000} detik...`, { icon: '🛡️' });
      setNextBatchPauseAt(sentCount + settings.batchSize + (Math.floor(Math.random() * 5) - 2));
    }
    if (settings.longBreakAfter > 0 && sentCount > 0 && sentCount % settings.longBreakAfter === 0) {
      currentDelay = settings.longBreakDuration * 60 * 1000;
      setIsLongBreak(true);
      addLog(`😴 Mengambil istirahat panjang selama ${settings.longBreakDuration} menit...`, 'warning');
    } else { setIsLongBreak(false); }
    return currentDelay;
  };

  const startBlast = () => {
    if (!isExtensionDetected && !settings.manualMode) {
      toast.error('Extension tidak terdeteksi! Gunakan Mode Manual atau hubungkan extension.', { icon: '🔌' });
      return;
    }
    const pending = entries.filter(e => e.status === 'pending');
    if (pending.length === 0) { toast.error('Tidak ada pesan pending'); return; }
    let entriesToProcess = [...pending];
    if (settings.shuffleQueue) {
      entriesToProcess = entriesToProcess.sort(() => Math.random() - 0.5);
      setEntries(prev => [...prev.filter(e => e.status !== 'pending'), ...entriesToProcess]);
    }
    const firstEntry = entriesToProcess[0];
    addLog(`🎬 Memulai proses blast...${settings.shuffleQueue ? ' (Urutan Diacak)' : ''}`, 'info');
    const newWindow = window.open(getWALink(firstEntry), 'WAsenderTab');
    if (!newWindow) { toast.error('Popup terblokir! Harap izinkan popup di browser Anda.', { duration: 8000, icon: '🚫' }); return; }
    window.focus();
    if (settings.autoSend) { updateStatus(firstEntry.id, 'sending'); }
    else { updateStatus(firstEntry.id, 'sent'); setNextActionTime(Date.now() + calculateNextDelay(entries.filter(e => e.status === 'sent').length + 1, entriesToProcess[1] || firstEntry)); }
    setIsBlasting(true);
    setCurrentIndex(0);
    if (settings.batchSize > 0) setNextBatchPauseAt(entries.filter(e => e.status === 'sent').length + settings.batchSize + (Math.floor(Math.random() * 5) - 2));
  };

  const stopBlast = () => {
    setIsBlasting(false);
    setCurrentIndex(-1);
    setNextActionTime(0);
    addLog(`🛑 Proses blast dihentikan oleh pengguna`, 'warning');
  };

  useEffect(() => {
    if (isBlasting && !settings.manualMode) {
      const sendingEntry = entries.find(e => e.status === 'sending');
      if (sendingEntry) {
        let timeoutDuration = 25000;
        if (settings.speedMode === 'turbo') timeoutDuration = 5000;
        else if (settings.speedMode === 'fast') timeoutDuration = 10000;
        else if (settings.speedMode === 'normal') timeoutDuration = 15000;
        const timer = setTimeout(() => {
          addLog(`⏭️ Auto-Next: Melanjutkan otomatis untuk ${sendingEntry.recipientName}...`, 'info');
          updateStatus(sendingEntry.id, 'sent');
          const sentCount = entries.filter(e => e.status === 'sent').length + 1;
          const pending = entries.filter(e => e.status === 'pending' && e.id !== sendingEntry.id);
          if (pending.length > 0) setNextActionTime(Date.now() + calculateNextDelay(sentCount, pending[0]));
        }, timeoutDuration);
        return () => clearTimeout(timer);
      }
    }
  }, [entries, isBlasting, settings.manualMode, settings.speedMode]);

  useEffect(() => {
    const handleExtensionMessage = (event: MessageEvent) => {
      if (event.data && event.data.source === 'wasender-extension') {
        const { type, entryId, status: waStatus } = event.data;
        if (type === 'WA_STATUS_UPDATE') {
          setEntries(currentEntries => {
            const entry = currentEntries.find(e => e.id === entryId);
            if (!entry || entry.status === 'sent') return currentEntries;
            if (waStatus === 'sent') {
              setConsecutiveErrors(0);
              setSentThisHour(prev => prev + 1);
              addLog(`✅ Pesan terkirim ke ${entry.recipientName} (${entry.receiptNumber})`, 'success');
              const sentCount = currentEntries.filter(e => e.status === 'sent').length + 1;
              const pending = currentEntries.filter(e => e.status === 'pending' && e.id !== entryId);
              if (pending.length > 0) setNextActionTime(Date.now() + calculateNextDelay(sentCount, pending[0]));
              return currentEntries.map(e => e.id === entryId ? { ...e, status: 'sent' } : e);
            } else if (waStatus === 'invalid') {
              const currentRetries = entry.retryCount || 0;
              if (settings.autoRetry && currentRetries < settings.maxRetries) {
                addLog(`🔄 Nomor ${entry.recipientName} gagal, mencoba ulang (${currentRetries + 1}/${settings.maxRetries})...`, 'warning');
                return currentEntries.map(e => e.id === entryId ? { ...e, status: 'pending', retryCount: currentRetries + 1 } : e);
              } else {
                setConsecutiveErrors(prev => prev + 1);
                addLog(`❌ Nomor tidak valid: ${entry.recipientName} (${entry.receiptNumber})`, 'error');
                return currentEntries.map(e => e.id === entryId ? { ...e, status: 'failed' } : e);
              }
            }
            return currentEntries;
          });
        } else if (type === 'WA_WARNING_DETECTED') {
          stopBlast();
          addLog(`🚨 PERINGATAN SPAM TERDETEKSI OLEH WHATSAPP! Blast dihentikan demi keamanan.`, 'error');
          toast.error('PERINGATAN SPAM! Blast dihentikan.', { duration: 10000, icon: '🚨' });
        }
      }
    };
    window.addEventListener('message', handleExtensionMessage);
    const heartbeatInterval = setInterval(() => {
      if (lastHeartbeat > 0 && Date.now() - lastHeartbeat > 20000 && isExtensionDetected) {
        setIsExtensionDetected(false);
        addLog(`🔌 Extension terputus atau tidak terdeteksi`, 'warning');
      }
    }, 5000);
    return () => { window.removeEventListener('message', handleExtensionMessage); clearInterval(heartbeatInterval); };
  }, [lastHeartbeat, isExtensionDetected, settings.autoRetry, settings.maxRetries, settings.speedMode]);

  useEffect(() => {
    const handlePing = (event: MessageEvent) => {
      if (event.data && event.data.source === 'wasender-extension' && event.data.type === 'EXTENSION_PONG') {
        if (!isExtensionDetected) { setIsExtensionDetected(true); addLog(`🔌 Extension terdeteksi dan aktif`, 'success'); }
        setLastHeartbeat(Date.now());
      }
    };
    window.addEventListener('message', handlePing);
    const checkAttr = () => {
      if (document.documentElement.getAttribute('data-wasender-extension') === 'active') {
        if (!isExtensionDetected) { setIsExtensionDetected(true); addLog(`🔌 Extension terdeteksi via DOM`, 'success'); }
        setLastHeartbeat(Date.now());
      }
      window.postMessage({ type: 'EXTENSION_PING' }, '*');
    };
    const attrInterval = setInterval(checkAttr, 2000);
    checkAttr();
    return () => { window.removeEventListener('message', handlePing); clearInterval(attrInterval); };
  }, [isExtensionDetected]);

  useEffect(() => {
    if (!isBlasting || settings.manualMode) { setCountdown(0); return; }
    const engineTick = () => {
      const now = Date.now();
      if (now - lastHourReset > 3600000) { setSentThisHour(0); setLastHourReset(now); }
      if (sentThisHour >= settings.hourlyLimit) { setIsBlasting(false); addLog(`⏳ Limit per jam tercapai.`, 'warning'); return; }
      const pendingEntries = entries.filter(e => e.status === 'pending');
      const sendingEntries = entries.filter(e => e.status === 'sending');
      if (sendingEntries.length > 0) { setCountdown(0); return; }
      if (pendingEntries.length > 0) {
        const entry = pendingEntries[0];
        if (now >= nextActionTime) {
          addLog(`🚀 Mengirim ke ${entry.recipientName}...`, 'info');
          const waLink = getWALink(entry, entries.filter(e => e.status === 'sent').length);
          const newWindow = window.open(waLink, 'WAsenderTab');
          if (!newWindow) { addLog(`⚠️ Browser memblokir pembukaan tab otomatis.`, 'warning'); setNextActionTime(Date.now() + 3000); return; }
          window.focus();
          if (settings.autoSend) { updateStatus(entry.id, 'sending'); }
          else { updateStatus(entry.id, 'sent'); setNextActionTime(Date.now() + calculateNextDelay(entries.filter(e => e.status === 'sent').length + 1, pendingEntries[1] || entry)); }
        } else { setCountdown(Math.max(0, Math.ceil((nextActionTime - now) / 1000))); }
      } else { setIsBlasting(false); addLog(`🏁 Blast selesai!`, 'success'); }
    };
    engineTick();
    const interval = setInterval(engineTick, 1000);
    return () => clearInterval(interval);
  }, [isBlasting, entries, nextActionTime, settings.manualMode, settings.hourlyLimit, isExtensionDetected, sentThisHour, lastHourReset]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isBlasting && settings.manualMode && (e.code === 'Space' || e.code === 'Enter')) {
        e.preventDefault();
        const pending = entries.filter(ent => ent.status === 'pending');
        if (pending.length > 0) {
          const entry = pending[0];
          window.open(getWALink(entry), 'WAsenderTab');
          updateStatus(entry.id, 'sent');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBlasting, settings.manualMode, entries]);

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
    const received = entries.filter(e => e.isReceived).length;
    return [
      { name: 'Sent', value: sent, color: '#00FF88' },
      { name: 'Pending', value: pending, color: '#F59E0B' },
      { name: 'Received', value: received, color: '#38BDF8' }
    ];
  }, [entries]);

  const safetyScore = useMemo(() => {
    let score = 0;
    if (settings.delay >= 5000) score += 20;
    if (settings.randomizeDelay) score += 15;
    if (settings.batchSize > 0 && settings.batchSize <= 15) score += 10;
    if (settings.useRandomGreetings) score += 5;
    if (settings.useInvisibleChars) score += 5;
    if (settings.simulateTyping) score += 10;
    if (settings.adaptiveDelay) score += 5;
    if (settings.rotateTemplates) score += 10;
    if (settings.hourlyLimit <= 50) score += 10;
    if (settings.shuffleQueue) score += 10;
    return Math.min(100, score);
  }, [settings]);

  const exportToCSV = () => {
    if (entries.length === 0) return;
    const headers = ['Phone', 'Name', 'Item', 'Receipt', 'Status', 'Received', 'Created At'];
    const rows = entries.map(e => [e.phone, e.recipientName, e.itemName, e.receiptNumber, e.status, e.isReceived ? 'YES' : 'NO', new Date(e.createdAt).toLocaleString()]);
    const csvContent = [headers, ...rows].map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `wasender_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Laporan berhasil diunduh');
  };

  const statusConfig = {
    sent: { bg: 'bg-[#00FF88]/10 border-[#00FF88]/20', text: 'text-[#00FF88]', icon: <CheckCircle2 size={10} /> },
    sending: { bg: 'bg-[#38BDF8]/10 border-[#38BDF8]/20 animate-pulse', text: 'text-[#38BDF8]', icon: <Loader2 size={10} className="animate-spin" /> },
    failed: { bg: 'bg-[#FF4444]/10 border-[#FF4444]/20', text: 'text-[#FF4444]', icon: <AlertCircle size={10} /> },
    pending: { bg: 'bg-[#F59E0B]/10 border-[#F59E0B]/20', text: 'text-[#F59E0B]', icon: <Clock size={10} /> },
  };

  return (
    <div className={cn("min-h-screen font-mono text-[#C8D8E8]", isDarkMode && "dark")}
      style={{ background: 'linear-gradient(135deg, #020608 0%, #060C12 50%, #020810 100%)' }}>
      
      {/* Subtle grid overlay */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{
        backgroundImage: 'linear-gradient(rgba(0,255,136,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,136,0.015) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />

      <Toaster position="top-right" toastOptions={{
        style: { background: '#0A0F14', border: '1px solid #1E2D3D', color: '#C8D8E8', fontFamily: 'monospace', fontSize: '13px' }
      }} />

      {/* BLAST OVERLAY */}
      {isBlasting && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6"
          style={{ background: 'rgba(2,6,8,0.92)', backdropFilter: 'blur(16px)' }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-2xl border border-[#00FF88]/20 overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #0A0F14 0%, #060C12 100%)', boxShadow: '0 0 60px rgba(0,255,136,0.1), inset 0 1px 0 rgba(0,255,136,0.1)' }}
          >
            {/* Top accent */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-[#00FF88]/50 to-transparent" />
            
            <div className="p-8 text-center space-y-6">
              {/* Animated orb */}
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 rounded-full border-2 border-[#00FF88]/10 animate-ping" />
                <div className="absolute inset-1 rounded-full border border-[#00FF88]/30 animate-spin" style={{ animationDuration: '3s' }} />
                <div className="absolute inset-3 rounded-full border border-[#00FF88]/60" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-[#00FF88]/10 flex items-center justify-center border border-[#00FF88]/30">
                    <Play size={16} className="text-[#00FF88] fill-current ml-0.5" />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-bold text-[#C8D8E8] tracking-wider uppercase">
                  {isLongBreak ? 'LONG BREAK' : entries.some(e => e.status === 'sending') ? 'PROCESSING...' : 'ENGINE ACTIVE'}
                </h3>
                <div className="text-xs text-[#3A5068]">
                  SENT <span className="text-[#00FF88] font-bold">{entries.filter(e => e.status === 'sent').length}</span>
                  <span className="mx-2 text-[#1E2D3D]">/</span>
                  <span className="text-[#C8D8E8]">{entries.length}</span> TOTAL
                </div>
              </div>

              {!settings.manualMode ? (
                <div className="space-y-2">
                  <div className={cn(
                    "text-5xl font-black tabular-nums tracking-tighter",
                    isLongBreak ? "text-[#F59E0B]" : entries.some(e => e.status === 'sending') ? "text-[#38BDF8]" : "text-[#00FF88]"
                  )} style={!isLongBreak && !entries.some(e => e.status === 'sending') ? { textShadow: '0 0 30px rgba(0,255,136,0.5)' } : {}}>
                    {entries.some(e => e.status === 'sending') ? '--:--' : `${Math.floor(countdown / 60).toString().padStart(2,'0')}:${(countdown % 60).toString().padStart(2, '0')}`}
                  </div>
                  <div className="text-[9px] text-[#3A5068] uppercase tracking-[0.25em]">
                    {entries.some(e => e.status === 'sending') ? 'AWAITING WA WEB' : isLongBreak ? 'BREAK ENDS IN' : 'NEXT MESSAGE'}
                  </div>
                  
                  {Date.now() >= nextActionTime && entries.filter(e => e.status === 'pending').length > 0 && !entries.some(e => e.status === 'sending') && (
                    <div className="mt-4">
                      <button
                        onClick={() => {
                          const pending = entries.filter(e => e.status === 'pending');
                          if (pending.length > 0) {
                            const entry = pending[0];
                            const sentCount = entries.filter(e => e.status === 'sent').length;
                            const newWindow = window.open(getWALink(entry, sentCount), 'WAsenderTab');
                            if (newWindow) {
                              window.focus();
                              if (settings.autoSend) updateStatus(entry.id, 'sending');
                              else { updateStatus(entry.id, 'sent'); setNextActionTime(Date.now() + calculateNextDelay(sentCount + 1, entries.filter(e => e.status === 'pending')[1] || entry)); }
                            }
                          }
                        }}
                        className="w-full py-3 rounded-xl font-bold text-xs tracking-wider uppercase transition-all border border-[#F59E0B]/30 bg-[#F59E0B]/10 text-[#F59E0B] hover:bg-[#F59E0B]/20"
                      >
                        ▶ TAB TIDAK TERBUKA? KLIK DI SINI
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-4 space-y-2">
                  <div className="px-4 py-2 rounded-lg border border-[#00FF88]/20 bg-[#00FF88]/5 text-[#00FF88] text-[10px] font-bold tracking-widest uppercase">
                    MANUAL MODE AKTIF
                  </div>
                  <p className="text-[10px] text-[#3A5068]">Tekan [SPASI] atau klik tombol di bawah untuk lanjut.</p>
                </div>
              )}

              <div className="space-y-1 py-2 border-t border-[#1E2D3D]">
                <p className="text-[9px] text-[#F59E0B] font-bold uppercase tracking-widest animate-pulse">
                  ⚠ TEKAN [ENTER] DI TAB WHATSAPP UNTUK MENGIRIM
                </p>
                <p className="text-[9px] text-[#3A5068] italic">
                  Browser tidak mengizinkan klik otomatis di WhatsApp Web.
                </p>
              </div>

              <div className="space-y-2">
                {entries.some(e => e.status === 'sending') && (
                  <button
                    onClick={() => {
                      const sending = entries.find(e => e.status === 'sending');
                      if (sending) { addLog(`⏭️ Paksa lanjut: Melewati konfirmasi untuk ${sending.recipientName}`, 'warning'); updateStatus(sending.id, 'sent'); }
                    }}
                    className="w-full py-3 rounded-xl font-bold text-xs tracking-wider uppercase border border-[#38BDF8]/30 bg-[#38BDF8]/10 text-[#38BDF8] hover:bg-[#38BDF8]/20 transition-all"
                  >
                    PAKSA LANJUT →
                  </button>
                )}
                <button
                  onClick={() => {
                    const pending = entries.filter(e => e.status === 'pending');
                    if (pending.length > 0) {
                      const entry = pending[0];
                      const newWindow = window.open(getWALink(entry), 'WAsenderTab');
                      if (newWindow) window.focus();
                      updateStatus(entry.id, 'sent');
                    }
                  }}
                  className="w-full py-3 rounded-xl font-bold text-xs tracking-wider uppercase border border-[#00FF88]/20 bg-[#00FF88]/5 text-[#00FF88] hover:bg-[#00FF88]/10 transition-all"
                >
                  KIRIM BERIKUTNYA (MANUAL)
                </button>
                <button
                  onClick={stopBlast}
                  className="w-full py-3 rounded-xl font-bold text-xs tracking-wider uppercase border border-[#FF4444]/30 bg-[#FF4444]/10 text-[#FF4444] hover:bg-[#FF4444]/20 transition-all"
                >
                  ■ STOP ENGINE
                </button>
              </div>
            </div>
            <div className="h-px w-full bg-gradient-to-r from-transparent via-[#FF4444]/30 to-transparent" />
          </motion.div>
        </div>
      )}

      {/* HEADER */}
      <header className="sticky top-0 z-30 border-b border-[#1E2D3D]"
        style={{ background: 'rgba(6,12,18,0.9)', backdropFilter: 'blur(20px)' }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative w-8 h-8 rounded-lg bg-[#00FF88]/10 border border-[#00FF88]/20 flex items-center justify-center">
              <Send size={15} className="text-[#00FF88]" />
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#00FF88]" style={{ boxShadow: '0 0 6px #00FF88' }} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-[#C8D8E8] tracking-widest">WASENDER</span>
                <span className="text-xs font-black text-[#00FF88]" style={{ textShadow: '0 0 10px #00FF88' }}>PRO</span>
              </div>
              <div className="text-[8px] text-[#3A5068] tracking-[0.3em] uppercase">Advanced Blast Engine</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {!isExtensionDetected && (
              <button
                onClick={downloadExtensionZip}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#F59E0B]/20 bg-[#F59E0B]/5 text-[#F59E0B] hover:bg-[#F59E0B]/10 transition-all text-[10px] font-bold tracking-wider uppercase"
              >
                <Puzzle size={13} /> Setup Extension
              </button>
            )}
            <button onClick={handleResetDefault} className="p-2 rounded-lg border border-[#FF4444]/20 bg-[#FF4444]/5 text-[#FF4444] hover:bg-[#FF4444]/10 transition-all" title="Reset">
              <RotateCcw size={15} />
            </button>
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-lg border border-[#1E2D3D] bg-[#0A0F14] text-[#3A5068] hover:text-[#00FF88] hover:border-[#00FF88]/20 transition-all">
              {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button onClick={() => setShowSettingsModal(true)} className="p-2 rounded-lg border border-[#1E2D3D] bg-[#0A0F14] text-[#3A5068] hover:text-[#00FF88] hover:border-[#00FF88]/20 transition-all">
              <Settings2 size={15} />
            </button>
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#1E2D3D] bg-[#0A0F14]">
              <div className={cn("w-1.5 h-1.5 rounded-full", isBlasting ? "bg-[#00FF88] animate-pulse" : "bg-[#1E2D3D]")}
                style={isBlasting ? { boxShadow: '0 0 6px #00FF88' } : {}} />
              <span className="text-[9px] text-[#3A5068] uppercase tracking-widest">{isBlasting ? 'ACTIVE' : 'IDLE'}</span>
            </div>
            <button onClick={exportToCSV} className="flex items-center gap-1.5 text-[10px] font-bold text-[#3A5068] hover:text-[#00FF88] uppercase tracking-wider transition-colors">
              <Download size={13} /> Export
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT SIDEBAR */}
        <div className="lg:col-span-4 space-y-5">
          
          {/* Stats */}
          <GlassCard className="p-5">
            <SectionHeader icon={BarChart3} title="OVERVIEW" right={<History size={13} className="text-[#1E2D3D]" />} />
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statsData} innerRadius={55} outerRadius={72} paddingAngle={4} dataKey="value" strokeWidth={0}>
                    {statsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} opacity={0.9} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ background: '#0A0F14', border: '1px solid #1E2D3D', color: '#C8D8E8', fontFamily: 'monospace', fontSize: '11px', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {statsData.map(s => (
                <div key={s.name} className="p-3 rounded-xl border border-[#1E2D3D] bg-[#060C12] text-center">
                  <div className="text-[8px] text-[#3A5068] uppercase tracking-wider mb-1">{s.name}</div>
                  <div className="text-xl font-black" style={{ color: s.color, textShadow: `0 0 15px ${s.color}60` }}>{s.value}</div>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Engine Settings */}
          <GlassCard className="p-5">
            <SectionHeader icon={Timer} title="ENGINE" />
            <div className="space-y-4">
              <div className="space-y-1.5">
                <FieldLabel>Nama Pengirim</FieldLabel>
                <GlassInput
                  type="text"
                  value={settings.senderName}
                  onChange={(e) => setSettings(prev => ({ ...prev, senderName: e.target.value }))}
                  placeholder="Admin JNT"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <FieldLabel>Blast Delay</FieldLabel>
                  <span className="text-[10px] font-bold text-[#00FF88]" style={{ textShadow: '0 0 8px #00FF88' }}>{settings.delay / 1000}s</span>
                </div>
                <input
                  type="range"
                  min="1000" max="10000" step="500"
                  value={settings.delay}
                  onChange={(e) => setSettings(prev => ({ ...prev, delay: parseInt(e.target.value) }))}
                  className="w-full h-1 rounded-full appearance-none cursor-pointer"
                  style={{ accentColor: '#00FF88', background: `linear-gradient(to right, #00FF88 ${(settings.delay - 1000) / 90}%, #1E2D3D ${(settings.delay - 1000) / 90}%)` }}
                />
                <div className="flex justify-between text-[8px] text-[#3A5068] uppercase tracking-widest">
                  <span>FAST</span>
                  <span>SAFE</span>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Templates */}
          <GlassCard className="p-5">
            <SectionHeader 
              icon={Settings2} 
              title="TEMPLATES"
              right={
                <div className="flex items-center gap-2">
                  <span className="text-[8px] text-[#00FF88] uppercase tracking-widest">Auto-saved</span>
                  <button
                    onClick={() => {
                      const def = DEFAULT_TEMPLATES.find(t => t.id === activeTemplateId);
                      if (def && confirm('Reset template ini ke pengaturan awal?')) {
                        setTemplates(prev => prev.map(t => t.id === activeTemplateId ? { ...def } : t));
                        setActiveVariationIndex(0);
                        toast.success('Template direset ke default');
                      }
                    }}
                    className="p-1.5 rounded-lg border border-[#1E2D3D] text-[#3A5068] hover:text-[#F59E0B] hover:border-[#F59E0B]/20 transition-all"
                    title="Reset to Default"
                  >
                    <History size={13} />
                  </button>
                </div>
              }
            />
            
            <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {templates.map(t => (
                <button
                  key={t.id}
                  onClick={() => { setActiveTemplateId(t.id); setActiveVariationIndex(0); }}
                  className={cn(
                    "whitespace-nowrap px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border",
                    activeTemplateId === t.id
                      ? "bg-[#00FF88]/10 text-[#00FF88] border-[#00FF88]/30"
                      : "bg-[#060C12] text-[#3A5068] border-[#1E2D3D] hover:border-[#00FF88]/20 hover:text-[#C8D8E8]"
                  )}
                >
                  {t.name}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 mb-3">
              <span className="text-[8px] text-[#3A5068] uppercase tracking-widest">VAR:</span>
              {[0, 1, 2].map(idx => (
                <button
                  key={idx}
                  onClick={() => setActiveVariationIndex(idx)}
                  className={cn(
                    "w-7 h-7 rounded-lg text-[10px] font-bold border transition-all",
                    activeVariationIndex === idx
                      ? "bg-[#00FF88]/10 text-[#00FF88] border-[#00FF88]/30"
                      : "bg-[#060C12] text-[#3A5068] border-[#1E2D3D]"
                  )}
                >
                  {idx + 1}
                </button>
              ))}
              <div className="ml-auto text-[8px] text-[#3A5068]">
                {settings.rotateTemplates ? "ROTASI ON" : "ROTASI OFF"}
              </div>
            </div>

            <textarea
              value={currentTemplateText}
              onChange={(e) => updateActiveTemplateText(e.target.value)}
              className="w-full h-36 p-3 text-xs bg-[#060C12] border border-[#1E2D3D] rounded-xl outline-none transition-all resize-none text-[#C8D8E8] leading-relaxed focus:border-[#00FF88]/30"
              style={{ scrollbarWidth: 'thin', scrollbarColor: '#1E2D3D transparent' }}
              placeholder="Tulis template pesan..."
            />
            
            <div className="mt-3 flex flex-wrap gap-1.5">
              {['{salam}', '{pengirim}', '{nama}', '{barang}', '{resi}', '{alamat}', '{cod}', '{dfod}', '{if_cod}', '{/if_cod}', '{if_dfod}', '{/if_dfod}'].map(tag => (
                <button
                  key={tag}
                  onClick={() => updateActiveTemplateText(currentTemplateText + ' ' + tag)}
                  className="text-[9px] font-bold tracking-wide px-2 py-1 bg-[#060C12] border border-[#1E2D3D] hover:border-[#00FF88]/30 hover:text-[#00FF88] rounded text-[#3A5068] transition-all"
                >
                  {tag}
                </button>
              ))}
            </div>

            <div className="mt-3 p-3 rounded-xl border border-[#38BDF8]/15 bg-[#38BDF8]/5">
              <div className="flex items-center gap-1.5 mb-1">
                <Sparkles size={11} className="text-[#38BDF8]" />
                <span className="text-[8px] font-bold text-[#38BDF8] uppercase tracking-wider">SPINTAX TIP</span>
              </div>
              <p className="text-[9px] text-[#3A5068] leading-relaxed">
                Gunakan <span className="font-mono font-bold text-[#38BDF8] bg-[#38BDF8]/10 px-1 rounded">{"{Halo|Hai|Pagi}"}</span> untuk variasi pesan otomatis.
              </p>
            </div>
          </GlassCard>
        </div>

        {/* MAIN CONTENT */}
        <div className="lg:col-span-8 space-y-5">
          
          {/* Toolbar */}
          <GlassCard className="p-4">
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3A5068]" size={14} />
                <GlassInput
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="SEARCH: name / phone / resi..."
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2 items-center flex-wrap">
                <div className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[9px] font-bold uppercase tracking-wider transition-all",
                  isExtensionDetected
                    ? "border-[#00FF88]/20 bg-[#00FF88]/5 text-[#00FF88]"
                    : "border-[#1E2D3D] bg-[#060C12] text-[#3A5068]"
                )}>
                  <Puzzle size={11} className={isExtensionDetected ? "animate-pulse" : ""} />
                  {isExtensionDetected ? "CONNECTED" : "DISCONNECTED"}
                </div>
                <button
                  onClick={() => setShowBulkModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#1E2D3D] bg-[#060C12] text-[#3A5068] hover:border-[#00FF88]/20 hover:text-[#00FF88] transition-all text-[10px] font-bold uppercase tracking-wider"
                >
                  <FileSpreadsheet size={13} /> BULK
                </button>
                <button
                  onClick={() => setShowPreviewModal(true)}
                  disabled={entries.filter(e => e.status === 'pending').length === 0}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#1E2D3D] bg-[#060C12] text-[#3A5068] hover:border-[#38BDF8]/20 hover:text-[#38BDF8] transition-all text-[10px] font-bold uppercase tracking-wider disabled:opacity-40"
                >
                  <Search size={13} /> PREVIEW
                </button>
                <button
                  onClick={isBlasting ? stopBlast : startBlast}
                  disabled={entries.length === 0}
                  className={cn(
                    "flex items-center gap-2 px-5 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all border disabled:opacity-40",
                    isBlasting
                      ? "border-[#FF4444]/30 bg-[#FF4444]/10 text-[#FF4444] hover:bg-[#FF4444]/20"
                      : "border-[#00FF88]/30 bg-[#00FF88]/10 text-[#00FF88] hover:bg-[#00FF88]/15"
                  )}
                  style={!isBlasting ? { boxShadow: '0 0 20px rgba(0,255,136,0.1)' } : {}}
                >
                  {isBlasting ? <Square size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}
                  {isBlasting ? 'STOP' : 'START'}
                </button>
              </div>
            </div>
          </GlassCard>

          {/* Warning Banner */}
          {!isBlasting && entries.length > 0 && (
            <div className="flex items-start gap-3 p-3 rounded-xl border border-[#F59E0B]/15 bg-[#F59E0B]/5">
              <AlertCircle className="text-[#F59E0B] shrink-0 mt-0.5" size={14} />
              <p className="text-[10px] text-[#F59E0B]/70 leading-relaxed">
                <span className="font-bold text-[#F59E0B]">PENTING:</span> Mesin akan membuka WhatsApp Web di tab yang sama. Pastikan Anda telah <span className="font-bold text-[#F59E0B]">MENGIZINKAN POPUP</span> di browser.
              </p>
            </div>
          )}

          {/* Add Entry Form */}
          <GlassCard className="p-5">
            <form onSubmit={handleAddEntry} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <FieldLabel>Phone</FieldLabel>
                  <GlassInput type="text" value={formData.phone} onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))} placeholder="0812..." />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Name</FieldLabel>
                  <GlassInput type="text" value={formData.recipientName} onChange={(e) => setFormData(prev => ({ ...prev, recipientName: e.target.value }))} placeholder="Recipient Name" />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Item Name</FieldLabel>
                  <GlassInput type="text" value={formData.itemName} onChange={(e) => setFormData(prev => ({ ...prev, itemName: e.target.value }))} placeholder="Nama Barang" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <div className="space-y-1.5">
                  <FieldLabel>Resi</FieldLabel>
                  <GlassInput type="text" value={formData.receiptNumber} onChange={(e) => setFormData(prev => ({ ...prev, receiptNumber: e.target.value }))} placeholder="Resi Number" />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <FieldLabel>Address</FieldLabel>
                  <GlassInput type="text" value={formData.address} onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))} placeholder="Alamat Lengkap" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <div className="space-y-1.5">
                  <FieldLabel>COD</FieldLabel>
                  <GlassInput type="text" value={formData.cod} onChange={(e) => setFormData(prev => ({ ...prev, cod: e.target.value.replace(/[^0-9.,]/g, '') }))} placeholder="274,398" />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>DFOD</FieldLabel>
                  <GlassInput type="text" value={formData.dfod} onChange={(e) => setFormData(prev => ({ ...prev, dfod: e.target.value.replace(/[^0-9.,]/g, '') }))} placeholder="10,000" />
                </div>
                <button
                  type="submit"
                  className="py-2.5 rounded-lg border border-[#00FF88]/30 bg-[#00FF88]/10 text-[#00FF88] font-bold text-[10px] uppercase tracking-widest hover:bg-[#00FF88]/20 transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={14} /> ADD TO QUEUE
                </button>
              </div>
            </form>
          </GlassCard>

          {/* Console */}
          <GlassCard className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#00FF88] animate-pulse" style={{ boxShadow: '0 0 6px #00FF88' }} />
                <span className="text-[8px] text-[#3A5068] uppercase tracking-[0.25em]">SYS CONSOLE</span>
              </div>
              <button onClick={() => setLogs([])} className="text-[8px] font-bold text-[#3A5068] hover:text-[#FF4444] uppercase tracking-widest transition-colors">CLR</button>
            </div>
            <div className="h-28 overflow-y-auto text-[10px] space-y-0.5 font-mono" style={{ scrollbarWidth: 'thin', scrollbarColor: '#1E2D3D transparent' }}>
              {logs.length === 0 ? (
                <span className="text-[#1E2D3D] italic">_waiting for system events...</span>
              ) : (
                logs.map(log => (
                  <div key={log.id} className="flex gap-3 leading-relaxed">
                    <span className="text-[#1E2D3D] shrink-0">[{new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}]</span>
                    <span className={cn(
                      log.type === 'success' ? "text-[#00FF88]" :
                      log.type === 'error' ? "text-[#FF4444]" :
                      log.type === 'warning' ? "text-[#F59E0B]" :
                      "text-[#38BDF8]"
                    )}>{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </GlassCard>

          {/* Queue Table */}
          <GlassCard className="overflow-hidden">
            <div className="px-5 py-4 border-b border-[#1E2D3D] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={14} className="text-[#00FF88]" />
                <span className="text-xs font-bold text-[#C8D8E8] uppercase tracking-wider">Queue</span>
                <span className="px-2 py-0.5 rounded border border-[#1E2D3D] bg-[#060C12] text-[8px] font-bold text-[#3A5068]">{filteredEntries.length}</span>
              </div>
              {isConfirmingClear ? (
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-[#FF4444] uppercase tracking-wider">CONFIRM?</span>
                  <button onClick={clearAll} className="px-2.5 py-1 text-[9px] font-bold uppercase rounded border border-[#FF4444]/30 bg-[#FF4444]/10 text-[#FF4444]">YES</button>
                  <button onClick={() => setIsConfirmingClear(false)} className="px-2.5 py-1 text-[9px] font-bold uppercase rounded border border-[#1E2D3D] text-[#3A5068]">NO</button>
                </div>
              ) : (
                <button onClick={() => setIsConfirmingClear(true)} className="p-1.5 text-[#1E2D3D] hover:text-[#FF4444] transition-colors">
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[#1E2D3D]">
                    {['RECIPIENT', 'DETAILS', 'STATUS', 'RECEIVED', ''].map(h => (
                      <th key={h} className="px-5 py-3 text-[8px] font-bold text-[#3A5068] uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence mode="popLayout">
                    {filteredEntries.length === 0 ? (
                      <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <td colSpan={5} className="px-5 py-16 text-center text-[#1E2D3D] text-xs italic">
                          — no records found —
                        </td>
                      </motion.tr>
                    ) : (
                      filteredEntries.map((entry, index) => {
                        const sc = statusConfig[entry.status as keyof typeof statusConfig] || statusConfig.pending;
                        return (
                          <motion.tr
                            key={entry.id}
                            layout
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -8 }}
                            className={cn(
                              "group border-b border-[#0A0F14] transition-all",
                              isBlasting && index === currentIndex ? "bg-[#00FF88]/5" : "hover:bg-[#0A0F14]"
                            )}
                          >
                            <td className="px-5 py-4">
                              <div className="text-xs font-bold text-[#C8D8E8]">{entry.recipientName}</div>
                              <div className="text-[9px] text-[#3A5068] font-mono mt-0.5">{entry.phone}</div>
                            </td>
                            <td className="px-5 py-4">
                              <div className="text-xs text-[#8899AA] truncate max-w-[180px]">{entry.itemName || '—'}</div>
                              <div className="text-[9px] text-[#3A5068] font-mono mt-0.5">RESI: {entry.receiptNumber || '—'}</div>
                              {entry.address && <div className="text-[9px] text-[#3A5068] truncate max-w-[180px]">{entry.address}</div>}
                              <div className="flex gap-2 mt-0.5">
                                {entry.cod && <span className="text-[9px] text-[#F59E0B] font-bold">COD: Rp {formatCurrency(entry.cod)}</span>}
                                {entry.dfod && <span className="text-[9px] text-[#38BDF8] font-bold">DFOD: Rp {formatCurrency(entry.dfod)}</span>}
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <div className={cn("inline-flex items-center gap-1 px-2 py-1 rounded border text-[9px] font-bold uppercase tracking-wider", sc.bg, sc.text)}>
                                {sc.icon}
                                {entry.status}
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <button
                                onClick={() => toggleReceived(entry.id)}
                                className={cn(
                                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[9px] font-bold uppercase tracking-wider transition-all",
                                  entry.isReceived
                                    ? "border-[#38BDF8]/20 bg-[#38BDF8]/5 text-[#38BDF8]"
                                    : "border-[#1E2D3D] bg-[#060C12] text-[#3A5068] hover:border-[#38BDF8]/20"
                                )}
                              >
                                <div className={cn("w-3 h-3 rounded border flex items-center justify-center transition-all", entry.isReceived ? "bg-[#38BDF8] border-[#38BDF8]" : "border-[#1E2D3D]")}>
                                  {entry.isReceived && <CheckCircle2 size={8} className="text-[#060C12]" />}
                                </div>
                                {entry.isReceived ? 'DITERIMA' : 'BELUM'}
                              </button>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleSendManual(entry)} className="p-1.5 rounded-lg text-[#3A5068] hover:text-[#00FF88] hover:bg-[#00FF88]/5 transition-all">
                                  <ExternalLink size={13} />
                                </button>
                                <button onClick={() => setEntries(prev => prev.filter(e => e.id !== entry.id))} className="p-1.5 rounded-lg text-[#3A5068] hover:text-[#FF4444] hover:bg-[#FF4444]/5 transition-all">
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })
                    )}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      </main>

      {/* BULK IMPORT MODAL */}
      <AnimatePresence>
        {showBulkModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowBulkModal(false)} className="absolute inset-0 bg-black/70" style={{ backdropFilter: 'blur(12px)' }} />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              className="relative w-full max-w-2xl max-h-[90vh] rounded-2xl overflow-hidden flex flex-col border border-[#1E2D3D]"
              style={{ background: '#0A0F14', boxShadow: '0 0 80px rgba(0,0,0,0.8)' }}
            >
              <div className="h-px w-full bg-gradient-to-r from-transparent via-[#00FF88]/40 to-transparent" />
              <div className="px-7 py-5 border-b border-[#1E2D3D] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#00FF88]/10 border border-[#00FF88]/20 flex items-center justify-center">
                    <FileSpreadsheet size={16} className="text-[#00FF88]" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-[#C8D8E8] uppercase tracking-widest">Bulk Import</h2>
                    <p className="text-[9px] text-[#3A5068]">Copy-paste data dari Excel atau CSV</p>
                  </div>
                </div>
                <button onClick={() => setShowBulkModal(false)} className="p-1.5 rounded-lg text-[#3A5068] hover:text-[#FF4444] hover:bg-[#FF4444]/5 transition-all"><X size={16} /></button>
              </div>
              <div className="p-7 space-y-5 overflow-y-auto flex-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#1E2D3D transparent' }}>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl border border-[#00FF88]/15 bg-[#00FF88]/5">
                    <div className="text-[8px] font-bold text-[#00FF88] uppercase tracking-widest mb-1">Step 1</div>
                    <p className="text-[10px] text-[#3A5068] leading-relaxed">Kolom: No, Resi, Nama, HP, Alamat, Tanda, Nominal COD, Nominal DFOD, Barang</p>
                  </div>
                  <div className="p-4 rounded-xl border border-[#38BDF8]/15 bg-[#38BDF8]/5">
                    <div className="text-[8px] font-bold text-[#38BDF8] uppercase tracking-widest mb-1">Step 2</div>
                    <p className="text-[10px] text-[#3A5068] leading-relaxed">Copy range dari Excel & Paste di area bawah</p>
                  </div>
                </div>
                <textarea
                  value={bulkData}
                  onChange={(e) => setBulkData(e.target.value)}
                  placeholder="1&#9;JX123456789&#9;Budi Santoso&#9;08123456789&#9;Jl. Merdeka No. 1&#9;COD&#9;150000&#9;0&#9;Sepatu..."
                  className="w-full h-56 p-4 text-[10px] font-mono bg-[#060C12] border border-[#1E2D3D] rounded-xl outline-none resize-none text-[#C8D8E8] placeholder-[#1E2D3D] focus:border-[#00FF88]/30 transition-all"
                  style={{ scrollbarWidth: 'thin', scrollbarColor: '#1E2D3D transparent' }}
                />
                <div className="flex gap-3">
                  <button onClick={() => setShowBulkModal(false)} className="flex-1 py-3 rounded-xl border border-[#1E2D3D] bg-[#060C12] text-[#3A5068] font-bold text-[10px] uppercase tracking-wider hover:text-[#C8D8E8] transition-all">CANCEL</button>
                  <button onClick={handleBulkImport} className="flex-[2] py-3 rounded-xl border border-[#00FF88]/30 bg-[#00FF88]/10 text-[#00FF88] font-bold text-[10px] uppercase tracking-wider hover:bg-[#00FF88]/20 transition-all">IMPORT DATA</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PREVIEW MODAL */}
      <AnimatePresence>
        {showPreviewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPreviewModal(false)} className="absolute inset-0 bg-black/70" style={{ backdropFilter: 'blur(12px)' }} />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              className="relative w-full max-w-lg max-h-[90vh] rounded-2xl overflow-hidden flex flex-col border border-[#1E2D3D]"
              style={{ background: '#0A0F14', boxShadow: '0 0 80px rgba(0,0,0,0.8)' }}
            >
              <div className="h-px w-full bg-gradient-to-r from-transparent via-[#38BDF8]/40 to-transparent" />
              <div className="px-6 py-5 border-b border-[#1E2D3D] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#38BDF8]/10 border border-[#38BDF8]/20 flex items-center justify-center">
                    <MessageSquare size={16} className="text-[#38BDF8]" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-[#C8D8E8] uppercase tracking-widest">Message Preview</h2>
                    <p className="text-[9px] text-[#3A5068]">First Pending Entry</p>
                  </div>
                </div>
                <button onClick={() => setShowPreviewModal(false)} className="p-1.5 rounded-lg text-[#3A5068] hover:text-[#FF4444] hover:bg-[#FF4444]/5 transition-all"><X size={16} /></button>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto flex-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#1E2D3D transparent' }}>
                {entries.find(e => e.status === 'pending') ? (
                  <>
                    <div className="p-4 rounded-xl border border-[#1E2D3D] bg-[#060C12]">
                      <div className="flex items-center gap-3 mb-3 pb-3 border-b border-[#1E2D3D]">
                        <div className="w-8 h-8 rounded-lg bg-[#00FF88]/10 border border-[#00FF88]/20 text-[#00FF88] text-xs font-bold flex items-center justify-center">
                          {entries.find(e => e.status === 'pending')?.recipientName.charAt(0)}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[#C8D8E8]">{entries.find(e => e.status === 'pending')?.recipientName}</div>
                          <div className="text-[9px] text-[#3A5068] font-mono">{entries.find(e => e.status === 'pending')?.phone}</div>
                        </div>
                      </div>
                      <div className="text-xs whitespace-pre-wrap leading-relaxed text-[#8899AA]">
                        {(() => {
                          const entry = entries.find(e => e.status === 'pending');
                          if (!entry) return '';
                          const sentCount = entries.filter(e => e.status === 'sent').length;
                          let templateText = activeTemplate.text;
                          if (settings.rotateTemplates) {
                            const variations = activeTemplate.variations && activeTemplate.variations.length > 0 ? activeTemplate.variations : [activeTemplate.text];
                            templateText = variations[sentCount % variations.length];
                          }
                          return generateMessage(entry, templateText);
                        })()}
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => setShowPreviewModal(false)} className="flex-1 py-2.5 rounded-xl border border-[#1E2D3D] bg-[#060C12] text-[#3A5068] font-bold text-[10px] uppercase tracking-wider hover:text-[#C8D8E8] transition-all">CLOSE</button>
                      <button
                        onClick={() => {
                          const entry = entries.find(e => e.status === 'pending');
                          if (entry) {
                            const sentCount = entries.filter(e => e.status === 'sent').length;
                            const newWindow = window.open(getWALink(entry, sentCount), 'WAsenderTab');
                            if (newWindow) window.focus();
                            updateStatus(entry.id, 'sent');
                            setShowPreviewModal(false);
                          }
                        }}
                        className="flex-1 py-2.5 rounded-xl border border-[#00FF88]/30 bg-[#00FF88]/10 text-[#00FF88] font-bold text-[10px] uppercase tracking-wider hover:bg-[#00FF88]/20 transition-all flex items-center justify-center gap-2"
                      >
                        <Send size={12} /> SEND NOW
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <Clock size={36} className="mx-auto text-[#1E2D3D] mb-3" />
                    <p className="text-[#1E2D3D] text-xs italic">No pending entries to preview.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SETTINGS MODAL */}
      <AnimatePresence>
        {showSettingsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSettingsModal(false)} className="absolute inset-0 bg-black/70" style={{ backdropFilter: 'blur(12px)' }} />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              className="relative w-full max-w-md max-h-[90vh] rounded-2xl overflow-hidden flex flex-col border border-[#1E2D3D]"
              style={{ background: '#0A0F14', boxShadow: '0 0 80px rgba(0,0,0,0.8)' }}
            >
              <div className="h-px w-full bg-gradient-to-r from-transparent via-[#00FF88]/40 to-transparent" />
              <div className="px-6 py-5 border-b border-[#1E2D3D] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#00FF88]/10 border border-[#00FF88]/20 flex items-center justify-center">
                    <Settings2 size={16} className="text-[#00FF88]" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-[#C8D8E8] uppercase tracking-widest">Settings</h2>
                    <p className="text-[9px] text-[#3A5068]">Engine Configuration</p>
                  </div>
                </div>
                <button onClick={() => setShowSettingsModal(false)} className="p-1.5 rounded-lg text-[#3A5068] hover:text-[#FF4444] hover:bg-[#FF4444]/5 transition-all"><X size={16} /></button>
              </div>

              {/* Tabs */}
              <div className="flex px-6 pt-4 gap-5 border-b border-[#1E2D3D]">
                {(['general', 'antispam'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveSettingsTab(tab)}
                    className={cn(
                      "pb-3 text-[10px] font-bold uppercase tracking-widest transition-all relative",
                      activeSettingsTab === tab ? "text-[#00FF88]" : "text-[#3A5068]"
                    )}
                  >
                    {tab}
                    {activeSettingsTab === tab && (
                      <motion.div layoutId="settingsTab" className="absolute bottom-0 left-0 right-0 h-px bg-[#00FF88]" style={{ boxShadow: '0 0 8px #00FF88' }} />
                    )}
                  </button>
                ))}
              </div>

              <div className="p-6 overflow-y-auto flex-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#1E2D3D transparent' }}>
                {activeSettingsTab === 'antispam' && (
                  <div className="mb-5 p-4 rounded-xl border border-[#00FF88]/15 bg-[#00FF88]/5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[8px] font-bold text-[#00FF88] uppercase tracking-widest">Safety Score</span>
                      <span className={cn("text-xs font-black", safetyScore > 80 ? "text-[#00FF88]" : safetyScore > 50 ? "text-[#F59E0B]" : "text-[#FF4444]")}>
                        {safetyScore}%
                      </span>
                    </div>
                    <div className="h-1 w-full bg-[#1E2D3D] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${safetyScore}%` }}
                        className={cn("h-full", safetyScore > 80 ? "bg-[#00FF88]" : safetyScore > 50 ? "bg-[#F59E0B]" : "bg-[#FF4444]")}
                        style={{ boxShadow: safetyScore > 80 ? '0 0 8px #00FF88' : safetyScore > 50 ? '0 0 8px #F59E0B' : '0 0 8px #FF4444' }}
                      />
                    </div>
                    <p className="text-[9px] text-[#3A5068] mt-2 italic">
                      {safetyScore > 80 ? "Sangat Aman: Pola pengiriman sangat mirip manusia." : safetyScore > 50 ? "Cukup Aman: Disarankan menambah jeda atau variasi." : "Beresiko Tinggi: Rentan terkena banned!"}
                    </p>
                  </div>
                )}

                {activeSettingsTab === 'general' ? (
                  <div className="space-y-5">
                    <div className="space-y-1.5">
                      <FieldLabel>Nama Pengirim</FieldLabel>
                      <GlassInput type="text" value={settings.senderName} onChange={(e) => setSettings(prev => ({ ...prev, senderName: e.target.value }))} placeholder="Admin JNT" />
                    </div>

                    <div className="space-y-3">
                      <FieldLabel>Pilih Kecepatan Blast</FieldLabel>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'safe', label: 'Main Aman', desc: '15-30s', icon: '🛡️' },
                          { id: 'normal', label: 'Normal', desc: '8-15s', icon: '⚖️' },
                          { id: 'fast', label: 'Percepat', desc: '3-7s', icon: '⚡' },
                          { id: 'turbo', label: 'Turbo', desc: '1-2s', icon: '🚀' },
                        ].map((mode) => (
                          <button
                            key={mode.id}
                            onClick={() => setSettings(prev => ({ ...prev, speedMode: mode.id as any }))}
                            className={cn(
                              "p-3 rounded-xl border text-left transition-all",
                              settings.speedMode === mode.id
                                ? "border-[#00FF88]/30 bg-[#00FF88]/10"
                                : "border-[#1E2D3D] bg-[#060C12] hover:border-[#00FF88]/15"
                            )}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-base">{mode.icon}</span>
                              {settings.speedMode === mode.id && <div className="w-1.5 h-1.5 rounded-full bg-[#00FF88]" style={{ boxShadow: '0 0 6px #00FF88' }} />}
                            </div>
                            <div className="text-[10px] font-bold text-[#C8D8E8]">{mode.label}</div>
                            <div className="text-[9px] text-[#3A5068]">{mode.desc}</div>
                          </button>
                        ))}
                        <button
                          onClick={() => setSettings(prev => ({ ...prev, speedMode: 'custom' }))}
                          className={cn(
                            "col-span-2 p-3 rounded-xl border text-left transition-all",
                            settings.speedMode === 'custom' ? "border-[#00FF88]/30 bg-[#00FF88]/10" : "border-[#1E2D3D] bg-[#060C12] hover:border-[#00FF88]/15"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-[#C8D8E8]">⚙️ Custom (Atur Manual)</span>
                            {settings.speedMode === 'custom' && <div className="w-1.5 h-1.5 rounded-full bg-[#00FF88]" />}
                          </div>
                        </button>
                      </div>
                    </div>

                    {settings.speedMode === 'custom' && (
                      <div className="space-y-1.5">
                        <FieldLabel>Blast Delay (Milliseconds)</FieldLabel>
                        <GlassInput type="number" value={settings.delay} onChange={(e) => setSettings(prev => ({ ...prev, delay: parseInt(e.target.value) || 1000 }))} placeholder="5000" min="1000" step="500" />
                      </div>
                    )}

                    {[
                      { key: 'manualMode', label: 'Mode Manual', desc: 'Kirim berikutnya hanya saat Anda klik/tekan Spasi.' },
                      { key: 'autoRetry', label: 'Auto Retry', desc: 'Coba kirim ulang otomatis jika gagal.' },
                    ].map(item => (
                      <div key={item.key} className="flex items-center justify-between p-3 rounded-xl border border-[#1E2D3D] bg-[#060C12]">
                        <div>
                          <div className="text-[10px] font-bold text-[#C8D8E8]">{item.label}</div>
                          <div className="text-[9px] text-[#3A5068] mt-0.5">{item.desc}</div>
                        </div>
                        <Toggle checked={!!settings[item.key as keyof AppSettings]} onChange={() => setSettings(prev => ({ ...prev, [item.key]: !prev[item.key as keyof AppSettings] }))} />
                      </div>
                    ))}

                    {settings.autoRetry && (
                      <div className="space-y-1.5">
                        <FieldLabel>Max Retries</FieldLabel>
                        <GlassInput type="number" value={settings.maxRetries} onChange={(e) => setSettings(prev => ({ ...prev, maxRetries: parseInt(e.target.value) || 1 }))} min="1" max="10" />
                      </div>
                    )}

                    <button
                      onClick={() => {
                        if (window.confirm('Kembalikan semua template ke pengaturan default?')) {
                          setTemplates(DEFAULT_TEMPLATES);
                          setActiveTemplateId(DEFAULT_TEMPLATES[0].id);
                          setActiveVariationIndex(0);
                          toast.success('Template berhasil dipulihkan');
                        }
                      }}
                      className="w-full py-3 rounded-xl border border-[#1E2D3D] bg-[#060C12] text-[#3A5068] font-bold text-[10px] uppercase tracking-wider hover:text-[#C8D8E8] transition-all flex items-center justify-center gap-2"
                    >
                      <RotateCcw size={12} /> RESTORE DEFAULT TEMPLATES
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-xl border border-[#1E2D3D] bg-[#060C12]">
                      <div>
                        <div className="text-[10px] font-bold text-[#C8D8E8]">Randomize Delay</div>
                        <div className="text-[9px] text-[#3A5068] mt-0.5">Jeda waktu acak agar tidak terdeteksi bot.</div>
                      </div>
                      <Toggle checked={settings.randomizeDelay} onChange={() => setSettings(prev => ({ ...prev, randomizeDelay: !prev.randomizeDelay }))} />
                    </div>

                    {settings.randomizeDelay && (
                      <div className="space-y-1.5">
                        <FieldLabel>Max Delay (ms)</FieldLabel>
                        <GlassInput type="number" value={settings.maxDelay} onChange={(e) => setSettings(prev => ({ ...prev, maxDelay: parseInt(e.target.value) || 10000 }))} step="500" />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { key: 'batchSize', label: 'Batch Size', desc: 'Istirahat tiap X pesan.', placeholder: '10' },
                        { key: 'batchPause', label: 'Pause (ms)', desc: 'Lama istirahat.', placeholder: '30000' },
                        { key: 'hourlyLimit', label: 'Hourly Limit', desc: 'Maks pesan per jam.', placeholder: '50' },
                        { key: 'stopOnConsecutiveErrors', label: 'Stop on Errors', desc: 'Stop jika X gagal urut.', placeholder: '3' },
                        { key: 'longBreakAfter', label: 'Long Break After', desc: 'Istirahat tiap X pesan.', placeholder: '25' },
                        { key: 'longBreakDuration', label: 'Duration (min)', desc: 'Lama istirahat.', placeholder: '10' },
                      ].map(field => (
                        <div key={field.key} className="space-y-1">
                          <FieldLabel>{field.label}</FieldLabel>
                          <GlassInput
                            type="number"
                            value={settings[field.key as keyof AppSettings] as number}
                            onChange={(e) => setSettings(prev => ({ ...prev, [field.key]: parseInt(e.target.value) || 0 }))}
                            placeholder={field.placeholder}
                            className="text-[10px]"
                          />
                          <p className="text-[8px] text-[#3A5068] italic">{field.desc}</p>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2">
                      {[
                        { key: 'shuffleQueue', label: 'Shuffle Queue', desc: 'Acak urutan antrean saat memulai blast.' },
                        { key: 'useRandomGreetings', label: 'Random Greetings', desc: 'Variasi kata sapaan otomatis.' },
                        { key: 'addRandomSuffix', label: 'Random Suffix (Ref ID)', desc: 'Tambah ID unik di akhir pesan.' },
                        { key: 'useInvisibleChars', label: 'Invisible Characters', desc: 'Sisipkan karakter tak terlihat.' },
                        { key: 'simulateTyping', label: 'Simulate Typing', desc: 'Tambah jeda berdasarkan panjang pesan.' },
                        { key: 'adaptiveDelay', label: 'Adaptive Delay', desc: 'Delay bertambah seiring jumlah pesan.' },
                        { key: 'randomizeFormatting', label: 'Random Formatting', desc: 'Variasi spasi dan baris baru.' },
                        { key: 'rotateTemplates', label: 'Template Rotation', desc: 'Gunakan template berbeda bergantian.' },
                        { key: 'randomizeEmojis', label: 'Randomize Emojis', desc: 'Sisipkan emoji acak di setiap pesan.' },
                        { key: 'useGlobalSpintax', label: 'Global Spintax', desc: 'Aktifkan parser {pilihan1|pilihan2}.' },
                        { key: 'autoSend', label: 'Auto Send Mode', desc: 'Kirim otomatis via Chrome Extension.' },
                      ].map(item => (
                        <div key={item.key} className="flex items-center justify-between p-3 rounded-xl border border-[#1E2D3D] bg-[#060C12]">
                          <div>
                            <div className="text-[10px] font-bold text-[#C8D8E8]">{item.label}</div>
                            <div className="text-[9px] text-[#3A5068] mt-0.5">{item.desc}</div>
                          </div>
                          <Toggle checked={!!settings[item.key as keyof AppSettings]} onChange={() => setSettings(prev => ({ ...prev, [item.key]: !prev[item.key as keyof AppSettings] }))} />
                        </div>
                      ))}
                    </div>

                    {settings.autoSend && (
                      <div className="p-4 rounded-xl border border-[#F59E0B]/20 bg-[#F59E0B]/5 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-[#F59E0B]">
                            <Puzzle size={13} />
                            <span className="text-[9px] font-bold uppercase tracking-wider">Chrome Extension Required</span>
                          </div>
                          <div className={cn("px-2 py-0.5 rounded text-[8px] font-bold uppercase", isExtensionDetected ? "bg-[#00FF88]/10 text-[#00FF88] border border-[#00FF88]/20" : "bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20")}>
                            {isExtensionDetected ? "CONNECTED" : "NOT FOUND"}
                          </div>
                        </div>
                        <p className="text-[9px] text-[#3A5068] leading-relaxed">
                          Fitur ini membutuhkan Chrome Extension khusus untuk menekan tombol kirim secara otomatis di WhatsApp Web.
                        </p>
                        <button onClick={downloadExtensionZip} className="w-full py-2.5 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/10 text-[#F59E0B] font-bold text-[9px] uppercase tracking-wider hover:bg-[#F59E0B]/20 transition-all flex items-center justify-center gap-2">
                          <Download size={13} /> DOWNLOAD EXTENSION (.ZIP)
                        </button>
                        <div className="space-y-2">
                          <div className="text-[9px] font-bold text-[#F59E0B] uppercase tracking-wider">Cara Instalasi:</div>
                          <ol className="text-[9px] space-y-1.5 text-[#3A5068] list-decimal ml-4">
                            <li>Klik tombol <b className="text-[#C8D8E8]">Download Extension</b> di atas.</li>
                            <li>Ekstrak file <code className="bg-[#F59E0B]/10 text-[#F59E0B] px-1 rounded">wasender-pro-helper.zip</code></li>
                            <li>Buka <code className="bg-[#060C12] text-[#38BDF8] px-1 rounded">chrome://extensions</code></li>
                            <li>Aktifkan <b className="text-[#C8D8E8]">Developer Mode</b> di pojok kanan atas.</li>
                            <li>Klik <b className="text-[#C8D8E8]">Load Unpacked</b> dan pilih folder ekstrak.</li>
                          </ol>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-5 border-t border-[#1E2D3D]">
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="w-full py-3 rounded-xl border border-[#00FF88]/30 bg-[#00FF88]/10 text-[#00FF88] font-bold text-[10px] uppercase tracking-widest hover:bg-[#00FF88]/20 transition-all"
                  style={{ boxShadow: '0 0 20px rgba(0,255,136,0.08)' }}
                >
                  SAVE CONFIGURATION
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="relative z-10 max-w-7xl mx-auto px-6 py-8 border-t border-[#1E2D3D] text-center">
        <div className="text-[8px] text-[#1E2D3D] uppercase tracking-[0.4em] font-mono">
          WASENDER PRO ENGINE • v2.0.0 • ENTERPRISE EDITION
        </div>
      </footer>
    </div>
  );
}
