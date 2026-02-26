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
  ChevronRight
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
import { GoogleGenAI } from "@google/genai";
import { 
  BlastEntry, 
  MessageTemplate, 
  DEFAULT_TEMPLATES, 
  AppSettings, 
  DEFAULT_SETTINGS 
} from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Initialize Gemini
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export default function App() {
  const [entries, setEntries] = useState<BlastEntry[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>(DEFAULT_TEMPLATES);
  const [activeTemplateId, setActiveTemplateId] = useState<string>(DEFAULT_TEMPLATES[0].id);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isBlasting, setIsBlasting] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkData, setBulkData] = useState('');
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    phone: '',
    recipientName: '',
    itemName: '',
    receiptNumber: '',
    cod: ''
  });

  // Load data
  useEffect(() => {
    const savedEntries = localStorage.getItem('wa_blast_entries');
    const savedTemplates = localStorage.getItem('wa_blast_templates');
    const savedActiveId = localStorage.getItem('wa_blast_active_template_id');
    const savedSettings = localStorage.getItem('wa_blast_settings');
    
    if (savedEntries) setEntries(JSON.parse(savedEntries));
    if (savedTemplates) setTemplates(JSON.parse(savedTemplates));
    if (savedActiveId) setActiveTemplateId(savedActiveId);
    if (savedSettings) setSettings(JSON.parse(savedSettings));
  }, []);

  // Save data
  useEffect(() => localStorage.setItem('wa_blast_entries', JSON.stringify(entries)), [entries]);
  useEffect(() => localStorage.setItem('wa_blast_templates', JSON.stringify(templates)), [templates]);
  useEffect(() => localStorage.setItem('wa_blast_active_template_id', activeTemplateId), [activeTemplateId]);
  useEffect(() => localStorage.setItem('wa_blast_settings', JSON.stringify(settings)), [settings]);

  const activeTemplate = templates.find(t => t.id === activeTemplateId) || templates[0];

  const updateActiveTemplateText = (text: string) => {
    setTemplates(prev => prev.map(t => t.id === activeTemplateId ? { ...t, text } : t));
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
      createdAt: Date.now()
    };

    setEntries(prev => [newEntry, ...prev]);
    setFormData({ phone: '', recipientName: '', itemName: '', receiptNumber: '', cod: '' });
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
      
      if (columns.length >= 2) {
        newEntries.push({
          id: crypto.randomUUID(),
          phone: columns[0],
          recipientName: columns[1],
          itemName: columns[2] || '',
          receiptNumber: columns[3] || '',
          cod: columns[4] || '',
          status: 'pending',
          createdAt: Date.now()
        });
        successCount++;
      }
    });

    if (newEntries.length > 0) {
      setEntries(prev => [...newEntries, ...prev]);
      setBulkData('');
      setShowBulkModal(false);
      toast.success(`${successCount} data berhasil diimpor`);
    } else {
      toast.error('Format data tidak valid.');
    }
  };

  const clearAll = () => {
    setEntries([]);
    setIsConfirmingClear(false);
    toast.success('Semua data dihapus');
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return 'Selamat Pagi';
    if (hour >= 11 && hour < 15) return 'Selamat Siang';
    if (hour >= 15 && hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  const generateMessage = (entry: BlastEntry) => {
    return activeTemplate.text
      .replace(/{salam}/gi, getGreeting())
      .replace(/{pengirim}/gi, settings.senderName || 'Admin')
      .replace(/{nama}/gi, entry.recipientName)
      .replace(/{barang}/gi, entry.itemName || '-')
      .replace(/{resi}/gi, entry.receiptNumber || '-')
      .replace(/{cod}/gi, entry.cod || '0');
  };

  const getWALink = (entry: BlastEntry) => {
    let phone = entry.phone.replace(/\D/g, '');
    if (phone.startsWith('0')) phone = '62' + phone.slice(1);
    if (!phone.startsWith('62')) phone = '62' + phone;
    const message = encodeURIComponent(generateMessage(entry));
    return `https://wa.me/${phone}?text=${message}`;
  };

  const handleSendManual = (entry: BlastEntry) => {
    window.open(getWALink(entry), '_blank');
    updateStatus(entry.id, 'sent');
  };

  const updateStatus = (id: string, status: BlastEntry['status']) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, status } : e));
  };

  const startBlast = () => {
    const pending = entries.filter(e => e.status === 'pending');
    if (pending.length === 0) {
      toast.error('Tidak ada pesan pending');
      return;
    }
    setIsBlasting(true);
    setCurrentIndex(0);
  };

  const stopBlast = () => {
    setIsBlasting(false);
    setCurrentIndex(-1);
  };

  useEffect(() => {
    if (isBlasting && currentIndex >= 0) {
      const pendingEntries = entries.filter(e => e.status === 'pending');
      if (currentIndex < pendingEntries.length) {
        const entry = pendingEntries[currentIndex];
        const timer = setTimeout(() => {
          window.open(getWALink(entry), '_blank');
          updateStatus(entry.id, 'sent');
          setCurrentIndex(prev => prev + 1);
        }, settings.delay);
        return () => clearTimeout(timer);
      } else {
        setIsBlasting(false);
        setCurrentIndex(-1);
        toast.success('Blast selesai!');
      }
    }
  }, [isBlasting, currentIndex, entries, settings.delay]);

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
    return [
      { name: 'Sent', value: sent, color: '#10b981' },
      { name: 'Pending', value: pending, color: '#f59e0b' }
    ];
  }, [entries]);

  const exportToCSV = () => {
    if (entries.length === 0) return;
    const headers = ['Phone', 'Name', 'Item', 'Receipt', 'Status', 'Created At'];
    const rows = entries.map(e => [
      e.phone,
      e.recipientName,
      e.itemName,
      e.receiptNumber,
      e.status,
      new Date(e.createdAt).toLocaleString()
    ]);
    const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `wasender_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Laporan berhasil diunduh');
  };

  const generateAITemplate = async () => {
    setIsGeneratingAI(true);
    try {
      const prompt = `Buatlah template pesan WhatsApp profesional untuk ${activeTemplate.name} toko online. 
      Gunakan variabel {nama}, {barang}, dan {resi}. 
      Teks harus ramah, sopan, dan singkat. 
      Hanya berikan teks pesannya saja tanpa penjelasan tambahan.`;
      
      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: prompt }] }],
      });
      
      const text = response.text;
      if (text) {
        updateActiveTemplateText(text.trim());
        toast.success('Template diperbarui dengan AI');
      }
    } catch (error) {
      console.error(error);
      toast.error('Gagal generate AI template');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans selection:bg-emerald-100">
      <Toaster position="top-right" />
      
      {/* Sidebar-like Header */}
      <header className="bg-white border-b border-black/5 sticky top-0 z-30 backdrop-blur-md bg-white/80">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-600/20">
              <Send size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">WAsender <span className="text-emerald-600">PRO</span></h1>
              <p className="text-[10px] text-gray-400 font-mono uppercase tracking-widest">Advanced WhatsApp Blast Engine</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full border border-black/5">
              <div className={cn("w-2 h-2 rounded-full animate-pulse", isBlasting ? "bg-emerald-500" : "bg-gray-300")} />
              <span className="text-xs font-medium text-gray-500">{isBlasting ? 'System Active' : 'System Idle'}</span>
            </div>
            <button 
              onClick={exportToCSV}
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-600 hover:text-emerald-600 transition-colors"
            >
              <Download size={14} /> Export
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Stats & Config */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Stats Card */}
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-black/5">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <BarChart3 size={18} className="text-emerald-500" />
                <h2 className="font-bold">Overview</h2>
              </div>
              <History size={16} className="text-gray-300" />
            </div>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statsData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              {statsData.map(s => (
                <div key={s.name} className="p-3 rounded-2xl bg-gray-50 border border-black/5">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{s.name}</div>
                  <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Settings Card */}
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-black/5">
            <div className="flex items-center gap-2 mb-6">
              <Timer size={18} className="text-emerald-500" />
              <h2 className="font-bold">Engine Settings</h2>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nama Pengirim</label>
                <input
                  type="text"
                  value={settings.senderName}
                  onChange={(e) => setSettings(prev => ({ ...prev, senderName: e.target.value }))}
                  placeholder="Contoh: Admin JNT"
                  className="w-full p-3 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:border-emerald-500 outline-none"
                />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Blast Delay</label>
                  <span className="text-xs font-mono font-bold text-emerald-600">{settings.delay / 1000}s</span>
                </div>
                <input 
                  type="range" 
                  min="1000" 
                  max="10000" 
                  step="500"
                  value={settings.delay}
                  onChange={(e) => setSettings(prev => ({ ...prev, delay: parseInt(e.target.value) }))}
                  className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                  <span>FAST</span>
                  <span>SAFE</span>
                </div>
              </div>
            </div>
          </section>

          {/* Template Editor */}
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-black/5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Settings2 size={18} className="text-emerald-500" />
                <h2 className="font-bold">Templates</h2>
              </div>
              <button 
                onClick={generateAITemplate}
                disabled={isGeneratingAI}
                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all disabled:opacity-50"
                title="AI Suggestion"
              >
                <Sparkles size={18} className={isGeneratingAI ? "animate-spin" : ""} />
              </button>
            </div>
            
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
              {templates.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTemplateId(t.id)}
                  className={cn(
                    "whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                    activeTemplateId === t.id 
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20" 
                      : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                  )}
                >
                  {t.name}
                </button>
              ))}
            </div>

            <textarea
              value={activeTemplate.text}
              onChange={(e) => updateActiveTemplateText(e.target.value)}
              className="w-full h-40 p-4 text-sm bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all resize-none leading-relaxed"
              placeholder="Tulis template pesan..."
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {['{salam}', '{pengirim}', '{nama}', '{barang}', '{resi}', '{cod}'].map(tag => (
                <button
                  key={tag}
                  onClick={() => updateActiveTemplateText(activeTemplate.text + ' ' + tag)}
                  className="text-[10px] font-bold tracking-wider px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column: Queue & Input */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Action Bar */}
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-white p-4 rounded-3xl border border-black/5 shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama, nomor, atau resi..."
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-sm"
              />
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowBulkModal(true)}
                className="px-6 py-3 bg-emerald-50 text-emerald-700 rounded-2xl font-bold text-sm hover:bg-emerald-100 transition-all flex items-center gap-2"
              >
                <FileSpreadsheet size={18} /> Bulk Import
              </button>
              <button
                onClick={isBlasting ? stopBlast : startBlast}
                disabled={entries.length === 0}
                className={cn(
                  "px-8 py-3 rounded-2xl font-bold text-sm transition-all flex items-center gap-2 shadow-lg",
                  isBlasting 
                    ? "bg-red-500 text-white shadow-red-500/20" 
                    : "bg-black text-white shadow-black/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                )}
              >
                {isBlasting ? <Square size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                {isBlasting ? 'Stop Blast' : 'Start Engine'}
              </button>
            </div>
          </div>

          {/* Quick Add Form */}
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-black/5">
            <form onSubmit={handleAddEntry} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="0812..."
                    className="w-full p-3 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:border-emerald-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Name</label>
                  <input
                    type="text"
                    value={formData.recipientName}
                    onChange={(e) => setFormData(prev => ({ ...prev, recipientName: e.target.value }))}
                    placeholder="Recipient Name"
                    className="w-full p-3 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:border-emerald-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Item Name</label>
                  <input
                    type="text"
                    value={formData.itemName}
                    onChange={(e) => setFormData(prev => ({ ...prev, itemName: e.target.value }))}
                    placeholder="Nama Barang"
                    className="w-full p-3 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Resi</label>
                  <input
                    type="text"
                    value={formData.receiptNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, receiptNumber: e.target.value }))}
                    placeholder="Resi Number"
                    className="w-full p-3 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:border-emerald-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">COD</label>
                  <input
                    type="text"
                    value={formData.cod}
                    onChange={(e) => setFormData(prev => ({ ...prev, cod: e.target.value }))}
                    placeholder="274,398"
                    className="w-full p-3 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:border-emerald-500 outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={18} /> Add to Queue
                </button>
              </div>
            </form>
          </section>

          {/* Queue Table */}
          <div className="bg-white rounded-3xl shadow-sm border border-black/5 overflow-hidden">
            <div className="p-6 border-b border-black/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-emerald-500" />
                <h2 className="font-bold">Queue Management</h2>
                <span className="ml-2 px-2 py-0.5 bg-gray-100 text-[10px] font-bold text-gray-500 rounded-md">{filteredEntries.length} items</span>
              </div>
              
              {isConfirmingClear ? (
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                  <span className="text-[10px] font-bold text-red-600 uppercase">Confirm?</span>
                  <button onClick={clearAll} className="px-3 py-1.5 text-[10px] font-bold uppercase bg-red-500 text-white rounded-lg">Yes</button>
                  <button onClick={() => setIsConfirmingClear(false)} className="px-3 py-1.5 text-[10px] font-bold uppercase bg-gray-100 text-gray-600 rounded-lg">No</button>
                </div>
              ) : (
                <button onClick={() => setIsConfirmingClear(true)} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                  <Trash2 size={18} />
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Recipient</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Details</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  <AnimatePresence mode="popLayout">
                    {filteredEntries.length === 0 ? (
                      <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                        <td colSpan={4} className="px-6 py-16 text-gray-400 text-sm italic">
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
                            isBlasting && index === currentIndex ? "bg-emerald-50/80" : "hover:bg-gray-50/50"
                          )}
                        >
                          <td className="px-6 py-5">
                            <div className="font-bold text-sm">{entry.recipientName}</div>
                            <div className="text-xs text-gray-400 font-mono">{entry.phone}</div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="text-sm font-medium truncate max-w-[200px]" title={entry.itemName}>{entry.itemName || '-'}</div>
                            <div className="flex gap-2 items-center">
                              <div className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Resi: {entry.receiptNumber || '-'}</div>
                              {entry.cod && <div className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">COD: {entry.cod}</div>}
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className={cn(
                              "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                              entry.status === 'sent' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                            )}>
                              {entry.status === 'sent' ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                              {entry.status}
                            </div>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleSendManual(entry)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl"><ExternalLink size={16} /></button>
                              <button onClick={() => setEntries(prev => prev.filter(e => e.id !== entry.id))} className="p-2 text-gray-300 hover:text-red-500 rounded-xl"><Trash2 size={16} /></button>
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowBulkModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl overflow-hidden">
              <div className="p-8 border-b border-black/5 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center"><FileSpreadsheet size={20} /></div>
                  <div>
                    <h2 className="text-xl font-bold">Bulk Import</h2>
                    <p className="text-xs text-gray-400">Copy-paste data from Excel or CSV</p>
                  </div>
                </div>
                <button onClick={() => setShowBulkModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X size={20} /></button>
              </div>
              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Step 1</div>
                    <p className="text-xs text-emerald-800">Siapkan kolom: Phone, Name, Item, Receipt, COD</p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                    <div className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">Step 2</div>
                    <p className="text-xs text-blue-800">Copy range dari Excel & Paste di bawah</p>
                  </div>
                </div>
                <textarea
                  value={bulkData}
                  onChange={(e) => setBulkData(e.target.value)}
                  placeholder="08123456789	Budi Santoso	Sepatu	JX123456	274,398..."
                  className="w-full h-64 p-6 text-sm font-mono bg-gray-50 border border-gray-100 rounded-[1.5rem] focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all resize-none"
                />
                <div className="flex gap-4">
                  <button onClick={() => setShowBulkModal(false)} className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all">Cancel</button>
                  <button onClick={handleBulkImport} className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all">Import Data</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-black/5 text-center">
        <div className="text-[10px] text-gray-400 uppercase tracking-[0.3em] font-mono font-bold">
          WAsender PRO Engine • v2.0.0 • Enterprise Edition
        </div>
      </footer>
    </div>
  );
}
