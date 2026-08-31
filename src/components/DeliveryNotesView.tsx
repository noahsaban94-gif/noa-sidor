import React, { useState } from 'react';
import {
  FileText,
  Download,
  CheckCircle2,
  Clock,
  Search,
  ExternalLink,
  ShieldCheck,
  Send,
  Eye,
  Check,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { OrderItem, CONFIG } from '../types';

interface DeliveryNotesViewProps {
  orders: OrderItem[];
  onUpdateOrder: (order: Partial<OrderItem>) => void;
  onSendWhatsApp: (order: OrderItem) => void;
}

export const DeliveryNotesView: React.FC<DeliveryNotesViewProps> = ({
  orders,
  onUpdateOrder,
  onSendWhatsApp,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSync, setFilterSync] = useState<'all' | 'synced' | 'pending'>('all');
  const [selectedNote, setSelectedNote] = useState<OrderItem | null>(null);

  const notesList = orders.filter((o) => {
    const matchesSearch =
      !searchTerm ||
      o.orderNumber.includes(searchTerm) ||
      o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.destination.toLowerCase().includes(searchTerm.toLowerCase());

    const isSynced = o.syncStatus || !!o.customerSignature;
    const matchesSync =
      filterSync === 'all' ||
      (filterSync === 'synced' && isSynced) ||
      (filterSync === 'pending' && !isSynced);

    return matchesSearch && matchesSync;
  });

  const handleSimulateSign = (order: OrderItem) => {
    const signatureSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40"><path d="M10 20 Q 30 5, 60 25 T 110 15" stroke="%2310b981" stroke-width="3" fill="none"/></svg>`;
    onUpdateOrder({
      id: order.id,
      customerSignature: signatureSvg,
      syncStatus: true,
      status: 'delivered',
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20">
      {/* Header */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-white/[0.04] via-white/[0.02] to-white/[0.04] border border-white/[0.08] backdrop-blur-xl flex flex-wrap items-center justify-between gap-3 shadow-xl">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            <span>תעודות משלוח חתומות וסנכרון PDF</span>
          </h2>
          <p className="text-xs text-slate-400">
            מעקב אחר תעודות משלוח דיגיטליות, חתימות לקוח וסנכרון מול Google Sheets
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1.5 rounded-xl bg-black/50 text-emerald-300 font-mono border border-emerald-500/30">
            {orders.filter((o) => o.syncStatus || o.customerSignature).length} מתוך {orders.length} חתומות
          </span>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="p-4 rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.015] border border-white/[0.08] backdrop-blur-xl grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
          <input
            type="text"
            placeholder="חיפוש לפי מספר הזמנה, שם לקוח או יעד..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10 pl-4 py-2 bg-black/60 border border-white/10 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition"
          />
        </div>

        <div>
          <select
            value={filterSync}
            onChange={(e) => setFilterSync(e.target.value as any)}
            className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition"
          >
            <option value="all" className="bg-[#0c1017]">📋 כל התעודות</option>
            <option value="synced" className="bg-[#0c1017]">✅ חתומות ומסונכרנות</option>
            <option value="pending" className="bg-[#0c1017]">⏳ ממתינות לחתימת לקוח</option>
          </select>
        </div>
      </div>

      {/* Delivery Notes Table */}
      <div className="overflow-x-auto rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.015] border border-white/[0.08] backdrop-blur-xl shadow-xl">
        <table className="w-full text-right text-xs text-slate-200">
          <thead className="bg-black/40 text-slate-400 border-b border-white/[0.08]">
            <tr>
              <th className="p-3.5">מס' תעודה / הזמנה</th>
              <th className="p-3.5">שם לקוח ויעד</th>
              <th className="p-3.5">נהג מוביל</th>
              <th className="p-3.5">חתימת לקוח</th>
              <th className="p-3.5">סנכרון PDF</th>
              <th className="p-3.5">פעולות</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {notesList.map((order) => {
              const isSigned = !!order.customerSignature;
              const isSynced = order.syncStatus || isSigned;

              return (
                <tr key={order.id} className="hover:bg-white/[0.03] transition">
                  <td className="p-3.5 font-mono font-bold text-cyan-300">
                    {order.orderNumber}
                  </td>
                  <td className="p-3.5">
                    <p className="font-semibold text-white">{order.customerName}</p>
                    <p className="text-[11px] text-slate-400">{order.destination}</p>
                  </td>
                  <td className="p-3.5 text-slate-300">
                    {order.driver}
                  </td>
                  <td className="p-3.5">
                    {isSigned ? (
                      <div className="flex items-center gap-2">
                        <img
                          src={order.customerSignature}
                          alt="חתימה"
                          className="h-7 w-20 object-contain bg-white/5 rounded border border-emerald-500/30 p-0.5"
                        />
                        <span className="text-[10px] text-emerald-400 font-semibold">נחתם</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleSimulateSign(order)}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[11px] font-semibold transition active:scale-95"
                      >
                        חתום דיגיטלית
                      </button>
                    )}
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                        isSynced
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isSynced ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                      {isSynced ? 'מסונכרן ל-Sheets' : 'ממתין לסנכרון'}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedNote(order)}
                        className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/10 text-cyan-300 border border-white/10 transition"
                        title="צפה בתעודת משלוח"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onSendWhatsApp(order)}
                        className="p-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition"
                        title="שדר לוואטסאפ"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Note Preview Modal */}
      {selectedNote && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b0f19] border border-white/15 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">
                  תעודת משלוח #{selectedNote.orderNumber}
                </h3>
              </div>
              <button
                onClick={() => setSelectedNote(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs bg-black/40 p-4 rounded-xl border border-white/10 font-mono">
              <p><span className="text-slate-400">לקוח:</span> {selectedNote.customerName}</p>
              <p><span className="text-slate-400">יעד:</span> {selectedNote.destination}</p>
              <p><span className="text-slate-400">שעת אספקה:</span> {selectedNote.deliveryTime}</p>
              <p><span className="text-slate-400">נהג משבץ:</span> {selectedNote.driver}</p>
              <div className="pt-2 border-t border-white/10">
                <p className="text-slate-400 mb-1 font-sans font-semibold">פירוט חומרים שנמסרו:</p>
                {selectedNote.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between py-0.5 text-slate-200">
                    <span>{it.name}</span>
                    <span className="text-emerald-400 font-bold">{it.quantity} {it.unit}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                {selectedNote.customerSignature ? (
                  <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> חתום דיגיטלית
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      handleSimulateSign(selectedNote);
                      setSelectedNote(null);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                  >
                    אשר וחתוֹם כעת
                  </button>
                )}
              </div>

              <button
                onClick={() => setSelectedNote(null)}
                className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs text-slate-200 font-bold"
              >
                סגור
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
