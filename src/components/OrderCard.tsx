import React, { useState } from 'react';
import {
  Clock,
  MapPin,
  Truck,
  User,
  Package,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Phone,
  Send,
  MoreVertical,
  Edit2,
  Trash2,
  Share2,
  CornerDownLeft,
  Building2,
  Layers,
  Navigation,
  Scale,
  ShieldCheck
} from 'lucide-react';
import { OrderItem, OrderStatus, STATUS_MAP, DRIVERS_LIST } from '../types';
import { calculateOrderMetrics, formatWeight } from '../utils/logistics';

interface OrderCardProps {
  order: OrderItem;
  onUpdateStatus: (id: string, status: OrderStatus) => void;
  onUpdateTime: (id: string, newTime: string, driver?: string) => void;
  onEdit: (order: OrderItem) => void;
  onDelete: (id: string) => void;
  onSendWhatsApp: (order: OrderItem) => void;
}

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  onUpdateStatus,
  onUpdateTime,
  onEdit,
  onDelete,
  onSendWhatsApp,
}) => {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showDriverMenu, setShowDriverMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [tempTime, setTempTime] = useState(order.deliveryTime);

  const statusConfig = STATUS_MAP[order.status] || STATUS_MAP.pending;
  const metrics = calculateOrderMetrics(order.items);
  const totalWeight = order.totalWeightKg || metrics.totalWeightKg;
  const warehouse = order.warehouse || metrics.warehouse;
  const depositDetails = order.depositDetails || metrics.depositDetails;

  const handleQuickShiftTime = (minutes: number) => {
    const [h, m] = order.deliveryTime.split(':').map(Number);
    let totalMin = h * 60 + m + minutes;
    if (totalMin < 360) totalMin = 360; // 06:00 min
    if (totalMin > 1200) totalMin = 1200; // 20:00 max
    const newH = String(Math.floor(totalMin / 60)).padStart(2, '0');
    const newM = String(totalMin % 60).padStart(2, '0');
    const updated = `${newH}:${newM}`;
    onUpdateTime(order.id, updated);
  };

  const handleSaveCustomTime = () => {
    if (tempTime) {
      onUpdateTime(order.id, tempTime);
      setIsEditingTime(false);
    }
  };

  const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(order.destination)}&navigate=yes`;

  return (
    <div
      id={`order-card-${order.id}`}
      className="relative rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.015] border border-white/[0.08] hover:border-white/[0.18] p-4 sm:p-5 shadow-xl shadow-black/40 backdrop-blur-xl transition-all duration-200 group"
    >
      {/* Top Row: Order ID, Status Badge & More Actions */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-white/[0.05] text-cyan-300 border border-cyan-500/30">
            {order.orderNumber}
          </span>

          {order.craneRequired && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30">
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              דורש מנוף
            </span>
          )}

          {order.city && (
            <span className="text-[11px] text-cyan-300 bg-cyan-950/30 px-2 py-0.5 rounded border border-cyan-500/30 font-medium">
              {order.city}
            </span>
          )}

          {warehouse && (
            <span className="text-[11px] text-amber-300 bg-amber-950/30 px-2 py-0.5 rounded border border-amber-500/30 font-medium">
              {warehouse}
            </span>
          )}

          {order.floor && (
            <span className="text-[11px] text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.08]">
              {order.floor}
            </span>
          )}
        </div>

        {/* Status Dropdown Trigger */}
        <div className="flex items-center gap-1.5 relative">
          <button
            onClick={() => setShowStatusMenu(!showStatusMenu)}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border transition active:scale-95 ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}
          >
            <span className={`w-2 h-2 rounded-full ${statusConfig.dot}`} />
            <span>{statusConfig.label}</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-70" />
          </button>

          {/* Status Select Menu */}
          {showStatusMenu && (
            <div className="absolute left-0 top-8 z-20 w-44 rounded-xl bg-[#0c1017] border border-white/15 shadow-2xl p-1.5 space-y-1 backdrop-blur-2xl">
              {(Object.keys(STATUS_MAP) as OrderStatus[]).map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    onUpdateStatus(order.id, st);
                    setShowStatusMenu(false);
                  }}
                  className={`w-full text-right px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition hover:bg-white/[0.08] ${
                    order.status === st ? 'bg-white/[0.08] text-white font-bold' : 'text-slate-300'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${STATUS_MAP[st].dot}`} />
                    {STATUS_MAP[st].label}
                  </span>
                  {order.status === st && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                </button>
              ))}
            </div>
          )}

          {/* More options button */}
          <div className="relative">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition"
              title="פעולות נוספות"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMoreMenu && (
              <div className="absolute left-0 top-8 z-20 w-36 rounded-xl bg-[#0c1017] border border-white/15 shadow-2xl p-1 space-y-0.5 backdrop-blur-2xl">
                <button
                  onClick={() => {
                    onEdit(order);
                    setShowMoreMenu(false);
                  }}
                  className="w-full text-right px-2.5 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-white/[0.08] flex items-center gap-2"
                >
                  <Edit2 className="w-3.5 h-3.5 text-cyan-400" />
                  ערוך הזמנה
                </button>
                <button
                  onClick={() => {
                    onSendWhatsApp(order);
                    setShowMoreMenu(false);
                  }}
                  className="w-full text-right px-2.5 py-1.5 rounded-lg text-xs text-emerald-300 hover:text-emerald-200 hover:bg-emerald-950/40 flex items-center gap-2"
                >
                  <Send className="w-3.5 h-3.5 text-emerald-400" />
                  שלח לוואטסאפ
                </button>
                <button
                  onClick={() => {
                    if (confirm(`האם למחוק את הזמנה ${order.orderNumber}?`)) {
                      onDelete(order.id);
                    }
                    setShowMoreMenu(false);
                  }}
                  className="w-full text-right px-2.5 py-1.5 rounded-lg text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 flex items-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  מחק הזמנה
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Customer Name & Weight Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-base font-bold text-slate-100 group-hover:text-emerald-300 transition flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="truncate">{order.customerName}</span>
          </h3>
          {order.customerPhone && (
            <a
              href={`tel:${order.customerPhone}`}
              className="text-xs text-slate-400 hover:text-cyan-400 inline-flex items-center gap-1 mt-0.5"
            >
              <Phone className="w-3 h-3 text-cyan-400" />
              <span className="font-mono">{order.customerPhone}</span>
            </a>
          )}
        </div>

        {totalWeight > 0 && (
          <div className="text-left">
            <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded-lg border border-cyan-500/30">
              <Scale className="w-3 h-3 text-cyan-400" />
              {formatWeight(totalWeight)}
            </span>
          </div>
        )}
      </div>

      {/* Destination / Address with Waze Navigation Link */}
      <div className="flex items-start justify-between gap-2 text-xs text-slate-300 bg-black/40 p-2.5 rounded-xl border border-white/[0.06] mb-3">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <MapPin className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-slate-200">{order.destination}</p>
            {order.siteContact && (
              <p className="text-[11px] text-slate-400 mt-0.5">
                איש קשר: <span className="text-slate-300 font-medium">{order.siteContact}</span>
                {order.sitePhone && ` (${order.sitePhone})`}
              </p>
            )}
          </div>
        </div>

        <a
          href={wazeUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold transition active:scale-95 flex-shrink-0"
          title="פתח ניווט ישיר ב-Waze"
        >
          <Navigation className="w-3 h-3 text-cyan-400" />
          <span>Waze</span>
        </a>
      </div>

      {/* Driver & Delivery Time (Interactive Timeline Controls) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
        {/* Driver Selector */}
        <div className="relative">
          <button
            onClick={() => setShowDriverMenu(!showDriverMenu)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 hover:border-white/20 text-xs text-slate-200 transition"
          >
            <span className="flex items-center gap-1.5 truncate">
              <Truck className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
              <span className="truncate font-medium">{order.driver || 'שבץ נהג'}</span>
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showDriverMenu && (
            <div className="absolute right-0 top-10 z-20 w-48 rounded-xl bg-[#0c1017] border border-white/15 shadow-2xl p-1 space-y-1 backdrop-blur-2xl">
              {DRIVERS_LIST.map((drv) => (
                <button
                  key={drv}
                  onClick={() => {
                    onUpdateTime(order.id, order.deliveryTime, drv);
                    setShowDriverMenu(false);
                  }}
                  className={`w-full text-right px-2.5 py-1.5 rounded-lg text-xs transition hover:bg-white/[0.08] ${
                    order.driver === drv ? 'bg-white/[0.08] text-emerald-400 font-bold' : 'text-slate-300'
                  }`}
                >
                  {drv}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Delivery Time with Quick Shift Buttons */}
        <div className="flex items-center justify-between gap-1 px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs">
          <div className="flex items-center gap-1 text-slate-300">
            <Clock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            {isEditingTime ? (
              <div className="flex items-center gap-1">
                <input
                  type="time"
                  value={tempTime}
                  onChange={(e) => setTempTime(e.target.value)}
                  className="bg-black/60 text-amber-300 font-mono text-xs px-1.5 py-0.5 rounded border border-amber-500/50 outline-none w-20"
                />
                <button
                  onClick={handleSaveCustomTime}
                  className="px-1.5 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold"
                >
                  שמור
                </button>
              </div>
            ) : (
              <span
                onClick={() => setIsEditingTime(true)}
                className="font-mono font-bold text-amber-300 cursor-pointer hover:underline"
                title="לחץ לעריכת שעה ידנית"
              >
                {order.deliveryTime}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => handleQuickShiftTime(-30)}
              className="px-1.5 py-0.5 rounded bg-white/[0.08] hover:bg-white/[0.14] text-[10px] text-slate-200 font-mono"
              title="הקדמה ב-30 דק'"
            >
              -30
            </button>
            <button
              onClick={() => handleQuickShiftTime(30)}
              className="px-1.5 py-0.5 rounded bg-white/[0.08] hover:bg-white/[0.14] text-[10px] text-slate-200 font-mono"
              title="איחור ב-30 דק'"
            >
              +30
            </button>
          </div>
        </div>
      </div>

      {/* Items List */}
      <div className="space-y-1.5 mb-3 bg-black/40 p-2.5 rounded-xl border border-white/[0.06]">
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold mb-1">
          <span className="flex items-center gap-1">
            <Package className="w-3 h-3 text-emerald-400" />
            פירוט חומרים ({order.items.length}):
          </span>
          {depositDetails && depositDetails !== 'ללא פקדון' && (
            <span className="text-[10px] text-amber-300 font-medium">
              פקדון: {depositDetails}
            </span>
          )}
        </div>

        <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
          {order.items.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between text-xs text-slate-200 bg-white/[0.02] px-2 py-1 rounded border border-white/[0.05]"
            >
              <span className="truncate flex-1 pl-2">{item.name}</span>
              <span className="font-mono text-emerald-400 font-semibold whitespace-nowrap">
                {item.quantity} {item.unit}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Order Notes */}
      {order.notes && (
        <div className="text-[11px] text-amber-200/90 bg-amber-950/20 border border-amber-500/30 p-2 rounded-lg mb-3">
          <span className="font-semibold text-amber-300">הערה: </span>
          {order.notes}
        </div>
      )}

      {/* Footer Actions: Edit Order, WhatsApp dispatch & Time */}
      <div className="flex items-center justify-between pt-3 border-t border-white/[0.08] gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>טאב 2 מסונכרן</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onEdit(order)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition active:scale-95 shadow-sm"
            title="ערוך את כל פרטי ההזמנה, פריטים, יעד ושעה"
          >
            <Edit2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>ערוך פרטים</span>
          </button>

          <button
            onClick={() => onSendWhatsApp(order)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition active:scale-95"
            title="שדר עדכון בוואטסאפ לוורד או לקוח"
          >
            <Send className="w-3 h-3 text-emerald-400" />
            <span>שדר בוואטסאפ</span>
          </button>
        </div>
      </div>
    </div>
  );
};
