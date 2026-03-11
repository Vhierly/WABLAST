import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Send, Trash2, Play, Square, MessageSquare, User,
  FileText, CheckCircle2, Clock, AlertCircle, Settings2,
  Download, FileSpreadsheet, X, Search, Sparkles, BarChart3,
  History, Timer, ExternalLink, Moon, Sun, RotateCcw, Shield,
  Puzzle, Loader2, Zap, Terminal
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

// ─── Supabase-inspired decorative SVG elements ──────────────────────────────

const DecoWALogo = () => (
  <svg viewBox="0 0 120 120" fill="none" className="w-full h-full opacity-[0.12]">
    <rect width="120" height="120" rx="24" fill="#1a1a1a" />
    <path d="M60 20C38.46 20 21 37.46 21 59c0 7.48 2.09 14.47 5.71 20.39L20 100l21.04-6.64A38.74 38.74 0 0060 98c21.54 0 39-17.46 39-39S81.54 20 60 20z" stroke="#3ECF8E" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M49 53.5c0-.83.68-1.5 1.5-1.5h19c.83 0 1.5.67 1.5 1.5S70.33 55 69.5 55h-19c-.82 0-1.5-.67-1.5-1.5zM49 63.5c0-.83.68-1.5 1.5-1.5h12c.83 0 1.5.67 1.5 1.5S63.33 65 62.5 65h-12c-.82 0-1.5-.67-1.5-1.5z" stroke="#3ECF8E" strokeWidth="3" strokeLinecap="round"/>
  </svg>
);

const DecoStatsGrid = ({ data }: { data: { name: string; value: number; color: string }[] }) => (
  <div className="absolute inset-0 flex items-end justify-center pb-6 gap-4 px-6">
    {data.map((d, i) => (
      <div key={d.name} className="flex flex-col items-center gap-2">
        <div className="text-2xl font-black" style={{ color: d.color, fontVariantNumeric: 'tabular-nums' }}>{d.value}</div>
        <div className="h-16 w-8 rounded-md relative overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <motion.div 
            initial={{ height: 0 }} 
            animate={{ height: `${Math.max(10, (d.value / (Math.max(...data.map(x => x.value)) || 1)) * 100)}%` }}
            transition={{ delay: i * 0.1, duration: 0.8, ease: 'easeOut' }}
            className="absolute bottom-0 w-full rounded-sm opacity-80"
            style={{ background: d.color }}
          />
        </div>
        <div className="text-[9px] font-bold uppercase tracking-widest" style={{ color: d.color }}>{d.name}</div>
      </div>
    ))}
  </div>
);

const DecoQueueLines = () => (
  <div className="absolute inset-0 flex flex-col justify-end p-5 gap-1.5 pointer-events-none opacity-30">
    {[80, 55, 90, 40, 70].map((w, i) => (
      <motion.div key={i} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: i * 0.08, duration: 0.6 }}
        className="h-5 rounded" style={{ width: `${w}%`, background: 'linear-gradient(90deg, rgba(62,207,142,0.3) 0%, rgba(62,207,142,0.05) 100%)', border: '1px solid rgba(62,207,142,0.2)', transformOrigin: 'left' }} />
    ))}
  </div>
);

const DecoTemplateLines = () => (
  <div className="absolute inset-0 flex flex-col p-5 gap-2 pointer-events-none">
    {[
      'Selamat {salam}, Kak {nama} 👋',
      'Paket dengan resi {resi} sudah',
      'tiba dan siap diterima.',
      '{if_cod} Total tagihan: {cod} {/if_cod}',
    ].map((line, i) => (
      <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 0.25, x: 0 }} transition={{ delay: 0.3 + i * 0.1 }}
        className="text-[11px] font-mono text-green-400 truncate">{line}</motion.div>
    ))}
  </div>
);

const DecoConsoleLines = ({ logs }: { logs: LogEntry[] }) => (
  <div className="absolute inset-0 p-5 pointer-events-none overflow-hidden">
    {(logs.length === 0 ? [
      { type: 'info', message: '> Waiting for system actions...' }
    ] : logs.slice(0, 4)).map((log, i) => (
      <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 0.3 }} transition={{ delay: i * 0.05 }}
        className={cn("text-[10px] font-mono truncate", log.type === 'success' ? 'text-green-400' : log.type === 'error' ? 'text-red-400' : log.type === 'warning' ? 'text-amber-400' : 'text-blue-400')}>
        {log.type === 'info' ? '>' : log.type === 'success' ? '✓' : log.type === 'error' ? '✗' : '!'} {log.message}
      </motion.div>
    ))}
  </div>
);

const DecoExtensionDots = ({ connected }: { connected: boolean }) => (
  <div className="absolute bottom-6 left-5 right-5 flex flex-wrap gap-2">
    {Array.from({ length: 12 }).map((_, i) => (
      <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.04 }}
        className="w-4 h-4 rounded-sm"
        style={{ background: connected && i < 8 ? 'rgba(62,207,142,0.5)' : 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
    ))}
  </div>
);

const DecoBlastNodes = () => (
  <svg viewBox="0 0 200 100" className="absolute inset-0 w-full h-full opacity-[0.15]">
    <circle cx="40" cy="50" r="4" fill="#3ECF8E"/>
    <circle cx="100" cy="30" r="4" fill="#3ECF8E"/>
    <circle cx="100" cy="70" r="4" fill="#3ECF8E"/>
    <circle cx="160" cy="50" r="4" fill="#3ECF8E"/>
    <circle cx="100" cy="50" r="8" fill="none" stroke="#3ECF8E" strokeWidth="1.5"/>
    <line x1="44" y1="50" x2="92" y2="32" stroke="#3ECF8E" strokeWidth="1" strokeDasharray="3 3"/>
    <line x1="44" y1="50" x2="92" y2="68" stroke="#3ECF8E" strokeWidth="1" strokeDasharray="3 3"/>
    <line x1="108" y1="32" x2="156" y2="49" stroke="#3ECF8E" strokeWidth="1" strokeDasharray="3 3"/>
    <line x1="108" y1="68" x2="156" y2="51" stroke="#3ECF8E" strokeWidth="1" strokeDasharray="3 3"/>
    <circle cx="40" cy="50" r="8" fill="none" stroke="#3ECF8E" strokeWidth="1" opacity="0.4"/>
    <circle cx="160" cy="50" r="8" fill="none" stroke="#3ECF8E" strokeWidth="1" opacity="0.4"/>
  </svg>
);

// ─── Toggle component ─────────────────────────────────────────────────────────
const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
  <button onClick={onChange} className={cn("w-10 h-5 rounded-full relative transition-all duration-200 shrink-0", checked ? "bg-[#3ECF8E]" : "bg-white/10")}>
    <div className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all duration-200 shadow-sm", checked ? "left-5.5" : "left-0.5")} />
  </button>
);

