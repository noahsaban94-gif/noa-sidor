import React, { useState, useMemo } from 'react';
import {
  Search,
  Truck,
  Plus,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Package,
  Layers,
  LayoutGrid,
  List,
  Sparkles,
  FileSpreadsheet,
  Send,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  Edit2,
  Trash2,
  Phone,
  Navigation,
  Scale,
  ShieldCheck,
  Building2,
  MapPin,
  Download,
  Copy,
  Check,
  FileText
} from 'lucide-react';
import { OrderItem, OrderStatus, STATUS_MAP, DRIVERS_LIST, CONFIG, GasTabOrderRow } from '../types';
import { OrderCard } from './OrderCard';
import { calculateOrderMetrics, formatWeight, formatOrderToGasTabRow, extractCityFromDestination } from '../utils/logistics';

interface OrdersDashboardProps {
  orders: OrderItem[];
  onUpdateStatus: (id: string, status: OrderStatus) => void;
  onUpdateTime: (id: string, newTime: string, driver?: string) => void;
  onOpenNewOrder: () => void;
  onEditOrder: (order: OrderItem) => void;
  onDeleteOrder: (id: string) => void;
  onSendWhatsApp: (order: OrderItem) => void;
  onOpenReports: () => void;
  onOpenChat: () => void;
  onRefreshSchedule?: () => void;
  onResetSchedule?: () => void;
}

const TAB_2_COLUMNS = [
  'מספר הזמנה',
  'שם לקוח',
  'מספר לקוח',
  'כתובת אתר / יעד',
  'עיר',
  'מחסן יציאה',
  'נהג משובץ',
  'סוג משאית / מנוף',
  'שעת אספקה',
  'משקל כולל (טון)',
  'פירוט פריטים ומק"טים',
  'בלות פקדון',
  'משטחים פקדון',
  'סטטוס ביצוע',
  'קישור Waze',
  'קובץ הזמנה (Drive)',
  'זמן עדכון אחרון',
  'בדיקה',
];

