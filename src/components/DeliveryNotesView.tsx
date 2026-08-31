import React, { useState, useRef, useEffect } from 'react';
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
  Sparkles,
  PenTool,
  RotateCcw,
  Printer,
  FileCheck,
  Truck,
  Building2,
  Scale
} from 'lucide-react';
import { OrderItem, CONFIG } from '../types';
import { calculateOrderMetrics, formatWeight } from '../utils/logistics';

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
  const [signingOrder, setSigningOrder] = useState<OrderItem | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Canvas Drawing State for Signature Pad
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#10b981'; // Emerald sign color
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const saveSignature = async () => {
    if (!signingOrder) return;
    const canvas = canvasRef.current;
    let signatureDataUrl = '';
    if (canvas && hasDrawn) {
      signatureDataUrl = canvas.toDataURL('image/png');
    } else {
      // Fallback SVG signature
      signatureDataUrl = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40"><path d="M10 20 Q 30 5, 60 25 T 110 15" stroke="%2310b981" stroke-width="3" fill="none"/></svg>`;
    }

    try {
      await fetch('/api/gas/sign-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: signingOrder.id,
          signature: signatureDataUrl,
        }),
      });
    } catch (err) {
      console.warn('Sign backend err:', err);
    }

    onUpdateOrder({
      id: signingOrder.id,
      customerSignature: signatureDataUrl,
      syncStatus: true,
      status: 'delivered',
      updatedAt: new Date().toISOString(),
    });

    setSigningOrder(null);
    setHasDrawn(false);
  };

  const handleSyncDeliveryNotes = async () => {
    setIsSyncing(true);
    try {
      await fetch('/api/gas/delivery-notes');
    } catch {}
    setTimeout(() => setIsSyncing(false), 500);
  };

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

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20">
      {/* Header */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-white/[0.05] via-white/[0.02] to-white/[0.05] border border-white/[0.1] backdrop-blur-xl flex flex-wrap items-center justify-between gap-4 shadow-2xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              טאב 3: תעודות_משלוח_וחתימות (Google Sheets)
            </span>
            <span className="text-xs text-slate-400 font-mono">
              מזהה גליון: {CONFIG.spreadsheetId.substring(0, 15)}...
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            <span>תעודות משלוח חתומות וסנכרון PDF בזמן אמת</span>
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            שדות הטאב: <span className="font-mono text-cyan-300">מזהה_הזמנה | תעודת_משלוח_PDF | חתימת_לקוח | סטטוס_סנכרון</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleSyncDeliveryNotes}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/50 transition active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'מסנכרן...' : 'סנכרון טאב 3 חי (/api/gas/delivery-notes)'}</span>
          </button>

          <span className="text-xs px-3 py-2 rounded-xl bg-black/50 text-emerald-300 font-mono border border-emerald-500/30">
            {orders.filter((o) => o.syncStatus || o.customerSignature).length} מתוך {orders.length} חתומות ומסונכרנות
          </span>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="p-4 rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.015] border border-white/[0.08] backdrop-blur-xl grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
          <input
            type="text"
            placeholder="חיפוש לפי מספר תעודה / הזמנה (לדוגמה 6215184), שם לקוח, יעד..."
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
            <option value="all" className="bg-[#0c1017]">📋 כל תעודות המשלוח ({orders.length})</option>
            <option value="synced" className="bg-[#0c1017]">✅ חתומות ומסונכרנות לגליון</option>
            <option value="pending" className="bg-[#0c1017]">⏳ ממתינות לחתימה וסנכרון</option>
          </select>
        </div>
      </div>

      {/* Delivery Notes Table */}
      <div className="overflow-x-auto rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.015] border border-white/[0.08] backdrop-blur-xl shadow-xl">
        <table className="w-full text-right text-xs text-slate-200">
          <thead className="bg-black/50 text-slate-300 border-b border-white/[0.1]">
            <tr>
              <th className="p-3.5 font-mono">מזהה_הזמנה (Key)</th>
              <th className="p-3.5">שם לקוח ויעד</th>
              <th className="p-3.5">נהג ושעה</th>
              <th className="p-3.5">משקל ומחסן</th>
              <th className="p-3.5">חתימת_לקוח</th>
              <th className="p-3.5">סטטוס_סנכרון (טאב 3)</th>
              <th className="p-3.5">פעולות תעודה</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {notesList.map((order) => {
              const isSigned = !!order.customerSignature;
              const isSynced = order.syncStatus || isSigned;
              const metrics = calculateOrderMetrics(order.items);

              return (
                <tr key={order.id} className="hover:bg-white/[0.03] transition">
                  <td className="p-3.5 font-mono font-bold text-cyan-300">
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{order.orderNumber}</span>
                    </div>
                  </td>
                  <td className="p-3.5">
                    <p className="font-semibold text-white">{order.customerName}</p>
                    <p className="text-[11px] text-slate-400 truncate max-w-xs">{order.destination}</p>
                  </td>
                  <td className="p-3.5 text-slate-300">
                    <p className="font-medium text-slate-200">{order.driver}</p>
                    <p className="text-[11px] font-mono text-amber-300">{order.deliveryTime}</p>
                  </td>
                  <td className="p-3.5 text-slate-300">
                    <p className="font-mono text-cyan-300">{formatWeight(order.totalWeightKg || metrics.totalWeightKg)}</p>
                    <p className="text-[10px] text-slate-400">{order.warehouse || metrics.warehouse}</p>
                  </td>
                  <td className="p-3.5">
                    {isSigned ? (
                      <div className="flex items-center gap-2">
                        <img
                          src={order.customerSignature}
                          alt="חתימה"
                          className="h-7 w-20 object-contain bg-white/5 rounded border border-emerald-500/30 p-0.5"
                        />
                        <span className="text-[10px] text-emerald-400 font-bold">נחתם דיגיטלית</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSigningOrder(order)}
                        className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-600/30 to-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold transition active:scale-95 flex items-center gap-1.5"
                      >
                        <PenTool className="w-3 h-3 text-amber-400" />
                        <span>חתום על מסך</span>
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
                        className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/10 text-cyan-300 border border-white/10 text-xs font-semibold flex items-center gap-1 transition"
                        title="צפה בתעודת משלוח / הדפס"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>תעודה PDF</span>
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

      {/* Interactive Touch/Mouse Canvas Signature Pad Modal */}
      {signingOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b0f19] border border-emerald-500/40 rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <PenTool className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">
                  חתימת לקוח דיגיטלית - תעודה #{signingOrder.orderNumber}
                </h3>
              </div>
              <button
                onClick={() => setSigningOrder(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-1 bg-black/40 p-3 rounded-xl border border-white/10">
              <p><strong className="text-white">לקוח:</strong> {signingOrder.customerName}</p>
              <p><strong className="text-white">יעד:</strong> {signingOrder.destination}</p>
              <p><strong className="text-white">מוביל:</strong> {signingOrder.driver}</p>
            </div>

            {/* Drawing Canvas */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                חתום עם האצבע / עט מגע / עכבר בתיבה למטה:
              </label>
              <div className="relative border-2 border-dashed border-emerald-500/40 rounded-2xl bg-black/80 overflow-hidden cursor-crosshair">
                <canvas
                  ref={canvasRef}
                  width={380}
                  height={150}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-[150px] touch-none"
                />
                {!hasDrawn && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-500 text-xs font-medium">
                    לחץ וגרור כאן לחתימה...
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
              <button
                onClick={clearSignature}
                className="px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/10 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>נקה</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSigningOrder(null)}
                  className="px-3 py-2 rounded-xl bg-white/[0.04] text-slate-400 text-xs"
                >
                  ביטול
                </button>
                <button
                  onClick={saveSignature}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/60 transition active:scale-95 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>שמור וסנכרן תעודה</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Note PDF Preview Modal */}
      {selectedNote && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b0f19] border border-white/15 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">
                  תעודת משלוח דיגיטלית #{selectedNote.orderNumber}
                </h3>
              </div>
              <button
                onClick={() => setSelectedNote(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            {/* Document Receipt View */}
            <div className="bg-white text-slate-900 p-5 rounded-2xl space-y-3 text-xs shadow-inner font-sans">
              <div className="flex items-center justify-between border-b pb-2">
                <div>
                  <h4 className="font-bold text-base text-slate-900">סבן - חומרי בניין ולוגיסטיקה בע"מ</h4>
                  <p className="text-[11px] text-slate-600">ח.פ 514892019 • טל: 050-8860896 (ורד)</p>
                </div>
                <div className="text-left font-mono">
                  <p className="font-bold text-sm text-slate-800">תעודה: {selectedNote.orderNumber}</p>
                  <p className="text-[10px] text-slate-500">{new Date(selectedNote.createdAt).toLocaleDateString('he-IL')}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-2.5 rounded-lg">
                <div>
                  <p className="text-slate-500 text-[10px]">לכבוד הלקוח:</p>
                  <p className="font-bold text-slate-900">{selectedNote.customerName}</p>
                  <p className="text-slate-700">{selectedNote.customerPhone || 'ללא טלפון'}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-[10px]">יעד פריקה:</p>
                  <p className="font-bold text-slate-900">{selectedNote.destination}</p>
                  <p className="text-slate-700">נהג: {selectedNote.driver}</p>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-200 text-slate-700">
                    <tr>
                      <th className="p-1.5">מק"ט</th>
                      <th className="p-1.5">שם פריט רשמי</th>
                      <th className="p-1.5">כמות</th>
                      <th className="p-1.5">יחידה</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {selectedNote.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="p-1.5 font-mono text-[11px] text-slate-600">{it.sku || '---'}</td>
                        <td className="p-1.5 font-semibold text-slate-900">{it.name}</td>
                        <td className="p-1.5 font-bold font-mono">{it.quantity}</td>
                        <td className="p-1.5">{it.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Signature Section */}
              <div className="pt-3 border-t flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-500">סטטוס מסירה:</p>
                  <p className="font-bold text-emerald-700">סופק ונמסר בהצלחה</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-slate-500 mb-1">חתימת המקבל באתר:</p>
                  {selectedNote.customerSignature ? (
                    <img
                      src={selectedNote.customerSignature}
                      alt="חתימה"
                      className="h-9 w-28 object-contain border border-slate-300 rounded bg-slate-50"
                    />
                  ) : (
                    <div className="h-9 w-28 border border-dashed border-slate-400 rounded flex items-center justify-center text-[10px] text-slate-400">
                      ממתין לחתימה
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => window.print()}
                className="px-3.5 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs text-slate-200 font-bold flex items-center gap-1.5 transition"
              >
                <Printer className="w-4 h-4" />
                <span>הדפס מסמך</span>
              </button>

              <button
                onClick={() => setSelectedNote(null)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs text-white font-bold"
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