// ─── BentoCard ────────────────────────────────────────────────────────────────
const BentoCard = ({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) => (
  <div onClick={onClick} className={cn(
    "relative rounded-2xl overflow-hidden border border-white/[0.07] bg-[#111214] transition-all duration-200",
    onClick && "cursor-pointer hover:border-white/[0.14] hover:bg-[#141618]",
    className
  )}>
    {children}
  </div>
);

// ─── Input ────────────────────────────────────────────────────────────────────
const Input = ({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...props} className={cn("w-full px-3.5 py-2.5 text-sm bg-[#1a1c1e] border border-white/[0.08] rounded-lg text-white placeholder:text-white/25 outline-none focus:border-[#3ECF8E]/50 transition-colors", className)} />
);

// ─── SectionLabel ─────────────────────────────────────────────────────────────
const SectionLabel = ({ icon: Icon, label }: { icon: React.ElementType; label: string }) => (
  <div className="flex items-center gap-2 mb-1">
    <Icon size={14} className="text-white/40" />
    <span className="text-[13px] font-semibold text-white/90 tracking-tight">{label}</span>
  </div>
);

// ─── SubLabel ─────────────────────────────────────────────────────────────────
const SubLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[12px] text-white/40 leading-relaxed mt-0.5">{children}</p>
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
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showConsoleModal, setShowConsoleModal] = useState(false);
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
    return saved !== 'light';
  });
  const [nextActionTime, setNextActionTime] = useState(0);
  const [formData, setFormData] = useState({ phone: '', recipientName: '', itemName: '', receiptNumber: '', address: '', cod: '', dfod: '' });

  useEffect(() => {
    const savedEntries = localStorage.getItem('wa_blast_entries');
    const savedTemplates = localStorage.getItem('wa_blast_templates');
    const savedActiveId = localStorage.getItem('wa_blast_active_template_id');
    const savedSettings = localStorage.getItem('wa_blast_settings');
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

  useEffect(() => localStorage.setItem('wa_blast_entries', JSON.stringify(entries)), [entries]);
  useEffect(() => localStorage.setItem('wa_blast_templates', JSON.stringify(templates)), [templates]);
  useEffect(() => localStorage.setItem('wa_blast_active_template_id', activeTemplateId), [activeTemplateId]);
  useEffect(() => localStorage.setItem('wa_blast_settings', JSON.stringify(settings)), [settings]);
  useEffect(() => { localStorage.setItem('wa_blast_theme', isDarkMode ? 'dark' : 'light'); document.documentElement.classList.toggle('dark', isDarkMode); }, [isDarkMode]);

  const handleResetDefault = () => {
    if (window.confirm('Reset semua data ke pengaturan awal?')) { localStorage.clear(); window.location.reload(); }
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
    addLog(`➕ Data ditambahkan: ${newEntry.recipientName} (${newEntry.phone})`, 'info');
    toast.success('Data ditambahkan');
  };

  const handleBulkImport = () => {
    if (!bulkData.trim()) { toast.error('Data kosong'); return; }
    const lines = bulkData.trim().split(/\r?\n/);
    const newEntries: BlastEntry[] = []; let successCount = 0;
    lines.forEach(line => {
      const delimiter = line.includes('\t') ? '\t' : ',';
      const columns = line.split(delimiter).map(c => c.trim());
      if (columns.length >= 4) {
        if (columns[0].toLowerCase() === 'no' || (columns[1]||'').toLowerCase().includes('resi')) return;
        const tanda = (columns[5]||'').toUpperCase();
        let cod = '', dfod = '';
        if (tanda === 'COD') { const c = (columns[6]||'').replace(/[^0-9]/g,''); if (c) cod = c; }
        else if (tanda === 'DFOD') { const d = (columns[7]||'').replace(/[^0-9]/g,''); if (d) dfod = d; }
        newEntries.push({ id: crypto.randomUUID(), receiptNumber: columns[1]||'', recipientName: columns[2]||'', phone: columns[3]||'', address: columns[4]||'', itemName: columns[8]||'', cod, dfod, status: 'pending', isReceived: false, createdAt: Date.now() });
        successCount++;
      }
    });
    if (newEntries.length > 0) { setEntries(prev => [...newEntries, ...prev]); setBulkData(''); setShowBulkModal(false); addLog(`📥 Bulk Import: ${successCount} data`, 'success'); toast.success(`${successCount} data diimpor`); }
    else toast.error('Format data tidak valid.');
  };

  const clearAll = () => { setEntries([]); setIsConfirmingClear(false); addLog(`🗑️ Semua data dihapus`, 'warning'); toast.success('Semua data dihapus'); };

  const getGreeting = () => {
    const hour = new Date().getHours();
    let base = hour >= 5 && hour < 11 ? 'Pagi' : hour >= 11 && hour < 15 ? 'Siang' : hour >= 15 && hour < 18 ? 'Sore' : 'Malam';
    if (settings.useRandomGreetings) { const v = [`Selamat ${base}`, `${base} Kak`, `Halo, Selamat ${base}`, `Halo Kak`, `Permisi`, `Halo`, base]; return v[Math.floor(Math.random() * v.length)]; }
    return `Selamat ${base}`;
  };

  const generateMessage = (entry: BlastEntry, templateText?: string) => {
    let text = templateText || activeTemplate.text;
    if (!entry.cod) text = text.replace(/{if_cod}[\s\S]*?{\/if_cod}/gi, ''); else text = text.replace(/{if_cod}/gi, '').replace(/{\/if_cod}/gi, '');
    if (!entry.dfod) text = text.replace(/{if_dfod}[\s\S]*?{\/if_dfod}/gi, ''); else text = text.replace(/{if_dfod}/gi, '').replace(/{\/if_dfod}/gi, '');
    let msg = text.replace(/{salam}/gi, getGreeting()).replace(/{pengirim}/gi, settings.senderName||'Admin').replace(/{nama}/gi, entry.recipientName).replace(/{barang}/gi, entry.itemName||'-').replace(/{resi}/gi, entry.receiptNumber||'-').replace(/{alamat}/gi, entry.address||'-').replace(/{cod}/gi, entry.cod ? `Rp ${formatCurrency(entry.cod)}` : '-').replace(/{dfod}/gi, entry.dfod ? `Rp ${formatCurrency(entry.dfod)}` : '-');
    if (settings.useGlobalSpintax) msg = msg.replace(/{([^{}]+)}/g, (m, p1) => p1.includes('|') ? p1.split('|')[Math.floor(Math.random() * p1.split('|').length)] : m);
    if (settings.randomizeEmojis) { const emojis=['😊','🙏','📦','🚚','✨','✅','📍']; msg = msg.split(' ').map(w => Math.random()>0.9 ? w+' '+emojis[Math.floor(Math.random()*emojis.length)] : w).join(' '); }
    if (settings.addRandomSuffix) msg += `\n\n_Ref: ${Math.random().toString(36).substring(7).toUpperCase()}_`;
    if (settings.useInvisibleChars) msg = msg.split(' ').map(w => Math.random()>0.7 ? w+'\u200B' : w).join(' ');
    if (settings.randomizeFormatting) { const ps = msg.split('\n\n'); msg = ps.map((p,i) => { if(i===ps.length-1) return p; const r=Math.random(); return r>0.8?p+'\n\n\n':r>0.6?p+'\n':p+'\n\n'; }).join(''); }
    return msg;
  };

  const getWALink = (entry: BlastEntry, sentCountOverride?: number) => {
    let phone = entry.phone.replace(/\D/g,'');
    if (phone.startsWith('0')) phone = '62' + phone.slice(1);
    if (!phone.startsWith('62')) phone = '62' + phone;
    let templateText = activeTemplate.text;
    if (settings.rotateTemplates) { const count = sentCountOverride !== undefined ? sentCountOverride : entries.filter(e=>e.status==='sent').length; const variations = activeTemplate.variations?.length ? activeTemplate.variations : [activeTemplate.text]; templateText = variations[count % variations.length]; }
    const message = encodeURIComponent(generateMessage(entry, templateText));
    let link = `https://web.whatsapp.com/send?phone=${phone}&text=${message}`;
    if (settings.autoSend) link += '&autosend=true';
    link += `&entryid=${entry.id}`;
    return link;
  };

  const handleSendManual = (entry: BlastEntry) => { const w = window.open(getWALink(entry),'WAsenderTab'); if(w) window.focus(); addLog(`🚀 Manual: ${entry.recipientName}`, 'info'); updateStatus(entry.id,'sent'); };
  const addLog = (message: string, type: LogEntry['type'] = 'info') => setLogs(prev => [{ id: crypto.randomUUID(), timestamp: Date.now(), message, type }, ...prev].slice(0, 100));
  const updateStatus = (id: string, status: BlastEntry['status']) => setEntries(prev => prev.map(e => e.id===id ? {...e, status} : e));
  const toggleReceived = (id: string) => setEntries(prev => prev.map(e => e.id===id ? {...e, isReceived: !e.isReceived} : e));

  const calculateNextDelay = (sentCount: number, entry: BlastEntry) => {
    let min=settings.delay, max=settings.maxDelay, useTyping=settings.simulateTyping, useAdaptive=settings.adaptiveDelay;
    if (settings.speedMode==='safe'){min=15000;max=30000;useTyping=true;useAdaptive=true;}
    else if(settings.speedMode==='normal'){min=8000;max=15000;useTyping=true;useAdaptive=true;}
    else if(settings.speedMode==='fast'){min=3000;max=7000;useTyping=false;useAdaptive=false;}
    else if(settings.speedMode==='turbo'){min=1000;max=2000;useTyping=false;useAdaptive=false;}
    let delay = settings.randomizeDelay||settings.speedMode!=='custom' ? Math.floor(Math.random()*(max-min+1))+min : min;
    if(useAdaptive) delay += Math.floor(sentCount/10)*500;
    if(useTyping){let t=activeTemplate.text;if(settings.rotateTemplates){const v=activeTemplate.variations?.length?activeTemplate.variations:[activeTemplate.text];t=v[sentCount%v.length];}delay+=Math.min(generateMessage(entry,t).length*50,5000);}
    if(settings.batchSize>0&&sentCount>=nextBatchPauseAt&&nextBatchPauseAt>0){delay=settings.batchPause;toast(`Anti-Spam: Istirahat...`,{icon:'🛡️'});setNextBatchPauseAt(sentCount+settings.batchSize+(Math.floor(Math.random()*5)-2));}
    if(settings.longBreakAfter>0&&sentCount>0&&sentCount%settings.longBreakAfter===0){delay=settings.longBreakDuration*60*1000;setIsLongBreak(true);addLog(`😴 Long break ${settings.longBreakDuration}m...`,'warning');}else setIsLongBreak(false);
    return delay;
  };

  const startBlast = () => {
    if (!isExtensionDetected && !settings.manualMode) { toast.error('Extension tidak terdeteksi!',{icon:'🔌'}); return; }
    const pending = entries.filter(e=>e.status==='pending');
    if (pending.length===0) { toast.error('Tidak ada pesan pending'); return; }
    let toProcess = [...pending];
    if (settings.shuffleQueue) { toProcess = toProcess.sort(()=>Math.random()-0.5); setEntries(prev=>[...prev.filter(e=>e.status!=='pending'),...toProcess]); }
    const first = toProcess[0];
    addLog(`🎬 Memulai blast...`,'info');
    const w = window.open(getWALink(first),'WAsenderTab');
    if (!w) { toast.error('Popup terblokir!',{duration:8000,icon:'🚫'}); return; }
    window.focus();
    if (settings.autoSend) updateStatus(first.id,'sending');
    else { updateStatus(first.id,'sent'); setNextActionTime(Date.now()+calculateNextDelay(entries.filter(e=>e.status==='sent').length+1,toProcess[1]||first)); }
    setIsBlasting(true); setCurrentIndex(0);
    if (settings.batchSize>0) setNextBatchPauseAt(entries.filter(e=>e.status==='sent').length+settings.batchSize+(Math.floor(Math.random()*5)-2));
  };

  const stopBlast = () => { setIsBlasting(false); setCurrentIndex(-1); setNextActionTime(0); addLog(`🛑 Blast dihentikan`,'warning'); };

  useEffect(() => {
    if (!isBlasting||!settings.manualMode) return;
    // manualMode handled by keydown
  }, [isBlasting, settings.manualMode]);

  useEffect(() => {
    if (isBlasting && !settings.manualMode) {
      const sending = entries.find(e=>e.status==='sending');
      if (sending) {
        let timeout = 25000;
        if(settings.speedMode==='turbo')timeout=5000; else if(settings.speedMode==='fast')timeout=10000; else if(settings.speedMode==='normal')timeout=15000;
        const t = setTimeout(()=>{addLog(`⏭️ Auto-Next: ${sending.recipientName}`,'info');updateStatus(sending.id,'sent');const sc=entries.filter(e=>e.status==='sent').length+1;const pend=entries.filter(e=>e.status==='pending'&&e.id!==sending.id);if(pend.length>0)setNextActionTime(Date.now()+calculateNextDelay(sc,pend[0]));},timeout);
        return ()=>clearTimeout(t);
      }
    }
  }, [entries,isBlasting,settings.manualMode,settings.speedMode]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (!event.data||event.data.source!=='wasender-extension') return;
      const {type,entryId,status:waStatus} = event.data;
      if (type==='WA_STATUS_UPDATE') {
        setEntries(cur=>{
          const entry=cur.find(e=>e.id===entryId); if(!entry||entry.status==='sent') return cur;
          if(waStatus==='sent'){setConsecutiveErrors(0);setSentThisHour(p=>p+1);addLog(`✅ Terkirim: ${entry.recipientName}`,'success');const sc=cur.filter(e=>e.status==='sent').length+1;const pend=cur.filter(e=>e.status==='pending'&&e.id!==entryId);if(pend.length>0)setNextActionTime(Date.now()+calculateNextDelay(sc,pend[0]));return cur.map(e=>e.id===entryId?{...e,status:'sent'}:e);}
          else if(waStatus==='invalid'){const retries=entry.retryCount||0;if(settings.autoRetry&&retries<settings.maxRetries){addLog(`🔄 Retry ${retries+1}/${settings.maxRetries}: ${entry.recipientName}`,'warning');return cur.map(e=>e.id===entryId?{...e,status:'pending',retryCount:retries+1}:e);}else{setConsecutiveErrors(p=>p+1);addLog(`❌ Invalid: ${entry.recipientName}`,'error');return cur.map(e=>e.id===entryId?{...e,status:'failed'}:e);}}
          return cur;
        });
      } else if(type==='WA_WARNING_DETECTED'){stopBlast();addLog(`🚨 PERINGATAN SPAM!`,'error');toast.error('PERINGATAN SPAM!',{duration:10000,icon:'🚨'});}
    };
    window.addEventListener('message',handler);
    const hb = setInterval(()=>{if(lastHeartbeat>0&&Date.now()-lastHeartbeat>20000&&isExtensionDetected){setIsExtensionDetected(false);addLog(`🔌 Extension terputus`,'warning');}},5000);
    return ()=>{window.removeEventListener('message',handler);clearInterval(hb);};
  },[lastHeartbeat,isExtensionDetected,settings.autoRetry,settings.maxRetries,settings.speedMode]);

  useEffect(() => {
    const ping = (ev: MessageEvent) => { if(ev.data?.source==='wasender-extension'&&ev.data?.type==='EXTENSION_PONG'){if(!isExtensionDetected){setIsExtensionDetected(true);addLog(`🔌 Extension terdeteksi`,'success');}setLastHeartbeat(Date.now());}};
    window.addEventListener('message',ping);
    const chk=()=>{if(document.documentElement.getAttribute('data-wasender-extension')==='active'){if(!isExtensionDetected){setIsExtensionDetected(true);addLog(`🔌 Extension aktif (DOM)`,'success');}setLastHeartbeat(Date.now());}window.postMessage({type:'EXTENSION_PING'},'*');};
    const iv=setInterval(chk,2000); chk();
    return ()=>{window.removeEventListener('message',ping);clearInterval(iv);};
  },[isExtensionDetected]);

  useEffect(() => {
    if (!isBlasting||settings.manualMode){setCountdown(0);return;}
    const tick=()=>{
      const now=Date.now();
      if(now-lastHourReset>3600000){setSentThisHour(0);setLastHourReset(now);}
      if(sentThisHour>=settings.hourlyLimit){setIsBlasting(false);addLog(`⏳ Hourly limit reached`,'warning');return;}
      const pend=entries.filter(e=>e.status==='pending'), sending=entries.filter(e=>e.status==='sending');
      if(sending.length>0){setCountdown(0);return;}
      if(pend.length>0){
        const entry=pend[0];
        if(now>=nextActionTime){
          addLog(`🚀 Mengirim ke ${entry.recipientName}...`,'info');
          const w=window.open(getWALink(entry,entries.filter(e=>e.status==='sent').length),'WAsenderTab');
          if(!w){addLog(`⚠️ Popup diblokir`,'warning');setNextActionTime(Date.now()+3000);return;}
          window.focus();
          if(settings.autoSend)updateStatus(entry.id,'sending');
          else{updateStatus(entry.id,'sent');setNextActionTime(Date.now()+calculateNextDelay(entries.filter(e=>e.status==='sent').length+1,pend[1]||entry));}
        } else setCountdown(Math.max(0,Math.ceil((nextActionTime-now)/1000)));
      } else {setIsBlasting(false);addLog(`🏁 Blast selesai!`,'success');}
    };
    tick(); const iv=setInterval(tick,1000); return ()=>clearInterval(iv);
  },[isBlasting,entries,nextActionTime,settings.manualMode,settings.hourlyLimit,sentThisHour,lastHourReset]);

  useEffect(() => {
    const kd=(e:KeyboardEvent)=>{ if(isBlasting&&settings.manualMode&&(e.code==='Space'||e.code==='Enter')){e.preventDefault();const pend=entries.filter(en=>en.status==='pending');if(pend.length>0){const entry=pend[0];window.open(getWALink(entry),'WAsenderTab');updateStatus(entry.id,'sent');}}};
    window.addEventListener('keydown',kd); return ()=>window.removeEventListener('keydown',kd);
  },[isBlasting,settings.manualMode,entries]);

  const filteredEntries = useMemo(()=>entries.filter(e=>e.recipientName.toLowerCase().includes(searchQuery.toLowerCase())||e.phone.includes(searchQuery)||e.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase())),[entries,searchQuery]);

  const statsData = useMemo(()=>{
    const sent=entries.filter(e=>e.status==='sent').length, pending=entries.filter(e=>e.status==='pending').length, received=entries.filter(e=>e.isReceived).length;
    return [{name:'Sent',value:sent,color:'#3ECF8E'},{name:'Pending',value:pending,color:'#F8A93A'},{name:'Rcvd',value:received,color:'#A78BFA'}];
  },[entries]);

  const safetyScore = useMemo(()=>{
    let s=0;
    if(settings.delay>=5000)s+=20; if(settings.randomizeDelay)s+=15; if(settings.batchSize>0&&settings.batchSize<=15)s+=10;
    if(settings.useRandomGreetings)s+=5; if(settings.useInvisibleChars)s+=5; if(settings.simulateTyping)s+=10;
    if(settings.adaptiveDelay)s+=5; if(settings.rotateTemplates)s+=10; if(settings.hourlyLimit<=50)s+=10; if(settings.shuffleQueue)s+=10;
    return Math.min(100,s);
  },[settings]);

  const exportToCSV = () => {
    if (!entries.length) return;
    const headers=['Phone','Name','Item','Receipt','Status','Received','Created At'];
    const rows=entries.map(e=>[e.phone,e.recipientName,e.itemName,e.receiptNumber,e.status,e.isReceived?'YES':'NO',new Date(e.createdAt).toLocaleString()]);
    const csv=[headers,...rows].map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`wasender_${new Date().toISOString().split('T')[0]}.csv`;a.click();
    toast.success('Laporan diunduh');
  };

  // ─── Modal overlay ─────────────────────────────────────────────────────────
  const ModalOverlay = ({ onClose, children }: { onClose: () => void; children: React.ReactNode }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-xl" />
      {children}
    </div>
  );

  const sentCount = entries.filter(e=>e.status==='sent').length;
  const pendingCount = entries.filter(e=>e.status==='pending').length;

  return (
    <div className="min-h-screen bg-[#0c0c0d] text-white font-['Geist',_sans-serif] selection:bg-[#3ECF8E]/20">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&family=Geist+Mono:wght@400;500&display=swap');
        * { font-family: 'Geist', -apple-system, sans-serif; }
        .mono { font-family: 'Geist Mono', monospace; }
        input[type=range] { -webkit-appearance: none; background: transparent; }
        input[type=range]::-webkit-slider-runnable-track { height: 4px; border-radius: 99px; background: rgba(255,255,255,0.08); }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: #3ECF8E; margin-top: -5px; cursor: pointer; box-shadow: 0 0 8px rgba(62,207,142,0.5); }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
      `}</style>

      <Toaster position="top-right" toastOptions={{ style: { background:'#1a1c1e', color:'#e2e8f0', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'10px', fontSize:'13px' } }} />

      {/* ── BLASTING OVERLAY ── */}
      {isBlasting && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/85 backdrop-blur-2xl" />
          <motion.div initial={{opacity:0,scale:0.92}} animate={{opacity:1,scale:1}} className="relative max-w-sm w-full rounded-2xl border border-white/[0.08] bg-[#111214] overflow-hidden">
            <div className="h-1 w-full bg-[#1a1c1e]">
              <motion.div className="h-full bg-[#3ECF8E]" initial={{width:0}} animate={{width:`${(sentCount/Math.max(entries.length,1))*100}%`}} transition={{duration:0.5}} />
            </div>
            <div className="p-8 text-center space-y-6">
              <div className="relative w-20 h-20 mx-auto">
                <svg className="w-full h-full -rotate-90">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3"/>
                  <motion.circle cx="40" cy="40" r="34" fill="none" stroke="#3ECF8E" strokeWidth="3" strokeLinecap="round"
                    initial={{pathLength:0}} animate={{pathLength:sentCount/Math.max(entries.length,1)}} transition={{duration:0.5}}
                    strokeDasharray="213.63" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  {isLongBreak ? <span className="text-2xl">😴</span> : <Play size={22} className="text-[#3ECF8E] fill-[#3ECF8E]" />}
                </div>
              </div>

              <div>
                <h3 className="text-base font-semibold text-white/90">{isLongBreak?'Long Break Active':entries.some(e=>e.status==='sending')?'Menunggu WhatsApp Web...':'Sending Messages'}</h3>
                <p className="text-sm text-white/40 mt-1"><span className="text-[#3ECF8E] font-bold">{sentCount}</span> / {entries.length} pesan terkirim</p>
              </div>

              {!settings.manualMode ? (
                <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] px-6 py-4">
                  <div className={cn("text-4xl font-black mono tabular-nums", isLongBreak?"text-amber-400":entries.some(e=>e.status==='sending')?"text-blue-400 animate-pulse":"text-[#3ECF8E]")}>
                    {entries.some(e=>e.status==='sending')?'–:––':`${Math.floor(countdown/60)}:${(countdown%60).toString().padStart(2,'0')}`}
                  </div>
                  <p className="text-[10px] text-white/30 uppercase tracking-widest mt-1">{entries.some(e=>e.status==='sending')?'Processing':'Next message in'}</p>
                  {Date.now()>=nextActionTime&&pendingCount>0&&!entries.some(e=>e.status==='sending')&&(
                    <button onClick={()=>{const pend=entries.filter(e=>e.status==='pending');if(pend.length>0){const entry=pend[0];const sc=sentCount;const w=window.open(getWALink(entry,sc),'WAsenderTab');if(w){window.focus();if(settings.autoSend)updateStatus(entry.id,'sending');else{updateStatus(entry.id,'sent');setNextActionTime(Date.now()+calculateNextDelay(sc+1,entries.filter(e=>e.status==='pending')[1]||entry));}}}}}
                      className="mt-3 w-full py-2 rounded-lg border border-amber-400/30 bg-amber-400/10 text-amber-400 text-xs font-semibold flex items-center justify-center gap-2 hover:bg-amber-400/20 transition-colors">
                      <Play size={12} fill="currentColor" /> Tab tidak terbuka? Klik di sini
                    </button>
                  )}
                </div>
              ) : (
                <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] px-4 py-3">
                  <div className="text-[11px] font-bold text-[#3ECF8E] uppercase tracking-widest mb-1">Mode Manual Aktif</div>
                  <p className="text-xs text-white/40">Tekan [SPASI] untuk kirim berikutnya</p>
                </div>
              )}

              <p className="text-[10px] text-amber-400/80 font-medium">Tekan [ENTER] di tab WhatsApp untuk mengirim</p>

              <div className="space-y-2">
                {entries.some(e=>e.status==='sending')&&(
                  <button onClick={()=>{const s=entries.find(e=>e.status==='sending');if(s){addLog(`⏭️ Paksa lanjut: ${s.recipientName}`,'warning');updateStatus(s.id,'sent');}}}
                    className="w-full py-2.5 rounded-xl border border-blue-400/20 bg-blue-400/10 text-blue-400 text-sm font-semibold hover:bg-blue-400/20 transition-colors">
                    Paksa Lanjut
                  </button>
                )}
                <button onClick={()=>{const p=entries.filter(e=>e.status==='pending');if(p.length>0){const entry=p[0];const w=window.open(getWALink(entry),'WAsenderTab');if(w)window.focus();updateStatus(entry.id,'sent');}}}
                  className="w-full py-2.5 rounded-xl border border-white/10 bg-white/[0.04] text-white/70 text-sm font-semibold hover:bg-white/[0.08] transition-colors">
                  Kirim Manual
                </button>
                <button onClick={stopBlast} className="w-full py-2.5 rounded-xl border border-red-400/20 bg-red-400/10 text-red-400 text-sm font-semibold hover:bg-red-400/20 transition-colors">
                  Berhenti
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#0c0c0d]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-[#3ECF8E] flex items-center justify-center">
              <Send size={13} className="text-[#0c0c0d]" />
            </div>
            <span className="text-[14px] font-semibold tracking-tight">WAsender <span className="text-[#3ECF8E]">PRO</span></span>
            <span className="hidden sm:block text-[11px] text-white/25 border-l border-white/10 pl-3 ml-1">Advanced Blast Engine</span>
          </div>

          <div className="flex items-center gap-2">
            {!isExtensionDetected && (
              <button onClick={downloadExtensionZip} className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-400/20 bg-amber-400/8 text-amber-400 text-xs font-medium hover:bg-amber-400/15 transition-colors">
                <Puzzle size={12} /> Setup Extension
              </button>
            )}
            <div className={cn("hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium", isExtensionDetected?"border-[#3ECF8E]/20 bg-[#3ECF8E]/8 text-[#3ECF8E]":"border-white/[0.06] text-white/30")}>
              <div className={cn("w-1.5 h-1.5 rounded-full", isExtensionDetected?"bg-[#3ECF8E] animate-pulse":"bg-white/20")} />
              {isExtensionDetected?"Extension Connected":"Disconnected"}
            </div>
            <button onClick={exportToCSV} className="p-2 rounded-lg border border-white/[0.06] text-white/40 hover:text-white/70 hover:border-white/[0.12] transition-colors" title="Export CSV"><Download size={14} /></button>
            <button onClick={handleResetDefault} className="p-2 rounded-lg border border-white/[0.06] text-white/40 hover:text-red-400 hover:border-red-400/20 transition-colors" title="Reset"><RotateCcw size={14} /></button>
            <button onClick={() => setShowSettingsModal(true)} className="p-2 rounded-lg border border-white/[0.06] text-white/40 hover:text-white/70 hover:border-white/[0.12] transition-colors"><Settings2 size={14} /></button>

            {/* START/STOP button */}
            <button onClick={isBlasting?stopBlast:startBlast} disabled={entries.length===0}
              className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all disabled:opacity-30",
                isBlasting?"border border-red-400/20 bg-red-400/10 text-red-400 hover:bg-red-400/20":"bg-[#3ECF8E] text-[#0c0c0d] hover:bg-[#3ECF8E]/90 active:scale-[0.98]")}>
              {isBlasting?<><Square size={13} fill="currentColor"/> Stop Blast</>:<><Play size={13} fill="currentColor"/> Start Engine</>}
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN BENTO GRID ── */}
      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* ── ROW 1: Overview cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
          
          {/* Stats Card */}
          <BentoCard className="relative h-52 md:col-span-1">
            <div className="absolute inset-0 p-5 z-10">
              <SectionLabel icon={BarChart3} label="Statistics" />
              <SubLabel>Ringkasan data blast</SubLabel>
            </div>
            <DecoStatsGrid data={statsData} />
          </BentoCard>

          {/* Engine Settings Card */}
          <BentoCard className="h-52 p-5">
            <SectionLabel icon={Timer} label="Engine Settings" />
            <SubLabel>Atur kecepatan dan nama pengirim.</SubLabel>
            <div className="mt-4 space-y-3">
              <Input value={settings.senderName} onChange={e=>setSettings(p=>({...p,senderName:e.target.value}))} placeholder="Nama Pengirim (misal: Admin JNT)" />
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[11px] text-white/40">Blast Delay</span>
                  <span className="text-[11px] mono text-[#3ECF8E] font-semibold">{settings.delay/1000}s</span>
                </div>
                <input type="range" min="1000" max="10000" step="500" value={settings.delay} onChange={e=>setSettings(p=>({...p,delay:parseInt(e.target.value)}))} className="w-full" />
              </div>
            </div>
          </BentoCard>

          {/* Blast Controls Card */}
          <BentoCard className="relative h-52 p-5">
            <SectionLabel icon={Zap} label="Blast Controls" />
            <SubLabel>Jalankan atau hentikan engine.</SubLabel>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <DecoBlastNodes />
            </div>
            <div className="absolute bottom-5 left-5 right-5 space-y-2 z-10">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-white/40">Pending</span>
                <span className="text-amber-400 font-semibold mono">{pendingCount}</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div className="h-full bg-[#3ECF8E] rounded-full transition-all duration-500" style={{width:`${entries.length?((sentCount/entries.length)*100):0}%`}} />
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-white/40">{sentCount} terkirim</span>
                <span className={cn("font-semibold", isBlasting?"text-[#3ECF8E] animate-pulse":"text-white/30")}>{isBlasting?"● Active":"○ Idle"}</span>
              </div>
            </div>
          </BentoCard>

          {/* Extension Status Card */}
          <BentoCard className="relative h-52 p-5 overflow-hidden">
            <SectionLabel icon={Puzzle} label="Extension" />
            <SubLabel>{isExtensionDetected ? "Terhubung dan aktif." : "Belum terdeteksi."}</SubLabel>
            <DecoExtensionDots connected={isExtensionDetected} />
            <div className="absolute top-5 right-5">
              <div className={cn("px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider", isExtensionDetected?"bg-[#3ECF8E]/15 text-[#3ECF8E]":"bg-white/[0.06] text-white/30")}>
                {isExtensionDetected?"Active":"Offline"}
              </div>
            </div>
            {!isExtensionDetected && (
              <button onClick={downloadExtensionZip} className="absolute bottom-5 left-5 right-5 py-2 rounded-lg bg-[#3ECF8E]/10 border border-[#3ECF8E]/20 text-[#3ECF8E] text-xs font-semibold hover:bg-[#3ECF8E]/20 transition-colors flex items-center justify-center gap-2">
                <Download size={12} /> Download Extension
              </button>
            )}
          </BentoCard>
        </div>

        {/* ── ROW 2: Main content ── */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 mb-4">

          {/* Template Editor — large card */}
          <BentoCard className="xl:col-span-5 p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <SectionLabel icon={MessageSquare} label="Message Templates" />
                <SubLabel>Edit dan kelola template pesan blast.</SubLabel>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-[#3ECF8E] font-bold animate-pulse">● auto-saved</span>
                <button onClick={()=>{const def=DEFAULT_TEMPLATES.find(t=>t.id===activeTemplateId);if(def&&confirm('Reset ke default?')){setTemplates(p=>p.map(t=>t.id===activeTemplateId?{...def}:t));setActiveVariationIndex(0);toast.success('Template direset');}}}
                  className="p-1.5 rounded-lg text-white/25 hover:text-amber-400 hover:bg-amber-400/10 transition-colors"><History size={13}/></button>
              </div>
            </div>

            {/* Template tabs */}
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {templates.map(t=>(
                <button key={t.id} onClick={()=>{setActiveTemplateId(t.id);setActiveVariationIndex(0);}}
                  className={cn("whitespace-nowrap px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all",
                    activeTemplateId===t.id?"bg-[#3ECF8E]/15 border-[#3ECF8E]/30 text-[#3ECF8E]":"border-white/[0.06] text-white/40 hover:text-white/70 hover:border-white/[0.12]")}>
                  {t.name}
                </button>
              ))}
            </div>

            {/* Variation selector */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-white/30">Variasi:</span>
              {[0,1,2].map(i=>(
                <button key={i} onClick={()=>setActiveVariationIndex(i)}
                  className={cn("w-7 h-7 rounded-lg text-[11px] font-bold border transition-all",
                    activeVariationIndex===i?"bg-[#3ECF8E]/15 border-[#3ECF8E]/30 text-[#3ECF8E]":"border-white/[0.06] text-white/30 hover:border-white/[0.12]")}>{i+1}
                </button>
              ))}
              <span className="ml-auto text-[10px] text-white/20">{settings.rotateTemplates?"Rotasi ✓":"Rotasi ✗"}</span>
            </div>

            <textarea value={currentTemplateText} onChange={e=>updateActiveTemplateText(e.target.value)}
              className="w-full h-32 px-3.5 py-3 text-[13px] mono bg-[#0f1012] border border-white/[0.08] rounded-xl text-white/80 placeholder:text-white/20 outline-none focus:border-[#3ECF8E]/30 resize-none leading-relaxed transition-colors"
              placeholder="Tulis template pesan..." />

            <div className="flex flex-wrap gap-1">
              {['{salam}','{pengirim}','{nama}','{barang}','{resi}','{alamat}','{cod}','{dfod}','{if_cod}','{/if_cod}','{if_dfod}','{/if_dfod}'].map(tag=>(
                <button key={tag} onClick={()=>updateActiveTemplateText(currentTemplateText+' '+tag)}
                  className="text-[9px] mono px-2 py-1 rounded-md border border-white/[0.06] text-[#3ECF8E]/60 hover:text-[#3ECF8E] hover:border-[#3ECF8E]/20 transition-colors bg-[#3ECF8E]/[0.03]">
                  {tag}
                </button>
              ))}
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-500/[0.06] border border-blue-400/[0.12]">
              <Sparkles size={13} className="text-blue-400 mt-0.5 shrink-0"/>
              <p className="text-[11px] text-blue-300/60 leading-relaxed">
                <span className="text-blue-400 font-medium">Spintax:</span> Gunakan <span className="mono bg-blue-400/10 px-1 rounded text-blue-300">{"{Halo|Hai|Pagi}"}</span> untuk variasi pesan otomatis anti-ban.
              </p>
            </div>
          </BentoCard>

          {/* Add Entry Form */}
          <BentoCard className="xl:col-span-7 p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <SectionLabel icon={Plus} label="Tambah Data" />
                <SubLabel>Input data penerima secara manual atau bulk import.</SubLabel>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={()=>setShowBulkModal(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/[0.08] text-white/50 hover:text-white/80 hover:border-white/[0.15] text-[12px] font-medium transition-colors">
                  <FileSpreadsheet size={13}/> Bulk Import
                </button>
                <button onClick={()=>setShowPreviewModal(true)} disabled={pendingCount===0} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/[0.08] text-white/50 hover:text-white/80 hover:border-white/[0.15] text-[12px] font-medium transition-colors disabled:opacity-30">
                  <Search size={13}/> Preview
                </button>
              </div>
            </div>
            <form onSubmit={handleAddEntry} className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-[10px] text-white/30 font-medium uppercase tracking-wider mb-1.5">Phone *</label><Input value={formData.phone} onChange={e=>setFormData(p=>({...p,phone:e.target.value}))} placeholder="0812..." /></div>
                <div><label className="block text-[10px] text-white/30 font-medium uppercase tracking-wider mb-1.5">Nama *</label><Input value={formData.recipientName} onChange={e=>setFormData(p=>({...p,recipientName:e.target.value}))} placeholder="Nama Penerima" /></div>
                <div><label className="block text-[10px] text-white/30 font-medium uppercase tracking-wider mb-1.5">Barang</label><Input value={formData.itemName} onChange={e=>setFormData(p=>({...p,itemName:e.target.value}))} placeholder="Nama Barang" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-[10px] text-white/30 font-medium uppercase tracking-wider mb-1.5">Resi</label><Input value={formData.receiptNumber} onChange={e=>setFormData(p=>({...p,receiptNumber:e.target.value}))} placeholder="No. Resi" /></div>
                <div className="col-span-2"><label className="block text-[10px] text-white/30 font-medium uppercase tracking-wider mb-1.5">Alamat</label><Input value={formData.address} onChange={e=>setFormData(p=>({...p,address:e.target.value}))} placeholder="Alamat Lengkap" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3 items-end">
                <div><label className="block text-[10px] text-white/30 font-medium uppercase tracking-wider mb-1.5">COD</label><Input value={formData.cod} onChange={e=>setFormData(p=>({...p,cod:e.target.value.replace(/[^0-9.,]/g,'')}))} placeholder="274,398" /></div>
                <div><label className="block text-[10px] text-white/30 font-medium uppercase tracking-wider mb-1.5">DFOD</label><Input value={formData.dfod} onChange={e=>setFormData(p=>({...p,dfod:e.target.value.replace(/[^0-9.,]/g,'')}))} placeholder="10,000" /></div>
                <button type="submit" className="py-2.5 bg-[#3ECF8E] text-[#0c0c0d] rounded-lg font-semibold text-[13px] flex items-center justify-center gap-2 hover:bg-[#3ECF8E]/90 active:scale-[0.98] transition-all">
                  <Plus size={15}/> Add to Queue
                </button>
              </div>
            </form>

            {/* Alert */}
            {!isBlasting && entries.length > 0 && (
              <div className="mt-3 flex items-start gap-2.5 p-3 rounded-xl bg-amber-400/[0.06] border border-amber-400/[0.12]">
                <AlertCircle size={13} className="text-amber-400 mt-0.5 shrink-0"/>
                <p className="text-[11px] text-amber-300/60 leading-relaxed">
                  <span className="text-amber-400 font-medium">Penting:</span> Izinkan popup di browser. Tab WhatsApp Web akan terbuka otomatis saat blast dimulai.
                </p>
              </div>
            )}
          </BentoCard>
        </div>

        {/* ── ROW 3: Console + Queue ── */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">

          {/* Console */}
          <BentoCard className="xl:col-span-4 relative h-64 overflow-hidden">
            <div className="absolute inset-0 p-5 z-10 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/60"/>
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60"/>
                    <div className="w-2.5 h-2.5 rounded-full bg-[#3ECF8E]/60"/>
                  </div>
                  <span className="text-[11px] text-white/30 font-medium">System Console</span>
                </div>
                <button onClick={()=>setLogs([])} className="text-[9px] text-white/20 hover:text-white/50 transition-colors uppercase tracking-wider">Clear</button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-0.5">
                {logs.length===0?(
                  <p className="text-[11px] mono text-white/15 italic">$ Waiting for system actions...</p>
                ):logs.map(log=>(
                  <div key={log.id} className="flex gap-2 text-[10px] mono leading-relaxed">
                    <span className="text-white/20 shrink-0">[{new Date(log.timestamp).toLocaleTimeString([],{hour12:false})}]</span>
                    <span className={cn("break-all", log.type==='success'?"text-[#3ECF8E]":log.type==='error'?"text-red-400":log.type==='warning'?"text-amber-400":"text-blue-400")}>{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Decorative BG */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
              <div className="p-5 pt-14 space-y-1 font-mono text-[10px] text-green-400">
                {['$ blast --start --mode=auto','> Connecting to WA Web...','> Sending message [1/24]','> Status: sent ✓','> Delay: 8.3s'].map((l,i)=><div key={i}>{l}</div>)}
              </div>
            </div>
          </BentoCard>

          {/* Queue Management — wide */}
          <BentoCard className="xl:col-span-8 overflow-hidden">
            <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <SectionLabel icon={FileText} label="Queue Management" />
                  <SubLabel>Kelola antrean pesan yang akan dikirim.</SubLabel>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-white/[0.06] text-[10px] text-white/40 font-medium">{filteredEntries.length} items</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30"/>
                  <Input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Cari..." className="pl-8 py-2 text-[12px] w-44" />
                </div>
                {isConfirmingClear?(
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-red-400 font-medium">Hapus semua?</span>
                    <button onClick={clearAll} className="px-2 py-1 text-[10px] bg-red-500 text-white rounded-md font-semibold">Ya</button>
                    <button onClick={()=>setIsConfirmingClear(false)} className="px-2 py-1 text-[10px] bg-white/[0.06] text-white/50 rounded-md font-semibold">Batal</button>
                  </div>
                ):(
                  <button onClick={()=>setIsConfirmingClear(true)} className="p-2 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-colors"><Trash2 size={13}/></button>
                )}
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-[#0f1012]">
                  <tr>
                    {['Penerima','Detail','Status','Diterima',''].map(h=>(
                      <th key={h} className="px-4 py-2.5 text-[9px] font-semibold uppercase tracking-widest text-white/25">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  <AnimatePresence mode="popLayout">
                    {filteredEntries.length===0?(
                      <motion.tr initial={{opacity:0}} animate={{opacity:1}}>
                        <td colSpan={5} className="px-4 py-12 text-center text-[13px] text-white/20 italic">Belum ada data. Tambahkan atau import dari Excel.</td>
                      </motion.tr>
                    ):filteredEntries.map((entry,idx)=>(
                      <motion.tr key={entry.id} layout initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,x:-8}}
                        className={cn("group transition-colors", isBlasting&&idx===currentIndex?"bg-[#3ECF8E]/[0.04]":"hover:bg-white/[0.02]")}>
                        <td className="px-4 py-3">
                          <div className="text-[13px] font-medium text-white/85">{entry.recipientName}</div>
                          <div className="text-[11px] mono text-white/30 mt-0.5">{entry.phone}</div>
                        </td>
                        <td className="px-4 py-3 max-w-[160px]">
                          <div className="text-[12px] text-white/60 truncate">{entry.itemName||'–'}</div>
                          <div className="text-[10px] mono text-white/25 mt-0.5">{entry.receiptNumber||'–'}</div>
                          <div className="flex gap-1.5 mt-1 flex-wrap">
                            {entry.cod&&<span className="text-[9px] font-semibold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">COD {formatCurrency(entry.cod)}</span>}
                            {entry.dfod&&<span className="text-[9px] font-semibold text-violet-400 bg-violet-400/10 px-1.5 py-0.5 rounded">DFOD {formatCurrency(entry.dfod)}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border",
                            entry.status==='sent'?"bg-[#3ECF8E]/10 border-[#3ECF8E]/20 text-[#3ECF8E]":
                            entry.status==='sending'?"bg-blue-400/10 border-blue-400/20 text-blue-400 animate-pulse":
                            entry.status==='failed'?"bg-red-400/10 border-red-400/20 text-red-400":
                            "bg-amber-400/10 border-amber-400/20 text-amber-400")}>
                            {entry.status==='sent'?<CheckCircle2 size={9}/>:entry.status==='sending'?<Loader2 size={9} className="animate-spin"/>:entry.status==='failed'?<AlertCircle size={9}/>:<Clock size={9}/>}
                            {entry.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={()=>toggleReceived(entry.id)}
                            className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all",
                              entry.isReceived?"bg-violet-400/10 border-violet-400/20 text-violet-400":"border-white/[0.06] text-white/25 hover:border-white/[0.12]")}>
                            <div className={cn("w-2.5 h-2.5 rounded flex items-center justify-center border",entry.isReceived?"bg-violet-500 border-violet-500":"border-white/25")}>
                              {entry.isReceived&&<CheckCircle2 size={7} className="text-white"/>}
                            </div>
                            {entry.isReceived?'Diterima':'Belum'}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={()=>handleSendManual(entry)} className="p-1.5 rounded-lg text-white/25 hover:text-[#3ECF8E] hover:bg-[#3ECF8E]/10 transition-colors"><ExternalLink size={12}/></button>
                            <button onClick={()=>setEntries(p=>p.filter(e=>e.id!==entry.id))} className="p-1.5 rounded-lg text-white/25 hover:text-red-400 hover:bg-red-400/10 transition-colors"><Trash2 size={12}/></button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </BentoCard>
        </div>
      </main>

      {/* ══════════════ MODALS ══════════════ */}

      {/* Bulk Import */}
      <AnimatePresence>
        {showBulkModal && (
          <ModalOverlay onClose={()=>setShowBulkModal(false)}>
            <motion.div initial={{opacity:0,scale:0.96,y:16}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.96}}
              className="relative w-full max-w-2xl max-h-[90vh] rounded-2xl border border-white/[0.08] bg-[#111214] overflow-hidden flex flex-col shadow-2xl">
              <div className="p-6 border-b border-white/[0.06] flex items-center justify-between bg-[#0f1012]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#3ECF8E]/10 border border-[#3ECF8E]/20 flex items-center justify-center"><FileSpreadsheet size={15} className="text-[#3ECF8E]"/></div>
                  <div><p className="text-[14px] font-semibold">Bulk Import</p><p className="text-[11px] text-white/30">Copy-paste dari Excel atau CSV</p></div>
                </div>
                <button onClick={()=>setShowBulkModal(false)} className="p-2 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors"><X size={16}/></button>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-[#3ECF8E]/[0.05] border border-[#3ECF8E]/[0.12]">
                    <p className="text-[10px] font-semibold text-[#3ECF8E] uppercase tracking-widest mb-1">Format Kolom</p>
                    <p className="text-[11px] text-white/40">No, Resi, Nama, HP, Alamat, Tanda, COD, DFOD, Barang</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-blue-500/[0.05] border border-blue-400/[0.12]">
                    <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-widest mb-1">Cara Pakai</p>
                    <p className="text-[11px] text-white/40">Select range di Excel → Copy → Paste di bawah</p>
                  </div>
                </div>
                <textarea value={bulkData} onChange={e=>setBulkData(e.target.value)}
                  placeholder="1	JX123456789	Budi Santoso	08123456789	Jl. Merdeka No. 1	COD	150000	0	Sepatu..."
                  className="w-full h-52 px-4 py-3 text-[12px] mono bg-[#0c0c0d] border border-white/[0.08] rounded-xl text-white/70 placeholder:text-white/15 outline-none focus:border-[#3ECF8E]/30 resize-none transition-colors"/>
                <div className="flex gap-3">
                  <button onClick={()=>setShowBulkModal(false)} className="flex-1 py-3 rounded-xl border border-white/[0.08] text-white/40 text-[13px] font-semibold hover:bg-white/[0.04] transition-colors">Batal</button>
                  <button onClick={handleBulkImport} className="flex-[2] py-3 rounded-xl bg-[#3ECF8E] text-[#0c0c0d] text-[13px] font-semibold hover:bg-[#3ECF8E]/90 transition-colors">Import Data</button>
                </div>
              </div>
            </motion.div>
          </ModalOverlay>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreviewModal && (
          <ModalOverlay onClose={()=>setShowPreviewModal(false)}>
            <motion.div initial={{opacity:0,scale:0.96,y:16}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.96}}
              className="relative w-full max-w-lg max-h-[90vh] rounded-2xl border border-white/[0.08] bg-[#111214] overflow-hidden flex flex-col shadow-2xl">
              <div className="p-6 border-b border-white/[0.06] flex items-center justify-between bg-[#0f1012]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-400/10 border border-blue-400/20 flex items-center justify-center"><MessageSquare size={15} className="text-blue-400"/></div>
                  <div><p className="text-[14px] font-semibold">Message Preview</p><p className="text-[11px] text-white/30">Preview pesan yang akan dikirim</p></div>
                </div>
                <button onClick={()=>setShowPreviewModal(false)} className="p-2 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors"><X size={16}/></button>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                {entries.find(e=>e.status==='pending')?(
                  <>
                    <div className="p-4 rounded-xl bg-[#0f1012] border border-white/[0.06]">
                      <div className="flex items-center gap-2.5 mb-3">
                        <div className="w-8 h-8 rounded-xl bg-[#3ECF8E] flex items-center justify-center text-[#0c0c0d] text-sm font-bold">
                          {entries.find(e=>e.status==='pending')?.recipientName.charAt(0)}
                        </div>
                        <div>
                          <div className="text-[13px] font-semibold">{entries.find(e=>e.status==='pending')?.recipientName}</div>
                          <div className="text-[11px] mono text-white/35">{entries.find(e=>e.status==='pending')?.phone}</div>
                        </div>
                      </div>
                      <div className="p-3.5 rounded-lg bg-[#0c0c0d] border border-white/[0.06] text-[12px] whitespace-pre-wrap leading-relaxed text-white/65">
                        {(()=>{const entry=entries.find(e=>e.status==='pending');if(!entry)return'';const sc=entries.filter(e=>e.status==='sent').length;let t=activeTemplate.text;if(settings.rotateTemplates){const v=activeTemplate.variations?.length?activeTemplate.variations:[activeTemplate.text];t=v[sc%v.length];}return generateMessage(entry,t);})()}
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={()=>setShowPreviewModal(false)} className="flex-1 py-3 rounded-xl border border-white/[0.08] text-white/40 text-[13px] font-semibold hover:bg-white/[0.04] transition-colors">Tutup</button>
                      <button onClick={()=>{const entry=entries.find(e=>e.status==='pending');if(entry){const sc=entries.filter(e=>e.status==='sent').length;const w=window.open(getWALink(entry,sc),'WAsenderTab');if(w)window.focus();updateStatus(entry.id,'sent');setShowPreviewModal(false);}}}
                        className="flex-1 py-3 rounded-xl bg-[#3ECF8E] text-[#0c0c0d] text-[13px] font-semibold hover:bg-[#3ECF8E]/90 flex items-center justify-center gap-2 transition-colors">
                        <Send size={14}/> Send Now
                      </button>
                    </div>
                  </>
                ):(
                  <div className="py-16 text-center">
                    <Clock size={40} className="mx-auto text-white/10 mb-3"/>
                    <p className="text-[13px] text-white/25 italic">Tidak ada pesan pending.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </ModalOverlay>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettingsModal && (
          <ModalOverlay onClose={()=>setShowSettingsModal(false)}>
            <motion.div initial={{opacity:0,scale:0.96,y:16}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.96}}
              className="relative w-full max-w-md max-h-[90vh] rounded-2xl border border-white/[0.08] bg-[#111214] overflow-hidden flex flex-col shadow-2xl">
              <div className="p-6 border-b border-white/[0.06] flex items-center justify-between bg-[#0f1012]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#3ECF8E]/10 border border-[#3ECF8E]/20 flex items-center justify-center"><Settings2 size={15} className="text-[#3ECF8E]"/></div>
                  <div><p className="text-[14px] font-semibold">Settings</p><p className="text-[11px] text-white/30">Konfigurasi engine</p></div>
                </div>
                <button onClick={()=>setShowSettingsModal(false)} className="p-2 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors"><X size={16}/></button>
              </div>

              {/* Tabs */}
              <div className="flex gap-4 px-6 pt-4 border-b border-white/[0.06]">
                {(['general','antispam'] as const).map(tab=>(
                  <button key={tab} onClick={()=>setActiveSettingsTab(tab)} className={cn("pb-3 text-[12px] font-semibold transition-all relative", activeSettingsTab===tab?"text-white":"text-white/35 hover:text-white/60")}>
                    {tab==='general'?'General':'Anti-Spam'}
                    {activeSettingsTab===tab&&<motion.div layoutId="stab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#3ECF8E] rounded-full"/>}
                  </button>
                ))}
              </div>

              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                {activeSettingsTab==='antispam'&&(
                  <div className="p-4 rounded-xl bg-[#3ECF8E]/[0.05] border border-[#3ECF8E]/[0.12]">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-[11px] font-semibold text-[#3ECF8E]"><Shield size={12}/> Safety Score</div>
                      <span className={cn("text-[12px] font-black mono", safetyScore>80?"text-[#3ECF8E]":safetyScore>50?"text-amber-400":"text-red-400")}>{safetyScore}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                      <motion.div initial={{width:0}} animate={{width:`${safetyScore}%`}}
                        className={cn("h-full rounded-full", safetyScore>80?"bg-[#3ECF8E]":safetyScore>50?"bg-amber-400":"bg-red-500")} />
                    </div>
                    <p className="text-[10px] text-white/30 mt-2">{safetyScore>80?"Sangat aman":safetyScore>50?"Cukup aman, tambah variasi":"Beresiko tinggi!"}</p>
                  </div>
                )}

                {activeSettingsTab==='general'?(
                  <div className="space-y-4">
                    <div><label className="block text-[11px] text-white/35 font-medium mb-1.5">Nama Pengirim</label><Input value={settings.senderName} onChange={e=>setSettings(p=>({...p,senderName:e.target.value}))} placeholder="Admin JNT"/></div>

                    <div>
                      <label className="block text-[11px] text-white/35 font-medium mb-2.5"><Zap size={11} className="inline mr-1 text-amber-400"/>Kecepatan Blast</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[{id:'safe',icon:'🛡️',label:'Main Aman',desc:'15–30s'},{id:'normal',icon:'⚖️',label:'Normal',desc:'8–15s'},{id:'fast',icon:'⚡',label:'Percepat',desc:'3–7s'},{id:'turbo',icon:'🚀',label:'Turbo',desc:'1–2s'}].map(m=>(
                          <button key={m.id} onClick={()=>setSettings(p=>({...p,speedMode:m.id as any}))}
                            className={cn("p-3 rounded-xl border text-left transition-all",settings.speedMode===m.id?"border-[#3ECF8E]/30 bg-[#3ECF8E]/[0.08]":"border-white/[0.06] hover:border-white/[0.12] bg-white/[0.02]")}>
                            <div className="flex justify-between"><span>{m.icon}</span>{settings.speedMode===m.id&&<div className="w-1.5 h-1.5 rounded-full bg-[#3ECF8E] mt-0.5"/>}</div>
                            <div className="text-[12px] font-semibold mt-1">{m.label}</div>
                            <div className="text-[10px] text-white/35">{m.desc}</div>
                          </button>
                        ))}
                        <button onClick={()=>setSettings(p=>({...p,speedMode:'custom'}))}
                          className={cn("col-span-2 p-3 rounded-xl border text-left transition-all",settings.speedMode==='custom'?"border-[#3ECF8E]/30 bg-[#3ECF8E]/[0.08]":"border-white/[0.06] hover:border-white/[0.12] bg-white/[0.02]")}>
                          <div className="flex justify-between items-center"><span className="text-[12px] font-semibold">⚙️ Custom</span>{settings.speedMode==='custom'&&<div className="w-1.5 h-1.5 rounded-full bg-[#3ECF8E]"/>}</div>
                        </button>
                      </div>
                    </div>

                    {settings.speedMode==='custom'&&(
                      <div><label className="block text-[11px] text-white/35 font-medium mb-1.5">Blast Delay (ms)</label><Input type="number" value={settings.delay} onChange={e=>setSettings(p=>({...p,delay:parseInt(e.target.value)||1000}))} min="1000" step="500"/></div>
                    )}

                    {[{key:'manualMode',label:'Mode Manual',desc:'Kirim saat klik/Spasi.'},{key:'autoRetry',label:'Auto Retry',desc:'Coba ulang jika gagal.'}].map(item=>(
                      <div key={item.key} className="flex items-center justify-between p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                        <div><div className="text-[12px] font-medium">{item.label}</div><div className="text-[10px] text-white/30 mt-0.5">{item.desc}</div></div>
                        <Toggle checked={!!settings[item.key as keyof AppSettings]} onChange={()=>setSettings(p=>({...p,[item.key]:!p[item.key as keyof AppSettings]}))}/>
                      </div>
                    ))}

                    {settings.autoRetry&&(
                      <div><label className="block text-[11px] text-white/35 font-medium mb-1.5">Max Retries</label><Input type="number" value={settings.maxRetries} onChange={e=>setSettings(p=>({...p,maxRetries:parseInt(e.target.value)||1}))} min="1" max="10"/></div>
                    )}

                    <button onClick={()=>{if(window.confirm('Reset semua template ke default?')){setTemplates(DEFAULT_TEMPLATES);setActiveTemplateId(DEFAULT_TEMPLATES[0].id);setActiveVariationIndex(0);toast.success('Template dipulihkan');}}}
                      className="w-full py-2.5 rounded-xl border border-white/[0.08] text-white/40 text-[12px] font-medium hover:bg-white/[0.04] transition-colors flex items-center justify-center gap-2">
                      <RotateCcw size={12}/> Restore Default Templates
                    </button>
                  </div>
                ):(
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                      <div><div className="text-[12px] font-medium">Randomize Delay</div><div className="text-[10px] text-white/30 mt-0.5">Jeda waktu acak anti-bot.</div></div>
                      <Toggle checked={settings.randomizeDelay} onChange={()=>setSettings(p=>({...p,randomizeDelay:!p.randomizeDelay}))}/>
                    </div>
                    {settings.randomizeDelay&&(
                      <div><label className="block text-[11px] text-white/35 font-medium mb-1.5">Max Delay (ms)</label><Input type="number" value={settings.maxDelay} onChange={e=>setSettings(p=>({...p,maxDelay:parseInt(e.target.value)||10000}))} step="500"/></div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      {[{k:'batchSize',l:'Batch Size',d:'Jeda tiap X pesan',ph:'10'},{k:'batchPause',l:'Pause (ms)',d:'Lama istirahat',ph:'30000'},{k:'hourlyLimit',l:'Hourly Limit',d:'Maks/jam',ph:'50'},{k:'stopOnConsecutiveErrors',l:'Stop Errors',d:'Stop jika X gagal',ph:'3'},{k:'longBreakAfter',l:'Long Break',d:'Break tiap X',ph:'25'},{k:'longBreakDuration',l:'Duration (min)',d:'Lama break',ph:'10'}].map(item=>(
                        <div key={item.k}><label className="block text-[10px] text-white/30 font-medium uppercase tracking-wider mb-1">{item.l}</label><Input type="number" value={settings[item.k as keyof AppSettings] as number} onChange={e=>setSettings(p=>({...p,[item.k]:parseInt(e.target.value)||0}))} placeholder={item.ph} className="py-2 text-[12px]"/><p className="text-[9px] text-white/20 mt-0.5">{item.d}</p></div>
                      ))}
                    </div>
                    <div className="space-y-1.5">
                      {[{k:'shuffleQueue',l:'Shuffle Queue',d:'Acak urutan antrean.'},{k:'useRandomGreetings',l:'Random Greetings',d:'Variasi sapaan otomatis.'},{k:'addRandomSuffix',l:'Random Suffix',d:'Tambah Ref ID unik.'},{k:'useInvisibleChars',l:'Invisible Chars',d:'Sisipkan karakter tak terlihat.'},{k:'simulateTyping',l:'Simulate Typing',d:'Jeda sesuai panjang pesan.'},{k:'adaptiveDelay',l:'Adaptive Delay',d:'Delay naik seiring waktu.'},{k:'randomizeFormatting',l:'Random Formatting',d:'Variasi spasi & baris.'},{k:'rotateTemplates',l:'Template Rotation',d:'Template bergantian.'},{k:'randomizeEmojis',l:'Randomize Emojis',d:'Emoji acak.'},{k:'useGlobalSpintax',l:'Global Spintax',d:'Parser {opsi1|opsi2}.'},{k:'autoSend',l:'Auto Send',d:'Kirim otomatis via Extension.'}].map(item=>(
                        <div key={item.k} className="flex items-center justify-between p-2.5 rounded-lg border border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                          <div><div className="text-[11px] font-medium text-white/75">{item.l}</div><div className="text-[9px] text-white/25">{item.d}</div></div>
                          <Toggle checked={!!settings[item.k as keyof AppSettings]} onChange={()=>setSettings(p=>({...p,[item.k]:!p[item.k as keyof AppSettings]}))}/>
                        </div>
                      ))}
                    </div>
                    {settings.autoSend&&(
                      <div className="p-4 rounded-xl bg-amber-400/[0.05] border border-amber-400/[0.12] space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-[11px] font-semibold text-amber-400"><Puzzle size={12}/> Extension Required</div>
                          <span className={cn("text-[9px] font-bold uppercase px-2 py-0.5 rounded",isExtensionDetected?"bg-[#3ECF8E] text-[#0c0c0d]":"bg-amber-500 text-white")}>{isExtensionDetected?"Connected":"Not Found"}</span>
                        </div>
                        <button onClick={downloadExtensionZip} className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-[12px] font-semibold flex items-center justify-center gap-2 transition-colors">
                          <Download size={13}/> Download Extension (.zip)
                        </button>
                        <ol className="text-[10px] text-amber-300/50 space-y-1 list-decimal ml-4">
                          <li>Klik Download Extension di atas.</li>
                          <li>Ekstrak <span className="mono bg-amber-400/10 px-1 rounded">wasender-pro-helper.zip</span>.</li>
                          <li>Buka <span className="mono bg-amber-400/10 px-1 rounded">chrome://extensions</span>.</li>
                          <li>Aktifkan <b>Developer Mode</b>.</li>
                          <li>Klik <b>Load Unpacked</b>, pilih folder ekstrak.</li>
                        </ol>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-5 border-t border-white/[0.06] bg-[#0f1012]">
                <button onClick={()=>setShowSettingsModal(false)} className="w-full py-3 rounded-xl bg-[#3ECF8E] text-[#0c0c0d] text-[13px] font-semibold hover:bg-[#3ECF8E]/90 active:scale-[0.98] transition-all">
                  Save Configuration
                </button>
              </div>
            </motion.div>
          </ModalOverlay>
        )}
      </AnimatePresence>

      <footer className="max-w-7xl mx-auto px-6 py-8 border-t border-white/[0.04] flex items-center justify-between">
        <span className="text-[10px] mono text-white/15 uppercase tracking-widest">WAsender PRO · v2.0.0 · Enterprise</span>
        <div className="flex items-center gap-1.5 text-[10px] text-white/15">
          <div className={cn("w-1.5 h-1.5 rounded-full", isBlasting?"bg-[#3ECF8E] animate-pulse":"bg-white/15")}/>
          {isBlasting?`Blast active · ${countdown}s next`:'System idle'}
        </div>
      </footer>
    </div>
  );
}
