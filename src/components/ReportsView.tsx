import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Send,
  Copy,
  Check,
  RefreshCw,
  Share2,
  Calendar,
  Clock,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Truck
} from 'lucide-react';
import { OrderItem, CONFIG } from '../types';

interface ReportsViewProps {
  orders: OrderItem[];
  onSendWebhook: (payload: { message: string; target: 'make' | 'joni'; reportType: string }) => Promise<any>;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ orders, onSendWebhook }) => {
  const [reportType, setReportType] = useState<'morning' | 'daily_summary'>('morning');
  const [reportText, setReportText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; target: string } | null>(null);

  const pendingOrders = orders.filter((o) => o.status === 'pending' || o.status === 'loading' || o.status === 'in_transit');
  const deliveredOrders = orders.filter((o) => o.status === 'delivered');

  const generateReport = async (type: 'morning' | 'daily_summary') => {
    setIsGenerating(true);
    setSendResult(null);
    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (data.success && data.report) {
        setReportText(data.report.text);
      }
    } catch (err) {
      console.error('Error generating report:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    generateReport(reportType);
  }, [reportType, orders]);

  const handleCopy = () => {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBroadcast = async (target: 'make' | 'joni') => {
    if (!reportText) return;
    setIsSending(true);
    setSendResult(null);

    try {
      const res = await onSendWebhook({
        message: reportText,
        target,
        reportType,
      });

      setSendResult({
        success: true,
        target: target === 'make' ? 'Make.com Webhook (ורד)' : 'JONI Firebase RTDB Webhook',
      });
    } catch (err) {
      setSendResult({
        success: false,
        target: target === 'make' ? 'Make.com Webhook' : 'JONI Webhook',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      {/* Header Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-white/[0.04] via-white/[0.02] to-white/[0.04] border border-white/[0.08] backdrop-blur-xl flex flex-wrap items-center justify-between gap-3 shadow-xl">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <span>מערכת דוחות בוקר וסיכום יומי לוואטסאפ</span>
          </h2>
          <p className="text-xs text-slate-400">
            הפקה ושידור אוטומטי של סידורי עבודה יומיים וסטטוס אספקות לוורד ולנהגים
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1.5 p-1 bg-black/50 rounded-xl border border-white/10">
          <button
            onClick={() => setReportType('morning')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              reportType === 'morning'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🌅 דוח בוקר (סידור עבודה)
          </button>
          <button
            onClick={() => setReportType('daily_summary')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              reportType === 'daily_summary'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            📋 דוח סיכום יומי
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.015] border border-white/[0.08] backdrop-blur-xl shadow-lg">
          <p className="text-xs text-slate-400">סה"כ הזמנות בסידור</p>
          <p className="text-2xl font-extrabold text-white font-mono mt-1">{orders.length}</p>
        </div>
        <div className="p-4 rounded-2xl bg-amber-950/15 border border-amber-500/30 backdrop-blur-xl shadow-lg">
          <p className="text-xs text-amber-300">הזמנות שטרם סופקו (בסידור/בחלוקה)</p>
          <p className="text-2xl font-extrabold text-amber-400 font-mono mt-1">{pendingOrders.length}</p>
        </div>
        <div className="p-4 rounded-2xl bg-emerald-950/15 border border-emerald-500/30 backdrop-blur-xl shadow-lg">
          <p className="text-xs text-emerald-300">הזמנות שנמסרו בהצלחה</p>
          <p className="text-2xl font-extrabold text-emerald-400 font-mono mt-1">{deliveredOrders.length}</p>
        </div>
      </div>

      {/* Report Editor & Preview */}
      <div className="p-5 rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.015] border border-white/[0.08] backdrop-blur-xl shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
            <span>נוסח הדוח המעוצב לוואטסאפ:</span>
            {isGenerating && <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => generateReport(reportType)}
              className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs flex items-center gap-1 border border-white/10"
              title="רענן נוסח"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>רענן</span>
            </button>
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-white/10"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'הועתק!' : 'העתק טקסט'}</span>
            </button>
          </div>
        </div>

        {/* Text Area */}
        <div className="relative">
          <textarea
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
            rows={14}
            className="w-full p-4 rounded-xl bg-black/60 border border-white/10 text-slate-100 font-mono text-xs leading-relaxed focus:outline-none focus:border-emerald-500 transition resize-y"
            placeholder="מייצר דוח..."
          />
        </div>

        {/* Webhook Broadcast Buttons */}
        <div className="p-4 rounded-xl bg-black/40 border border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleBroadcast('make')}
              disabled={isSending || !reportText}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-emerald-950/50 transition active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>שדר לוורד (Make Webhook)</span>
            </button>

            <button
              onClick={() => handleBroadcast('joni')}
              disabled={isSending || !reportText}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition active:scale-95"
            >
              <Share2 className="w-4 h-4 text-cyan-400" />
              <span>שדר ל-JONI RTDB Webhook</span>
            </button>

            <a
              href={`https://api.whatsapp.com/send?phone=972508860896&text=${encodeURIComponent(reportText)}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 text-xs font-semibold border border-white/10"
            >
              <ExternalLink className="w-4 h-4" />
              <span>פתח ישירות בוואטסאפ</span>
            </a>
          </div>

          <div className="text-[11px] text-slate-400">
            נמען ברירת מחדל: <span className="font-mono text-emerald-400 font-bold">{CONFIG.veredPhone}</span>
          </div>
        </div>

        {/* Feedback Alert */}
        {sendResult && (
          <div
            className={`p-3.5 rounded-xl text-xs flex items-center gap-2 font-bold ${
              sendResult.success
                ? 'bg-emerald-950/40 border border-emerald-500/50 text-emerald-300'
                : 'bg-rose-950/40 border border-rose-500/50 text-rose-300'
            }`}
          >
            {sendResult.success ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>
              {sendResult.success
                ? `הדוח נשלח בהצלחה ל-${sendResult.target}!`
                : `שגיאה בשידור ל-${sendResult.target}. אנא נסה שוב או פתח בוואטסאפ.`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
