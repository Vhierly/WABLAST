import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Send, Trash2, Play, Square, MessageSquare, User, Package, Hash, Phone,
  FileText, CheckCircle2, Clock, AlertCircle, Settings2, Download, FileSpreadsheet,
  X, Search, Sparkles, BarChart3, History, Timer, ExternalLink, ChevronRight, Moon,
  Sun, RotateCcw, Shield, Puzzle, Loader2, Zap
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

// Utility to nicely format numbers into Rupiah currency
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
      const variations = [
        `Selamat ${base}`,
        `${base} Kak`,
        `Halo, Selamat ${base}`,
        `Halo Kak, Selamat ${base}`,
        `Permisi, Selamat ${base}`,
        `Halo`,
        base
      ];
      return variations[Math.floor(Math.random() * variations.length)];
    }

    return `Selamat ${base}`;
  };

  const generateMessage = (entry: BlastEntry, templateText?: string) => {
    let text = templateText || activeTemplate.text;

    // Handle conditional blocks {if_cod}...{/if_cod}
    if (!entry.cod) {
      text = text.replace(/{if_cod}[\s\S]*?{\/if_cod}/gi, '');
    } else {
      text = text.replace(/{if_cod}/gi, '').replace(/{\/if_cod}/gi, '');
    }

    if (!entry.dfod) {
      text = text.replace(/{if_dfod}[\s\S]*?{\/if_dfod}/gi, '');
    } else {
      text = text.replace(/{if_dfod}/gi, '').replace(/{\/if_dfod}/gi, '');
    }

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
          const choices = p1.split('|');
          return choices[Math.floor(Math.random() * choices.length)];
        }
        return match;
      });
    }

    if (settings.randomizeEmojis) {
      const emojis = ['😊', '🙏', '📦', '🚚', '✨', '✅', '📍', '🚚', '📦', '🚛'];
      const words = finalMessage.split(' ');
      finalMessage = words.map(word => {
        if (Math.random() > 0.9) return word + ' ' + emojis[Math.floor(Math.random() * emojis.length)];
        return word;
      }).join(' ');
    }

    if (settings.addRandomSuffix) {
      finalMessage += `\n\n_Ref: ${Math.random().toString(36).substring(7).toUpperCase()}_`;
    }

    if (settings.useInvisibleChars) {
      const zwsp = '\u200B';
      const words = finalMessage.split(' ');
      finalMessage = words.map(word => {
        if (Math.random() > 0.7) return word + zwsp;
        return word;
      }).join(' ');
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
      const variations = activeTemplate.variations && activeTemplate.variations.length > 0 
        ? activeTemplate.variations 
        : [activeTemplate.text];
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

    if (settings.speedMode === 'safe') {
      minDelay = 15000; maxDelay = 30000; useTyping = true; useAdaptive = true;
    } else if (settings.speedMode === 'normal') {
      minDelay = 8000; maxDelay = 15000; useTyping = true; useAdaptive = true;
    } else if (settings.speedMode === 'fast') {
      minDelay = 3000; maxDelay = 7000; useTyping = false; useAdaptive = false;
    } else if (settings.speedMode === 'turbo') {
      minDelay = 1000; maxDelay = 2000; useTyping = false; useAdaptive = false;
    }

    let currentDelay = settings.randomizeDelay || settings.speedMode !== 'custom' 
      ? Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay 
      : minDelay;

    if (useAdaptive) currentDelay += Math.floor(sentCount / 10) * 500;

    if (useTyping) {
      let templateText = activeTemplate.text;
      if (settings.rotateTemplates) {
        const variations = activeTemplate.variations && activeTemplate.variations.length > 0 
          ? activeTemplate.variations 
          : [activeTemplate.text];
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
    } else {
      setIsLongBreak(false);
    }

    return currentDelay;
  };

  const startBlast = () => {
    if (!isExtensionDetected && !settings.manualMode) {
      toast.error('Extension tidak terdeteksi! Gunakan Mode Manual atau hubungkan extension.', { icon: '🔌' });
      return;
    }

    const pending = entries.filter(e => e.status === 'pending');
    if (pending.length === 0) {
      toast.error('Tidak ada pesan pending');
      return;
    }

    let entriesToProcess = [...pending];
    if (settings.shuffleQueue) {
      entriesToProcess = entriesToProcess.sort(() => Math.random() - 0.5);
      setEntries(prev => [...prev.filter(e => e.status !== 'pending'), ...entriesToProcess]);
    }

    const firstEntry = entriesToProcess[0];
    addLog(`🎬 Memulai proses blast...${settings.shuffleQueue ? ' (Urutan Diacak)' : ''}`, 'info');
    
    const newWindow = window.open(getWALink(firstEntry), 'WAsenderTab');
    if (!newWindow) {
      toast.error('Popup terblokir! Harap izinkan popup di browser Anda.', { duration: 8000, icon: '🚫' });
      return;
    }
    window.focus();
    
    if (settings.autoSend) {
      updateStatus(firstEntry.id, 'sending');
    } else {
      updateStatus(firstEntry.id, 'sent');
      setNextActionTime(Date.now() + calculateNextDelay(entries.filter(e => e.status === 'sent').length + 1, entriesToProcess[1] || firstEntry));
    }

    setIsBlasting(true);
    setCurrentIndex(0);
    
    if (settings.batchSize > 0) {
      setNextBatchPauseAt(entries.filter(e => e.status === 'sent').length + settings.batchSize + (Math.floor(Math.random() * 5) - 2));
    }
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
          if (pending.length > 0) {
            setNextActionTime(Date.now() + calculateNextDelay(sentCount, pending[0]));
          }
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
              if (pending.length > 0) {
                setNextActionTime(Date.now() + calculateNextDelay(sentCount, pending[0]));
              }
              
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

    return () => {
      window.removeEventListener('message', handleExtensionMessage);
      clearInterval(heartbeatInterval);
    };
  }, [lastHeartbeat, isExtensionDetected, settings.autoRetry, settings.maxRetries, settings.speedMode]);

  useEffect(() => {
    const handlePing = (event: MessageEvent) => {
      if (event.data && event.data.source === 'wasender-extension' && event.data.type === 'EXTENSION_PONG') {
        if (!isExtensionDetected) {
          setIsExtensionDetected(true);
          addLog(`🔌 Extension terdeteksi dan aktif`, 'success');
        }
        setLastHeartbeat(Date.now());
      }
    };
    window.addEventListener('message', handlePing);
    
    const checkAttr = () => {
      if (document.documentElement.getAttribute('data-wasender-extension') === 'active') {
        if (!isExtensionDetected) {
          setIsExtensionDetected(true);
          addLog(`🔌 Extension terdeteksi via DOM`, 'success');
        }
        setLastHeartbeat(Date.now());
      }
      window.postMessage({ type: 'EXTENSION_PING' }, '*');
    };

    const attrInterval = setInterval(checkAttr, 2000);
    checkAttr();

    return () => {
      window.removeEventListener('message', handlePing);
      clearInterval(attrInterval);
    };
  }, [isExtensionDetected]);

  useEffect(() => {
    if (!isBlasting || settings.manualMode) {
      setCountdown(0);
      return;
    }

    const engineTick = () => {
      const now = Date.now();
      
      if (now - lastHourReset > 3600000) {
        setSentThisHour(0);
        setLastHourReset(now);
      }

      if (sentThisHour >= settings.hourlyLimit) {
        setIsBlasting(false);
        addLog(`⏳ Limit per jam tercapai.`, 'warning');
        return;
      }

      const pendingEntries = entries.filter(e => e.status === 'pending');
      const sendingEntries = entries.filter(e => e.status === 'sending');
      
      if (sendingEntries.length > 0) {
        setCountdown(0);
        return;
      }

      if (pendingEntries.length > 0) {
        const entry = pendingEntries[0];
        
        if (now >= nextActionTime) {
          addLog(`🚀 Mengirim ke ${entry.recipientName}...`, 'info');
          
          const waLink = getWALink(entry, entries.filter(e => e.status === 'sent').length);
          const newWindow = window.open(waLink, 'WAsenderTab');
          
          if (!newWindow) {
            addLog(`⚠️ Browser memblokir pembukaan tab otomatis.`, 'warning');
            setNextActionTime(Date.now() + 3000); 
            return;
          }

          window.focus();

          if (settings.autoSend) {
            updateStatus(entry.id, 'sending');
          } else {
            updateStatus(entry.id, 'sent');
            setNextActionTime(Date.now() + calculateNextDelay(entries.filter(e => e.status === 'sent').length + 1, pendingEntries[1] || entry));
          }
        } else {
          setCountdown(Math.max(0, Math.ceil((nextActionTime - now) / 1000)));
        }
      } else {
        setIsBlasting(false);
        addLog(`🏁 Blast selesai!`, 'success');
      }
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
      { name: 'Sent', value: sent, color: '#10b981' }, // Emerald
      { name: 'Pending', value: pending, color: '#f59e0b' }, // Amber
      { name: 'Received', value: received, color: '#0ea5e9' } // Sky
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
    const rows = entries.map(e => [
      e.phone,
      e.recipientName,
      e.itemName,
      e.receiptNumber,
      e.status,
      e.isReceived ? 'YES' : 'NO',
      new Date(e.createdAt).toLocaleString()
    ]);
    const csvContent = [headers, ...rows]
      .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `wasender_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Laporan berhasil diunduh');
  };

  return (
    <div className={cn(
      "min-h-screen bg-slate-50 dark:bg-[#09090b] text-slate-800 dark:text-slate-200 font-sans selection:bg-emerald-200 dark:selection:bg-emerald-900/40 transition-colors duration-500 relative pb-12",
      isDarkMode && "dark"
    )}>
      {/* Background Ambient Decor */}
      <div className="fixed top-0 left-0 w-full h-96 bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none -z-10" />

      <Toaster position="top-right" toastOptions={{ 
        className: 'dark:bg-zinc-800 dark:text-white border border-slate-200 dark:border-zinc-700 rounded-2xl shadow-lg' 
      }} />

      {isBlasting && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="bg-white dark:bg-zinc-900 rounded-[2rem] p-8 max-w-md w-full shadow-2xl border border-white/20 dark:border-zinc-800 text-center space-y-6"
          >
            <div className="relative w-28 h-28 mx-auto">
              <div className="absolute inset-0 bg-emerald-100 dark:bg-emerald-900/30 rounded-full animate-pulse" />
              <div className="absolute inset-2 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Play size={36} className="text-emerald-500 fill-current translate-x-1" />
              </div>
            </div>
            
            <div className="space-y-3">
              <h3 className="text-2xl font-bold tracking-tight">
                {isLongBreak ? '😴 Long Break Active' : 
                 entries.some(e => e.status === 'sending') ? '⏳ Menunggu WA Web...' : 
                 'Blasting in Progress...'}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                Pesan terkirim: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{entries.filter(e => e.status === 'sent').length}</span> / <span className="font-bold">{entries.length}</span>
              </p>
              
              {!settings.manualMode ? (
                <div className="py-6">
                  <div className={cn(
                    "text-5xl font-black tabular-nums tracking-tighter",
                    isLongBreak ? "text-amber-500" : 
                    entries.some(e => e.status === 'sending') ? "text-blue-500 animate-pulse" :
                    "text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300"
                  )}>
                    {entries.some(e => e.status === 'sending') ? '--:--' : `${Math.floor(countdown / 60)}:${(countdown % 60).toString().padStart(2, '0')}`}
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mt-3 font-semibold">
                    {entries.some(e => e.status === 'sending') ? 'Memproses di WA Web' : isLongBreak ? 'Break ends in' : 'Next message in'}
                  </p>
                  
                  {Date.now() >= nextActionTime && entries.filter(e => e.status === 'pending').length > 0 && !entries.some(e => e.status === 'sending') && (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mt-6">
                      <button
                        onClick={() => {
                          const pending = entries.filter(e => e.status === 'pending');
                          if (pending.length > 0) {
                            const entry = pending[0];
                            const sentCount = entries.filter(e => e.status === 'sent').length;
                            const newWindow = window.open(getWALink(entry, sentCount), 'WAsenderTab');
                            if (newWindow) {
                              window.focus();
                              if (settings.autoSend) {
                                updateStatus(entry.id, 'sending');
                              } else {
                                updateStatus(entry.id, 'sent');
                                setNextActionTime(Date.now() + calculateNextDelay(sentCount + 1, entries.filter(e => e.status === 'pending')[1] || entry));
                              }
                            }
                          }
                        }}
                        className="w-full py-4 px-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-2xl font-bold text-sm shadow-xl shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        <Play size={16} fill="white" /> Paksa Lanjut (Tab Terblokir)
                      </button>
                    </motion.div>
                  )}
                </div>
              ) : (
                <div className="py-6 space-y-3">
                  <div className="inline-block px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-bold border border-emerald-200 dark:border-emerald-500/20">
                    MODE MANUAL AKTIF
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Tekan [SPASI] atau klik tombol di bawah untuk lanjut.</p>
                </div>
              )}

              <div className="pt-4 flex flex-col gap-2">
                <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-widest animate-pulse">
                  PENTING: Tekan [ENTER] pada tab WhatsApp
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                  Browser tidak mengizinkan aksi klik otomatis tanpa interaksi manusia.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              {entries.some(e => e.status === 'sending') && (
                <button
                  onClick={() => {
                    const sending = entries.find(e => e.status === 'sending');
                    if (sending) {
                      addLog(`⏭️ Paksa lanjut: Melewati konfirmasi untuk ${sending.recipientName}`, 'warning');
                      updateStatus(sending.id, 'sent');
                    }
                  }}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20 text-sm active:scale-95 transition-all"
                >
                  Paksa Lanjut ke Nomor Berikutnya
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
                className="w-full py-4 bg-slate-100 dark:bg-zinc-800/50 text-slate-700 dark:text-slate-300 rounded-2xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-zinc-800 transition-all active:scale-95"
              >
                Kirim Manual
              </button>
              <button
                onClick={stopBlast}
                className="w-full py-4 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 text-white rounded-2xl font-bold shadow-lg shadow-red-500/20 text-sm active:scale-95 transition-all"
              >
                Hentikan Proses
              </button>
            </div>
          </motion.div>
        </div>
      )}
      
      {/* Floating Modern Header */}
      <header className="sticky top-4 z-30 mx-6 mb-8 max-w-7xl lg:mx-auto lg:px-6">
        <div className="bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl border border-slate-200/50 dark:border-zinc-800/50 rounded-3xl shadow-sm px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <Send size={22} className="translate-x-[1px]" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                WAsender <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-400">PRO</span>
              </h1>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase tracking-widest font-semibold mt-0.5">Blast Engine Studio</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-3">
            {!isExtensionDetected && (
              <button 
                onClick={downloadExtensionZip}
                className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200/50 dark:border-amber-500/20 rounded-2xl text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-all active:scale-95"
                title="Download Extension Helper"
              >
                <Puzzle size={18} />
                <span className="text-[11px] font-bold uppercase tracking-wider">Setup Extension</span>
              </button>
            )}
            <button 
              onClick={handleResetDefault}
              className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-2xl text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-all active:scale-95 hidden sm:flex items-center gap-2"
              title="Reset ke Pengaturan Awal"
            >
              <RotateCcw size={18} />
            </button>
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-3 bg-slate-100 dark:bg-zinc-800/80 border border-transparent rounded-2xl text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all active:scale-95"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button 
              onClick={() => setShowSettingsModal(true)}
              className="p-3 bg-slate-100 dark:bg-zinc-800/80 border border-transparent rounded-2xl text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all active:scale-95"
              title="Settings"
            >
              <Settings2 size={18} />
            </button>
            <div className="hidden lg:flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-zinc-800/80 rounded-2xl">
              <div className={cn("w-2 h-2 rounded-full", isBlasting ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-300 dark:bg-zinc-600")} />
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{isBlasting ? 'Active' : 'Idle'}</span>
            </div>
            <button 
              onClick={exportToCSV}
              className="hidden md:flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-zinc-800/80 rounded-2xl text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all active:scale-95"
            >
              <Download size={16} /> Export
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Left Sidebar */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          {/* Overview Card */}
          <section className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-slate-200/60 dark:border-zinc-800/60 transition-all hover:shadow-md">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg">
                  <BarChart3 size={20} className="text-emerald-500" />
                </div>
                <h2 className="font-bold text-slate-800 dark:text-white tracking-tight">System Overview</h2>
              </div>
              <History size={16} className="text-slate-300 dark:text-zinc-600" />
            </div>
            <div className="h-48 w-full mb-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statsData}
                    innerRadius={65}
                    outerRadius={85}
                    paddingAngle={6}
                    dataKey="value"
                    stroke="none"
                  >
                    {statsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    cursor={false}
                    contentStyle={{ 
                      backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
                      borderColor: isDarkMode ? '#27272a' : '#e2e8f0',
                      borderRadius: '16px',
                      color: isDarkMode ? '#f8fafc' : '#0f172a',
                      fontWeight: 600,
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {statsData.map(s => (
                <div key={s.name} className="p-3 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 text-center transition-transform hover:-translate-y-1">
                  <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">{s.name}</div>
                  <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Settings Quick Access */}
          <section className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-slate-200/60 dark:border-zinc-800/60 transition-all hover:shadow-md">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-teal-50 dark:bg-teal-500/10 rounded-lg">
                <Timer size={20} className="text-teal-500" />
              </div>
              <h2 className="font-bold text-slate-800 dark:text-white tracking-tight">Quick Settings</h2>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Nama Pengirim</label>
                <input
                  type="text"
                  value={settings.senderName}
                  onChange={(e) => setSettings(prev => ({ ...prev, senderName: e.target.value }))}
                  placeholder="Contoh: Admin JNT"
                  className="w-full px-4 py-3 text-sm bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all dark:text-white"
                />
              </div>
              <div className="space-y-3 p-4 bg-slate-50 dark:bg-zinc-800/30 rounded-2xl border border-slate-100 dark:border-zinc-800/50">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Blast Delay</label>
                  <span className="text-[11px] font-mono font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">{settings.delay / 1000}s</span>
                </div>
                <input 
                  type="range" 
                  min="1000" 
                  max="10000" 
                  step="500"
                  value={settings.delay}
                  onChange={(e) => setSettings(prev => ({ ...prev, delay: parseInt(e.target.value) }))}
                  className="w-full h-2 bg-slate-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 font-bold tracking-widest">
                  <span>FAST</span>
                  <span>SAFE</span>
                </div>
              </div>
            </div>
          </section>

          {/* Templates */}
          <section className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-slate-200/60 dark:border-zinc-800/60 transition-all hover:shadow-md flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg">
                  <MessageSquare size={20} className="text-indigo-500" />
                </div>
                <h2 className="font-bold text-slate-800 dark:text-white tracking-tight">Templates</h2>
              </div>
              <button 
                onClick={() => {
                  const def = DEFAULT_TEMPLATES.find(t => t.id === activeTemplateId);
                  if (def && confirm('Reset template ini ke pengaturan awal?')) {
                    setTemplates(prev => prev.map(t => t.id === activeTemplateId ? { ...def } : t));
                    setActiveVariationIndex(0);
                    toast.success('Template direset ke default');
                  }
                }}
                className="p-2 text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all"
                title="Reset to Default"
              >
                <History size={18} />
              </button>
            </div>
            
            {/* Template Selector */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2 custom-scrollbar">
              {templates.map(t => (
                <button
                  key={t.id}
                  onClick={() => {
                    setActiveTemplateId(t.id);
                    setActiveVariationIndex(0);
                  }}
                  className={cn(
                    "whitespace-nowrap px-5 py-2.5 rounded-2xl text-xs font-bold transition-all border",
                    activeTemplateId === t.id 
                      ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white shadow-md shadow-slate-900/10" 
                      : "bg-slate-50 dark:bg-zinc-800/50 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800"
                  )}
                >
                  {t.name}
                </button>
              ))}
            </div>

            {/* Variation Selector */}
            <div className="flex items-center gap-2 mb-4 bg-slate-50 dark:bg-zinc-800/30 p-1.5 rounded-2xl w-max">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mx-2">Variasi</span>
              {[0, 1, 2].map(idx => (
                <button
                  key={idx}
                  onClick={() => setActiveVariationIndex(idx)}
                  className={cn(
                    "w-8 h-8 rounded-xl text-xs font-bold transition-all flex items-center justify-center",
                    activeVariationIndex === idx
                      ? "bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-zinc-800"
                  )}
                >
                  {idx + 1}
                </button>
              ))}
            </div>

            <textarea
              value={currentTemplateText}
              onChange={(e) => updateActiveTemplateText(e.target.value)}
              className="w-full flex-1 min-h-[160px] p-5 text-sm bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all resize-none leading-relaxed dark:text-slate-200 custom-scrollbar shadow-inner"
              placeholder="Tulis template pesan..."
            />
            
            <div className="mt-4 flex flex-wrap gap-2">
              {['{salam}', '{pengirim}', '{nama}', '{barang}', '{resi}', '{alamat}', '{cod}', '{dfod}', '{if_cod}', '{/if_cod}', '{if_dfod}', '{/if_dfod}'].map(tag => (
                <button
                  key={tag}
                  onClick={() => updateActiveTemplateText(currentTemplateText + ' ' + tag)}
                  className="text-[10px] font-mono font-bold px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors active:scale-95 border border-slate-200 dark:border-zinc-700"
                >
                  {tag}
                </button>
              ))}
            </div>
            <div className="mt-5 p-4 bg-blue-50/80 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-2xl">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={14} className="text-blue-500" />
                <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Spintax Tip</span>
              </div>
              <p className="text-[11px] text-blue-600 dark:text-blue-300/80 leading-relaxed font-medium">
                Gunakan format <span className="font-mono font-bold bg-white dark:bg-zinc-900 px-1.5 py-0.5 rounded-md border border-blue-200 dark:border-blue-500/30">{"{Halo|Hai|Pagi}"}</span> agar teks awal lebih bervariasi dan aman dari blokir.
              </p>
            </div>
          </section>
        </div>

        {/* Right Content */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          
          {/* Main Action Bar */}
          <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md p-4 rounded-3xl border border-slate-200/60 dark:border-zinc-800/60 shadow-sm flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between transition-all hover:shadow-md">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama, nomor, atau resi..."
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm dark:text-white"
              />
            </div>
            <div className="flex gap-3 items-center flex-wrap sm:flex-nowrap">
              <div className={cn(
                "hidden md:flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-bold border transition-all h-[52px]",
                isExtensionDetected 
                  ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20" 
                  : "bg-slate-50 dark:bg-zinc-800/50 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-zinc-700"
              )}>
                <Puzzle size={16} className={isExtensionDetected ? "animate-pulse" : ""} />
                {isExtensionDetected ? "Extension Ready" : "No Extension"}
              </div>
              <button 
                onClick={() => setShowBulkModal(true)}
                className="flex-1 sm:flex-none h-[52px] px-6 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 rounded-2xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-zinc-700 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <FileSpreadsheet size={18} /> <span className="hidden sm:inline">Bulk Import</span>
              </button>
              <button
                onClick={() => setShowPreviewModal(true)}
                disabled={entries.filter(e => e.status === 'pending').length === 0}
                className="flex-1 sm:flex-none h-[52px] px-6 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 rounded-2xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-zinc-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:active:scale-100 active:scale-95"
              >
                <Search size={18} /> <span className="hidden sm:inline">Preview</span>
              </button>
              <button
                onClick={isBlasting ? stopBlast : startBlast}
                disabled={entries.length === 0}
                className={cn(
                  "flex-1 sm:flex-none h-[52px] px-8 rounded-2xl font-extrabold text-sm transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:active:scale-100 active:scale-95",
                  isBlasting 
                    ? "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-red-500/20 hover:from-red-400 hover:to-rose-500" 
                    : "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-500"
                )}
              >
                {isBlasting ? <Square size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                {isBlasting ? 'Stop' : 'Start Engine'}
              </button>
            </div>
          </div>

          {!isBlasting && entries.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-amber-50/80 dark:bg-amber-500/10 backdrop-blur border border-amber-200/50 dark:border-amber-500/20 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
              <AlertCircle className="text-amber-500 shrink-0" size={20} />
              <div className="text-[11px] text-amber-800 dark:text-amber-200/80 leading-relaxed font-medium mt-0.5">
                <span className="font-extrabold">NOTE:</span> Mesin akan membuka <span className="font-bold underline decoration-amber-300 underline-offset-2">WhatsApp Web</span>. Pastikan Anda telah <b>MENGIZINKAN POPUP</b> di pengaturan browser Anda.
              </div>
            </motion.div>
          )}

          {/* Form Card */}
          <section className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-3xl p-6 lg:p-8 shadow-sm border border-slate-200/60 dark:border-zinc-800/60 transition-all hover:shadow-md">
            <form onSubmit={handleAddEntry} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="0812..."
                    className="w-full px-4 py-3.5 text-sm bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Recipient Name</label>
                  <input
                    type="text"
                    value={formData.recipientName}
                    onChange={(e) => setFormData(prev => ({ ...prev, recipientName: e.target.value }))}
                    placeholder="Nama Pelanggan"
                    className="w-full px-4 py-3.5 text-sm bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Item Name</label>
                  <input
                    type="text"
                    value={formData.itemName}
                    onChange={(e) => setFormData(prev => ({ ...prev, itemName: e.target.value }))}
                    placeholder="Nama Barang"
                    className="w-full px-4 py-3.5 text-sm bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all dark:text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Resi / AWB</label>
                  <input
                    type="text"
                    value={formData.receiptNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, receiptNumber: e.target.value }))}
                    placeholder="Nomor Resi"
                    className="w-full px-4 py-3.5 text-sm bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all dark:text-white"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Address Details</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Alamat Lengkap"
                    className="w-full px-4 py-3.5 text-sm bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all dark:text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5 items-end">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-amber-500 uppercase tracking-widest ml-1">COD Amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">Rp</span>
                    <input
                      type="text"
                      value={formData.cod}
                      onChange={(e) => setFormData(prev => ({ ...prev, cod: e.target.value.replace(/[^0-9.,]/g, '') }))}
                      placeholder="0"
                      className="w-full pl-10 pr-4 py-3.5 text-sm bg-amber-50/30 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 rounded-2xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all dark:text-white"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-blue-500 uppercase tracking-widest ml-1">DFOD Amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">Rp</span>
                    <input
                      type="text"
                      value={formData.dfod}
                      onChange={(e) => setFormData(prev => ({ ...prev, dfod: e.target.value.replace(/[^0-9.,]/g, '') }))}
                      placeholder="0"
                      className="w-full pl-10 pr-4 py-3.5 text-sm bg-blue-50/30 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/20 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:text-white"
                    />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <button
                    type="submit"
                    className="w-full h-[52px] bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold text-sm shadow-xl shadow-slate-900/10 dark:shadow-white/10 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    <Plus size={18} /> Add to Queue
                  </button>
                </div>
              </div>
            </form>
          </section>

          {/* Terminal Console */}
          <section className="bg-[#0c0c0e] rounded-3xl p-5 shadow-inner border border-zinc-800/80 overflow-hidden relative group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-transparent opacity-50" />
            <div className="flex items-center justify-between mb-4 px-2">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                <h2 className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-[0.2em] ml-2">System.Terminal</h2>
              </div>
              <button 
                onClick={() => setLogs([])}
                className="text-[10px] font-bold font-mono text-zinc-500 hover:text-white uppercase tracking-widest transition-colors opacity-0 group-hover:opacity-100"
              >
                Clear
              </button>
            </div>
            <div className="h-40 overflow-y-auto custom-scrollbar font-mono text-[11px] space-y-1.5 px-2">
              {logs.length === 0 ? (
                <div className="text-zinc-600 italic mt-2">Waiting for commands...</div>
              ) : (
                logs.map(log => (
                  <div key={log.id} className="flex gap-4 leading-relaxed hover:bg-white/5 px-2 py-0.5 rounded transition-colors">
                    <span className="text-zinc-500 shrink-0">[{new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}]</span>
                    <span className={cn(
                      "break-all",
                      log.type === 'success' ? "text-emerald-400" :
                      log.type === 'error' ? "text-red-400" :
                      log.type === 'warning' ? "text-amber-400" :
                      "text-blue-400"
                    )}>
                      {log.type === 'success' ? '➔ ' : log.type === 'error' ? '✖ ' : log.type === 'warning' ? '⚠ ' : 'ℹ '}{log.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Data Table */}
          <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-3xl shadow-sm border border-slate-200/60 dark:border-zinc-800/60 overflow-hidden transition-all hover:shadow-md flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-zinc-800/50 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-800/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 dark:bg-zinc-800 rounded-lg">
                  <FileText size={18} className="text-slate-600 dark:text-slate-300" />
                </div>
                <h2 className="font-bold text-slate-800 dark:text-white tracking-tight">Queue Data</h2>
                <span className="ml-2 px-2.5 py-1 bg-slate-200 dark:bg-zinc-700 text-[10px] font-bold text-slate-600 dark:text-slate-300 rounded-full">{filteredEntries.length} items</span>
              </div>
              
              {isConfirmingClear ? (
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4">
                  <span className="text-[10px] font-bold text-red-500 uppercase">Clear All?</span>
                  <button onClick={clearAll} className="px-4 py-2 text-[10px] font-bold uppercase bg-red-500 text-white rounded-xl shadow-lg shadow-red-500/20 active:scale-95">Yes</button>
                  <button onClick={() => setIsConfirmingClear(false)} className="px-4 py-2 text-[10px] font-bold uppercase bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-slate-300 rounded-xl active:scale-95">No</button>
                </div>
              ) : (
                <button onClick={() => setIsConfirmingClear(true)} className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-slate-200 dark:border-zinc-700 transition-colors active:scale-95">
                  <Trash2 size={18} />
                </button>
              )}
            </div>

            <div className="overflow-x-auto custom-scrollbar flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white dark:bg-zinc-900 border-b border-slate-100 dark:border-zinc-800/50">
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap">Recipient Info</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap">Package Details</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap">Status</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap">Received</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/50">
                  <AnimatePresence mode="popLayout">
                    {filteredEntries.length === 0 ? (
                      <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                        <td colSpan={5} className="px-6 py-20 text-slate-400 dark:text-zinc-600 text-sm font-medium">
                          No data available in queue.
                        </td>
                      </motion.tr>
                    ) : (
                      filteredEntries.map((entry, index) => (
                        <motion.tr
                          key={entry.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className={cn(
                            "group transition-colors",
                            isBlasting && index === currentIndex 
                              ? "bg-emerald-50/50 dark:bg-emerald-500/5" 
                              : "hover:bg-slate-50 dark:hover:bg-zinc-800/30 bg-white dark:bg-zinc-900"
                          )}
                        >
                          <td className="px-6 py-4">
                            <div className="font-bold text-sm text-slate-800 dark:text-slate-200">{entry.recipientName}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">{entry.phone}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-semibold truncate max-w-[200px] text-slate-700 dark:text-slate-300" title={entry.itemName}>{entry.itemName || '-'}</div>
                            <div className="flex flex-col gap-1.5 mt-1">
                              <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono tracking-wider">Resi: {entry.receiptNumber || '-'}</div>
                              {entry.address && <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[200px]" title={entry.address}>{entry.address}</div>}
                              <div className="flex gap-2 mt-0.5">
                                {entry.cod && <div className="text-[10px] bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider">COD: Rp {formatCurrency(entry.cod)}</div>}
                                {entry.dfod && <div className="text-[10px] bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider">DFOD: Rp {formatCurrency(entry.dfod)}</div>}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className={cn(
                              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest shadow-sm",
                              entry.status === 'sent' 
                                ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-transparent" 
                                : entry.status === 'sending'
                                ? "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-transparent animate-pulse"
                                : entry.status === 'failed'
                                ? "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-transparent"
                                : "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-transparent"
                            )}>
                              {entry.status === 'sent' ? <CheckCircle2 size={12} /> : entry.status === 'sending' ? <Loader2 size={12} className="animate-spin" /> : entry.status === 'failed' ? <AlertCircle size={12} /> : <Clock size={12} />}
                              {entry.status}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <button 
                              onClick={() => toggleReceived(entry.id)}
                              className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95",
                                entry.isReceived 
                                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md" 
                                  : "bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-zinc-700"
                              )}
                            >
                              <div className={cn(
                                "w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-all",
                                entry.isReceived ? "border-white dark:border-slate-900" : "border-slate-300 dark:border-slate-500"
                              )}>
                                {entry.isReceived && <CheckCircle2 size={10} className="text-white dark:text-slate-900" strokeWidth={4} />}
                              </div>
                              {entry.isReceived ? 'Diterima' : 'Belum'}
                            </button>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleSendManual(entry)} className="p-2.5 bg-slate-100 dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 rounded-xl transition-all active:scale-95"><ExternalLink size={16} /></button>
                              <button onClick={() => setEntries(prev => prev.filter(e => e.id !== entry.id))} className="p-2.5 bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all active:scale-95"><Trash2 size={16} /></button>
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

      {/* Bulk Import Modal */}
      <AnimatePresence>
        {showBulkModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowBulkModal(false)} className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-md" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
              className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20 dark:border-zinc-800 flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-900/50 shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center"><FileSpreadsheet size={24} /></div>
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-800 dark:text-white tracking-tight">Bulk Import Data</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Copy-paste langsung dari Excel atau Google Sheets</p>
                  </div>
                </div>
                <button onClick={() => setShowBulkModal(false)} className="p-2.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-full transition-colors"><X size={20} className="text-slate-500" /></button>
              </div>
              <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 bg-emerald-50/80 dark:bg-emerald-500/5 rounded-2xl border border-emerald-100 dark:border-emerald-500/20">
                    <div className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-2">Step 1: Format Kolom</div>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">No, Resi, Nama, HP, Alamat, Tanda, Nominal COD, Nominal DFOD, Barang</p>
                  </div>
                  <div className="p-5 bg-blue-50/80 dark:bg-blue-500/5 rounded-2xl border border-blue-100 dark:border-blue-500/20">
                    <div className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2">Step 2: Paste Area</div>
                    <p className="text-xs text-blue-800 dark:text-blue-300 font-medium">Blok cell di Excel, lalu Copy & Paste di area teks bawah ini.</p>
                  </div>
                </div>
                <textarea
                  value={bulkData}
                  onChange={(e) => setBulkData(e.target.value)}
                  placeholder="1	JX123456789	Budi Santoso	08123456789	Jl. Merdeka No. 1	COD	150000	0	Sepatu..."
                  className="w-full h-64 p-6 text-sm font-mono bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-[1.5rem] focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all resize-none dark:text-slate-300 custom-scrollbar shadow-inner"
                />
                <div className="flex gap-4">
                  <button onClick={() => setShowBulkModal(false)} className="flex-1 py-4 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-zinc-700 transition-all active:scale-95">Cancel</button>
                  <button onClick={handleBulkImport} className="flex-[2] py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl font-bold shadow-xl shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-500 transition-all active:scale-95">Import Data</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreviewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPreviewModal(false)} className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-md" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
              className="relative w-full max-w-lg max-h-[90vh] bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20 dark:border-zinc-800 flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-900/50 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center"><MessageSquare size={20} /></div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">Message Preview</h2>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-bold">First Pending Item</p>
                  </div>
                </div>
                <button onClick={() => setShowPreviewModal(false)} className="p-2.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-full transition-colors"><X size={20} className="text-slate-500" /></button>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/50 dark:bg-zinc-950/50">
                {entries.find(e => e.status === 'pending') ? (
                  <>
                    <div className="p-5 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm">
                      <div className="flex items-center gap-4 mb-4 pb-4 border-b border-slate-100 dark:border-zinc-800">
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 text-white rounded-xl flex items-center justify-center text-sm font-extrabold shadow-md">
                          {entries.find(e => e.status === 'pending')?.recipientName.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-800 dark:text-white">{entries.find(e => e.status === 'pending')?.recipientName}</div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">{entries.find(e => e.status === 'pending')?.phone}</div>
                        </div>
                      </div>
                      <div className="text-sm whitespace-pre-wrap leading-relaxed dark:text-slate-300 font-sans">
                        {(() => {
                          const entry = entries.find(e => e.status === 'pending');
                          if (!entry) return '';
                          const sentCount = entries.filter(e => e.status === 'sent').length;
                          let templateText = activeTemplate.text;
                          if (settings.rotateTemplates) {
                            const variations = activeTemplate.variations && activeTemplate.variations.length > 0 
                              ? activeTemplate.variations 
                              : [activeTemplate.text];
                            templateText = variations[sentCount % variations.length];
                          }
                          return generateMessage(entry, templateText);
                        })()}
                      </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button onClick={() => setShowPreviewModal(false)} className="flex-1 py-4 bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 rounded-2xl font-bold text-sm hover:bg-slate-300 dark:hover:bg-zinc-700 transition-all active:scale-95">Close</button>
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
                        className="flex-1 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-500 transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                        <Send size={16} /> Send Manual
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-16">
                    <Clock size={48} className="mx-auto text-slate-300 dark:text-zinc-700 mb-4" />
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">No pending entries to preview.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettingsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSettingsModal(false)} className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-md" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
              className="relative w-full max-w-md max-h-[90vh] bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20 dark:border-zinc-800 flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-900/50 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 rounded-xl flex items-center justify-center"><Settings2 size={20} /></div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">Settings</h2>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-bold">Engine Configuration</p>
                  </div>
                </div>
                <button onClick={() => setShowSettingsModal(false)} className="p-2.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-full transition-colors"><X size={20} className="text-slate-500" /></button>
              </div>

              {/* Tabs */}
              <div className="flex px-6 pt-4 gap-6 border-b border-slate-100 dark:border-zinc-800 shrink-0 bg-white dark:bg-zinc-900">
                <button 
                  onClick={() => setActiveSettingsTab('general')}
                  className={cn(
                    "pb-3 text-[11px] font-extrabold uppercase tracking-widest transition-all relative",
                    activeSettingsTab === 'general' ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  )}
                >
                  General
                  {activeSettingsTab === 'general' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-t-full" />}
                </button>
                <button 
                  onClick={() => setActiveSettingsTab('antispam')}
                  className={cn(
                    "pb-3 text-[11px] font-extrabold uppercase tracking-widest transition-all relative",
                    activeSettingsTab === 'antispam' ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  )}
                >
                  Anti-Spam
                  {activeSettingsTab === 'antispam' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-t-full" />}
                </button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/30 dark:bg-zinc-950/30">
                {activeSettingsTab === 'antispam' && (
                  <div className="mb-6 p-5 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Safety Score</span>
                      <span className={cn(
                        "text-sm font-black px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-zinc-800",
                        safetyScore > 80 ? "text-emerald-500" : safetyScore > 50 ? "text-amber-500" : "text-red-500"
                      )}>{safetyScore}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden mb-3">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${safetyScore}%` }}
                        className={cn(
                          "h-full transition-all duration-1000 ease-out",
                          safetyScore > 80 ? "bg-gradient-to-r from-emerald-400 to-emerald-500" : safetyScore > 50 ? "bg-gradient-to-r from-amber-400 to-amber-500" : "bg-gradient-to-r from-red-400 to-red-500"
                        )}
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      {safetyScore > 80 ? "✅ Sangat Aman: Pola pengiriman sangat mirip manusia." : 
                       safetyScore > 50 ? "⚠ Cukup Aman: Disarankan menambah jeda atau variasi." : 
                       "❌ Beresiko Tinggi: Akun Anda rentan terkena banned!"}
                    </p>
                  </div>
                )}
                
                {activeSettingsTab === 'general' ? (
                  <div className="space-y-6">
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                          <User size={14} /> Nama Pengirim Default
                        </label>
                        <input 
                          type="text" 
                          value={settings.senderName}
                          onChange={(e) => setSettings(prev => ({ ...prev, senderName: e.target.value }))}
                          className="w-full px-4 py-3.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm shadow-sm"
                          placeholder="Admin JNT"
                        />
                      </div>

                      {/* Speed Presets */}
                      <div className="space-y-3">
                        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                          <Zap size={14} className="text-amber-500" /> Profil Kecepatan
                        </label>
                        <div className="grid grid-cols-2 gap-3">
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
                                "p-4 rounded-2xl border text-left transition-all active:scale-95",
                                settings.speedMode === mode.id 
                                  ? "bg-emerald-50/50 dark:bg-emerald-500/10 border-emerald-500 shadow-sm" 
                                  : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:border-emerald-500/30"
                              )}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xl">{mode.icon}</span>
                                <div className={cn("w-3 h-3 rounded-full border-2 transition-colors", settings.speedMode === mode.id ? "border-emerald-500 bg-emerald-500" : "border-slate-300 dark:border-zinc-600")} />
                              </div>
                              <div className="text-sm font-bold text-slate-800 dark:text-white">{mode.label}</div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">{mode.desc}</div>
                            </button>
                          ))}
                          <button
                            onClick={() => setSettings(prev => ({ ...prev, speedMode: 'custom' }))}
                            className={cn(
                              "col-span-2 p-4 rounded-2xl border text-left transition-all active:scale-95",
                              settings.speedMode === 'custom' 
                                ? "bg-emerald-50/50 dark:bg-emerald-500/10 border-emerald-500 shadow-sm" 
                                : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:border-emerald-500/30"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">⚙️</span>
                                <span className="text-sm font-bold text-slate-800 dark:text-white">Custom Manual</span>
                              </div>
                              <div className={cn("w-3 h-3 rounded-full border-2 transition-colors", settings.speedMode === 'custom' ? "border-emerald-500 bg-emerald-500" : "border-slate-300 dark:border-zinc-600")} />
                            </div>
                          </button>
                        </div>
                      </div>

                      <AnimatePresence>
                        {settings.speedMode === 'custom' && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2 overflow-hidden">
                            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2 pt-2">
                              <Timer size={14} /> Custom Delay (ms)
                            </label>
                            <input 
                              type="number" 
                              value={settings.delay}
                              onChange={(e) => setSettings(prev => ({ ...prev, delay: parseInt(e.target.value) || 1000 }))}
                              className="w-full px-4 py-3.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm shadow-sm"
                              placeholder="5000"
                              min="1000"
                              step="500"
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="flex items-center justify-between p-5 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm">
                        <div className="space-y-1">
                          <div className="text-sm font-bold text-slate-800 dark:text-white">Mode Manual</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">Pesan dikirim hanya saat Anda menekan tombol Spasi.</div>
                        </div>
                        <button 
                          onClick={() => setSettings(prev => ({ ...prev, manualMode: !prev.manualMode }))}
                          className={cn(
                            "w-14 h-8 rounded-full transition-all relative shrink-0",
                            settings.manualMode ? "bg-emerald-500" : "bg-slate-200 dark:bg-zinc-700"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-sm",
                            settings.manualMode ? "left-7" : "left-1"
                          )} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-5 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm">
                        <div className="space-y-1">
                          <div className="text-sm font-bold text-slate-800 dark:text-white">Auto Retry</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">Otomatis kirim ulang jika nomor gagal (Invalid).</div>
                        </div>
                        <button 
                          onClick={() => setSettings(prev => ({ ...prev, autoRetry: !prev.autoRetry }))}
                          className={cn(
                            "w-14 h-8 rounded-full transition-all relative shrink-0",
                            settings.autoRetry ? "bg-emerald-500" : "bg-slate-200 dark:bg-zinc-700"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-sm",
                            settings.autoRetry ? "left-7" : "left-1"
                          )} />
                        </button>
                      </div>

                      <AnimatePresence>
                        {settings.autoRetry && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2 overflow-hidden">
                            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2 pt-2">
                              <RotateCcw size={14} /> Max Retries Limit
                            </label>
                            <input 
                              type="number" 
                              value={settings.maxRetries}
                              onChange={(e) => setSettings(prev => ({ ...prev, maxRetries: parseInt(e.target.value) || 1 }))}
                              className="w-full px-4 py-3.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm shadow-sm"
                              min="1"
                              max="10"
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="pt-4">
                        <button 
                          onClick={() => {
                            if (window.confirm('Kembalikan semua template ke pengaturan default? Template yang Anda ubah akan tertimpa.')) {
                              setTemplates(DEFAULT_TEMPLATES);
                              setActiveTemplateId(DEFAULT_TEMPLATES[0].id);
                              setActiveVariationIndex(0);
                              toast.success('Template berhasil dipulihkan');
                            }
                          }}
                          className="w-full py-4 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 rounded-2xl font-bold text-xs hover:bg-slate-200 dark:hover:bg-zinc-700 transition-all flex items-center justify-center gap-2 active:scale-95"
                        >
                          <History size={16} /> Restore Default Templates
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    
                    {/* Advanced Settings Options */}
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-slate-800 dark:text-white">Randomize Delay</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 pr-4">Acak waktu jeda agar aktivitas terlihat lebih natural.</div>
                      </div>
                      <button 
                        onClick={() => setSettings(prev => ({ ...prev, randomizeDelay: !prev.randomizeDelay }))}
                        className={cn(
                          "w-12 h-6 rounded-full transition-all relative shrink-0",
                          settings.randomizeDelay ? "bg-emerald-500" : "bg-slate-200 dark:bg-zinc-700"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                          settings.randomizeDelay ? "left-7" : "left-1"
                        )} />
                      </button>
                    </div>

                    <AnimatePresence>
                      {settings.randomizeDelay && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2 overflow-hidden px-1">
                          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pt-2 block">Max Random Delay (ms)</label>
                          <input 
                            type="number" 
                            value={settings.maxDelay}
                            onChange={(e) => setSettings(prev => ({ ...prev, maxDelay: parseInt(e.target.value) || 10000 }))}
                            className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all shadow-sm"
                            step="500"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block">Batch Size</label>
                        <input 
                          type="number" 
                          value={settings.batchSize}
                          onChange={(e) => setSettings(prev => ({ ...prev, batchSize: parseInt(e.target.value) || 0 }))}
                          className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all shadow-sm"
                          placeholder="10"
                        />
                        <p className="text-[9px] text-slate-400 font-medium">Jeda tiap X pesan terkirim.</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block">Pause Dur (ms)</label>
                        <input 
                          type="number" 
                          value={settings.batchPause}
                          onChange={(e) => setSettings(prev => ({ ...prev, batchPause: parseInt(e.target.value) || 0 }))}
                          className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all shadow-sm"
                          placeholder="30000"
                        />
                        <p className="text-[9px] text-slate-400 font-medium">Lama istirahat antar batch.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block">Hourly Limit</label>
                        <input 
                          type="number" 
                          value={settings.hourlyLimit}
                          onChange={(e) => setSettings(prev => ({ ...prev, hourlyLimit: parseInt(e.target.value) || 0 }))}
                          className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all shadow-sm"
                          placeholder="50"
                        />
                        <p className="text-[9px] text-slate-400 font-medium">Batas maksimal kirim per jam.</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block">Error Limit</label>
                        <input 
                          type="number" 
                          value={settings.stopOnConsecutiveErrors}
                          onChange={(e) => setSettings(prev => ({ ...prev, stopOnConsecutiveErrors: parseInt(e.target.value) || 0 }))}
                          className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all shadow-sm"
                          placeholder="3"
                        />
                        <p className="text-[9px] text-slate-400 font-medium">Berhenti bila gagal berturut.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block">Long Break</label>
                        <input 
                          type="number" 
                          value={settings.longBreakAfter}
                          onChange={(e) => setSettings(prev => ({ ...prev, longBreakAfter: parseInt(e.target.value) || 0 }))}
                          className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all shadow-sm"
                          placeholder="25"
                        />
                        <p className="text-[9px] text-slate-400 font-medium">Tidur siang setelah X pesan.</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block">Duration (min)</label>
                        <input 
                          type="number" 
                          value={settings.longBreakDuration}
                          onChange={(e) => setSettings(prev => ({ ...prev, longBreakDuration: parseInt(e.target.value) || 0 }))}
                          className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all shadow-sm"
                          placeholder="10"
                        />
                        <p className="text-[9px] text-slate-400 font-medium">Lama tidur dalam menit.</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {[
                        { key: 'shuffleQueue', label: 'Shuffle Queue', desc: 'Acak daftar agar pola pengiriman tidak linier.' },
                        { key: 'useRandomGreetings', label: 'Randomize Greetings', desc: 'Ganti kata sapaan otomatis tiap pesan.' },
                        { key: 'addRandomSuffix', label: 'Inject Ref Suffix', desc: 'Tambah string acak di akhir pesan (Anti-hash).' },
                        { key: 'useInvisibleChars', label: 'Invisible Characters', desc: 'Sisipkan zero-width space pengecoh AI.' },
                        { key: 'simulateTyping', label: 'Human Typing Sim', desc: 'Delay dihitung sesuai panjang karakter teks.' },
                        { key: 'adaptiveDelay', label: 'Adaptive Fatigue', desc: 'Jeda bertambah sedikit seiring jumlah antrean.' },
                        { key: 'randomizeFormatting', label: 'Dynamic Spacing', desc: 'Format baris baru diacak.' },
                        { key: 'rotateTemplates', label: 'Template Rotation', desc: 'Gunakan 3 variasi pesan bergantian.' },
                        { key: 'randomizeEmojis', label: 'Emoji Scrambler', desc: 'Taruh emoji random secara dinamis.' },
                        { key: 'useGlobalSpintax', label: 'Global Spintax Engine', desc: 'Aktifkan format {Halo|Hai} pada template.' },
                        { key: 'autoSend', label: 'Auto Send (Extension)', desc: 'Eksekusi otomatis pakai Chrome extension.' }
                      ].map((item) => (
                        <div key={item.key} className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
                          <div className="space-y-1">
                            <div className="text-sm font-bold text-slate-800 dark:text-white">{item.label}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 pr-4">{item.desc}</div>
                          </div>
                          <button 
                            onClick={() => setSettings(prev => ({ ...prev, [item.key]: !prev[item.key as keyof AppSettings] }))}
                            className={cn(
                              "w-12 h-6 rounded-full transition-all relative shrink-0",
                              settings[item.key as keyof AppSettings] ? "bg-emerald-500" : "bg-slate-200 dark:bg-zinc-700"
                            )}
                          >
                            <div className={cn(
                              "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                              settings[item.key as keyof AppSettings] ? "left-7" : "left-1"
                            )} />
                          </button>
                        </div>
                      ))}
                    </div>

                    {settings.autoSend && (
                      <div className="mt-6 p-5 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border border-amber-200 dark:border-amber-500/20 rounded-3xl space-y-5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5 text-amber-700 dark:text-amber-400">
                            <Puzzle size={18} />
                            <span className="text-xs font-bold uppercase tracking-widest">Extension Status</span>
                          </div>
                          <div className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-extrabold uppercase shadow-sm",
                            isExtensionDetected ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"
                          )}>
                            {isExtensionDetected ? "Connected" : "Not Found"}
                          </div>
                        </div>
                        
                        <p className="text-[11px] leading-relaxed text-amber-800/80 dark:text-amber-200/70 font-medium">
                          Browser secara teknis memblokir klik tombol kirim secara langsung via script eksternal. WAsender Extension digunakan untuk menjembatani ini agar proses Full-Auto bisa berjalan.
                        </p>

                        <button 
                          onClick={downloadExtensionZip}
                          className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 transition-all active:scale-95"
                        >
                          <Download size={18} /> Download Extension (.zip)
                        </button>

                        <div className="space-y-3 pt-2">
                          <div className="text-[11px] font-extrabold text-amber-900 dark:text-amber-300 uppercase tracking-widest">Cara Pasang (Hanya 1 Menit):</div>
                          <ol className="text-[11px] space-y-2 text-amber-800/80 dark:text-amber-200/70 list-decimal ml-4 font-medium">
                            <li>Klik tombol <b>Download Extension</b> di atas.</li>
                            <li>Ekstrak file <code className="bg-white/50 dark:bg-black/30 px-1.5 py-0.5 rounded font-mono border border-black/5 dark:border-white/10">wasender-pro-helper.zip</code> menjadi folder biasa.</li>
                            <li>Buka <code className="bg-white/50 dark:bg-black/30 px-1.5 py-0.5 rounded font-mono border border-black/5 dark:border-white/10">chrome://extensions</code> di URL bar Chrome.</li>
                            <li>Nyalakan <b>Developer Mode</b> (tombol switch di pojok kanan atas).</li>
                            <li>Klik tombol <b>Load Unpacked</b> dan pilih folder yang tadi diekstrak.</li>
                          </ol>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
                <button 
                  onClick={() => setShowSettingsModal(false)}
                  className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold text-sm shadow-xl shadow-slate-900/10 dark:shadow-white/10 hover:-translate-y-0.5 transition-all active:scale-95"
                >
                  Save Configuration
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="max-w-7xl mx-auto px-6 pt-12 text-center relative z-10">
        <div className="text-[10px] text-slate-400 dark:text-slate-600 uppercase tracking-[0.3em] font-mono font-bold">
          WAsender PRO Engine • v2.0.0 • Modernized UI
        </div>
      </footer>
    </div>
  );
}
