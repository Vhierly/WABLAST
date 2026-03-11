import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, Send, Trash2, Play, Square, MessageSquare, User,
  FileText, CheckCircle2, Clock, AlertCircle, Settings2,
  Download, FileSpreadsheet, X, Search, Sparkles, BarChart3,
  History, Timer, ExternalLink, Moon, Sun, RotateCcw,
  Puzzle, Loader2, Zap
} from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import {
  BlastEntry, LogEntry, MessageTemplate,
  DEFAULT_TEMPLATES, AppSettings, DEFAULT_SETTINGS
} from './types';
import { downloadExtensionZip } from './utils/extensionDownloader';

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
const formatCurrency = (val: string) => {
  if (!val) return '';
  const num = parseInt(val.replace(/\D/g, ''));
  return isNaN(num) ? val : new Intl.NumberFormat('id-ID').format(num);
};

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
// Palette: Deep Ink Black + Cream White + Electric Orange + Acid Green
// Typeface: "Syne" (display) + "DM Mono" (code) — loaded via @import
const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:ital,wght@0,400;0,500;1,400&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --ink:   #0D0D0D;
  --cream: #F2EFE7;
  --orange:#FF4D00;
  --acid:  #AAFF00;
  --muted: #7A7570;
  --card:  #F7F4EC;
  --border:#0D0D0D;
  --r:     6px;
}

.dark {
  --ink:   #F2EFE7;
  --cream: #0D0D0D;
  --orange:#FF6B2B;
  --acid:  #B8FF24;
  --muted: #6B6560;
  --card:  #161616;
  --border:#F2EFE7;
}

body { background: var(--cream); color: var(--ink); font-family: 'Syne', sans-serif; }

/* Scrollbar */
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--muted); border-radius: 2px; }

/* Range input */
input[type=range] { -webkit-appearance: none; appearance: none; height: 3px; background: transparent; cursor: pointer; }
input[type=range]::-webkit-slider-runnable-track { height: 3px; border-radius: 2px; background: var(--ink); opacity: .15; }
input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; background: var(--orange); border-radius: 50%; margin-top: -5.5px; box-shadow: 0 0 0 3px var(--cream), 0 0 0 4px var(--orange); }

