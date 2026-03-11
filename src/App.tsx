import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, Send, Trash2, Play, Square, MessageSquare,
  FileText, CheckCircle2, Clock, AlertCircle, Settings2,
  Download, FileSpreadsheet, X, Search, Sparkles, BarChart3,
  History, Timer, ExternalLink, Moon, Sun, RotateCcw, Shield,
  Puzzle, Loader2, Zap, ChevronDown, ChevronRight, ArrowRight,
  Activity, Package, Hash, Phone, MapPin, Banknote, RefreshCw
} from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { BlastEntry, LogEntry, MessageTemplate, DEFAULT_TEMPLATES, AppSettings, DEFAULT_SETTINGS } from './types';
import { downloadExtensionZip } from './utils/extensionDownloader';

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

const formatCurrency = (val: string) => {
  if (!val) return '';
  const num = parseInt(val.replace(/\D/g, ''));
  return isNaN(num) ? val : new Intl.NumberFormat('id-ID').format(num);
};

// ─── Status badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: BlastEntry['status'] }) => {
  const map = {
    sent:    { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', icon: <CheckCircle2 size={10}/>, label: 'Sent' },
    sending: { bg: 'bg-sky-500/10',     text: 'text-sky-400',     border: 'border-sky-500/20',     icon: <Loader2 size={10} className="animate-spin"/>, label: 'Sending' },
    failed:  { bg: 'bg-red-500/10',     text: 'text-red-400',     border: 'border-red-500/20',     icon: <AlertCircle size={10}/>, label: 'Failed' },
    pending: { bg: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-amber-500/20',   icon: <Clock size={10}/>, label: 'Pending' },
  };
  const s = map[status];
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border', s.bg, s.text, s.border)}>
      {s.icon}{s.label}
    </span>
  );
};

// ─── Toggle ───────────────────────────────────────────────────────────────────
const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
  <button onClick={onChange}
    className={cn('relative w-9 h-5 rounded-full transition-all duration-200 focus:outline-none shrink-0', checked ? 'bg-violet-500' : 'bg-white/10')}
  >
    <span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200', checked ? 'left-[18px]' : 'left-0.5')} />
  </button>
);

// ─── Kbd hint ─────────────────────────────────────────────────────────────────
const Kbd = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/10 text-[10px] font-mono text-white/40">{children}</span>
);

