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

// ─── 3D Toggle Switch ────────────────────────────────────────────────────────
const Toggle3D = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
  <button
    onClick={onChange}
    style={{
      width: 52, height: 28,
      background: checked
        ? 'linear-gradient(135deg, #00ff9d, #00c97e)'
        : 'linear-gradient(135deg, #1a2030, #0d1420)',
      borderRadius: 14,
      border: checked ? '1px solid #00ff9d44' : '1px solid #ffffff10',
      boxShadow: checked
        ? '0 0 12px #00ff9d55, inset 0 1px 0 #ffffff30, inset 0 -1px 0 #00000040'
        : 'inset 0 2px 4px #00000060, inset 0 -1px 0 #ffffff08',
      position: 'relative',
      cursor: 'pointer',
      transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      flexShrink: 0,
    }}
  >
    <div style={{
      position: 'absolute',
      top: 3,
      left: checked ? 27 : 3,
      width: 22, height: 22,
      borderRadius: '50%',
      background: checked
        ? 'linear-gradient(145deg, #ffffff, #e0ffe8)'
        : 'linear-gradient(145deg, #3a4560, #1e2840)',
      boxShadow: checked
        ? '0 2px 8px #00000040, 0 0 6px #00ff9d60'
        : '0 2px 4px #00000060',
      transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
    }} />
  </button>
);

// ─── Glassy Input ────────────────────────────────────────────────────────────
const GlassInput = ({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    style={{
      width: '100%',
      padding: '12px 16px',
      fontSize: 13,
      background: 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 12,
      color: '#e8eaf0',
      outline: 'none',
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)',
      transition: 'all 0.2s',
      fontFamily: 'inherit',
      ...props.style,
    }}
    className={`glass-input ${className}`}
  />
);

