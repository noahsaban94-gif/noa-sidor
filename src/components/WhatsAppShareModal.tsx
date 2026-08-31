import React, { useState, useEffect } from 'react';
import { X, Send, Copy, Check, Share2, Phone, ExternalLink, ShieldCheck, AlertCircle } from 'lucide-react';
import { OrderItem, CONFIG, STATUS_MAP } from '../types';

interface WhatsAppShareModalProps {
  order: OrderItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSendWebhook: (payload: { message: string; target: 'make' | 'joni'; orderId?: string }) => Promise<any>;
}

export const WhatsAppShareModal: React.FC<WhatsAppShareModalProps> = ({
  order,
  isOpen,
  onClose,
  onSendWebhook,
}) => {
  const [recipient, setRecipient] = useState<'vered' | 'customer' | 'custom'>('vered');
  const [customPhone, setCustomPhone] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [statusResult, setStatusResult] = useState<string | null>(null);

  useEffect(() => {
    if (order) {
      const st = STATUS_MAP[order.status] || STATUS_MAP.pending;
      const msg = `🚚 *עדכון סידור עבודה - הזמנה ${order.orderNumber}*\n👤 *לקוח:* ${order.customerName}\n📍 *יעד:* ${order.destination}${order.floor ? ` (${order.floor})` : ''}\n⏰ *שעת אספקה:* ${order.deliveryTime}\n🚛 *נהג:* ${order.driver}${order.craneRequired ? ' (⚠️ דורש מנוף)' : ''}\n📊 *סטטוס:* ${st.label}\n\n📦 *חומרים:*\n${order.items.map((i) => `▫️ ${i.name} - ${i.quantity} ${i.unit}`).join('\n')}${order.notes ? `\n\n💬 *דגשים:* ${order.notes}` : ''}`;
      setCustomMessage(msg);
      setCustomPhone(order.customerPhone || '');
    }
  }, [order]);

  if (!isOpen || !order) return null;

  const targetPhone =
    recipient === 'vered'
      ? CONFIG.veredPhone
      : recipient === 'customer'
      ? order.customerPhone || CONFIG.veredPhone
      : customPhone;

  const handleCopy = () => {
    navigator.clipboard.writeText(customMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendToWebhook = async (target: 'make' | 'joni') => {
    setIsSending(true);
    setStatusResult(null);
    try {
      await onSendWebhook({
        message: customMessage,
        target,
        orderId: order.id,
      });
      setStatusResult(`ההודעה שודרה בהצלחה לווביהוק ${target === 'make' ? 'Make.com' : 'JONI'}!`);
    } catch (err) {
      setStatusResult('שגיאה בשליחה לווביהוק.');
    } finally {
      setIsSending(false);
    }
  };

  const cleanPhone = targetPhone.replace(/[^0-9]/g, '');
  const directWhatsAppUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(customMessage)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-[#080b14]/95 border border-white/[0.12] rounded-3xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto backdrop-blur-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-400" />
              <span>שידור עדכון הזמנה {order.orderNumber} לוואטסאפ</span>
            </h2>
            <p className="text-xs text-slate-400">שליחה מהירה לוורד, לנהג, או ישירות לווביהוק</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] border border-transparent hover:border-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Recipient Selector */}
        <div className="space-y-1.5 text-xs">
          <label className="text-slate-300 font-medium">בחר נמען:</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setRecipient('vered')}
              className={`p-2 rounded-xl border text-center transition ${
                recipient === 'vered'
                  ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 font-bold shadow-sm shadow-emerald-500/20'
                  : 'bg-black/50 border-white/10 text-slate-400 hover:border-white/20'
              }`}
            >
              👩‍💼 ורד (סידור)
            </button>
            <button
              onClick={() => setRecipient('customer')}
              className={`p-2 rounded-xl border text-center transition ${
                recipient === 'customer'
                  ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 font-bold shadow-sm shadow-emerald-500/20'
                  : 'bg-black/50 border-white/10 text-slate-400 hover:border-white/20'
              }`}
            >
              👤 לקוח באתר
            </button>
            <button
              onClick={() => setRecipient('custom')}
              className={`p-2 rounded-xl border text-center transition ${
                recipient === 'custom'
                  ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 font-bold shadow-sm shadow-emerald-500/20'
                  : 'bg-black/50 border-white/10 text-slate-400 hover:border-white/20'
              }`}
            >
              📱 טלפון אחר
            </button>
          </div>

          {recipient === 'custom' && (
            <input
              type="tel"
              placeholder="הזן מספר טלפון כולל קידומת (לדוגמה: 0501234567)"
              value={customPhone}
              onChange={(e) => setCustomPhone(e.target.value)}
              className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-slate-100 text-xs font-mono mt-2 focus:border-emerald-500 outline-none transition"
            />
          )}
        </div>

        {/* Message Editor */}
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <label className="text-slate-300 font-medium">נוסח ההודעה:</label>
            <button onClick={handleCopy} className="text-[11px] text-slate-400 hover:text-emerald-300 flex items-center gap-1">
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'הועתק!' : 'העתק'}</span>
            </button>
          </div>
          <textarea
            rows={8}
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            className="w-full p-3 rounded-xl bg-black/60 border border-white/10 text-slate-100 font-mono text-xs leading-relaxed focus:border-emerald-500 focus:outline-none transition"
          />
        </div>

        {/* Webhook and Action Buttons */}
        <div className="space-y-2 pt-2 border-t border-white/[0.08]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={() => handleSendToWebhook('make')}
              disabled={isSending}
              className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transition active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>שדר לוורד (Make Webhook)</span>
            </button>

            <button
              onClick={() => handleSendToWebhook('joni')}
              disabled={isSending}
              className="px-3.5 py-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95"
            >
              <Share2 className="w-4 h-4 text-cyan-400" />
              <span>שדר ל-JONI RTDB</span>
            </button>
          </div>

          <a
            href={directWhatsAppUrl}
            target="_blank"
            rel="noreferrer"
            className="w-full py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 font-semibold text-xs border border-white/10 flex items-center justify-center gap-2 transition"
          >
            <ExternalLink className="w-4 h-4" />
            <span>פתח ישירות ב-WhatsApp Web / Mobile</span>
          </a>
        </div>

        {statusResult && (
          <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-300 font-medium text-center backdrop-blur-md">
            {statusResult}
          </div>
        )}
      </div>
    </div>
  );
};