// ─── Section header ───────────────────────────────────────────────────────────
const SH = ({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) => (
  <div className="flex items-center justify-between mb-4">
    <h2 className="text-[11px] font-semibold text-white/35 uppercase tracking-[0.12em]">{children}</h2>
    {action}
  </div>
);

// ─── Input ────────────────────────────────────────────────────────────────────
const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { label?: string }>(
  ({ label, className, ...props }, ref) => (
    <div className="space-y-1.5">
      {label && <label className="block text-[10px] font-medium text-white/35 uppercase tracking-wider">{label}</label>}
      <input ref={ref} {...props}
        className={cn('w-full px-3 py-2 bg-[#161618] border border-white/[0.08] rounded-lg text-[13px] text-white placeholder:text-white/20 outline-none transition-all focus:border-violet-500/50 focus:bg-[#1a1a1e]', className)}
      />
    </div>
  )
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
  const [nextActionTime, setNextActionTime] = useState(0);
  const [activePanel, setActivePanel] = useState<'queue' | 'template' | 'logs'>('queue');
  const [formData, setFormData] = useState({ phone: '', recipientName: '', itemName: '', receiptNumber: '', address: '', cod: '', dfod: '' });

  // ─── Persist ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const se = localStorage.getItem('wa_blast_entries');
    const st = localStorage.getItem('wa_blast_templates');
    const si = localStorage.getItem('wa_blast_active_template_id');
    const ss = localStorage.getItem('wa_blast_settings');
    if (se) setEntries(JSON.parse(se));
    if (st) { const p: MessageTemplate[] = JSON.parse(st); const m = [...p]; DEFAULT_TEMPLATES.forEach(d => { if (!m.find(t => t.id === d.id)) m.push(d); }); setTemplates(m); }
    if (si) setActiveTemplateId(si);
    if (ss) setSettings(JSON.parse(ss));
  }, []);

  useEffect(() => localStorage.setItem('wa_blast_entries', JSON.stringify(entries)), [entries]);
  useEffect(() => localStorage.setItem('wa_blast_templates', JSON.stringify(templates)), [templates]);
  useEffect(() => localStorage.setItem('wa_blast_active_template_id', activeTemplateId), [activeTemplateId]);
  useEffect(() => localStorage.setItem('wa_blast_settings', JSON.stringify(settings)), [settings]);

  const handleResetDefault = () => {
    if (window.confirm('Reset semua data ke pengaturan awal?')) { localStorage.clear(); window.location.reload(); }
  };

  const activeTemplate = templates.find(t => t.id === activeTemplateId) || templates[0];
  const currentTemplateText = activeTemplate.variations?.[activeVariationIndex] || activeTemplate.text;

  const updateActiveTemplateText = (text: string) => {
    setTemplates(prev => prev.map(t => {
      if (t.id !== activeTemplateId) return t;
      const v = t.variations || [t.text, t.text, t.text];
      const nv = [...v]; nv[activeVariationIndex] = text;
      return { ...t, text: activeVariationIndex === 0 ? text : t.text, variations: nv };
    }));
  };

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.phone || !formData.recipientName) { toast.error('Nomor HP dan Nama Penerima wajib diisi'); return; }
    const newEntry: BlastEntry = { id: crypto.randomUUID(), ...formData, status: 'pending', isReceived: false, createdAt: Date.now() };
    setEntries(prev => [newEntry, ...prev]);
    setFormData({ phone: '', recipientName: '', itemName: '', receiptNumber: '', address: '', cod: '', dfod: '' });
    addLog(`Ditambahkan: ${newEntry.recipientName} (${newEntry.phone})`, 'info');
    toast.success('Data ditambahkan ke antrean');
  };

  const handleBulkImport = () => {
    if (!bulkData.trim()) { toast.error('Data kosong'); return; }
    const lines = bulkData.trim().split(/\r?\n/);
    const newEntries: BlastEntry[] = []; let n = 0;
    lines.forEach(line => {
      const d = line.includes('\t') ? '\t' : ',';
      const c = line.split(d).map(x => x.trim());
      if (c.length >= 4) {
        if (c[0].toLowerCase() === 'no' || (c[1] || '').toLowerCase().includes('resi')) return;
        const tanda = (c[5] || '').toUpperCase();
        let cod = '', dfod = '';
        if (tanda === 'COD') { const v = (c[6] || '').replace(/[^0-9]/g, ''); if (v) cod = v; }
        else if (tanda === 'DFOD') { const v = (c[7] || '').replace(/[^0-9]/g, ''); if (v) dfod = v; }
        newEntries.push({ id: crypto.randomUUID(), receiptNumber: c[1]||'', recipientName: c[2]||'', phone: c[3]||'', address: c[4]||'', itemName: c[8]||'', cod, dfod, status: 'pending', isReceived: false, createdAt: Date.now() });
        n++;
      }
    });
    if (n > 0) { setEntries(prev => [...newEntries, ...prev]); setBulkData(''); setShowBulkModal(false); addLog(`Bulk import: ${n} data`, 'success'); toast.success(`${n} data berhasil diimpor`); setActivePanel('queue'); }
    else toast.error('Format tidak valid.');
  };

  const clearAll = () => { setEntries([]); setIsConfirmingClear(false); addLog('Antrean dikosongkan', 'warning'); };

  const getGreeting = () => {
    const h = new Date().getHours();
    const base = h >= 5 && h < 11 ? 'Pagi' : h >= 11 && h < 15 ? 'Siang' : h >= 15 && h < 18 ? 'Sore' : 'Malam';
    if (settings.useRandomGreetings) { const v = [`Selamat ${base}`, `${base} Kak`, `Halo, Selamat ${base}`, `Halo Kak`, `Permisi`, `Halo`, base]; return v[Math.floor(Math.random() * v.length)]; }
    return `Selamat ${base}`;
  };

  const generateMessage = (entry: BlastEntry, tmpl?: string) => {
    let t = tmpl || activeTemplate.text;
    if (!entry.cod) t = t.replace(/{if_cod}[\s\S]*?{\/if_cod}/gi, ''); else t = t.replace(/{if_cod}/gi, '').replace(/{\/if_cod}/gi, '');
    if (!entry.dfod) t = t.replace(/{if_dfod}[\s\S]*?{\/if_dfod}/gi, ''); else t = t.replace(/{if_dfod}/gi, '').replace(/{\/if_dfod}/gi, '');
    let msg = t.replace(/{salam}/gi, getGreeting()).replace(/{pengirim}/gi, settings.senderName || 'Admin').replace(/{nama}/gi, entry.recipientName).replace(/{barang}/gi, entry.itemName || '-').replace(/{resi}/gi, entry.receiptNumber || '-').replace(/{alamat}/gi, entry.address || '-').replace(/{cod}/gi, entry.cod ? `Rp ${formatCurrency(entry.cod)}` : '-').replace(/{dfod}/gi, entry.dfod ? `Rp ${formatCurrency(entry.dfod)}` : '-');
    if (settings.useGlobalSpintax) msg = msg.replace(/{([^{}]+)}/g, (m, p1) => p1.includes('|') ? p1.split('|')[Math.floor(Math.random() * p1.split('|').length)] : m);
    if (settings.randomizeEmojis) { const em = ['😊','🙏','📦','🚚','✨','✅','📍']; msg = msg.split(' ').map(w => Math.random() > 0.9 ? w + ' ' + em[Math.floor(Math.random() * em.length)] : w).join(' '); }
    if (settings.addRandomSuffix) msg += `\n\n_Ref: ${Math.random().toString(36).substring(7).toUpperCase()}_`;
    if (settings.useInvisibleChars) msg = msg.split(' ').map(w => Math.random() > 0.7 ? w + '\u200B' : w).join(' ');
    if (settings.randomizeFormatting) { const ps = msg.split('\n\n'); msg = ps.map((p, i) => { if (i === ps.length - 1) return p; const r = Math.random(); return r > 0.8 ? p + '\n\n\n' : r > 0.6 ? p + '\n' : p + '\n\n'; }).join(''); }
    return msg;
  };

  const getWALink = (entry: BlastEntry, countOverride?: number) => {
    let phone = entry.phone.replace(/\D/g, '');
    if (phone.startsWith('0')) phone = '62' + phone.slice(1);
    if (!phone.startsWith('62')) phone = '62' + phone;
    let tmpl = activeTemplate.text;
    if (settings.rotateTemplates) { const cnt = countOverride ?? entries.filter(e => e.status === 'sent').length; const vs = activeTemplate.variations?.length ? activeTemplate.variations : [activeTemplate.text]; tmpl = vs[cnt % vs.length]; }
    let link = `https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(generateMessage(entry, tmpl))}`;
    if (settings.autoSend) link += '&autosend=true';
    return link + `&entryid=${entry.id}`;
  };

  const handleSendManual = (entry: BlastEntry) => { const w = window.open(getWALink(entry), 'WAsenderTab'); if (w) window.focus(); addLog(`Manual: ${entry.recipientName}`, 'info'); updateStatus(entry.id, 'sent'); };

  const addLog = (message: string, type: LogEntry['type'] = 'info') =>
    setLogs(prev => [{ id: crypto.randomUUID(), timestamp: Date.now(), message, type }, ...prev].slice(0, 100));

  const updateStatus = (id: string, status: BlastEntry['status']) =>
    setEntries(prev => prev.map(e => e.id === id ? { ...e, status } : e));

  const toggleReceived = (id: string) =>
    setEntries(prev => prev.map(e => e.id === id ? { ...e, isReceived: !e.isReceived } : e));

  const calcDelay = (sentCount: number, entry: BlastEntry) => {
    let min = settings.delay, max = settings.maxDelay, useTyping = settings.simulateTyping, useAdaptive = settings.adaptiveDelay;
    if (settings.speedMode === 'safe') { min = 15000; max = 30000; useTyping = true; useAdaptive = true; }
    else if (settings.speedMode === 'normal') { min = 8000; max = 15000; useTyping = true; useAdaptive = true; }
    else if (settings.speedMode === 'fast') { min = 3000; max = 7000; }
    else if (settings.speedMode === 'turbo') { min = 1000; max = 2000; }
    let delay = settings.randomizeDelay || settings.speedMode !== 'custom' ? Math.floor(Math.random() * (max - min + 1)) + min : min;
    if (useAdaptive) delay += Math.floor(sentCount / 10) * 500;
    if (useTyping) { let t = activeTemplate.text; if (settings.rotateTemplates) { const vs = activeTemplate.variations?.length ? activeTemplate.variations : [activeTemplate.text]; t = vs[sentCount % vs.length]; } delay += Math.min(generateMessage(entry, t).length * 50, 5000); }
    if (settings.batchSize > 0 && sentCount >= nextBatchPauseAt && nextBatchPauseAt > 0) { delay = settings.batchPause; toast('Anti-Spam: Istirahat sejenak...', { icon: '🛡️' }); setNextBatchPauseAt(sentCount + settings.batchSize + (Math.floor(Math.random() * 5) - 2)); }
    if (settings.longBreakAfter > 0 && sentCount > 0 && sentCount % settings.longBreakAfter === 0) { delay = settings.longBreakDuration * 60000; setIsLongBreak(true); addLog(`Long break: ${settings.longBreakDuration} menit`, 'warning'); } else setIsLongBreak(false);
    return delay;
  };

  const startBlast = () => {
    if (!isExtensionDetected && !settings.manualMode) { toast.error('Extension tidak terdeteksi!', { icon: '🔌' }); return; }
    const pending = entries.filter(e => e.status === 'pending');
    if (!pending.length) { toast.error('Tidak ada pesan pending'); return; }
    let toProcess = [...pending];
    if (settings.shuffleQueue) { toProcess = toProcess.sort(() => Math.random() - 0.5); setEntries(prev => [...prev.filter(e => e.status !== 'pending'), ...toProcess]); }
    const first = toProcess[0];
    addLog('Blast dimulai', 'info');
    const w = window.open(getWALink(first), 'WAsenderTab');
    if (!w) { toast.error('Popup diblokir! Izinkan popup di browser.', { duration: 8000 }); return; }
    window.focus();
    if (settings.autoSend) updateStatus(first.id, 'sending');
    else { updateStatus(first.id, 'sent'); setNextActionTime(Date.now() + calcDelay(entries.filter(e => e.status === 'sent').length + 1, toProcess[1] || first)); }
    setIsBlasting(true); setCurrentIndex(0);
    if (settings.batchSize > 0) setNextBatchPauseAt(entries.filter(e => e.status === 'sent').length + settings.batchSize + (Math.floor(Math.random() * 5) - 2));
  };

  const stopBlast = () => { setIsBlasting(false); setCurrentIndex(-1); setNextActionTime(0); addLog('Blast dihentikan', 'warning'); };

  useEffect(() => {
    if (!isBlasting || !settings.manualMode) return;
    // keydown handles manual mode
  }, [isBlasting, settings.manualMode]);

  useEffect(() => {
    if (!isBlasting || settings.manualMode) return;
    const sending = entries.find(e => e.status === 'sending');
    if (!sending) return;
    const timeout = settings.speedMode === 'turbo' ? 5000 : settings.speedMode === 'fast' ? 10000 : settings.speedMode === 'normal' ? 15000 : 25000;
    const t = setTimeout(() => {
      addLog(`Auto-next: ${sending.recipientName}`, 'info');
      updateStatus(sending.id, 'sent');
      const sc = entries.filter(e => e.status === 'sent').length + 1;
      const pend = entries.filter(e => e.status === 'pending' && e.id !== sending.id);
      if (pend.length) setNextActionTime(Date.now() + calcDelay(sc, pend[0]));
    }, timeout);
    return () => clearTimeout(t);
  }, [entries, isBlasting, settings.manualMode, settings.speedMode]);

  useEffect(() => {
    const h = (ev: MessageEvent) => {
      if (!ev.data || ev.data.source !== 'wasender-extension') return;
      const { type, entryId, status: waStatus } = ev.data;
      if (type === 'WA_STATUS_UPDATE') {
        setEntries(cur => {
          const entry = cur.find(e => e.id === entryId); if (!entry || entry.status === 'sent') return cur;
          if (waStatus === 'sent') {
            setConsecutiveErrors(0); setSentThisHour(p => p + 1);
            addLog(`✓ Terkirim: ${entry.recipientName}`, 'success');
            const sc = cur.filter(e => e.status === 'sent').length + 1;
            const pend = cur.filter(e => e.status === 'pending' && e.id !== entryId);
            if (pend.length) setNextActionTime(Date.now() + calcDelay(sc, pend[0]));
            return cur.map(e => e.id === entryId ? { ...e, status: 'sent' } : e);
          } else if (waStatus === 'invalid') {
            const retries = entry.retryCount || 0;
            if (settings.autoRetry && retries < settings.maxRetries) { addLog(`Retry ${retries + 1}/${settings.maxRetries}: ${entry.recipientName}`, 'warning'); return cur.map(e => e.id === entryId ? { ...e, status: 'pending', retryCount: retries + 1 } : e); }
            setConsecutiveErrors(p => p + 1); addLog(`✗ Invalid: ${entry.recipientName}`, 'error');
            return cur.map(e => e.id === entryId ? { ...e, status: 'failed' } : e);
          }
          return cur;
        });
      } else if (type === 'WA_WARNING_DETECTED') { stopBlast(); addLog('SPAM WARNING terdeteksi!', 'error'); toast.error('PERINGATAN SPAM!', { duration: 10000 }); }
    };
    window.addEventListener('message', h);
    const hb = setInterval(() => { if (lastHeartbeat > 0 && Date.now() - lastHeartbeat > 20000 && isExtensionDetected) { setIsExtensionDetected(false); addLog('Extension terputus', 'warning'); } }, 5000);
    return () => { window.removeEventListener('message', h); clearInterval(hb); };
  }, [lastHeartbeat, isExtensionDetected, settings.autoRetry, settings.maxRetries, settings.speedMode]);

  useEffect(() => {
    const ping = (ev: MessageEvent) => { if (ev.data?.source === 'wasender-extension' && ev.data?.type === 'EXTENSION_PONG') { if (!isExtensionDetected) { setIsExtensionDetected(true); addLog('Extension terhubung', 'success'); } setLastHeartbeat(Date.now()); } };
    window.addEventListener('message', ping);
    const chk = () => { if (document.documentElement.getAttribute('data-wasender-extension') === 'active') { if (!isExtensionDetected) { setIsExtensionDetected(true); addLog('Extension aktif', 'success'); } setLastHeartbeat(Date.now()); } window.postMessage({ type: 'EXTENSION_PING' }, '*'); };
    const iv = setInterval(chk, 2000); chk();
    return () => { window.removeEventListener('message', ping); clearInterval(iv); };
  }, [isExtensionDetected]);

  useEffect(() => {
    if (!isBlasting || settings.manualMode) { setCountdown(0); return; }
    const tick = () => {
      const now = Date.now();
      if (now - lastHourReset > 3600000) { setSentThisHour(0); setLastHourReset(now); }
      if (sentThisHour >= settings.hourlyLimit) { setIsBlasting(false); addLog('Hourly limit tercapai', 'warning'); return; }
      const pend = entries.filter(e => e.status === 'pending'), sending = entries.filter(e => e.status === 'sending');
      if (sending.length) { setCountdown(0); return; }
      if (pend.length) {
        const entry = pend[0];
        if (now >= nextActionTime) {
          addLog(`Mengirim ke ${entry.recipientName}...`, 'info');
          const w = window.open(getWALink(entry, entries.filter(e => e.status === 'sent').length), 'WAsenderTab');
          if (!w) { addLog('Popup diblokir', 'warning'); setNextActionTime(Date.now() + 3000); return; }
          window.focus();
          if (settings.autoSend) updateStatus(entry.id, 'sending');
          else { updateStatus(entry.id, 'sent'); setNextActionTime(Date.now() + calcDelay(entries.filter(e => e.status === 'sent').length + 1, pend[1] || entry)); }
        } else setCountdown(Math.max(0, Math.ceil((nextActionTime - now) / 1000)));
      } else { setIsBlasting(false); addLog('Blast selesai! 🎉', 'success'); }
    };
    tick(); const iv = setInterval(tick, 1000); return () => clearInterval(iv);
  }, [isBlasting, entries, nextActionTime, settings.manualMode, settings.hourlyLimit, sentThisHour, lastHourReset]);

  useEffect(() => {
    const kd = (e: KeyboardEvent) => { if (isBlasting && settings.manualMode && (e.code === 'Space' || e.code === 'Enter')) { e.preventDefault(); const pend = entries.filter(en => en.status === 'pending'); if (pend.length) { const entry = pend[0]; window.open(getWALink(entry), 'WAsenderTab'); updateStatus(entry.id, 'sent'); } } };
    window.addEventListener('keydown', kd); return () => window.removeEventListener('keydown', kd);
  }, [isBlasting, settings.manualMode, entries]);

  const filteredEntries = useMemo(() =>
    entries.filter(e => e.recipientName.toLowerCase().includes(searchQuery.toLowerCase()) || e.phone.includes(searchQuery) || e.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase())),
    [entries, searchQuery]
  );

  const stats = useMemo(() => ({
    total:   entries.length,
    sent:    entries.filter(e => e.status === 'sent').length,
    pending: entries.filter(e => e.status === 'pending').length,
    failed:  entries.filter(e => e.status === 'failed').length,
    received: entries.filter(e => e.isReceived).length,
  }), [entries]);

  const safetyScore = useMemo(() => {
    let s = 0;
    if (settings.delay >= 5000) s += 20; if (settings.randomizeDelay) s += 15;
    if (settings.batchSize > 0 && settings.batchSize <= 15) s += 10;
    if (settings.useRandomGreetings) s += 5; if (settings.useInvisibleChars) s += 5;
    if (settings.simulateTyping) s += 10; if (settings.adaptiveDelay) s += 5;
    if (settings.rotateTemplates) s += 10; if (settings.hourlyLimit <= 50) s += 10; if (settings.shuffleQueue) s += 10;
    return Math.min(100, s);
  }, [settings]);

  const exportToCSV = () => {
    if (!entries.length) return;
    const h = ['Phone', 'Name', 'Item', 'Receipt', 'Status', 'Received', 'Created'];
    const r = entries.map(e => [e.phone, e.recipientName, e.itemName, e.receiptNumber, e.status, e.isReceived ? 'YES' : 'NO', new Date(e.createdAt).toLocaleString()]);
    const csv = [h, ...r].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `wasender_${new Date().toISOString().split('T')[0]}.csv`; a.click();
    toast.success('CSV diunduh');
  };

  const sentCount = stats.sent;
  const pendingCount = stats.pending;
  const progress = stats.total ? (sentCount / stats.total) * 100 : 0;

  // ─── MODAL WRAPPER ─────────────────────────────────────────────────────────
  const Modal = ({ onClose, children, size = 'md' }: { onClose: () => void; children: React.ReactNode; size?: 'sm' | 'md' | 'lg' }) => {
    const w = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl' }[size];
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/75 backdrop-blur-xl" />
        <motion.div initial={{ opacity: 0, scale: 0.97, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 8 }} transition={{ duration: 0.15 }}
          className={cn('relative w-full max-h-[92vh] rounded-2xl border border-white/[0.08] bg-[#111113] flex flex-col shadow-[0_24px_64px_rgba(0,0,0,0.6)]', w)}>
          {children}
        </motion.div>
      </div>
    );
  };

  const ModalHeader = ({ title, subtitle, icon: Icon, onClose }: { title: string; subtitle?: string; icon: React.ElementType; onClose: () => void }) => (
    <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center"><Icon size={15} className="text-white/60" /></div>
        <div><p className="text-[14px] font-semibold text-white">{title}</p>{subtitle && <p className="text-[11px] text-white/35 mt-0.5">{subtitle}</p>}</div>
      </div>
      <button onClick={onClose} className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-all"><X size={15} /></button>
    </div>
  );

  return (
    <div className="h-screen bg-[#0e0e10] text-white flex flex-col overflow-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        body { font-family: 'Inter', -apple-system, sans-serif; }
        .mono { font-family: 'SF Mono', 'Fira Code', monospace; }
        input[type=range] { -webkit-appearance: none; background: transparent; cursor: pointer; }
        input[type=range]::-webkit-slider-runnable-track { height: 3px; border-radius: 99px; background: rgba(255,255,255,0.08); }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 13px; height: 13px; border-radius: 50%; background: #8b5cf6; margin-top: -5px; box-shadow: 0 0 0 2px rgba(139,92,246,0.3); }
        ::-webkit-scrollbar { width: 3px; height: 3px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 99px; }
        ::-webkit-scrollbar-track { background: transparent; }
        textarea:focus, input:focus { outline: none; }
      `}</style>

      <Toaster position="top-right" toastOptions={{
        style: { background: '#1c1c1e', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', fontSize: '13px', padding: '10px 14px' },
        success: { iconTheme: { primary: '#10b981', secondary: '#0e0e10' } },
        error: { iconTheme: { primary: '#f87171', secondary: '#0e0e10' } },
      }} />

      {/* ── BLAST OVERLAY ─────────────────────────────────────────────────── */}
      {isBlasting && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-2xl" />
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', damping: 28 }}
            className="relative w-full max-w-sm rounded-2xl border border-white/[0.09] bg-[#111113] shadow-[0_32px_80px_rgba(0,0,0,0.7)] m-4 overflow-hidden">
            
            {/* Progress bar top */}
            <div className="h-[2px] bg-white/[0.05]">
              <motion.div className="h-full bg-violet-500" animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
            </div>

            <div className="p-6 space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={cn('w-2 h-2 rounded-full', isLongBreak ? 'bg-amber-400' : 'bg-violet-400 animate-pulse')} />
                  <span className="text-[13px] font-semibold text-white/85">
                    {isLongBreak ? 'Long Break' : entries.some(e => e.status === 'sending') ? 'Menunggu WhatsApp...' : 'Blast Berjalan'}
                  </span>
                </div>
                <span className="text-[11px] text-white/35 mono">{sentCount}/{entries.length}</span>
              </div>

              {/* Countdown */}
              {!settings.manualMode ? (
                <div className="text-center py-3">
                  <div className={cn('text-5xl font-bold mono tabular-nums tracking-tight', isLongBreak ? 'text-amber-400' : entries.some(e => e.status === 'sending') ? 'text-sky-400' : 'text-violet-400')}>
                    {entries.some(e => e.status === 'sending') ? '–:––' : `${String(Math.floor(countdown / 60)).padStart(2, '0')}:${String(countdown % 60).padStart(2, '0')}`}
                  </div>
                  <p className="text-[10px] text-white/25 uppercase tracking-widest mt-2">
                    {entries.some(e => e.status === 'sending') ? 'Processing in WA Web' : isLongBreak ? 'Break ends in' : 'Next message in'}
                  </p>
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="text-[11px] text-white/35 mb-1">Mode Manual Aktif</div>
                  <div className="flex items-center justify-center gap-2">
                    <Kbd>Space</Kbd><span className="text-white/20 text-[11px]">atau</span><Kbd>Enter</Kbd>
                    <span className="text-[11px] text-white/35">untuk lanjut</span>
                  </div>
                </div>
              )}

              {/* Warning */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-400/[0.07] border border-amber-400/[0.14]">
                <AlertCircle size={12} className="text-amber-400 shrink-0" />
                <p className="text-[10px] text-amber-300/70">Tekan <strong>Enter</strong> di tab WhatsApp Web untuk kirim</p>
              </div>

              {/* Popup fallback */}
              {Date.now() >= nextActionTime && pendingCount > 0 && !entries.some(e => e.status === 'sending') && (
                <button onClick={() => {
                  const pend = entries.filter(e => e.status === 'pending');
                  if (pend.length) { const entry = pend[0]; const sc = sentCount; const w = window.open(getWALink(entry, sc), 'WAsenderTab'); if (w) { window.focus(); if (settings.autoSend) updateStatus(entry.id, 'sending'); else { updateStatus(entry.id, 'sent'); setNextActionTime(Date.now() + calcDelay(sc + 1, entries.filter(e => e.status === 'pending')[1] || entry)); } } }
                }}
                  className="w-full py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] text-[12px] font-medium text-white/60 hover:text-white/85 hover:bg-white/[0.07] transition-all">
                  Tab tidak terbuka? Klik di sini
                </button>
              )}

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2">
                {entries.some(e => e.status === 'sending') && (
                  <button onClick={() => { const s = entries.find(e => e.status === 'sending'); if (s) { addLog(`Paksa lanjut: ${s.recipientName}`, 'warning'); updateStatus(s.id, 'sent'); } }}
                    className="col-span-2 py-2.5 rounded-xl border border-sky-400/20 bg-sky-400/8 text-sky-400 text-[12px] font-medium hover:bg-sky-400/15 transition-all">
                    Paksa Lanjut
                  </button>
                )}
                <button onClick={() => { const p = entries.filter(e => e.status === 'pending'); if (p.length) { const entry = p[0]; const w = window.open(getWALink(entry), 'WAsenderTab'); if (w) window.focus(); updateStatus(entry.id, 'sent'); } }}
                  className="py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-[12px] font-medium text-white/50 hover:text-white/80 transition-all">
                  Kirim Manual
                </button>
                <button onClick={stopBlast}
                  className="py-2.5 rounded-xl border border-red-400/20 bg-red-400/8 text-red-400 text-[12px] font-medium hover:bg-red-400/15 transition-all">
                  Berhenti
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <header className="shrink-0 flex items-center justify-between px-5 h-[52px] border-b border-white/[0.06] bg-[#0e0e10]">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-violet-500 flex items-center justify-center">
              <Send size={11} className="text-white" />
            </div>
            <span className="text-[13px] font-semibold tracking-tight">WAsender <span className="text-violet-400">PRO</span></span>
          </div>
          {/* Divider */}
          <div className="w-px h-4 bg-white/10" />
          {/* Status chip */}
          <div className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-medium', isBlasting ? 'border-violet-500/25 bg-violet-500/10 text-violet-400' : 'border-white/[0.06] text-white/30')}>
            <div className={cn('w-1.5 h-1.5 rounded-full', isBlasting ? 'bg-violet-400 animate-pulse' : 'bg-white/20')} />
            {isBlasting ? `Blasting · ${countdown}s` : 'Idle'}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Extension status */}
          <div className={cn('hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-medium mr-1', isExtensionDetected ? 'border-emerald-500/20 bg-emerald-500/8 text-emerald-400' : 'border-white/[0.06] text-white/25')}>
            <Puzzle size={10} className={isExtensionDetected ? 'text-emerald-400' : ''} />
            {isExtensionDetected ? 'Extension OK' : 'No Extension'}
          </div>
          {!isExtensionDetected && (
            <button onClick={downloadExtensionZip} className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-400/20 bg-amber-400/[0.06] text-amber-400 text-[11px] font-medium hover:bg-amber-400/15 transition-all">
              <Download size={11} /> Setup
            </button>
          )}
          <button onClick={exportToCSV} title="Export CSV" className="p-2 rounded-lg text-white/30 hover:text-white/65 hover:bg-white/[0.05] transition-all"><Download size={14} /></button>
          <button onClick={handleResetDefault} title="Reset" className="p-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-400/[0.06] transition-all"><RotateCcw size={14} /></button>
          <button onClick={() => setShowSettingsModal(true)} className="p-2 rounded-lg text-white/30 hover:text-white/65 hover:bg-white/[0.05] transition-all"><Settings2 size={14} /></button>

          {/* Main CTA */}
          <button onClick={isBlasting ? stopBlast : startBlast} disabled={entries.length === 0}
            className={cn('flex items-center gap-2 px-4 py-1.5 rounded-lg text-[12px] font-semibold transition-all disabled:opacity-30 ml-1',
              isBlasting ? 'bg-red-500/15 border border-red-500/25 text-red-400 hover:bg-red-500/25' : 'bg-violet-500 text-white hover:bg-violet-400 active:scale-[0.97] shadow-[0_2px_12px_rgba(139,92,246,0.35)]')}>
            {isBlasting ? <><Square size={12} fill="currentColor" /> Stop</> : <><Play size={12} fill="currentColor" /> Start Blast</>}
          </button>
        </div>
      </header>

      {/* ── MAIN LAYOUT: LEFT SIDEBAR + RIGHT CONTENT ─────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── LEFT SIDEBAR ──────────────────────────────────────────────── */}
        <aside className="w-[260px] shrink-0 border-r border-white/[0.06] flex flex-col bg-[#0e0e10] overflow-y-auto">

          {/* Stats */}
          <div className="p-4 border-b border-white/[0.06]">
            <p className="text-[10px] font-semibold text-white/25 uppercase tracking-wider mb-3">Statistik</p>
            <div className="space-y-2">
              {[
                { label: 'Total',    val: stats.total,    color: 'text-white/70' },
                { label: 'Terkirim', val: stats.sent,     color: 'text-emerald-400' },
                { label: 'Pending',  val: stats.pending,  color: 'text-amber-400' },
                { label: 'Gagal',    val: stats.failed,   color: 'text-red-400' },
                { label: 'Diterima', val: stats.received, color: 'text-violet-400' },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-[12px] text-white/40">{s.label}</span>
                  <span className={cn('text-[13px] font-semibold mono tabular-nums', s.color)}>{s.val}</span>
                </div>
              ))}
            </div>
            {stats.total > 0 && (
              <div className="mt-3">
                <div className="flex justify-between text-[10px] text-white/25 mb-1">
                  <span>Progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <motion.div className="h-full rounded-full bg-violet-500" animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
                </div>
              </div>
            )}
          </div>

          {/* Engine quick settings */}
          <div className="p-4 border-b border-white/[0.06]">
            <p className="text-[10px] font-semibold text-white/25 uppercase tracking-wider mb-3">Engine</p>
            <div className="space-y-2.5">
              <div>
                <label className="text-[11px] text-white/35 block mb-1.5">Nama Pengirim</label>
                <input type="text" value={settings.senderName} onChange={e => setSettings(p => ({ ...p, senderName: e.target.value }))} placeholder="misal: Admin JNT"
                  className="w-full px-3 py-2 bg-[#161618] border border-white/[0.07] rounded-lg text-[12px] text-white placeholder:text-white/20 outline-none focus:border-violet-500/40 transition-colors" />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[11px] text-white/35">Delay</label>
                  <span className="text-[11px] mono text-violet-400">{settings.delay / 1000}s</span>
                </div>
                <input type="range" min="1000" max="10000" step="500" value={settings.delay} onChange={e => setSettings(p => ({ ...p, delay: parseInt(e.target.value) }))} className="w-full" />
              </div>
              {/* Speed mode pills */}
              <div className="grid grid-cols-4 gap-1">
                {[{ id: 'safe', label: '🛡️' }, { id: 'normal', label: '⚖️' }, { id: 'fast', label: '⚡' }, { id: 'turbo', label: '🚀' }].map(m => (
                  <button key={m.id} onClick={() => setSettings(p => ({ ...p, speedMode: m.id as any }))}
                    className={cn('py-1 rounded text-[14px] transition-all border', settings.speedMode === m.id ? 'bg-violet-500/20 border-violet-500/30' : 'border-white/[0.06] hover:border-white/[0.12] bg-white/[0.02]')} title={m.id}>
                    {m.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-white/35">Mode Manual</span>
                <Toggle checked={settings.manualMode} onChange={() => setSettings(p => ({ ...p, manualMode: !p.manualMode }))} />
              </div>
            </div>
          </div>

          {/* System logs */}
          <div className="p-4 flex-1">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold text-white/25 uppercase tracking-wider">Log Aktivitas</p>
              <button onClick={() => setLogs([])} className="text-[9px] text-white/20 hover:text-white/45 transition-colors uppercase tracking-wider">Clear</button>
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-[11px] text-white/15 italic">Belum ada aktivitas.</p>
              ) : logs.map(log => (
                <div key={log.id} className="flex gap-2 items-start">
                  <span className="text-[9px] mono text-white/20 shrink-0 mt-0.5">{new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}</span>
                  <span className={cn('text-[10px] leading-snug break-all',
                    log.type === 'success' ? 'text-emerald-400/80' : log.type === 'error' ? 'text-red-400/80' : log.type === 'warning' ? 'text-amber-400/80' : 'text-white/35')}>
                    {log.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* ── RIGHT CONTENT ─────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Tab bar */}
          <div className="shrink-0 flex items-center gap-1 px-5 py-2.5 border-b border-white/[0.06] bg-[#0e0e10]">
            {([
              { id: 'queue',    icon: FileText,      label: 'Antrean', count: pendingCount },
              { id: 'template', icon: MessageSquare, label: 'Template' },
            ] as const).map(tab => (
              <button key={tab.id} onClick={() => setActivePanel(tab.id)}
                className={cn('flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all',
                  activePanel === tab.id ? 'bg-white/[0.07] text-white' : 'text-white/35 hover:text-white/65 hover:bg-white/[0.04]')}>
                <tab.icon size={13} />
                {tab.label}
                {'count' in tab && tab.count > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[9px] font-bold">{tab.count}</span>
                )}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <button onClick={() => setShowBulkModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.08] text-[11px] font-medium text-white/40 hover:text-white/70 hover:border-white/[0.14] transition-all">
                <FileSpreadsheet size={12} /> Bulk Import
              </button>
              {activePanel === 'queue' && (
                <button onClick={() => setShowPreviewModal(true)} disabled={pendingCount === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.08] text-[11px] font-medium text-white/40 hover:text-white/70 hover:border-white/[0.14] transition-all disabled:opacity-30">
                  <Search size={12} /> Preview
                </button>
              )}
            </div>
          </div>

          {/* ── QUEUE PANEL ──────────────────────────────────────────── */}
          {activePanel === 'queue' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Add form */}
              <div className="shrink-0 px-5 py-4 border-b border-white/[0.06] bg-[#0f0f11]">
                <form onSubmit={handleAddEntry}>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                    <input value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} placeholder="Nomor HP *"
                      className="px-3 py-2 bg-[#161618] border border-white/[0.07] rounded-lg text-[12px] text-white placeholder:text-white/25 outline-none focus:border-violet-500/40 transition-colors" />
                    <input value={formData.recipientName} onChange={e => setFormData(p => ({ ...p, recipientName: e.target.value }))} placeholder="Nama Penerima *"
                      className="px-3 py-2 bg-[#161618] border border-white/[0.07] rounded-lg text-[12px] text-white placeholder:text-white/25 outline-none focus:border-violet-500/40 transition-colors" />
                    <input value={formData.receiptNumber} onChange={e => setFormData(p => ({ ...p, receiptNumber: e.target.value }))} placeholder="No. Resi"
                      className="px-3 py-2 bg-[#161618] border border-white/[0.07] rounded-lg text-[12px] text-white placeholder:text-white/25 outline-none focus:border-violet-500/40 transition-colors" />
                    <input value={formData.itemName} onChange={e => setFormData(p => ({ ...p, itemName: e.target.value }))} placeholder="Nama Barang"
                      className="px-3 py-2 bg-[#161618] border border-white/[0.07] rounded-lg text-[12px] text-white placeholder:text-white/25 outline-none focus:border-violet-500/40 transition-colors" />
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <input value={formData.address} onChange={e => setFormData(p => ({ ...p, address: e.target.value }))} placeholder="Alamat" className="lg:col-span-2 px-3 py-2 bg-[#161618] border border-white/[0.07] rounded-lg text-[12px] text-white placeholder:text-white/25 outline-none focus:border-violet-500/40 transition-colors" />
                    <input value={formData.cod} onChange={e => setFormData(p => ({ ...p, cod: e.target.value.replace(/[^0-9.,]/g, '') }))} placeholder="COD (Rp)"
                      className="px-3 py-2 bg-[#161618] border border-white/[0.07] rounded-lg text-[12px] text-white placeholder:text-white/25 outline-none focus:border-violet-500/40 transition-colors" />
                    <div className="flex gap-2">
                      <input value={formData.dfod} onChange={e => setFormData(p => ({ ...p, dfod: e.target.value.replace(/[^0-9.,]/g, '') }))} placeholder="DFOD (Rp)"
                        className="flex-1 px-3 py-2 bg-[#161618] border border-white/[0.07] rounded-lg text-[12px] text-white placeholder:text-white/25 outline-none focus:border-violet-500/40 transition-colors" />
                      <button type="submit" className="px-4 py-2 bg-violet-500 hover:bg-violet-400 text-white text-[12px] font-semibold rounded-lg transition-all active:scale-[0.97] whitespace-nowrap flex items-center gap-1.5 shadow-[0_2px_8px_rgba(139,92,246,0.3)]">
                        <Plus size={13} /> Tambah
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* Search + table controls */}
              <div className="shrink-0 flex items-center gap-3 px-5 py-2.5 border-b border-white/[0.06]">
                <div className="relative flex-1 max-w-xs">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
                  <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Cari nama, nomor, resi..."
                    className="w-full pl-8 pr-3 py-1.5 bg-[#161618] border border-white/[0.07] rounded-lg text-[12px] text-white placeholder:text-white/20 outline-none focus:border-violet-500/40 transition-colors" />
                </div>
                <span className="text-[11px] text-white/25">{filteredEntries.length} item</span>
                <div className="ml-auto">
                  {isConfirmingClear ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-red-400">Hapus semua?</span>
                      <button onClick={clearAll} className="px-2.5 py-1 bg-red-500 text-white text-[11px] font-semibold rounded-md">Hapus</button>
                      <button onClick={() => setIsConfirmingClear(false)} className="px-2.5 py-1 bg-white/[0.06] text-white/50 text-[11px] font-semibold rounded-md">Batal</button>
                    </div>
                  ) : (
                    <button onClick={() => setIsConfirmingClear(true)} className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-400/8 transition-all"><Trash2 size={13} /></button>
                  )}
                </div>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-auto">
                {filteredEntries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-8">
                    <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                      <Package size={20} className="text-white/20" />
                    </div>
                    <div>
                      <p className="text-[13px] text-white/35 font-medium">Antrean kosong</p>
                      <p className="text-[11px] text-white/20 mt-0.5">Tambahkan data di atas atau gunakan Bulk Import.</p>
                    </div>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-[#0e0e10] z-10">
                      <tr className="border-b border-white/[0.06]">
                        {['#', 'Penerima', 'Detail', 'Status', 'Diterima', ''].map((h, i) => (
                          <th key={i} className="px-4 py-2 text-[9px] font-semibold text-white/25 uppercase tracking-widest whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence mode="popLayout">
                        {filteredEntries.map((entry, idx) => (
                          <motion.tr key={entry.id} layout initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -6 }} transition={{ duration: 0.12 }}
                            className={cn('group border-b border-white/[0.04] transition-colors', isBlasting && idx === currentIndex ? 'bg-violet-500/[0.05]' : 'hover:bg-white/[0.02]')}>
                            <td className="px-4 py-3 text-[10px] text-white/20 mono w-8">{idx + 1}</td>
                            <td className="px-4 py-3">
                              <div className="text-[13px] font-medium text-white/85 leading-tight">{entry.recipientName}</div>
                              <div className="text-[10px] mono text-white/30 mt-0.5">{entry.phone}</div>
                            </td>
                            <td className="px-4 py-3 max-w-[200px]">
                              <div className="text-[12px] text-white/55 truncate">{entry.itemName || '—'}</div>
                              <div className="text-[10px] mono text-white/25 mt-0.5 truncate">{entry.receiptNumber || '—'}</div>
                              {entry.address && <div className="text-[10px] text-white/20 truncate mt-0.5">{entry.address}</div>}
                              <div className="flex gap-1.5 mt-1 flex-wrap">
                                {entry.cod  && <span className="text-[9px] font-semibold mono text-amber-400/80 bg-amber-400/[0.08] border border-amber-400/[0.12] px-1.5 py-0.5 rounded">COD {formatCurrency(entry.cod)}</span>}
                                {entry.dfod && <span className="text-[9px] font-semibold mono text-violet-400/80 bg-violet-400/[0.08] border border-violet-400/[0.12] px-1.5 py-0.5 rounded">DFOD {formatCurrency(entry.dfod)}</span>}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={entry.status} /></td>
                            <td className="px-4 py-3">
                              <button onClick={() => toggleReceived(entry.id)}
                                className={cn('flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] font-medium transition-all',
                                  entry.isReceived ? 'bg-violet-500/10 border-violet-500/20 text-violet-400' : 'border-white/[0.06] text-white/25 hover:border-white/[0.12] hover:text-white/50')}>
                                <div className={cn('w-3 h-3 rounded flex items-center justify-center border transition-all', entry.isReceived ? 'bg-violet-500 border-violet-500' : 'border-white/20')}>
                                  {entry.isReceived && <CheckCircle2 size={8} className="text-white" />}
                                </div>
                                {entry.isReceived ? 'Ya' : 'Belum'}
                              </button>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleSendManual(entry)} title="Kirim sekarang" className="p-1.5 rounded-md text-white/20 hover:text-emerald-400 hover:bg-emerald-400/8 transition-all"><ExternalLink size={12} /></button>
                                <button onClick={() => setEntries(p => p.filter(e => e.id !== entry.id))} title="Hapus" className="p-1.5 rounded-md text-white/20 hover:text-red-400 hover:bg-red-400/8 transition-all"><Trash2 size={12} /></button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ── TEMPLATE PANEL ───────────────────────────────────────── */}
          {activePanel === 'template' && (
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Template selector */}
              <div>
                <SH action={
                  <button onClick={() => { const def = DEFAULT_TEMPLATES.find(t => t.id === activeTemplateId); if (def && confirm('Reset ke default?')) { setTemplates(p => p.map(t => t.id === activeTemplateId ? { ...def } : t)); setActiveVariationIndex(0); toast.success('Direset'); } }}
                    className="flex items-center gap-1 text-[10px] text-white/25 hover:text-amber-400 transition-colors">
                    <History size={11} /> Reset
                  </button>
                }>Template Aktif</SH>
                <div className="flex gap-2 flex-wrap">
                  {templates.map(t => (
                    <button key={t.id} onClick={() => { setActiveTemplateId(t.id); setActiveVariationIndex(0); }}
                      className={cn('px-3 py-1.5 rounded-lg border text-[12px] font-medium transition-all',
                        activeTemplateId === t.id ? 'bg-violet-500/15 border-violet-500/25 text-violet-300' : 'border-white/[0.07] text-white/35 hover:text-white/65 hover:border-white/[0.14]')}>
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Variation */}
              <div>
                <SH action={<span className="text-[10px] text-white/20">{settings.rotateTemplates ? '● Rotasi aktif' : '○ Rotasi mati'}</span>}>
                  Variasi Pesan
                </SH>
                <div className="flex gap-2 mb-4">
                  {[0, 1, 2].map(i => (
                    <button key={i} onClick={() => setActiveVariationIndex(i)}
                      className={cn('w-9 h-8 rounded-lg border text-[12px] font-semibold transition-all',
                        activeVariationIndex === i ? 'bg-violet-500/15 border-violet-500/25 text-violet-300' : 'border-white/[0.07] text-white/30 hover:border-white/[0.14]')}>
                      {i + 1}
                    </button>
                  ))}
                </div>
                <textarea value={currentTemplateText} onChange={e => updateActiveTemplateText(e.target.value)}
                  className="w-full h-44 px-4 py-3 bg-[#161618] border border-white/[0.08] rounded-xl text-[13px] text-white/80 placeholder:text-white/15 outline-none focus:border-violet-500/40 resize-none transition-colors leading-relaxed mono"
                  placeholder="Tulis template pesan..." />
              </div>

              {/* Variable tags */}
              <div>
                <SH>Variabel</SH>
                <div className="flex flex-wrap gap-1.5">
                  {['{salam}', '{pengirim}', '{nama}', '{barang}', '{resi}', '{alamat}', '{cod}', '{dfod}', '{if_cod}', '{/if_cod}', '{if_dfod}', '{/if_dfod}'].map(tag => (
                    <button key={tag} onClick={() => updateActiveTemplateText(currentTemplateText + ' ' + tag)}
                      className="px-2.5 py-1 rounded-md border border-white/[0.07] bg-white/[0.02] text-[11px] mono text-white/40 hover:text-violet-300 hover:border-violet-500/25 hover:bg-violet-500/[0.06] transition-all">
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Spintax tip */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/[0.05] border border-blue-400/[0.10]">
                <Sparkles size={14} className="text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[12px] font-medium text-blue-300/80 mb-1">Spintax Anti-Ban</p>
                  <p className="text-[11px] text-blue-300/45 leading-relaxed">
                    Gunakan <span className="mono bg-blue-400/10 px-1.5 rounded text-blue-300/70">{'{Halo|Hai|Permisi}'}</span> untuk variasi pesan otomatis. Setiap pesan akan berbeda.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ════════ MODALS ════════ */}

      {/* Bulk Import */}
      <AnimatePresence>
        {showBulkModal && (
          <Modal onClose={() => setShowBulkModal(false)} size="lg">
            <ModalHeader title="Bulk Import" subtitle="Copy-paste dari Excel atau CSV" icon={FileSpreadsheet} onClose={() => setShowBulkModal(false)} />
            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">Format Kolom</p>
                  <p className="text-[11px] mono text-white/40 leading-relaxed">No · Resi · Nama · HP · Alamat · Tanda · COD · DFOD · Barang</p>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">Cara Pakai</p>
                  <p className="text-[11px] text-white/40 leading-relaxed">Select range di Excel → <Kbd>Ctrl+C</Kbd> → Paste di bawah</p>
                </div>
              </div>
              <textarea value={bulkData} onChange={e => setBulkData(e.target.value)}
                placeholder={'1\tJX123456789\tBudi Santoso\t08123456789\tJl. Merdeka No.1\tCOD\t150000\t0\tSepatu...'}
                className="w-full h-52 px-4 py-3 bg-[#161618] border border-white/[0.08] rounded-xl text-[12px] mono text-white/70 placeholder:text-white/15 outline-none focus:border-violet-500/40 resize-none transition-colors" />
              <div className="flex gap-3">
                <button onClick={() => setShowBulkModal(false)} className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-[13px] font-medium text-white/40 hover:bg-white/[0.04] transition-all">Batal</button>
                <button onClick={handleBulkImport} className="flex-[2] py-2.5 rounded-xl bg-violet-500 text-white text-[13px] font-semibold hover:bg-violet-400 transition-all shadow-[0_2px_12px_rgba(139,92,246,0.3)]">Import Data</button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Preview */}
      <AnimatePresence>
        {showPreviewModal && (
          <Modal onClose={() => setShowPreviewModal(false)} size="md">
            <ModalHeader title="Preview Pesan" subtitle="Pesan yang akan dikirim ke penerima pertama" icon={MessageSquare} onClose={() => setShowPreviewModal(false)} />
            <div className="p-5 space-y-4 overflow-y-auto">
              {entries.find(e => e.status === 'pending') ? (() => {
                const entry = entries.find(e => e.status === 'pending')!;
                const sc = entries.filter(e => e.status === 'sent').length;
                let tmpl = activeTemplate.text;
                if (settings.rotateTemplates) { const vs = activeTemplate.variations?.length ? activeTemplate.variations : [activeTemplate.text]; tmpl = vs[sc % vs.length]; }
                return (
                  <>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <div className="w-8 h-8 rounded-xl bg-violet-500/20 border border-violet-500/25 flex items-center justify-center text-[13px] font-bold text-violet-300">{entry.recipientName.charAt(0).toUpperCase()}</div>
                      <div><p className="text-[13px] font-medium text-white/80">{entry.recipientName}</p><p className="text-[11px] mono text-white/30">{entry.phone}</p></div>
                    </div>
                    <div className="p-4 rounded-xl bg-[#161618] border border-white/[0.07] text-[13px] whitespace-pre-wrap leading-relaxed text-white/60 mono max-h-64 overflow-y-auto">
                      {generateMessage(entry, tmpl)}
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => setShowPreviewModal(false)} className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-[13px] font-medium text-white/40 hover:bg-white/[0.04] transition-all">Tutup</button>
                      <button onClick={() => { const w = window.open(getWALink(entry, sc), 'WAsenderTab'); if (w) window.focus(); updateStatus(entry.id, 'sent'); setShowPreviewModal(false); }}
                        className="flex-1 py-2.5 rounded-xl bg-violet-500 text-white text-[13px] font-semibold hover:bg-violet-400 flex items-center justify-center gap-2 transition-all">
                        <Send size={14} /> Kirim Sekarang
                      </button>
                    </div>
                  </>
                );
              })() : (
                <div className="py-16 text-center">
                  <Clock size={32} className="mx-auto text-white/10 mb-3" />
                  <p className="text-[13px] text-white/25">Tidak ada pesan pending.</p>
                </div>
              )}
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Settings */}
      <AnimatePresence>
        {showSettingsModal && (
          <Modal onClose={() => setShowSettingsModal(false)} size="md">
            <ModalHeader title="Settings" subtitle="Konfigurasi engine & anti-spam" icon={Settings2} onClose={() => setShowSettingsModal(false)} />
            {/* Tabs */}
            <div className="flex gap-0 border-b border-white/[0.06] px-5">
              {(['general', 'antispam'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveSettingsTab(tab)}
                  className={cn('pb-3 pt-3 px-1 mr-5 text-[12px] font-medium transition-all relative', activeSettingsTab === tab ? 'text-white' : 'text-white/30 hover:text-white/60')}>
                  {tab === 'general' ? 'General' : 'Anti-Spam'}
                  {activeSettingsTab === tab && <motion.div layoutId="st" className="absolute bottom-0 left-0 right-0 h-[2px] bg-violet-500 rounded-full" />}
                </button>
              ))}
            </div>
            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              {activeSettingsTab === 'antispam' && (
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[12px] font-medium text-white/70"><Shield size={13} className="text-emerald-400" /> Safety Score</span>
                    <span className={cn('text-[14px] font-bold mono', safetyScore > 80 ? 'text-emerald-400' : safetyScore > 50 ? 'text-amber-400' : 'text-red-400')}>{safetyScore}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${safetyScore}%` }}
                      className={cn('h-full rounded-full', safetyScore > 80 ? 'bg-emerald-500' : safetyScore > 50 ? 'bg-amber-400' : 'bg-red-500')} />
                  </div>
                  <p className="text-[10px] text-white/25">{safetyScore > 80 ? 'Sangat aman.' : safetyScore > 50 ? 'Cukup aman. Pertimbangkan menambah variasi.' : 'Berisiko! Akun rentan banned.'}</p>
                </div>
              )}

              {activeSettingsTab === 'general' ? (
                <div className="space-y-4">
                  <Input label="Nama Pengirim" value={settings.senderName} onChange={e => setSettings(p => ({ ...p, senderName: e.target.value }))} placeholder="Admin JNT" />

                  <div>
                    <label className="block text-[10px] font-medium text-white/35 uppercase tracking-wider mb-2">Kecepatan Blast</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[{ id: 'safe', icon: '🛡️', label: 'Main Aman', desc: '15–30 detik' }, { id: 'normal', icon: '⚖️', label: 'Normal', desc: '8–15 detik' }, { id: 'fast', icon: '⚡', label: 'Cepat', desc: '3–7 detik' }, { id: 'turbo', icon: '🚀', label: 'Turbo', desc: '1–2 detik' }].map(m => (
                        <button key={m.id} onClick={() => setSettings(p => ({ ...p, speedMode: m.id as any }))}
                          className={cn('p-3 rounded-xl border text-left transition-all', settings.speedMode === m.id ? 'border-violet-500/30 bg-violet-500/[0.08]' : 'border-white/[0.07] hover:border-white/[0.14] bg-white/[0.02]')}>
                          <div className="flex justify-between items-start">{m.icon}{settings.speedMode === m.id && <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />}</div>
                          <div className="text-[12px] font-semibold mt-1.5">{m.label}</div>
                          <div className="text-[10px] text-white/30">{m.desc}</div>
                        </button>
                      ))}
                      <button onClick={() => setSettings(p => ({ ...p, speedMode: 'custom' }))}
                        className={cn('col-span-2 p-3 rounded-xl border text-left transition-all flex items-center justify-between', settings.speedMode === 'custom' ? 'border-violet-500/30 bg-violet-500/[0.08]' : 'border-white/[0.07] hover:border-white/[0.14] bg-white/[0.02]')}>
                        <span className="text-[12px] font-semibold">⚙️ Custom</span>
                        {settings.speedMode === 'custom' && <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />}
                      </button>
                    </div>
                  </div>

                  {settings.speedMode === 'custom' && (
                    <Input label="Delay (ms)" type="number" value={settings.delay} onChange={e => setSettings(p => ({ ...p, delay: parseInt(e.target.value) || 1000 }))} min="1000" step="500" />
                  )}

                  {[{ k: 'manualMode', l: 'Mode Manual', d: 'Kirim hanya saat klik atau tekan Spasi.' }, { k: 'autoRetry', l: 'Auto Retry', d: 'Coba ulang otomatis jika nomor gagal.' }].map(item => (
                    <div key={item.k} className="flex items-center justify-between p-3.5 rounded-xl border border-white/[0.07] bg-white/[0.02]">
                      <div><p className="text-[12px] font-medium text-white/75">{item.l}</p><p className="text-[10px] text-white/30 mt-0.5">{item.d}</p></div>
                      <Toggle checked={!!settings[item.k as keyof AppSettings]} onChange={() => setSettings(p => ({ ...p, [item.k]: !p[item.k as keyof AppSettings] }))} />
                    </div>
                  ))}

                  {settings.autoRetry && <Input label="Max Retries" type="number" value={settings.maxRetries} onChange={e => setSettings(p => ({ ...p, maxRetries: parseInt(e.target.value) || 1 }))} min="1" max="10" />}

                  <button onClick={() => { if (window.confirm('Reset semua template?')) { setTemplates(DEFAULT_TEMPLATES); setActiveTemplateId(DEFAULT_TEMPLATES[0].id); setActiveVariationIndex(0); toast.success('Template dipulihkan'); } }}
                    className="w-full py-2.5 rounded-xl border border-white/[0.08] text-[12px] font-medium text-white/35 hover:bg-white/[0.04] hover:text-white/60 transition-all flex items-center justify-center gap-2">
                    <RotateCcw size={12} /> Restore Default Templates
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/[0.07] bg-white/[0.02]">
                    <div><p className="text-[12px] font-medium text-white/75">Randomize Delay</p><p className="text-[10px] text-white/30 mt-0.5">Jeda acak supaya tidak terdeteksi bot.</p></div>
                    <Toggle checked={settings.randomizeDelay} onChange={() => setSettings(p => ({ ...p, randomizeDelay: !p.randomizeDelay }))} />
                  </div>
                  {settings.randomizeDelay && <Input label="Max Delay (ms)" type="number" value={settings.maxDelay} onChange={e => setSettings(p => ({ ...p, maxDelay: parseInt(e.target.value) || 10000 }))} step="500" />}

                  <div className="grid grid-cols-2 gap-3">
                    {[{ k: 'batchSize', l: 'Batch Size', d: 'Jeda tiap X pesan', ph: '10' }, { k: 'batchPause', l: 'Pause (ms)', d: 'Lama istirahat', ph: '30000' }, { k: 'hourlyLimit', l: 'Hourly Limit', d: 'Maks pesan/jam', ph: '50' }, { k: 'stopOnConsecutiveErrors', l: 'Stop on Errors', d: 'Stop jika X gagal berurutan', ph: '3' }, { k: 'longBreakAfter', l: 'Long Break After', d: 'Break tiap X pesan', ph: '25' }, { k: 'longBreakDuration', l: 'Break Duration (min)', d: 'Lama break (menit)', ph: '10' }].map(item => (
                      <div key={item.k}>
                        <label className="block text-[10px] font-medium text-white/30 uppercase tracking-wider mb-1.5">{item.l}</label>
                        <input type="number" value={settings[item.k as keyof AppSettings] as number} onChange={e => setSettings(p => ({ ...p, [item.k]: parseInt(e.target.value) || 0 }))} placeholder={item.ph}
                          className="w-full px-3 py-2 bg-[#161618] border border-white/[0.07] rounded-lg text-[12px] text-white placeholder:text-white/20 outline-none focus:border-violet-500/40 transition-colors" />
                        <p className="text-[9px] text-white/20 mt-1">{item.d}</p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1.5 pt-1">
                    {[{ k: 'shuffleQueue', l: 'Shuffle Queue', d: 'Acak urutan saat mulai blast.' }, { k: 'useRandomGreetings', l: 'Random Greetings', d: 'Variasi kata sapaan.' }, { k: 'addRandomSuffix', l: 'Random Suffix', d: 'Tambah Ref ID unik di akhir.' }, { k: 'useInvisibleChars', l: 'Invisible Chars', d: 'Sisipkan karakter tak terlihat.' }, { k: 'simulateTyping', l: 'Simulate Typing', d: 'Delay berdasarkan panjang pesan.' }, { k: 'adaptiveDelay', l: 'Adaptive Delay', d: 'Delay bertambah seiring waktu.' }, { k: 'randomizeFormatting', l: 'Random Formatting', d: 'Variasi spasi dan baris.' }, { k: 'rotateTemplates', l: 'Rotate Templates', d: 'Rotasi variasi template.' }, { k: 'randomizeEmojis', l: 'Randomize Emojis', d: 'Sisipkan emoji acak.' }, { k: 'useGlobalSpintax', l: 'Global Spintax', d: 'Aktifkan parser {a|b|c}.' }, { k: 'autoSend', l: 'Auto Send', d: 'Kirim otomatis via Extension.' }].map(item => (
                      <div key={item.k} className="flex items-center justify-between px-3.5 py-2.5 rounded-lg border border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                        <div><p className="text-[12px] text-white/65">{item.l}</p><p className="text-[9px] text-white/25 mt-0.5">{item.d}</p></div>
                        <Toggle checked={!!settings[item.k as keyof AppSettings]} onChange={() => setSettings(p => ({ ...p, [item.k]: !p[item.k as keyof AppSettings] }))} />
                      </div>
                    ))}
                  </div>

                  {settings.autoSend && (
                    <div className="p-4 rounded-xl border border-amber-400/15 bg-amber-400/[0.04] space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[12px] font-medium text-amber-400"><Puzzle size={12} /> Chrome Extension</div>
                        <span className={cn('text-[9px] font-bold uppercase px-2 py-0.5 rounded', isExtensionDetected ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/20 text-amber-400 border border-amber-500/20')}>{isExtensionDetected ? 'Connected' : 'Not Found'}</span>
                      </div>
                      <button onClick={downloadExtensionZip} className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#0e0e10] text-[12px] font-semibold flex items-center justify-center gap-2 transition-all">
                        <Download size={13} /> Download Extension (.zip)
                      </button>
                      <ol className="text-[10px] text-white/30 space-y-1 list-decimal ml-4">
                        <li>Klik tombol Download di atas.</li>
                        <li>Ekstrak file <span className="mono bg-white/[0.06] px-1 rounded">wasender-pro-helper.zip</span>.</li>
                        <li>Buka <span className="mono bg-white/[0.06] px-1 rounded">chrome://extensions</span>.</li>
                        <li>Aktifkan <strong>Developer Mode</strong>.</li>
                        <li>Klik <strong>Load Unpacked</strong>, pilih folder hasil ekstrak.</li>
                      </ol>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="p-5 border-t border-white/[0.06]">
              <button onClick={() => setShowSettingsModal(false)} className="w-full py-2.5 rounded-xl bg-violet-500 hover:bg-violet-400 text-white text-[13px] font-semibold transition-all active:scale-[0.98] shadow-[0_2px_12px_rgba(139,92,246,0.3)]">
                Simpan Konfigurasi
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}