export const OrdersDashboard: React.FC<OrdersDashboardProps> = ({
  orders,
  onUpdateStatus,
  onUpdateTime,
  onOpenNewOrder,
  onEditOrder,
  onDeleteOrder,
  onSendWhatsApp,
  onOpenReports,
  onOpenChat,
  onRefreshSchedule,
  onResetSchedule,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDriver, setSelectedDriver] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');
  const [craneOnly, setCraneOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);
  const [copiedCsv, setCopiedCsv] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>(
    new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
  );

  // Manual Trigger for Google Sheets Tab 2 sync
  const handleSyncTab2 = async () => {
    setIsSyncingSheet(true);
    try {
      const res = await fetch('/api/gas/daily-schedule');
      if (res.ok) {
        setLastSyncTime(new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }));
        if (onRefreshSchedule) {
          onRefreshSchedule();
        }
      }
    } catch (err) {
      console.warn('Sync Tab 2 error:', err);
    } finally {
      setTimeout(() => setIsSyncingSheet(false), 500);
    }
  };

  // Metrics
  const metrics = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter((o) => o.status === 'pending').length;
    const loading = orders.filter((o) => o.status === 'loading').length;
    const inTransit = orders.filter((o) => o.status === 'in_transit').length;
    const delivered = orders.filter((o) => o.status === 'delivered').length;
    const crane = orders.filter((o) => o.craneRequired).length;

    return { total, pending, loading, inTransit, delivered, crane };
  }, [orders]);

  // Unique list of cities from orders
  const availableCities = useMemo(() => {
    const citiesSet = new Set<string>();
    orders.forEach((o) => {
      const c = o.city || extractCityFromDestination(o.destination);
      if (c) citiesSet.add(c);
    });
    return Array.from(citiesSet);
  }, [orders]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const city = order.city || extractCityFromDestination(order.destination);
      const matchesSearch =
        !searchTerm ||
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.customerNumber && order.customerNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        order.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
        city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.notes && order.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (order.siteContact && order.siteContact.toLowerCase().includes(searchTerm.toLowerCase())) ||
        order.items.some(
          (i) =>
            i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (i.sku && i.sku.includes(searchTerm))
        );

      const matchesDriver = selectedDriver === 'all' || order.driver === selectedDriver;
      const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;
      const matchesCity = selectedCity === 'all' || city === selectedCity;
      const matchesCrane = !craneOnly || order.craneRequired;
      const matchesWarehouse =
        selectedWarehouse === 'all' ||
        (selectedWarehouse === 'harash' && order.warehouse?.includes('החרש')) ||
        (selectedWarehouse === 'talmid' && order.warehouse?.includes('התלמיד'));

      return matchesSearch && matchesDriver && matchesStatus && matchesCity && matchesCrane && matchesWarehouse;
    });
  }, [orders, searchTerm, selectedDriver, selectedStatus, selectedCity, craneOnly, selectedWarehouse]);

  // Copy 18-column TSV/CSV format for direct paste to Google Sheets Tab 2
  const handleCopyTab2Rows = () => {
    const header = TAB_2_COLUMNS.join('\t');
    const rows = filteredOrders.map((o) => {
      const row = formatOrderToGasTabRow(o);
      return TAB_2_COLUMNS.map((col) => `"${(row[col as keyof GasTabOrderRow] || '').replace(/"/g, '""')}"`).join('\t');
    });

    const fullTsv = [header, ...rows].join('\n');
    navigator.clipboard.writeText(fullTsv);
    setCopiedCsv(true);
    setTimeout(() => setCopiedCsv(false), 2500);
  };

  // Download CSV
  const handleDownloadCsv = () => {
    const header = TAB_2_COLUMNS.join(',');
    const rows = filteredOrders.map((o) => {
      const row = formatOrderToGasTabRow(o);
      return TAB_2_COLUMNS.map((col) => `"${(row[col as keyof GasTabOrderRow] || '').replace(/"/g, '""')}"`).join(',');
    });

    const fullCsv = '\uFEFF' + [header, ...rows].join('\n');
    const blob = new Blob([fullCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `סידור_עבודה_יומי_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const googleSheetUrl = `https://docs.google.com/spreadsheets/d/${CONFIG.spreadsheetId}/edit#gid=0`;

  return (
    <div className="space-y-6 pb-20">
      {/* 📊 TAB 2 GOOGLE SHEETS REALTIME SYNC BANNER */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-slate-900/50 border border-emerald-500/30 p-4 sm:p-5 shadow-2xl backdrop-blur-xl">
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold border border-emerald-500/40">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                טאב 2: סידור_עבודה_יומי (18 עמודות)
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                מחובר בזמן אמת
              </span>
              <span className="text-xs text-slate-400 font-mono">
                סנכרון אחרון: {lastSyncTime}
              </span>
            </div>

            <p className="text-xs text-slate-300">
              כל שינוי סטטוס, שעת אספקה, שיבוץ נהג, משקל, פקדונות או עריכת פרטי הזמנה מסונכרן ישירות לשורות 18 העמודות בטאב 2.
            </p>

            {/* 18-Column Schema Chips */}
            <div className="flex items-center gap-1 text-[10px] text-slate-400 flex-wrap pt-1">
              <span className="font-semibold text-slate-300 ml-1">מבנה 18 עמודות:</span>
              {TAB_2_COLUMNS.map((col, idx) => (
                <span key={col} className="px-1.5 py-0.5 rounded bg-black/40 border border-white/10 font-mono text-slate-300">
                  {idx + 1}. {col}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap flex-shrink-0">
            <button
              onClick={handleSyncTab2}
              disabled={isSyncingSheet}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition active:scale-95 disabled:opacity-50 shadow-sm"
              title="סנכרן מחדש שורות מול טאב סידור_עבודה_יומי"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isSyncingSheet ? 'animate-spin' : ''}`} />
              <span>{isSyncingSheet ? 'מסנכרן טאב 2...' : 'סנכרן טאב 2'}</span>
            </button>

            {onResetSchedule && (
              <button
                onClick={onResetSchedule}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-rose-500/20 text-slate-200 hover:text-rose-300 border border-white/10 hover:border-rose-500/30 text-xs font-semibold transition active:scale-95"
                title="אפס ומחק נתוני דמה ושחזר ל-4 הזמנות רשמיות בלבד"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>שחזר 4 הזמנות</span>
              </button>
            )}

            <button
              onClick={handleCopyTab2Rows}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 border border-white/10 text-xs font-semibold transition active:scale-95"
              title="העתק שורות להדבקה ב-Google Sheets"
            >
              {copiedCsv ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copiedCsv ? 'הועתק ללוח!' : 'העתק ל-Sheets'}</span>
            </button>

            <button
              onClick={handleDownloadCsv}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 border border-white/10 text-xs font-semibold transition active:scale-95"
              title="הורד קובץ CSV של 18 העמודות"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>CSV</span>
            </button>

            <a
              href={googleSheetUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 border border-white/10 text-xs font-semibold transition active:scale-95"
              title="פתח את הגיליון המרכזי ב-Google Sheets"
            >
              <span>פתח גיליון</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>

            <button
              onClick={onOpenNewOrder}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/50 transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>הוסף הזמנה חדשה</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Orders */}
        <div
          onClick={() => { setSelectedStatus('all'); setCraneOnly(false); }}
          className="p-3.5 rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.015] border border-white/[0.08] hover:border-white/[0.18] backdrop-blur-xl cursor-pointer transition shadow-lg"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>סה"כ הזמנות</span>
            <Package className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-extrabold text-white font-mono">{metrics.total}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">סידור עבודה להיום</p>
        </div>

        {/* Pending */}
        <div
          onClick={() => { setSelectedStatus('pending'); setCraneOnly(false); }}
          className={`p-3.5 rounded-2xl bg-amber-950/15 border ${
            selectedStatus === 'pending' ? 'border-amber-400 ring-1 ring-amber-400/30' : 'border-amber-500/30'
          } backdrop-blur-xl cursor-pointer hover:border-amber-400/60 transition shadow-lg`}
        >
          <div className="flex items-center justify-between text-xs text-amber-300 mb-1">
            <span>בסידור עבודה</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-extrabold text-amber-400 font-mono">{metrics.pending}</p>
          <p className="text-[10px] text-amber-400/70 mt-0.5">ממתין לשילוח</p>
        </div>

        {/* Loading */}
        <div
          onClick={() => { setSelectedStatus('loading'); setCraneOnly(false); }}
          className={`p-3.5 rounded-2xl bg-sky-950/15 border ${
            selectedStatus === 'loading' ? 'border-sky-400 ring-1 ring-sky-400/30' : 'border-sky-500/30'
          } backdrop-blur-xl cursor-pointer hover:border-sky-400/60 transition shadow-lg`}
        >
          <div className="flex items-center justify-between text-xs text-sky-300 mb-1">
            <span>בהטענה</span>
            <Layers className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-2xl font-extrabold text-sky-400 font-mono">{metrics.loading}</p>
          <p className="text-[10px] text-sky-400/70 mt-0.5">במחסן חומרי בניין</p>
        </div>

        {/* In Transit */}
        <div
          onClick={() => { setSelectedStatus('in_transit'); setCraneOnly(false); }}
          className={`p-3.5 rounded-2xl bg-indigo-950/15 border ${
            selectedStatus === 'in_transit' ? 'border-indigo-400 ring-1 ring-indigo-400/30' : 'border-indigo-500/30'
          } backdrop-blur-xl cursor-pointer hover:border-indigo-400/60 transition shadow-lg`}
        >
          <div className="flex items-center justify-between text-xs text-indigo-300 mb-1">
            <span>בחלוקה פעילה</span>
            <Truck className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-extrabold text-indigo-400 font-mono">{metrics.inTransit}</p>
          <p className="text-[10px] text-indigo-400/70 mt-0.5">בדרך ללקוח</p>
        </div>

        {/* Delivered */}
        <div
          onClick={() => { setSelectedStatus('delivered'); setCraneOnly(false); }}
          className={`p-3.5 rounded-2xl bg-emerald-950/15 border ${
            selectedStatus === 'delivered' ? 'border-emerald-400 ring-1 ring-emerald-400/30' : 'border-emerald-500/30'
          } backdrop-blur-xl cursor-pointer hover:border-emerald-400/60 transition shadow-lg`}
        >
          <div className="flex items-center justify-between text-xs text-emerald-300 mb-1">
            <span>סופק בהצלחה</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-400 font-mono">{metrics.delivered}</p>
          <p className="text-[10px] text-emerald-400/70 mt-0.5">הושלם באתר</p>
        </div>

        {/* Crane Required */}
        <div
          onClick={() => setCraneOnly(!craneOnly)}
          className={`p-3.5 rounded-2xl bg-amber-950/15 border ${
            craneOnly ? 'border-amber-400 ring-2 ring-amber-400/40' : 'border-amber-500/30'
          } backdrop-blur-xl cursor-pointer hover:border-amber-400 transition shadow-lg`}
        >
          <div className="flex items-center justify-between text-xs text-amber-300 mb-1">
            <span>דורש מנוף</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-extrabold text-amber-300 font-mono">{metrics.crane}</p>
          <p className="text-[10px] text-amber-400/70 mt-0.5">משאית חכמת מנוף</p>
        </div>
      </div>

      {/* Action Strip: Quick AI / Reports / Add Order */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-white/[0.04] via-white/[0.02] to-white/[0.04] border border-white/[0.08] backdrop-blur-xl shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="btn-open-morning-reports"
            onClick={onOpenReports}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>הפקת דוח בוקר לוורד</span>
          </button>

          <button
            id="btn-open-ai-chat"
            onClick={onOpenChat}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition active:scale-95"
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>סייר לוגיסטי AI (סבן)</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
          <span>סה"כ מוצג:</span>
          <span className="font-mono font-bold text-white bg-white/[0.06] px-2 py-0.5 rounded border border-white/10">
            {filteredOrders.length} מתוך {orders.length}
          </span>
        </div>
      </div>

      {/* Filters Bar: Search, Driver, Status, City, Warehouse, View Toggle */}
      <div className="p-3 sm:p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="חיפוש לפי מספר הזמנה, לקוח, עיר, כתובת, מק&quot;ט או פריט..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-9 pl-4 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none transition"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Driver Filter */}
            <select
              value={selectedDriver}
              onChange={(e) => setSelectedDriver(e.target.value)}
              className="bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
            >
              <option value="all">כל הנהגים</option>
              {DRIVERS_LIST.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            {/* City Filter */}
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
            >
              <option value="all">כל הערים ({availableCities.length})</option>
              {availableCities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
            >
              <option value="all">כל הסטטוסים</option>
              {(Object.keys(STATUS_MAP) as OrderStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_MAP[s].label}
                </option>
              ))}
            </select>

            {/* Warehouse Filter */}
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
            >
              <option value="all">כל המחסנים</option>
              <option value="harash">🏭 4️⃣(החרש) - חומרי מליטה</option>
              <option value="talmid">🏟️ 1️⃣(התלמיד) - גבס ואיטום</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-black/60 border border-white/10 rounded-xl p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === 'grid' ? 'bg-white/[0.08] text-emerald-400' : 'text-slate-500 hover:text-slate-300'
                }`}
                title="תצוגת כרטיסים"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === 'table' ? 'bg-white/[0.08] text-emerald-400' : 'text-slate-500 hover:text-slate-300'
                }`}
                title="תצוגת טבלת 18 עמודות"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Orders Grid or Interactive 18-Column Table View */}
      {filteredOrders.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
          <Package className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-300">לא נמצאו הזמנות תואמות לסינון</h3>
          <p className="text-xs text-slate-500">נסה לאפס את הסינונים או להוסיף כרטיס הזמנה חדש</p>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedDriver('all');
              setSelectedCity('all');
              setSelectedStatus('all');
              setSelectedWarehouse('all');
              setCraneOnly(false);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/10 text-xs text-slate-200 border border-white/10"
          >
            נקה סינונים
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onUpdateStatus={onUpdateStatus}
              onUpdateTime={onUpdateTime}
              onEdit={onEditOrder}
              onDelete={onDeleteOrder}
              onSendWhatsApp={onSendWhatsApp}
            />
          ))}
        </div>
      ) : (
        /* Full 18-Column Interactive Table View with Direct Row Editing */
        <div className="overflow-x-auto rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.015] border border-white/[0.08] backdrop-blur-xl shadow-2xl">
          <table className="w-full text-right text-xs text-slate-200 whitespace-nowrap">
            <thead className="bg-black/60 text-slate-400 border-b border-white/[0.08] sticky top-0 z-10 font-mono text-[11px]">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">מספר הזמנה</th>
                <th className="p-3">שם לקוח</th>
                <th className="p-3">מספר לקוח</th>
                <th className="p-3">כתובת אתר / יעד</th>
                <th className="p-3">עיר</th>
                <th className="p-3">מחסן יציאה</th>
                <th className="p-3">נהג משובץ</th>
                <th className="p-3">סוג משאית / מנוף</th>
                <th className="p-3">שעת אספקה</th>
                <th className="p-3">משקל (טון)</th>
                <th className="p-3">פירוט פריטים ומק"טים</th>
                <th className="p-3">בלות פקדון</th>
                <th className="p-3">משטחים פקדון</th>
                <th className="p-3">סטטוס ביצוע</th>
                <th className="p-3">Waze</th>
                <th className="p-3">Drive</th>
                <th className="p-3">זמן עדכון</th>
                <th className="p-3">בדיקה</th>
                <th className="p-3 text-center sticky left-0 bg-black/80 backdrop-blur-md">פעולות ועריכה</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05] font-sans">
              {filteredOrders.map((order, idx) => {
                const st = STATUS_MAP[order.status] || STATUS_MAP.pending;
                const metrics = calculateOrderMetrics(order.items);
                const totalWeightKg = order.totalWeightKg || metrics.totalWeightKg;
                const totalWeightTons = order.totalWeightTons || Number((totalWeightKg / 1000).toFixed(2));
                const city = order.city || extractCityFromDestination(order.destination);
                const warehouse = order.warehouse || metrics.warehouse;
                const bigBags = order.depositBigBags ?? metrics.depositBigBags;
                const pallets = order.depositPallets ?? metrics.depositPallets;
                const truckType = order.truckType || (order.craneRequired || metrics.hasCraneItem ? 'משאית מנוף 24מ\'' : 'משאית רגילה');
                const wazeUrl = order.wazeUrl || `https://waze.com/ul?q=${encodeURIComponent(order.destination)}&navigate=yes`;
                const driveUrl = order.driveFileUrl || order.deliveryNotePdf || `https://drive.google.com/open?id=doc-${order.orderNumber}`;
                const verification = order.verificationCheck || (order.status === 'delivered' ? 'סופק ואושר' : order.craneRequired ? 'תיאום מנוף בוצע' : 'תקין לשיגור');
                const formattedTime = order.updatedAt ? new Date(order.updatedAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : '08:00';

                return (
                  <tr key={order.id} className="hover:bg-white/[0.04] transition group">
                    {/* Row Index */}
                    <td className="p-3 text-slate-500 font-mono text-[11px]">{idx + 1}</td>

                    {/* 1. מספר הזמנה */}
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-cyan-300 bg-white/[0.04] px-2 py-0.5 rounded border border-cyan-500/30">
                          {order.orderNumber}
                        </span>
                        {order.craneRequired && (
                          <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1 py-0.5 rounded border border-amber-500/30 font-bold" title="דורש מנוף">
                            מנוף
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 2. שם לקוח */}
                    <td className="p-3">
                      <p className="font-bold text-white group-hover:text-emerald-300 transition">
                        {order.customerName}
                      </p>
                      {order.customerPhone && (
                        <a
                          href={`tel:${order.customerPhone}`}
                          className="text-[10px] text-slate-400 hover:text-cyan-400 inline-flex items-center gap-1 font-mono mt-0.5"
                        >
                          <Phone className="w-2.5 h-2.5" />
                          <span>{order.customerPhone}</span>
                        </a>
                      )}
                    </td>

                    {/* 3. מספר לקוח */}
                    <td className="p-3 font-mono text-slate-300 text-[11px]">
                      {order.customerNumber || `C-${order.orderNumber}`}
                    </td>

                    {/* 4. כתובת אתר / יעד */}
                    <td className="p-3 max-w-xs truncate" title={order.destination}>
                      <span className="text-slate-200">{order.destination}</span>
                    </td>

                    {/* 5. עיר */}
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-white/[0.04] text-slate-200 border border-white/[0.08] font-medium">
                        {city}
                      </span>
                    </td>

                    {/* 6. מחסן יציאה */}
                    <td className="p-3 text-[11px] font-medium text-amber-300">
                      {warehouse}
                    </td>

                    {/* 7. נהג משובץ (Interactive select) */}
                    <td className="p-3">
                      <select
                        value={order.driver}
                        onChange={(e) => onUpdateTime(order.id, order.deliveryTime, e.target.value)}
                        className="bg-black/60 border border-white/10 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                      >
                        {DRIVERS_LIST.map((d) => (
                          <option key={d} value={d} className="bg-[#0c1017]">
                            {d}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* 8. סוג משאית / מנוף */}
                    <td className="p-3 text-[11px] text-slate-300">
                      {truckType}
                    </td>

                    {/* 9. שעת אספקה (with quick shift) */}
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-400" />
                        <span className="font-mono font-bold text-amber-300">{order.deliveryTime}</span>
                        <div className="flex items-center gap-0.5 mr-1">
                          <button
                            onClick={() => {
                              const [h, m] = order.deliveryTime.split(':').map(Number);
                              let totalMin = Math.max(360, h * 60 + m - 30);
                              const newH = String(Math.floor(totalMin / 60)).padStart(2, '0');
                              const newM = String(totalMin % 60).padStart(2, '0');
                              onUpdateTime(order.id, `${newH}:${newM}`);
                            }}
                            className="px-1 py-0.5 rounded bg-white/[0.06] hover:bg-white/10 text-[9px] text-slate-300 font-mono"
                            title="הקדמה ב-30 דק'"
                          >
                            -30
                          </button>
                          <button
                            onClick={() => {
                              const [h, m] = order.deliveryTime.split(':').map(Number);
                              let totalMin = Math.min(1200, h * 60 + m + 30);
                              const newH = String(Math.floor(totalMin / 60)).padStart(2, '0');
                              const newM = String(totalMin % 60).padStart(2, '0');
                              onUpdateTime(order.id, `${newH}:${newM}`);
                            }}
                            className="px-1 py-0.5 rounded bg-white/[0.06] hover:bg-white/10 text-[9px] text-slate-300 font-mono"
                            title="איחור ב-30 דק'"
                          >
                            +30
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* 10. משקל כולל (טון) */}
                    <td className="p-3 font-mono text-cyan-400 font-bold">
                      {totalWeightTons} טון
                    </td>

                    {/* 11. פירוט פריטים ומק"טים */}
                    <td className="p-3 text-[11px] text-slate-300 max-w-xs truncate" title={order.items.map((i) => `${i.name} (${i.quantity} ${i.unit})`).join(', ')}>
                      {order.items.map((i) => `${i.sku ? `[${i.sku}] ` : ''}${i.name} (${i.quantity})`).join(', ')}
                    </td>

                    {/* 12. בלות פקדון */}
                    <td className="p-3 font-mono text-amber-300">
                      {bigBags > 0 ? `${bigBags} בלות` : '0'}
                    </td>

                    {/* 13. משטחים פקדון */}
                    <td className="p-3 font-mono text-teal-300">
                      {pallets > 0 ? `${pallets} משטחים` : '0'}
                    </td>

                    {/* 14. סטטוס ביצוע (Interactive Select) */}
                    <td className="p-3">
                      <select
                        value={order.status}
                        onChange={(e) => onUpdateStatus(order.id, e.target.value as OrderStatus)}
                        className={`border rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none ${st.bg} ${st.color} ${st.border}`}
                      >
                        {(Object.keys(STATUS_MAP) as OrderStatus[]).map((s) => (
                          <option key={s} value={s} className="bg-[#0c1017] text-white">
                            {STATUS_MAP[s].label}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* 15. קישור Waze */}
                    <td className="p-3">
                      <a
                        href={wazeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 text-[11px]"
                      >
                        <Navigation className="w-3 h-3" />
                        <span>נווט</span>
                      </a>
                    </td>

                    {/* 16. קובץ הזמנה (Drive) */}
                    <td className="p-3">
                      <a
                        href={driveUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 text-[11px]"
                      >
                        <FileText className="w-3 h-3" />
                        <span>Drive</span>
                      </a>
                    </td>

                    {/* 17. זמן עדכון אחרון */}
                    <td className="p-3 text-[11px] text-slate-400 font-mono">
                      {formattedTime}
                    </td>

                    {/* 18. בדיקה */}
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[10px] font-bold">
                        <ShieldCheck className="w-3 h-3" />
                        {verification}
                      </span>
                    </td>

                    {/* Actions Sticky Column */}
                    <td className="p-3 sticky left-0 bg-[#0c1017]/95 backdrop-blur-md border-r border-white/10 shadow-lg">
                      <div className="flex items-center gap-1 justify-center">
                        <button
                          onClick={() => onEditOrder(order)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition active:scale-95"
                          title="ערוך את כל 18 השדות של ההזמנה"
                        >
                          <Edit2 className="w-3 h-3 text-cyan-400" />
                          <span>ערוך</span>
                        </button>

                        <button
                          onClick={() => onSendWhatsApp(order)}
                          className="p-1 rounded-lg bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30"
                          title="שדר וואטסאפ לנהג"
                        >
                          <Send className="w-3 h-3" />
                        </button>

                        <button
                          onClick={() => {
                            if (confirm(`האם למחוק את הזמנה ${order.orderNumber} מהסידור?`)) {
                              onDeleteOrder(order.id);
                            }
                          }}
                          className="p-1 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20"
                          title="מחק הזמנה"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
