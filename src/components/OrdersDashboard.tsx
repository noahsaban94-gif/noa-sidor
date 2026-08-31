import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
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
  Send
} from 'lucide-react';
import { OrderItem, OrderStatus, STATUS_MAP, DRIVERS_LIST } from '../types';
import { OrderCard } from './OrderCard';

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
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDriver, setSelectedDriver] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [craneOnly, setCraneOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

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
        order.items.some((i) => i.name.toLowerCase().includes(searchTerm.toLowerCase()) || (i.sku && i.sku.includes(searchTerm)));

      const matchesDriver = selectedDriver === 'all' || order.driver === selectedDriver;
      const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;
      const matchesCrane = !craneOnly || order.craneRequired;

      return matchesSearch && matchesDriver && matchesStatus && matchesCrane;
    });
  }, [orders, searchTerm, selectedDriver, selectedStatus, craneOnly]);

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner & KPI Row */}
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
            <span>התייעץ עם נועה AI על הסידור</span>
          </button>
        </div>

        <button
          id="btn-add-new-order-main"
          onClick={onOpenNewOrder}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/50 transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>הוסף כרטיס הזמנה חדש</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl space-y-3 shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            <input
              type="text"
              placeholder="חיפוש לקוח, יעד, מספר הזמנה, או מק״ט חומר..."
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
          <div className="flex items-center gap-2">
            <span>מציג {filteredOrders.length} מתוך {orders.length} הזמנות</span>
            {craneOnly && (
              <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[11px]">
                רק מנוף ✕
              </span>
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
              title="תצוגת טבלה צפופה"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Orders Grid or Dense List */}
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
        /* Dense Table View */
        <div className="overflow-x-auto rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.015] border border-white/[0.08] backdrop-blur-xl shadow-xl">
          <table className="w-full text-right text-xs text-slate-200">
            <thead className="bg-black/40 text-slate-400 border-b border-white/[0.08]">
              <tr>
                <th className="p-3">מס׳</th>
                <th className="p-3">לקוח</th>
                <th className="p-3">יעד ואיש קשר</th>
                <th className="p-3">שעה</th>
                <th className="p-3">נהג</th>
                <th className="p-3">סטטוס</th>
                <th className="p-3">פריטים</th>
                <th className="p-3">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05] font-sans">
              {filteredOrders.map((order) => {
                const st = STATUS_MAP[order.status] || STATUS_MAP.pending;
                return (
                  <tr key={order.id} className="hover:bg-white/[0.04] transition">
                    <td className="p-3 font-mono font-bold text-cyan-300">{order.orderNumber}</td>
                    <td className="p-3 font-semibold text-white">{order.customerName}</td>
                    <td className="p-3">
                      <p className="truncate max-w-xs">{order.destination}</p>
                      {order.floor && <span className="text-[10px] text-slate-500">{order.floor}</span>}
                    </td>
                    <td className="p-3 font-mono font-bold text-amber-300">{order.deliveryTime}</td>
                    <td className="p-3">
                      <span className="font-medium text-slate-300">{order.driver}</span>
                      {order.craneRequired && (
                        <span className="mr-1 text-[10px] text-amber-400 font-bold bg-amber-500/10 px-1 py-0.5 rounded">
                          מנוף
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${st.bg} ${st.color} ${st.border}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                        {st.label}
                      </span>
                    </td>
                    <td className="p-3 text-[11px] text-slate-400 max-w-xs truncate">
                      {order.items.map((i) => `${i.name} (${i.quantity})`).join(', ')}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onSendWhatsApp(order)}
                          className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30"
                          title="שדר וואטסאפ"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onEditOrder(order)}
                          className="p-1.5 rounded-lg bg-white/[0.06] text-slate-300 hover:bg-white/10 border border-white/10"
                          title="ערוך"
                        >
                          ✎
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
