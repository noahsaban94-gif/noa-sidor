import React, { useState } from 'react';
import {
  Settings,
  Sheet,
  Share2,
  Phone,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Send,
  RefreshCw,
  Database,
  Smartphone,
  Truck
} from 'lucide-react';
import { CONFIG } from '../types';

export const SettingsView: React.FC = () => {
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const testWebhook = async (target: 'make' | 'joni') => {
    setTestingWebhook(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/webhook/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target,
          message: 'בדיקת חיבור תקינה מתוך מערכת סידור-נועה PWA 🚀',
          phone: CONFIG.veredPhone,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult(`הודעת הבדיקה נשלחה בהצלחה ל-${target === 'make' ? 'Make.com' : 'JONI Webhook'}!`);
      } else {
        setTestResult('שגיאה בשליחה.');
      }
    } catch (err) {
      setTestResult('שגיאת תקשורת.');
    } finally {
      setTestingWebhook(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      {/* Header */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-white/[0.04] via-white/[0.02] to-white/[0.04] border border-white/[0.08] backdrop-blur-xl shadow-xl">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-emerald-400" />
          <span>הגדרות מערכת, סנכרון Google Sheets ו-Webhooks</span>
        </h2>
        <p className="text-xs text-slate-400">
          סטטוס חיבורי הענן, קבועי מערכת (Config), קישורי WhatsApp ו-PWA
        </p>
      </div>

      {/* Google Sheets Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.015] border border-white/[0.08] backdrop-blur-xl shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sheet className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm text-slate-100">גליון Google Sheets מקושר</h3>
          </div>
          <span className="text-xs bg-emerald-500/15 text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            מחובר ופעיל
          </span>
        </div>

        <p className="text-xs text-slate-400">
          מזהה הגליון (SPREADSHEET_ID) המסונכרן ישירות עם המערכת:
        </p>

        <div className="flex items-center justify-between p-3 rounded-xl bg-black/60 border border-white/10 text-xs font-mono text-cyan-300">
          <span className="truncate">{CONFIG.spreadsheetId}</span>
          <a
            href={`https://docs.google.com/spreadsheets/d/${CONFIG.spreadsheetId}/edit`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-emerald-400 hover:underline flex-shrink-0 ml-2 font-sans font-semibold"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            פתח ב-Google Sheets
          </a>
        </div>
      </div>

      {/* WhatsApp Webhooks Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.015] border border-white/[0.08] backdrop-blur-xl shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Share2 className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm text-slate-100">ווביהוקים לשליחת הודעות וואטסאפ (Make & JONI)</h3>
          </div>
        </div>

        {/* Make.com Webhook */}
        <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.08] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200">1. Make.com Webhook (ורד):</span>
            <button
              onClick={() => testWebhook('make')}
              disabled={testingWebhook}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1 transition"
            >
              <Send className="w-3 h-3" />
              <span>בדיקת שליחה</span>
            </button>
          </div>
          <p className="text-[11px] font-mono text-slate-400 break-all bg-black/60 p-2 rounded-lg border border-white/10">
            {CONFIG.makeWebhookUrl}
          </p>
        </div>

        {/* JONI Webhook */}
        <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.08] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200">2. JONI Firebase RTDB Webhook:</span>
            <button
              onClick={() => testWebhook('joni')}
              disabled={testingWebhook}
              className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1 transition"
            >
              <Send className="w-3 h-3" />
              <span>בדיקת שליחה</span>
            </button>
          </div>
          <p className="text-[11px] font-mono text-slate-400 break-all bg-black/60 p-2 rounded-lg border border-white/10">
            {CONFIG.joniWebhookUrl}
          </p>
        </div>

        {testResult && (
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-300 font-medium backdrop-blur-md">
            {testResult}
          </div>
        )}
      </div>

      {/* Fleet & Drivers Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.015] border border-white/[0.08] backdrop-blur-xl shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Truck className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm text-slate-100">צי הרכבים והנהגים של ח. סבן</h3>
          </div>
          <span className="text-xs bg-amber-500/15 text-amber-300 px-2.5 py-1 rounded-full border border-amber-500/30 flex items-center gap-1 font-semibold">
            שיבוץ חכם נועה AI
          </span>
        </div>

        <p className="text-xs text-slate-400">
          פרופיל צי הרכבים, מספרי רישוי, ייעוד משימות ושיוך מחסני מקור:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Hachmat */}
          <div className="p-4 rounded-xl bg-black/40 border border-amber-500/20 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🏗️</span>
                <div>
                  <h4 className="font-bold text-slate-100 text-sm">חכמת — משאית מנוף</h4>
                  <span className="text-[11px] text-amber-400 font-medium">משאית מרצדס מנוף</span>
                </div>
              </div>
              <span className="font-mono text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-lg border border-amber-500/30 font-bold">
                615-41-002
              </span>
            </div>

            <div className="text-xs space-y-1 text-slate-300 pt-1 border-t border-white/[0.06]">
              <div className="flex items-center gap-1 text-slate-400">
                <span>🎯 ייעוד:</span>
                <span className="text-slate-200">הובלות כבדות עם פריקת מנוף (זרוע 9 מ' / 15 מ')</span>
              </div>
              <div className="flex items-center gap-1 text-slate-400">
                <span>📦 משא:</span>
                <span className="text-slate-200">בלות חול, סומסום, טיט, מלט, בלוקים ומשטחים</span>
              </div>
              <div className="flex items-center gap-1 text-slate-400">
                <span>🏢 מחסן ראשי:</span>
                <span className="text-emerald-400 font-semibold">🏭 4️⃣(החרש) - חומרי בניין כבדים</span>
              </div>
            </div>
          </div>

          {/* Ali */}
          <div className="p-4 rounded-xl bg-black/40 border border-cyan-500/20 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🚚</span>
                <div>
                  <h4 className="font-bold text-slate-100 text-sm">עלי — משאית רגילה / פתוחה</h4>
                  <span className="text-[11px] text-cyan-400 font-medium">משאית רגילה (משאית עלי)</span>
                </div>
              </div>
              <span className="font-mono text-xs bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-lg border border-cyan-500/30 font-bold">
                ללא מנוף
              </span>
            </div>

            <div className="text-xs space-y-1 text-slate-300 pt-1 border-t border-white/[0.06]">
              <div className="flex items-center gap-1 text-slate-400">
                <span>🎯 ייעוד:</span>
                <span className="text-slate-200">הובלות ללא מנוף (משאית שטוחה/סגורה)</span>
              </div>
              <div className="flex items-center gap-1 text-slate-400">
                <span>📦 משא:</span>
                <span className="text-slate-200">לוחות גבס (לבן/ירוק/כחול), פרופילים, צבעים, דבקים</span>
              </div>
              <div className="flex items-center gap-1 text-slate-400">
                <span>🏢 מחסן ראשי:</span>
                <span className="text-cyan-400 font-semibold">🏟️ 1️⃣(התלמיד) - גבס ומוצרים קלים</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-slate-300 flex items-start gap-2">
          <span className="text-amber-400 text-base">💡</span>
          <p className="leading-relaxed">
            <strong className="text-white">במערכת השיבוץ החכמה של נועה AI:</strong> בעת ניתוח הזמנה חדשה מתבצעת בדיקה אוטומטית של משקל הפריטים, סוג החומר ודרישת מנוף, וכך נקבע השיבוץ בין המנוף של חכמת למשאית של עלי ומחסן היציאה המתאים.
          </p>
        </div>
      </div>

      {/* Recipient & Profile Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.015] border border-white/[0.08] backdrop-blur-xl shadow-lg space-y-3">
        <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
          <Phone className="w-4 h-4 text-emerald-400" />
          <span>פרטי נמען סידור ראשי (ורד)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-black/50 border border-white/10">
            <span className="text-slate-400 block mb-1">טלפון ורד:</span>
            <span className="font-mono text-emerald-400 font-bold text-sm">{CONFIG.veredPhone}</span>
          </div>

          <div className="p-3 rounded-xl bg-black/50 border border-white/10">
            <span className="text-slate-400 block mb-1">תמונת אווטאר נועה AI:</span>
            <span className="font-mono text-cyan-400 text-xs truncate block">{CONFIG.noaAvatarUrl}</span>
          </div>
        </div>
      </div>

      {/* PWA & Deployment Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.015] border border-white/[0.08] backdrop-blur-xl shadow-lg space-y-3">
        <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-emerald-400" />
          <span>אפליקציית PWA ופריסה ב-Vercel</span>
        </h3>

        <p className="text-xs text-slate-400 leading-relaxed">
          האפליקציה תומכת באופן מלא בהתקנה כ-PWA (Progressive Web App) בכל מכשירי אנדרואיד, אייפון ודסקטופ.
          כל הקבצים מוכנים לפריסה מלאה ב-Vercel או שרתי ענן.
        </p>

        <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold">
          <CheckCircle2 className="w-4 h-4" />
          <span>תאימות מלאה: Manifest, Service Worker ready, Full Responsive, RTL</span>
        </div>
      </div>
    </div>
  );
};
