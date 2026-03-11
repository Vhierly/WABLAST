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
  Zap,
  Menu,
  Bell,
  Activity,
  TrendingUp,
  Smartphone,
  Globe,
  Wifi,
  WifiOff
} from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
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

// Utility to nicely format numbers into Rupiah currency
const formatCurrency = (val: string) => {
  if (!val) return '';
  const num = parseInt(val.replace(/\D/g, ''));
  return isNaN(num) ? val : new Intl.NumberFormat('id-ID').format(num);
};

export default function App() {
  // ========== STATE (unchanged) ==========
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
  // Mobile sidebar state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  // ========== EFFECTS (unchanged) ==========
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

  // ========== HANDLERS (unchanged) ==========
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
      { name: 'Sent', value: sent, color: '#10b981' },
      { name: 'Pending', value: pending, color: '#f59e0b' },
      { name: 'Received', value: received, color: '#3b82f6' }
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

  // ========== RENDER (completely redesigned UI - bold & modern) ==========
  return (
    <div className={cn(
      "min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 dark:from-slate-950 dark:via-purple-950 dark:to-slate-950 text-slate-100 font-sans antialiased transition-colors duration-300",
      isDarkMode ? "dark" : ""
    )}>
      <Toaster position="top-right" toastOptions={{
        className: 'bg-slate-800 text-white border border-slate-700 rounded-2xl shadow-2xl',
        duration: 4000
      }} />

      {/* Blast Overlay (unchanged logic, enhanced design) */}
      <AnimatePresence>
        {isBlasting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-xl flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-slate-800/90 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full shadow-2xl border border-purple-500/30 text-center space-y-6"
            >
              <div className="relative w-24 h-24 mx-auto">
                <div className="absolute inset-0 border-4 border-purple-500/30 rounded-full" />
                <div className="absolute inset-0 border-4 border-purple-500 rounded-full border-t-transparent animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Play size={32} className="text-purple-400 fill-current" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  {isLongBreak ? '😴 Long Break Active' :
                    entries.some(e => e.status === 'sending') ? '⏳ Menunggu WA Web...' :
                      'Blasting in Progress...'}
                </h3>
                <p className="text-sm text-slate-400">
                  Pesan terkirim: <span className="font-bold text-purple-400">{entries.filter(e => e.status === 'sent').length}</span> / <span className="font-bold">{entries.length}</span>
                </p>

                {!settings.manualMode ? (
                  <div className="py-4">
                    <div className={cn(
                      "text-4xl font-black tabular-nums",
                      isLongBreak ? "text-amber-400" :
                        entries.some(e => e.status === 'sending') ? "text-blue-400 animate-pulse" :
                          "text-purple-400"
                    )}>
                      {entries.some(e => e.status === 'sending') ? '--:--' : `${Math.floor(countdown / 60)}:${(countdown % 60).toString().padStart(2, '0')}`}
                    </div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">
                      {entries.some(e => e.status === 'sending') ? 'Memproses di WA Web' : isLongBreak ? 'Break ends in' : 'Next message in'}
                    </p>

                    {Date.now() >= nextActionTime && entries.filter(e => e.status === 'pending').length > 0 && !entries.some(e => e.status === 'sending') && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mt-4"
                      >
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
                          className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-all"
                        >
                          <Play size={14} fill="white" /> Klik jika tab tidak terbuka otomatis
                        </button>
                      </motion.div>
                    )}
                  </div>
                ) : (
                  <div className="py-6 space-y-2">
                    <div className="px-4 py-2 bg-purple-900/30 text-purple-300 rounded-xl text-xs font-bold border border-purple-700/50">
                      MODE MANUAL AKTIF
                    </div>
                    <p className="text-[10px] text-slate-500">Tekan [SPASI] atau klik tombol di bawah untuk lanjut.</p>
                  </div>
                )}

                <div className="pt-2 flex flex-col gap-2">
                  <p className="text-[10px] text-amber-400 font-bold uppercase tracking-widest animate-pulse">
                    PENTING: Tekan [ENTER] pada tab WhatsApp untuk mengirim!
                  </p>
                  <p className="text-[9px] text-slate-500 italic">
                    Browser tidak mengizinkan klik otomatis di dalam WhatsApp. Tekan Enter setiap kali pesan muncul.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                {entries.some(e => e.status === 'sending') && (
                  <button
                    onClick={() => {
                      const sending = entries.find(e => e.status === 'sending');
                      if (sending) {
                        addLog(`⏭️ Paksa lanjut: Melewati konfirmasi untuk ${sending.recipientName}`, 'warning');
                        updateStatus(sending.id, 'sent');
                      }
                    }}
                    className="w-full py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-600/20 text-sm hover:bg-blue-700 transition-all"
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
                  className="w-full py-3 bg-purple-900/30 text-purple-300 rounded-2xl font-bold text-sm hover:bg-purple-800/40 transition-all border border-purple-700/50"
                >
                  Kirim Berikutnya (Manual)
                </button>
                <button
                  onClick={stopBlast}
                  className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold transition-all shadow-lg shadow-red-500/20 text-sm"
                >
                  Berhenti
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header - Glassmorphism */}
      <header className="sticky top-0 z-30 bg-slate-900/70 backdrop-blur-xl border-b border-purple-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 hover:bg-purple-500/20 rounded-xl transition-colors"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-purple-500/30">
                <Send size={18} className="sm:w-5 sm:h-5" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">WAsender PRO</h1>
                <p className="text-[8px] sm:text-[10px] text-slate-500 font-mono uppercase tracking-widest hidden sm:block">Advanced WhatsApp Blast Engine</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-3">
            {/* Extension status */}
            <div className={cn(
              "hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all",
              isExtensionDetected
                ? "bg-green-500/10 text-green-400 border-green-500/30"
                : "bg-red-500/10 text-red-400 border-red-500/30"
            )}>
              {isExtensionDetected ? <Wifi size={12} /> : <WifiOff size={12} />}
              <span className="hidden md:inline">{isExtensionDetected ? "Connected" : "Disconnected"}</span>
            </div>

            {/* Quick action buttons */}
            <button
              onClick={downloadExtensionZip}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 hover:bg-amber-500/20 transition-all text-xs font-bold"
              title="Download Extension Helper"
            >
              <Puzzle size={14} />
              <span className="hidden lg:inline">Extension</span>
            </button>

            <button
              onClick={handleResetDefault}
              className="p-2 sm:p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 hover:bg-red-500/20 transition-all"
              title="Reset ke Pengaturan Awal"
            >
              <RotateCcw size={16} sm:size={18} />
            </button>

            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 sm:p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-400 hover:text-purple-400 transition-all"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? <Sun size={16} sm:size={18} /> : <Moon size={16} sm:size={18} />}
            </button>

            <button
              onClick={() => setShowSettingsModal(true)}
              className="p-2 sm:p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-400 hover:text-purple-400 transition-all"
              title="Settings"
            >
              <Settings2 size={16} sm:size={18} />
            </button>

            <button
              onClick={exportToCSV}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/30 rounded-xl text-purple-400 hover:bg-purple-500/20 transition-all text-xs font-bold"
            >
              <Download size={14} /> Export
            </button>

            {/* Start/Stop button - prominent */}
            <button
              onClick={isBlasting ? stopBlast : startBlast}
              disabled={entries.length === 0}
              className={cn(
                "px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 shadow-lg",
                isBlasting
                  ? "bg-red-500 text-white shadow-red-500/30 hover:bg-red-600"
                  : "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-purple-500/30 hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
              )}
            >
              {isBlasting ? <Square size={14} sm:size={16} fill="currentColor" /> : <Play size={14} sm:size={16} fill="currentColor" />}
              <span className="hidden sm:inline">{isBlasting ? 'Stop' : 'Start'}</span>
            </button>
          </div>
        </div>

        {/* Mobile menu (collapsible) */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden bg-slate-800/90 backdrop-blur-xl border-t border-purple-500/20 px-4 py-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold",
                  isExtensionDetected ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                )}>
                  {isExtensionDetected ? <Wifi size={14} /> : <WifiOff size={14} />}
                  <span>{isExtensionDetected ? "Extension Connected" : "Extension Disconnected"}</span>
                </div>
                <button
                  onClick={downloadExtensionZip}
                  className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 rounded-lg text-amber-400 text-xs font-bold"
                >
                  <Puzzle size={14} /> Download Extension
                </button>
              </div>
              <button
                onClick={exportToCSV}
                className="w-full flex items-center justify-center gap-2 py-2 bg-purple-500/10 rounded-lg text-purple-400 text-xs font-bold border border-purple-500/30"
              >
                <Download size={14} /> Export CSV
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Top Stats Cards - responsive grid */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-8">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-3 sm:p-4 border border-purple-500/20">
            <div className="flex items-center gap-2 text-purple-400 mb-1">
              <Activity size={14} className="sm:w-4 sm:h-4" />
              <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider">Sent</span>
            </div>
            <div className="text-lg sm:text-2xl font-bold text-green-400">{entries.filter(e => e.status === 'sent').length}</div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-3 sm:p-4 border border-purple-500/20">
            <div className="flex items-center gap-2 text-purple-400 mb-1">
              <Clock size={14} className="sm:w-4 sm:h-4" />
              <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider">Pending</span>
            </div>
            <div className="text-lg sm:text-2xl font-bold text-amber-400">{entries.filter(e => e.status === 'pending').length}</div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-3 sm:p-4 border border-purple-500/20">
            <div className="flex items-center gap-2 text-purple-400 mb-1">
              <CheckCircle2 size={14} className="sm:w-4 sm:h-4" />
              <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider">Received</span>
            </div>
            <div className="text-lg sm:text-2xl font-bold text-blue-400">{entries.filter(e => e.isReceived).length}</div>
          </div>
        </div>

        {/* Search and Bulk Import Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4 sm:mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, nomor, atau resi..."
              className="w-full pl-12 pr-4 py-3 bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all text-sm text-white placeholder-slate-500"
            />
          </div>
          <button
            onClick={() => setShowBulkModal(true)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-purple-500/10 border border-purple-500/30 rounded-2xl text-purple-400 font-bold text-sm hover:bg-purple-500/20 transition-all"
          >
            <FileSpreadsheet size={18} /> Bulk Import
          </button>
          <button
            onClick={() => setShowPreviewModal(true)}
            disabled={entries.filter(e => e.status === 'pending').length === 0}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-slate-300 font-bold text-sm hover:bg-slate-700 transition-all disabled:opacity-50"
          >
            <Search size={18} /> Preview
          </button>
        </div>

        {/* Add Entry Form - Card */}
        <section className="bg-slate-800/50 backdrop-blur-sm rounded-3xl p-4 sm:p-6 border border-purple-500/20 mb-6">
          <h2 className="text-lg font-bold text-purple-400 mb-4 flex items-center gap-2">
            <Plus size={20} /> Tambah Data Baru
          </h2>
          <form onSubmit={handleAddEntry} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Phone *</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="0812..."
                  className="w-full mt-1 p-3 text-sm bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all text-white placeholder-slate-600"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Name *</label>
                <input
                  type="text"
                  value={formData.recipientName}
                  onChange={(e) => setFormData(prev => ({ ...prev, recipientName: e.target.value }))}
                  placeholder="Recipient Name"
                  className="w-full mt-1 p-3 text-sm bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all text-white placeholder-slate-600"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Item Name</label>
                <input
                  type="text"
                  value={formData.itemName}
                  onChange={(e) => setFormData(prev => ({ ...prev, itemName: e.target.value }))}
                  placeholder="Nama Barang"
                  className="w-full mt-1 p-3 text-sm bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all text-white placeholder-slate-600"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Resi</label>
                <input
                  type="text"
                  value={formData.receiptNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, receiptNumber: e.target.value }))}
                  placeholder="Resi Number"
                  className="w-full mt-1 p-3 text-sm bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all text-white placeholder-slate-600"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Alamat Lengkap"
                  className="w-full mt-1 p-3 text-sm bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all text-white placeholder-slate-600"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">COD</label>
                <input
                  type="text"
                  value={formData.cod}
                  onChange={(e) => setFormData(prev => ({ ...prev, cod: e.target.value.replace(/[^0-9.,]/g, '') }))}
                  placeholder="274,398"
                  className="w-full mt-1 p-3 text-sm bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all text-white placeholder-slate-600"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">DFOD</label>
                <input
                  type="text"
                  value={formData.dfod}
                  onChange={(e) => setFormData(prev => ({ ...prev, dfod: e.target.value.replace(/[^0-9.,]/g, '') }))}
                  placeholder="10,000"
                  className="w-full mt-1 p-3 text-sm bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all text-white placeholder-slate-600"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-purple-500/30 transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={18} /> Tambah ke Antrean
                </button>
              </div>
            </div>
          </form>
        </section>

        {/* Two-column layout for main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Templates & Settings */}
          <div className="space-y-6">
            {/* Templates Card */}
            <section className="bg-slate-800/50 backdrop-blur-sm rounded-3xl p-4 sm:p-6 border border-purple-500/20">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <MessageSquare size={18} className="text-purple-400" />
                  <h2 className="font-bold text-purple-400">Templates</h2>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-bold text-purple-400 uppercase tracking-tighter mr-2 animate-pulse">Auto-saved</span>
                  <button
                    onClick={() => {
                      const def = DEFAULT_TEMPLATES.find(t => t.id === activeTemplateId);
                      if (def && confirm('Reset template ini ke pengaturan awal?')) {
                        setTemplates(prev => prev.map(t => t.id === activeTemplateId ? { ...def } : t));
                        setActiveVariationIndex(0);
                        toast.success('Template direset ke default');
                      }
                    }}
                    className="p-2 text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-xl transition-all"
                    title="Reset to Default"
                  >
                    <History size={18} />
                  </button>
                </div>
              </div>

              <div className="flex gap-2 mb-4 overflow-x-auto pb-2 custom-scrollbar">
                {templates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setActiveTemplateId(t.id);
                      setActiveVariationIndex(0);
                    }}
                    className={cn(
                      "whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                      activeTemplateId === t.id
                        ? "bg-purple-500 text-white border-purple-500 shadow-md shadow-purple-500/30"
                        : "bg-slate-900/50 text-slate-400 border-slate-700 hover:bg-slate-800"
                    )}
                  >
                    {t.name}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mr-2">Variasi:</span>
                {[0, 1, 2].map(idx => (
                  <button
                    key={idx}
                    onClick={() => setActiveVariationIndex(idx)}
                    className={cn(
                      "w-8 h-8 rounded-lg text-xs font-bold transition-all border flex items-center justify-center",
                      activeVariationIndex === idx
                        ? "bg-purple-500/20 text-purple-400 border-purple-500"
                        : "bg-slate-900/50 text-slate-500 border-slate-700"
                    )}
                  >
                    {idx + 1}
                  </button>
                ))}
                <div className="ml-auto text-[9px] text-slate-500 italic">
                  {settings.rotateTemplates ? "Rotasi Aktif" : "Rotasi Mati"}
                </div>
              </div>

              <textarea
                value={currentTemplateText}
                onChange={(e) => updateActiveTemplateText(e.target.value)}
                className="w-full h-40 p-4 text-sm bg-slate-900/50 border border-slate-700 rounded-2xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all resize-none leading-relaxed text-white placeholder-slate-600 custom-scrollbar"
                placeholder="Tulis template pesan..."
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {['{salam}', '{pengirim}', '{nama}', '{barang}', '{resi}', '{alamat}', '{cod}', '{dfod}', '{if_cod}', '{/if_cod}', '{if_dfod}', '{/if_dfod}'].map(tag => (
                  <button
                    key={tag}
                    onClick={() => updateActiveTemplateText(currentTemplateText + ' ' + tag)}
                    className="text-[10px] font-bold tracking-wider px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700/30 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles size={12} className="text-blue-400" />
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Anti-Ban Tip: Spintax</span>
                </div>
                <p className="text-[10px] text-blue-300 leading-relaxed">
                  Gunakan format <span className="font-mono font-bold bg-blue-800/30 px-1 rounded">{"{Halo|Hai|Pagi}"}</span> agar pesan diacak otomatis.
                </p>
              </div>
            </section>

            {/* System Console - compact */}
            <section className="bg-slate-800/50 backdrop-blur-sm rounded-3xl p-4 border border-purple-500/20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                  <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">System Console</h2>
                </div>
                <button
                  onClick={() => setLogs([])}
                  className="text-[9px] font-bold text-slate-500 hover:text-white uppercase tracking-widest transition-colors"
                >
                  Clear Logs
                </button>
              </div>
              <div className="h-32 overflow-y-auto custom-scrollbar font-mono text-[11px] space-y-1 px-1">
                {logs.length === 0 ? (
                  <div className="text-slate-600 italic">Waiting for system actions...</div>
                ) : (
                  logs.map(log => (
                    <div key={log.id} className="flex gap-3 leading-relaxed group">
                      <span className="text-slate-600 shrink-0">[{new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}]</span>
                      <span className={cn(
                        "break-all",
                        log.type === 'success' ? "text-green-400" :
                          log.type === 'error' ? "text-red-400" :
                            log.type === 'warning' ? "text-amber-400" :
                              "text-blue-400"
                      )}>
                        {log.message}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* Right column - Queue Table */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-3xl border border-purple-500/20 overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={18} className="text-purple-400" />
                  <h2 className="font-bold text-purple-400">Queue Management</h2>
                  <span className="ml-2 px-2 py-0.5 bg-slate-700 text-[10px] font-bold text-slate-300 rounded-md">{filteredEntries.length} items</span>
                </div>

                {isConfirmingClear ? (
                  <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                    <span className="text-[10px] font-bold text-red-400 uppercase">Confirm?</span>
                    <button onClick={clearAll} className="px-3 py-1.5 text-[10px] font-bold uppercase bg-red-500 text-white rounded-lg">Yes</button>
                    <button onClick={() => setIsConfirmingClear(false)} className="px-3 py-1.5 text-[10px] font-bold uppercase bg-slate-700 text-slate-300 rounded-lg">No</button>
                  </div>
                ) : (
                  <button onClick={() => setIsConfirmingClear(true)} className="p-2 text-slate-500 hover:text-red-400 transition-colors">
                    <Trash2 size={18} />
                  </button>
                )}
              </div>

              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-900/50">
                      <th className="px-4 sm:px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Recipient</th>
                      <th className="px-4 sm:px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Details</th>
                      <th className="px-4 sm:px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                      <th className="px-4 sm:px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Received</th>
                      <th className="px-4 sm:px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    <AnimatePresence mode="popLayout">
                      {filteredEntries.length === 0 ? (
                        <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                          <td colSpan={5} className="px-6 py-16 text-slate-500 text-sm italic">
                            No matching records found.
                          </td>
                        </motion.tr>
                      ) : (
                        filteredEntries.map((entry, index) => (
                          <motion.tr
                            key={entry.id}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className={cn(
                              "group transition-all",
                              isBlasting && index === currentIndex
                                ? "bg-purple-500/10"
                                : "hover:bg-slate-700/50"
                            )}
                          >
                            <td className="px-4 sm:px-6 py-4">
                              <div className="font-bold text-sm">{entry.recipientName}</div>
                              <div className="text-xs text-slate-500 font-mono">{entry.phone}</div>
                            </td>
                            <td className="px-4 sm:px-6 py-4">
                              <div className="text-sm font-medium truncate max-w-[150px] sm:max-w-[200px]" title={entry.itemName}>{entry.itemName || '-'}</div>
                              <div className="flex flex-col gap-1">
                                <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Resi: {entry.receiptNumber || '-'}</div>
                                {entry.address && <div className="text-[10px] text-slate-500 truncate max-w-[150px] sm:max-w-[200px]" title={entry.address}>{entry.address}</div>}
                                <div className="flex gap-2 flex-wrap">
                                  {entry.cod && <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">COD: Rp {formatCurrency(entry.cod)}</div>}
                                  {entry.dfod && <div className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">DFOD: Rp {formatCurrency(entry.dfod)}</div>}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 sm:px-6 py-4">
                              <div className={cn(
                                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                                entry.status === 'sent'
                                  ? "bg-green-500/20 text-green-400"
                                  : entry.status === 'sending'
                                    ? "bg-blue-500/20 text-blue-400 animate-pulse"
                                    : entry.status === 'failed'
                                      ? "bg-red-500/20 text-red-400"
                                      : "bg-amber-500/20 text-amber-400"
                              )}>
                                {entry.status === 'sent' ? <CheckCircle2 size={10} /> : entry.status === 'sending' ? <Loader2 size={10} className="animate-spin" /> : entry.status === 'failed' ? <AlertCircle size={10} /> : <Clock size={10} />}
                                {entry.status}
                              </div>
                            </td>
                            <td className="px-4 sm:px-6 py-4">
                              <button
                                onClick={() => toggleReceived(entry.id)}
                                className={cn(
                                  "flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all",
                                  entry.isReceived
                                    ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                    : "bg-slate-700 text-slate-400 border border-transparent"
                                )}
                              >
                                <div className={cn(
                                  "w-3 h-3 rounded-sm border flex items-center justify-center transition-all",
                                  entry.isReceived ? "bg-blue-500 border-blue-500" : "border-slate-500"
                                )}>
                                  {entry.isReceived && <CheckCircle2 size={10} className="text-white" />}
                                </div>
                                {entry.isReceived ? 'Diterima' : 'Belum'}
                              </button>
                            </td>
                            <td className="px-4 sm:px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleSendManual(entry)} className="p-2 text-purple-400 hover:bg-purple-500/20 rounded-xl"><ExternalLink size={16} /></button>
                                <button onClick={() => setEntries(prev => prev.filter(e => e.id !== entry.id))} className="p-2 text-slate-500 hover:text-red-400 rounded-xl"><Trash2 size={16} /></button>
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

      {/* Bulk Import Modal - redesigned */}
      <AnimatePresence>
        {showBulkModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowBulkModal(false)} className="absolute inset-0 bg-black/70 backdrop-blur-md" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl max-h-[90vh] bg-slate-800 rounded-[2rem] shadow-2xl overflow-hidden border border-purple-500/30 flex flex-col"
            >
              <div className="p-6 border-b border-slate-700 flex items-center justify-between bg-slate-900/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500/20 text-purple-400 rounded-xl flex items-center justify-center"><FileSpreadsheet size={20} /></div>
                  <div>
                    <h2 className="text-xl font-bold text-purple-400">Bulk Import</h2>
                    <p className="text-xs text-slate-500">Copy-paste data from Excel or CSV</p>
                  </div>
                </div>
                <button onClick={() => setShowBulkModal(false)} className="p-2 hover:bg-slate-700 rounded-full transition-colors"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-purple-500/10 rounded-2xl border border-purple-500/30">
                    <div className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-1">Step 1</div>
                    <p className="text-xs text-purple-300">Kolom: No, Resi, Nama, HP, Alamat, Tanda, Nominal COD, Nominal DFOD, Barang</p>
                  </div>
                  <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/30">
                    <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Step 2</div>
                    <p className="text-xs text-blue-300">Copy range dari Excel & Paste di bawah</p>
                  </div>
                </div>
                <textarea
                  value={bulkData}
                  onChange={(e) => setBulkData(e.target.value)}
                  placeholder="1	JX123456789	Budi Santoso	08123456789	Jl. Merdeka No. 1	COD	150000	0	Sepatu..."
                  className="w-full h-64 p-6 text-sm font-mono bg-slate-900/50 border border-slate-700 rounded-[1.5rem] focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all resize-none text-white placeholder-slate-600 custom-scrollbar"
                />
                <div className="flex gap-4">
                  <button onClick={() => setShowBulkModal(false)} className="flex-1 py-4 bg-slate-700 text-slate-300 rounded-2xl font-bold hover:bg-slate-600 transition-all">Cancel</button>
                  <button onClick={handleBulkImport} className="flex-[2] py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-bold shadow-lg shadow-purple-500/30 hover:shadow-xl transition-all">Import Data</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Preview Modal - redesigned */}
      <AnimatePresence>
        {showPreviewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPreviewModal(false)} className="absolute inset-0 bg-black/70 backdrop-blur-md" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg max-h-[90vh] bg-slate-800 rounded-[2rem] shadow-2xl overflow-hidden border border-purple-500/30 flex flex-col"
            >
              <div className="p-6 border-b border-slate-700 flex items-center justify-between bg-slate-900/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center"><MessageSquare size={20} /></div>
                  <div>
                    <h2 className="text-lg font-bold text-blue-400">Message Preview</h2>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">First Pending Entry</p>
                  </div>
                </div>
                <button onClick={() => setShowPreviewModal(false)} className="p-2 hover:bg-slate-700 rounded-full transition-colors"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                {entries.find(e => e.status === 'pending') ? (
                  <>
                    <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-700">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 bg-purple-500/20 text-purple-400 rounded-lg flex items-center justify-center text-xs font-bold">
                          {entries.find(e => e.status === 'pending')?.recipientName.charAt(0)}
                        </div>
                        <div>
                          <div className="text-xs font-bold">{entries.find(e => e.status === 'pending')?.recipientName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{entries.find(e => e.status === 'pending')?.phone}</div>
                        </div>
                      </div>
                      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-sm whitespace-pre-wrap leading-relaxed text-slate-300 font-sans">
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
                    <div className="flex gap-3">
                      <button onClick={() => setShowPreviewModal(false)} className="flex-1 py-3 bg-slate-700 text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-600 transition-all">Close</button>
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
                        className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-purple-500/30 hover:shadow-xl transition-all flex items-center justify-center gap-2"
                      >
                        <Send size={16} /> Send Now
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <Clock size={48} className="mx-auto text-slate-600 mb-4" />
                    <p className="text-slate-500 text-sm italic">No pending entries to preview.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settings Modal - redesigned */}
      <AnimatePresence>
        {showSettingsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSettingsModal(false)} className="absolute inset-0 bg-black/70 backdrop-blur-md" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md max-h-[90vh] bg-slate-800 rounded-[2rem] shadow-2xl overflow-hidden border border-purple-500/30 flex flex-col"
            >
              <div className="p-6 border-b border-slate-700 flex items-center justify-between bg-slate-900/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500/20 text-purple-400 rounded-xl flex items-center justify-center"><Settings2 size={20} /></div>
                  <div>
                    <h2 className="text-lg font-bold text-purple-400">Settings</h2>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Engine Configuration</p>
                  </div>
                </div>
                <button onClick={() => setShowSettingsModal(false)} className="p-2 hover:bg-slate-700 rounded-full transition-colors"><X size={20} /></button>
              </div>

              {/* Tabs */}
              <div className="flex px-6 pt-4 gap-4 border-b border-slate-700 shrink-0">
                <button
                  onClick={() => setActiveSettingsTab('general')}
                  className={cn(
                    "pb-3 text-xs font-bold uppercase tracking-widest transition-all relative",
                    activeSettingsTab === 'general' ? "text-purple-400" : "text-slate-500"
                  )}
                >
                  General
                  {activeSettingsTab === 'general' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 rounded-full" />}
                </button>
                <button
                  onClick={() => setActiveSettingsTab('antispam')}
                  className={cn(
                    "pb-3 text-xs font-bold uppercase tracking-widest transition-all relative",
                    activeSettingsTab === 'antispam' ? "text-purple-400" : "text-slate-500"
                  )}
                >
                  Anti-Spam
                  {activeSettingsTab === 'antispam' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 rounded-full" />}
                </button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                {activeSettingsTab === 'antispam' && (
                  <div className="mb-6 p-4 bg-purple-500/10 rounded-2xl border border-purple-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Safety Score</span>
                      <span className={cn(
                        "text-xs font-black",
                        safetyScore > 80 ? "text-green-400" : safetyScore > 50 ? "text-amber-400" : "text-red-400"
                      )}>{safetyScore}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${safetyScore}%` }}
                        className={cn(
                          "h-full transition-all duration-500",
                          safetyScore > 80 ? "bg-green-500" : safetyScore > 50 ? "bg-amber-500" : "bg-red-500"
                        )}
                      />
                    </div>
                    <p className="text-[9px] text-slate-500 mt-2 italic">
                      {safetyScore > 80 ? "Sangat Aman: Pola pengiriman sangat mirip manusia." :
                        safetyScore > 50 ? "Cukup Aman: Disarankan menambah jeda atau variasi pesan." :
                          "Beresiko Tinggi: Akun Anda rentan terkena banned!"}
                    </p>
                  </div>
                )}
                {activeSettingsTab === 'general' ? (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                          <User size={14} /> Nama Pengirim
                        </label>
                        <input
                          type="text"
                          value={settings.senderName}
                          onChange={(e) => setSettings(prev => ({ ...prev, senderName: e.target.value }))}
                          className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all text-sm text-white placeholder-slate-600"
                          placeholder="Admin JNT"
                        />
                      </div>

                      {/* Speed Presets */}
                      <div className="space-y-3 pt-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                          <Zap size={14} className="text-amber-400" /> Pilih Kecepatan Blast
                        </label>
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
                                  ? "bg-purple-500/20 border-purple-500 ring-1 ring-purple-500"
                                  : "bg-slate-900/50 border-slate-700 hover:border-purple-500/50"
                              )}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-lg">{mode.icon}</span>
                                {settings.speedMode === mode.id && <div className="w-2 h-2 bg-purple-500 rounded-full" />}
                              </div>
                              <div className="text-xs font-bold">{mode.label}</div>
                              <div className="text-[10px] text-slate-500">{mode.desc}</div>
                            </button>
                          ))}
                          <button
                            onClick={() => setSettings(prev => ({ ...prev, speedMode: 'custom' }))}
                            className={cn(
                              "col-span-2 p-3 rounded-xl border text-left transition-all",
                              settings.speedMode === 'custom'
                                ? "bg-purple-500/20 border-purple-500 ring-1 ring-purple-500"
                                : "bg-slate-900/50 border-slate-700 hover:border-purple-500/50"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <div className="text-xs font-bold">⚙️ Custom (Atur Manual)</div>
                              {settings.speedMode === 'custom' && <div className="w-2 h-2 bg-purple-500 rounded-full" />}
                            </div>
                          </button>
                        </div>
                      </div>

                      {settings.speedMode === 'custom' && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                            <Timer size={14} /> Blast Delay (Milliseconds)
                          </label>
                          <input
                            type="number"
                            value={settings.delay}
                            onChange={(e) => setSettings(prev => ({ ...prev, delay: parseInt(e.target.value) || 1000 }))}
                            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all text-sm text-white"
                            placeholder="5000"
                            min="1000"
                            step="500"
                          />
                        </div>
                      )}

                      <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-2xl border border-slate-700">
                        <div className="space-y-1">
                          <div className="text-xs font-bold">Mode Manual</div>
                          <div className="text-[10px] text-slate-500">Kirim berikutnya hanya saat Anda klik/tekan Spasi.</div>
                        </div>
                        <button
                          onClick={() => setSettings(prev => ({ ...prev, manualMode: !prev.manualMode }))}
                          className={cn(
                            "w-12 h-6 rounded-full transition-all relative",
                            settings.manualMode ? "bg-purple-500" : "bg-slate-600"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                            settings.manualMode ? "left-7" : "left-1"
                          )} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-2xl border border-slate-700">
                        <div className="space-y-1">
                          <div className="text-xs font-bold">Auto Retry</div>
                          <div className="text-[10px] text-slate-500">Coba kirim ulang otomatis jika gagal.</div>
                        </div>
                        <button
                          onClick={() => setSettings(prev => ({ ...prev, autoRetry: !prev.autoRetry }))}
                          className={cn(
                            "w-12 h-6 rounded-full transition-all relative",
                            settings.autoRetry ? "bg-purple-500" : "bg-slate-600"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                            settings.autoRetry ? "left-7" : "left-1"
                          )} />
                        </button>
                      </div>

                      {settings.autoRetry && (
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                            <RotateCcw size={14} /> Max Retries
                          </label>
                          <input
                            type="number"
                            value={settings.maxRetries}
                            onChange={(e) => setSettings(prev => ({ ...prev, maxRetries: parseInt(e.target.value) || 1 }))}
                            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all text-sm text-white"
                            min="1"
                            max="10"
                          />
                        </div>
                      )}

                      <div className="pt-2">
                        <button
                          onClick={() => {
                            if (window.confirm('Kembalikan semua template ke pengaturan default? Template yang Anda ubah akan tertimpa.')) {
                              setTemplates(DEFAULT_TEMPLATES);
                              setActiveTemplateId(DEFAULT_TEMPLATES[0].id);
                              setActiveVariationIndex(0);
                              toast.success('Template berhasil dipulihkan');
                            }
                          }}
                          className="w-full py-3 bg-slate-700 text-slate-300 rounded-xl font-bold text-xs hover:bg-slate-600 transition-all flex items-center justify-center gap-2"
                        >
                          <RotateCcw size={14} /> Restore Default Templates
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-purple-500/10 rounded-xl border border-purple-500/30">
                        <div className="space-y-0.5">
                          <div className="text-xs font-bold">Randomize Delay</div>
                          <div className="text-[9px] text-slate-500">Jeda waktu acak agar tidak terdeteksi bot.</div>
                        </div>
                        <button
                          onClick={() => setSettings(prev => ({ ...prev, randomizeDelay: !prev.randomizeDelay }))}
                          className={cn(
                            "w-10 h-5 rounded-full transition-all relative",
                            settings.randomizeDelay ? "bg-purple-500" : "bg-slate-600"
                          )}
                        >
                          <div className={cn(
                            "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all",
                            settings.randomizeDelay ? "left-5.5" : "left-0.5"
                          )} />
                        </button>
                      </div>

                      {settings.randomizeDelay && (
                        <div className="space-y-2 px-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Max Delay (ms)</label>
                          <input
                            type="number"
                            value={settings.maxDelay}
                            onChange={(e) => setSettings(prev => ({ ...prev, maxDelay: parseInt(e.target.value) || 10000 }))}
                            className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-xs text-white"
                            step="500"
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Batch Size</label>
                          <input
                            type="number"
                            value={settings.batchSize}
                            onChange={(e) => setSettings(prev => ({ ...prev, batchSize: parseInt(e.target.value) || 0 }))}
                            className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-xs text-white"
                            placeholder="10"
                          />
                          <p className="text-[8px] text-slate-500 italic">Istirahat tiap X pesan.</p>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Pause (ms)</label>
                          <input
                            type="number"
                            value={settings.batchPause}
                            onChange={(e) => setSettings(prev => ({ ...prev, batchPause: parseInt(e.target.value) || 0 }))}
                            className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-xs text-white"
                            placeholder="30000"
                          />
                          <p className="text-[8px] text-slate-500 italic">Lama istirahat.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Hourly Limit</label>
                          <input
                            type="number"
                            value={settings.hourlyLimit}
                            onChange={(e) => setSettings(prev => ({ ...prev, hourlyLimit: parseInt(e.target.value) || 0 }))}
                            className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-xs text-white"
                            placeholder="50"
                          />
                          <p className="text-[8px] text-slate-500 italic">Maks pesan per jam.</p>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Stop on Errors</label>
                          <input
                            type="number"
                            value={settings.stopOnConsecutiveErrors}
                            onChange={(e) => setSettings(prev => ({ ...prev, stopOnConsecutiveErrors: parseInt(e.target.value) || 0 }))}
                            className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-xs text-white"
                            placeholder="3"
                          />
                          <p className="text-[8px] text-slate-500 italic">Stop jika X gagal urut.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Long Break After</label>
                          <input
                            type="number"
                            value={settings.longBreakAfter}
                            onChange={(e) => setSettings(prev => ({ ...prev, longBreakAfter: parseInt(e.target.value) || 0 }))}
                            className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-xs text-white"
                            placeholder="25"
                          />
                          <p className="text-[8px] text-slate-500 italic">Istirahat tiap X pesan.</p>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Duration (min)</label>
                          <input
                            type="number"
                            value={settings.longBreakDuration}
                            onChange={(e) => setSettings(prev => ({ ...prev, longBreakDuration: parseInt(e.target.value) || 0 }))}
                            className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-xs text-white"
                            placeholder="10"
                          />
                          <p className="text-[8px] text-slate-500 italic">Lama istirahat (menit).</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
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
                          { key: 'autoSend', label: 'Auto Send Mode', desc: 'Kirim otomatis via Chrome Extension.' }
                        ].map((item) => (
                          <div key={item.key} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-700">
                            <div className="space-y-0.5">
                              <div className="text-xs font-bold">{item.label}</div>
                              <div className="text-[9px] text-slate-500">{item.desc}</div>
                            </div>
                            <button
                              onClick={() => setSettings(prev => ({ ...prev, [item.key]: !prev[item.key as keyof AppSettings] }))}
                              className={cn(
                                "w-10 h-5 rounded-full transition-all relative",
                                settings[item.key as keyof AppSettings] ? "bg-purple-500" : "bg-slate-600"
                              )}
                            >
                              <div className={cn(
                                "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all",
                                settings[item.key as keyof AppSettings] ? "left-5.5" : "left-0.5"
                              )} />
                            </button>
                          </div>
                        ))}
                      </div>

                      {settings.autoSend && (
                        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-amber-400">
                              <Puzzle size={16} />
                              <span className="text-xs font-bold uppercase tracking-wider">Chrome Extension Required</span>
                            </div>
                            <div className={cn(
                              "px-2 py-0.5 rounded text-[8px] font-bold uppercase",
                              isExtensionDetected ? "bg-green-500 text-white" : "bg-amber-500 text-white"
                            )}>
                              {isExtensionDetected ? "Connected" : "Not Found"}
                            </div>
                          </div>

                          <p className="text-[10px] leading-relaxed text-amber-300">
                            Fitur ini membutuhkan Chrome Extension khusus untuk menekan tombol kirim secara otomatis di WhatsApp Web.
                          </p>

                          <button
                            onClick={downloadExtensionZip}
                            className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-600/30 transition-all"
                          >
                            <Download size={16} /> Download Extension (.zip)
                          </button>

                          <div className="space-y-2">
                            <div className="text-[10px] font-bold text-amber-300">Cara Instalasi (Hanya 1 Menit):</div>
                            <ol className="text-[10px] space-y-2 text-amber-300/70 list-decimal ml-4">
                              <li>Klik tombol <b>Download Extension</b> di atas.</li>
                              <li>Ekstrak file <code className="bg-amber-800/30 px-1 rounded">wasender-pro-helper.zip</code> menjadi folder.</li>
                              <li>Buka <code className="bg-amber-800/30 px-1 rounded">chrome://extensions</code> di browser Chrome.</li>
                              <li>Aktifkan <b>Developer Mode</b> di pojok kanan atas.</li>
                              <li>Klik <b>Load Unpacked</b> dan pilih folder hasil ekstrak tadi.</li>
                            </ol>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-slate-700 bg-slate-900/50 shrink-0">
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-bold shadow-lg shadow-purple-500/30 hover:shadow-xl transition-all"
                >
                  Save Configuration
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="max-w-7xl mx-auto px-6 py-8 border-t border-purple-500/20 text-center">
        <div className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-mono font-bold">
          WAsender PRO Engine • v2.0.0 • Enterprise Edition
        </div>
      </footer>
    </div>
  );
}
