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

        newEntries.push({
          id: crypto.randomUUID(),
          receiptNumber: columns[1] || '',
          recipientName: columns[2] || '',
          phone: columns[3] || '',
          address: columns[4] || '',
          itemName: itemNameValue, 
          cod: cod,
          dfod: dfod,
          status: 'pending',
          isReceived: false,
          createdAt: Date.now()
        });
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
      .replace(/{cod}/gi, entry.cod ? `Rp ${entry.cod}` : '-')
      .replace(/{dfod}/gi, entry.dfod ? `Rp ${entry.dfod}` : '-');

    if (settings.useGlobalSpintax) {
      finalMessage = finalMessage.replace(/{([^{}]+)}/g, (match, p1) => {
        if (p1.includes('|')) {
          const choices = p1.split('|');
          return choices[Math.floor(Math.random() * choices.length)];
        }
        return match;
      });
    }

    if (settings.randomizeEmojis) {
      const emojis = ['😊', '🙏', '📦', '🚚', '✨', '✅', '📍', '🚚', '📦', '🚛', ' cargo ', ' jnt '];
      const words = finalMessage.split(' ');
      finalMessage = words.map(word => Math.random() > 0.9 ? word + ' ' + emojis[Math.floor(Math.random() * emojis.length)] : word).join(' ');
    }

    if (settings.addRandomSuffix) {
      finalMessage += `\n\n_Ref: ${Math.random().toString(36).substring(7).toUpperCase()}_`;
    }

    if (settings.useInvisibleChars) {
      const zwsp = '\u200B';
      const words = finalMessage.split(' ');
      finalMessage = words.map(word => Math.random() > 0.7 ? word + zwsp : word).join(' ');
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
    
    // FIX: Only rotate variations of the ACTIVE template
    if (settings.rotateTemplates) {
      const count = sentCountOverride !== undefined ? sentCountOverride : entries.filter(e => e.status === 'sent').length;
      if (activeTemplate.variations && activeTemplate.variations.length > 0) {
        templateText = activeTemplate.variations[count % activeTemplate.variations.length] || activeTemplate.text;
      }
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

    let currentDelay = (settings.randomizeDelay || settings.speedMode !== 'custom') 
      ? Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay 
      : minDelay;

    if (useAdaptive) currentDelay += Math.floor(sentCount / 10) * 500;

    if (useTyping) {
      let templateText = activeTemplate.text;
      if (settings.rotateTemplates && activeTemplate.variations) {
        templateText = activeTemplate.variations[sentCount % activeTemplate.variations.length] || activeTemplate.text;
      }
      const message = generateMessage(entry, templateText);
      currentDelay += Math.min(message.length * 50, 5000);
    }

    if (settings.batchSize > 0 && sentCount >= nextBatchPauseAt && nextBatchPauseAt > 0) {
      currentDelay = settings.batchPause;
      toast(`Anti-Spam: Istirahat ${settings.batchPause / 1000} detik...`, { icon: '🛡️' });
      setNextBatchPauseAt(sentCount + settings.batchSize + (Math.floor(Math.random() * 5) - 2));
    }

    if (settings.longBreakAfter > 0 && sentCount > 0 && sentCount % settings.longBreakAfter === 0) {
      currentDelay = settings.longBreakDuration * 60 * 1000;
      setIsLongBreak(true);
      addLog(`😴 Istirahat panjang ${settings.longBreakDuration} menit...`, 'warning');
    } else {
      setIsLongBreak(false);
    }

    return currentDelay;
  };

  const startBlast = () => {
    if (!isExtensionDetected && !settings.manualMode) {
      toast.error('Extension tidak terdeteksi!', { icon: '🔌' });
      return;
    }
    const pending = entries.filter(e => e.status === 'pending');
    if (pending.length === 0) return;

    let entriesToProcess = [...pending];
    if (settings.shuffleQueue) {
      entriesToProcess = entriesToProcess.sort(() => Math.random() - 0.5);
      setEntries(prev => [...prev.filter(e => e.status !== 'pending'), ...entriesToProcess]);
    }

    const firstEntry = entriesToProcess[0];
    const newWindow = window.open(getWALink(firstEntry), 'WAsenderTab');
    if (!newWindow) {
      toast.error('Popup terblokir!', { icon: '🚫' });
      return;
    }

    window.focus();
    if (settings.autoSend) updateStatus(firstEntry.id, 'sending');
    else {
      updateStatus(firstEntry.id, 'sent');
      setNextActionTime(Date.now() + calculateNextDelay(entries.filter(e => e.status === 'sent').length + 1, entriesToProcess[1] || firstEntry));
    }

    setIsBlasting(true);
    setCurrentIndex(0);
    if (settings.batchSize > 0) setNextBatchPauseAt(entries.filter(e => e.status === 'sent').length + settings.batchSize);
  };

  const stopBlast = () => {
    setIsBlasting(false);
    setCurrentIndex(-1);
    setNextActionTime(0);
    addLog(`🛑 Blast dihentikan`, 'warning');
  };

  // Auto-recovery & Extension Handlers
  useEffect(() => {
    if (isBlasting && !settings.manualMode) {
      const sendingEntry = entries.find(e => e.status === 'sending');
      if (sendingEntry) {
        let timeoutDuration = settings.speedMode === 'turbo' ? 5000 : 25000;
        const timer = setTimeout(() => {
          updateStatus(sendingEntry.id, 'sent');
          const pending = entries.filter(e => e.status === 'pending' && e.id !== sendingEntry.id);
          if (pending.length > 0) setNextActionTime(Date.now() + calculateNextDelay(entries.filter(e => e.status === 'sent').length + 1, pending[0]));
        }, timeoutDuration);
        return () => clearTimeout(timer);
      }
    }
  }, [entries, isBlasting, settings.manualMode]);

  useEffect(() => {
    const handleExtensionMessage = (event: MessageEvent) => {
      if (event.data?.source === 'wasender-extension') {
        const { type, entryId, status: waStatus } = event.data;
        if (type === 'WA_STATUS_UPDATE') {
          setEntries(currentEntries => {
            const entry = currentEntries.find(e => e.id === entryId);
            if (!entry || entry.status === 'sent') return currentEntries;
            if (waStatus === 'sent') {
              setSentThisHour(p => p + 1);
              const pending = currentEntries.filter(e => e.status === 'pending' && e.id !== entryId);
              if (pending.length > 0) setNextActionTime(Date.now() + calculateNextDelay(currentEntries.filter(e => e.status === 'sent').length + 1, pending[0]));
              return currentEntries.map(e => e.id === entryId ? { ...e, status: 'sent' } : e);
            }
            return currentEntries;
          });
        } else if (type === 'WA_WARNING_DETECTED') {
          stopBlast();
          toast.error('SPAM DETECTED!', { icon: '🚨' });
        }
      }
    };
    window.addEventListener('message', handleExtensionMessage);
    return () => window.removeEventListener('message', handleExtensionMessage);
  }, []);

  useEffect(() => {
    const checkAttr = () => {
      if (document.documentElement.getAttribute('data-wasender-extension') === 'active') {
        if (!isExtensionDetected) setIsExtensionDetected(true);
        setLastHeartbeat(Date.now());
      }
      window.postMessage({ type: 'EXTENSION_PING' }, '*');
    };
    const interval = setInterval(checkAttr, 2000);
    return () => clearInterval(interval);
  }, [isExtensionDetected]);

  // Engine Tick
  useEffect(() => {
    if (!isBlasting || settings.manualMode) { setCountdown(0); return; }
    const engineTick = () => {
      const now = Date.now();
      if (now - lastHourReset > 3600000) { setSentThisHour(0); setLastHourReset(now); }
      if (sentThisHour >= settings.hourlyLimit) { setIsBlasting(false); return; }

      const pendingEntries = entries.filter(e => e.status === 'pending');
      if (entries.some(e => e.status === 'sending')) { setCountdown(0); return; }

      if (pendingEntries.length > 0) {
        const entry = pendingEntries[0];
        if (now >= nextActionTime) {
          const newWindow = window.open(getWALink(entry, entries.filter(e => e.status === 'sent').length), 'WAsenderTab');
          if (newWindow) {
            window.focus();
            if (settings.autoSend) updateStatus(entry.id, 'sending');
            else {
              updateStatus(entry.id, 'sent');
              setNextActionTime(Date.now() + calculateNextDelay(entries.filter(e => e.status === 'sent').length + 1, pendingEntries[1] || entry));
            }
          } else { setNextActionTime(Date.now() + 3000); }
        } else {
          setCountdown(Math.max(0, Math.ceil((nextActionTime - now) / 1000)));
        }
      } else { setIsBlasting(false); addLog('🏁 Selesai!', 'success'); }
    };
    const interval = setInterval(engineTick, 1000);
    return () => clearInterval(interval);
  }, [isBlasting, entries, nextActionTime, settings.manualMode, sentThisHour]);

  const filteredEntries = useMemo(() => entries.filter(e => e.recipientName.toLowerCase().includes(searchQuery.toLowerCase()) || e.phone.includes(searchQuery) || e.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase())), [entries, searchQuery]);
  const statsData = useMemo(() => [
    { name: 'Sent', value: entries.filter(e => e.status === 'sent').length, color: '#10b981' },
    { name: 'Pending', value: entries.filter(e => e.status === 'pending').length, color: '#f59e0b' },
    { name: 'Received', value: entries.filter(e => e.isReceived).length, color: '#3b82f6' }
  ], [entries]);

  const safetyScore = useMemo(() => {
    let score = 0;
    if (settings.delay >= 5000) score += 20;
    if (settings.randomizeDelay) score += 15;
    if (settings.batchSize > 0 && settings.batchSize <= 15) score += 10;
    if (settings.useRandomGreetings) score += 5;
    if (settings.simulateTyping) score += 10;
    if (settings.adaptiveDelay) score += 5;
    if (settings.rotateTemplates) score += 10;
    if (settings.hourlyLimit <= 50) score += 10;
    if (settings.shuffleQueue) score += 10;
    return Math.min(100, score);
  }, [settings]);

  const exportToCSV = () => {
    const headers = ['Phone', 'Name', 'Item', 'Receipt', 'Status', 'Received'];
    const csvContent = [headers, ...entries.map(e => [e.phone, e.recipientName, e.itemName, e.receiptNumber, e.status, e.isReceived ? 'YES' : 'NO'])].map(r => r.join(',')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv' }));
    link.download = `wasender_report.csv`;
    link.click();
  };

  return (
    <div className={cn("min-h-screen bg-[#F8F9FA] dark:bg-[#0F1115] text-[#1A1A1A] dark:text-[#E4E6EB] transition-colors duration-300", isDarkMode && "dark")}>
      <Toaster position="top-right" />

      {/* Progress Overlay */}
      {isBlasting && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white dark:bg-[#16191F] rounded-3xl p-8 max-w-md w-full shadow-2xl border border-white/10 text-center space-y-6">
            <div className="relative w-24 h-24 mx-auto">
              <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full" />
              <div className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center"><Play size={32} className="text-emerald-500 fill-current" /></div>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">{isLongBreak ? '😴 Break' : entries.some(e => e.status === 'sending') ? '⏳ Memuat WA...' : 'Blasting...'}</h3>
              <p className="text-sm text-gray-500">Sent: {entries.filter(e => e.status === 'sent').length} / {entries.length}</p>
              {!settings.manualMode && (
                <div className="py-4">
                  <div className="text-4xl font-black tabular-nums text-emerald-600 dark:text-emerald-400">
                    {entries.some(e => e.status === 'sending') ? '--:--' : `${Math.floor(countdown / 60)}:${(countdown % 60).toString().padStart(2, '0')}`}
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={stopBlast} className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold text-sm">Stop</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Header */}
      <header className="bg-white/80 dark:bg-[#16191F]/80 border-b border-black/5 sticky top-0 z-30 backdrop-blur-md h-20 flex items-center px-6">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg"><Send size={20} /></div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">WAsender <span className="text-emerald-600">PRO</span></h1>
              <p className="text-[10px] text-gray-400 font-mono uppercase tracking-widest">QC Logistics Edition</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleResetDefault} className="p-2.5 bg-red-50 dark:bg-red-900/10 border border-red-100 rounded-xl text-red-600"><RotateCcw size={18} /></button>
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 bg-gray-50 dark:bg-[#1C2128] border border-black/5 rounded-xl text-gray-500">{isDarkMode ? <Sun size={18} /> : <Moon size={18} />}</button>
            <button onClick={() => setShowSettingsModal(true)} className="p-2.5 bg-gray-50 dark:bg-[#1C2128] border border-black/5 rounded-xl text-gray-500"><Settings2 size={18} /></button>
            <button onClick={exportToCSV} className="hidden md:flex items-center gap-2 text-xs font-bold uppercase text-gray-600"><Download size={14} /> Export</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-4 space-y-6">
          <section className="bg-white dark:bg-[#16191F] rounded-3xl p-6 shadow-sm border border-black/5">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold flex items-center gap-2"><BarChart3 size={18} className="text-emerald-500" /> Stats</h2>
            </div>
            <div className="h-48 w-full">
              <ResponsiveContainer><PieChart><Pie data={statsData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">{statsData.map((s, i) => <Cell key={i} fill={s.color} />)}</Pie><RechartsTooltip /></PieChart></ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-4">
              {statsData.map(s => <div key={s.name} className="p-3 rounded-2xl bg-gray-50 dark:bg-[#1C2128] border border-black/5"><div className="text-[9px] font-bold text-gray-400 uppercase">{s.name}</div><div className="text-lg font-bold" style={{ color: s.color }}>{s.value}</div></div>)}
            </div>
          </section>

          <section className="bg-white dark:bg-[#16191F] rounded-3xl p-6 shadow-sm border border-black/5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold flex items-center gap-2"><Settings2 size={18} className="text-emerald-500" /> Templates</h2>
            </div>
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2 custom-scrollbar">
              {templates.map(t => <button key={t.id} onClick={() => { setActiveTemplateId(t.id); setActiveVariationIndex(0); }} className={cn("whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold border", activeTemplateId === t.id ? "bg-emerald-600 text-white border-emerald-600 shadow-md" : "bg-gray-50 dark:bg-[#1C2128] text-gray-500 border-gray-200")}>{t.name}</button>)}
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Variasi:</span>
              {[0, 1, 2].map(idx => <button key={idx} onClick={() => setActiveVariationIndex(idx)} className={cn("w-8 h-8 rounded-lg text-xs font-bold transition-all border flex items-center justify-center", activeVariationIndex === idx ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 border-emerald-200" : "bg-gray-50 dark:bg-[#1C2128] text-gray-400 border-gray-100")}>{idx + 1}</button>)}
            </div>
            <textarea value={currentTemplateText} onChange={(e) => updateActiveTemplateText(e.target.value)} className="w-full h-40 p-4 text-sm bg-gray-50 dark:bg-[#1C2128] border border-gray-200 rounded-2xl focus:border-emerald-500 outline-none resize-none dark:text-white" placeholder="Tulis template..." />
            <div className="mt-3 flex flex-wrap gap-2">
              {['{salam}', '{nama}', '{barang}', '{resi}', '{alamat}', '{cod}', '{dfod}', '{if_cod}', '{/if_cod}'].map(tag => <button key={tag} onClick={() => updateActiveTemplateText(currentTemplateText + ' ' + tag)} className="text-[10px] font-bold px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-400">{tag}</button>)}
            </div>
          </section>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex flex-col md:flex-row gap-4 items-stretch bg-white dark:bg-[#16191F] p-4 rounded-3xl border border-black/5 shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Cari..." className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-[#1C2128] border border-gray-100 rounded-2xl outline-none text-sm dark:text-white" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowBulkModal(true)} className="px-6 py-3 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400 rounded-2xl font-bold text-sm flex items-center gap-2"><FileSpreadsheet size={18} /> Bulk</button>
              <button onClick={isBlasting ? stopBlast : startBlast} disabled={entries.length === 0} className={cn("px-8 py-3 rounded-2xl font-bold text-sm transition-all flex items-center gap-2 shadow-lg", isBlasting ? "bg-red-500 text-white" : "bg-black dark:bg-emerald-600 text-white")}>
                {isBlasting ? <Square size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />} {isBlasting ? 'Stop' : 'Start Engine'}
              </button>
            </div>
          </div>

          <section className="bg-white dark:bg-[#16191F] rounded-3xl p-6 shadow-sm border border-black/5">
            <form onSubmit={handleAddEntry} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input type="text" value={formData.phone} onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))} placeholder="HP: 0812..." className="p-3 text-sm bg-gray-50 dark:bg-[#1C2128] border border-gray-100 rounded-xl dark:text-white" />
                <input type="text" value={formData.recipientName} onChange={(e) => setFormData(p => ({ ...p, recipientName: e.target.value }))} placeholder="Nama Penerima" className="p-3 text-sm bg-gray-50 dark:bg-[#1C2128] border border-gray-100 rounded-xl dark:text-white" />
                <input type="text" value={formData.itemName} onChange={(e) => setFormData(p => ({ ...p, itemName: e.target.value }))} placeholder="Nama Barang" className="p-3 text-sm bg-gray-50 dark:bg-[#1C2128] border border-gray-100 rounded-xl dark:text-white" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input type="text" value={formData.receiptNumber} onChange={(e) => setFormData(p => ({ ...p, receiptNumber: e.target.value }))} placeholder="No Resi" className="p-3 text-sm bg-gray-50 dark:bg-[#1C2128] border border-gray-100 rounded-xl dark:text-white" />
                <input type="text" value={formData.cod} onChange={(e) => setFormData(p => ({ ...p, cod: e.target.value }))} placeholder="Nominal COD" className="p-3 text-sm bg-gray-50 dark:bg-[#1C2128] border border-gray-100 rounded-xl dark:text-white" />
                <button type="submit" className="py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2"><Plus size={18} /> Add Queue</button>
              </div>
            </form>
          </section>

          <div className="bg-white dark:bg-[#16191F] rounded-3xl shadow-sm border border-black/5 overflow-hidden">
            <div className="p-6 border-b border-black/5 flex items-center justify-between">
              <h2 className="font-bold flex items-center gap-2"><FileText size={18} className="text-emerald-500" /> Queue Management</h2>
              <button onClick={() => setIsConfirmingClear(true)} className="p-2 text-gray-300 hover:text-red-500"><Trash2 size={18} /></button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead><tr className="bg-gray-50/50 dark:bg-gray-900/20"><th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase">Recipient</th><th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase">Details</th><th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase">Status</th><th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase text-right">Action</th></tr></thead>
                <tbody className="divide-y divide-black/5">
                  {filteredEntries.map((entry, index) => (
                    <tr key={entry.id} className={cn("hover:bg-gray-50/50 dark:hover:bg-gray-900/10", isBlasting && index === currentIndex && "bg-emerald-50/80 dark:bg-emerald-900/10")}>
                      <td className="px-6 py-4">
                        <div className="font-bold text-sm">{entry.recipientName}</div>
                        <div className="text-xs text-gray-400">{entry.phone}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-gray-500">Resi: {entry.receiptNumber}</div>
                        {entry.cod && <div className="text-[10px] text-amber-600 font-bold">COD: Rp {entry.cod}</div>}
                      </td>
                      <td className="px-6 py-4">
                        <div className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase", entry.status === 'sent' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>{entry.status}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => handleSendManual(entry)} className="p-2 text-emerald-600"><ExternalLink size={16} /></button>
                        <button onClick={() => setEntries(prev => prev.filter(e => e.id !== entry.id))} className="p-2 text-gray-300 hover:text-red-500"><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Settings Modal (Simplified for reference) */}
      <AnimatePresence>
        {showSettingsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSettingsModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-md bg-white dark:bg-[#16191F] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col p-8">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Settings2 className="text-emerald-500" /> Settings</h2>
              <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-2">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Nama Pengirim</label>
                  <input type="text" value={settings.senderName} onChange={(e) => setSettings(p => ({ ...p, senderName: e.target.value }))} className="w-full p-3 bg-gray-50 dark:bg-[#1C2128] border border-gray-100 rounded-xl dark:text-white" />
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#1C2128] rounded-2xl">
                  <span className="text-sm font-bold">Rotate Template Variations</span>
                  <button onClick={() => setSettings(p => ({ ...p, rotateTemplates: !p.rotateTemplates }))} className={cn("w-12 h-6 rounded-full relative transition-all", settings.rotateTemplates ? "bg-emerald-500" : "bg-gray-300")}>
                    <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", settings.rotateTemplates ? "left-7" : "left-1")} />
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#1C2128] rounded-2xl">
                  <span className="text-sm font-bold">Auto Send (Extension)</span>
                  <button onClick={() => setSettings(p => ({ ...p, autoSend: !p.autoSend }))} className={cn("w-12 h-6 rounded-full relative transition-all", settings.autoSend ? "bg-emerald-500" : "bg-gray-300")}>
                    <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", settings.autoSend ? "left-7" : "left-1")} />
                  </button>
                </div>
              </div>
              <button onClick={() => setShowSettingsModal(false)} className="mt-6 w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold">Save</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Import Modal */}
      <AnimatePresence>
        {showBulkModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setShowBulkModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-2xl bg-white dark:bg-[#16191F] rounded-[2rem] shadow-2xl p-8 flex flex-col">
              <h2 className="text-xl font-bold mb-4">Bulk Import Excel</h2>
              <textarea value={bulkData} onChange={(e) => setBulkData(e.target.value)} placeholder="Paste Excel data here..." className="w-full h-64 p-4 font-mono text-xs bg-gray-50 dark:bg-[#1C2128] border border-gray-100 rounded-2xl dark:text-white" />
              <div className="flex gap-4 mt-6">
                <button onClick={() => setShowBulkModal(false)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold">Cancel</button>
                <button onClick={handleBulkImport} className="flex-2 py-3 bg-emerald-600 text-white rounded-xl font-bold">Import</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="py-12 text-center text-[10px] text-gray-400 uppercase tracking-widest">WAsender PRO • QC J&T Cargo Edition</footer>
    </div>
  );
}
