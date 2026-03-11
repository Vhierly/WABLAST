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

// Glassmorphism card styles
const glassCard = "bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.4)]";
const glassCardLight = "bg-black/[0.03] backdrop-blur-xl border border-black/[0.07] shadow-[0_4px_24px_rgba(0,0,0,0.08)]";
const inputStyle = "w-full px-4 py-3 text-sm rounded-xl outline-none transition-all duration-200 placeholder:text-current/30";

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
    if (window.confirm('Apakah Anda yakin ingin menghapus semua data dan kembali ke pengaturan awal?')) {
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
        let cod = '', dfod = '';
        if (tanda === 'COD') { const c = rawCod.replace(/[^0-9]/g, ''); if (c && !isNaN(Number(c))) cod = c; }
        else if (tanda === 'DFOD') { const d = rawDfod.replace(/[^0-9]/g, ''); if (d && !isNaN(Number(d))) dfod = d; }
        newEntries.push({ id: crypto.randomUUID(), receiptNumber: columns[1] || '', recipientName: columns[2] || '', phone: columns[3] || '', address: columns[4] || '', itemName: itemNameValue, cod, dfod, status: 'pending', isReceived: false, createdAt: Date.now() });
        successCount++;
      }
    });
    if (newEntries.length > 0) {
      setEntries(prev => [...newEntries, ...prev]);
      setBulkData(''); setShowBulkModal(false);
      addLog(`📥 Bulk Import: ${successCount} data berhasil diimpor`, 'success');
      toast.success(`${successCount} data berhasil diimpor`);
    } else { toast.error('Format data tidak valid.'); }
  };

  const clearAll = () => { setEntries([]); setIsConfirmingClear(false); addLog(`🗑️ Semua data antrean dihapus`, 'warning'); toast.success('Semua data dihapus'); };

  const getGreeting = () => {
    const hour = new Date().getHours();
    let base = hour >= 5 && hour < 11 ? 'Pagi' : hour >= 11 && hour < 15 ? 'Siang' : hour >= 15 && hour < 18 ? 'Sore' : 'Malam';
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
    if (settings.useGlobalSpintax) finalMessage = finalMessage.replace(/{([^{}]+)}/g, (match, p1) => { if (p1.includes('|')) { const choices = p1.split('|'); return choices[Math.floor(Math.random() * choices.length)]; } return match; });
    if (settings.randomizeEmojis) { const emojis = ['😊','🙏','📦','🚚','✨','✅','📍','🚚','📦','🚛']; finalMessage = finalMessage.split(' ').map(word => Math.random() > 0.9 ? word + ' ' + emojis[Math.floor(Math.random() * emojis.length)] : word).join(' '); }
    if (settings.addRandomSuffix) finalMessage += `\n\n_Ref: ${Math.random().toString(36).substring(7).toUpperCase()}_`;
    if (settings.useInvisibleChars) { const zwsp = '\u200B'; finalMessage = finalMessage.split(' ').map(word => Math.random() > 0.7 ? word + zwsp : word).join(' '); }
    if (settings.randomizeFormatting) { const paragraphs = finalMessage.split('\n\n'); finalMessage = paragraphs.map((p, i) => { if (i === paragraphs.length - 1) return p; const rand = Math.random(); if (rand > 0.8) return p + '\n\n\n'; if (rand > 0.6) return p + '\n'; return p + '\n\n'; }).join(''); }
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

  const updateStatus = (id: string, status: BlastEntry['status']) => setEntries(prev => prev.map(e => e.id === id ? { ...e, status } : e));
  const toggleReceived = (id: string) => setEntries(prev => prev.map(e => e.id === id ? { ...e, isReceived: !e.isReceived } : e));

  const calculateNextDelay = (sentCount: number, entry: BlastEntry) => {
    let minDelay = settings.delay, maxDelay = settings.maxDelay, useTyping = settings.simulateTyping, useAdaptive = settings.adaptiveDelay;
    if (settings.speedMode === 'safe') { minDelay = 15000; maxDelay = 30000; useTyping = true; useAdaptive = true; }
    else if (settings.speedMode === 'normal') { minDelay = 8000; maxDelay = 15000; useTyping = true; useAdaptive = true; }
    else if (settings.speedMode === 'fast') { minDelay = 3000; maxDelay = 7000; useTyping = false; useAdaptive = false; }
    else if (settings.speedMode === 'turbo') { minDelay = 1000; maxDelay = 2000; useTyping = false; useAdaptive = false; }
    let currentDelay = settings.randomizeDelay || settings.speedMode !== 'custom' ? Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay : minDelay;
    if (useAdaptive) currentDelay += Math.floor(sentCount / 10) * 500;
    if (useTyping) { let templateText = activeTemplate.text; if (settings.rotateTemplates) { const variations = activeTemplate.variations && activeTemplate.variations.length > 0 ? activeTemplate.variations : [activeTemplate.text]; templateText = variations[sentCount % variations.length]; } const message = generateMessage(entry, templateText); currentDelay += Math.min(message.length * 50, 5000); }
    if (settings.batchSize > 0 && sentCount >= nextBatchPauseAt && nextBatchPauseAt > 0) { currentDelay = settings.batchPause; toast(`Anti-Spam: Istirahat sejenak...`, { icon: '🛡️' }); setNextBatchPauseAt(sentCount + settings.batchSize + (Math.floor(Math.random() * 5) - 2)); }
    if (settings.longBreakAfter > 0 && sentCount > 0 && sentCount % settings.longBreakAfter === 0) { currentDelay = settings.longBreakDuration * 60 * 1000; setIsLongBreak(true); addLog(`😴 Istirahat panjang ${settings.longBreakDuration} menit...`, 'warning'); } else { setIsLongBreak(false); }
    return currentDelay;
  };

  const startBlast = () => {
    if (!isExtensionDetected && !settings.manualMode) { toast.error('Extension tidak terdeteksi!', { icon: '🔌' }); return; }
    const pending = entries.filter(e => e.status === 'pending');
    if (pending.length === 0) { toast.error('Tidak ada pesan pending'); return; }
    let entriesToProcess = [...pending];
    if (settings.shuffleQueue) { entriesToProcess = entriesToProcess.sort(() => Math.random() - 0.5); setEntries(prev => [...prev.filter(e => e.status !== 'pending'), ...entriesToProcess]); }
    const firstEntry = entriesToProcess[0];
    addLog(`🎬 Memulai blast...${settings.shuffleQueue ? ' (Urutan Diacak)' : ''}`, 'info');
    const newWindow = window.open(getWALink(firstEntry), 'WAsenderTab');
    if (!newWindow) { toast.error('Popup terblokir!', { duration: 8000, icon: '🚫' }); return; }
    window.focus();
    if (settings.autoSend) updateStatus(firstEntry.id, 'sending');
    else { updateStatus(firstEntry.id, 'sent'); setNextActionTime(Date.now() + calculateNextDelay(entries.filter(e => e.status === 'sent').length + 1, entriesToProcess[1] || firstEntry)); }
    setIsBlasting(true); setCurrentIndex(0);
    if (settings.batchSize > 0) setNextBatchPauseAt(entries.filter(e => e.status === 'sent').length + settings.batchSize + (Math.floor(Math.random() * 5) - 2));
  };

  const stopBlast = () => { setIsBlasting(false); setCurrentIndex(-1); setNextActionTime(0); addLog(`🛑 Proses blast dihentikan`, 'warning'); };

  useEffect(() => {
    if (isBlasting && !settings.manualMode) {
      const sendingEntry = entries.find(e => e.status === 'sending');
      if (sendingEntry) {
        let timeoutDuration = 25000;
        if (settings.speedMode === 'turbo') timeoutDuration = 5000;
        else if (settings.speedMode === 'fast') timeoutDuration = 10000;
        else if (settings.speedMode === 'normal') timeoutDuration = 15000;
        const timer = setTimeout(() => {
          addLog(`⏭️ Auto-Next untuk ${sendingEntry.recipientName}...`, 'info');
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
              setConsecutiveErrors(0); setSentThisHour(prev => prev + 1);
              addLog(`✅ Pesan terkirim ke ${entry.recipientName}`, 'success');
              const sentCount = currentEntries.filter(e => e.status === 'sent').length + 1;
              const pending = currentEntries.filter(e => e.status === 'pending' && e.id !== entryId);
              if (pending.length > 0) setNextActionTime(Date.now() + calculateNextDelay(sentCount, pending[0]));
              return currentEntries.map(e => e.id === entryId ? { ...e, status: 'sent' } : e);
            } else if (waStatus === 'invalid') {
              const currentRetries = entry.retryCount || 0;
              if (settings.autoRetry && currentRetries < settings.maxRetries) { addLog(`🔄 Retry ${currentRetries + 1}/${settings.maxRetries} untuk ${entry.recipientName}`, 'warning'); return currentEntries.map(e => e.id === entryId ? { ...e, status: 'pending', retryCount: currentRetries + 1 } : e); }
              else { setConsecutiveErrors(prev => prev + 1); addLog(`❌ Nomor tidak valid: ${entry.recipientName}`, 'error'); return currentEntries.map(e => e.id === entryId ? { ...e, status: 'failed' } : e); }
            }
            return currentEntries;
          });
        } else if (type === 'WA_WARNING_DETECTED') { stopBlast(); addLog(`🚨 PERINGATAN SPAM TERDETEKSI! Blast dihentikan.`, 'error'); toast.error('PERINGATAN SPAM!', { duration: 10000, icon: '🚨' }); }
      }
    };
    window.addEventListener('message', handleExtensionMessage);
    const heartbeatInterval = setInterval(() => { if (lastHeartbeat > 0 && Date.now() - lastHeartbeat > 20000 && isExtensionDetected) { setIsExtensionDetected(false); addLog(`🔌 Extension terputus`, 'warning'); } }, 5000);
    return () => { window.removeEventListener('message', handleExtensionMessage); clearInterval(heartbeatInterval); };
  }, [lastHeartbeat, isExtensionDetected, settings.autoRetry, settings.maxRetries, settings.speedMode]);

  useEffect(() => {
    const handlePing = (event: MessageEvent) => {
      if (event.data && event.data.source === 'wasender-extension' && event.data.type === 'EXTENSION_PONG') {
        if (!isExtensionDetected) { setIsExtensionDetected(true); addLog(`🔌 Extension terdeteksi`, 'success'); }
        setLastHeartbeat(Date.now());
      }
    };
    window.addEventListener('message', handlePing);
    const checkAttr = () => {
      if (document.documentElement.getAttribute('data-wasender-extension') === 'active') {
        if (!isExtensionDetected) { setIsExtensionDetected(true); addLog(`🔌 Extension aktif`, 'success'); }
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
          if (!newWindow) { addLog(`⚠️ Browser memblokir tab.`, 'warning'); setNextActionTime(Date.now() + 3000); return; }
          window.focus();
          if (settings.autoSend) updateStatus(entry.id, 'sending');
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
        if (pending.length > 0) { const entry = pending[0]; window.open(getWALink(entry), 'WAsenderTab'); updateStatus(entry.id, 'sent'); }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBlasting, settings.manualMode, entries]);

  const filteredEntries = useMemo(() => entries.filter(e => e.recipientName.toLowerCase().includes(searchQuery.toLowerCase()) || e.phone.includes(searchQuery) || e.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase())), [entries, searchQuery]);

  const statsData = useMemo(() => {
    const sent = entries.filter(e => e.status === 'sent').length;
    const pending = entries.filter(e => e.status === 'pending').length;
    const received = entries.filter(e => e.isReceived).length;
    return [
      { name: 'Sent', value: sent, color: '#22d3ee' },
      { name: 'Pending', value: pending, color: '#f59e0b' },
      { name: 'Received', value: received, color: '#a78bfa' }
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
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `wasender_report_${new Date().toISOString().split('T')[0]}.csv`; link.click();
    toast.success('Laporan berhasil diunduh');
  };

  const isDark = isDarkMode;

  return (
    <div className={cn("min-h-screen font-sans transition-colors duration-500", isDark ? "bg-[#070a10] text-white" : "bg-[#f0f4ff] text-[#0f1420]")}>
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className={cn("absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full blur-[120px] opacity-20", isDark ? "bg-cyan-500" : "bg-blue-400")} />
        <div className={cn("absolute top-1/2 -right-40 w-[500px] h-[500px] rounded-full blur-[120px] opacity-15", isDark ? "bg-violet-600" : "bg-purple-300")} />
        <div className={cn("absolute -bottom-40 left-1/3 w-[400px] h-[400px] rounded-full blur-[100px] opacity-10", isDark ? "bg-emerald-500" : "bg-teal-300")} />
      </div>

      <Toaster 
        position="top-right" 
        toastOptions={{ 
          style: { 
            background: isDark ? '#0d1117' : '#ffffff', 
            color: isDark ? '#e2e8f0' : '#0f1420', 
            border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.07)',
            borderRadius: '12px',
            fontSize: '13px'
          } 
        }} 
      />

      {/* Blasting Modal */}
      {isBlasting && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-2xl" />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className={cn(
              "relative max-w-md w-full rounded-3xl p-8 text-center space-y-6 border",
              isDark 
                ? "bg-[#0d1117]/90 backdrop-blur-xl border-white/10 shadow-[0_0_80px_rgba(34,211,238,0.15)]"
                : "bg-white/90 backdrop-blur-xl border-black/10 shadow-2xl"
            )}
          >
            {/* Animated ring */}
            <div className="relative w-28 h-28 mx-auto">
              <div className="absolute inset-0 rounded-full border-2 border-cyan-400/20 animate-ping" />
              <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-cyan-400 border-r-cyan-400/50 animate-spin" />
              <div className="absolute inset-2 rounded-full border-[2px] border-transparent border-b-violet-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center shadow-lg">
                  <Play size={20} className="text-white fill-white" />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold tracking-tight">
                {isLongBreak ? '😴 Long Break Active' : entries.some(e => e.status === 'sending') ? '⏳ Menunggu WA Web...' : 'Blasting in Progress'}
              </h3>
              <p className={cn("text-sm", isDark ? "text-slate-400" : "text-slate-500")}>
                <span className="font-bold text-cyan-500">{entries.filter(e => e.status === 'sent').length}</span> / <span className="font-bold">{entries.length}</span> pesan terkirim
              </p>
            </div>

            {!settings.manualMode ? (
              <div className={cn("rounded-2xl p-4 border", isDark ? "bg-white/5 border-white/8" : "bg-black/5 border-black/8")}>
                <div className={cn("text-5xl font-black tabular-nums tracking-tighter", isLongBreak ? "text-amber-400" : entries.some(e => e.status === 'sending') ? "text-blue-400 animate-pulse" : "text-cyan-400")}>
                  {entries.some(e => e.status === 'sending') ? '--:--' : `${Math.floor(countdown / 60)}:${(countdown % 60).toString().padStart(2, '0')}`}
                </div>
                <p className={cn("text-[10px] uppercase tracking-[0.2em] mt-1", isDark ? "text-slate-500" : "text-slate-400")}>
                  {entries.some(e => e.status === 'sending') ? 'Processing in WA' : isLongBreak ? 'Break ends in' : 'Next message in'}
                </p>
                {Date.now() >= nextActionTime && entries.filter(e => e.status === 'pending').length > 0 && !entries.some(e => e.status === 'sending') && (
                  <button onClick={() => { const pending = entries.filter(e => e.status === 'pending'); if (pending.length > 0) { const entry = pending[0]; const sentCount = entries.filter(e => e.status === 'sent').length; const newWindow = window.open(getWALink(entry, sentCount), 'WAsenderTab'); if (newWindow) { window.focus(); if (settings.autoSend) updateStatus(entry.id, 'sending'); else { updateStatus(entry.id, 'sent'); setNextActionTime(Date.now() + calculateNextDelay(sentCount + 1, entries.filter(e => e.status === 'pending')[1] || entry)); } } } }}
                    className="mt-3 w-full py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
                  >
                    <Play size={14} fill="currentColor" /> Klik jika tab tidak terbuka otomatis
                  </button>
                )}
              </div>
            ) : (
              <div className={cn("rounded-2xl p-4 border", isDark ? "bg-white/5 border-white/8" : "bg-black/5 border-black/8")}>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-bold uppercase tracking-wider mb-2">MODE MANUAL AKTIF</div>
                <p className={cn("text-[10px]", isDark ? "text-slate-400" : "text-slate-500")}>Tekan [SPASI] atau klik tombol di bawah untuk lanjut.</p>
              </div>
            )}

            <div className={cn("rounded-xl p-3 border text-[10px] text-amber-400 font-bold uppercase tracking-wider animate-pulse border-amber-500/20 bg-amber-500/5")}>
              PENTING: Tekan [ENTER] di tab WhatsApp untuk mengirim!
            </div>

            <div className="space-y-2">
              {entries.some(e => e.status === 'sending') && (
                <button onClick={() => { const sending = entries.find(e => e.status === 'sending'); if (sending) { addLog(`⏭️ Paksa lanjut: ${sending.recipientName}`, 'warning'); updateStatus(sending.id, 'sent'); } }}
                  className="w-full py-3 rounded-2xl font-bold text-sm bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 transition-all"
                >Paksa Lanjut ke Nomor Berikutnya</button>
              )}
              <button onClick={() => { const pending = entries.filter(e => e.status === 'pending'); if (pending.length > 0) { const entry = pending[0]; const newWindow = window.open(getWALink(entry), 'WAsenderTab'); if (newWindow) window.focus(); updateStatus(entry.id, 'sent'); } }}
                className={cn("w-full py-3 rounded-2xl font-bold text-sm border transition-all", isDark ? "bg-white/5 hover:bg-white/10 text-slate-300 border-white/8" : "bg-black/5 hover:bg-black/10 text-slate-600 border-black/8")}
              >Kirim Berikutnya (Manual)</button>
              <button onClick={stopBlast} className="w-full py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-2xl font-bold text-sm transition-all">Berhenti</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Header */}
      <header className={cn("sticky top-0 z-30 border-b transition-colors", isDark ? "bg-[#070a10]/80 backdrop-blur-2xl border-white/[0.06]" : "bg-[#f0f4ff]/80 backdrop-blur-2xl border-black/[0.06]")}>
        <div className="max-w-7xl mx-auto px-6 h-[68px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Send size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight">WAsender <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">PRO</span></h1>
              <p className={cn("text-[9px] uppercase tracking-[0.25em] font-mono", isDark ? "text-slate-500" : "text-slate-400")}>Advanced Blast Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isExtensionDetected && (
              <button onClick={downloadExtensionZip} className={cn("hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all", isDark ? "bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20" : "bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100")}>
                <Puzzle size={14} /> Setup Extension
              </button>
            )}
            <button onClick={handleResetDefault} className={cn("p-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5", isDark ? "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20" : "bg-red-50 border-red-200 text-red-500 hover:bg-red-100")}>
              <RotateCcw size={15} /><span className="hidden lg:inline">Reset</span>
            </button>
            <button onClick={() => setIsDarkMode(!isDarkMode)} className={cn("p-2 rounded-xl border transition-all", isDark ? "bg-white/5 border-white/8 text-slate-400 hover:text-cyan-400" : "bg-black/5 border-black/8 text-slate-500 hover:text-violet-600")}>
              {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button onClick={() => setShowSettingsModal(true)} className={cn("p-2 rounded-xl border transition-all", isDark ? "bg-white/5 border-white/8 text-slate-400 hover:text-cyan-400" : "bg-black/5 border-black/8 text-slate-500 hover:text-violet-600")}>
              <Settings2 size={16} />
            </button>
            <div className={cn("hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-wider", isBlasting ? (isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600") : (isDark ? "bg-white/5 border-white/8 text-slate-500" : "bg-black/5 border-black/8 text-slate-400"))}>
              <div className={cn("w-1.5 h-1.5 rounded-full", isBlasting ? "bg-cyan-400 animate-pulse" : (isDark ? "bg-slate-600" : "bg-slate-300"))} />
              {isBlasting ? 'Active' : 'Idle'}
            </div>
            <button onClick={exportToCSV} className={cn("flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all", isDark ? "bg-white/5 border-white/8 text-slate-400 hover:text-cyan-400" : "bg-black/5 border-black/8 text-slate-500 hover:text-violet-600")}>
              <Download size={14} /> Export
            </button>
          </div>
        </div>
      </header>

      <main className="relative max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN */}
        <div className="lg:col-span-4 space-y-5">
          
          {/* Stats Card */}
          <div className={cn("rounded-3xl p-6 border", isDark ? glassCard : glassCardLight)}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 size={16} className="text-cyan-400" />
                <span className="font-bold text-sm">Overview</span>
              </div>
              <span className={cn("text-[10px] font-mono uppercase tracking-widest", isDark ? "text-slate-500" : "text-slate-400")}>{entries.length} total</span>
            </div>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statsData} innerRadius={52} outerRadius={70} paddingAngle={4} dataKey="value" strokeWidth={0}>
                    {statsData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <RechartsTooltip contentStyle={{ backgroundColor: isDark ? '#0d1117' : '#ffffff', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)', color: isDark ? '#e2e8f0' : '#0f1420', borderRadius: '12px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {statsData.map(s => (
                <div key={s.name} className={cn("p-3 rounded-2xl border text-center", isDark ? "bg-white/[0.03] border-white/[0.06]" : "bg-black/[0.03] border-black/[0.06]")}>
                  <div className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: s.color }}>{s.name}</div>
                  <div className="text-xl font-black" style={{ color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Engine Settings */}
          <div className={cn("rounded-3xl p-6 border", isDark ? glassCard : glassCardLight)}>
            <div className="flex items-center gap-2 mb-5">
              <Timer size={16} className="text-violet-400" />
              <span className="font-bold text-sm">Engine Settings</span>
            </div>
            <div className="space-y-5">
              <div>
                <label className={cn("block text-[10px] font-bold uppercase tracking-widest mb-2", isDark ? "text-slate-500" : "text-slate-400")}>Nama Pengirim</label>
                <input type="text" value={settings.senderName} onChange={(e) => setSettings(prev => ({ ...prev, senderName: e.target.value }))} placeholder="Contoh: Admin JNT"
                  className={cn(inputStyle, isDark ? "bg-white/[0.04] border border-white/[0.08] text-white focus:border-cyan-500/50 focus:bg-white/[0.06]" : "bg-black/[0.04] border border-black/[0.08] text-[#0f1420] focus:border-violet-500/50")}
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className={cn("text-[10px] font-bold uppercase tracking-widest", isDark ? "text-slate-500" : "text-slate-400")}>Blast Delay</label>
                  <span className="text-xs font-mono font-bold text-cyan-400">{settings.delay / 1000}s</span>
                </div>
                <div className="relative">
                  <input type="range" min="1000" max="10000" step="500" value={settings.delay} onChange={(e) => setSettings(prev => ({ ...prev, delay: parseInt(e.target.value) }))}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-cyan-500"
                    style={{ background: `linear-gradient(to right, #22d3ee ${(settings.delay - 1000) / 90}%, ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'} ${(settings.delay - 1000) / 90}%)` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] mt-1 font-mono font-bold" style={{ color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)' }}>
                  <span>FAST</span><span>SAFE</span>
                </div>
              </div>
            </div>
          </div>

          {/* Templates */}
          <div className={cn("rounded-3xl p-6 border", isDark ? glassCard : glassCardLight)}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-emerald-400" />
                <span className="font-bold text-sm">Templates</span>
                <span className={cn("text-[9px] font-bold text-emerald-400 animate-pulse")}>● saved</span>
              </div>
              <button onClick={() => { const def = DEFAULT_TEMPLATES.find(t => t.id === activeTemplateId); if (def && confirm('Reset template ke default?')) { setTemplates(prev => prev.map(t => t.id === activeTemplateId ? { ...def } : t)); setActiveVariationIndex(0); toast.success('Template direset'); } }}
                className={cn("p-1.5 rounded-lg transition-all", isDark ? "text-slate-500 hover:text-amber-400 hover:bg-amber-500/10" : "text-slate-400 hover:text-amber-600 hover:bg-amber-50")}>
                <History size={15} />
              </button>
            </div>

            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
              {templates.map(t => (
                <button key={t.id} onClick={() => { setActiveTemplateId(t.id); setActiveVariationIndex(0); }}
                  className={cn("whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-bold transition-all border",
                    activeTemplateId === t.id
                      ? "bg-gradient-to-r from-cyan-500 to-violet-600 text-white border-transparent shadow-lg shadow-cyan-500/20"
                      : (isDark ? "bg-white/[0.04] border-white/[0.08] text-slate-400 hover:text-slate-200" : "bg-black/[0.04] border-black/[0.08] text-slate-500 hover:text-slate-700"))}>
                  {t.name}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 mb-3">
              <span className={cn("text-[9px] font-bold uppercase tracking-widest", isDark ? "text-slate-500" : "text-slate-400")}>Variasi:</span>
              {[0,1,2].map(idx => (
                <button key={idx} onClick={() => setActiveVariationIndex(idx)}
                  className={cn("w-7 h-7 rounded-lg text-xs font-bold transition-all border flex items-center justify-center",
                    activeVariationIndex === idx
                      ? "bg-gradient-to-br from-cyan-500/20 to-violet-500/20 text-cyan-400 border-cyan-500/30"
                      : (isDark ? "bg-white/[0.03] border-white/[0.06] text-slate-500" : "bg-black/[0.03] border-black/[0.06] text-slate-400"))}>{idx+1}</button>
              ))}
              <div className={cn("ml-auto text-[9px]", isDark ? "text-slate-600" : "text-slate-400")}>
                {settings.rotateTemplates ? "Rotasi ✓" : "Rotasi ✗"}
              </div>
            </div>

            <textarea value={currentTemplateText} onChange={(e) => updateActiveTemplateText(e.target.value)}
              className={cn("w-full h-36 p-4 text-sm rounded-2xl outline-none transition-all resize-none leading-relaxed border",
                isDark ? "bg-white/[0.03] border-white/[0.06] text-slate-200 focus:border-cyan-500/40 focus:bg-white/[0.05] placeholder:text-slate-600" : "bg-black/[0.03] border-black/[0.06] text-[#0f1420] focus:border-violet-500/40 placeholder:text-slate-400")}
              placeholder="Tulis template pesan..."
            />

            <div className="mt-3 flex flex-wrap gap-1.5">
              {['{salam}','{pengirim}','{nama}','{barang}','{resi}','{alamat}','{cod}','{dfod}','{if_cod}','{/if_cod}','{if_dfod}','{/if_dfod}'].map(tag => (
                <button key={tag} onClick={() => updateActiveTemplateText(currentTemplateText + ' ' + tag)}
                  className={cn("text-[9px] font-mono font-bold px-2 py-1 rounded-lg border transition-all",
                    isDark ? "bg-white/[0.03] border-white/[0.06] text-cyan-400/70 hover:text-cyan-400 hover:border-cyan-500/30" : "bg-black/[0.03] border-black/[0.06] text-violet-600/70 hover:text-violet-600 hover:border-violet-400/30")}>
                  {tag}
                </button>
              ))}
            </div>

            <div className={cn("mt-3 p-3 rounded-2xl border", isDark ? "bg-blue-500/5 border-blue-500/15" : "bg-blue-50 border-blue-100")}>
              <div className="flex items-center gap-1.5 mb-1">
                <Sparkles size={11} className="text-blue-400" />
                <span className={cn("text-[9px] font-bold uppercase tracking-wider", isDark ? "text-blue-400" : "text-blue-600")}>Spintax Anti-Ban</span>
              </div>
              <p className={cn("text-[10px] leading-relaxed", isDark ? "text-blue-300/60" : "text-blue-600/70")}>
                Format: <span className="font-mono font-bold bg-blue-500/10 px-1 rounded">{"{Halo|Hai|Pagi}"}</span> untuk variasi otomatis.
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-8 space-y-5">
          
          {/* Action Bar */}
          <div className={cn("rounded-3xl p-4 border flex flex-col md:flex-row gap-3 items-stretch md:items-center", isDark ? glassCard : glassCardLight)}>
            <div className="relative flex-1">
              <Search className={cn("absolute left-3.5 top-1/2 -translate-y-1/2", isDark ? "text-slate-500" : "text-slate-400")} size={15} />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Cari nama, nomor, atau resi..."
                className={cn("w-full pl-10 pr-4 py-2.5 text-sm rounded-2xl outline-none border transition-all",
                  isDark ? "bg-white/[0.04] border-white/[0.08] text-white placeholder:text-slate-500 focus:border-cyan-500/40" : "bg-black/[0.04] border-black/[0.08] text-[#0f1420] placeholder:text-slate-400 focus:border-violet-500/40")}
              />
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              <div className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[9px] font-bold border",
                isExtensionDetected
                  ? (isDark ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-600")
                  : (isDark ? "bg-white/[0.04] border-white/[0.06] text-slate-500" : "bg-black/[0.04] border-black/[0.06] text-slate-400"))}>
                <Puzzle size={10} className={isExtensionDetected ? "animate-pulse" : ""} />
                {isExtensionDetected ? "Connected" : "Disconnected"}
              </div>
              <button onClick={() => setShowBulkModal(true)}
                className={cn("px-4 py-2.5 rounded-2xl font-bold text-sm flex items-center gap-2 border transition-all",
                  isDark ? "bg-white/[0.04] border-white/[0.08] text-slate-300 hover:text-cyan-400 hover:border-cyan-500/30" : "bg-black/[0.04] border-black/[0.08] text-slate-600 hover:text-violet-600 hover:border-violet-400/30")}>
                <FileSpreadsheet size={15} /> Bulk Import
              </button>
              <button onClick={() => setShowPreviewModal(true)} disabled={entries.filter(e => e.status === 'pending').length === 0}
                className={cn("px-4 py-2.5 rounded-2xl font-bold text-sm flex items-center gap-2 border transition-all disabled:opacity-40",
                  isDark ? "bg-white/[0.04] border-white/[0.08] text-slate-300 hover:text-cyan-400 hover:border-cyan-500/30" : "bg-black/[0.04] border-black/[0.08] text-slate-600 hover:text-violet-600 hover:border-violet-400/30")}>
                <Search size={15} /> Preview
              </button>
              <button onClick={isBlasting ? stopBlast : startBlast} disabled={entries.length === 0}
                className={cn("px-6 py-2.5 rounded-2xl font-bold text-sm flex items-center gap-2 transition-all disabled:opacity-40",
                  isBlasting
                    ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
                    : "bg-gradient-to-r from-cyan-500 to-violet-600 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 hover:scale-[1.02] active:scale-[0.98]")}>
                {isBlasting ? <Square size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
                {isBlasting ? 'Stop' : 'Start Engine'}
              </button>
            </div>
          </div>

          {/* Warning Banner */}
          {!isBlasting && entries.length > 0 && (
            <div className={cn("rounded-2xl px-4 py-3 border flex items-start gap-3", isDark ? "bg-amber-500/5 border-amber-500/15" : "bg-amber-50 border-amber-100")}>
              <AlertCircle className="text-amber-400 shrink-0 mt-0.5" size={15} />
              <p className={cn("text-xs leading-relaxed", isDark ? "text-amber-300/70" : "text-amber-700")}>
                <span className="font-bold">PENTING:</span> Pastikan popup diizinkan di browser. Tab WhatsApp Web akan terbuka otomatis.
              </p>
            </div>
          )}

          {/* Add Entry Form */}
          <div className={cn("rounded-3xl p-6 border", isDark ? glassCard : glassCardLight)}>
            <div className="flex items-center gap-2 mb-5">
              <Plus size={16} className="text-emerald-400" />
              <span className="font-bold text-sm">Tambah Data</span>
            </div>
            <form onSubmit={handleAddEntry} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { label: 'Phone', key: 'phone', placeholder: '0812...' },
                  { label: 'Nama Penerima', key: 'recipientName', placeholder: 'Recipient Name' },
                  { label: 'Nama Barang', key: 'itemName', placeholder: 'Nama Barang' },
                ].map(field => (
                  <div key={field.key}>
                    <label className={cn("block text-[10px] font-bold uppercase tracking-widest mb-1.5", isDark ? "text-slate-500" : "text-slate-400")}>{field.label}</label>
                    <input type="text" value={formData[field.key as keyof typeof formData]} onChange={(e) => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))} placeholder={field.placeholder}
                      className={cn(inputStyle, isDark ? "bg-white/[0.04] border border-white/[0.08] text-white focus:border-cyan-500/50 placeholder:text-slate-600" : "bg-black/[0.04] border border-black/[0.08] text-[#0f1420] focus:border-violet-500/50 placeholder:text-slate-400")} />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className={cn("block text-[10px] font-bold uppercase tracking-widest mb-1.5", isDark ? "text-slate-500" : "text-slate-400")}>Resi</label>
                  <input type="text" value={formData.receiptNumber} onChange={(e) => setFormData(prev => ({ ...prev, receiptNumber: e.target.value }))} placeholder="Resi Number"
                    className={cn(inputStyle, isDark ? "bg-white/[0.04] border border-white/[0.08] text-white focus:border-cyan-500/50 placeholder:text-slate-600" : "bg-black/[0.04] border border-black/[0.08] text-[#0f1420] focus:border-violet-500/50 placeholder:text-slate-400")} />
                </div>
                <div className="md:col-span-2">
                  <label className={cn("block text-[10px] font-bold uppercase tracking-widest mb-1.5", isDark ? "text-slate-500" : "text-slate-400")}>Alamat</label>
                  <input type="text" value={formData.address} onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))} placeholder="Alamat Lengkap"
                    className={cn(inputStyle, isDark ? "bg-white/[0.04] border border-white/[0.08] text-white focus:border-cyan-500/50 placeholder:text-slate-600" : "bg-black/[0.04] border border-black/[0.08] text-[#0f1420] focus:border-violet-500/50 placeholder:text-slate-400")} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <div>
                  <label className={cn("block text-[10px] font-bold uppercase tracking-widest mb-1.5", isDark ? "text-slate-500" : "text-slate-400")}>COD</label>
                  <input type="text" value={formData.cod} onChange={(e) => setFormData(prev => ({ ...prev, cod: e.target.value.replace(/[^0-9.,]/g, '') }))} placeholder="274,398"
                    className={cn(inputStyle, isDark ? "bg-white/[0.04] border border-white/[0.08] text-white focus:border-cyan-500/50 placeholder:text-slate-600" : "bg-black/[0.04] border border-black/[0.08] text-[#0f1420] focus:border-violet-500/50 placeholder:text-slate-400")} />
                </div>
                <div>
                  <label className={cn("block text-[10px] font-bold uppercase tracking-widest mb-1.5", isDark ? "text-slate-500" : "text-slate-400")}>DFOD</label>
                  <input type="text" value={formData.dfod} onChange={(e) => setFormData(prev => ({ ...prev, dfod: e.target.value.replace(/[^0-9.,]/g, '') }))} placeholder="10,000"
                    className={cn(inputStyle, isDark ? "bg-white/[0.04] border border-white/[0.08] text-white focus:border-cyan-500/50 placeholder:text-slate-600" : "bg-black/[0.04] border border-black/[0.08] text-[#0f1420] focus:border-violet-500/50 placeholder:text-slate-400")} />
                </div>
                <button type="submit"
                  className="py-3 bg-gradient-to-r from-cyan-500 to-emerald-500 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 hover:scale-[1.01] active:scale-[0.99] transition-all">
                  <Plus size={16} /> Add to Queue
                </button>
              </div>
            </form>
          </div>

          {/* System Console */}
          <div className={cn("rounded-3xl p-5 border font-mono", isDark ? "bg-[#020408]/80 border-white/[0.06] backdrop-blur-xl" : "bg-[#f8faff]/80 border-black/[0.06] backdrop-blur-xl")}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", isDark ? "bg-cyan-400 animate-pulse" : "bg-violet-500 animate-pulse")} />
                <span className={cn("text-[9px] font-bold uppercase tracking-[0.2em]", isDark ? "text-slate-500" : "text-slate-400")}>System Console</span>
              </div>
              <button onClick={() => setLogs([])} className={cn("text-[9px] font-bold uppercase tracking-widest transition-colors", isDark ? "text-slate-600 hover:text-slate-400" : "text-slate-400 hover:text-slate-600")}>Clear</button>
            </div>
            <div className="h-28 overflow-y-auto space-y-0.5 pr-1">
              {logs.length === 0 ? (
                <div className={cn("text-[11px] italic", isDark ? "text-slate-600" : "text-slate-400")}>Waiting for system actions...</div>
              ) : (
                logs.map(log => (
                  <div key={log.id} className="flex gap-3 text-[11px] leading-relaxed">
                    <span className={cn("shrink-0", isDark ? "text-slate-600" : "text-slate-400")}>[{new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}]</span>
                    <span className={cn("break-all", log.type === 'success' ? "text-emerald-400" : log.type === 'error' ? "text-red-400" : log.type === 'warning' ? "text-amber-400" : "text-cyan-400")}>
                      {log.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Queue Table */}
          <div className={cn("rounded-3xl border overflow-hidden", isDark ? glassCard : glassCardLight)}>
            <div className={cn("px-6 py-4 border-b flex items-center justify-between", isDark ? "border-white/[0.06]" : "border-black/[0.06]")}>
              <div className="flex items-center gap-2">
                <FileText size={15} className="text-violet-400" />
                <span className="font-bold text-sm">Queue Management</span>
                <span className={cn("px-2 py-0.5 rounded-lg text-[10px] font-bold", isDark ? "bg-white/[0.06] text-slate-400" : "bg-black/[0.06] text-slate-500")}>{filteredEntries.length}</span>
              </div>
              {isConfirmingClear ? (
                <div className="flex items-center gap-2">
                  <span className={cn("text-[10px] font-bold uppercase", isDark ? "text-red-400" : "text-red-500")}>Confirm?</span>
                  <button onClick={clearAll} className="px-2.5 py-1 text-[10px] font-bold uppercase bg-red-500 text-white rounded-lg">Yes</button>
                  <button onClick={() => setIsConfirmingClear(false)} className={cn("px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg", isDark ? "bg-white/[0.06] text-slate-400" : "bg-black/[0.06] text-slate-500")}>No</button>
                </div>
              ) : (
                <button onClick={() => setIsConfirmingClear(true)} className={cn("p-1.5 rounded-lg transition-all", isDark ? "text-slate-600 hover:text-red-400 hover:bg-red-500/10" : "text-slate-300 hover:text-red-500 hover:bg-red-50")}>
                  <Trash2 size={15} />
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className={isDark ? "bg-white/[0.015]" : "bg-black/[0.015]"}>
                    {['Recipient','Details','Status','Received','Actions'].map(h => (
                      <th key={h} className={cn("px-5 py-3.5 text-[9px] font-bold uppercase tracking-[0.18em]", isDark ? "text-slate-600" : "text-slate-400")}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className={cn("divide-y", isDark ? "divide-white/[0.04]" : "divide-black/[0.04]")}>
                  <AnimatePresence mode="popLayout">
                    {filteredEntries.length === 0 ? (
                      <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <td colSpan={5} className={cn("px-6 py-16 text-center text-sm italic", isDark ? "text-slate-600" : "text-slate-400")}>
                          No matching records found.
                        </td>
                      </motion.tr>
                    ) : (
                      filteredEntries.map((entry, index) => (
                        <motion.tr key={entry.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -10 }}
                          className={cn("group transition-all", isBlasting && index === currentIndex
                            ? (isDark ? "bg-cyan-500/[0.05]" : "bg-cyan-50/80")
                            : (isDark ? "hover:bg-white/[0.02]" : "hover:bg-black/[0.02]"))}>
                          <td className="px-5 py-4">
                            <div className="font-bold text-sm">{entry.recipientName}</div>
                            <div className={cn("text-[11px] font-mono mt-0.5", isDark ? "text-slate-500" : "text-slate-400")}>{entry.phone}</div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="text-sm font-medium truncate max-w-[180px]">{entry.itemName || '-'}</div>
                            <div className={cn("text-[10px] font-mono mt-0.5", isDark ? "text-slate-600" : "text-slate-400")}>Resi: {entry.receiptNumber || '-'}</div>
                            {entry.address && <div className={cn("text-[10px] truncate max-w-[180px] mt-0.5", isDark ? "text-slate-600" : "text-slate-400")}>{entry.address}</div>}
                            <div className="flex gap-2 mt-1">
                              {entry.cod && <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-md">COD {formatCurrency(entry.cod)}</span>}
                              {entry.dfod && <span className="text-[9px] font-bold text-violet-400 bg-violet-400/10 px-1.5 py-0.5 rounded-md">DFOD {formatCurrency(entry.dfod)}</span>}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border",
                              entry.status === 'sent' ? (isDark ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-600")
                              : entry.status === 'sending' ? (isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400 animate-pulse" : "bg-cyan-50 border-cyan-200 text-cyan-600 animate-pulse")
                              : entry.status === 'failed' ? (isDark ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-red-50 border-red-200 text-red-500")
                              : (isDark ? "bg-amber-500/10 border-amber-500/20 text-amber-400" : "bg-amber-50 border-amber-200 text-amber-600"))}>
                              {entry.status === 'sent' ? <CheckCircle2 size={9} /> : entry.status === 'sending' ? <Loader2 size={9} className="animate-spin" /> : entry.status === 'failed' ? <AlertCircle size={9} /> : <Clock size={9} />}
                              {entry.status}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <button onClick={() => toggleReceived(entry.id)}
                              className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border",
                                entry.isReceived
                                  ? (isDark ? "bg-violet-500/10 border-violet-500/20 text-violet-400" : "bg-violet-50 border-violet-200 text-violet-600")
                                  : (isDark ? "bg-white/[0.03] border-white/[0.06] text-slate-500" : "bg-black/[0.03] border-black/[0.06] text-slate-400"))}>
                              <div className={cn("w-3 h-3 rounded flex items-center justify-center border transition-all", entry.isReceived ? "bg-violet-500 border-violet-500" : (isDark ? "border-slate-600" : "border-slate-300"))}>
                                {entry.isReceived && <CheckCircle2 size={8} className="text-white" />}
                              </div>
                              {entry.isReceived ? 'Diterima' : 'Belum'}
                            </button>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleSendManual(entry)} className={cn("p-1.5 rounded-lg transition-all", isDark ? "text-slate-600 hover:text-cyan-400 hover:bg-cyan-500/10" : "text-slate-300 hover:text-violet-600 hover:bg-violet-50")}>
                                <ExternalLink size={14} />
                              </button>
                              <button onClick={() => setEntries(prev => prev.filter(e => e.id !== entry.id))} className={cn("p-1.5 rounded-lg transition-all", isDark ? "text-slate-600 hover:text-red-400 hover:bg-red-500/10" : "text-slate-300 hover:text-red-500 hover:bg-red-50")}>
                                <Trash2 size={14} />
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
        </div>
      </main>

      {/* BULK IMPORT MODAL */}
      <AnimatePresence>
        {showBulkModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowBulkModal(false)} className="absolute inset-0 bg-black/70 backdrop-blur-2xl" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              className={cn("relative w-full max-w-2xl max-h-[90vh] rounded-3xl border overflow-hidden flex flex-col", isDark ? "bg-[#0a0e16] border-white/[0.08] shadow-[0_0_80px_rgba(34,211,238,0.08)]" : "bg-white border-black/[0.08] shadow-2xl")}>
              <div className={cn("p-6 border-b flex items-center justify-between", isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-black/[0.06] bg-black/[0.02]")}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 border border-cyan-500/20 flex items-center justify-center">
                    <FileSpreadsheet size={17} className="text-cyan-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Bulk Import</h2>
                    <p className={cn("text-[10px] uppercase tracking-wider", isDark ? "text-slate-500" : "text-slate-400")}>Copy-paste dari Excel atau CSV</p>
                  </div>
                </div>
                <button onClick={() => setShowBulkModal(false)} className={cn("p-2 rounded-xl transition-all", isDark ? "text-slate-500 hover:text-white hover:bg-white/[0.06]" : "text-slate-400 hover:text-black hover:bg-black/[0.06]")}><X size={18} /></button>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-2 gap-3">
                  <div className={cn("p-4 rounded-2xl border", isDark ? "bg-cyan-500/5 border-cyan-500/15" : "bg-cyan-50 border-cyan-100")}>
                    <div className={cn("text-[9px] font-bold uppercase tracking-widest mb-1", isDark ? "text-cyan-400" : "text-cyan-600")}>Format Kolom</div>
                    <p className={cn("text-[11px]", isDark ? "text-cyan-300/60" : "text-cyan-700")}>No, Resi, Nama, HP, Alamat, Tanda, COD, DFOD, Barang</p>
                  </div>
                  <div className={cn("p-4 rounded-2xl border", isDark ? "bg-violet-500/5 border-violet-500/15" : "bg-violet-50 border-violet-100")}>
                    <div className={cn("text-[9px] font-bold uppercase tracking-widest mb-1", isDark ? "text-violet-400" : "text-violet-600")}>Cara Pakai</div>
                    <p className={cn("text-[11px]", isDark ? "text-violet-300/60" : "text-violet-700")}>Pilih range di Excel, copy, lalu paste di bawah</p>
                  </div>
                </div>
                <textarea value={bulkData} onChange={(e) => setBulkData(e.target.value)} placeholder="1	JX123456789	Budi Santoso	08123456789	Jl. Merdeka No. 1	COD	150000	0	Sepatu..."
                  className={cn("w-full h-56 p-5 text-sm font-mono rounded-2xl outline-none resize-none border transition-all",
                    isDark ? "bg-white/[0.03] border-white/[0.06] text-slate-300 focus:border-cyan-500/40 placeholder:text-slate-700" : "bg-black/[0.03] border-black/[0.06] text-[#0f1420] focus:border-violet-500/40 placeholder:text-slate-400")} />
                <div className="flex gap-3">
                  <button onClick={() => setShowBulkModal(false)} className={cn("flex-1 py-3.5 rounded-2xl font-bold text-sm border transition-all", isDark ? "bg-white/[0.04] border-white/[0.08] text-slate-400 hover:text-slate-200" : "bg-black/[0.04] border-black/[0.08] text-slate-500 hover:text-slate-700")}>Cancel</button>
                  <button onClick={handleBulkImport} className="flex-[2] py-3.5 bg-gradient-to-r from-cyan-500 to-emerald-500 text-white rounded-2xl font-bold text-sm shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-all">Import Data</button>
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPreviewModal(false)} className="absolute inset-0 bg-black/70 backdrop-blur-2xl" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              className={cn("relative w-full max-w-lg max-h-[90vh] rounded-3xl border overflow-hidden flex flex-col", isDark ? "bg-[#0a0e16] border-white/[0.08] shadow-[0_0_80px_rgba(167,139,250,0.08)]" : "bg-white border-black/[0.08] shadow-2xl")}>
              <div className={cn("p-6 border-b flex items-center justify-between", isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-black/[0.06] bg-black/[0.02]")}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-violet-500/20 flex items-center justify-center">
                    <MessageSquare size={17} className="text-violet-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Message Preview</h2>
                    <p className={cn("text-[10px] uppercase tracking-wider", isDark ? "text-slate-500" : "text-slate-400")}>First Pending Entry</p>
                  </div>
                </div>
                <button onClick={() => setShowPreviewModal(false)} className={cn("p-2 rounded-xl transition-all", isDark ? "text-slate-500 hover:text-white hover:bg-white/[0.06]" : "text-slate-400 hover:text-black hover:bg-black/[0.06]")}><X size={18} /></button>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                {entries.find(e => e.status === 'pending') ? (
                  <>
                    <div className={cn("p-4 rounded-2xl border", isDark ? "bg-white/[0.03] border-white/[0.06]" : "bg-black/[0.03] border-black/[0.06]")}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold shadow-lg">
                          {entries.find(e => e.status === 'pending')?.recipientName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-sm">{entries.find(e => e.status === 'pending')?.recipientName}</div>
                          <div className={cn("text-[11px] font-mono", isDark ? "text-slate-500" : "text-slate-400")}>{entries.find(e => e.status === 'pending')?.phone}</div>
                        </div>
                      </div>
                      <div className={cn("p-4 rounded-xl border text-sm whitespace-pre-wrap leading-relaxed", isDark ? "bg-white/[0.02] border-white/[0.05] text-slate-300" : "bg-black/[0.02] border-black/[0.05] text-[#0f1420]")}>
                        {(() => {
                          const entry = entries.find(e => e.status === 'pending');
                          if (!entry) return '';
                          const sentCount = entries.filter(e => e.status === 'sent').length;
                          let templateText = activeTemplate.text;
                          if (settings.rotateTemplates) { const variations = activeTemplate.variations && activeTemplate.variations.length > 0 ? activeTemplate.variations : [activeTemplate.text]; templateText = variations[sentCount % variations.length]; }
                          return generateMessage(entry, templateText);
                        })()}
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => setShowPreviewModal(false)} className={cn("flex-1 py-3 rounded-2xl font-bold text-sm border transition-all", isDark ? "bg-white/[0.04] border-white/[0.08] text-slate-400 hover:text-slate-200" : "bg-black/[0.04] border-black/[0.08] text-slate-500 hover:text-slate-700")}>Close</button>
                      <button onClick={() => { const entry = entries.find(e => e.status === 'pending'); if (entry) { const sentCount = entries.filter(e => e.status === 'sent').length; const newWindow = window.open(getWALink(entry, sentCount), 'WAsenderTab'); if (newWindow) window.focus(); updateStatus(entry.id, 'sent'); setShowPreviewModal(false); } }}
                        className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-violet-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 flex items-center justify-center gap-2 transition-all">
                        <Send size={15} /> Send Now
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-16">
                    <div className={cn("w-16 h-16 rounded-3xl mx-auto flex items-center justify-center mb-4", isDark ? "bg-white/[0.03] border border-white/[0.06]" : "bg-black/[0.03] border border-black/[0.06]")}>
                      <Clock size={28} className={isDark ? "text-slate-600" : "text-slate-300"} />
                    </div>
                    <p className={cn("text-sm italic", isDark ? "text-slate-600" : "text-slate-400")}>No pending entries to preview.</p>
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSettingsModal(false)} className="absolute inset-0 bg-black/70 backdrop-blur-2xl" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              className={cn("relative w-full max-w-md max-h-[90vh] rounded-3xl border overflow-hidden flex flex-col", isDark ? "bg-[#0a0e16] border-white/[0.08]" : "bg-white border-black/[0.08] shadow-2xl")}>
              <div className={cn("p-6 border-b flex items-center justify-between", isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-black/[0.06] bg-black/[0.02]")}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/20 flex items-center justify-center">
                    <Settings2 size={17} className="text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Settings</h2>
                    <p className={cn("text-[10px] uppercase tracking-wider", isDark ? "text-slate-500" : "text-slate-400")}>Engine Configuration</p>
                  </div>
                </div>
                <button onClick={() => setShowSettingsModal(false)} className={cn("p-2 rounded-xl transition-all", isDark ? "text-slate-500 hover:text-white hover:bg-white/[0.06]" : "text-slate-400 hover:text-black hover:bg-black/[0.06]")}><X size={18} /></button>
              </div>

              {/* Tabs */}
              <div className={cn("flex gap-1 px-6 pt-4 border-b", isDark ? "border-white/[0.06]" : "border-black/[0.06]")}>
                {(['general', 'antispam'] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveSettingsTab(tab)}
                    className={cn("pb-3 px-1 text-xs font-bold uppercase tracking-widest transition-all relative",
                      activeSettingsTab === tab ? (isDark ? "text-cyan-400" : "text-violet-600") : (isDark ? "text-slate-500" : "text-slate-400"))}>
                    {tab === 'general' ? 'General' : 'Anti-Spam'}
                    {activeSettingsTab === tab && <motion.div layoutId="settingsTab" className={cn("absolute bottom-0 left-0 right-0 h-0.5 rounded-full", isDark ? "bg-cyan-400" : "bg-violet-500")} />}
                  </button>
                ))}
              </div>

              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                {activeSettingsTab === 'antispam' && (
                  <div className={cn("p-4 rounded-2xl border", isDark ? "bg-emerald-500/5 border-emerald-500/15" : "bg-emerald-50 border-emerald-100")}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={cn("text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5", isDark ? "text-emerald-400" : "text-emerald-600")}><Shield size={11} /> Safety Score</span>
                      <span className={cn("text-xs font-black", safetyScore > 80 ? "text-emerald-400" : safetyScore > 50 ? "text-amber-400" : "text-red-400")}>{safetyScore}%</span>
                    </div>
                    <div className={cn("h-1.5 w-full rounded-full overflow-hidden", isDark ? "bg-white/[0.06]" : "bg-black/[0.06]")}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${safetyScore}%` }}
                        className={cn("h-full rounded-full transition-all duration-700", safetyScore > 80 ? "bg-gradient-to-r from-emerald-400 to-cyan-400" : safetyScore > 50 ? "bg-gradient-to-r from-amber-400 to-orange-400" : "bg-gradient-to-r from-red-500 to-rose-500")} />
                    </div>
                    <p className={cn("text-[9px] mt-2 italic", isDark ? "text-emerald-300/50" : "text-emerald-600/60")}>
                      {safetyScore > 80 ? "Sangat Aman: Pola mirip manusia." : safetyScore > 50 ? "Cukup Aman: Tambah variasi pesan." : "Beresiko: Rentan terkena banned!"}
                    </p>
                  </div>
                )}

                {activeSettingsTab === 'general' ? (
                  <div className="space-y-4">
                    <div>
                      <label className={cn("block text-[10px] font-bold uppercase tracking-widest mb-2", isDark ? "text-slate-500" : "text-slate-400")}>Nama Pengirim</label>
                      <input type="text" value={settings.senderName} onChange={(e) => setSettings(prev => ({ ...prev, senderName: e.target.value }))} placeholder="Admin JNT"
                        className={cn(inputStyle, isDark ? "bg-white/[0.04] border border-white/[0.08] text-white focus:border-cyan-500/50" : "bg-black/[0.04] border border-black/[0.08] text-[#0f1420] focus:border-violet-500/50")} />
                    </div>

                    <div>
                      <label className={cn("block text-[10px] font-bold uppercase tracking-widest mb-3", isDark ? "text-slate-500" : "text-slate-400")}>
                        <Zap size={11} className="inline mr-1 text-amber-400" /> Kecepatan Blast
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[{ id: 'safe', label: 'Main Aman', desc: '15–30s', icon: '🛡️' }, { id: 'normal', label: 'Normal', desc: '8–15s', icon: '⚖️' }, { id: 'fast', label: 'Percepat', desc: '3–7s', icon: '⚡' }, { id: 'turbo', label: 'Turbo', desc: '1–2s', icon: '🚀' }].map(mode => (
                          <button key={mode.id} onClick={() => setSettings(prev => ({ ...prev, speedMode: mode.id as any }))}
                            className={cn("p-3 rounded-2xl border text-left transition-all",
                              settings.speedMode === mode.id
                                ? (isDark ? "bg-cyan-500/10 border-cyan-500/30 ring-1 ring-cyan-500/30" : "bg-violet-50 border-violet-300 ring-1 ring-violet-300")
                                : (isDark ? "bg-white/[0.03] border-white/[0.06] hover:border-cyan-500/20" : "bg-black/[0.03] border-black/[0.06] hover:border-violet-400/30"))}>
                            <div className="flex items-center justify-between mb-1">
                              <span>{mode.icon}</span>
                              {settings.speedMode === mode.id && <div className={cn("w-1.5 h-1.5 rounded-full", isDark ? "bg-cyan-400" : "bg-violet-500")} />}
                            </div>
                            <div className="text-xs font-bold">{mode.label}</div>
                            <div className={cn("text-[10px]", isDark ? "text-slate-500" : "text-slate-400")}>{mode.desc}</div>
                          </button>
                        ))}
                        <button onClick={() => setSettings(prev => ({ ...prev, speedMode: 'custom' }))}
                          className={cn("col-span-2 p-3 rounded-2xl border text-left transition-all",
                            settings.speedMode === 'custom' ? (isDark ? "bg-cyan-500/10 border-cyan-500/30" : "bg-violet-50 border-violet-300") : (isDark ? "bg-white/[0.03] border-white/[0.06]" : "bg-black/[0.03] border-black/[0.06]"))}>
                          <div className="flex items-center justify-between"><span className="text-xs font-bold">⚙️ Custom (Atur Manual)</span>{settings.speedMode === 'custom' && <div className={cn("w-1.5 h-1.5 rounded-full", isDark ? "bg-cyan-400" : "bg-violet-500")} />}</div>
                        </button>
                      </div>
                    </div>

                    {settings.speedMode === 'custom' && (
                      <div>
                        <label className={cn("block text-[10px] font-bold uppercase tracking-widest mb-2", isDark ? "text-slate-500" : "text-slate-400")}>Blast Delay (ms)</label>
                        <input type="number" value={settings.delay} onChange={(e) => setSettings(prev => ({ ...prev, delay: parseInt(e.target.value) || 1000 }))} placeholder="5000" min="1000" step="500"
                          className={cn(inputStyle, isDark ? "bg-white/[0.04] border border-white/[0.08] text-white focus:border-cyan-500/50" : "bg-black/[0.04] border border-black/[0.08] text-[#0f1420] focus:border-violet-500/50")} />
                      </div>
                    )}

                    {[
                      { key: 'manualMode', label: 'Mode Manual', desc: 'Kirim saat klik/Spasi.' },
                      { key: 'autoRetry', label: 'Auto Retry', desc: 'Coba ulang jika gagal.' },
                    ].map(item => (
                      <div key={item.key} className={cn("flex items-center justify-between p-4 rounded-2xl border", isDark ? "bg-white/[0.03] border-white/[0.06]" : "bg-black/[0.03] border-black/[0.06]")}>
                        <div>
                          <div className="text-xs font-bold">{item.label}</div>
                          <div className={cn("text-[10px] mt-0.5", isDark ? "text-slate-500" : "text-slate-400")}>{item.desc}</div>
                        </div>
                        <button onClick={() => setSettings(prev => ({ ...prev, [item.key]: !prev[item.key as keyof AppSettings] }))}
                          className={cn("w-11 h-6 rounded-full relative transition-all", settings[item.key as keyof AppSettings] ? (isDark ? "bg-cyan-500" : "bg-violet-500") : (isDark ? "bg-white/[0.08]" : "bg-black/[0.08]"))}>
                          <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm", settings[item.key as keyof AppSettings] ? "left-6" : "left-1")} />
                        </button>
                      </div>
                    ))}

                    {settings.autoRetry && (
                      <div>
                        <label className={cn("block text-[10px] font-bold uppercase tracking-widest mb-2", isDark ? "text-slate-500" : "text-slate-400")}>Max Retries</label>
                        <input type="number" value={settings.maxRetries} onChange={(e) => setSettings(prev => ({ ...prev, maxRetries: parseInt(e.target.value) || 1 }))} min="1" max="10"
                          className={cn(inputStyle, isDark ? "bg-white/[0.04] border border-white/[0.08] text-white focus:border-cyan-500/50" : "bg-black/[0.04] border border-black/[0.08] text-[#0f1420] focus:border-violet-500/50")} />
                      </div>
                    )}

                    <button onClick={() => { if (window.confirm('Kembalikan semua template ke default?')) { setTemplates(DEFAULT_TEMPLATES); setActiveTemplateId(DEFAULT_TEMPLATES[0].id); setActiveVariationIndex(0); toast.success('Template dipulihkan'); } }}
                      className={cn("w-full py-3 rounded-2xl font-bold text-xs border flex items-center justify-center gap-2 transition-all", isDark ? "bg-white/[0.03] border-white/[0.06] text-slate-400 hover:text-slate-200" : "bg-black/[0.03] border-black/[0.06] text-slate-500 hover:text-slate-700")}>
                      <RotateCcw size={13} /> Restore Default Templates
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className={cn("flex items-center justify-between p-3 rounded-2xl border", isDark ? "bg-white/[0.03] border-white/[0.06]" : "bg-black/[0.03] border-black/[0.06]")}>
                      <div>
                        <div className="text-xs font-bold">Randomize Delay</div>
                        <div className={cn("text-[10px] mt-0.5", isDark ? "text-slate-500" : "text-slate-400")}>Jeda waktu acak anti-bot.</div>
                      </div>
                      <button onClick={() => setSettings(prev => ({ ...prev, randomizeDelay: !prev.randomizeDelay }))}
                        className={cn("w-11 h-6 rounded-full relative transition-all", settings.randomizeDelay ? (isDark ? "bg-cyan-500" : "bg-violet-500") : (isDark ? "bg-white/[0.08]" : "bg-black/[0.08]"))}>
                        <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm", settings.randomizeDelay ? "left-6" : "left-1")} />
                      </button>
                    </div>

                    {settings.randomizeDelay && (
                      <div>
                        <label className={cn("block text-[10px] font-bold uppercase tracking-widest mb-1.5", isDark ? "text-slate-500" : "text-slate-400")}>Max Delay (ms)</label>
                        <input type="number" value={settings.maxDelay} onChange={(e) => setSettings(prev => ({ ...prev, maxDelay: parseInt(e.target.value) || 10000 }))} step="500"
                          className={cn(inputStyle, isDark ? "bg-white/[0.04] border border-white/[0.08] text-white focus:border-cyan-500/50" : "bg-black/[0.04] border border-black/[0.08] text-[#0f1420] focus:border-violet-500/50")} />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { key: 'batchSize', label: 'Batch Size', desc: 'Jeda tiap X pesan', placeholder: '10' },
                        { key: 'batchPause', label: 'Pause (ms)', desc: 'Lama istirahat', placeholder: '30000' },
                        { key: 'hourlyLimit', label: 'Hourly Limit', desc: 'Maks/jam', placeholder: '50' },
                        { key: 'stopOnConsecutiveErrors', label: 'Stop Errors', desc: 'Stop jika X gagal', placeholder: '3' },
                        { key: 'longBreakAfter', label: 'Long Break', desc: 'Break tiap X pesan', placeholder: '25' },
                        { key: 'longBreakDuration', label: 'Duration (min)', desc: 'Lama break', placeholder: '10' },
                      ].map(item => (
                        <div key={item.key}>
                          <label className={cn("block text-[9px] font-bold uppercase tracking-widest mb-1", isDark ? "text-slate-500" : "text-slate-400")}>{item.label}</label>
                          <input type="number" value={settings[item.key as keyof AppSettings] as number} onChange={(e) => setSettings(prev => ({ ...prev, [item.key]: parseInt(e.target.value) || 0 }))} placeholder={item.placeholder}
                            className={cn("w-full px-3 py-2 text-xs rounded-xl outline-none border transition-all",
                              isDark ? "bg-white/[0.04] border-white/[0.08] text-white focus:border-cyan-500/50" : "bg-black/[0.04] border-black/[0.08] text-[#0f1420] focus:border-violet-500/50")} />
                          <p className={cn("text-[8px] mt-0.5", isDark ? "text-slate-600" : "text-slate-400")}>{item.desc}</p>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2">
                      {[
                        { key: 'shuffleQueue', label: 'Shuffle Queue', desc: 'Acak urutan antrean.' },
                        { key: 'useRandomGreetings', label: 'Random Greetings', desc: 'Variasi kata sapaan.' },
                        { key: 'addRandomSuffix', label: 'Random Suffix', desc: 'Tambah Ref ID unik.' },
                        { key: 'useInvisibleChars', label: 'Invisible Chars', desc: 'Sisipkan karakter tak terlihat.' },
                        { key: 'simulateTyping', label: 'Simulate Typing', desc: 'Jeda sesuai panjang pesan.' },
                        { key: 'adaptiveDelay', label: 'Adaptive Delay', desc: 'Delay naik seiring jumlah.' },
                        { key: 'randomizeFormatting', label: 'Random Formatting', desc: 'Variasi spasi & baris.' },
                        { key: 'rotateTemplates', label: 'Template Rotation', desc: 'Template bergantian.' },
                        { key: 'randomizeEmojis', label: 'Randomize Emojis', desc: 'Emoji acak di pesan.' },
                        { key: 'useGlobalSpintax', label: 'Global Spintax', desc: 'Parser {opsi1|opsi2}.' },
                        { key: 'autoSend', label: 'Auto Send Mode', desc: 'Kirim otomatis via Extension.' },
                      ].map(item => (
                        <div key={item.key} className={cn("flex items-center justify-between p-3 rounded-xl border", isDark ? "bg-white/[0.02] border-white/[0.05]" : "bg-black/[0.02] border-black/[0.05]")}>
                          <div>
                            <div className="text-xs font-bold">{item.label}</div>
                            <div className={cn("text-[9px] mt-0.5", isDark ? "text-slate-600" : "text-slate-400")}>{item.desc}</div>
                          </div>
                          <button onClick={() => setSettings(prev => ({ ...prev, [item.key]: !prev[item.key as keyof AppSettings] }))}
                            className={cn("w-10 h-5 rounded-full relative transition-all shrink-0", settings[item.key as keyof AppSettings] ? (isDark ? "bg-cyan-500" : "bg-violet-500") : (isDark ? "bg-white/[0.08]" : "bg-black/[0.08]"))}>
                            <div className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-sm", settings[item.key as keyof AppSettings] ? "left-5.5" : "left-0.5")} />
                          </button>
                        </div>
                      ))}
                    </div>

                    {settings.autoSend && (
                      <div className={cn("p-4 rounded-2xl border space-y-3", isDark ? "bg-amber-500/5 border-amber-500/15" : "bg-amber-50 border-amber-100")}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Puzzle size={14} className="text-amber-400" />
                            <span className={cn("text-xs font-bold uppercase tracking-wider", isDark ? "text-amber-400" : "text-amber-600")}>Extension Required</span>
                          </div>
                          <div className={cn("px-2 py-0.5 rounded text-[8px] font-bold uppercase", isExtensionDetected ? "bg-emerald-500 text-white" : "bg-amber-500 text-white")}>
                            {isExtensionDetected ? "Connected" : "Not Found"}
                          </div>
                        </div>
                        <button onClick={downloadExtensionZip} className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all">
                          <Download size={14} /> Download Extension (.zip)
                        </button>
                        <ol className={cn("text-[10px] space-y-1.5 list-decimal ml-4", isDark ? "text-amber-300/60" : "text-amber-700/70")}>
                          <li>Klik tombol Download Extension di atas.</li>
                          <li>Ekstrak file <code className="bg-amber-500/10 px-1 rounded font-mono">wasender-pro-helper.zip</code>.</li>
                          <li>Buka <code className="bg-amber-500/10 px-1 rounded font-mono">chrome://extensions</code>.</li>
                          <li>Aktifkan <b>Developer Mode</b> pojok kanan atas.</li>
                          <li>Klik <b>Load Unpacked</b>, pilih folder hasil ekstrak.</li>
                        </ol>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className={cn("p-5 border-t", isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-black/[0.06] bg-black/[0.02]")}>
                <button onClick={() => setShowSettingsModal(false)} className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-violet-600 text-white rounded-2xl font-bold shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-all">
                  Save Configuration
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className={cn("relative max-w-7xl mx-auto px-6 py-10 border-t text-center", isDark ? "border-white/[0.04]" : "border-black/[0.04]")}>
        <div className={cn("text-[9px] uppercase tracking-[0.3em] font-mono font-bold", isDark ? "text-slate-700" : "text-slate-400")}>
          WAsender PRO Engine • v2.0.0 • Enterprise Edition
        </div>
      </footer>
    </div>
  );
}
