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
  MapPin
} from 'lucide-react';
import { OrderItem, OrderStatus, STATUS_MAP, DRIVERS_LIST, CONFIG } from '../types';
import { OrderCard } from './OrderCard';
import { calculateOrderMetrics, formatWeight } from '../utils/logistics';

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
}

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
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDriver, setSelectedDriver] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');
  const [craneOnly, setCraneOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>(
    new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
  );
  const [activeDriverMenuId, setActiveDriverMenuId] = useState<string | null>(null);
  const [activeStatusMenuId, setActiveStatusMenuId] = useState<string | null>(null);

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

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        !searchTerm ||
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.notes && order.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (order.siteContact && order.siteContact.toLowerCase().includes(searchTerm.toLowerCase())) ||
        order.items.some(
          (i) =>
            i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (i.sku && i.sku.includes(searchTerm))
        );

      const matchesDriver = selectedDriver === 'all' || order.driver === selectedDriver;
      const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;
      const matchesCrane = !craneOnly || order.craneRequired;
      const matchesWarehouse =
        selectedWarehouse === 'all' ||
        (selectedWarehouse === 'harash' && order.warehouse?.includes('החרש')) ||
        (selectedWarehouse === 'talmid' && order.warehouse?.includes('התלמיד'));

      return matchesSearch && matchesDriver && matchesStatus && matchesCrane && matchesWarehouse;
    });
  }, [orders, searchTerm, selectedDriver, selectedStatus, craneOnly, selectedWarehouse]);

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
                טאב 2: סידור_עבודה_יומי (Google Sheets)
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
              כל שינוי סטטוס, שעת אספקה, שיבוץ נהג או עריכת פרטי הזמנה מסונכרן ישירות לשורות טאב 2 בגיליון המרכזי.
            </p>

            {/* Column Schema Mapping Tags */}
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-slate-400 flex-wrap pt-1">
              <span className="font-semibold text-slate-300">שדות מסונכרנים:</span>
              {['מזהה_הזמנה', 'שם_לקוח', 'יעד', 'נהג', 'פרטי_פריטים', 'סטטוס', 'שעת_אספקה', 'מנוף_נדרש', 'מקור_מחסן'].map((col) => (
                <span key={col} className="px-1.5 py-0.5 rounded bg-black/40 border border-white/10 font-mono text-slate-300">
                  {col}
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
              <span>הוסף הזמנה לטאב 2</span>
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
            id="btn-ask-noa-ai"
            onClick={onOpenChat}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition active:scale-95"
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>צ׳אט נועה AI (הזרקה לטאב 2)</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-add-new-order-main"
            onClick={onOpenNewOrder}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/50 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>הוסף כרטיס הזמנה לסידור</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl space-y-3 shadow-lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            <input
              type="text"
              placeholder="חיפוש לקוח, יעד, מספר הזמנה, איש קשר או מק״ט חומר..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 bg-black/50 border border-white/10 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute left-3 top-2 text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Driver Filter */}
          <div>
            <select
              value={selectedDriver}
              onChange={(e) => setSelectedDriver(e.target.value)}
              className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="all" className="bg-[#0c1017]">🚚 כל הנהגים והמשאיות</option>
              {DRIVERS_LIST.map((d) => (
                <option key={d} value={d} className="bg-[#0c1017]">
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="all" className="bg-[#0c1017]">📋 כל הסטטוסים</option>
              {(Object.keys(STATUS_MAP) as OrderStatus[]).map((st) => (
                <option key={st} value={st} className="bg-[#0c1017]">
                  {STATUS_MAP[st].label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* View Switcher and Active Filters */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/[0.08]">
          <div className="flex items-center gap-2 flex-wrap">
            <span>מציג {filteredOrders.length} מתוך {orders.length} הזמנות</span>
            {craneOnly && (
              <button
                onClick={() => setCraneOnly(false)}
                className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[11px] flex items-center gap-1"
              >
                <span>רק מנוף</span>
                <span>✕</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/[0.08]">
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
              title="תצוגת טבלה אינטראקטיבית"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Orders Grid or Interactive Table View */}
      {filteredOrders.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
          <Package className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-300">לא נמצאו הזמנות תואמות לסינון</h3>
          <p className="text-xs text-slate-500">נסה לאפס את הסינונים או להוסיף כרטיס הזמנה חדש</p>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedDriver('all');
              setSelectedStatus('all');
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
        /* Dense Interactive Table View with Direct Row Editing */
        <div className="overflow-x-auto rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.015] border border-white/[0.08] backdrop-blur-xl shadow-xl">
          <table className="w-full text-right text-xs text-slate-200">
            <thead className="bg-black/40 text-slate-400 border-b border-white/[0.08]">
              <tr>
                <th className="p-3">מזהה הזמנה</th>
                <th className="p-3">שם לקוח</th>
                <th className="p-3">יעד ואיש קשר</th>
                <th className="p-3">שעת אספקה</th>
                <th className="p-3">שיבוץ נהג</th>
                <th className="p-3">שינוי סטטוס</th>
                <th className="p-3">מחסן / משקל</th>
                <th className="p-3">פרטי פריטים</th>
                <th className="p-3">עריכה ופעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05] font-sans">
              {filteredOrders.map((order) => {
                const st = STATUS_MAP[order.status] || STATUS_MAP.pending;
                const metrics = calculateOrderMetrics(order.items);
                const totalWeight = order.totalWeightKg || metrics.totalWeightKg;
                const warehouse = order.warehouse || metrics.warehouse;
                const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(order.destination)}&navigate=yes`;

                return (
                  <tr key={order.id} className="hover:bg-white/[0.04] transition group">
                    {/* Order ID */}
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-cyan-300 bg-white/[0.04] px-2 py-0.5 rounded border border-cyan-500/30">
                          {order.orderNumber}
                        </span>
                        {order.craneRequired && (
                          <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30 font-bold" title="דורש מנוף">
                            מנוף
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="p-3">
                      <p className="font-bold text-white group-hover:text-emerald-300 transition">
                        {order.customerName}
                      </p>
                      {order.customerPhone && (
                        <a
                          href={`tel:${order.customerPhone}`}
                          className="text-[11px] text-slate-400 hover:text-cyan-400 inline-flex items-center gap-1 font-mono mt-0.5"
                        >
                          <Phone className="w-2.5 h-2.5" />
                          <span>{order.customerPhone}</span>
                        </a>
                      )}
                    </td>

                    {/* Destination & Waze */}
                    <td className="p-3">
                      <div className="flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-rose-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-slate-200 truncate max-w-xs">{order.destination}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                            {order.siteContact && <span>איש קשר: {order.siteContact}</span>}
                            {order.floor && <span>קומה: {order.floor}</span>}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Delivery Time with Quick Shift Buttons */}
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

                    {/* Driver Dropdown (Interactive) */}
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

                    {/* Status Dropdown (Interactive) */}
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

                    {/* Warehouse / Weight */}
                    <td className="p-3">
                      <div className="space-y-0.5 text-[11px]">
                        <span className="text-amber-300 block font-medium">{warehouse}</span>
                        {totalWeight > 0 && (
                          <span className="text-cyan-400 font-mono text-[10px] block">
                            {formatWeight(totalWeight)}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Items */}
                    <td className="p-3 text-[11px] text-slate-300 max-w-xs truncate">
                      {order.items.map((i) => `${i.name} (${i.quantity} ${i.unit})`).join(', ')}
                    </td>

                    {/* Action buttons: Edit, Waze, WhatsApp, Delete */}
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onEditOrder(order)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition active:scale-95"
                          title="ערוך את כל פרטי ההזמנה"
                        >
                          <Edit2 className="w-3 h-3 text-cyan-400" />
                          <span>ערוך</span>
                        </button>

                        <a
                          href={wazeUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20"
                          title="פתח ב-Waze"
                        >
                          <Navigation className="w-3 h-3" />
                        </a>

                        <button
                          onClick={() => onSendWhatsApp(order)}
                          className="p-1 rounded-lg bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30"
                          title="שדר וואטסאפ"
                        >
                          <Send className="w-3 h-3" />
                        </button>

                        <button
                          onClick={() => {
                            if (confirm(`האם למחוק את הזמנה ${order.orderNumber}?`)) {
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
