import React, { useState, useMemo } from 'react';
import {
  Clock,
  Truck,
  Calendar,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  ArrowUpDown,
  Layers,
  MapPin,
  Send,
  Plus
} from 'lucide-react';
import { OrderItem, OrderStatus, STATUS_MAP, DRIVERS_LIST } from '../types';

interface TimelineViewProps {
  orders: OrderItem[];
  onUpdateTime: (id: string, newTime: string, driver?: string) => void;
  onUpdateStatus: (id: string, status: OrderStatus) => void;
  onEditOrder: (order: OrderItem) => void;
  onSendWhatsApp: (order: OrderItem) => void;
  onOpenNewOrder: () => void;
}

const TIME_SLOTS = [
  '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00'
];

export const TimelineView: React.FC<TimelineViewProps> = ({
  orders,
  onUpdateTime,
  onUpdateStatus,
  onEditOrder,
  onSendWhatsApp,
  onOpenNewOrder,
}) => {
  const [selectedDriverLane, setSelectedDriverLane] = useState<string>('all');
  const [draggedOrderId, setDraggedOrderId] = useState<string | null>(null);

  // Group orders by time
  const timeSlotMap = useMemo(() => {
    const map: Record<string, OrderItem[]> = {};
    TIME_SLOTS.forEach((slot) => {
      map[slot] = [];
    });

    orders.forEach((order) => {
      if (selectedDriverLane === 'all' || order.driver === selectedDriverLane) {
        // Find closest or exact slot
        const exact = TIME_SLOTS.find((s) => s === order.deliveryTime);
        const slotKey = exact || order.deliveryTime;
        if (!map[slotKey]) map[slotKey] = [];
        map[slotKey].push(order);
      }
    });

    return map;
  }, [orders, selectedDriverLane]);

  // Check for driver time conflicts
  const conflicts = useMemo(() => {
    const conflictList: { slot: string; driver: string; count: number }[] = [];
    (Object.entries(timeSlotMap) as [string, OrderItem[]][]).forEach(([slot, slotOrders]) => {
      const driverCounts: Record<string, number> = {};
      slotOrders.forEach((o: OrderItem) => {
        driverCounts[o.driver] = (driverCounts[o.driver] || 0) + 1;
      });
      Object.entries(driverCounts).forEach(([driver, count]) => {
        if (count > 1 && driver !== 'ללא שיבוץ') {
          conflictList.push({ slot, driver, count });
        }
      });
    });
    return conflictList;
  }, [timeSlotMap]);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedOrderId(id);
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetSlot: string) => {
    e.preventDefault();
    const orderId = draggedOrderId || e.dataTransfer.getData('text/plain');
    if (orderId) {
      onUpdateTime(orderId, targetSlot);
      setDraggedOrderId(null);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header Controls */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-white/[0.04] via-white/[0.02] to-white/[0.04] border border-white/[0.08] backdrop-blur-xl shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            <span>ציר שעות אינטראקטיבי (Timeline)</span>
          </h2>
          <p className="text-xs text-slate-400">
            גרור כרטיס הזמנה או השתמש בכפתורי ההזזה כדי לקבוע שעת אספקה מדויקת
          </p>
        </div>

        {/* Driver Lane Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-xs text-slate-400">נתיב משאיות:</label>
          <select
            value={selectedDriverLane}
            onChange={(e) => setSelectedDriverLane(e.target.value)}
            className="px-3 py-1.5 bg-black/50 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="all" className="bg-[#0c1017]">🌐 כל הנהגים במקביל</option>
            {DRIVERS_LIST.map((drv) => (
              <option key={drv} value={drv} className="bg-[#0c1017]">
                🚚 {drv}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Conflicts Alert Banner */}
      {conflicts.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-rose-950/20 border border-rose-500/40 flex items-center gap-3 text-xs text-rose-300 backdrop-blur-xl">
          <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 animate-bounce" />
          <div>
            <span className="font-bold">זוהו חפיפות זמנים באותו נהג: </span>
            {conflicts.map((c, i) => (
              <span key={i} className="mr-2 underline">
                שעה {c.slot} ({c.driver} - {c.count} הזמנות)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Interactive Timeline Grid */}
      <div className="space-y-3">
        {TIME_SLOTS.map((slot) => {
          const slotOrders = timeSlotMap[slot] || [];
          const isOccupied = slotOrders.length > 0;

          return (
            <div
              key={slot}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, slot)}
              className={`rounded-2xl border transition-all duration-150 p-3 sm:p-4 flex flex-col md:flex-row md:items-center gap-3 backdrop-blur-xl ${
                isOccupied
                  ? 'bg-gradient-to-b from-white/[0.04] to-white/[0.015] border-white/[0.12] shadow-md'
                  : 'bg-white/[0.015] border-white/[0.06] hover:border-white/10 hover:bg-white/[0.03]'
              }`}
            >
              {/* Left: Time Label */}
              <div className="flex items-center justify-between md:justify-start md:w-36 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      isOccupied ? 'bg-amber-400 shadow-sm shadow-amber-400/50' : 'bg-white/20'
                    }`}
                  />
                  <span className="font-mono text-base font-extrabold text-amber-300">{slot}</span>
                </div>
                <span className="text-[11px] text-slate-500 md:hidden">
                  {slotOrders.length > 0 ? `${slotOrders.length} הזמנות` : 'פנוי'}
                </span>
              </div>

              {/* Center / Right: Order Cards inside Slot */}
              <div className="flex-1 flex flex-wrap gap-2.5 min-h-[44px] items-center">
                {slotOrders.length === 0 ? (
                  <div className="text-xs text-slate-500 italic py-1">
                    סלוט פנוי — גרור הזמנה לכאן לקביעת שעה {slot}
                  </div>
                ) : (
                  slotOrders.map((order) => {
                    const st = STATUS_MAP[order.status] || STATUS_MAP.pending;
                    return (
                      <div
                        key={order.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, order.id)}
                        className={`flex-1 min-w-[280px] max-w-xl p-3 rounded-xl bg-black/60 border ${st.border} shadow-lg cursor-grab active:cursor-grabbing hover:border-white/30 transition space-y-2 backdrop-blur-xl`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="font-mono text-[11px] font-bold text-cyan-300 bg-white/[0.06] px-1.5 py-0.5 rounded border border-white/10">
                              {order.orderNumber}
                            </span>
                            <span className="font-bold text-xs text-white truncate">
                              {order.customerName}
                            </span>
                          </div>

                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${st.bg} ${st.color}`}>
                            {st.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-slate-300">
                          <MapPin className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                          <span className="truncate">{order.destination}</span>
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1 border-t border-white/[0.08]">
                          <span className="flex items-center gap-1 text-slate-300">
                            <Truck className="w-3.5 h-3.5 text-cyan-400" />
                            <span className="font-medium text-[11px]">{order.driver}</span>
                            {order.craneRequired && (
                              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1 rounded font-bold border border-amber-500/30">
                                מנוף
                              </span>
                            )}
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => onSendWhatsApp(order)}
                              className="px-2 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 rounded text-[10px] font-bold border border-emerald-500/30 transition"
                            >
                              וואטסאפ
                            </button>
                            <button
                              onClick={() => onEditOrder(order)}
                              className="px-2 py-1 bg-white/[0.06] hover:bg-white/10 text-slate-300 rounded text-[10px] border border-white/10 transition"
                            >
                              ערוך
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