// ─── Stat Card ───────────────────────────────────────────────────────────────
const StatCard3D = ({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) => (
  <div style={{
    padding: '16px',
    borderRadius: 16,
    background: `linear-gradient(135deg, ${color}15, ${color}08)`,
    border: `1px solid ${color}30`,
    boxShadow: `0 4px 20px ${color}15, inset 0 1px 0 ${color}20`,
    transform: 'perspective(400px) rotateX(2deg)',
    transition: 'transform 0.3s',
    cursor: 'default',
  }}
  onMouseEnter={e => (e.currentTarget.style.transform = 'perspective(400px) rotateX(0deg) translateY(-2px)')}
  onMouseLeave={e => (e.currentTarget.style.transform = 'perspective(400px) rotateX(2deg)')}
  >
    <div style={{ fontSize: 18, marginBottom: 6 }}>{icon}</div>
    <div style={{ fontSize: 24, fontWeight: 900, color, fontFamily: 'monospace', letterSpacing: '-1px' }}>{value}</div>
    <div style={{ fontSize: 10, fontWeight: 700, color: '#666e85', textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: 2 }}>{label}</div>
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
    phone: '', recipientName: '', itemName: '', receiptNumber: '', address: '', cod: '', dfod: ''
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
      DEFAULT_TEMPLATES.forEach(def => { if (!mergedTemplates.find(t => t.id === def.id)) mergedTemplates.push(def); });
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
    if (isDarkMode) { document.documentElement.classList.add('dark'); document.body.classList.add('dark'); }
    else { document.documentElement.classList.remove('dark'); document.body.classList.remove('dark'); }
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
    if (!formData.phone || !formData.recipientName) { toast.error('Nomor HP dan Nama Penerima wajib diisi'); return; }
    const newEntry: BlastEntry = { id: crypto.randomUUID(), ...formData, status: 'pending', isReceived: false, createdAt: Date.now() };
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
        if (tanda === 'COD') { const cleanCod = rawCod.replace(/[^0-9]/g, ''); if (cleanCod && !isNaN(Number(cleanCod))) cod = cleanCod; }
        else if (tanda === 'DFOD') { const cleanDfod = rawDfod.replace(/[^0-9]/g, ''); if (cleanDfod && !isNaN(Number(cleanDfod))) dfod = cleanDfod; }
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
    if (settings.randomizeEmojis) { const emojis = ['😊','🙏','📦','🚚','✨','✅','📍','🚚','📦','🚛']; const words = finalMessage.split(' '); finalMessage = words.map(word => { if (Math.random() > 0.9) return word + ' ' + emojis[Math.floor(Math.random() * emojis.length)]; return word; }).join(' '); }
    if (settings.addRandomSuffix) finalMessage += `\n\n_Ref: ${Math.random().toString(36).substring(7).toUpperCase()}_`;
    if (settings.useInvisibleChars) { const zwsp = '\u200B'; const words = finalMessage.split(' '); finalMessage = words.map(word => { if (Math.random() > 0.7) return word + zwsp; return word; }).join(' '); }
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
    if (settings.batchSize > 0 && sentCount >= nextBatchPauseAt && nextBatchPauseAt > 0) { currentDelay = settings.batchPause; toast(`Anti-Spam: Istirahat ${settings.batchPause / 1000}s...`, { icon: '🛡️' }); setNextBatchPauseAt(sentCount + settings.batchSize + (Math.floor(Math.random() * 5) - 2)); }
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
          addLog(`⏭️ Auto-Next: ${sendingEntry.recipientName}...`, 'info');
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
              addLog(`✅ Terkirim ke ${entry.recipientName}`, 'success');
              const sentCount = currentEntries.filter(e => e.status === 'sent').length + 1;
              const pending = currentEntries.filter(e => e.status === 'pending' && e.id !== entryId);
              if (pending.length > 0) setNextActionTime(Date.now() + calculateNextDelay(sentCount, pending[0]));
              return currentEntries.map(e => e.id === entryId ? { ...e, status: 'sent' } : e);
            } else if (waStatus === 'invalid') {
              const currentRetries = entry.retryCount || 0;
              if (settings.autoRetry && currentRetries < settings.maxRetries) { addLog(`🔄 Retry ${entry.recipientName} (${currentRetries + 1}/${settings.maxRetries})...`, 'warning'); return currentEntries.map(e => e.id === entryId ? { ...e, status: 'pending', retryCount: currentRetries + 1 } : e); }
              else { setConsecutiveErrors(prev => prev + 1); addLog(`❌ Nomor invalid: ${entry.recipientName}`, 'error'); return currentEntries.map(e => e.id === entryId ? { ...e, status: 'failed' } : e); }
            }
            return currentEntries;
          });
        } else if (type === 'WA_WARNING_DETECTED') { stopBlast(); addLog(`🚨 PERINGATAN SPAM! Blast dihentikan.`, 'error'); toast.error('PERINGATAN SPAM!', { duration: 10000, icon: '🚨' }); }
      }
    };
    window.addEventListener('message', handleExtensionMessage);
    const heartbeatInterval = setInterval(() => { if (lastHeartbeat > 0 && Date.now() - lastHeartbeat > 20000 && isExtensionDetected) { setIsExtensionDetected(false); addLog(`🔌 Extension terputus`, 'warning'); } }, 5000);
    return () => { window.removeEventListener('message', handleExtensionMessage); clearInterval(heartbeatInterval); };
  }, [lastHeartbeat, isExtensionDetected, settings.autoRetry, settings.maxRetries, settings.speedMode]);

  useEffect(() => {
    const handlePing = (event: MessageEvent) => { if (event.data && event.data.source === 'wasender-extension' && event.data.type === 'EXTENSION_PONG') { if (!isExtensionDetected) { setIsExtensionDetected(true); addLog(`🔌 Extension aktif`, 'success'); } setLastHeartbeat(Date.now()); } };
    window.addEventListener('message', handlePing);
    const checkAttr = () => { if (document.documentElement.getAttribute('data-wasender-extension') === 'active') { if (!isExtensionDetected) { setIsExtensionDetected(true); addLog(`🔌 Extension terdeteksi via DOM`, 'success'); } setLastHeartbeat(Date.now()); } window.postMessage({ type: 'EXTENSION_PING' }, '*'); };
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
          if (!newWindow) { addLog(`⚠️ Browser memblokir tab otomatis.`, 'warning'); setNextActionTime(Date.now() + 3000); return; }
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
    return [{ name: 'Sent', value: sent, color: '#00ff9d' }, { name: 'Pending', value: pending, color: '#ffb800' }, { name: 'Received', value: received, color: '#4d9fff' }];
  }, [entries]);

  const safetyScore = useMemo(() => {
    let score = 0;
    if (settings.delay >= 5000) score += 20; if (settings.randomizeDelay) score += 15; if (settings.batchSize > 0 && settings.batchSize <= 15) score += 10; if (settings.useRandomGreetings) score += 5; if (settings.useInvisibleChars) score += 5; if (settings.simulateTyping) score += 10; if (settings.adaptiveDelay) score += 5; if (settings.rotateTemplates) score += 10; if (settings.hourlyLimit <= 50) score += 10; if (settings.shuffleQueue) score += 10;
    return Math.min(100, score);
  }, [settings]);

  const exportToCSV = () => {
    if (entries.length === 0) return;
    const headers = ['Phone','Name','Item','Receipt','Status','Received','Created At'];
    const rows = entries.map(e => [e.phone,e.recipientName,e.itemName,e.receiptNumber,e.status,e.isReceived?'YES':'NO',new Date(e.createdAt).toLocaleString()]);
    const csvContent = [headers,...rows].map(r=>r.map(cell=>`"${String(cell).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent],{type:'text/csv;charset=utf-8;'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `wasender_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Laporan berhasil diunduh');
  };

  // ── Shared glass panel style ──────────────────────────────────────────────
  const glassPanel = {
    background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 24,
    boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
    backdropFilter: 'blur(20px)',
  } as React.CSSProperties;

  const modalGlass = {
    background: 'linear-gradient(145deg, #0e1422 0%, #070d1a 100%)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 28,
    boxShadow: '0 40px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,255,157,0.05), inset 0 1px 0 rgba(255,255,255,0.08)',
  } as React.CSSProperties;

  const statusConfig = {
    sent: { bg: 'rgba(0,255,157,0.12)', border: 'rgba(0,255,157,0.3)', color: '#00ff9d', icon: <CheckCircle2 size={10}/>, label: 'Sent' },
    sending: { bg: 'rgba(77,159,255,0.12)', border: 'rgba(77,159,255,0.3)', color: '#4d9fff', icon: <Loader2 size={10} className="animate-spin"/>, label: 'Sending' },
    failed: { bg: 'rgba(255,70,70,0.12)', border: 'rgba(255,70,70,0.3)', color: '#ff4646', icon: <AlertCircle size={10}/>, label: 'Failed' },
    pending: { bg: 'rgba(255,184,0,0.12)', border: 'rgba(255,184,0,0.3)', color: '#ffb800', icon: <Clock size={10}/>, label: 'Pending' },
  };

  return (
    <div style={{ minHeight: '100vh', background: '#060b14', color: '#c8d0e0', fontFamily: "'DM Sans', 'Segoe UI', sans-serif", overflowX: 'hidden', position: 'relative' }}>
      {/* Ambient glow background */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -200, left: -200, width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,255,157,0.06) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', top: 400, right: -300, width: 800, height: 800, borderRadius: '50%', background: 'radial-gradient(circle, rgba(77,100,255,0.05) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', bottom: -100, left: '40%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,180,255,0.04) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        {/* Grid lines */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)', backgroundSize: '60px 60px', maskImage: 'radial-gradient(ellipse at 50% 0%, black 40%, transparent 80%)' }} />
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(0,255,157,0.3); }
        .glass-input:focus { border-color: rgba(0,255,157,0.4) !important; box-shadow: inset 0 2px 4px rgba(0,0,0,0.3), 0 0 0 3px rgba(0,255,157,0.1) !important; }
        .glass-input::placeholder { color: rgba(150,160,180,0.4); }
        .tag-btn { transition: all 0.15s; }
        .tag-btn:hover { background: rgba(0,255,157,0.15) !important; color: #00ff9d !important; border-color: rgba(0,255,157,0.3) !important; }
        .row-hover:hover { background: rgba(255,255,255,0.02) !important; }
        .action-btn { opacity: 0; transition: opacity 0.2s; }
        .row-hover:hover .action-btn { opacity: 1; }
        .neon-btn { position: relative; overflow: hidden; }
        .neon-btn::before { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(255,255,255,0.1), transparent); opacity: 0; transition: opacity 0.2s; }
        .neon-btn:hover::before { opacity: 1; }
        .pulse-ring { animation: pulseRing 2s ease-in-out infinite; }
        @keyframes pulseRing { 0%,100% { opacity: 0.4; transform: scale(1); } 50% { opacity: 0.8; transform: scale(1.05); } }
        .spin-slow { animation: spin 3s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        textarea.glass-input { resize: none; }
        select.glass-input { appearance: none; cursor: pointer; }
        .blink { animation: blink 1s step-end infinite; }
        @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>

      <Toaster position="top-right" toastOptions={{ style: { background: '#0e1422', color: '#c8d0e0', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontFamily: 'inherit' } }} />

      {/* ── BLAST OVERLAY ─────────────────────────────────────────────────── */}
      {isBlasting && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)' }}>
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} style={{ ...modalGlass, padding: 40, maxWidth: 440, width: '100%', textAlign: 'center' }}>
            {/* Animated ring */}
            <div style={{ position: 'relative', width: 100, height: 100, margin: '0 auto 28px' }}>
              <div style={{ position: 'absolute', inset: 0, border: '2px solid rgba(0,255,157,0.1)', borderRadius: '50%' }} className="pulse-ring" />
              <div style={{ position: 'absolute', inset: 4, border: '3px solid transparent', borderTopColor: '#00ff9d', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <div style={{ position: 'absolute', inset: 12, background: 'radial-gradient(circle, rgba(0,255,157,0.15), transparent)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Play size={28} style={{ color: '#00ff9d', fill: 'currentColor' }} />
              </div>
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#e8eaf0', marginBottom: 8 }}>
              {isLongBreak ? '😴 Long Break Active' : entries.some(e => e.status === 'sending') ? '⏳ Waiting for WA Web...' : '⚡ Blasting in Progress'}
            </h3>
            <p style={{ fontSize: 13, color: '#666e85', marginBottom: 24 }}>
              Sent: <span style={{ color: '#00ff9d', fontWeight: 800 }}>{entries.filter(e => e.status === 'sent').length}</span> / <span style={{ color: '#c8d0e0', fontWeight: 700 }}>{entries.length}</span>
            </p>
            {!settings.manualMode ? (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 56, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace', color: isLongBreak ? '#ffb800' : entries.some(e => e.status === 'sending') ? '#4d9fff' : '#00ff9d', letterSpacing: '-2px', lineHeight: 1 }}>
                  {entries.some(e => e.status === 'sending') ? '--:--' : `${Math.floor(countdown / 60)}:${(countdown % 60).toString().padStart(2, '0')}`}
                </div>
                <p style={{ fontSize: 10, color: '#3d4558', textTransform: 'uppercase', letterSpacing: '0.2em', marginTop: 8 }}>
                  {entries.some(e => e.status === 'sending') ? 'Processing in WA Web' : isLongBreak ? 'Break ends in' : 'Next message in'}
                </p>
                {Date.now() >= nextActionTime && entries.filter(e => e.status === 'pending').length > 0 && !entries.some(e => e.status === 'sending') && (
                  <button onClick={() => { const pending = entries.filter(e => e.status === 'pending'); if (pending.length > 0) { const entry = pending[0]; const sentCount = entries.filter(e => e.status === 'sent').length; const newWindow = window.open(getWALink(entry, sentCount), 'WAsenderTab'); if (newWindow) { window.focus(); if (settings.autoSend) updateStatus(entry.id, 'sending'); else { updateStatus(entry.id, 'sent'); setNextActionTime(Date.now() + calculateNextDelay(sentCount + 1, entries.filter(e => e.status === 'pending')[1] || entry)); } } } }} style={{ marginTop: 16, width: '100%', padding: '12px 0', background: 'linear-gradient(135deg, #ffb800, #ff8c00)', border: 'none', borderRadius: 12, color: '#000', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <Play size={14} fill="currentColor" /> Tab tidak terbuka? Klik di sini
                  </button>
                )}
              </div>
            ) : (
              <div style={{ marginBottom: 24, padding: '16px', background: 'rgba(0,255,157,0.06)', border: '1px solid rgba(0,255,157,0.15)', borderRadius: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#00ff9d', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 6 }}>MODE MANUAL AKTIF</div>
                <p style={{ fontSize: 11, color: '#666e85' }}>Tekan [SPASI] atau klik tombol di bawah.</p>
              </div>
            )}
            <div style={{ padding: '12px', background: 'rgba(255,184,0,0.06)', border: '1px solid rgba(255,184,0,0.15)', borderRadius: 12, marginBottom: 20 }}>
              <p style={{ fontSize: 11, color: '#ffb800', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>⚠️ Tekan [ENTER] di tab WhatsApp untuk mengirim!</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {entries.some(e => e.status === 'sending') && (
                <button onClick={() => { const sending = entries.find(e => e.status === 'sending'); if (sending) { addLog(`⏭️ Paksa lanjut: ${sending.recipientName}`, 'warning'); updateStatus(sending.id, 'sent'); } }} style={{ padding: '12px 0', background: 'linear-gradient(135deg, rgba(77,159,255,0.2), rgba(77,159,255,0.1))', border: '1px solid rgba(77,159,255,0.3)', borderRadius: 12, color: '#4d9fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  Paksa Lanjut ke Berikutnya
                </button>
              )}
              <button onClick={() => { const pending = entries.filter(e => e.status === 'pending'); if (pending.length > 0) { const entry = pending[0]; const newWindow = window.open(getWALink(entry), 'WAsenderTab'); if (newWindow) window.focus(); updateStatus(entry.id, 'sent'); } }} style={{ padding: '12px 0', background: 'rgba(0,255,157,0.08)', border: '1px solid rgba(0,255,157,0.2)', borderRadius: 12, color: '#00ff9d', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                Kirim Berikutnya (Manual)
              </button>
              <button onClick={stopBlast} style={{ padding: '12px 0', background: 'linear-gradient(135deg, #ff3b3b, #cc0000)', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer', boxShadow: '0 4px 20px rgba(255,50,50,0.3)' }}>
                Hentikan Blast
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 30, borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(6,11,20,0.9)', backdropFilter: 'blur(20px)' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 28px', height: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 42, height: 42, background: 'linear-gradient(135deg, #00ff9d, #00c97e)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(0,255,157,0.3), inset 0 1px 0 rgba(255,255,255,0.3)' }}>
              <Send size={20} style={{ color: '#000' }} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.5px', color: '#e8eaf0' }}>
                WAsender <span style={{ color: '#00ff9d' }}>PRO</span>
              </div>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#3d4558', textTransform: 'uppercase', letterSpacing: '0.2em', fontFamily: 'JetBrains Mono, monospace' }}>Advanced Blast Engine v2.0</div>
            </div>
          </div>

          {/* Right controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {!isExtensionDetected && (
              <button onClick={downloadExtensionZip} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'rgba(255,184,0,0.08)', border: '1px solid rgba(255,184,0,0.2)', borderRadius: 10, color: '#ffb800', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer', transition: 'all 0.2s' }}>
                <Puzzle size={15}/> Setup Extension
              </button>
            )}
            <button onClick={handleResetDefault} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'rgba(255,50,50,0.06)', border: '1px solid rgba(255,50,50,0.12)', borderRadius: 10, color: '#ff6666', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer' }}>
              <RotateCcw size={14}/> <span style={{ display: window.innerWidth > 900 ? 'inline' : 'none' }}>Reset</span>
            </button>
            <button onClick={() => setIsDarkMode(!isDarkMode)} style={{ width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, color: '#666e85', cursor: 'pointer' }}>
              {isDarkMode ? <Sun size={16}/> : <Moon size={16}/>}
            </button>
            <button onClick={() => setShowSettingsModal(true)} style={{ width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, color: '#666e85', cursor: 'pointer' }}>
              <Settings2 size={16}/>
            </button>
            {/* Status pill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, fontSize: 11, color: '#3d4558', fontWeight: 600 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: isBlasting ? '#00ff9d' : '#2a3040', boxShadow: isBlasting ? '0 0 8px #00ff9d' : 'none', animation: isBlasting ? 'pulseRing 1.5s infinite' : 'none' }} />
              {isBlasting ? 'Active' : 'Idle'}
            </div>
            <button onClick={exportToCSV} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, color: '#3d4558', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer' }}>
              <Download size={13}/> Export
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN ──────────────────────────────────────────────────────────── */}
      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '28px', display: 'grid', gridTemplateColumns: '360px 1fr', gap: 24, position: 'relative', zIndex: 1 }}>

        {/* ═══ LEFT PANEL ═══════════════════════════════════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Stats */}
          <div style={{ ...glassPanel, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <BarChart3 size={16} style={{ color: '#00ff9d' }}/>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#c8d0e0', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Overview</span>
              </div>
              <div style={{ fontSize: 11, color: '#3d4558', fontFamily: 'JetBrains Mono, monospace' }}>LIVE</div>
            </div>
            <div style={{ height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statsData} innerRadius={50} outerRadius={68} paddingAngle={6} dataKey="value" strokeWidth={0}>
                    {statsData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} opacity={0.9}/>)}
                  </Pie>
                  <RechartsTooltip contentStyle={{ background: '#0e1422', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#c8d0e0', fontSize: 12 }}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 8 }}>
              <StatCard3D label="Sent" value={statsData[0].value} color="#00ff9d" icon="✅"/>
              <StatCard3D label="Pending" value={statsData[1].value} color="#ffb800" icon="⏳"/>
              <StatCard3D label="Received" value={statsData[2].value} color="#4d9fff" icon="📬"/>
            </div>
          </div>

          {/* Engine Settings */}
          <div style={{ ...glassPanel, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <Timer size={16} style={{ color: '#00ff9d' }}/>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#c8d0e0', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Engine</span>
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#3d4558', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>Nama Pengirim</label>
              <GlassInput type="text" value={settings.senderName} onChange={e => setSettings(prev => ({ ...prev, senderName: e.target.value }))} placeholder="Contoh: Admin JNT"/>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#3d4558', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Blast Delay</label>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#00ff9d', fontFamily: 'JetBrains Mono, monospace' }}>{settings.delay / 1000}s</span>
              </div>
              <input type="range" min="1000" max="10000" step="500" value={settings.delay} onChange={e => setSettings(prev => ({ ...prev, delay: parseInt(e.target.value) }))} style={{ width: '100%', height: 4, background: `linear-gradient(to right, #00ff9d ${(settings.delay - 1000) / 90}%, rgba(255,255,255,0.1) ${(settings.delay - 1000) / 90}%)`, borderRadius: 2, appearance: 'none', cursor: 'pointer', outline: 'none' }}/>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#2a3040', fontFamily: 'JetBrains Mono, monospace', marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                <span>Fast</span><span>Safe</span>
              </div>
            </div>
          </div>

          {/* Templates */}
          <div style={{ ...glassPanel, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MessageSquare size={16} style={{ color: '#00ff9d' }}/>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#c8d0e0', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Templates</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: '#00ff9d', textTransform: 'uppercase', letterSpacing: '0.1em' }} className="blink">Auto-saved</span>
                <button onClick={() => { const def = DEFAULT_TEMPLATES.find(t => t.id === activeTemplateId); if (def && confirm('Reset template?')) { setTemplates(prev => prev.map(t => t.id === activeTemplateId ? { ...def } : t)); setActiveVariationIndex(0); toast.success('Template direset'); } }} style={{ padding: 6, background: 'transparent', border: 'none', color: '#3d4558', cursor: 'pointer', borderRadius: 8 }}>
                  <History size={15}/>
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, overflowX: 'auto', paddingBottom: 4 }}>
              {templates.map(t => (
                <button key={t.id} onClick={() => { setActiveTemplateId(t.id); setActiveVariationIndex(0); }} style={{ whiteSpace: 'nowrap', padding: '7px 14px', borderRadius: 10, fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', background: activeTemplateId === t.id ? 'linear-gradient(135deg, #00ff9d, #00c97e)' : 'rgba(255,255,255,0.04)', border: activeTemplateId === t.id ? '1px solid #00ff9d' : '1px solid rgba(255,255,255,0.07)', color: activeTemplateId === t.id ? '#000' : '#666e85', boxShadow: activeTemplateId === t.id ? '0 4px 16px rgba(0,255,157,0.3)' : 'none' }}>
                  {t.name}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#3d4558', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Variasi:</span>
              {[0, 1, 2].map(idx => (
                <button key={idx} onClick={() => setActiveVariationIndex(idx)} style={{ width: 32, height: 32, borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', background: activeVariationIndex === idx ? 'rgba(0,255,157,0.15)' : 'rgba(255,255,255,0.03)', border: activeVariationIndex === idx ? '1px solid rgba(0,255,157,0.4)' : '1px solid rgba(255,255,255,0.06)', color: activeVariationIndex === idx ? '#00ff9d' : '#3d4558' }}>
                  {idx + 1}
                </button>
              ))}
              <span style={{ marginLeft: 'auto', fontSize: 9, color: '#2a3040', fontStyle: 'italic' }}>{settings.rotateTemplates ? 'Rotasi ✓' : 'Rotasi ✗'}</span>
            </div>
            <textarea value={currentTemplateText} onChange={e => updateActiveTemplateText(e.target.value)} className="glass-input" style={{ width: '100%', height: 160, padding: '14px 16px', fontSize: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, color: '#c8d0e0', outline: 'none', resize: 'none', lineHeight: 1.6, fontFamily: 'inherit', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)' }} placeholder="Tulis template pesan..."/>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
              {['{salam}','{pengirim}','{nama}','{barang}','{resi}','{alamat}','{cod}','{dfod}','{if_cod}','{/if_cod}','{if_dfod}','{/if_dfod}'].map(tag => (
                <button key={tag} onClick={() => updateActiveTemplateText(currentTemplateText + ' ' + tag)} className="tag-btn" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', padding: '5px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#3d4558', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace' }}>
                  {tag}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 14, padding: '12px 14px', background: 'rgba(77,100,255,0.06)', border: '1px solid rgba(77,100,255,0.15)', borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Sparkles size={11} style={{ color: '#7c9fff' }}/>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#7c9fff', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Spintax Anti-Ban</span>
              </div>
              <p style={{ fontSize: 11, color: '#4d6080', lineHeight: 1.5 }}>
                Format <span style={{ fontFamily: 'JetBrains Mono, monospace', background: 'rgba(124,159,255,0.15)', padding: '1px 6px', borderRadius: 4, color: '#7c9fff' }}>{"{Halo|Hai|Pagi}"}</span> untuk acak teks otomatis.
              </p>
            </div>
          </div>
        </div>

        {/* ═══ RIGHT PANEL ══════════════════════════════════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Action bar */}
          <div style={{ ...glassPanel, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#3d4558' }} size={16}/>
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Cari nama, nomor, resi..." className="glass-input" style={{ paddingLeft: 42, width: '100%' }}/>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: isExtensionDetected ? 'rgba(0,255,157,0.06)' : 'rgba(255,255,255,0.03)', border: `1px solid ${isExtensionDetected ? 'rgba(0,255,157,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 10, fontSize: 10, fontWeight: 700, color: isExtensionDetected ? '#00ff9d' : '#3d4558', textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>
              <Puzzle size={12} style={{ animation: isExtensionDetected ? 'pulseRing 2s infinite' : 'none' }}/> {isExtensionDetected ? 'Connected' : 'Disconnected'}
            </div>
            <button onClick={() => setShowBulkModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', background: 'rgba(0,255,157,0.06)', border: '1px solid rgba(0,255,157,0.15)', borderRadius: 12, color: '#00ff9d', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <FileSpreadsheet size={15}/> Bulk Import
            </button>
            <button onClick={() => setShowPreviewModal(true)} disabled={entries.filter(e => e.status === 'pending').length === 0} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, color: '#666e85', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: entries.filter(e => e.status === 'pending').length === 0 ? 0.4 : 1 }}>
              <Search size={15}/> Preview
            </button>
            <button onClick={isBlasting ? stopBlast : startBlast} disabled={entries.length === 0} className="neon-btn" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', background: isBlasting ? 'linear-gradient(135deg, #ff3b3b, #cc0000)' : 'linear-gradient(135deg, #00ff9d, #00c97e)', border: 'none', borderRadius: 12, color: '#000', fontSize: 13, fontWeight: 800, cursor: 'pointer', boxShadow: isBlasting ? '0 4px 20px rgba(255,50,50,0.35)' : '0 4px 20px rgba(0,255,157,0.35)', whiteSpace: 'nowrap', opacity: entries.length === 0 ? 0.4 : 1, transition: 'all 0.2s' }}>
              {isBlasting ? <><Square size={15} fill="currentColor"/> Stop Blast</> : <><Play size={15} fill="currentColor"/> Start Engine</>}
            </button>
          </div>

          {/* Warning banner */}
          {!isBlasting && entries.length > 0 && (
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '14px 18px', background: 'rgba(255,184,0,0.05)', border: '1px solid rgba(255,184,0,0.15)', borderRadius: 14 }}>
              <AlertCircle size={16} style={{ color: '#ffb800', flexShrink: 0, marginTop: 1 }}/>
              <p style={{ fontSize: 12, color: '#8a6e30', lineHeight: 1.5 }}>
                <span style={{ fontWeight: 800, color: '#ffb800' }}>PENTING:</span> Pastikan Anda telah <span style={{ fontWeight: 800 }}>MENGIZINKAN POPUP</span> di browser sebelum memulai blast.
              </p>
            </div>
          )}

          {/* Add Entry Form */}
          <div style={{ ...glassPanel, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <Plus size={16} style={{ color: '#00ff9d' }}/>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#c8d0e0', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Add Entry</span>
            </div>
            <form onSubmit={handleAddEntry}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 14 }}>
                {[
                  { key: 'phone', label: 'Phone', placeholder: '0812...' },
                  { key: 'recipientName', label: 'Name', placeholder: 'Recipient Name' },
                  { key: 'itemName', label: 'Item Name', placeholder: 'Nama Barang' },
                ].map(field => (
                  <div key={field.key}>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#3d4558', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 7 }}>{field.label}</label>
                    <GlassInput type="text" value={(formData as any)[field.key]} onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))} placeholder={field.placeholder}/>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#3d4558', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 7 }}>Resi</label>
                  <GlassInput type="text" value={formData.receiptNumber} onChange={e => setFormData(prev => ({ ...prev, receiptNumber: e.target.value }))} placeholder="Resi Number"/>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#3d4558', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 7 }}>Address</label>
                  <GlassInput type="text" value={formData.address} onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))} placeholder="Alamat Lengkap"/>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#3d4558', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 7 }}>COD</label>
                  <GlassInput type="text" value={formData.cod} onChange={e => setFormData(prev => ({ ...prev, cod: e.target.value.replace(/[^0-9.,]/g, '') }))} placeholder="274,398"/>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#3d4558', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 7 }}>DFOD</label>
                  <GlassInput type="text" value={formData.dfod} onChange={e => setFormData(prev => ({ ...prev, dfod: e.target.value.replace(/[^0-9.,]/g, '') }))} placeholder="10,000"/>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <button type="submit" style={{ padding: '12px 0', background: 'linear-gradient(135deg, #00ff9d, #00c97e)', border: 'none', borderRadius: 12, color: '#000', fontWeight: 800, fontSize: 13, cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,255,157,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <Plus size={16}/> Add to Queue
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Console Log */}
          <div style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', background: '#040810' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00ff9d', boxShadow: '0 0 8px #00ff9d', animation: 'pulseRing 2s infinite' }}/>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#3d4558', textTransform: 'uppercase', letterSpacing: '0.2em', fontFamily: 'JetBrains Mono, monospace' }}>System Console</span>
              </div>
              <button onClick={() => setLogs([])} style={{ fontSize: 10, fontWeight: 700, color: '#2a3040', background: 'transparent', border: 'none', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Clear</button>
            </div>
            <div style={{ height: 120, overflowY: 'auto', padding: '10px 18px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
              {logs.length === 0 ? <span style={{ color: '#2a3040', fontStyle: 'italic' }}>Waiting for system actions...</span> : logs.map(log => (
                <div key={log.id} style={{ display: 'flex', gap: 12, marginBottom: 4, lineHeight: 1.5 }}>
                  <span style={{ color: '#2a3040', flexShrink: 0 }}>[{new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}]</span>
                  <span style={{ color: log.type === 'success' ? '#00ff9d' : log.type === 'error' ? '#ff4646' : log.type === 'warning' ? '#ffb800' : '#4d9fff', wordBreak: 'break-all' }}>{log.message}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Queue Table */}
          <div style={{ ...glassPanel, overflow: 'hidden', padding: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FileText size={16} style={{ color: '#00ff9d' }}/>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#c8d0e0', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Queue</span>
                <div style={{ padding: '3px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, fontSize: 10, fontWeight: 700, color: '#3d4558', fontFamily: 'JetBrains Mono, monospace' }}>{filteredEntries.length}</div>
              </div>
              {isConfirmingClear ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#ff6666' }}>Confirm?</span>
                  <button onClick={clearAll} style={{ padding: '5px 12px', background: '#ff3b3b', border: 'none', borderRadius: 8, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Yes</button>
                  <button onClick={() => setIsConfirmingClear(false)} style={{ padding: '5px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#666e85', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>No</button>
                </div>
              ) : (
                <button onClick={() => setIsConfirmingClear(true)} style={{ padding: 8, background: 'transparent', border: 'none', color: '#2a3040', cursor: 'pointer', borderRadius: 8, transition: 'color 0.2s' }}>
                  <Trash2 size={16}/>
                </button>
              )}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                    {['Recipient', 'Details', 'Status', 'Received', 'Actions'].map((h, i) => (
                      <th key={h} style={{ padding: '12px 20px', fontSize: 9, fontWeight: 700, color: '#2a3040', textTransform: 'uppercase', letterSpacing: '0.18em', textAlign: i === 4 ? 'right' : 'left', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence mode="popLayout">
                    {filteredEntries.length === 0 ? (
                      <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <td colSpan={5} style={{ padding: '60px 24px', textAlign: 'center', color: '#2a3040', fontSize: 13, fontStyle: 'italic' }}>No matching records found.</td>
                      </motion.tr>
                    ) : filteredEntries.map((entry, index) => {
                      const sc = statusConfig[entry.status] || statusConfig.pending;
                      return (
                        <motion.tr key={entry.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -10 }} className="row-hover" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: isBlasting && index === currentIndex ? 'rgba(0,255,157,0.03)' : 'transparent', transition: 'background 0.2s' }}>
                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ fontWeight: 700, fontSize: 13, color: '#c8d0e0' }}>{entry.recipientName}</div>
                            <div style={{ fontSize: 11, color: '#3d4558', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>{entry.phone}</div>
                          </td>
                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#8a9ab5', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.itemName || '—'}</div>
                            <div style={{ fontSize: 10, color: '#2a3040', fontFamily: 'JetBrains Mono, monospace', marginTop: 3 }}>Resi: {entry.receiptNumber || '—'}</div>
                            {entry.address && <div style={{ fontSize: 10, color: '#2a3040', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{entry.address}</div>}
                            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                              {entry.cod && <span style={{ fontSize: 10, fontWeight: 700, color: '#ffb800', background: 'rgba(255,184,0,0.1)', padding: '1px 7px', borderRadius: 4 }}>COD Rp{formatCurrency(entry.cod)}</span>}
                              {entry.dfod && <span style={{ fontSize: 10, fontWeight: 700, color: '#4d9fff', background: 'rgba(77,159,255,0.1)', padding: '1px 7px', borderRadius: 4 }}>DFOD Rp{formatCurrency(entry.dfod)}</span>}
                            </div>
                          </td>
                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, background: sc.bg, border: `1px solid ${sc.border}`, fontSize: 10, fontWeight: 700, color: sc.color, textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>
                              {sc.icon} {sc.label}
                            </div>
                          </td>
                          <td style={{ padding: '16px 20px' }}>
                            <button onClick={() => toggleReceived(entry.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: entry.isReceived ? 'rgba(77,159,255,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${entry.isReceived ? 'rgba(77,159,255,0.3)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 10, color: entry.isReceived ? '#4d9fff' : '#3d4558', fontSize: 10, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                              <div style={{ width: 14, height: 14, borderRadius: 4, border: entry.isReceived ? 'none' : '1.5px solid #2a3040', background: entry.isReceived ? '#4d9fff' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {entry.isReceived && <CheckCircle2 size={10} style={{ color: '#fff' }}/>}
                              </div>
                              {entry.isReceived ? 'Diterima' : 'Belum'}
                            </button>
                          </td>
                          <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }} className="action-btn">
                              <button onClick={() => handleSendManual(entry)} style={{ padding: 8, background: 'rgba(0,255,157,0.08)', border: '1px solid rgba(0,255,157,0.15)', borderRadius: 8, color: '#00ff9d', cursor: 'pointer' }}><ExternalLink size={14}/></button>
                              <button onClick={() => setEntries(prev => prev.filter(e => e.id !== entry.id))} style={{ padding: 8, background: 'rgba(255,50,50,0.06)', border: '1px solid rgba(255,50,50,0.1)', borderRadius: 8, color: '#ff6666', cursor: 'pointer' }}><Trash2 size={14}/></button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* ── BULK IMPORT MODAL ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showBulkModal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowBulkModal(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(16px)' }}/>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} style={{ ...modalGlass, position: 'relative', width: '100%', maxWidth: 640, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '28px 32px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 44, height: 44, background: 'rgba(0,255,157,0.1)', border: '1px solid rgba(0,255,157,0.2)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileSpreadsheet size={20} style={{ color: '#00ff9d' }}/>
                  </div>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 800, color: '#e8eaf0', margin: 0 }}>Bulk Import</h2>
                    <p style={{ fontSize: 11, color: '#3d4558', margin: 0, marginTop: 2 }}>Copy-paste data dari Excel atau CSV</p>
                  </div>
                </div>
                <button onClick={() => setShowBulkModal(false)} style={{ padding: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, color: '#666e85', cursor: 'pointer' }}><X size={18}/></button>
              </div>
              <div style={{ padding: 32, overflowY: 'auto', flex: 1 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                  <div style={{ padding: 16, background: 'rgba(0,255,157,0.05)', border: '1px solid rgba(0,255,157,0.12)', borderRadius: 14 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: '#00ff9d', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>Step 1 — Kolom</div>
                    <p style={{ fontSize: 11, color: '#4d6060', lineHeight: 1.6, margin: 0 }}>No, Resi, Nama, HP, Alamat, Tanda, Nominal COD, Nominal DFOD, Barang</p>
                  </div>
                  <div style={{ padding: 16, background: 'rgba(77,159,255,0.05)', border: '1px solid rgba(77,159,255,0.12)', borderRadius: 14 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: '#4d9fff', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>Step 2 — Paste</div>
                    <p style={{ fontSize: 11, color: '#3d5070', lineHeight: 1.6, margin: 0 }}>Copy range dari Excel & Paste di kolom di bawah ini</p>
                  </div>
                </div>
                <textarea value={bulkData} onChange={e => setBulkData(e.target.value)} className="glass-input" style={{ width: '100%', height: 240, padding: 20, fontSize: 12, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.6 }} placeholder="1	JX123456789	Budi Santoso	08123456789	Jl. Merdeka No. 1	COD	150000	0	Sepatu..."/>
                <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                  <button onClick={() => setShowBulkModal(false)} style={{ flex: 1, padding: '14px 0', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, color: '#666e85', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                  <button onClick={handleBulkImport} style={{ flex: 2, padding: '14px 0', background: 'linear-gradient(135deg, #00ff9d, #00c97e)', border: 'none', borderRadius: 14, color: '#000', fontWeight: 800, fontSize: 13, cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,255,157,0.3)' }}>Import Data</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── PREVIEW MODAL ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showPreviewModal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPreviewModal(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(16px)' }}/>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} style={{ ...modalGlass, position: 'relative', width: '100%', maxWidth: 500, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '24px 28px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, background: 'rgba(77,159,255,0.1)', border: '1px solid rgba(77,159,255,0.2)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <MessageSquare size={18} style={{ color: '#4d9fff' }}/>
                  </div>
                  <div>
                    <h2 style={{ fontSize: 16, fontWeight: 800, color: '#e8eaf0', margin: 0 }}>Message Preview</h2>
                    <p style={{ fontSize: 10, color: '#3d4558', margin: 0, textTransform: 'uppercase', letterSpacing: '0.1em' }}>First Pending Entry</p>
                  </div>
                </div>
                <button onClick={() => setShowPreviewModal(false)} style={{ padding: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, color: '#666e85', cursor: 'pointer' }}><X size={18}/></button>
              </div>
              <div style={{ padding: 28, overflowY: 'auto', flex: 1 }}>
                {entries.find(e => e.status === 'pending') ? (() => {
                  const entry = entries.find(e => e.status === 'pending')!;
                  const sentCount = entries.filter(e => e.status === 'sent').length;
                  let templateText = activeTemplate.text;
                  if (settings.rotateTemplates) { const variations = activeTemplate.variations && activeTemplate.variations.length > 0 ? activeTemplate.variations : [activeTemplate.text]; templateText = variations[sentCount % variations.length]; }
                  return (
                    <>
                      <div style={{ padding: 20, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, marginBottom: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                          <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #00ff9d, #00c97e)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: '#000' }}>
                            {entry.recipientName.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13, color: '#c8d0e0' }}>{entry.recipientName}</div>
                            <div style={{ fontSize: 11, color: '#3d4558', fontFamily: 'JetBrains Mono, monospace' }}>{entry.phone}</div>
                          </div>
                        </div>
                        <div style={{ background: 'rgba(0,255,157,0.04)', border: '1px solid rgba(0,255,157,0.1)', borderRadius: 14, padding: 18, fontSize: 13, color: '#8a9ab5', whiteSpace: 'pre-wrap', lineHeight: 1.7, fontFamily: 'inherit' }}>
                          {generateMessage(entry, templateText)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <button onClick={() => setShowPreviewModal(false)} style={{ flex: 1, padding: '12px 0', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, color: '#666e85', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Close</button>
                        <button onClick={() => { if (entry) { const newWindow = window.open(getWALink(entry, sentCount), 'WAsenderTab'); if (newWindow) window.focus(); updateStatus(entry.id, 'sent'); setShowPreviewModal(false); } }} style={{ flex: 1, padding: '12px 0', background: 'linear-gradient(135deg, #00ff9d, #00c97e)', border: 'none', borderRadius: 12, color: '#000', fontWeight: 800, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 16px rgba(0,255,157,0.25)' }}>
                          <Send size={15}/> Send Now
                        </button>
                      </div>
                    </>
                  );
                })() : (
                  <div style={{ textAlign: 'center', padding: '60px 0' }}>
                    <Clock size={48} style={{ color: '#1a2030', margin: '0 auto 16px' }}/>
                    <p style={{ color: '#2a3040', fontSize: 13, fontStyle: 'italic' }}>No pending entries to preview.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── SETTINGS MODAL ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showSettingsModal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSettingsModal(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(16px)' }}/>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} style={{ ...modalGlass, position: 'relative', width: '100%', maxWidth: 460, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '24px 28px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, background: 'rgba(0,255,157,0.1)', border: '1px solid rgba(0,255,157,0.2)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Settings2 size={18} style={{ color: '#00ff9d' }}/>
                  </div>
                  <div>
                    <h2 style={{ fontSize: 16, fontWeight: 800, color: '#e8eaf0', margin: 0 }}>Settings</h2>
                    <p style={{ fontSize: 10, color: '#3d4558', margin: 0, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Engine Configuration</p>
                  </div>
                </div>
                <button onClick={() => setShowSettingsModal(false)} style={{ padding: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, color: '#666e85', cursor: 'pointer' }}><X size={18}/></button>
              </div>
              {/* Tabs */}
              <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {(['general', 'antispam'] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveSettingsTab(tab)} style={{ flex: 1, padding: '14px 0', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', background: 'transparent', border: 'none', borderBottom: activeSettingsTab === tab ? '2px solid #00ff9d' : '2px solid transparent', color: activeSettingsTab === tab ? '#00ff9d' : '#3d4558', cursor: 'pointer', transition: 'all 0.2s', marginBottom: -1 }}>
                    {tab}
                  </button>
                ))}
              </div>
              <div style={{ padding: 28, overflowY: 'auto', flex: 1 }}>
                {activeSettingsTab === 'antispam' && (
                  <div style={{ marginBottom: 24, padding: 16, background: 'rgba(0,255,157,0.04)', border: '1px solid rgba(0,255,157,0.1)', borderRadius: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#00ff9d', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Safety Score</span>
                      <span style={{ fontSize: 14, fontWeight: 900, color: safetyScore > 80 ? '#00ff9d' : safetyScore > 50 ? '#ffb800' : '#ff4646', fontFamily: 'JetBrains Mono, monospace' }}>{safetyScore}%</span>
                    </div>
                    <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${safetyScore}%` }} style={{ height: '100%', background: safetyScore > 80 ? 'linear-gradient(90deg, #00ff9d, #00c97e)' : safetyScore > 50 ? 'linear-gradient(90deg, #ffb800, #ff8c00)' : 'linear-gradient(90deg, #ff4646, #cc0000)', borderRadius: 3 }}/>
                    </div>
                    <p style={{ fontSize: 11, color: '#2a4040', marginTop: 8, fontStyle: 'italic' }}>
                      {safetyScore > 80 ? 'Sangat Aman: Pola pengiriman mirip manusia.' : safetyScore > 50 ? 'Cukup Aman: Disarankan menambah jeda.' : 'Beresiko Tinggi: Akun rentan banned!'}
                    </p>
                  </div>
                )}

                {activeSettingsTab === 'general' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#3d4558', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>Nama Pengirim</label>
                      <GlassInput type="text" value={settings.senderName} onChange={e => setSettings(prev => ({ ...prev, senderName: e.target.value }))} placeholder="Admin JNT"/>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#ffb800', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 12 }}>⚡ Pilih Kecepatan Blast</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                        {[{ id: 'safe', label: 'Main Aman', desc: '15-30s', icon: '🛡️' },{ id: 'normal', label: 'Normal', desc: '8-15s', icon: '⚖️' },{ id: 'fast', label: 'Percepat', desc: '3-7s', icon: '⚡' },{ id: 'turbo', label: 'Turbo', desc: '1-2s', icon: '🚀' }].map(mode => (
                          <button key={mode.id} onClick={() => setSettings(prev => ({ ...prev, speedMode: mode.id as any }))} style={{ padding: 14, borderRadius: 12, border: settings.speedMode === mode.id ? '1px solid rgba(0,255,157,0.4)' : '1px solid rgba(255,255,255,0.06)', background: settings.speedMode === mode.id ? 'rgba(0,255,157,0.08)' : 'rgba(255,255,255,0.02)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                              <span style={{ fontSize: 18 }}>{mode.icon}</span>
                              {settings.speedMode === mode.id && <div style={{ width: 8, height: 8, background: '#00ff9d', borderRadius: '50%', boxShadow: '0 0 6px #00ff9d' }}/>}
                            </div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#c8d0e0' }}>{mode.label}</div>
                            <div style={{ fontSize: 10, color: '#3d4558', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>{mode.desc}</div>
                          </button>
                        ))}
                      </div>
                      <button onClick={() => setSettings(prev => ({ ...prev, speedMode: 'custom' }))} style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: settings.speedMode === 'custom' ? '1px solid rgba(0,255,157,0.4)' : '1px solid rgba(255,255,255,0.06)', background: settings.speedMode === 'custom' ? 'rgba(0,255,157,0.08)' : 'rgba(255,255,255,0.02)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#c8d0e0', fontSize: 12, fontWeight: 700 }}>
                        <span>⚙️ Custom (Atur Manual)</span>
                        {settings.speedMode === 'custom' && <div style={{ width: 8, height: 8, background: '#00ff9d', borderRadius: '50%' }}/>}
                      </button>
                    </div>
                    {settings.speedMode === 'custom' && (
                      <div>
                        <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#3d4558', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>Blast Delay (ms)</label>
                        <GlassInput type="number" value={settings.delay} onChange={e => setSettings(prev => ({ ...prev, delay: parseInt(e.target.value) || 1000 }))} placeholder="5000" min="1000" step="500"/>
                      </div>
                    )}
                    {[{ key: 'manualMode', label: 'Mode Manual', desc: 'Kirim berikutnya hanya saat Anda klik/tekan Spasi.' },{ key: 'autoRetry', label: 'Auto Retry', desc: 'Coba kirim ulang otomatis jika gagal.' }].map(item => (
                      <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 14 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#c8d0e0', marginBottom: 3 }}>{item.label}</div>
                          <div style={{ fontSize: 11, color: '#3d4558' }}>{item.desc}</div>
                        </div>
                        <Toggle3D checked={!!(settings as any)[item.key]} onChange={() => setSettings(prev => ({ ...prev, [item.key]: !(prev as any)[item.key] }))}/>
                      </div>
                    ))}
                    {settings.autoRetry && (
                      <div>
                        <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#3d4558', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>Max Retries</label>
                        <GlassInput type="number" value={settings.maxRetries} onChange={e => setSettings(prev => ({ ...prev, maxRetries: parseInt(e.target.value) || 1 }))} min="1" max="10"/>
                      </div>
                    )}
                    <button onClick={() => { if (window.confirm('Restore semua template?')) { setTemplates(DEFAULT_TEMPLATES); setActiveTemplateId(DEFAULT_TEMPLATES[0].id); setActiveVariationIndex(0); toast.success('Template dipulihkan'); } }} style={{ width: '100%', padding: '12px 0', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, color: '#666e85', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <RotateCcw size={14}/> Restore Default Templates
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* Randomize Delay separate */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 14 }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#c8d0e0', marginBottom: 2 }}>Randomize Delay</div>
                        <div style={{ fontSize: 10, color: '#3d4558' }}>Jeda waktu acak agar tidak terdeteksi bot.</div>
                      </div>
                      <Toggle3D checked={settings.randomizeDelay} onChange={() => setSettings(prev => ({ ...prev, randomizeDelay: !prev.randomizeDelay }))}/>
                    </div>
                    {settings.randomizeDelay && (
                      <div style={{ paddingLeft: 4 }}>
                        <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#3d4558', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 7 }}>Max Delay (ms)</label>
                        <GlassInput type="number" value={settings.maxDelay} onChange={e => setSettings(prev => ({ ...prev, maxDelay: parseInt(e.target.value) || 10000 }))} step="500"/>
                      </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      {[{ key: 'batchSize', label: 'Batch Size', placeholder: '10', desc: 'Istirahat tiap X pesan.' },{ key: 'batchPause', label: 'Pause (ms)', placeholder: '30000', desc: 'Lama istirahat.' },{ key: 'hourlyLimit', label: 'Hourly Limit', placeholder: '50', desc: 'Maks pesan per jam.' },{ key: 'stopOnConsecutiveErrors', label: 'Stop on Errors', placeholder: '3', desc: 'Stop jika X gagal urut.' },{ key: 'longBreakAfter', label: 'Long Break After', placeholder: '25', desc: 'Istirahat tiap X pesan.' },{ key: 'longBreakDuration', label: 'Duration (min)', placeholder: '10', desc: 'Lama istirahat (menit).' }].map(field => (
                        <div key={field.key}>
                          <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#3d4558', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>{field.label}</label>
                          <GlassInput type="number" value={(settings as any)[field.key]} onChange={e => setSettings(prev => ({ ...prev, [field.key]: parseInt(e.target.value) || 0 }))} placeholder={field.placeholder}/>
                          <p style={{ fontSize: 9, color: '#2a3040', marginTop: 4, fontStyle: 'italic' }}>{field.desc}</p>
                        </div>
                      ))}
                    </div>
                    {[{ key: 'shuffleQueue', label: 'Shuffle Queue', desc: 'Acak urutan antrean.' },{ key: 'useRandomGreetings', label: 'Random Greetings', desc: 'Variasi kata sapaan otomatis.' },{ key: 'addRandomSuffix', label: 'Random Suffix', desc: 'Tambah ID unik di akhir.' },{ key: 'useInvisibleChars', label: 'Invisible Characters', desc: 'Sisipkan karakter tak terlihat.' },{ key: 'simulateTyping', label: 'Simulate Typing', desc: 'Tambah jeda berdasar panjang pesan.' },{ key: 'adaptiveDelay', label: 'Adaptive Delay', desc: 'Delay bertambah seiring jumlah pesan.' },{ key: 'randomizeFormatting', label: 'Random Formatting', desc: 'Variasi spasi dan baris baru.' },{ key: 'rotateTemplates', label: 'Template Rotation', desc: 'Gunakan template berbeda bergantian.' },{ key: 'randomizeEmojis', label: 'Randomize Emojis', desc: 'Sisipkan emoji acak.' },{ key: 'useGlobalSpintax', label: 'Global Spintax', desc: 'Aktifkan parser {pilihan1|pilihan2}.' },{ key: 'autoSend', label: 'Auto Send Mode', desc: 'Kirim otomatis via Chrome Extension.' }].map(item => (
                      <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 12 }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#c8d0e0', marginBottom: 2 }}>{item.label}</div>
                          <div style={{ fontSize: 10, color: '#2a3040' }}>{item.desc}</div>
                        </div>
                        <Toggle3D checked={!!(settings as any)[item.key]} onChange={() => setSettings(prev => ({ ...prev, [item.key]: !(prev as any)[item.key] }))}/>
                      </div>
                    ))}
                    {settings.autoSend && (
                      <div style={{ padding: 20, background: 'rgba(255,184,0,0.05)', border: '1px solid rgba(255,184,0,0.15)', borderRadius: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ffb800' }}>
                            <Puzzle size={15}/><span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Chrome Extension Required</span>
                          </div>
                          <div style={{ padding: '3px 10px', background: isExtensionDetected ? '#00ff9d' : '#ffb800', borderRadius: 6, fontSize: 9, fontWeight: 800, color: '#000', textTransform: 'uppercase' }}>
                            {isExtensionDetected ? 'Connected' : 'Not Found'}
                          </div>
                        </div>
                        <p style={{ fontSize: 11, color: '#5a4820', lineHeight: 1.6, marginBottom: 14 }}>Fitur ini membutuhkan Chrome Extension khusus.</p>
                        <button onClick={downloadExtensionZip} style={{ width: '100%', padding: '12px 0', background: 'linear-gradient(135deg, #ffb800, #ff8c00)', border: 'none', borderRadius: 12, color: '#000', fontWeight: 800, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 16px rgba(255,184,0,0.3)', marginBottom: 14 }}>
                          <Download size={15}/> Download Extension (.zip)
                        </button>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#8a6e30', marginBottom: 8 }}>Cara Instalasi:</div>
                        <ol style={{ fontSize: 10, color: '#4a3810', lineHeight: 1.8, paddingLeft: 16 }}>
                          <li>Download & ekstrak ZIP.</li>
                          <li>Buka <code style={{ background: 'rgba(255,184,0,0.1)', padding: '1px 5px', borderRadius: 3 }}>chrome://extensions</code></li>
                          <li>Aktifkan <strong>Developer Mode</strong>.</li>
                          <li>Klik <strong>Load Unpacked</strong> & pilih folder.</li>
                        </ol>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div style={{ padding: '20px 28px', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}>
                <button onClick={() => setShowSettingsModal(false)} style={{ width: '100%', padding: '14px 0', background: 'linear-gradient(135deg, #00ff9d, #00c97e)', border: 'none', borderRadius: 14, color: '#000', fontWeight: 800, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,255,157,0.3)' }}>
                  Save Configuration
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 28px', borderTop: '1px solid rgba(255,255,255,0.04)', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 10, color: '#1a2030', textTransform: 'uppercase', letterSpacing: '0.3em', fontFamily: 'JetBrains Mono, monospace' }}>
          WAsender PRO Engine • v2.0.0 • Enterprise Edition
        </div>
      </footer>
    </div>
  );
}
