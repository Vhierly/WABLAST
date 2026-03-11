import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, Send, Trash2, Play, Square, MessageSquare, User, Package, Hash, Phone,
  FileText, CheckCircle2, Clock, AlertCircle, Settings2, Download, FileSpreadsheet,
  X, Search, Sparkles, BarChart3, History, Timer, ExternalLink, ChevronRight, Moon,
  Sun, RotateCcw, Shield, Puzzle, Loader2, Zap, Terminal, Palette, Lock
} from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip 
} from 'recharts';
import { 
  BlastEntry, LogEntry, MessageTemplate, DEFAULT_TEMPLATES, AppSettings, DEFAULT_SETTINGS 
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
  
  // Secret Theme State
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [themePassword, setThemePassword] = useState('');
  const [isNeoBrutalism, setIsNeoBrutalism] = useState(() => {
    return localStorage.getItem('wa_blast_neo') === 'true';
  });

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

  const waWindowRef = useRef<Window | null>(null);

  const openInSameTab = (link: string) => {
    if (waWindowRef.current && !waWindowRef.current.closed) {
      try {
        waWindowRef.current.location.replace(link);
        waWindowRef.current.focus();
        return waWindowRef.current;
      } catch (e) {
        waWindowRef.current = window.open(link, 'WAsenderTab');
        return waWindowRef.current;
      }
    } else {
      waWindowRef.current = window.open(link, 'WAsenderTab');
      return waWindowRef.current;
    }
  };

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
  useEffect(() => localStorage.setItem('wa_blast_neo', isNeoBrutalism.toString()), [isNeoBrutalism]);
  
  useEffect(() => {
    const theme = isDarkMode ? 'dark' : 'light';
    localStorage.setItem('wa_blast_theme', theme);
    if (isDarkMode && !isNeoBrutalism) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [isDarkMode, isNeoBrutalism]);

  const handleUnlockNeo = () => {
    if (themePassword === 'tanyapaleif') {
      setIsNeoBrutalism(true);
      setShowThemeModal(false);
      setThemePassword('');
      toast.success("CYBERPUNK BRUTALISM UNLOCKED! 👾⚡", { 
        style: isNeoBrutalism ? { background: '#000', color: '#00FF41', border: '3px solid #00FF41', borderRadius: '0', boxShadow: '6px 6px 0px 0px #FF00E6' } : {}
      });
    } else {
      toast.error("Akses Ditolak! Password salah.");
    }
  };

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
      id: crypto.randomUUID(), ...formData, status: 'pending', isReceived: false, createdAt: Date.now()
    };
    setEntries(prev => [newEntry, ...prev]);
    setFormData({ phone: '', recipientName: '', itemName: '', receiptNumber: '', address: '', cod: '', dfod: '' });
    addLog(`➕ Data ditambahkan: ${newEntry.recipientName} (${newEntry.phone})`, 'info');
    toast.success('Data ditambahkan');
  };

  const handleBulkImport = () => {
    if (!bulkData.trim()) return toast.error('Data kosong');
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
        let cod = '', dfod = '';
        
        if (tanda === 'COD') {
          const cleanCod = (columns[6] || '').replace(/[^0-9]/g, '');
          if (cleanCod && !isNaN(Number(cleanCod))) cod = cleanCod;
        } else if (tanda === 'DFOD') {
          const cleanDfod = (columns[7] || '').replace(/[^0-9]/g, '');
          if (cleanDfod && !isNaN(Number(cleanDfod))) dfod = cleanDfod;
        }

        newEntries.push({
          id: crypto.randomUUID(),
          receiptNumber: columns[1] || '', recipientName: columns[2] || '', phone: columns[3] || '',
          address: columns[4] || '', itemName: columns[8] || '', cod, dfod,
          status: 'pending', isReceived: false, createdAt: Date.now()
        });
        successCount++;
      }
    });

    if (newEntries.length > 0) {
      setEntries(prev => [...newEntries, ...prev]);
      setBulkData(''); setShowBulkModal(false);
      addLog(`📥 Bulk Import: ${successCount} data berhasil diimpor`, 'success');
      toast.success(`${successCount} data berhasil diimpor`);
    } else {
      toast.error('Format data tidak valid.');
    }
  };

  const clearAll = () => {
    setEntries([]); setIsConfirmingClear(false);
    addLog(`🗑️ Semua data antrean dihapus`, 'warning'); toast.success('Semua data dihapus');
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    let base = hour >= 5 && hour < 11 ? 'Pagi' : hour >= 11 && hour < 15 ? 'Siang' : hour >= 15 && hour < 18 ? 'Sore' : 'Malam';
    if (settings.useRandomGreetings) {
      const vars = [`Selamat ${base}`, `${base} Kak`, `Halo, Selamat ${base}`, `Halo Kak, Selamat ${base}`, `Permisi, Selamat ${base}`, `Halo`, base];
      return vars[Math.floor(Math.random() * vars.length)];
    }
    return `Selamat ${base}`;
  };

  const generateMessage = (entry: BlastEntry, templateText?: string) => {
    let text = templateText || activeTemplate.text;
    text = !entry.cod ? text.replace(/{if_cod}[\s\S]*?{\/if_cod}/gi, '') : text.replace(/{if_cod}/gi, '').replace(/{\/if_cod}/gi, '');
    text = !entry.dfod ? text.replace(/{if_dfod}[\s\S]*?{\/if_dfod}/gi, '') : text.replace(/{if_dfod}/gi, '').replace(/{\/if_dfod}/gi, '');

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
        if (p1.includes('|')) {
          const choices = p1.split('|'); return choices[Math.floor(Math.random() * choices.length)];
        }
        return match;
      });
    }

    if (settings.randomizeEmojis) {
      const emojis = ['😊', '🙏', '📦', '🚚', '✨', '✅', '📍', '🚚', '📦', '🚛'];
      finalMessage = finalMessage.split(' ').map(word => Math.random() > 0.9 ? word + ' ' + emojis[Math.floor(Math.random() * emojis.length)] : word).join(' ');
    }

    if (settings.addRandomSuffix) finalMessage += `\n\n_Ref: ${Math.random().toString(36).substring(7).toUpperCase()}_`;
    if (settings.useInvisibleChars) finalMessage = finalMessage.split(' ').map(word => Math.random() > 0.7 ? word + '\u200B' : word).join(' ');
    
    if (settings.randomizeFormatting) {
      const paragraphs = finalMessage.split('\n\n');
      finalMessage = paragraphs.map((p, i) => {
        if (i === paragraphs.length - 1) return p;
        const rand = Math.random();
        return rand > 0.8 ? p + '\n\n\n' : rand > 0.6 ? p + '\n' : p + '\n\n';
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
    const newWindow = openInSameTab(getWALink(entry));
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

    if (useTyping) {
      let templateText = activeTemplate.text;
      if (settings.rotateTemplates) {
        const vars = activeTemplate.variations && activeTemplate.variations.length > 0 ? activeTemplate.variations : [activeTemplate.text];
        templateText = vars[sentCount % vars.length];
      }
      currentDelay += Math.min(generateMessage(entry, templateText).length * 50, 5000);
    }

    if (settings.batchSize > 0 && sentCount >= nextBatchPauseAt && nextBatchPauseAt > 0) {
      currentDelay = settings.batchPause;
      toast(`Anti-Spam: Istirahat sejenak selama ${settings.batchPause / 1000} detik...`, { icon: '🛡️', style: neo ? { background: '#000', color: '#FAFF00', border: '3px solid #FAFF00', borderRadius: '0', boxShadow: '6px 6px 0px 0px #FF00E6' } : {} });
      setNextBatchPauseAt(sentCount + settings.batchSize + (Math.floor(Math.random() * 5) - 2));
    }

    if (settings.longBreakAfter > 0 && sentCount > 0 && sentCount % settings.longBreakAfter === 0) {
      currentDelay = settings.longBreakDuration * 60 * 1000; setIsLongBreak(true);
      addLog(`😴 Mengambil istirahat panjang selama ${settings.longBreakDuration} menit...`, 'warning');
    } else setIsLongBreak(false);

    return currentDelay;
  };

  const startBlast = () => {
    if (!isExtensionDetected && !settings.manualMode) return toast.error('Extension tidak terdeteksi! Gunakan Mode Manual.', { icon: '🔌' });
    const pending = entries.filter(e => e.status === 'pending');
    if (pending.length === 0) return toast.error('Tidak ada pesan pending');

    let entriesToProcess = [...pending];
    if (settings.shuffleQueue) {
      entriesToProcess = entriesToProcess.sort(() => Math.random() - 0.5);
      setEntries(prev => [...prev.filter(e => e.status !== 'pending'), ...entriesToProcess]);
    }

    const firstEntry = entriesToProcess[0];
    addLog(`🎬 Memulai proses blast...${settings.shuffleQueue ? ' (Diacak)' : ''}`, 'info');
    
    const newWindow = openInSameTab(getWALink(firstEntry));
    if (!newWindow) return toast.error('Popup terblokir! Izinkan popup di browser Anda.', { duration: 8000, icon: '🚫' });
    window.focus();
    
    if (settings.autoSend) updateStatus(firstEntry.id, 'sending');
    else {
      updateStatus(firstEntry.id, 'sent');
      setNextActionTime(Date.now() + calculateNextDelay(entries.filter(e => e.status === 'sent').length + 1, entriesToProcess[1] || firstEntry));
    }

    setIsBlasting(true); setCurrentIndex(0);
    if (settings.batchSize > 0) setNextBatchPauseAt(entries.filter(e => e.status === 'sent').length + settings.batchSize + (Math.floor(Math.random() * 5) - 2));
  };

  const stopBlast = () => {
    setIsBlasting(false); setCurrentIndex(-1); setNextActionTime(0);
    addLog(`🛑 Proses blast dihentikan oleh pengguna`, 'warning');
    if (waWindowRef.current && !waWindowRef.current.closed) {
      waWindowRef.current.close();
      waWindowRef.current = null;
    }
  };

  useEffect(() => {
    if (isBlasting && !settings.manualMode) {
      const sendingEntry = entries.find(e => e.status === 'sending');
      if (sendingEntry) {
        let t = 25000;
        if (settings.speedMode === 'turbo') t = 5000; else if (settings.speedMode === 'fast') t = 10000; else if (settings.speedMode === 'normal') t = 15000;

        const timer = setTimeout(() => {
          addLog(`⏭️ Auto-Next: Melanjutkan otomatis...`, 'info');
          updateStatus(sendingEntry.id, 'sent');
          const sentCount = entries.filter(e => e.status === 'sent').length + 1;
          const pending = entries.filter(e => e.status === 'pending' && e.id !== sendingEntry.id);
          if (pending.length > 0) setNextActionTime(Date.now() + calculateNextDelay(sentCount, pending[0]));
        }, t);
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
              const pending = currentEntries.filter(e => e.status === 'pending' && e.id !== entryId);
              if (pending.length > 0) setNextActionTime(Date.now() + calculateNextDelay(currentEntries.filter(e => e.status === 'sent').length + 1, pending[0]));
              return currentEntries.map(e => e.id === entryId ? { ...e, status: 'sent' } : e);
            } else if (waStatus === 'invalid') {
              const currentRetries = entry.retryCount || 0;
              if (settings.autoRetry && currentRetries < settings.maxRetries) {
                addLog(`🔄 Gagal, mencoba ulang (${currentRetries + 1}/${settings.maxRetries})...`, 'warning');
                return currentEntries.map(e => e.id === entryId ? { ...e, status: 'pending', retryCount: currentRetries + 1 } : e);
              } else {
                setConsecutiveErrors(prev => prev + 1); addLog(`❌ Nomor tidak valid: ${entry.recipientName}`, 'error');
                return currentEntries.map(e => e.id === entryId ? { ...e, status: 'failed' } : e);
              }
            }
            return currentEntries;
          });
        } else if (type === 'WA_WARNING_DETECTED') {
          stopBlast(); addLog(`🚨 PERINGATAN SPAM OLEH WHATSAPP!`, 'error'); toast.error('PERINGATAN SPAM!', { icon: '🚨', style: neo ? { background: '#000', color: '#FF003C', border: '3px solid #FF003C', borderRadius: '0', boxShadow: '6px 6px 0px 0px #00F0FF' } : {} });
        }
      }
    };

    window.addEventListener('message', handleExtensionMessage);
    const heartbeatInterval = setInterval(() => {
      if (lastHeartbeat > 0 && Date.now() - lastHeartbeat > 20000 && isExtensionDetected) {
        setIsExtensionDetected(false); addLog(`🔌 Extension terputus`, 'warning');
      }
    }, 5000);
    return () => { window.removeEventListener('message', handleExtensionMessage); clearInterval(heartbeatInterval); };
  }, [lastHeartbeat, isExtensionDetected, settings.autoRetry, settings.maxRetries, settings.speedMode, neo]);

  useEffect(() => {
    const handlePing = (event: MessageEvent) => {
      if (event.data && event.data.source === 'wasender-extension' && event.data.type === 'EXTENSION_PONG') {
        if (!isExtensionDetected) { setIsExtensionDetected(true); addLog(`🔌 Extension aktif`, 'success'); }
        setLastHeartbeat(Date.now());
      }
    };
    window.addEventListener('message', handlePing);
    const checkAttr = () => {
      if (document.documentElement.getAttribute('data-wasender-extension') === 'active') {
        if (!isExtensionDetected) { setIsExtensionDetected(true); addLog(`🔌 Extension aktif (DOM)`, 'success'); }
        setLastHeartbeat(Date.now());
      }
      window.postMessage({ type: 'EXTENSION_PING' }, '*');
    };
    const attrInterval = setInterval(checkAttr, 2000); checkAttr();
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
          const newWindow = openInSameTab(getWALink(entry, entries.filter(e => e.status === 'sent').length));
          if (!newWindow) { addLog(`⚠️ Browser memblokir popup.`, 'warning'); setNextActionTime(Date.now() + 3000); return; }
          window.focus();

          if (settings.autoSend) updateStatus(entry.id, 'sending');
          else {
            updateStatus(entry.id, 'sent');
            setNextActionTime(Date.now() + calculateNextDelay(entries.filter(e => e.status === 'sent').length + 1, pendingEntries[1] || entry));
          }
        } else setCountdown(Math.max(0, Math.ceil((nextActionTime - now) / 1000)));
      } else { 
        setIsBlasting(false); 
        addLog(`🏁 Blast selesai!`, 'success'); 
        if (waWindowRef.current && !waWindowRef.current.closed) {
          waWindowRef.current.close();
          waWindowRef.current = null;
          addLog(`🧹 Menutup tab WhatsApp otomatis.`, 'info');
        }
      }
    };

    engineTick(); const interval = setInterval(engineTick, 1000);
    return () => clearInterval(interval);
  }, [isBlasting, entries, nextActionTime, settings.manualMode, settings.hourlyLimit, isExtensionDetected, sentThisHour, lastHourReset]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isBlasting && settings.manualMode && (e.code === 'Space' || e.code === 'Enter')) {
        e.preventDefault();
        const pending = entries.filter(ent => ent.status === 'pending');
        if (pending.length > 0) {
          openInSameTab(getWALink(pending[0])); 
          updateStatus(pending[0].id, 'sent');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown); return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBlasting, settings.manualMode, entries]);

  const filteredEntries = useMemo(() => {
    return entries.filter(e => e.recipientName.toLowerCase().includes(searchQuery.toLowerCase()) || e.phone.includes(searchQuery) || e.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [entries, searchQuery]);

  const statsData = useMemo(() => {
    const sent = entries.filter(e => e.status === 'sent').length, pending = entries.filter(e => e.status === 'pending').length, received = entries.filter(e => e.isReceived).length;
    return [{ name: 'Sent', value: sent, color: isNeoBrutalism ? '#00FF41' : '#10b981' }, { name: 'Pending', value: pending, color: isNeoBrutalism ? '#FAFF00' : '#f59e0b' }, { name: 'Received', value: received, color: isNeoBrutalism ? '#FF00E6' : '#0ea5e9' }];
  }, [entries, isNeoBrutalism]);

  const safetyScore = useMemo(() => {
    let score = 0;
    if (settings.delay >= 5000) score += 20; if (settings.randomizeDelay) score += 15; if (settings.batchSize > 0 && settings.batchSize <= 15) score += 10;
    if (settings.useRandomGreetings) score += 5; if (settings.useInvisibleChars) score += 5; if (settings.simulateTyping) score += 10;
    if (settings.adaptiveDelay) score += 5; if (settings.rotateTemplates) score += 10; if (settings.hourlyLimit <= 50) score += 10; if (settings.shuffleQueue) score += 10;
    return Math.min(100, score);
  }, [settings]);

  const exportToCSV = () => {
    if (entries.length === 0) return;
    const headers = ['Phone', 'Name', 'Item', 'Receipt', 'Status', 'Received', 'Created At'];
    const rows = entries.map(e => [e.phone, e.recipientName, e.itemName, e.receiptNumber, e.status, e.isReceived ? 'YES' : 'NO', new Date(e.createdAt).toLocaleString()]);
    const csvContent = [headers, ...rows].map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `wasender_${new Date().toISOString().split('T')[0]}.csv`; link.click();
    toast.success('Laporan diunduh');
  };

  // THEME ENGINE HELPERS: Dark Cyberpunk Neo Brutalism
  const neo = isNeoBrutalism;
  const tAppBg = neo ? "bg-[#050505] text-white font-mono selection:bg-[#FF00E6] selection:text-black" : (isDarkMode ? "dark bg-[#09090b] text-zinc-200" : "bg-[#f4f4f5] text-zinc-900");
  const tCard = neo ? "bg-[#0a0a0a] border-[3px] border-[#00F0FF] shadow-[6px_6px_0px_0px_#FF00E6] rounded-none" : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl lg:rounded-[2rem] shadow-sm";
  const tInput = neo ? "bg-black border-[3px] border-[#FAFF00] shadow-[4px_4px_0px_0px_#00FF41] focus:shadow-none focus:translate-x-[4px] focus:translate-y-[4px] rounded-none text-[#00F0FF] font-bold outline-none placeholder-zinc-700 transition-all" : "bg-zinc-50 dark:bg-zinc-950 border-none rounded-xl lg:rounded-2xl focus:ring-2 focus:ring-emerald-500/20 outline-none dark:text-white transition-all";
  const tBtnPrimary = neo ? "bg-[#FF00E6] border-[3px] border-white shadow-[6px_6px_0px_0px_#00F0FF] hover:shadow-none hover:translate-x-[6px] hover:translate-y-[6px] rounded-none text-black font-black uppercase tracking-widest transition-all" : "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl lg:rounded-2xl font-bold hover:scale-[0.98] transition-transform shadow-md";
  const tBtnSecondary = neo ? "bg-[#00F0FF] border-[3px] border-white shadow-[4px_4px_0px_0px_#FAFF00] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] rounded-none text-black font-black uppercase transition-all" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-full lg:rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all";
  const tBtnIcon = neo ? "bg-black border-[3px] border-[#00FF41] shadow-[4px_4px_0px_0px_#FF00E6] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] rounded-none text-[#00FF41] transition-all" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors";
  
  return (
    <div className={cn("min-h-screen lg:h-screen w-full flex flex-col lg:flex-row lg:overflow-hidden transition-colors duration-300", tAppBg, !neo && "font-sans")}>
      <Toaster position="top-center" toastOptions={{ className: neo ? 'border-[3px] border-[#00FF41] shadow-[6px_6px_0px_0px_#FF00E6] rounded-none font-bold text-[#00FF41] bg-black' : 'dark:bg-zinc-800 dark:text-white border dark:border-zinc-700 mt-4 shadow-xl' }} />

      {/* Secret Password Modal */}
      <AnimatePresence>
        {showThemeModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-sm bg-black/80">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className={cn("p-8 w-full max-w-sm flex flex-col gap-5", neo ? "bg-black border-[3px] border-[#FF003C] shadow-[10px_10px_0px_0px_#00F0FF] text-[#00FF41]" : "bg-white dark:bg-zinc-900 rounded-[2rem] shadow-2xl border border-zinc-200 dark:border-zinc-800")}>
              <div className="flex justify-between items-center">
                <h3 className={cn("font-black text-xl", neo ? "uppercase" : "dark:text-white")}>System Override</h3>
                <button onClick={() => setShowThemeModal(false)}><X size={20} className={neo ? "text-[#FF003C]" : "text-zinc-500"} /></button>
              </div>
              <input type="password" value={themePassword} onChange={e => setThemePassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleUnlockNeo()} placeholder="Enter Passcode..." className={cn("w-full px-5 py-4", tInput)} />
              <button onClick={handleUnlockNeo} className={cn("w-full py-4 text-sm flex items-center justify-center gap-2", tBtnPrimary)}><Lock size={16} /> UNLOCK</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FLOATING HUD WIDGET */}
      <AnimatePresence>
        {isBlasting && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 md:bottom-8 md:right-8 z-[100] w-auto sm:w-[340px]"
          >
            <div className={cn("p-5 sm:p-6 flex flex-col relative overflow-hidden", neo ? "bg-black border-[3px] border-[#FAFF00] shadow-[8px_8px_0px_0px_#FF00E6] rounded-none" : "bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]")}>
              <div className={cn("absolute top-0 left-0 w-full", neo ? "h-2 bg-zinc-900 border-b-[3px] border-[#00F0FF]" : "h-1 bg-zinc-800")}>
                <motion.div className={cn("h-full", neo ? "bg-[#00FF41]" : "bg-gradient-to-r from-emerald-500 to-teal-400")} initial={{ width: "0%" }} animate={{ width: `${entries.length > 0 ? (entries.filter(e => e.status === 'sent').length / entries.length) * 100 : 0}%` }} />
              </div>
              
              <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-5 mt-1 sm:mt-2">
                <div className="relative w-10 h-10 sm:w-12 sm:h-12 shrink-0">
                  <div className={cn("absolute inset-0 rounded-full", neo ? "border-[3px] border-zinc-800" : "border-[3px] sm:border-4 border-zinc-800")} />
                  <div className={cn("absolute inset-0 rounded-full border-t-transparent animate-spin", neo ? "border-[3px] border-[#00FF41]" : "border-[3px] sm:border-4 border-emerald-500")} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Play className={cn("w-3 h-3 sm:w-4 sm:h-4 fill-current translate-x-[1px]", neo ? "text-[#00FF41]" : "text-emerald-500")} />
                  </div>
                </div>
                <div>
                  <h3 className={cn("text-sm font-bold leading-tight", neo ? "text-[#00F0FF] uppercase font-black" : "text-white")}>
                    {isLongBreak ? 'Sleeping 😴' : entries.some(e => e.status === 'sending') ? 'Waiting WA ⏳' : 'Engine Running 🚀'}
                  </h3>
                  <div className={cn("text-[10px] sm:text-[11px] mt-1 font-medium", neo ? "text-white font-bold" : "text-zinc-400")}>
                    Sent: <span className={neo ? "text-[#00FF41]" : "text-emerald-400"}>{entries.filter(e => e.status === 'sent').length}</span> / {entries.length} items
                  </div>
                </div>
              </div>

              {!settings.manualMode ? (
                <div className={cn("mb-4 sm:mb-5 flex items-center justify-between p-3 sm:p-4", neo ? "bg-[#111] border-[3px] border-[#FAFF00]" : "bg-zinc-950 rounded-2xl border border-zinc-800/80 shadow-inner")}>
                  <span className={cn("text-[9px] sm:text-[10px] uppercase tracking-widest font-bold", neo ? "text-[#FAFF00]" : "text-zinc-500")}>
                    {entries.some(e => e.status === 'sending') ? 'Processing' : isLongBreak ? 'Break Left' : 'Next In'}
                  </span>
                  <div className={cn("text-xl sm:text-2xl font-black tabular-nums tracking-tighter", isLongBreak ? "text-amber-500" : entries.some(e => e.status === 'sending') ? "text-[#00F0FF] animate-pulse" : (neo ? "text-[#00FF41]" : "text-white"))}>
                    {entries.some(e => e.status === 'sending') ? '--:--' : `${Math.floor(countdown / 60)}:${(countdown % 60).toString().padStart(2, '0')}`}
                  </div>
                </div>
              ) : (
                <div className={cn("mb-4 sm:mb-5 text-center p-3 sm:p-4", neo ? "bg-[#111] border-[3px] border-[#FAFF00]" : "bg-zinc-950 rounded-2xl border border-zinc-800/80 shadow-inner")}>
                  <div className={cn("font-bold text-[10px] uppercase tracking-widest mb-1", neo ? "text-[#00FF41] font-black" : "text-emerald-400")}>Manual Mode</div>
                  <div className={cn("text-[10px] sm:text-[11px]", neo ? "text-[#00F0FF] font-bold" : "text-zinc-400")}>Tekan [ENTER] di WA atau klik lanjut.</div>
                </div>
              )}

              <div className="w-full flex flex-col gap-2">
                {entries.some(e => e.status === 'sending') && (
                  <button onClick={() => { const s = entries.find(e => e.status === 'sending'); if(s) updateStatus(s.id, 'sent'); }} className={cn("w-full py-3 text-xs sm:text-[13px] flex justify-center", neo ? "bg-[#00F0FF] border-[3px] border-white font-black uppercase text-black hover:translate-x-[2px] hover:translate-y-[2px] shadow-[4px_4px_0px_0px_#FAFF00] hover:shadow-none transition-all" : "bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all active:scale-95 shadow-sm")}>Force Skip</button>
                )}
                {Date.now() >= nextActionTime && entries.filter(e => e.status === 'pending').length > 0 && !entries.some(e => e.status === 'sending') && !settings.manualMode && (
                  <button onClick={() => {
                    const entry = entries.find(e => e.status === 'pending');
                    if(entry) { openInSameTab(getWALink(entry, entries.filter(e => e.status === 'sent').length)); if(settings.autoSend) updateStatus(entry.id, 'sending'); else updateStatus(entry.id, 'sent'); }
                  }} className={cn("w-full py-3 text-xs sm:text-[13px] flex justify-center", neo ? "bg-[#FAFF00] border-[3px] border-white font-black uppercase text-black hover:translate-x-[2px] hover:translate-y-[2px] shadow-[4px_4px_0px_0px_#FF00E6] hover:shadow-none transition-all" : "bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold transition-all active:scale-95 shadow-sm")}>Trigger Manual</button>
                )}
                {settings.manualMode && (
                  <button onClick={() => {
                    const pending = entries.filter(e => e.status === 'pending');
                    if (pending.length > 0) { openInSameTab(getWALink(pending[0])); updateStatus(pending[0].id, 'sent'); }
                  }} className={cn("w-full py-3 text-xs sm:text-[13px] flex justify-center", neo ? "bg-[#FF00E6] border-[3px] border-white font-black uppercase text-black hover:translate-x-[2px] hover:translate-y-[2px] shadow-[4px_4px_0px_0px_#00F0FF] hover:shadow-none transition-all" : "bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white rounded-xl font-bold transition-all active:scale-95 shadow-sm")}>Kirim Berikutnya</button>
                )}
                <button onClick={stopBlast} className={cn("w-full py-3 text-xs sm:text-[13px] flex justify-center", neo ? "bg-black border-[3px] border-[#FF003C] font-black uppercase text-[#FF003C] hover:bg-[#FF003C] hover:text-black transition-all" : "border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-xl font-bold transition-all active:scale-95")}>Stop Engine</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SIDEBAR (Command Center) */}
      <aside className={cn("w-full lg:w-[320px] xl:w-[360px] lg:h-full p-4 md:p-6 flex flex-col gap-4 md:gap-6 shrink-0 z-20 lg:overflow-y-auto custom-scrollbar", neo ? "bg-[#050505] border-b-[3px] lg:border-b-0 lg:border-r-[3px] border-[#FF00E6]" : "border-b lg:border-b-0 lg:border-r border-zinc-200 dark:border-zinc-800/80 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-xl")}>
        
        {/* Brand */}
        <div className="flex items-center gap-3 md:gap-4 px-2 pt-2">
          <div className={cn("w-10 h-10 md:w-12 md:h-12 flex items-center justify-center shrink-0", neo ? "bg-[#FF00E6] border-[3px] border-white shadow-[4px_4px_0px_0px_#00F0FF]" : "bg-zinc-900 dark:bg-white rounded-xl md:rounded-2xl shadow-lg")}>
            <Send className={cn("w-5 h-5 md:w-6 md:h-6 translate-x-[1px]", neo ? "text-black" : "text-white dark:text-zinc-900")} />
          </div>
          <div>
            <h1 className={cn("text-xl md:text-2xl font-black tracking-tight leading-none", neo ? "text-[#00F0FF] uppercase" : "dark:text-white")}>WAsender</h1>
            <p className={cn("text-[9px] md:text-[10px] font-bold uppercase tracking-widest mt-1 md:mt-1.5", neo ? "text-[#FAFF00]" : "text-emerald-500")}>PRO Engine v2</p>
          </div>
        </div>

        {/* Master Control */}
        <div className={cn("p-5 md:p-6 flex flex-col gap-4 md:gap-5", tCard)}>
          <div className="flex justify-between items-center">
            <span className={cn("text-[10px] font-bold uppercase tracking-widest", neo ? "text-[#00FF41]" : "text-zinc-500")}>System Status</span>
            <div className={cn("flex items-center gap-2 px-3 py-1.5", neo ? "bg-black border-2 border-[#FF00E6] shadow-[2px_2px_0px_0px_#00F0FF]" : "bg-zinc-100 dark:bg-zinc-800 rounded-lg")}>
              <div className={cn("w-2 h-2 rounded-full", isBlasting ? (neo ? "bg-[#00FF41] animate-pulse" : "bg-emerald-500 animate-pulse") : "bg-zinc-600")} />
              <span className={cn("text-[10px] font-bold uppercase", neo ? "text-[#FF00E6] font-black" : "dark:text-zinc-300")}>{isBlasting ? 'Running' : 'Standby'}</span>
            </div>
          </div>
          
          <button
            onClick={isBlasting ? stopBlast : startBlast}
            disabled={entries.length === 0}
            className={cn(
              "w-full h-14 md:h-16 flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:active:scale-100",
              neo 
                ? (isBlasting ? "bg-[#FF003C] border-[3px] border-white shadow-[6px_6px_0px_0px_#00F0FF] text-white font-black uppercase text-base md:text-lg hover:shadow-none hover:translate-x-[6px] hover:translate-y-[6px]" : "bg-[#00FF41] border-[3px] border-white shadow-[6px_6px_0px_0px_#FF00E6] text-black font-black uppercase text-base md:text-lg hover:shadow-none hover:translate-x-[6px] hover:translate-y-[6px]")
                : (isBlasting ? "bg-red-500 hover:bg-red-600 text-white shadow-red-500/20 rounded-2xl md:rounded-[1.25rem] font-black text-base md:text-lg active:scale-95" : "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-zinc-900/10 hover:scale-[1.02] rounded-2xl md:rounded-[1.25rem] font-black text-base md:text-lg active:scale-95")
            )}
          >
            {isBlasting ? <Square size={18} className="md:w-5 md:h-5" fill="currentColor" /> : <Play size={18} className="md:w-5 md:h-5" fill="currentColor" />}
            {isBlasting ? 'STOP ENGINE' : 'START BLAST'}
          </button>

          <div className={cn(
            "flex items-center justify-between px-3 md:px-4 py-3 md:py-3.5 text-[10px] md:text-[11px] font-bold transition-all",
            neo 
              ? (isExtensionDetected ? "bg-black border-[3px] border-[#00FF41] text-[#00FF41] shadow-[4px_4px_0px_0px_#FF00E6] uppercase" : "bg-black border-[3px] border-[#FF003C] text-[#FF003C] shadow-[4px_4px_0px_0px_#00F0FF] uppercase")
              : (isExtensionDetected ? "bg-emerald-50/50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl md:rounded-2xl" : "bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 rounded-xl md:rounded-2xl")
          )}>
            <div className="flex items-center gap-2 md:gap-2.5"><Puzzle size={14} className={isExtensionDetected ? "animate-pulse" : ""} /> Extension</div>
            <span className="uppercase">{isExtensionDetected ? 'Connected' : 'Offline'}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 md:gap-6 lg:flex-1 lg:flex lg:flex-col">
          {/* Quick Settings */}
          <div className={cn("p-5 md:p-6 flex flex-col gap-4 md:gap-5", tCard)}>
            <div className="space-y-2">
              <label className={cn("text-[10px] uppercase tracking-widest ml-1", neo ? "text-[#00F0FF] font-black" : "font-bold text-zinc-500")}>Pengirim / CS</label>
              <input 
                type="text" value={settings.senderName} onChange={(e) => setSettings(prev => ({ ...prev, senderName: e.target.value }))}
                className={tInput}
                placeholder="Admin JNT"
              />
            </div>
            <div className="space-y-3 pt-1">
              <div className="flex justify-between items-center">
                <label className={cn("text-[10px] uppercase tracking-widest ml-1", neo ? "text-[#00F0FF] font-black" : "font-bold text-zinc-500")}>Delay Waktu</label>
                <span className={cn("text-[10px] px-2 py-0.5", neo ? "font-black bg-black border-2 border-[#FAFF00] shadow-[2px_2px_0px_0px_#FF00E6] text-[#FAFF00]" : "font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-md")}>{settings.delay / 1000}s</span>
              </div>
              <input 
                type="range" min="1000" max="10000" step="500" value={settings.delay} onChange={(e) => setSettings(prev => ({ ...prev, delay: parseInt(e.target.value) }))}
                className={cn("w-full h-2 appearance-none cursor-pointer", neo ? "bg-black border-2 border-[#00F0FF] accent-[#FF00E6]" : "bg-zinc-200 dark:bg-zinc-700 rounded-lg accent-emerald-500")}
              />
              <div className={cn("flex justify-between text-[9px] tracking-widest uppercase", neo ? "text-[#00FF41] font-black" : "font-bold text-zinc-400")}>
                <span>Fast</span><span>Safe</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className={cn("p-5 md:p-6", tCard)}>
            <div className={cn("text-[10px] uppercase tracking-widest mb-4 md:mb-5", neo ? "text-[#00F0FF] font-black" : "font-bold text-zinc-500")}>Analytics</div>
            <div className="flex items-center gap-4 md:gap-6">
              <div className={cn("w-16 h-16 md:w-20 md:h-20 shrink-0", neo ? "border-[3px] border-[#00FF41] bg-black shadow-[4px_4px_0px_0px_#FF00E6] p-1" : "")}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statsData} innerRadius={neo ? 0 : 22} outerRadius={neo ? 30 : 32} paddingAngle={neo ? 0 : 5} dataKey="value" stroke={neo ? "#000" : "none"} strokeWidth={neo ? 2 : 0}>
                      {statsData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <RechartsTooltip cursor={false} contentStyle={{ backgroundColor: neo ? '#000' : (isDarkMode ? '#18181b' : '#fff'), borderColor: neo ? '#00FF41' : (isDarkMode ? '#27272a' : '#e2e8f0'), borderWidth: neo ? '3px' : '1px', borderRadius: neo ? '0' : '12px', padding: '8px', fontSize: '10px', fontWeight: 'bold', color: neo ? '#fff' : '', boxShadow: neo ? '4px 4px 0px 0px #FF00E6' : '' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 flex flex-col gap-2 md:gap-3">
                {statsData.map(s => (
                  <div key={s.name} className="flex justify-between items-center text-[11px] md:text-xs font-bold">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 md:w-2.5 md:h-2.5", neo ? "border-2 border-white" : "rounded-full")} style={{ backgroundColor: s.color }} /> 
                      <span className={neo ? "text-[#00F0FF] font-black uppercase" : "text-zinc-500 dark:text-zinc-400"}>{s.name}</span>
                    </div>
                    <span className={neo ? "text-[#FF00E6] font-black text-sm" : "text-xs md:text-sm dark:text-white"}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Terminal Logging */}
        <div className={cn("flex-col overflow-hidden relative group min-h-[140px] md:min-h-[160px] lg:h-auto lg:flex-1 p-5 md:p-6 flex", neo ? "bg-black border-[3px] border-[#00FF41] shadow-[6px_6px_0px_0px_#00F0FF] text-[#00FF41]" : "bg-zinc-950 dark:bg-[#0a0a0a] rounded-3xl md:rounded-[2rem] border border-zinc-800 shadow-inner")}>
          <div className="flex justify-between items-center mb-3 md:mb-4 shrink-0">
            <div className="flex gap-2">
              <div className={cn("w-2.5 h-2.5 md:w-3 md:h-3", neo ? "bg-[#FF003C]" : "rounded-full bg-zinc-700")} />
              <div className={cn("w-2.5 h-2.5 md:w-3 md:h-3", neo ? "bg-[#FAFF00]" : "rounded-full bg-zinc-700")} />
            </div>
            <span className={cn("text-[9px] md:text-[10px] font-mono uppercase tracking-widest", neo ? "text-[#00FF41] font-bold" : "text-zinc-500")}>sys.log</span>
            <button onClick={() => setLogs([])} className={cn("text-[9px] md:text-[10px] font-mono uppercase transition-colors lg:opacity-0 group-hover:opacity-100", neo ? "text-white hover:text-[#00FF41]" : "text-zinc-600 hover:text-white")}>Clear</button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar font-mono text-[10px] md:text-[11px] space-y-1.5 md:space-y-2 pr-2">
            {logs.length === 0 ? <div className={neo ? "text-zinc-500" : "text-zinc-600 italic"}>Waiting for events...</div> : logs.map(log => (
              <div key={log.id} className="flex gap-2 md:gap-3 leading-relaxed">
                <span className={neo ? "text-zinc-500 shrink-0" : "text-zinc-600 shrink-0"}>[{new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}]</span>
                <span className={cn("break-all", neo ? (log.type === 'success' ? "text-[#00F0FF]" : log.type === 'error' ? "text-[#FF003C]" : log.type === 'warning' ? "text-[#FAFF00]" : "text-white") : (log.type === 'success' ? "text-emerald-400" : log.type === 'error' ? "text-red-400" : log.type === 'warning' ? "text-amber-400" : "text-blue-400"))}>{log.message}</span>
              </div>
            ))}
          </div>
        </div>

      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col lg:h-full lg:overflow-hidden relative">
        
        {/* Top Navbar */}
        <header className={cn("p-4 md:p-6 lg:h-24 lg:px-8 flex flex-col-reverse sm:flex-row items-center justify-between shrink-0 z-10 gap-4", neo ? "bg-[#050505] border-b-[3px] border-[#00F0FF]" : "border-b border-zinc-200 dark:border-zinc-800/80 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-xl")}>
          <div className="relative w-full sm:max-w-xs md:max-w-sm lg:max-w-md">
            <Search className={cn("absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5", neo ? "text-[#FF00E6]" : "text-zinc-400")} />
            <input 
              type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari antrean..."
              className={cn("w-full pl-10 md:pl-12 pr-4 md:pr-5 py-2.5 md:py-3.5 text-xs md:text-sm transition-all", neo ? "bg-black border-[3px] border-[#00F0FF] shadow-[4px_4px_0px_0px_#FF00E6] focus:shadow-none focus:translate-x-[4px] focus:translate-y-[4px] rounded-none text-[#00FF41] font-bold outline-none placeholder-zinc-700" : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none dark:text-white")}
            />
          </div>
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 md:gap-3 w-full sm:w-auto">
            <button onClick={() => isNeoBrutalism ? setIsNeoBrutalism(false) : setShowThemeModal(true)} className={cn("p-2 md:p-3 transition-colors", neo ? "bg-black border-[3px] border-[#00FF41] shadow-[4px_4px_0px_0px_#FF00E6] text-[#00FF41] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-full hover:text-indigo-500")} title="Secret Theme">
              <Palette size={14} className="md:w-4 md:h-4" />
            </button>
            {!isExtensionDetected && (
              <button onClick={downloadExtensionZip} className={cn("px-4 py-2 md:px-5 md:py-2.5 text-[10px] md:text-xs flex items-center gap-2 transition-colors", neo ? "bg-[#FF003C] border-[3px] border-white shadow-[4px_4px_0px_0px_#FAFF00] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] text-white font-black uppercase" : "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full font-bold border border-amber-200 dark:border-amber-500/20 hover:bg-amber-100")}>
                <Puzzle size={14} className="md:w-4 md:h-4" /> Install Ext
              </button>
            )}
            <button onClick={() => setShowBulkModal(true)} className={cn("px-4 py-2 md:px-5 md:py-2.5 text-[10px] md:text-xs flex items-center gap-2", tBtnSecondary)}>
              <FileSpreadsheet size={14} className="md:w-4 md:h-4" /> Bulk
            </button>
            <div className={cn("hidden md:block h-5 md:h-6 w-px mx-0.5 md:mx-1", neo ? "bg-[#FF00E6] w-[3px]" : "bg-zinc-200 dark:bg-zinc-800")} />
            <button onClick={exportToCSV} className={cn("p-2 md:p-3", tBtnIcon)} title="Export CSV"><Download size={14} className="md:w-4 md:h-4" /></button>
            <button onClick={handleResetDefault} className={cn("p-2 md:p-3", tBtnIcon)} title="Reset All"><RotateCcw size={14} className="md:w-4 md:h-4" /></button>
            {!neo && <button onClick={() => setIsDarkMode(!isDarkMode)} className={cn("p-2 md:p-3", tBtnIcon)}>{isDarkMode ? <Sun size={14} className="md:w-4 md:h-4" /> : <Moon size={14} className="md:w-4 md:h-4" />}</button>}
            <button onClick={() => setShowSettingsModal(true)} className={cn("p-2 md:p-3", tBtnIcon)}><Settings2 size={14} className="md:w-4 md:h-4" /></button>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 lg:overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto flex flex-col gap-6 lg:gap-8">

            {/* Top Row: Form & Templates */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8 shrink-0">
              
              {/* Form Card */}
              <div className={cn("p-5 sm:p-6 lg:p-8", tCard)}>
                <div className="flex items-center gap-3 mb-6 lg:mb-8">
                  <div className={cn("w-8 h-8 lg:w-10 lg:h-10 flex items-center justify-center shrink-0", neo ? "bg-black border-[3px] border-[#00F0FF] text-[#00F0FF] shadow-[2px_2px_0px_0px_#FF00E6]" : "rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500")}><User className="w-4 h-4 lg:w-5 lg:h-5" /></div>
                  <h2 className={cn("font-bold text-xs lg:text-sm uppercase tracking-widest", neo ? "text-[#00F0FF] font-black" : "dark:text-white")}>Input Data Baru</h2>
                </div>
                <form onSubmit={handleAddEntry} className="space-y-4 lg:space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-5">
                    <div className="space-y-1.5 lg:space-y-2">
                      <label className={cn("text-[9px] lg:text-[10px] uppercase tracking-wider ml-1", neo ? "text-[#FAFF00] font-black" : "font-bold text-zinc-400")}>No. HP / WA</label>
                      <input type="text" value={formData.phone} onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))} className={tInput} placeholder="0812..." />
                    </div>
                    <div className="space-y-1.5 lg:space-y-2">
                      <label className={cn("text-[9px] lg:text-[10px] uppercase tracking-wider ml-1", neo ? "text-[#FAFF00] font-black" : "font-bold text-zinc-400")}>Nama Penerima</label>
                      <input type="text" value={formData.recipientName} onChange={(e) => setFormData(prev => ({ ...prev, recipientName: e.target.value }))} className={tInput} placeholder="Budi Santoso" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-5">
                    <div className="space-y-1.5 lg:space-y-2">
                      <label className={cn("text-[9px] lg:text-[10px] uppercase tracking-wider ml-1", neo ? "text-[#FAFF00] font-black" : "font-bold text-zinc-400")}>Resi / AWB</label>
                      <input type="text" value={formData.receiptNumber} onChange={(e) => setFormData(prev => ({ ...prev, receiptNumber: e.target.value }))} className={tInput} placeholder="JX123..." />
                    </div>
                    <div className="space-y-1.5 lg:space-y-2">
                      <label className={cn("text-[9px] lg:text-[10px] uppercase tracking-wider ml-1", neo ? "text-[#FAFF00] font-black" : "font-bold text-zinc-400")}>Barang</label>
                      <input type="text" value={formData.itemName} onChange={(e) => setFormData(prev => ({ ...prev, itemName: e.target.value }))} className={tInput} placeholder="Sepatu" />
                    </div>
                  </div>
                  <div className="space-y-1.5 lg:space-y-2">
                    <label className={cn("text-[9px] lg:text-[10px] uppercase tracking-wider ml-1", neo ? "text-[#FAFF00] font-black" : "font-bold text-zinc-400")}>Alamat Tujuan</label>
                    <input type="text" value={formData.address} onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))} className={tInput} placeholder="Jl. Sudirman No 1" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-5 items-end pt-1 lg:pt-2">
                    <div className="space-y-1.5 lg:space-y-2">
                      <label className={cn("text-[9px] lg:text-[10px] uppercase tracking-wider ml-1", neo ? "text-[#00FF41] font-black" : "font-bold text-amber-500")}>Val COD</label>
                      <input type="text" value={formData.cod} onChange={(e) => setFormData(prev => ({ ...prev, cod: e.target.value.replace(/[^0-9.,]/g, '') }))} className={neo ? tInput : "w-full px-4 py-3 lg:px-5 lg:py-3.5 bg-amber-50/50 dark:bg-amber-500/10 border-none rounded-xl lg:rounded-2xl text-xs lg:text-sm focus:ring-2 focus:ring-amber-500/20 outline-none transition-all dark:text-white"} placeholder="0" />
                    </div>
                    <div className="space-y-1.5 lg:space-y-2">
                      <label className={cn("text-[9px] lg:text-[10px] uppercase tracking-wider ml-1", neo ? "text-[#FF00E6] font-black" : "font-bold text-blue-500")}>Val DFOD</label>
                      <input type="text" value={formData.dfod} onChange={(e) => setFormData(prev => ({ ...prev, dfod: e.target.value.replace(/[^0-9.,]/g, '') }))} className={neo ? tInput : "w-full px-4 py-3 lg:px-5 lg:py-3.5 bg-blue-50/50 dark:bg-blue-500/10 border-none rounded-xl lg:rounded-2xl text-xs lg:text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all dark:text-white"} placeholder="0" />
                    </div>
                    <button type="submit" className={cn("flex items-center justify-center gap-2 mt-2 sm:mt-0 h-12 lg:h-[52px]", tBtnPrimary)}>
                      <Plus size={16} className="lg:w-[18px] lg:h-[18px]" /> Tambah
                    </button>
                  </div>
                </form>
              </div>

              {/* Templates Card */}
              <div className={cn("p-5 sm:p-6 lg:p-8 flex flex-col", tCard)}>
                <div className="flex items-center justify-between mb-4 lg:mb-6">
                  <div className="flex items-center gap-2 lg:gap-3">
                    <div className={cn("w-8 h-8 lg:w-10 lg:h-10 flex items-center justify-center shrink-0", neo ? "bg-black border-[3px] border-[#FAFF00] text-[#FAFF00] shadow-[2px_2px_0px_0px_#00F0FF]" : "rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500")}><MessageSquare className="w-4 h-4 lg:w-5 lg:h-5" /></div>
                    <h2 className={cn("font-bold text-xs lg:text-sm uppercase tracking-widest", neo ? "text-[#FAFF00] font-black" : "dark:text-white")}>Pesan Template</h2>
                  </div>
                  <div className={cn("flex p-1 lg:p-1.5", neo ? "bg-black border-[3px] border-[#FF00E6] shadow-[4px_4px_0px_0px_#00F0FF]" : "bg-zinc-100 dark:bg-zinc-800 rounded-lg lg:rounded-xl")}>
                    {[0,1,2].map(idx => (
                      <button key={idx} onClick={() => setActiveVariationIndex(idx)} className={cn("px-3 py-1 lg:px-4 lg:py-1.5 text-[10px] lg:text-[11px] font-bold transition-all", activeVariationIndex === idx ? (neo ? "bg-[#FF00E6] text-black" : "bg-white dark:bg-zinc-600 text-zinc-900 dark:text-white shadow-sm rounded-md lg:rounded-lg") : "text-[#00F0FF] hover:text-white")}>V{idx+1}</button>
                    ))}
                  </div>
                </div>
                
                <div className="flex gap-2 lg:gap-2.5 mb-3 lg:mb-4 overflow-x-auto custom-scrollbar pb-1 lg:pb-1.5">
                  {templates.map(t => (
                    <button key={t.id} onClick={() => { setActiveTemplateId(t.id); setActiveVariationIndex(0); }} className={cn("px-4 py-1.5 lg:px-5 lg:py-2 text-[10px] lg:text-[11px] font-bold transition-all whitespace-nowrap", activeTemplateId === t.id ? (neo ? "bg-[#00F0FF] border-[3px] border-white text-black shadow-[4px_4px_0px_0px_#FAFF00]" : "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full") : (neo ? "bg-black border-[3px] border-[#00FF41] text-[#00FF41] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#FF00E6]" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full"))}>{t.name}</button>
                  ))}
                </div>

                <textarea value={currentTemplateText} onChange={(e) => updateActiveTemplateText(e.target.value)} className={cn("w-full flex-1 min-h-[140px] lg:min-h-[160px] p-4 lg:p-5 text-xs lg:text-sm resize-none custom-scrollbar leading-relaxed", neo ? "bg-black border-[3px] border-[#FF00E6] shadow-inner font-bold text-[#00FF41] outline-none focus:bg-[#111] transition-colors" : "bg-zinc-50 dark:bg-zinc-950 border-none rounded-xl lg:rounded-2xl focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all dark:text-zinc-200")} placeholder="Tulis template..." />
                
                <div className="mt-3 lg:mt-4 flex flex-wrap gap-1.5 lg:gap-2">
                  {['{salam}', '{pengirim}', '{nama}', '{barang}', '{resi}', '{cod}', '{dfod}', '{if_cod}...{/if_cod}'].map(tag => (
                    <button key={tag} onClick={() => updateActiveTemplateText(currentTemplateText + ' ' + (tag.includes('...') ? '{if_cod}{/if_cod}' : tag))} className={cn("text-[9px] lg:text-[10px] font-mono font-bold px-2.5 py-1 lg:px-3 lg:py-1.5 transition-all", neo ? "bg-black border-2 border-[#00F0FF] text-[#00F0FF] shadow-[2px_2px_0px_0px_#FAFF00] hover:bg-[#00F0FF] hover:text-black hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]" : "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md lg:rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 active:scale-95")}>{tag}</button>
                  ))}
                </div>
              </div>

            </div>

            {/* Bottom Row: Responsive Queue Data List/Table */}
            <div className={cn("flex-1 flex flex-col overflow-hidden lg:min-h-[450px]", tCard)}>
              
              {/* Header Container */}
              <div className={cn("px-5 py-4 lg:px-8 lg:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0 shrink-0", neo ? "bg-[#111] border-b-[3px] border-[#00F0FF]" : "border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50")}>
                <div className="flex items-center justify-between sm:justify-start gap-4 w-full sm:w-auto">
                  <h2 className={cn("font-bold text-xs lg:text-sm uppercase tracking-widest", neo ? "text-[#00FF41] font-black" : "dark:text-white")}>Queue Data</h2>
                  <span className={cn("px-2 py-0.5 lg:px-3 lg:py-1 text-[10px] lg:text-[11px] font-bold", neo ? "bg-black border-2 border-[#FF00E6] shadow-[2px_2px_0px_0px_#FAFF00] text-[#FF00E6]" : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-md lg:rounded-lg")}>{filteredEntries.length} items</span>
                </div>
                <div className="flex gap-2 lg:gap-3 justify-end w-full sm:w-auto">
                  <button onClick={() => setShowPreviewModal(true)} disabled={entries.filter(e => e.status === 'pending').length === 0} className={cn("flex-1 sm:flex-none px-3 py-2 lg:px-5 lg:py-2.5 text-[9px] lg:text-[11px] disabled:opacity-50", tBtnSecondary)}>Preview</button>
                  {isConfirmingClear ? (
                    <div className="flex flex-1 sm:flex-none items-center gap-1 lg:gap-2">
                      <button onClick={clearAll} className={cn("flex-1 sm:flex-none px-3 py-2 lg:px-4 lg:py-2.5 text-[9px] lg:text-[11px] font-bold uppercase", neo ? "bg-[#FF003C] border-[3px] border-white text-white shadow-[4px_4px_0px_0px_#FAFF00] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all font-black" : "bg-red-500 text-white rounded-lg lg:rounded-xl")}>Yes</button>
                      <button onClick={() => setIsConfirmingClear(false)} className={cn("flex-1 sm:flex-none px-3 py-2 lg:px-4 lg:py-2.5 text-[9px] lg:text-[11px]", tBtnSecondary)}>Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setIsConfirmingClear(true)} className={cn("flex-1 sm:flex-none px-3 py-2 lg:px-4 lg:py-2.5 text-[9px] lg:text-[11px] font-bold uppercase", neo ? "bg-[#FF003C] border-[3px] border-white text-white shadow-[4px_4px_0px_0px_#00F0FF] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all font-black" : "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg lg:rounded-xl hover:bg-red-100 transition-all")}>Clear All</button>
                  )}
                </div>
              </div>

              {/* Grid Headers (Desktop Only) */}
              <div className={cn("hidden lg:grid grid-cols-12 gap-6 px-8 py-4 z-10 shrink-0", neo ? "bg-black border-b-[3px] border-[#FF00E6]" : "border-b border-zinc-100 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95")}>
                <div className={cn("col-span-3 text-[11px] uppercase tracking-widest", neo ? "font-black text-[#00F0FF]" : "font-black text-zinc-400")}>Penerima</div>
                <div className={cn("col-span-4 text-[11px] uppercase tracking-widest", neo ? "font-black text-[#00F0FF]" : "font-black text-zinc-400")}>Detail Paket</div>
                <div className={cn("col-span-3 text-[11px] uppercase tracking-widest", neo ? "font-black text-[#00F0FF]" : "font-black text-zinc-400")}>Status</div>
                <div className={cn("col-span-2 text-[11px] uppercase tracking-widest text-right", neo ? "font-black text-[#00F0FF]" : "font-black text-zinc-400")}>Aksi</div>
              </div>

              {/* Data List / Cards */}
              <div className={cn("flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-0", neo ? "bg-[#050505]" : "bg-zinc-50/30 dark:bg-zinc-950/30 lg:bg-transparent")}>
                <div className={cn("flex flex-col gap-4 lg:gap-0", !neo && "lg:divide-y lg:divide-zinc-50 lg:dark:divide-zinc-800/50")}>
                  <AnimatePresence mode="popLayout">
                    {filteredEntries.length === 0 ? (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center px-5 py-16 lg:py-24">
                        <div className={cn("text-xs lg:text-sm", neo ? "font-black text-[#FF00E6] uppercase" : "text-zinc-400 dark:text-zinc-600 font-medium")}>Antrean kosong.</div>
                      </motion.div>
                    ) : (
                      filteredEntries.map((entry, index) => (
                        <motion.div key={entry.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} 
                          className={cn(
                            "flex flex-col lg:grid lg:grid-cols-12 gap-3 lg:gap-6 p-5 lg:px-8 lg:py-5 relative group transition-colors",
                            neo ? "bg-[#0a0a0a] border-[3px] border-[#FAFF00] shadow-[6px_6px_0px_0px_#FF00E6] lg:shadow-none lg:border-0 lg:border-b-[3px] lg:border-[#00F0FF]" : "bg-white dark:bg-zinc-900 lg:bg-transparent rounded-2xl lg:rounded-none border border-zinc-200 dark:border-zinc-800 lg:border-transparent shadow-sm lg:shadow-none hover:bg-zinc-50 dark:hover:bg-zinc-800/30",
                            isBlasting && index === currentIndex && (neo ? "bg-[#111] border-[#00FF41] shadow-[6px_6px_0px_0px_#00FF41] lg:bg-[#111]" : "ring-2 ring-emerald-500 lg:ring-0 lg:bg-emerald-50/50 lg:dark:bg-emerald-500/5")
                          )}
                        >
                          {/* Kolom 1: Penerima */}
                          <div className="col-span-3 pr-20 lg:pr-0">
                            <div className={cn("text-sm lg:text-sm", neo ? "font-black text-white" : "font-bold text-zinc-900 dark:text-zinc-100")}>{entry.recipientName}</div>
                            <div className={cn("text-[11px] font-mono mt-1", neo ? "font-bold text-[#00F0FF]" : "text-zinc-500")}>{entry.phone}</div>
                          </div>

                          {/* Kolom 2: Detail Paket */}
                          <div className="col-span-4">
                            <div className={cn("text-xs lg:text-sm line-clamp-2 lg:line-clamp-1 lg:max-w-[280px]", neo ? "font-black text-[#FAFF00]" : "font-semibold text-zinc-700 dark:text-zinc-300")}>{entry.itemName || '-'}</div>
                            <div className="flex flex-col gap-1.5 mt-1.5">
                              <div className={cn("text-[10px] lg:text-[11px] font-mono", neo ? "font-bold text-[#FF00E6]" : "text-zinc-400")}>Resi: {entry.receiptNumber || '-'}</div>
                              <div className="flex flex-wrap gap-2">
                                {entry.cod && <div className={cn("text-[9px] lg:text-[10px] px-2 py-0.5 lg:px-2.5", neo ? "border-2 border-[#00FF41] bg-black text-[#00FF41] font-black uppercase shadow-[2px_2px_0px_0px_#00F0FF]" : "bg-amber-100/50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-md font-bold uppercase tracking-wider")}>COD: Rp {formatCurrency(entry.cod)}</div>}
                                {entry.dfod && <div className={cn("text-[9px] lg:text-[10px] px-2 py-0.5 lg:px-2.5", neo ? "border-2 border-[#FAFF00] bg-black text-[#FAFF00] font-black uppercase shadow-[2px_2px_0px_0px_#FF00E6]" : "bg-blue-100/50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-md font-bold uppercase tracking-wider")}>DFOD: Rp {formatCurrency(entry.dfod)}</div>}
                              </div>
                            </div>
                          </div>

                          {/* Kolom 3: Status */}
                          <div className={cn("col-span-3 flex flex-row lg:flex-col items-center lg:items-start justify-between lg:justify-center gap-3 pt-3 mt-1 lg:pt-0 lg:mt-0", neo ? "border-t-[3px] border-[#FF00E6] lg:border-none" : "border-t border-zinc-100 dark:border-zinc-800 lg:border-none")}>
                            <div className={cn("inline-flex items-center gap-1.5 lg:gap-2 px-2.5 py-1 lg:px-3 lg:py-1.5 text-[9px] lg:text-[10px]", neo ? ("border-[3px] border-white font-black uppercase bg-black shadow-[2px_2px_0px_0px_#00F0FF] " + (entry.status === 'sent' ? 'text-[#00FF41]' : entry.status === 'sending' ? 'text-[#00F0FF] animate-pulse' : entry.status === 'failed' ? 'text-[#FF003C]' : 'text-white')) : (entry.status === 'sent' ? "bg-emerald-100/50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg font-black uppercase tracking-widest" : entry.status === 'sending' ? "bg-blue-100/50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 animate-pulse rounded-lg font-black uppercase tracking-widest" : entry.status === 'failed' ? "bg-red-100/50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg font-black uppercase tracking-widest" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-lg font-black uppercase tracking-widest"))}>
                              {entry.status === 'sent' ? <CheckCircle2 size={12} className="lg:w-3.5 lg:h-3.5" /> : entry.status === 'sending' ? <Loader2 size={12} className="lg:w-3.5 lg:h-3.5 animate-spin" /> : entry.status === 'failed' ? <AlertCircle size={12} className="lg:w-3.5 lg:h-3.5" /> : <Clock size={12} className="lg:w-3.5 lg:h-3.5" />} {entry.status}
                            </div>
                            <button onClick={() => toggleReceived(entry.id)} className={cn("flex items-center gap-2 transition-colors", neo ? "border-[3px] border-[#FAFF00] bg-black shadow-[2px_2px_0px_0px_#FF00E6] px-2 py-1 text-[9px] lg:text-[10px] font-black uppercase text-[#FAFF00]" : (entry.isReceived ? "text-emerald-500 text-[10px] font-bold uppercase tracking-wider" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 text-[10px] font-bold uppercase tracking-wider"))}>
                              <div className={cn("flex items-center justify-center", neo ? "w-3 h-3 lg:w-3.5 lg:h-3.5 border-2 border-[#FAFF00] bg-black" : (entry.isReceived ? "w-4 h-4 lg:w-3.5 lg:h-3.5 rounded-full border-2 border-emerald-500 bg-emerald-500" : "w-4 h-4 lg:w-3.5 lg:h-3.5 rounded-full border-2 border-zinc-300 dark:border-zinc-600"))}>
                                {entry.isReceived && <CheckCircle2 size={10} className={neo ? "text-[#FF00E6]" : "text-white lg:w-[10px] lg:h-[10px]"} strokeWidth={neo ? 4 : 3} />}
                              </div>
                              Diterima
                            </button>
                          </div>

                          {/* Kolom 4: Aksi */}
                          <div className="col-span-2 flex items-center justify-end gap-1.5 lg:gap-2 absolute top-4 right-4 lg:relative lg:top-auto lg:right-auto opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleSendManual(entry)} className={cn("p-2 lg:p-2.5", tBtnIcon)}><ExternalLink size={16} className="lg:w-4 lg:h-4" /></button>
                            <button onClick={() => setEntries(prev => prev.filter(e => e.id !== entry.id))} className={cn("p-2 lg:p-2.5", neo ? tBtnIcon : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl lg:rounded-xl transition-all active:scale-95")}><Trash2 size={16} className="lg:w-4 lg:h-4" /></button>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* MODALS (Bulk & Preview & Settings) */}
      <AnimatePresence>
        {showBulkModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowBulkModal(false)} className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className={cn("relative w-full max-w-2xl flex flex-col", neo ? "bg-[#0a0a0a] border-[3px] border-[#00FF41] shadow-[12px_12px_0px_0px_#FF00E6]" : "bg-white dark:bg-zinc-900 rounded-3xl lg:rounded-[2rem] shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800")}>
              <div className={cn("p-6 lg:p-8 flex items-center justify-between", neo ? "border-b-[3px] border-[#00F0FF] bg-[#111]" : "border-b border-zinc-100 dark:border-zinc-800")}>
                <div><h2 className={cn("text-lg lg:text-xl", neo ? "font-black text-[#00F0FF] uppercase" : "font-black dark:text-white")}>Bulk Import</h2><p className={cn("text-[10px] lg:text-[11px] uppercase tracking-widest font-bold mt-1", neo ? "text-white" : "text-zinc-500")}>Copy-paste dari Excel</p></div>
                <button onClick={() => setShowBulkModal(false)} className={cn("p-2 lg:p-3", neo ? "border-[3px] border-[#FF003C] bg-black text-[#FF003C] shadow-[2px_2px_0px_0px_#FF00E6] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none" : "hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full")}><X size={20} className={neo ? "" : "text-zinc-500 lg:w-6 lg:h-6"} /></button>
              </div>
              <div className={cn("p-6 lg:p-8 space-y-4 lg:space-y-5", neo ? "" : "")}>
                <div className={cn("text-[10px] lg:text-xs font-mono leading-relaxed", neo ? "bg-black border-[3px] border-[#FAFF00] p-3 lg:p-4 text-[#FAFF00] font-bold shadow-[4px_4px_0px_0px_#00F0FF]" : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-3 lg:p-4 rounded-xl border border-emerald-100 dark:border-emerald-500/20")}>Format Kolom: No | Resi | Nama | HP | Alamat | Tanda | Val COD | Val DFOD | Barang</div>
                <textarea value={bulkData} onChange={(e) => setBulkData(e.target.value)} placeholder="Paste data Excel di sini..." className={cn("w-full h-48 lg:h-64 p-4 lg:p-5 text-xs lg:text-sm font-mono resize-none custom-scrollbar leading-relaxed", neo ? "bg-black border-[3px] border-[#FF00E6] shadow-[6px_6px_0px_0px_#00FF41] outline-none text-[#00F0FF] focus:shadow-none focus:translate-x-[6px] focus:translate-y-[6px]" : "bg-zinc-50 dark:bg-zinc-950 border-none rounded-xl lg:rounded-2xl focus:ring-2 focus:ring-emerald-500/20 outline-none dark:text-zinc-300")} />
                <button onClick={handleBulkImport} className={tBtnPrimary}>Import Data</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPreviewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPreviewModal(false)} className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className={cn("relative w-full max-w-md", neo ? "bg-[#0a0a0a] border-[3px] border-[#00FF41] shadow-[12px_12px_0px_0px_#FF00E6]" : "bg-white dark:bg-zinc-900 rounded-3xl lg:rounded-[2rem] shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800")}>
              <div className={cn("p-6 lg:p-8 flex items-center justify-between", neo ? "border-b-[3px] border-[#00F0FF] bg-[#111]" : "border-b border-zinc-100 dark:border-zinc-800")}>
                <div><h2 className={cn("text-lg lg:text-xl", neo ? "font-black text-[#00F0FF] uppercase" : "font-black dark:text-white")}>Preview</h2><p className={cn("text-[10px] lg:text-[11px] uppercase tracking-widest font-bold mt-1", neo ? "text-white" : "text-zinc-500")}>First Item</p></div>
                <button onClick={() => setShowPreviewModal(false)} className={cn("p-2 lg:p-3", neo ? "border-[3px] border-[#FF003C] bg-black text-[#FF003C] shadow-[2px_2px_0px_0px_#FF00E6] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none" : "hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full")}><X size={20} className={neo ? "" : "text-zinc-500 lg:w-6 lg:h-6"} /></button>
              </div>
              <div className={cn("p-6 lg:p-8", neo ? "" : "")}>
                {entries.find(e => e.status === 'pending') ? (
                  <div className="space-y-4 lg:space-y-5">
                    <div className={cn("p-4 lg:p-5 text-xs lg:text-sm whitespace-pre-wrap max-h-[40vh] overflow-y-auto custom-scrollbar leading-relaxed", neo ? "bg-black border-[3px] border-[#FAFF00] shadow-[6px_6px_0px_0px_#00F0FF] text-white font-bold font-mono" : "bg-zinc-50 dark:bg-zinc-950 rounded-xl lg:rounded-2xl dark:text-zinc-300 border border-zinc-100 dark:border-zinc-800")}>
                      {generateMessage(entries.find(e => e.status === 'pending')!, settings.rotateTemplates ? (activeTemplate.variations?.[entries.filter(e => e.status === 'sent').length % (activeTemplate.variations?.length || 1)] || activeTemplate.text) : activeTemplate.text)}
                    </div>
                    <button onClick={() => {
                      const entry = entries.find(e => e.status === 'pending');
                      if (entry) { openInSameTab(getWALink(entry, entries.filter(e => e.status === 'sent').length)); updateStatus(entry.id, 'sent'); setShowPreviewModal(false); }
                    }} className={cn("flex items-center justify-center gap-2", tBtnPrimary)}><Send size={16} className="lg:w-[18px] lg:h-[18px]" /> Send Now</button>
                  </div>
                ) : <div className={cn("text-center py-8 lg:py-10 text-xs lg:text-sm", neo ? "text-[#00F0FF] font-black uppercase" : "text-zinc-500")}>No pending entries.</div>}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettingsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSettingsModal(false)} className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className={cn("relative w-full max-w-lg flex flex-col max-h-[90vh]", neo ? "bg-[#0a0a0a] border-[3px] border-[#00FF41] shadow-[12px_12px_0px_0px_#FF00E6]" : "bg-white dark:bg-zinc-900 rounded-3xl lg:rounded-[2.5rem] shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800")}>
              <div className={cn("p-6 lg:p-8 flex items-center justify-between shrink-0", neo ? "border-b-[3px] border-[#00F0FF] bg-[#111]" : "border-b border-zinc-100 dark:border-zinc-800")}>
                <div><h2 className={cn("text-lg lg:text-xl", neo ? "font-black text-[#00F0FF] uppercase" : "font-black dark:text-white")}>Settings</h2><p className={cn("text-[10px] lg:text-[11px] uppercase tracking-widest font-bold mt-1", neo ? "text-white" : "text-zinc-500")}>Engine Config</p></div>
                <button onClick={() => setShowSettingsModal(false)} className={cn("p-2 lg:p-3", neo ? "border-[3px] border-[#FF003C] bg-black text-[#FF003C] shadow-[2px_2px_0px_0px_#FF00E6] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none" : "hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full")}><X size={20} className={neo ? "" : "text-zinc-500 lg:w-6 lg:h-6"} /></button>
              </div>
              <div className={cn("flex px-6 lg:px-8 pt-4 lg:pt-5 gap-6 lg:gap-8 shrink-0", neo ? "border-b-[3px] border-[#00F0FF] bg-[#111]" : "border-b border-zinc-100 dark:border-zinc-800")}>
                <button onClick={() => setActiveSettingsTab('general')} className={cn("pb-3 lg:pb-4 text-[11px] lg:text-[12px] uppercase tracking-widest transition-all relative", neo ? (activeSettingsTab === 'general' ? "font-black text-[#00FF41]" : "font-bold text-zinc-600") : (activeSettingsTab === 'general' ? "font-black text-emerald-500" : "font-black text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"))}>
                  General {activeSettingsTab === 'general' && <motion.div layoutId="tab" className={cn("absolute bottom-0 left-0 right-0 h-[3px]", neo ? "bg-[#00FF41]" : "bg-emerald-500 rounded-t-full")} />}
                </button>
                <button onClick={() => setActiveSettingsTab('antispam')} className={cn("pb-3 lg:pb-4 text-[11px] lg:text-[12px] uppercase tracking-widest transition-all relative", neo ? (activeSettingsTab === 'antispam' ? "font-black text-[#00FF41]" : "font-bold text-zinc-600") : (activeSettingsTab === 'antispam' ? "font-black text-emerald-500" : "font-black text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"))}>
                  Anti-Spam {activeSettingsTab === 'antispam' && <motion.div layoutId="tab" className={cn("absolute bottom-0 left-0 right-0 h-[3px]", neo ? "bg-[#00FF41]" : "bg-emerald-500 rounded-t-full")} />}
                </button>
              </div>
              <div className={cn("p-6 lg:p-8 overflow-y-auto custom-scrollbar flex-1 space-y-5 lg:space-y-6", neo ? "bg-[#050505]" : "")}>
                {activeSettingsTab === 'antispam' ? (
                  <>
                    <div className={cn("p-5 lg:p-6", neo ? "bg-[#111] border-[3px] border-[#FAFF00] shadow-[6px_6px_0px_0px_#00F0FF]" : "bg-zinc-50 dark:bg-zinc-950 rounded-2xl lg:rounded-[1.5rem] border border-zinc-100 dark:border-zinc-800")}>
                      <div className="flex items-center justify-between mb-2 lg:mb-3"><span className={cn("text-[11px] lg:text-xs uppercase", neo ? "font-black text-[#FAFF00]" : "font-bold text-zinc-500")}>Safety Score</span><span className={cn("font-black text-base lg:text-lg", neo ? "text-white" : (safetyScore > 80 ? "text-emerald-500" : safetyScore > 50 ? "text-amber-500" : "text-red-500"))}>{safetyScore}%</span></div>
                      <div className={cn("w-full overflow-hidden mb-1.5 lg:mb-2", neo ? "h-3 border-[3px] border-white bg-black" : "h-1.5 lg:h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full")}><motion.div initial={{ width: 0 }} animate={{ width: `${safetyScore}%` }} className={cn("h-full", neo ? (safetyScore > 80 ? "bg-[#00FF41]" : safetyScore > 50 ? "bg-[#FAFF00]" : "bg-[#FF003C]") : (safetyScore > 80 ? "bg-emerald-500" : safetyScore > 50 ? "bg-amber-500" : "bg-red-500"))} /></div>
                    </div>
                    {[
                      { key: 'shuffleQueue', label: 'Shuffle Queue', desc: 'Acak daftar agar tidak linier.' },
                      { key: 'useRandomGreetings', label: 'Randomize Greetings', desc: 'Ganti kata sapaan otomatis.' },
                      { key: 'addRandomSuffix', label: 'Inject Ref Suffix', desc: 'Tambah string acak di akhir.' },
                      { key: 'useInvisibleChars', label: 'Invisible Characters', desc: 'Sisipkan zero-width space.' },
                      { key: 'simulateTyping', label: 'Human Typing Sim', desc: 'Delay dihitung sesuai panjang teks.' },
                      { key: 'adaptiveDelay', label: 'Adaptive Fatigue', desc: 'Jeda bertambah sedikit seiring antrean.' },
                      { key: 'randomizeFormatting', label: 'Dynamic Spacing', desc: 'Format baris baru diacak.' },
                      { key: 'rotateTemplates', label: 'Template Rotation', desc: 'Gunakan variasi pesan bergantian.' },
                      { key: 'randomizeEmojis', label: 'Emoji Scrambler', desc: 'Taruh emoji random dinamis.' },
                      { key: 'useGlobalSpintax', label: 'Spintax Engine', desc: 'Aktifkan format {A|B}.' }
                    ].map(item => (
                      <div key={item.key} className="flex items-center justify-between">
                        <div className="pr-4"><div className={cn("text-xs lg:text-sm mb-0.5", neo ? "font-black text-white uppercase" : "font-bold dark:text-white")}>{item.label}</div><div className={cn("text-[10px] lg:text-[11px]", neo ? "font-bold text-[#00F0FF]" : "text-zinc-500")}>{item.desc}</div></div>
                        <button onClick={() => setSettings(prev => ({ ...prev, [item.key]: !prev[item.key as keyof AppSettings] }))} className={cn("transition-all relative shrink-0", neo ? (settings[item.key as keyof AppSettings] ? "w-14 h-8 bg-[#00FF41] border-[3px] border-white shadow-[4px_4px_0px_0px_#FF00E6]" : "w-14 h-8 bg-black border-[3px] border-zinc-600 shadow-[4px_4px_0px_0px_#00F0FF]") : (settings[item.key as keyof AppSettings] ? "w-10 h-6 lg:w-12 lg:h-7 rounded-full bg-emerald-500" : "w-10 h-6 lg:w-12 lg:h-7 rounded-full bg-zinc-200 dark:bg-zinc-700"))}><div className={cn("absolute transition-all", neo ? "w-4 h-4 bg-white border-[3px] border-black top-[1.5px]" : "w-4 h-4 lg:w-5 lg:h-5 bg-white rounded-full top-1", settings[item.key as keyof AppSettings] ? (neo ? "left-[26px]" : "left-5 lg:left-6") : (neo ? "left-[1px]" : "left-1"))} /></button>
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    <div className="space-y-2 lg:space-y-3"><label className={cn("text-[10px] lg:text-[11px] uppercase tracking-widest ml-1", neo ? "font-black text-[#00F0FF]" : "font-bold text-zinc-500")}>Speed Preset</label><div className="grid grid-cols-2 lg:grid-cols-3 gap-2 lg:gap-3">{[{id:'safe', label:'Safe'},{id:'normal', label:'Normal'},{id:'fast', label:'Fast'},{id:'turbo', label:'Turbo'},{id:'custom', label:'Custom'}].map(m => <button key={m.id} onClick={() => setSettings(prev => ({ ...prev, speedMode: m.id as any }))} className={cn("py-2.5 lg:py-3.5 text-[11px] lg:text-xs transition-all", neo ? (settings.speedMode === m.id ? "bg-[#FF00E6] text-black font-black uppercase border-[3px] border-white shadow-[4px_4px_0px_0px_#00F0FF]" : "bg-black text-[#00FF41] font-bold uppercase border-[3px] border-[#00FF41] hover:bg-[#111]") : (settings.speedMode === m.id ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border border-transparent font-bold rounded-xl lg:rounded-2xl" : "bg-transparent border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-bold rounded-xl lg:rounded-2xl"))}>{m.label}</button>)}</div></div>
                    {settings.speedMode === 'custom' && <div className="space-y-1.5 lg:space-y-2"><label className={cn("text-[10px] lg:text-[11px] uppercase tracking-widest ml-1", neo ? "font-black text-[#00F0FF]" : "font-bold text-zinc-500")}>Custom Delay (ms)</label><input type="number" value={settings.delay} onChange={(e) => setSettings(prev => ({ ...prev, delay: parseInt(e.target.value) || 1000 }))} className={tInput} step="500" /></div>}
                    
                    <div className={cn("pt-3 lg:pt-4 space-y-4 lg:space-y-5", neo ? "border-t-[3px] border-[#FF00E6]" : "border-t border-zinc-100 dark:border-zinc-800")}>
                      {[
                        { key: 'manualMode', label: 'Manual Mode', desc: 'Kirim saat tekan Spasi.' },
                        { key: 'autoRetry', label: 'Auto Retry', desc: 'Ulangi jika gagal.' },
                        { key: 'autoSend', label: 'Auto Send (Ext)', desc: 'Eksekusi dgn Extension.' }
                      ].map(item => (
                        <div key={item.key} className="flex items-center justify-between">
                          <div className="pr-4"><div className={cn("text-xs lg:text-sm mb-0.5", neo ? "font-black text-white uppercase" : "font-bold dark:text-white")}>{item.label}</div><div className={cn("text-[10px] lg:text-[11px]", neo ? "font-bold text-[#00F0FF]" : "text-zinc-500")}>{item.desc}</div></div>
                          <button onClick={() => setSettings(prev => ({ ...prev, [item.key]: !prev[item.key as keyof AppSettings] }))} className={cn("transition-all relative shrink-0", neo ? (settings[item.key as keyof AppSettings] ? "w-14 h-8 bg-[#00FF41] border-[3px] border-white shadow-[4px_4px_0px_0px_#FF00E6]" : "w-14 h-8 bg-black border-[3px] border-zinc-600 shadow-[4px_4px_0px_0px_#00F0FF]") : (settings[item.key as keyof AppSettings] ? "w-10 h-6 lg:w-12 lg:h-7 rounded-full bg-emerald-500" : "w-10 h-6 lg:w-12 lg:h-7 rounded-full bg-zinc-200 dark:bg-zinc-700"))}><div className={cn("absolute transition-all", neo ? "w-4 h-4 bg-white border-[3px] border-black top-[1.5px]" : "w-4 h-4 lg:w-5 lg:h-5 bg-white rounded-full top-1", settings[item.key as keyof AppSettings] ? (neo ? "left-[26px]" : "left-5 lg:left-6") : (neo ? "left-[1px]" : "left-1"))} /></button>
                        </div>
                      ))}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 lg:gap-4 pt-3 lg:pt-4">
                      <div className="space-y-1.5 lg:space-y-2"><label className={cn("text-[9px] lg:text-[10px] uppercase tracking-widest ml-1", neo ? "font-black text-[#FAFF00]" : "font-bold text-zinc-500")}>Batch Size</label><input type="number" value={settings.batchSize} onChange={(e) => setSettings(prev => ({ ...prev, batchSize: parseInt(e.target.value) || 0 }))} className={tInput} /></div>
                      <div className="space-y-1.5 lg:space-y-2"><label className={cn("text-[9px] lg:text-[10px] uppercase tracking-widest ml-1", neo ? "font-black text-[#FAFF00]" : "font-bold text-zinc-500")}>Pause (ms)</label><input type="number" value={settings.batchPause} onChange={(e) => setSettings(prev => ({ ...prev, batchPause: parseInt(e.target.value) || 0 }))} className={tInput} /></div>
                      <div className="space-y-1.5 lg:space-y-2"><label className={cn("text-[9px] lg:text-[10px] uppercase tracking-widest ml-1", neo ? "font-black text-[#FAFF00]" : "font-bold text-zinc-500")}>Hourly Lmt</label><input type="number" value={settings.hourlyLimit} onChange={(e) => setSettings(prev => ({ ...prev, hourlyLimit: parseInt(e.target.value) || 0 }))} className={tInput} /></div>
                      <div className="space-y-1.5 lg:space-y-2"><label className={cn("text-[9px] lg:text-[10px] uppercase tracking-widest ml-1", neo ? "font-black text-[#FAFF00]" : "font-bold text-zinc-500")}>Error Lmt</label><input type="number" value={settings.stopOnConsecutiveErrors} onChange={(e) => setSettings(prev => ({ ...prev, stopOnConsecutiveErrors: parseInt(e.target.value) || 0 }))} className={tInput} /></div>
                    </div>
                  </>
                )}
              </div>
              <div className={cn("p-4 lg:p-6 shrink-0", neo ? "bg-[#111] border-t-[3px] border-[#00F0FF]" : "")}><button onClick={() => setShowSettingsModal(false)} className={tBtnPrimary}>Save Config</button></div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
