import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Send, Trash2, Play, Square, MessageSquare, User, Package, Hash, Phone,
  FileText, CheckCircle2, Clock, AlertCircle, Settings2, Download, FileSpreadsheet,
  X, Search, Sparkles, BarChart3, History, Timer, ExternalLink, ChevronRight, Moon,
  Sun, RotateCcw, Shield, Puzzle, Loader2, Zap, Terminal
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
      toast(`Anti-Spam: Istirahat sejenak selama ${settings.batchPause / 1000} detik...`, { icon: '🛡️' });
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
    
    const newWindow = window.open(getWALink(firstEntry), 'WAsenderTab');
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
          stopBlast(); addLog(`🚨 PERINGATAN SPAM OLEH WHATSAPP!`, 'error'); toast.error('PERINGATAN SPAM!', { icon: '🚨' });
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
  }, [lastHeartbeat, isExtensionDetected, settings.autoRetry, settings.maxRetries, settings.speedMode]);

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
          const newWindow = window.open(getWALink(entry, entries.filter(e => e.status === 'sent').length), 'WAsenderTab');
          if (!newWindow) { addLog(`⚠️ Browser memblokir popup.`, 'warning'); setNextActionTime(Date.now() + 3000); return; }
          window.focus();

          if (settings.autoSend) updateStatus(entry.id, 'sending');
          else {
            updateStatus(entry.id, 'sent');
            setNextActionTime(Date.now() + calculateNextDelay(entries.filter(e => e.status === 'sent').length + 1, pendingEntries[1] || entry));
          }
        } else setCountdown(Math.max(0, Math.ceil((nextActionTime - now) / 1000)));
      } else { setIsBlasting(false); addLog(`🏁 Blast selesai!`, 'success'); }
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
          window.open(getWALink(pending[0]), 'WAsenderTab'); updateStatus(pending[0].id, 'sent');
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
    return [{ name: 'Sent', value: sent, color: '#10b981' }, { name: 'Pending', value: pending, color: '#f59e0b' }, { name: 'Received', value: received, color: '#0ea5e9' }];
  }, [entries]);

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

  return (
    <div className={cn(
      "h-screen w-full flex overflow-hidden font-sans selection:bg-emerald-500/30 transition-colors duration-300",
      isDarkMode ? "dark bg-[#09090b] text-zinc-200" : "bg-[#f4f4f5] text-zinc-900"
    )}>
      {/* Diubah ke top-center agar tidak bentrok dengan floating widget */}
      <Toaster position="top-center" toastOptions={{ className: 'dark:bg-zinc-800 dark:text-white border dark:border-zinc-700 mt-4' }} />

      {/* FLOATING HUD WIDGET (Menggantikan Fullscreen Overlay) */}
      <AnimatePresence>
        {isBlasting && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-8 right-8 z-[100] w-[340px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]"
          >
            <div className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 p-6 rounded-[2rem] flex flex-col relative overflow-hidden">
              
              {/* Thin Progress Bar di atas widget */}
              <div className="absolute top-0 left-0 w-full h-1 bg-zinc-800">
                <motion.div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400" 
                  initial={{ width: "0%" }}
                  animate={{ width: `${entries.length > 0 ? (entries.filter(e => e.status === 'sent').length / entries.length) * 100 : 0}%` }}
                />
              </div>
              
              <div className="flex items-center gap-4 mb-5 mt-2">
                <div className="relative w-12 h-12 shrink-0">
                  <div className="absolute inset-0 border-4 border-zinc-800 rounded-full" />
                  <div className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Play size={14} className="text-emerald-500 fill-current translate-x-[1px]" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white leading-tight">
                    {isLongBreak ? 'System Sleeping 😴' : entries.some(e => e.status === 'sending') ? 'Waiting WA Web ⏳' : 'Engine Running 🚀'}
                  </h3>
                  <div className="text-[11px] text-zinc-400 mt-1 font-medium">
                    Sent: <span className="text-emerald-400 font-bold">{entries.filter(e => e.status === 'sent').length}</span> / {entries.length} items
                  </div>
                </div>
              </div>

              {!settings.manualMode ? (
                <div className="mb-5 bg-zinc-950 rounded-[1rem] p-4 border border-zinc-800/80 flex items-center justify-between shadow-inner">
                  <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
                    {entries.some(e => e.status === 'sending') ? 'Processing' : isLongBreak ? 'Break Left' : 'Next In'}
                  </span>
                  <div className={cn("text-2xl font-black tabular-nums tracking-tighter", isLongBreak ? "text-amber-500" : entries.some(e => e.status === 'sending') ? "text-blue-500 animate-pulse" : "text-white")}>
                    {entries.some(e => e.status === 'sending') ? '--:--' : `${Math.floor(countdown / 60)}:${(countdown % 60).toString().padStart(2, '0')}`}
                  </div>
                </div>
              ) : (
                <div className="mb-5 bg-zinc-950 rounded-[1rem] p-4 border border-zinc-800/80 text-center shadow-inner">
                  <div className="text-emerald-400 font-bold text-[10px] uppercase tracking-widest mb-1">Manual Mode</div>
                  <div className="text-[11px] text-zinc-400">Tekan [ENTER] di WA atau klik lanjut.</div>
                </div>
              )}

              <div className="w-full flex flex-col gap-2.5">
                {entries.some(e => e.status === 'sending') && (
                  <button onClick={() => { const s = entries.find(e => e.status === 'sending'); if(s) updateStatus(s.id, 'sent'); }} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-[13px] transition-all active:scale-95 shadow-sm">Force Skip (Lewati)</button>
                )}
                {Date.now() >= nextActionTime && entries.filter(e => e.status === 'pending').length > 0 && !entries.some(e => e.status === 'sending') && !settings.manualMode && (
                  <button onClick={() => {
                    const entry = entries.find(e => e.status === 'pending');
                    if(entry) {
                      window.open(getWALink(entry, entries.filter(e => e.status === 'sent').length), 'WAsenderTab');
                      if(settings.autoSend) updateStatus(entry.id, 'sending'); else updateStatus(entry.id, 'sent');
                    }
                  }} className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-[13px] transition-all active:scale-95 shadow-sm">Trigger Manual (Blocked)</button>
                )}
                {settings.manualMode && (
                  <button onClick={() => {
                    const pending = entries.filter(e => e.status === 'pending');
                    if (pending.length > 0) { window.open(getWALink(pending[0]), 'WAsenderTab'); updateStatus(pending[0].id, 'sent'); }
                  }} className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white rounded-xl font-bold text-[13px] transition-all active:scale-95 shadow-sm">Kirim Berikutnya</button>
                )}
                <button onClick={stopBlast} className="w-full py-3 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-xl font-bold text-[13px] transition-all active:scale-95">Stop Engine</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LEFT SIDEBAR (Command Center) */}
      <aside className="w-[360px] h-full p-6 flex flex-col gap-6 border-r border-zinc-200 dark:border-zinc-800/80 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-xl shrink-0 z-10 hidden lg:flex">
        
        {/* Brand */}
        <div className="flex items-center gap-4 px-2 pt-2">
          <div className="w-12 h-12 bg-zinc-900 dark:bg-white rounded-2xl flex items-center justify-center shadow-lg">
            <Send size={24} className="text-white dark:text-zinc-900 translate-x-[1px]" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight dark:text-white leading-none">WAsender</h1>
            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mt-1.5">PRO Engine v2</p>
          </div>
        </div>

        {/* Master Control */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-6 flex flex-col gap-5 shadow-sm">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">System Status</span>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
              <div className={cn("w-2 h-2 rounded-full", isBlasting ? "bg-emerald-500 animate-pulse" : "bg-zinc-400")} />
              <span className="text-[10px] font-bold dark:text-zinc-300 uppercase">{isBlasting ? 'Running' : 'Standby'}</span>
            </div>
          </div>
          
          <button
            onClick={isBlasting ? stopBlast : startBlast}
            disabled={entries.length === 0}
            className={cn(
              "w-full h-16 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95 disabled:opacity-50 disabled:active:scale-100",
              isBlasting 
                ? "bg-red-500 hover:bg-red-600 text-white shadow-red-500/20" 
                : "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-zinc-900/10 hover:scale-[1.02]"
            )}
          >
            {isBlasting ? <Square size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
            {isBlasting ? 'STOP ENGINE' : 'START BLAST'}
          </button>

          <div className={cn(
            "flex items-center justify-between px-4 py-3.5 rounded-2xl border text-[11px] font-bold transition-all",
            isExtensionDetected 
              ? "bg-emerald-50/50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400" 
              : "bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400"
          )}>
            <div className="flex items-center gap-2.5"><Puzzle size={16} className={isExtensionDetected ? "animate-pulse" : ""} /> Extension</div>
            <span className="uppercase">{isExtensionDetected ? 'Connected' : 'Offline'}</span>
          </div>
        </div>

        {/* Quick Settings (Brought back to main dashboard) */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-6 shadow-sm flex flex-col gap-5">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Pengirim / CS</label>
            <input 
              type="text" 
              value={settings.senderName}
              onChange={(e) => setSettings(prev => ({ ...prev, senderName: e.target.value }))}
              className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all dark:text-white"
              placeholder="Admin JNT"
            />
          </div>
          <div className="space-y-3 pt-1">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Delay Waktu</label>
              <span className="text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded-md">{settings.delay / 1000}s</span>
            </div>
            <input 
              type="range" 
              min="1000" 
              max="10000" 
              step="500"
              value={settings.delay}
              onChange={(e) => setSettings(prev => ({ ...prev, delay: parseInt(e.target.value) }))}
              className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between text-[9px] font-bold tracking-widest text-zinc-400 uppercase">
              <span>Fast</span>
              <span>Safe</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-6 shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-5">Analytics</div>
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statsData} innerRadius={28} outerRadius={40} paddingAngle={5} dataKey="value" stroke="none">
                    {statsData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <RechartsTooltip cursor={false} contentStyle={{ backgroundColor: isDarkMode ? '#18181b' : '#fff', borderColor: isDarkMode ? '#27272a' : '#e2e8f0', borderRadius: '16px', padding: '12px', fontSize: '12px', fontWeight: 'bold' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 flex flex-col gap-3">
              {statsData.map(s => (
                <div key={s.name} className="flex justify-between items-center text-xs font-bold">
                  <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} /> <span className="text-zinc-500 dark:text-zinc-400">{s.name}</span></div>
                  <span className="text-sm dark:text-white">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Terminal Logging */}
        <div className="flex-1 bg-zinc-950 dark:bg-[#0a0a0a] rounded-[2rem] border border-zinc-800 p-6 flex flex-col overflow-hidden shadow-inner relative group min-h-[160px]">
          <div className="flex justify-between items-center mb-4 shrink-0">
            <div className="flex gap-2.5">
              <div className="w-3 h-3 rounded-full bg-zinc-700" />
              <div className="w-3 h-3 rounded-full bg-zinc-700" />
            </div>
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">sys.log</span>
            <button onClick={() => setLogs([])} className="text-[10px] font-mono text-zinc-600 hover:text-white uppercase transition-colors opacity-0 group-hover:opacity-100">Clear</button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar font-mono text-[11px] space-y-2 pr-2">
            {logs.length === 0 ? <div className="text-zinc-600 italic">Waiting for events...</div> : logs.map(log => (
              <div key={log.id} className="flex gap-3 leading-relaxed">
                <span className="text-zinc-600 shrink-0">[{new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}]</span>
                <span className={cn("break-all", log.type === 'success' ? "text-emerald-400" : log.type === 'error' ? "text-red-400" : log.type === 'warning' ? "text-amber-400" : "text-blue-400")}>{log.message}</span>
              </div>
            ))}
          </div>
        </div>

      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 h-full flex flex-col overflow-hidden relative">
        
        {/* Top Navbar */}
        <header className="h-24 px-8 flex items-center justify-between shrink-0 border-b border-zinc-200 dark:border-zinc-800/80 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-xl z-10">
          <div className="relative w-full max-w-md hidden md:block">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input 
              type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari data antrean..."
              className="w-full pl-12 pr-5 py-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all dark:text-white"
            />
          </div>
          <div className="flex items-center gap-3 ml-auto">
            {!isExtensionDetected && (
              <button onClick={downloadExtensionZip} className="px-5 py-2.5 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full text-xs font-bold flex items-center gap-2.5 border border-amber-200 dark:border-amber-500/20 hover:bg-amber-100 transition-colors">
                <Puzzle size={16} /> Install Ext
              </button>
            )}
            <button onClick={() => setShowBulkModal(true)} className="px-5 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-full text-xs font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex items-center gap-2.5">
              <FileSpreadsheet size={16} /> Bulk
            </button>
            <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />
            <button onClick={exportToCSV} className="p-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors" title="Export CSV"><Download size={18} /></button>
            <button onClick={handleResetDefault} className="p-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-full hover:text-red-500 transition-colors" title="Reset All"><RotateCcw size={18} /></button>
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-full hover:text-emerald-500 transition-colors">{isDarkMode ? <Sun size={18} /> : <Moon size={18} />}</button>
            <button onClick={() => setShowSettingsModal(true)} className="p-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-full hover:text-emerald-500 transition-colors"><Settings2 size={18} /></button>
          </div>
        </header>

        {/* Scrollable Content (Bento Grid) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          <div className="max-w-6xl mx-auto flex flex-col gap-8">

            {/* Top Row: Form & Templates */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 shrink-0">
              
              {/* Form Card */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 flex items-center justify-center"><User size={20} /></div>
                  <h2 className="font-bold text-sm dark:text-white uppercase tracking-widest">Input Data Baru</h2>
                </div>
                <form onSubmit={handleAddEntry} className="space-y-5">
                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider ml-1">No. HP / WA</label>
                      <input type="text" value={formData.phone} onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))} className="w-full px-5 py-3.5 bg-zinc-50 dark:bg-zinc-950 border-none rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all dark:text-white" placeholder="0812..." />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider ml-1">Nama Penerima</label>
                      <input type="text" value={formData.recipientName} onChange={(e) => setFormData(prev => ({ ...prev, recipientName: e.target.value }))} className="w-full px-5 py-3.5 bg-zinc-50 dark:bg-zinc-950 border-none rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all dark:text-white" placeholder="Budi Santoso" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider ml-1">Resi / AWB</label>
                      <input type="text" value={formData.receiptNumber} onChange={(e) => setFormData(prev => ({ ...prev, receiptNumber: e.target.value }))} className="w-full px-5 py-3.5 bg-zinc-50 dark:bg-zinc-950 border-none rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all dark:text-white" placeholder="JX123..." />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider ml-1">Barang</label>
                      <input type="text" value={formData.itemName} onChange={(e) => setFormData(prev => ({ ...prev, itemName: e.target.value }))} className="w-full px-5 py-3.5 bg-zinc-50 dark:bg-zinc-950 border-none rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all dark:text-white" placeholder="Sepatu" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider ml-1">Alamat Tujuan</label>
                    <input type="text" value={formData.address} onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))} className="w-full px-5 py-3.5 bg-zinc-50 dark:bg-zinc-950 border-none rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all dark:text-white" placeholder="Jl. Sudirman No 1" />
                  </div>
                  <div className="grid grid-cols-3 gap-5 items-end pt-2">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-amber-500 uppercase tracking-wider ml-1">Val COD</label>
                      <input type="text" value={formData.cod} onChange={(e) => setFormData(prev => ({ ...prev, cod: e.target.value.replace(/[^0-9.,]/g, '') }))} className="w-full px-5 py-3.5 bg-amber-50/50 dark:bg-amber-500/10 border-none rounded-2xl text-sm focus:ring-2 focus:ring-amber-500/20 outline-none transition-all dark:text-white" placeholder="0" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-blue-500 uppercase tracking-wider ml-1">Val DFOD</label>
                      <input type="text" value={formData.dfod} onChange={(e) => setFormData(prev => ({ ...prev, dfod: e.target.value.replace(/[^0-9.,]/g, '') }))} className="w-full px-5 py-3.5 bg-blue-50/50 dark:bg-blue-500/10 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all dark:text-white" placeholder="0" />
                    </div>
                    <button type="submit" className="w-full py-3.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-bold text-sm hover:scale-[0.98] transition-transform flex items-center justify-center gap-2.5 shadow-md">
                      <Plus size={18} /> Tambah
                    </button>
                  </div>
                </form>
              </div>

              {/* Templates Card */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-8 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 flex items-center justify-center"><MessageSquare size={20} /></div>
                    <h2 className="font-bold text-sm dark:text-white uppercase tracking-widest">Pesan Template</h2>
                  </div>
                  <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-xl">
                    {[0,1,2].map(idx => (
                      <button key={idx} onClick={() => setActiveVariationIndex(idx)} className={cn("px-4 py-1.5 text-[11px] font-bold rounded-lg transition-all", activeVariationIndex === idx ? "bg-white dark:bg-zinc-600 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500")}>V{idx+1}</button>
                    ))}
                  </div>
                </div>
                
                <div className="flex gap-2.5 mb-4 overflow-x-auto custom-scrollbar pb-1.5">
                  {templates.map(t => (
                    <button key={t.id} onClick={() => { setActiveTemplateId(t.id); setActiveVariationIndex(0); }} className={cn("px-5 py-2 rounded-full text-[11px] font-bold transition-all whitespace-nowrap", activeTemplateId === t.id ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700")}>{t.name}</button>
                  ))}
                </div>

                <textarea value={currentTemplateText} onChange={(e) => updateActiveTemplateText(e.target.value)} className="w-full flex-1 min-h-[160px] p-5 text-sm bg-zinc-50 dark:bg-zinc-950 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all resize-none dark:text-zinc-200 custom-scrollbar leading-relaxed" placeholder="Tulis template..." />
                
                <div className="mt-4 flex flex-wrap gap-2">
                  {['{salam}', '{pengirim}', '{nama}', '{barang}', '{resi}', '{cod}', '{dfod}', '{if_cod}...{/if_cod}'].map(tag => (
                    <button key={tag} onClick={() => updateActiveTemplateText(currentTemplateText + ' ' + (tag.includes('...') ? '{if_cod}{/if_cod}' : tag))} className="text-[10px] font-mono font-bold px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 active:scale-95 transition-all">{tag}</button>
                  ))}
                </div>
              </div>

            </div>

            {/* Bottom Row: Table */}
            <div className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] shadow-sm flex flex-col overflow-hidden min-h-[450px]">
              <div className="px-8 py-5 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
                <div className="flex items-center gap-4">
                  <h2 className="font-bold text-sm dark:text-white uppercase tracking-widest">Queue Data</h2>
                  <span className="px-3 py-1 bg-zinc-200 dark:bg-zinc-800 text-[11px] font-bold text-zinc-600 dark:text-zinc-400 rounded-lg">{filteredEntries.length} items</span>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowPreviewModal(true)} disabled={entries.filter(e => e.status === 'pending').length === 0} className="px-5 py-2 text-[11px] font-bold uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all disabled:opacity-50">Preview Next</button>
                  {isConfirmingClear ? (
                    <div className="flex items-center gap-2">
                      <button onClick={clearAll} className="px-4 py-2 text-[11px] font-bold uppercase bg-red-500 text-white rounded-xl">Yes, Clear</button>
                      <button onClick={() => setIsConfirmingClear(false)} className="px-4 py-2 text-[11px] font-bold uppercase bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setIsConfirmingClear(true)} className="px-4 py-2 text-[11px] font-bold uppercase bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 transition-all">Clear All</button>
                  )}
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm z-10 border-b border-zinc-100 dark:border-zinc-800">
                    <tr>
                      <th className="px-8 py-4 text-[11px] font-black text-zinc-400 uppercase tracking-widest whitespace-nowrap">Penerima</th>
                      <th className="px-8 py-4 text-[11px] font-black text-zinc-400 uppercase tracking-widest whitespace-nowrap">Detail Paket</th>
                      <th className="px-8 py-4 text-[11px] font-black text-zinc-400 uppercase tracking-widest whitespace-nowrap">Status</th>
                      <th className="px-8 py-4 text-[11px] font-black text-zinc-400 uppercase tracking-widest whitespace-nowrap text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
                    <AnimatePresence mode="popLayout">
                      {filteredEntries.length === 0 ? (
                        <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                          <td colSpan={4} className="px-8 py-24 text-zinc-400 dark:text-zinc-600 text-sm font-medium">Antrean kosong.</td>
                        </motion.tr>
                      ) : (
                        filteredEntries.map((entry, index) => (
                          <motion.tr key={entry.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className={cn("group hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors", isBlasting && index === currentIndex && "bg-emerald-50/50 dark:bg-emerald-500/5")}>
                            <td className="px-8 py-5">
                              <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{entry.recipientName}</div>
                              <div className="text-[11px] text-zinc-500 font-mono mt-1">{entry.phone}</div>
                            </td>
                            <td className="px-8 py-5">
                              <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 truncate max-w-[280px]">{entry.itemName || '-'}</div>
                              <div className="flex flex-col gap-1.5 mt-1.5">
                                <div className="text-[11px] text-zinc-400 font-mono">Resi: {entry.receiptNumber || '-'}</div>
                                <div className="flex gap-2">
                                  {entry.cod && <div className="text-[10px] bg-amber-100/50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2.5 py-0.5 rounded-md font-bold uppercase tracking-wider">COD: Rp {formatCurrency(entry.cod)}</div>}
                                  {entry.dfod && <div className="text-[10px] bg-blue-100/50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2.5 py-0.5 rounded-md font-bold uppercase tracking-wider">DFOD: Rp {formatCurrency(entry.dfod)}</div>}
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-5">
                              <div className="flex flex-col gap-2.5 items-start">
                                <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest", entry.status === 'sent' ? "bg-emerald-100/50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : entry.status === 'sending' ? "bg-blue-100/50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 animate-pulse" : entry.status === 'failed' ? "bg-red-100/50 dark:bg-red-500/10 text-red-600 dark:text-red-400" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400")}>
                                  {entry.status === 'sent' ? <CheckCircle2 size={12} /> : entry.status === 'sending' ? <Loader2 size={12} className="animate-spin" /> : entry.status === 'failed' ? <AlertCircle size={12} /> : <Clock size={12} />} {entry.status}
                                </div>
                                <button onClick={() => toggleReceived(entry.id)} className={cn("text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 transition-colors", entry.isReceived ? "text-emerald-500" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300")}>
                                  <div className={cn("w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center", entry.isReceived ? "border-emerald-500 bg-emerald-500" : "border-zinc-300 dark:border-zinc-600")}>{entry.isReceived && <CheckCircle2 size={8} className="text-white" strokeWidth={4} />}</div>
                                  Diterima
                                </button>
                              </div>
                            </td>
                            <td className="px-8 py-5 text-right">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleSendManual(entry)} className="p-2.5 bg-zinc-100 dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 rounded-xl transition-all"><ExternalLink size={16} /></button>
                                <button onClick={() => setEntries(prev => prev.filter(e => e.id !== entry.id))} className="p-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"><Trash2 size={16} /></button>
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
        </div>
      </main>

      {/* MODALS (Bulk & Preview & Settings) */}
      <AnimatePresence>
        {showBulkModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowBulkModal(false)} className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-[2rem] shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 flex flex-col">
              <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <div><h2 className="text-xl font-black dark:text-white">Bulk Import</h2><p className="text-[11px] text-zinc-500 uppercase tracking-widest font-bold mt-1">Copy-paste dari Excel</p></div>
                <button onClick={() => setShowBulkModal(false)} className="p-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full"><X size={20} className="text-zinc-500" /></button>
              </div>
              <div className="p-8 space-y-5">
                <div className="text-xs font-mono bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-4 rounded-xl border border-emerald-100 dark:border-emerald-500/20 leading-relaxed">Format Kolom: No | Resi | Nama | HP | Alamat | Tanda | Val COD | Val DFOD | Barang</div>
                <textarea value={bulkData} onChange={(e) => setBulkData(e.target.value)} placeholder="Paste data Excel di sini..." className="w-full h-64 p-5 text-sm font-mono bg-zinc-50 dark:bg-zinc-950 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500/20 outline-none resize-none dark:text-zinc-300 custom-scrollbar leading-relaxed" />
                <button onClick={handleBulkImport} className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-bold active:scale-[0.98] transition-all text-sm">Import Data</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPreviewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPreviewModal(false)} className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-[2rem] shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
              <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <div><h2 className="text-xl font-black dark:text-white">Preview</h2><p className="text-[11px] text-zinc-500 uppercase tracking-widest font-bold mt-1">First Item</p></div>
                <button onClick={() => setShowPreviewModal(false)} className="p-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full"><X size={20} className="text-zinc-500" /></button>
              </div>
              <div className="p-8">
                {entries.find(e => e.status === 'pending') ? (
                  <div className="space-y-5">
                    <div className="p-5 bg-zinc-50 dark:bg-zinc-950 rounded-2xl text-sm whitespace-pre-wrap dark:text-zinc-300 border border-zinc-100 dark:border-zinc-800 max-h-[40vh] overflow-y-auto custom-scrollbar leading-relaxed">
                      {generateMessage(entries.find(e => e.status === 'pending')!, settings.rotateTemplates ? (activeTemplate.variations?.[entries.filter(e => e.status === 'sent').length % (activeTemplate.variations?.length || 1)] || activeTemplate.text) : activeTemplate.text)}
                    </div>
                    <button onClick={() => {
                      const entry = entries.find(e => e.status === 'pending');
                      if (entry) { window.open(getWALink(entry, entries.filter(e => e.status === 'sent').length), 'WAsenderTab'); updateStatus(entry.id, 'sent'); setShowPreviewModal(false); }
                    }} className="w-full py-4 bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all text-sm"><Send size={18} /> Send Now</button>
                  </div>
                ) : <div className="text-center py-10 text-zinc-500 text-sm">No pending entries.</div>}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettingsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSettingsModal(false)} className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[90vh]">
              <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
                <div><h2 className="text-xl font-black dark:text-white">Settings</h2><p className="text-[11px] text-zinc-500 uppercase tracking-widest font-bold mt-1">Engine Config</p></div>
                <button onClick={() => setShowSettingsModal(false)} className="p-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full"><X size={20} className="text-zinc-500" /></button>
              </div>
              <div className="flex px-8 pt-5 gap-8 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
                <button onClick={() => setActiveSettingsTab('general')} className={cn("pb-4 text-[12px] font-black uppercase tracking-widest transition-all relative", activeSettingsTab === 'general' ? "text-emerald-500" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300")}>
                  General {activeSettingsTab === 'general' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-t-full" />}
                </button>
                <button onClick={() => setActiveSettingsTab('antispam')} className={cn("pb-4 text-[12px] font-black uppercase tracking-widest transition-all relative", activeSettingsTab === 'antispam' ? "text-emerald-500" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300")}>
                  Anti-Spam {activeSettingsTab === 'antispam' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-t-full" />}
                </button>
              </div>
              <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                {activeSettingsTab === 'antispam' ? (
                  <>
                    <div className="p-6 bg-zinc-50 dark:bg-zinc-950 rounded-[1.5rem] border border-zinc-100 dark:border-zinc-800">
                      <div className="flex items-center justify-between mb-3"><span className="text-xs font-bold text-zinc-500 uppercase">Safety Score</span><span className={cn("font-black text-lg", safetyScore > 80 ? "text-emerald-500" : safetyScore > 50 ? "text-amber-500" : "text-red-500")}>{safetyScore}%</span></div>
                      <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden mb-2"><motion.div initial={{ width: 0 }} animate={{ width: `${safetyScore}%` }} className={cn("h-full", safetyScore > 80 ? "bg-emerald-500" : safetyScore > 50 ? "bg-amber-500" : "bg-red-500")} /></div>
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
                        <div><div className="text-sm font-bold dark:text-white mb-0.5">{item.label}</div><div className="text-[11px] text-zinc-500">{item.desc}</div></div>
                        <button onClick={() => setSettings(prev => ({ ...prev, [item.key]: !prev[item.key as keyof AppSettings] }))} className={cn("w-12 h-7 rounded-full transition-all relative", settings[item.key as keyof AppSettings] ? "bg-emerald-500" : "bg-zinc-200 dark:bg-zinc-700")}><div className={cn("absolute top-1 w-5 h-5 bg-white rounded-full transition-all", settings[item.key as keyof AppSettings] ? "left-6" : "left-1")} /></button>
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    <div className="space-y-3"><label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Speed Preset</label><div className="grid grid-cols-2 gap-3">{[{id:'safe', label:'Safe'},{id:'normal', label:'Normal'},{id:'fast', label:'Fast'},{id:'turbo', label:'Turbo'},{id:'custom', label:'Custom'}].map(m => <button key={m.id} onClick={() => setSettings(prev => ({ ...prev, speedMode: m.id as any }))} className={cn("py-3.5 rounded-2xl text-xs font-bold transition-all border", settings.speedMode === m.id ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-transparent" : "bg-transparent border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800")}>{m.label}</button>)}</div></div>
                    
                    <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-5">
                      {[
                        { key: 'manualMode', label: 'Manual Mode', desc: 'Kirim saat tekan Spasi.' },
                        { key: 'autoRetry', label: 'Auto Retry', desc: 'Ulangi jika gagal.' },
                        { key: 'autoSend', label: 'Auto Send (Ext)', desc: 'Eksekusi dgn Extension.' }
                      ].map(item => (
                        <div key={item.key} className="flex items-center justify-between">
                          <div><div className="text-sm font-bold dark:text-white mb-0.5">{item.label}</div><div className="text-[11px] text-zinc-500">{item.desc}</div></div>
                          <button onClick={() => setSettings(prev => ({ ...prev, [item.key]: !prev[item.key as keyof AppSettings] }))} className={cn("w-12 h-7 rounded-full transition-all relative", settings[item.key as keyof AppSettings] ? "bg-emerald-500" : "bg-zinc-200 dark:bg-zinc-700")}><div className={cn("absolute top-1 w-5 h-5 bg-white rounded-full transition-all", settings[item.key as keyof AppSettings] ? "left-6" : "left-1")} /></button>
                        </div>
                      ))}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-4">
                      <div className="space-y-2"><label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Batch Size</label><input type="number" value={settings.batchSize} onChange={(e) => setSettings(prev => ({ ...prev, batchSize: parseInt(e.target.value) || 0 }))} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border-none rounded-xl text-sm outline-none dark:text-white" /></div>
                      <div className="space-y-2"><label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Pause (ms)</label><input type="number" value={settings.batchPause} onChange={(e) => setSettings(prev => ({ ...prev, batchPause: parseInt(e.target.value) || 0 }))} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border-none rounded-xl text-sm outline-none dark:text-white" /></div>
                      <div className="space-y-2"><label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Hourly Lmt</label><input type="number" value={settings.hourlyLimit} onChange={(e) => setSettings(prev => ({ ...prev, hourlyLimit: parseInt(e.target.value) || 0 }))} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border-none rounded-xl text-sm outline-none dark:text-white" /></div>
                      <div className="space-y-2"><label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Error Lmt</label><input type="number" value={settings.stopOnConsecutiveErrors} onChange={(e) => setSettings(prev => ({ ...prev, stopOnConsecutiveErrors: parseInt(e.target.value) || 0 }))} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border-none rounded-xl text-sm outline-none dark:text-white" /></div>
                    </div>
                  </>
                )}
              </div>
              <div className="p-6 shrink-0"><button onClick={() => setShowSettingsModal(false)} className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-bold active:scale-[0.98] transition-all text-sm">Save Config</button></div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