/* Keyframes */
@keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
@keyframes pulse-ring { 0%,100% { transform: scale(1); opacity:.7; } 50% { transform: scale(1.15); opacity:.3; } }
@keyframes spin-slow { to { transform: rotate(360deg); } }
@keyframes glitch {
  0%,100% { clip-path: inset(0 0 100% 0); }
  20% { clip-path: inset(10% 0 80% 0); transform: translateX(-3px); }
  40% { clip-path: inset(40% 0 50% 0); transform: translateX(3px); }
  60% { clip-path: inset(60% 0 30% 0); transform: translateX(-2px); }
  80% { clip-path: inset(80% 0 10% 0); transform: translateX(2px); }
}
`;

// ─── REUSABLE PRIMITIVES ──────────────────────────────────────────────────────

const Pill = ({ children, color = 'ink' }: { children: React.ReactNode; color?: 'ink'|'orange'|'acid'|'muted' }) => {
  const map = { ink: 'bg-[--ink] text-[--cream]', orange: 'bg-[--orange] text-white', acid: 'bg-[--acid] text-[--ink]', muted: 'border border-[--muted] text-[--muted]' };
  return <span className={cn('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider', map[color])}>{children}</span>;
};

const BentoCard = ({ children, className = '', style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) => (
  <div className={cn('relative rounded-[var(--r)] border-2 border-[--border] bg-[--card] overflow-hidden', className)} style={style}>{children}</div>
);

const KiloInput = ({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...props} className={cn(
    'w-full px-3 py-2.5 rounded-[var(--r)] border-2 border-[--border] bg-[--cream] text-[--ink]',
    'text-sm font-[DM_Mono,monospace] placeholder-[--muted] outline-none',
    'focus:border-[--orange] transition-colors duration-150',
    className
  )} />
);

const KiloLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[9px] font-bold uppercase tracking-[.18em] text-[--muted] mb-1.5 font-[DM_Mono,monospace]">{children}</div>
);

const BrutalBtn = ({ children, variant = 'primary', className = '', ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary'|'secondary'|'danger'|'ghost'|'acid' }) => {
  const v = {
    primary:   'bg-[--ink] text-[--cream] hover:bg-[--orange] border-[--ink]',
    secondary: 'bg-transparent text-[--ink] border-[--border] hover:bg-[--ink] hover:text-[--cream]',
    danger:    'bg-transparent text-red-600 border-red-600 hover:bg-red-600 hover:text-white',
    ghost:     'bg-transparent text-[--muted] border-transparent hover:text-[--ink]',
    acid:      'bg-[--acid] text-[--ink] border-[--acid] hover:opacity-90',
  };
  return (
    <button {...rest} className={cn('flex items-center justify-center gap-2 px-4 py-2.5 rounded-[var(--r)] border-2 text-xs font-bold uppercase tracking-wider transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed', v[variant], className)}>
      {children}
    </button>
  );
};

const ToggleSwitch = ({ checked, onChange, label, sub }: { checked: boolean; onChange: () => void; label: string; sub?: string }) => (
  <div className="flex items-center justify-between py-2.5 border-b border-[--border]/10 last:border-0">
    <div>
      <div className="text-xs font-semibold text-[--ink]">{label}</div>
      {sub && <div className="text-[10px] text-[--muted] mt-0.5 font-[DM_Mono,monospace]">{sub}</div>}
    </div>
    <button
      onClick={onChange}
      className={cn('relative w-10 h-5 rounded-full border-2 border-[--border] transition-colors duration-200 flex-shrink-0 ml-4',
        checked ? 'bg-[--orange]' : 'bg-[--cream]'
      )}
    >
      <span className={cn('absolute top-0.5 w-3.5 h-3.5 rounded-full bg-[--cream] border-2 border-[--border] transition-all duration-200 shadow-sm',
        checked ? 'left-[18px]' : 'left-0.5'
      )} />
    </button>
  </div>
);

// ─── STATUS CONFIG ─────────────────────────────────────────────────────────────
const STATUS_MAP = {
  sent:    { label: 'SENT',    color: 'acid',   icon: <CheckCircle2 size={10} /> },
  sending: { label: 'SENDING', color: 'orange', icon: <Loader2 size={10} className="animate-spin" /> },
  failed:  { label: 'FAILED',  color: 'muted',  icon: <AlertCircle size={10} /> },
  pending: { label: 'PENDING', color: 'muted',  icon: <Clock size={10} /> },
} as const;

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
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
  const [formData, setFormData] = useState({ phone: '', recipientName: '', itemName: '', receiptNumber: '', address: '', cod: '', dfod: '' });

  // ── Load / save ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const savedEntries   = localStorage.getItem('wa_blast_entries');
    const savedTemplates = localStorage.getItem('wa_blast_templates');
    const savedActiveId  = localStorage.getItem('wa_blast_active_template_id');
    const savedSettings  = localStorage.getItem('wa_blast_settings');
    if (savedEntries) setEntries(JSON.parse(savedEntries));
    if (savedTemplates) {
      const parsed: MessageTemplate[] = JSON.parse(savedTemplates);
      const merged = [...parsed];
      DEFAULT_TEMPLATES.forEach(def => { if (!merged.find(t => t.id === def.id)) merged.push(def); });
      setTemplates(merged);
    }
    if (savedActiveId) setActiveTemplateId(savedActiveId);
    if (savedSettings) setSettings(JSON.parse(savedSettings));
  }, []);

  useEffect(() => localStorage.setItem('wa_blast_entries',              JSON.stringify(entries)),        [entries]);
  useEffect(() => localStorage.setItem('wa_blast_templates',            JSON.stringify(templates)),      [templates]);
  useEffect(() => localStorage.setItem('wa_blast_active_template_id',   activeTemplateId),               [activeTemplateId]);
  useEffect(() => localStorage.setItem('wa_blast_settings',             JSON.stringify(settings)),       [settings]);
  useEffect(() => {
    localStorage.setItem('wa_blast_theme', isDarkMode ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', isDarkMode);
    document.body.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const handleResetDefault = () => {
    if (window.confirm('Reset semua data ke pengaturan awal? Semua antrean & template custom akan hilang.')) {
      addLog('🔄 Sistem direset ke pengaturan awal', 'warning');
      localStorage.clear(); window.location.reload();
    }
  };

  const activeTemplate = templates.find(t => t.id === activeTemplateId) || templates[0];
  const currentTemplateText = activeTemplate.variations?.[activeVariationIndex] || activeTemplate.text;

  const updateActiveTemplateText = (text: string) => {
    setTemplates(prev => prev.map(t => {
      if (t.id !== activeTemplateId) return t;
      const variations = t.variations || [t.text, t.text, t.text];
      const nv = [...variations]; nv[activeVariationIndex] = text;
      return { ...t, text: activeVariationIndex === 0 ? text : t.text, variations: nv };
    }));
  };

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.phone || !formData.recipientName) { toast.error('Nomor HP dan Nama Penerima wajib diisi'); return; }
    const newEntry: BlastEntry = { id: crypto.randomUUID(), ...formData, status: 'pending', isReceived: false, createdAt: Date.now() };
    setEntries(prev => [newEntry, ...prev]);
    setFormData({ phone: '', recipientName: '', itemName: '', receiptNumber: '', address: '', cod: '', dfod: '' });
    addLog(`➕ Ditambahkan: ${newEntry.recipientName} (${newEntry.phone})`, 'info');
    toast.success('Data ditambahkan');
  };

  const handleBulkImport = () => {
    if (!bulkData.trim()) { toast.error('Data kosong'); return; }
    const lines = bulkData.trim().split(/\r?\n/);
    const newEntries: BlastEntry[] = []; let successCount = 0;
    lines.forEach(line => {
      const delim = line.includes('\t') ? '\t' : ',';
      const cols = line.split(delim).map(c => c.trim());
      if (cols.length < 4) return;
      const fc = cols[0].toLowerCase(), sc = (cols[1] || '').toLowerCase();
      if (fc === 'no' || sc === 'resi/awb' || sc === 'resi') return;
      const tanda = (cols[5] || '').toUpperCase();
      let cod = '', dfod = '';
      if (tanda === 'COD')  { const c = cols[6]?.replace(/[^0-9]/g,'') || ''; if (c && !isNaN(+c)) cod  = c; }
      if (tanda === 'DFOD') { const d = cols[7]?.replace(/[^0-9]/g,'') || ''; if (d && !isNaN(+d)) dfod = d; }
      newEntries.push({ id: crypto.randomUUID(), receiptNumber: cols[1]||'', recipientName: cols[2]||'', phone: cols[3]||'', address: cols[4]||'', itemName: cols[8]||'', cod, dfod, status: 'pending', isReceived: false, createdAt: Date.now() });
      successCount++;
    });
    if (newEntries.length > 0) {
      setEntries(prev => [...newEntries, ...prev]); setBulkData(''); setShowBulkModal(false);
      addLog(`📥 Bulk Import: ${successCount} data diimpor`, 'success'); toast.success(`${successCount} data berhasil diimpor`);
    } else { toast.error('Format data tidak valid.'); }
  };

  const clearAll = () => { setEntries([]); setIsConfirmingClear(false); addLog('🗑️ Semua data antrean dihapus', 'warning'); toast.success('Semua data dihapus'); };

  const getGreeting = () => {
    const h = new Date().getHours();
    const base = h < 11 ? 'Pagi' : h < 15 ? 'Siang' : h < 18 ? 'Sore' : 'Malam';
    if (!settings.useRandomGreetings) return `Selamat ${base}`;
    const arr = [`Selamat ${base}`, `${base} Kak`, `Halo, Selamat ${base}`, `Halo Kak, Selamat ${base}`, `Permisi, Selamat ${base}`, `Halo`, base];
    return arr[Math.floor(Math.random() * arr.length)];
  };

  const generateMessage = (entry: BlastEntry, templateText?: string) => {
    let text = templateText || activeTemplate.text;
    if (!entry.cod)  text = text.replace(/{if_cod}[\s\S]*?{\/if_cod}/gi, '');
    else             text = text.replace(/{if_cod}/gi,'').replace(/{\/if_cod}/gi,'');
    if (!entry.dfod) text = text.replace(/{if_dfod}[\s\S]*?{\/if_dfod}/gi, '');
    else             text = text.replace(/{if_dfod}/gi,'').replace(/{\/if_dfod}/gi,'');
    let msg = text
      .replace(/{salam}/gi,    getGreeting())
      .replace(/{pengirim}/gi, settings.senderName || 'Admin')
      .replace(/{nama}/gi,     entry.recipientName)
      .replace(/{barang}/gi,   entry.itemName || '-')
      .replace(/{resi}/gi,     entry.receiptNumber || '-')
      .replace(/{alamat}/gi,   entry.address || '-')
      .replace(/{cod}/gi,      entry.cod  ? `Rp ${formatCurrency(entry.cod)}`  : '-')
      .replace(/{dfod}/gi,     entry.dfod ? `Rp ${formatCurrency(entry.dfod)}` : '-');
    if (settings.useGlobalSpintax) msg = msg.replace(/{([^{}]+)}/g, (m, p1) => p1.includes('|') ? p1.split('|')[Math.floor(Math.random()*p1.split('|').length)] : m);
    if (settings.randomizeEmojis) { const em=['😊','🙏','📦','🚚','✨','✅','📍','🚛']; msg = msg.split(' ').map(w => Math.random()>.9 ? w+' '+em[Math.floor(Math.random()*em.length)] : w).join(' '); }
    if (settings.addRandomSuffix) msg += `\n\n_Ref: ${Math.random().toString(36).substring(7).toUpperCase()}_`;
    if (settings.useInvisibleChars) msg = msg.split(' ').map(w => Math.random()>.7 ? w+'\u200B' : w).join(' ');
    if (settings.randomizeFormatting) msg = msg.split('\n\n').map((p,i,a) => i===a.length-1?p : Math.random()>.8 ? p+'\n\n\n' : Math.random()>.6 ? p+'\n' : p+'\n\n').join('');
    return msg;
  };

  const getWALink = (entry: BlastEntry, sentCountOverride?: number) => {
    let phone = entry.phone.replace(/\D/g,'');
    if (phone.startsWith('0')) phone = '62'+phone.slice(1);
    if (!phone.startsWith('62')) phone = '62'+phone;
    let tpl = activeTemplate.text;
    if (settings.rotateTemplates) {
      const cnt = sentCountOverride ?? entries.filter(e=>e.status==='sent').length;
      const vars = activeTemplate.variations?.length ? activeTemplate.variations : [activeTemplate.text];
      tpl = vars[cnt % vars.length];
    }
    let link = `https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(generateMessage(entry, tpl))}`;
    if (settings.autoSend) link += '&autosend=true';
    return link + `&entryid=${entry.id}`;
  };

  const handleSendManual = (entry: BlastEntry) => {
    window.open(getWALink(entry), 'WAsenderTab')?.focus();
    addLog(`🚀 Mengirim manual ke ${entry.recipientName}`, 'info');
    updateStatus(entry.id, 'sent');
  };

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [{ id: crypto.randomUUID(), timestamp: Date.now(), message, type }, ...prev].slice(0, 100));
  };

  const updateStatus = (id: string, status: BlastEntry['status']) => setEntries(prev => prev.map(e => e.id===id ? {...e, status} : e));
  const toggleReceived = (id: string) => setEntries(prev => prev.map(e => e.id===id ? {...e, isReceived: !e.isReceived} : e));

  const calculateNextDelay = (sentCount: number, entry: BlastEntry) => {
    let min = settings.delay, max = settings.maxDelay, typing = settings.simulateTyping, adaptive = settings.adaptiveDelay;
    if (settings.speedMode==='safe')   { min=15000; max=30000; typing=true; adaptive=true; }
    if (settings.speedMode==='normal') { min=8000;  max=15000; typing=true; adaptive=true; }
    if (settings.speedMode==='fast')   { min=3000;  max=7000;  typing=false; adaptive=false; }
    if (settings.speedMode==='turbo')  { min=1000;  max=2000;  typing=false; adaptive=false; }
    let delay = (settings.randomizeDelay || settings.speedMode!=='custom') ? Math.floor(Math.random()*(max-min+1))+min : min;
    if (adaptive) delay += Math.floor(sentCount/10)*500;
    if (typing) { const vars = activeTemplate.variations?.length ? activeTemplate.variations : [activeTemplate.text]; delay += Math.min(generateMessage(entry, vars[sentCount%vars.length]).length*50, 5000); }
    if (settings.batchSize>0 && sentCount>=nextBatchPauseAt && nextBatchPauseAt>0) {
      delay = settings.batchPause;
      toast(`Anti-Spam: Istirahat ${settings.batchPause/1000}s...`, {icon:'🛡️'});
      setNextBatchPauseAt(sentCount + settings.batchSize + (Math.floor(Math.random()*5)-2));
    }
    if (settings.longBreakAfter>0 && sentCount>0 && sentCount%settings.longBreakAfter===0) {
      delay = settings.longBreakDuration*60*1000; setIsLongBreak(true);
      addLog(`😴 Long break ${settings.longBreakDuration} menit...`, 'warning');
    } else setIsLongBreak(false);
    return delay;
  };

  const startBlast = () => {
    if (!isExtensionDetected && !settings.manualMode) { toast.error('Extension tidak terdeteksi!', {icon:'🔌'}); return; }
    const pending = entries.filter(e=>e.status==='pending');
    if (!pending.length) { toast.error('Tidak ada pesan pending'); return; }
    let toProcess = [...pending];
    if (settings.shuffleQueue) { toProcess = toProcess.sort(()=>Math.random()-.5); setEntries(prev=>[...prev.filter(e=>e.status!=='pending'), ...toProcess]); }
    const first = toProcess[0];
    addLog(`🎬 Blast dimulai...${settings.shuffleQueue?' (Diacak)':''}`, 'info');
    const win = window.open(getWALink(first), 'WAsenderTab');
    if (!win) { toast.error('Popup terblokir! Izinkan popup.', {duration:8000,icon:'🚫'}); return; }
    win.focus();
    if (settings.autoSend) updateStatus(first.id, 'sending');
    else { updateStatus(first.id, 'sent'); setNextActionTime(Date.now()+calculateNextDelay(entries.filter(e=>e.status==='sent').length+1, toProcess[1]||first)); }
    setIsBlasting(true); setCurrentIndex(0);
    if (settings.batchSize>0) setNextBatchPauseAt(entries.filter(e=>e.status==='sent').length+settings.batchSize+(Math.floor(Math.random()*5)-2));
  };

  const stopBlast = () => { setIsBlasting(false); setCurrentIndex(-1); setNextActionTime(0); addLog('🛑 Blast dihentikan', 'warning'); };

  useEffect(() => {
    if (!isBlasting || settings.manualMode) return;
    const sending = entries.find(e=>e.status==='sending');
    if (!sending) return;
    const t = {turbo:5000, fast:10000, normal:15000}[settings.speedMode as string] ?? 25000;
    const timer = setTimeout(() => {
      addLog(`⏭️ Auto-Next: ${sending.recipientName}`, 'info');
      updateStatus(sending.id, 'sent');
      const cnt = entries.filter(e=>e.status==='sent').length+1;
      const pend = entries.filter(e=>e.status==='pending' && e.id!==sending.id);
      if (pend.length) setNextActionTime(Date.now()+calculateNextDelay(cnt, pend[0]));
    }, t);
    return () => clearTimeout(timer);
  }, [entries, isBlasting, settings.manualMode, settings.speedMode]);

  useEffect(() => {
    const handle = (event: MessageEvent) => {
      if (!event.data || event.data.source !== 'wasender-extension') return;
      const {type, entryId, status: ws} = event.data;
      if (type === 'WA_STATUS_UPDATE') {
        setEntries(cur => {
          const entry = cur.find(e=>e.id===entryId);
          if (!entry || entry.status==='sent') return cur;
          if (ws==='sent') {
            setConsecutiveErrors(0); setSentThisHour(p=>p+1);
            addLog(`✅ Terkirim: ${entry.recipientName} (${entry.receiptNumber})`, 'success');
            const cnt = cur.filter(e=>e.status==='sent').length+1;
            const pend = cur.filter(e=>e.status==='pending' && e.id!==entryId);
            if (pend.length) setNextActionTime(Date.now()+calculateNextDelay(cnt, pend[0]));
            return cur.map(e => e.id===entryId ? {...e,status:'sent'} : e);
          }
          if (ws==='invalid') {
            const r = entry.retryCount||0;
            if (settings.autoRetry && r<settings.maxRetries) { addLog(`🔄 Retry ${entry.recipientName} (${r+1}/${settings.maxRetries})`, 'warning'); return cur.map(e=>e.id===entryId?{...e,status:'pending',retryCount:r+1}:e); }
            setConsecutiveErrors(p=>p+1);
            addLog(`❌ Invalid: ${entry.recipientName}`, 'error');
            return cur.map(e=>e.id===entryId?{...e,status:'failed'}:e);
          }
          return cur;
        });
      } else if (type==='WA_WARNING_DETECTED') {
        stopBlast(); addLog('🚨 SPAM WARNING TERDETEKSI! Blast dihentikan.', 'error');
        toast.error('PERINGATAN SPAM! Blast dihentikan.', {duration:10000, icon:'🚨'});
      }
    };
    window.addEventListener('message', handle);
    const hb = setInterval(() => {
      if (lastHeartbeat>0 && Date.now()-lastHeartbeat>20000 && isExtensionDetected) { setIsExtensionDetected(false); addLog('🔌 Extension terputus', 'warning'); }
    }, 5000);
    return () => { window.removeEventListener('message', handle); clearInterval(hb); };
  }, [lastHeartbeat, isExtensionDetected, settings.autoRetry, settings.maxRetries, settings.speedMode]);

  useEffect(() => {
    const pong = (e: MessageEvent) => {
      if (e.data?.source==='wasender-extension' && e.data?.type==='EXTENSION_PONG') {
        if (!isExtensionDetected) { setIsExtensionDetected(true); addLog('🔌 Extension aktif', 'success'); }
        setLastHeartbeat(Date.now());
      }
    };
    window.addEventListener('message', pong);
    const check = () => {
      if (document.documentElement.getAttribute('data-wasender-extension')==='active') {
        if (!isExtensionDetected) { setIsExtensionDetected(true); addLog('🔌 Extension via DOM', 'success'); }
        setLastHeartbeat(Date.now());
      }
      window.postMessage({type:'EXTENSION_PING'}, '*');
    };
    const iv = setInterval(check, 2000); check();
    return () => { window.removeEventListener('message', pong); clearInterval(iv); };
  }, [isExtensionDetected]);

  useEffect(() => {
    if (!isBlasting || settings.manualMode) { setCountdown(0); return; }
    const tick = () => {
      const now = Date.now();
      if (now-lastHourReset>3600000) { setSentThisHour(0); setLastHourReset(now); }
      if (sentThisHour>=settings.hourlyLimit) { setIsBlasting(false); addLog('⏳ Hourly limit tercapai.', 'warning'); return; }
      const pending  = entries.filter(e=>e.status==='pending');
      const sending  = entries.filter(e=>e.status==='sending');
      if (sending.length) { setCountdown(0); return; }
      if (pending.length) {
        const entry = pending[0];
        if (now>=nextActionTime) {
          addLog(`🚀 Mengirim ke ${entry.recipientName}...`, 'info');
          const win = window.open(getWALink(entry, entries.filter(e=>e.status==='sent').length), 'WAsenderTab');
          if (!win) { addLog('⚠️ Tab diblokir browser.', 'warning'); setNextActionTime(Date.now()+3000); return; }
          win.focus();
          if (settings.autoSend) updateStatus(entry.id, 'sending');
          else { updateStatus(entry.id, 'sent'); setNextActionTime(Date.now()+calculateNextDelay(entries.filter(e=>e.status==='sent').length+1, pending[1]||entry)); }
        } else setCountdown(Math.max(0, Math.ceil((nextActionTime-now)/1000)));
      } else { setIsBlasting(false); addLog('🏁 Blast selesai!', 'success'); }
    };
    tick(); const iv = setInterval(tick, 1000); return () => clearInterval(iv);
  }, [isBlasting, entries, nextActionTime, settings.manualMode, settings.hourlyLimit, sentThisHour, lastHourReset]);

  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (isBlasting && settings.manualMode && (e.code==='Space'||e.code==='Enter')) {
        e.preventDefault();
        const pend = entries.filter(en=>en.status==='pending');
        if (pend.length) { window.open(getWALink(pend[0]),'WAsenderTab'); updateStatus(pend[0].id,'sent'); }
      }
    };
    window.addEventListener('keydown', kd);
    return () => window.removeEventListener('keydown', kd);
  }, [isBlasting, settings.manualMode, entries]);

  const filteredEntries = useMemo(() => entries.filter(e =>
    e.recipientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.phone.includes(searchQuery) ||
    e.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase())
  ), [entries, searchQuery]);

  const statsData = useMemo(() => [
    { name: 'Sent',     value: entries.filter(e=>e.status==='sent').length,    color: '#AAFF00' },
    { name: 'Pending',  value: entries.filter(e=>e.status==='pending').length,  color: '#FF4D00' },
    { name: 'Received', value: entries.filter(e=>e.isReceived).length,          color: '#0D0D0D' },
  ], [entries]);

  const safetyScore = useMemo(() => {
    let s = 0;
    if (settings.delay>=5000)               s+=20;
    if (settings.randomizeDelay)             s+=15;
    if (settings.batchSize>0&&settings.batchSize<=15) s+=10;
    if (settings.useRandomGreetings)         s+=5;
    if (settings.useInvisibleChars)          s+=5;
    if (settings.simulateTyping)             s+=10;
    if (settings.adaptiveDelay)              s+=5;
    if (settings.rotateTemplates)            s+=10;
    if (settings.hourlyLimit<=50)            s+=10;
    if (settings.shuffleQueue)               s+=10;
    return Math.min(100, s);
  }, [settings]);

  const exportToCSV = () => {
    if (!entries.length) return;
    const rows = [['Phone','Name','Item','Receipt','Status','Received','Created At'],
      ...entries.map(e=>[e.phone,e.recipientName,e.itemName,e.receiptNumber,e.status,e.isReceived?'YES':'NO',new Date(e.createdAt).toLocaleString()])];
    const csv = rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));
    a.download = `wasender_${new Date().toISOString().split('T')[0]}.csv`; a.click();
    toast.success('Laporan diunduh');
  };

  // Live ticker data
  const tickerItems = [
    `QUEUE: ${entries.length}`,
    `SENT: ${entries.filter(e=>e.status==='sent').length}`,
    `PENDING: ${entries.filter(e=>e.status==='pending').length}`,
    `RECEIVED: ${entries.filter(e=>e.isReceived).length}`,
    `SAFETY: ${safetyScore}%`,
    `ENGINE: ${isBlasting ? 'ACTIVE ●' : 'IDLE ○'}`,
    `EXT: ${isExtensionDetected ? 'CONNECTED ✓' : 'OFFLINE ✗'}`,
  ];

  const TAGS = ['{salam}','{pengirim}','{nama}','{barang}','{resi}','{alamat}','{cod}','{dfod}','{if_cod}','{/if_cod}','{if_dfod}','{/if_dfod}'];

  // ── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{FONT_IMPORT}</style>

      <div className={cn('min-h-screen transition-colors duration-300', isDarkMode && 'dark')}
        style={{ background:'var(--cream)', color:'var(--ink)', fontFamily:"'Syne', sans-serif" }}>

        <Toaster position="top-right" toastOptions={{
          style:{ background:'var(--card)', color:'var(--ink)', border:'2px solid var(--border)', borderRadius:'var(--r)', fontFamily:"'DM Mono', monospace", fontSize:'12px' }
        }}/>

        {/* ── BLAST OVERLAY ───────────────────────────────────────────────────── */}
        <AnimatePresence>
          {isBlasting && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              className="fixed inset-0 z-[100] flex items-center justify-center"
              style={{background:'rgba(13,13,13,0.92)', backdropFilter:'blur(8px)'}}>
              <motion.div initial={{scale:.9, y:20}} animate={{scale:1, y:0}} exit={{scale:.9,y:20}}
                className="w-full max-w-sm mx-4 rounded-2xl overflow-hidden border-2"
                style={{borderColor:'var(--orange)', background:'var(--cream)'}}>

                {/* Header bar */}
                <div className="px-6 py-4 flex items-center justify-between border-b-2" style={{borderColor:'var(--border)', background:'var(--orange)'}}>
                  <span className="font-black text-white text-sm uppercase tracking-widest">
                    {isLongBreak ? 'LONG BREAK' : entries.some(e=>e.status==='sending') ? 'PROCESSING' : 'ENGINE ACTIVE'}
                  </span>
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-white/40" /><span className="w-2.5 h-2.5 rounded-full bg-white/70" /><span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                  </div>
                </div>

                <div className="p-6 space-y-5">
                  {/* Giant countdown */}
                  {!settings.manualMode ? (
                    <div className="text-center">
                      <div className="text-[72px] font-black leading-none tabular-nums"
                        style={{color: isLongBreak ? 'var(--orange)' : entries.some(e=>e.status==='sending') ? 'var(--muted)' : 'var(--ink)'}}>
                        {entries.some(e=>e.status==='sending') ? '—' : `${Math.floor(countdown/60).toString().padStart(2,'0')}:${(countdown%60).toString().padStart(2,'0')}`}
                      </div>
                      <div className="text-[10px] font-bold uppercase tracking-[.2em] mt-1" style={{color:'var(--muted)'}}>
                        {entries.some(e=>e.status==='sending') ? 'Waiting WA Web' : isLongBreak ? 'Break Ends In' : 'Next Message'}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 border-[--border] text-xs font-bold uppercase tracking-widest" style={{background:'var(--acid)'}}>
                        MANUAL MODE AKTIF
                      </div>
                      <p className="text-[10px] mt-2" style={{color:'var(--muted)'}}>Tekan [SPASI] untuk lanjut</p>
                    </div>
                  )}

                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider" style={{color:'var(--muted)'}}>
                      <span>Progress</span>
                      <span>{entries.filter(e=>e.status==='sent').length} / {entries.length}</span>
                    </div>
                    <div className="h-2 w-full rounded-full overflow-hidden" style={{background:'var(--card)'}}>
                      <motion.div className="h-full rounded-full" style={{background:'var(--orange)'}}
                        animate={{width:`${entries.length ? (entries.filter(e=>e.status==='sent').length/entries.length)*100 : 0}%`}}
                        transition={{duration:.5}} />
                    </div>
                  </div>

                  {/* Manual trigger */}
                  {!settings.manualMode && Date.now()>=nextActionTime && entries.filter(e=>e.status==='pending').length>0 && !entries.some(e=>e.status==='sending') && (
                    <BrutalBtn variant="acid" className="w-full" onClick={() => {
                      const pend = entries.filter(e=>e.status==='pending');
                      if (pend.length) {
                        const entry = pend[0], cnt = entries.filter(e=>e.status==='sent').length;
                        const win = window.open(getWALink(entry, cnt), 'WAsenderTab');
                        if (win) { win.focus(); settings.autoSend ? updateStatus(entry.id,'sending') : (updateStatus(entry.id,'sent'), setNextActionTime(Date.now()+calculateNextDelay(cnt+1, entries.filter(e=>e.status==='pending')[1]||entry))); }
                      }
                    }}>▶ Tab tidak terbuka? Klik ini</BrutalBtn>
                  )}

                  <p className="text-[9px] text-center font-bold uppercase tracking-widest" style={{color:'var(--orange)'}}>
                    ⚠ TEKAN [ENTER] DI TAB WHATSAPP
                  </p>

                  {/* Actions */}
                  <div className="grid gap-2">
                    {entries.some(e=>e.status==='sending') && (
                      <BrutalBtn variant="secondary" className="w-full" onClick={() => {
                        const s = entries.find(e=>e.status==='sending');
                        if (s) { addLog(`⏭️ Paksa lanjut: ${s.recipientName}`, 'warning'); updateStatus(s.id,'sent'); }
                      }}>Paksa Lanjut →</BrutalBtn>
                    )}
                    <BrutalBtn variant="secondary" className="w-full" onClick={() => {
                      const pend = entries.filter(e=>e.status==='pending');
                      if (pend.length) { const win = window.open(getWALink(pend[0]),'WAsenderTab'); win?.focus(); updateStatus(pend[0].id,'sent'); }
                    }}>Kirim Berikutnya (Manual)</BrutalBtn>
                    <BrutalBtn variant="danger" className="w-full" onClick={stopBlast}><Square size={14} fill="currentColor"/> Stop Engine</BrutalBtn>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── HEADER ──────────────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-30 border-b-2" style={{borderColor:'var(--border)', background:'var(--cream)'}}>
          {/* Ticker */}
          <div className="overflow-hidden border-b-2 py-1.5" style={{borderColor:'var(--border)', background:'var(--ink)'}}>
            <div className="flex whitespace-nowrap" style={{animation:'ticker 20s linear infinite'}}>
              {[...tickerItems,...tickerItems,...tickerItems,...tickerItems].map((t,i)=>(
                <span key={i} className="text-[10px] font-bold uppercase tracking-widest mx-6" style={{color: isBlasting ? 'var(--acid)' : 'var(--cream)'}}>
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
            {/* Logo */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="w-8 h-8 rounded-[var(--r)] border-2 flex items-center justify-center" style={{borderColor:'var(--border)', background:'var(--orange)'}}>
                <Send size={14} className="text-white" />
              </div>
              <div className="leading-none">
                <div className="text-base font-black uppercase tracking-tight">WAsender <span style={{color:'var(--orange)'}}>PRO</span></div>
              </div>
            </div>

            {/* Status badge */}
            <div className="hidden md:flex items-center gap-2">
              {isExtensionDetected
                ? <Pill color="acid"><Puzzle size={10}/> EXT ON</Pill>
                : <Pill color="muted"><Puzzle size={10}/> EXT OFF</Pill>}
              {isBlasting
                ? <Pill color="orange"><span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block"/> BLASTING</Pill>
                : <Pill>IDLE</Pill>}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {!isExtensionDetected && (
                <BrutalBtn variant="secondary" className="hidden sm:flex text-[10px]" onClick={downloadExtensionZip}>
                  <Puzzle size={13}/> <span className="hidden lg:inline">Setup Ext</span>
                </BrutalBtn>
              )}
              <BrutalBtn variant="ghost" className="w-9 h-9 p-0" onClick={handleResetDefault} title="Reset"><RotateCcw size={15}/></BrutalBtn>
              <BrutalBtn variant="ghost" className="w-9 h-9 p-0" onClick={()=>setIsDarkMode(!isDarkMode)}>{isDarkMode?<Sun size={15}/>:<Moon size={15}/>}</BrutalBtn>
              <BrutalBtn variant="ghost" className="w-9 h-9 p-0" onClick={()=>setShowSettingsModal(true)}><Settings2 size={15}/></BrutalBtn>
              <BrutalBtn variant="secondary" className="text-[10px] hidden sm:flex" onClick={exportToCSV}><Download size={13}/><span className="hidden md:inline">Export</span></BrutalBtn>
            </div>
          </div>
        </header>

        {/* ── MAIN ────────────────────────────────────────────────────────────── */}
        <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-5 space-y-5">

          {/* ─── ROW 1: Hero stats + Form ─────────────────────────────────────── */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">

            {/* Left column */}
            <div className="xl:col-span-4 flex flex-col gap-4">

              {/* Stats bento */}
              <BentoCard className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-[.18em]" style={{color:'var(--muted)'}}>Overview</span>
                  <History size={13} style={{color:'var(--muted)'}}/>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {statsData.map(s=>(
                    <div key={s.name} className="rounded-[var(--r)] border-2 p-3 text-center" style={{borderColor:'var(--border)'}}>
                      <div className="text-[8px] font-bold uppercase tracking-widest mb-1" style={{color:'var(--muted)'}}>{s.name}</div>
                      <div className="text-3xl font-black" style={{color:s.color==='#0D0D0D'?'var(--ink)':s.color}}>{s.value}</div>
                    </div>
                  ))}
                </div>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statsData} innerRadius={38} outerRadius={56} paddingAngle={4} dataKey="value" strokeWidth={2} stroke="var(--border)">
                        {statsData.map((s,i)=><Cell key={i} fill={s.color==='#0D0D0D'?isDarkMode?'#F2EFE7':'#0D0D0D':s.color}/>)}
                      </Pie>
                      <RechartsTooltip contentStyle={{background:'var(--card)',border:'2px solid var(--border)',borderRadius:'var(--r)',fontFamily:"'DM Mono',monospace",fontSize:'11px',color:'var(--ink)'}}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </BentoCard>

              {/* Engine quick settings */}
              <BentoCard className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Timer size={14} style={{color:'var(--orange)'}}/>
                  <span className="text-[10px] font-bold uppercase tracking-[.18em]" style={{color:'var(--muted)'}}>Engine</span>
                </div>
                <div className="space-y-4">
                  <div>
                    <KiloLabel>Nama Pengirim</KiloLabel>
                    <KiloInput value={settings.senderName} onChange={e=>setSettings(p=>({...p,senderName:e.target.value}))} placeholder="Admin JNT"/>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <KiloLabel>Blast Delay</KiloLabel>
                      <span className="text-xs font-black" style={{color:'var(--orange)'}}>{settings.delay/1000}s</span>
                    </div>
                    <input type="range" min="1000" max="10000" step="500" value={settings.delay}
                      onChange={e=>setSettings(p=>({...p,delay:+e.target.value}))} className="w-full"/>
                    <div className="flex justify-between text-[9px] mt-1 font-bold uppercase tracking-wider" style={{color:'var(--muted)'}}>
                      <span>Fast</span><span>Safe</span>
                    </div>
                  </div>
                </div>
              </BentoCard>
            </div>

            {/* Template panel */}
            <div className="xl:col-span-8">
              <BentoCard className="p-5 h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Settings2 size={14} style={{color:'var(--orange)'}}/>
                    <span className="text-[10px] font-bold uppercase tracking-[.18em]" style={{color:'var(--muted)'}}>Templates</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] font-bold" style={{color:'var(--acid)'}}>● Auto-saved</span>
                    <button onClick={()=>{
                      const def=DEFAULT_TEMPLATES.find(t=>t.id===activeTemplateId);
                      if(def&&confirm('Reset template ini?')){setTemplates(p=>p.map(t=>t.id===activeTemplateId?{...def}:t));setActiveVariationIndex(0);toast.success('Reset!');}
                    }} className="p-1.5 rounded-[var(--r)] border-2 hover:opacity-70 transition-opacity" style={{borderColor:'var(--border)'}}>
                      <History size={13}/>
                    </button>
                  </div>
                </div>

                {/* Template tabs */}
                <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
                  {templates.map(t=>(
                    <button key={t.id} onClick={()=>{setActiveTemplateId(t.id);setActiveVariationIndex(0);}}
                      className="whitespace-nowrap px-3 py-1.5 rounded-full border-2 text-[10px] font-bold uppercase tracking-wider transition-all"
                      style={activeTemplateId===t.id ? {background:'var(--ink)',color:'var(--cream)',borderColor:'var(--ink)'} : {background:'transparent',color:'var(--muted)',borderColor:'var(--muted)'}}>
                      {t.name}
                    </button>
                  ))}
                </div>

                {/* Variation picker */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[9px] font-bold uppercase tracking-widest" style={{color:'var(--muted)'}}>Variasi:</span>
                  {[0,1,2].map(idx=>(
                    <button key={idx} onClick={()=>setActiveVariationIndex(idx)}
                      className="w-7 h-7 rounded-full border-2 text-[10px] font-black transition-all"
                      style={activeVariationIndex===idx ? {background:'var(--orange)',color:'white',borderColor:'var(--orange)'} : {background:'transparent',borderColor:'var(--muted)',color:'var(--muted)'}}>
                      {idx+1}
                    </button>
                  ))}
                  <span className="ml-auto text-[9px]" style={{color:'var(--muted)'}}>{settings.rotateTemplates?'Rotasi ON':'Rotasi OFF'}</span>
                </div>

                <textarea value={currentTemplateText} onChange={e=>updateActiveTemplateText(e.target.value)}
                  className="flex-1 min-h-[120px] p-3 rounded-[var(--r)] border-2 text-sm resize-none outline-none transition-colors"
                  style={{borderColor:'var(--border)',background:'var(--cream)',color:'var(--ink)',fontFamily:"'DM Mono',monospace",lineHeight:1.6}}
                  placeholder="Tulis template pesan..."/>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {TAGS.map(tag=>(
                    <button key={tag} onClick={()=>updateActiveTemplateText(currentTemplateText+' '+tag)}
                      className="text-[9px] font-bold px-2 py-1 rounded border-2 transition-colors hover:opacity-70"
                      style={{borderColor:'var(--border)',fontFamily:"'DM Mono',monospace",background:'transparent',color:'var(--muted)'}}>
                      {tag}
                    </button>
                  ))}
                </div>

                <div className="mt-3 p-3 rounded-[var(--r)] border-2" style={{borderColor:'var(--acid)',background:'var(--acid)20'}}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Sparkles size={11} style={{color:'var(--ink)'}}/>
                    <span className="text-[9px] font-bold uppercase tracking-wider">Spintax: </span>
                    <span className="text-[9px] font-[DM_Mono,monospace] font-bold" style={{background:'var(--ink)',color:'var(--acid)',padding:'0 4px',borderRadius:'3px'}}>{'{ Halo|Hai|Pagi }'}</span>
                  </div>
                </div>
              </BentoCard>
            </div>
          </div>

          {/* ─── ROW 2: Toolbar ────────────────────────────────────────────────── */}
          <BentoCard className="p-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={14} style={{color:'var(--muted)'}}/>
                <KiloInput value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Cari nama / nomor / resi..." className="pl-9"/>
              </div>
              <div className="flex flex-wrap gap-2 justify-end">
                <BrutalBtn variant="secondary" className="text-[10px]" onClick={()=>setShowBulkModal(true)}><FileSpreadsheet size={13}/> Bulk Import</BrutalBtn>
                <BrutalBtn variant="secondary" className="text-[10px]" disabled={!entries.filter(e=>e.status==='pending').length} onClick={()=>setShowPreviewModal(true)}><Search size={13}/> Preview</BrutalBtn>
                <BrutalBtn
                  variant={isBlasting ? 'danger' : 'primary'}
                  disabled={!entries.length}
                  className="text-[10px] min-w-[120px]"
                  onClick={isBlasting ? stopBlast : startBlast}>
                  {isBlasting ? <><Square size={13} fill="currentColor"/> Stop Blast</> : <><Play size={13} fill="currentColor"/> Start Engine</>}
                </BrutalBtn>
              </div>
            </div>
          </BentoCard>

          {/* ─── ROW 3: Warning ──────────────────────────────────────────────── */}
          {!isBlasting && entries.length>0 && (
            <div className="flex items-start gap-3 p-3 rounded-[var(--r)] border-2" style={{borderColor:'var(--orange)',background:'var(--orange)15'}}>
              <AlertCircle size={15} style={{color:'var(--orange)',flexShrink:0,marginTop:1}}/>
              <p className="text-[11px]" style={{fontFamily:"'DM Mono',monospace"}}>
                <strong>PENTING:</strong> Izinkan <strong>POPUP</strong> di browser sebelum memulai. Mesin akan membuka WhatsApp Web secara bergantian.
              </p>
            </div>
          )}

          {/* ─── ROW 4: Add Entry Form ─────────────────────────────────────────── */}
          <BentoCard className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Plus size={14} style={{color:'var(--orange)'}}/>
              <span className="text-[10px] font-bold uppercase tracking-[.18em]" style={{color:'var(--muted)'}}>Add to Queue</span>
            </div>
            <form onSubmit={handleAddEntry}>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
                <div className="lg:col-span-1"><KiloLabel>Phone *</KiloLabel><KiloInput value={formData.phone} onChange={e=>setFormData(p=>({...p,phone:e.target.value}))} placeholder="0812..."/></div>
                <div className="lg:col-span-2"><KiloLabel>Nama Penerima *</KiloLabel><KiloInput value={formData.recipientName} onChange={e=>setFormData(p=>({...p,recipientName:e.target.value}))} placeholder="Budi Santoso"/></div>
                <div className="lg:col-span-1"><KiloLabel>Nama Barang</KiloLabel><KiloInput value={formData.itemName} onChange={e=>setFormData(p=>({...p,itemName:e.target.value}))} placeholder="Sepatu..."/></div>
                <div className="lg:col-span-1"><KiloLabel>Resi</KiloLabel><KiloInput value={formData.receiptNumber} onChange={e=>setFormData(p=>({...p,receiptNumber:e.target.value}))} placeholder="JX123..."/></div>
                <div className="lg:col-span-1 hidden lg:block"><KiloLabel>COD</KiloLabel><KiloInput value={formData.cod} onChange={e=>setFormData(p=>({...p,cod:e.target.value.replace(/[^0-9.,]/g,'')}))} placeholder="150,000"/></div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                <div className="col-span-2 lg:col-span-3"><KiloLabel>Alamat</KiloLabel><KiloInput value={formData.address} onChange={e=>setFormData(p=>({...p,address:e.target.value}))} placeholder="Jl. Merdeka No. 1..."/></div>
                <div className="lg:hidden"><KiloLabel>COD</KiloLabel><KiloInput value={formData.cod} onChange={e=>setFormData(p=>({...p,cod:e.target.value.replace(/[^0-9.,]/g,'')}))} placeholder="150,000"/></div>
                <div className="lg:col-span-1"><KiloLabel>DFOD</KiloLabel><KiloInput value={formData.dfod} onChange={e=>setFormData(p=>({...p,dfod:e.target.value.replace(/[^0-9.,]/g,'')}))} placeholder="10,000"/></div>
                <div className="col-span-2 lg:col-span-2 flex items-end">
                  <BrutalBtn type="submit" variant="primary" className="w-full"><Plus size={14}/> Add to Queue</BrutalBtn>
                </div>
              </div>
            </form>
          </BentoCard>

          {/* ─── ROW 5: Console + Queue ────────────────────────────────────────── */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">

            {/* Console */}
            <div className="xl:col-span-3">
              <BentoCard className="p-4 h-full flex flex-col" style={{background:'var(--ink)', borderColor:'var(--border)'}}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{background: isBlasting ? 'var(--acid)' : 'var(--muted)', animation: isBlasting ? 'pulse-ring 2s infinite' : 'none'}}/>
                    <span className="text-[9px] font-bold uppercase tracking-[.2em]" style={{color:'var(--cream)', opacity:.5}}>SYS LOG</span>
                  </div>
                  <button onClick={()=>setLogs([])} className="text-[9px] font-bold uppercase tracking-wider hover:opacity-70" style={{color:'var(--muted)',fontFamily:"'DM Mono',monospace"}}>CLR</button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-0.5 min-h-[140px] xl:min-h-0" style={{fontFamily:"'DM Mono',monospace"}}>
                  {logs.length===0
                    ? <div className="text-[10px] italic" style={{color:'var(--muted)'}}>_ waiting...</div>
                    : logs.map(log=>(
                      <div key={log.id} className="flex gap-2 text-[10px] leading-relaxed">
                        <span style={{color:'var(--muted)',flexShrink:0}}>[{new Date(log.timestamp).toLocaleTimeString([],{hour12:false})}]</span>
                        <span style={{color: log.type==='success'?'var(--acid)':log.type==='error'?'#FF5555':log.type==='warning'?'var(--orange)':'#88BBFF'}}>{log.message}</span>
                      </div>
                    ))}
                </div>
              </BentoCard>
            </div>

            {/* Queue */}
            <div className="xl:col-span-9">
              <BentoCard className="overflow-hidden">
                <div className="px-5 py-4 border-b-2 flex items-center justify-between" style={{borderColor:'var(--border)'}}>
                  <div className="flex items-center gap-3">
                    <FileText size={14} style={{color:'var(--orange)'}}/>
                    <span className="text-[10px] font-bold uppercase tracking-[.18em]" style={{color:'var(--muted)'}}>Queue</span>
                    <span className="px-2 py-0.5 rounded-full border-2 text-[9px] font-black" style={{borderColor:'var(--border)'}}>{filteredEntries.length}</span>
                  </div>
                  {isConfirmingClear ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold uppercase" style={{color:'var(--muted)'}}>Yakin?</span>
                      <BrutalBtn variant="danger" className="text-[9px] py-1 px-2.5" onClick={clearAll}>Ya, Hapus</BrutalBtn>
                      <BrutalBtn variant="ghost" className="text-[9px] py-1 px-2.5" onClick={()=>setIsConfirmingClear(false)}>Batal</BrutalBtn>
                    </div>
                  ) : (
                    <BrutalBtn variant="ghost" className="w-8 h-8 p-0" onClick={()=>setIsConfirmingClear(true)}><Trash2 size={14}/></BrutalBtn>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b-2" style={{borderColor:'var(--border)'}}>
                        {['Penerima','Detail','Status','Diterima','Aksi'].map(h=>(
                          <th key={h} className="px-4 py-3 text-[9px] font-bold uppercase tracking-[.15em]" style={{color:'var(--muted)'}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence mode="popLayout">
                        {filteredEntries.length===0 ? (
                          <motion.tr initial={{opacity:0}} animate={{opacity:1}}>
                            <td colSpan={5} className="px-4 py-14 text-center text-sm italic" style={{color:'var(--muted)'}}>
                              — belum ada data —
                            </td>
                          </motion.tr>
                        ) : filteredEntries.map((entry, idx)=>{
                          const sc = STATUS_MAP[entry.status as keyof typeof STATUS_MAP] || STATUS_MAP.pending;
                          return (
                            <motion.tr key={entry.id} layout initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,x:-6}}
                              className="group border-b last:border-0 transition-colors"
                              style={{borderColor:'var(--border)20', background: isBlasting&&idx===currentIndex ? 'var(--acid)20' : 'transparent'}}>
                              <td className="px-4 py-3.5">
                                <div className="font-bold text-sm">{entry.recipientName}</div>
                                <div className="text-[10px] mt-0.5" style={{color:'var(--muted)',fontFamily:"'DM Mono',monospace"}}>{entry.phone}</div>
                              </td>
                              <td className="px-4 py-3.5 max-w-[200px]">
                                <div className="text-xs font-medium truncate">{entry.itemName||'—'}</div>
                                <div className="text-[10px] mt-0.5" style={{color:'var(--muted)',fontFamily:"'DM Mono',monospace"}}>RESI: {entry.receiptNumber||'—'}</div>
                                {entry.address && <div className="text-[9px] truncate" style={{color:'var(--muted)'}}>{entry.address}</div>}
                                <div className="flex gap-2 mt-0.5">
                                  {entry.cod  && <span className="text-[9px] font-bold" style={{color:'var(--orange)'}}>COD: Rp {formatCurrency(entry.cod)}</span>}
                                  {entry.dfod && <span className="text-[9px] font-bold" style={{color:'#2299FF'}}>DFOD: Rp {formatCurrency(entry.dfod)}</span>}
                                </div>
                              </td>
                              <td className="px-4 py-3.5">
                                <Pill color={sc.color as any}>{sc.icon} {sc.label}</Pill>
                              </td>
                              <td className="px-4 py-3.5">
                                <button onClick={()=>toggleReceived(entry.id)}
                                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border-2 text-[9px] font-bold uppercase tracking-wider transition-all"
                                  style={entry.isReceived ? {background:'var(--acid)',borderColor:'var(--acid)',color:'var(--ink)'} : {background:'transparent',borderColor:'var(--muted)',color:'var(--muted)'}}>
                                  {entry.isReceived ? <CheckCircle2 size={10}/> : <div className="w-2.5 h-2.5 rounded-full border border-current"/>}
                                  {entry.isReceived ? 'Diterima' : 'Belum'}
                                </button>
                              </td>
                              <td className="px-4 py-3.5">
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <BrutalBtn variant="ghost" className="w-8 h-8 p-0" onClick={()=>handleSendManual(entry)}><ExternalLink size={13}/></BrutalBtn>
                                  <BrutalBtn variant="ghost" className="w-8 h-8 p-0" onClick={()=>setEntries(p=>p.filter(e=>e.id!==entry.id))} style={{color:'red'}}><Trash2 size={13}/></BrutalBtn>
                                </div>
                              </td>
                            </motion.tr>
                          );
                        })}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              </BentoCard>
            </div>
          </div>
        </main>

        {/* ── BULK MODAL ──────────────────────────────────────────────────────── */}
        <AnimatePresence>
          {showBulkModal && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
              <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setShowBulkModal(false)} className="absolute inset-0" style={{background:'rgba(13,13,13,0.6)',backdropFilter:'blur(6px)'}}/>
              <motion.div initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} exit={{opacity:0,y:30}}
                className="relative w-full max-w-2xl max-h-[90vh] rounded-2xl border-2 overflow-hidden flex flex-col"
                style={{borderColor:'var(--border)',background:'var(--cream)'}}>
                <div className="px-6 py-5 border-b-2 flex items-center justify-between" style={{borderColor:'var(--border)'}}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-[var(--r)] border-2 flex items-center justify-center" style={{borderColor:'var(--border)',background:'var(--acid)'}}>
                      <FileSpreadsheet size={16} style={{color:'var(--ink)'}}/>
                    </div>
                    <div>
                      <h2 className="text-base font-black uppercase tracking-tight">Bulk Import</h2>
                      <p className="text-[10px]" style={{color:'var(--muted)',fontFamily:"'DM Mono',monospace"}}>Copy-paste dari Excel / CSV</p>
                    </div>
                  </div>
                  <BrutalBtn variant="ghost" className="w-9 h-9 p-0" onClick={()=>setShowBulkModal(false)}><X size={16}/></BrutalBtn>
                </div>
                <div className="p-6 overflow-y-auto flex-1 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-[var(--r)] border-2" style={{borderColor:'var(--acid)',background:'var(--acid)20'}}>
                      <div className="text-[9px] font-black uppercase tracking-widest mb-1.5" style={{color:'var(--ink)'}}>Step 1</div>
                      <p className="text-[10px] leading-relaxed" style={{fontFamily:"'DM Mono',monospace",color:'var(--muted)"}}>Kolom: No, Resi, Nama, HP, Alamat, Tanda, COD, DFOD, Barang</p>
                    </div>
                    <div className="p-4 rounded-[var(--r)] border-2" style={{borderColor:'var(--orange)',background:'var(--orange)15'}}>
                      <div className="text-[9px] font-black uppercase tracking-widest mb-1.5" style={{color:'var(--orange)'}}>Step 2</div>
                      <p className="text-[10px] leading-relaxed" style={{fontFamily:"'DM Mono',monospace",color:'var(--muted)"}}>Copy range dari Excel & Paste ke textarea di bawah</p>
                    </div>
                  </div>
                  <textarea value={bulkData} onChange={e=>setBulkData(e.target.value)}
                    placeholder={"1\tJX123456789\tBudi Santoso\t08123456789\tJl. Merdeka No. 1\tCOD\t150000\t0\tSepatu..."}
                    className="w-full h-52 p-4 rounded-[var(--r)] border-2 text-[11px] resize-none outline-none"
                    style={{borderColor:'var(--border)',background:'var(--card)',color:'var(--ink)',fontFamily:"'DM Mono',monospace",lineHeight:1.6}}/>
                  <div className="flex gap-3">
                    <BrutalBtn variant="secondary" className="flex-1" onClick={()=>setShowBulkModal(false)}>Batal</BrutalBtn>
                    <BrutalBtn variant="primary" className="flex-[2]" onClick={handleBulkImport}>Import Data</BrutalBtn>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ── PREVIEW MODAL ───────────────────────────────────────────────────── */}
        <AnimatePresence>
          {showPreviewModal && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
              <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setShowPreviewModal(false)} className="absolute inset-0" style={{background:'rgba(13,13,13,0.6)',backdropFilter:'blur(6px)'}}/>
              <motion.div initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} exit={{opacity:0,y:30}}
                className="relative w-full max-w-lg max-h-[90vh] rounded-2xl border-2 overflow-hidden flex flex-col"
                style={{borderColor:'var(--border)',background:'var(--cream)'}}>
                <div className="px-6 py-5 border-b-2 flex items-center justify-between" style={{borderColor:'var(--border)'}}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-[var(--r)] border-2 flex items-center justify-center" style={{borderColor:'var(--border)',background:'var(--ink)'}}>
                      <MessageSquare size={16} className="text-white"/>
                    </div>
                    <div>
                      <h2 className="text-base font-black uppercase tracking-tight">Preview Pesan</h2>
                      <p className="text-[10px]" style={{color:'var(--muted)',fontFamily:"'DM Mono',monospace"}}>First Pending Entry</p>
                    </div>
                  </div>
                  <BrutalBtn variant="ghost" className="w-9 h-9 p-0" onClick={()=>setShowPreviewModal(false)}><X size={16}/></BrutalBtn>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                  {entries.find(e=>e.status==='pending') ? (
                    <>
                      {(() => {
                        const entry = entries.find(e=>e.status==='pending')!;
                        const cnt = entries.filter(e=>e.status==='sent').length;
                        let tpl = activeTemplate.text;
                        if (settings.rotateTemplates) { const vars = activeTemplate.variations?.length?activeTemplate.variations:[activeTemplate.text]; tpl = vars[cnt%vars.length]; }
                        return (
                          <div className="rounded-[var(--r)] border-2 overflow-hidden" style={{borderColor:'var(--border)'}}>
                            <div className="px-4 py-3 border-b-2 flex items-center gap-3" style={{borderColor:'var(--border)',background:'var(--card)'}}>
                              <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center font-black text-sm" style={{borderColor:'var(--border)',background:'var(--orange)',color:'white'}}>
                                {entry.recipientName.charAt(0)}
                              </div>
                              <div>
                                <div className="text-sm font-bold">{entry.recipientName}</div>
                                <div className="text-[10px]" style={{color:'var(--muted)',fontFamily:"'DM Mono',monospace"}}>{entry.phone}</div>
                              </div>
                            </div>
                            <div className="p-4 text-sm whitespace-pre-wrap leading-relaxed" style={{fontFamily:"'DM Mono',monospace",color:'var(--ink)'}}>
                              {generateMessage(entry, tpl)}
                            </div>
                          </div>
                        );
                      })()}
                      <div className="flex gap-3">
                        <BrutalBtn variant="secondary" className="flex-1" onClick={()=>setShowPreviewModal(false)}>Tutup</BrutalBtn>
                        <BrutalBtn variant="primary" className="flex-1" onClick={()=>{
                          const entry=entries.find(e=>e.status==='pending');
                          if(entry){const cnt=entries.filter(e=>e.status==='sent').length;window.open(getWALink(entry,cnt),'WAsenderTab')?.focus();updateStatus(entry.id,'sent');setShowPreviewModal(false);}
                        }}><Send size={14}/> Send Now</BrutalBtn>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-12"><Clock size={32} style={{color:'var(--muted)',margin:'0 auto 12px'}}/><p className="text-sm italic" style={{color:'var(--muted)'}}>No pending entries.</p></div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ── SETTINGS MODAL ──────────────────────────────────────────────────── */}
        <AnimatePresence>
          {showSettingsModal && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
              <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setShowSettingsModal(false)} className="absolute inset-0" style={{background:'rgba(13,13,13,0.6)',backdropFilter:'blur(6px)'}}/>
              <motion.div initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} exit={{opacity:0,y:30}}
                className="relative w-full max-w-md max-h-[90vh] rounded-2xl border-2 overflow-hidden flex flex-col"
                style={{borderColor:'var(--border)',background:'var(--cream)'}}>
                <div className="px-6 py-5 border-b-2 flex items-center justify-between" style={{borderColor:'var(--border)'}}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-[var(--r)] border-2 flex items-center justify-center" style={{borderColor:'var(--border)',background:'var(--ink)'}}>
                      <Settings2 size={16} className="text-white"/>
                    </div>
                    <div>
                      <h2 className="text-base font-black uppercase tracking-tight">Settings</h2>
                      <p className="text-[10px]" style={{color:'var(--muted)',fontFamily:"'DM Mono',monospace"}}>Engine Configuration</p>
                    </div>
                  </div>
                  <BrutalBtn variant="ghost" className="w-9 h-9 p-0" onClick={()=>setShowSettingsModal(false)}><X size={16}/></BrutalBtn>
                </div>

                {/* Tabs */}
                <div className="flex px-6 border-b-2" style={{borderColor:'var(--border)'}}>
                  {(['general','antispam'] as const).map(tab=>(
                    <button key={tab} onClick={()=>setActiveSettingsTab(tab)}
                      className="relative py-3 mr-5 text-[10px] font-bold uppercase tracking-widest transition-colors"
                      style={{color: activeSettingsTab===tab ? 'var(--ink)' : 'var(--muted)'}}>
                      {tab}
                      {activeSettingsTab===tab && <motion.div layoutId="sTab" className="absolute bottom-0 left-0 right-0 h-0.5" style={{background:'var(--orange)'}}/>}
                    </button>
                  ))}
                </div>

                <div className="p-6 overflow-y-auto flex-1 space-y-4">
                  {/* Safety score */}
                  {activeSettingsTab==='antispam' && (
                    <div className="p-4 rounded-[var(--r)] border-2" style={{borderColor:safetyScore>80?'var(--acid)':safetyScore>50?'var(--orange)':'red'}}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-bold uppercase tracking-widest" style={{color:'var(--muted)'}}>Safety Score</span>
                        <span className="text-lg font-black" style={{color:safetyScore>80?'var(--acid)':safetyScore>50?'var(--orange)':'red'}}>{safetyScore}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full overflow-hidden" style={{background:'var(--card)'}}>
                        <motion.div className="h-full rounded-full" initial={{width:0}} animate={{width:`${safetyScore}%`}}
                          style={{background:safetyScore>80?'var(--acid)':safetyScore>50?'var(--orange)':'red'}}/>
                      </div>
                      <p className="text-[9px] mt-2 italic" style={{color:'var(--muted)',fontFamily:"'DM Mono',monospace"}}>
                        {safetyScore>80?'✓ Sangat aman.':safetyScore>50?'⚠ Cukup aman.':'✗ Beresiko tinggi!'}
                      </p>
                    </div>
                  )}

                  {activeSettingsTab==='general' ? (
                    <div className="space-y-4">
                      <div><KiloLabel>Nama Pengirim</KiloLabel><KiloInput value={settings.senderName} onChange={e=>setSettings(p=>({...p,senderName:e.target.value}))} placeholder="Admin JNT"/></div>

                      <div>
                        <KiloLabel>Kecepatan Blast</KiloLabel>
                        <div className="grid grid-cols-2 gap-2">
                          {[{id:'safe',l:'Main Aman',d:'15-30s',e:'🛡️'},{id:'normal',l:'Normal',d:'8-15s',e:'⚖️'},{id:'fast',l:'Percepat',d:'3-7s',e:'⚡'},{id:'turbo',l:'Turbo',d:'1-2s',e:'🚀'}].map(m=>(
                            <button key={m.id} onClick={()=>setSettings(p=>({...p,speedMode:m.id as any}))}
                              className="p-3 rounded-[var(--r)] border-2 text-left transition-all"
                              style={settings.speedMode===m.id?{borderColor:'var(--orange)',background:'var(--orange)15'}:{borderColor:'var(--border)',background:'var(--card)'}}>
                              <div className="text-lg mb-0.5">{m.e}</div>
                              <div className="text-[10px] font-bold">{m.l}</div>
                              <div className="text-[9px]" style={{color:'var(--muted)',fontFamily:"'DM Mono',monospace"}}>{m.d}</div>
                            </button>
                          ))}
                          <button onClick={()=>setSettings(p=>({...p,speedMode:'custom'}))}
                            className="col-span-2 p-3 rounded-[var(--r)] border-2 text-left transition-all"
                            style={settings.speedMode==='custom'?{borderColor:'var(--orange)',background:'var(--orange)15'}:{borderColor:'var(--border)',background:'var(--card)'}}>
                            <span className="text-[10px] font-bold">⚙️ Custom (Atur Manual)</span>
                          </button>
                        </div>
                      </div>

                      {settings.speedMode==='custom' && (
                        <div><KiloLabel>Delay (ms)</KiloLabel><KiloInput type="number" value={settings.delay} onChange={e=>setSettings(p=>({...p,delay:+e.target.value||1000}))} min="1000" step="500"/></div>
                      )}

                      <ToggleSwitch checked={settings.manualMode} onChange={()=>setSettings(p=>({...p,manualMode:!p.manualMode}))} label="Mode Manual" sub="Kirim hanya saat klik / tekan Spasi"/>
                      <ToggleSwitch checked={settings.autoRetry} onChange={()=>setSettings(p=>({...p,autoRetry:!p.autoRetry}))} label="Auto Retry" sub="Kirim ulang otomatis jika gagal"/>
                      {settings.autoRetry && <div><KiloLabel>Max Retries</KiloLabel><KiloInput type="number" value={settings.maxRetries} onChange={e=>setSettings(p=>({...p,maxRetries:+e.target.value||1}))} min="1" max="10"/></div>}

                      <BrutalBtn variant="secondary" className="w-full text-[10px]" onClick={()=>{
                        if(confirm('Kembalikan semua template ke default?')){setTemplates(DEFAULT_TEMPLATES);setActiveTemplateId(DEFAULT_TEMPLATES[0].id);setActiveVariationIndex(0);toast.success('Template dipulihkan');}
                      }}><RotateCcw size={13}/> Restore Default Templates</BrutalBtn>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <ToggleSwitch checked={settings.randomizeDelay} onChange={()=>setSettings(p=>({...p,randomizeDelay:!p.randomizeDelay}))} label="Randomize Delay" sub="Jeda acak, anti-deteksi bot"/>
                      {settings.randomizeDelay && <div><KiloLabel>Max Delay (ms)</KiloLabel><KiloInput type="number" value={settings.maxDelay} onChange={e=>setSettings(p=>({...p,maxDelay:+e.target.value||10000}))} step="500"/></div>}

                      <div className="grid grid-cols-2 gap-3">
                        {[{k:'batchSize',l:'Batch Size',d:'Istirahat tiap X',ph:'10'},{k:'batchPause',l:'Pause (ms)',d:'Lama istirahat',ph:'30000'},{k:'hourlyLimit',l:'Hourly Limit',d:'Max/jam',ph:'50'},{k:'stopOnConsecutiveErrors',l:'Stop on Errors',d:'Stop jika X gagal',ph:'3'},{k:'longBreakAfter',l:'Long Break After',d:'Break tiap X pesan',ph:'25'},{k:'longBreakDuration',l:'Duration (min)',d:'Lama break',ph:'10'}].map(f=>(
                          <div key={f.k}>
                            <KiloLabel>{f.l}</KiloLabel>
                            <KiloInput type="number" value={settings[f.k as keyof AppSettings] as number} onChange={e=>setSettings(p=>({...p,[f.k]:+e.target.value||0}))} placeholder={f.ph} className="text-xs"/>
                            <p className="text-[8px] mt-0.5" style={{color:'var(--muted)',fontFamily:"'DM Mono',monospace"}}>{f.d}</p>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 space-y-0.5">
                        {[{k:'shuffleQueue',l:'Shuffle Queue',d:'Acak urutan antrean'},{k:'useRandomGreetings',l:'Random Greetings',d:'Variasi kata sapaan'},{k:'addRandomSuffix',l:'Random Suffix',d:'Tambah Ref ID unik'},{k:'useInvisibleChars',l:'Invisible Chars',d:'Sisipkan ZWSP'},{k:'simulateTyping',l:'Simulate Typing',d:'Jeda sesuai panjang pesan'},{k:'adaptiveDelay',l:'Adaptive Delay',d:'Delay makin lama seiring waktu'},{k:'randomizeFormatting',l:'Random Formatting',d:'Variasi spasi/newline'},{k:'rotateTemplates',l:'Template Rotation',d:'Bergantian pakai variasi'},{k:'randomizeEmojis',l:'Randomize Emojis',d:'Emoji acak di pesan'},{k:'useGlobalSpintax',l:'Global Spintax',d:'Parser {a|b|c}'},{k:'autoSend',l:'Auto Send Mode',d:'Kirim via Chrome Extension'}].map(item=>(
                          <ToggleSwitch key={item.k} checked={!!settings[item.k as keyof AppSettings]} onChange={()=>setSettings(p=>({...p,[item.k]:!p[item.k as keyof AppSettings]}))} label={item.l} sub={item.d}/>
                        ))}
                      </div>

                      {settings.autoSend && (
                        <div className="p-4 rounded-[var(--r)] border-2 space-y-3" style={{borderColor:'var(--orange)',background:'var(--orange)10'}}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2"><Puzzle size={13} style={{color:'var(--orange)'}}/><span className="text-[10px] font-bold uppercase tracking-wider" style={{color:'var(--orange)'}}>Chrome Extension</span></div>
                            <Pill color={isExtensionDetected?'acid':'muted'}>{isExtensionDetected?'Connected':'Not Found'}</Pill>
                          </div>
                          <p className="text-[10px] leading-relaxed" style={{color:'var(--muted)',fontFamily:"'DM Mono',monospace"}}>Dibutuhkan extension khusus untuk auto-klik di WhatsApp Web.</p>
                          <BrutalBtn variant="primary" className="w-full text-[10px]" onClick={downloadExtensionZip}><Download size={13}/> Download Extension (.zip)</BrutalBtn>
                          <ol className="text-[9px] space-y-1.5 list-decimal ml-4 leading-relaxed" style={{color:'var(--muted)',fontFamily:"'DM Mono',monospace"}}>
                            <li>Klik tombol Download di atas.</li>
                            <li>Ekstrak <code style={{background:'var(--orange)20',padding:'0 3px',borderRadius:'2px'}}>wasender-pro-helper.zip</code></li>
                            <li>Buka <code style={{background:'var(--orange)20',padding:'0 3px',borderRadius:'2px'}}>chrome://extensions</code></li>
                            <li>Aktifkan <strong>Developer Mode</strong>.</li>
                            <li>Klik <strong>Load Unpacked</strong> → pilih folder.</li>
                          </ol>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-5 border-t-2" style={{borderColor:'var(--border)'}}>
                  <BrutalBtn variant="primary" className="w-full" onClick={()=>setShowSettingsModal(false)}>Simpan Konfigurasi</BrutalBtn>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <footer className="max-w-screen-2xl mx-auto px-6 py-8 border-t-2 text-center" style={{borderColor:'var(--border)'}}>
          <span className="text-[9px] font-bold uppercase tracking-[.3em]" style={{color:'var(--muted)',fontFamily:"'DM Mono',monospace"}}>
            WAsender PRO Engine · v2.0.0 · Enterprise Edition
          </span>
        </footer>
      </div>
    </>
  );
}
