import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  PackageSearch,
  Truck,
  Scale,
  Building2,
  Tag,
  ExternalLink,
  Layers,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  ArrowRight,
  Zap,
  Info
} from 'lucide-react';
import { CATALOG_PRODUCTS, CORE_LOGISTICS_ITEMS } from '../data/catalog';
import { CatalogProduct, CONFIG } from '../types';

interface CatalogViewProps {
  onSelectProductForOrder?: (product: CatalogProduct) => void;
}

export const CatalogView: React.FC<CatalogViewProps> = ({ onSelectProductForOrder }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedWarehouse, setSelectedWarehouse] = useState('all');
  const [selectedDriverFilter, setSelectedDriverFilter] = useState('all');

  // NLP Sandbox State
  const [sandboxInput, setSandboxInput] = useState('צריך 20 שק מלט נשר, 3 בלות חול ים, ו-10 חבילות להבים לרעננה');
  const [sandboxResult, setSandboxResult] = useState<any>(null);
  const [isNormalizing, setIsNormalizing] = useState(false);

  // Live Sheet Sync State
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ time: string; count: number; status: 'online' | 'synced' }>({
    time: new Date().toLocaleTimeString('he-IL'),
    count: CATALOG_PRODUCTS.length,
    status: 'online',
  });

  const categories = useMemo(() => {
    const cats = new Set<string>();
    CATALOG_PRODUCTS.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats).sort();
  }, []);

  const warehouses = useMemo(() => {
    const whs = new Set<string>();
    CATALOG_PRODUCTS.forEach((p) => {
      if (p.warehouse) whs.add(p.warehouse);
    });
    return Array.from(whs);
  }, []);

  // Run NLP Normalization test
  const handleRunNlpTest = async (textToTest?: string) => {
    const input = textToTest || sandboxInput;
    if (!input.trim()) return;
    setIsNormalizing(true);
    try {
      const res = await fetch('/api/gas/dictionary/normalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input }),
      });
      const data = await res.json();
      setSandboxResult(data);
    } catch {
      // Local fallback parsing
      const lower = input.toLowerCase();
      const matched = CATALOG_PRODUCTS.filter((p) =>
        lower.includes(p.name.toLowerCase()) ||
        p.sku.includes(input) ||
        (p.keywords && p.keywords.toLowerCase().split(',').some((k) => lower.includes(k.trim())))
      );
      setSandboxResult({
        success: true,
        input,
        matchedCount: matched.length,
        normalizedItems: matched.map((m) => ({
          sku: m.sku,
          officialName: m.name,
          category: m.category,
          unit: m.unit,
          quantity: 1,
          warehouse: m.warehouse || '🏭 4️⃣(החרש)',
          defaultDriver: m.defaultDriver || 'חכמת / עלי',
        })),
        recommendedDriver: matched.some((m) => m.unit === 'בלה') ? 'חכמת (מנוף)' : 'עלי (משאית רגילה)',
      });
    } finally {
      setIsNormalizing(false);
    }
  };

  // Initial NLP run
  useEffect(() => {
    handleRunNlpTest();
  }, []);

  // Live Sync trigger with /api/gas/dictionary
  const handleSyncLiveDictionary = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/gas/dictionary');
      if (res.ok) {
        const data = await res.json();
        setSyncStatus({
          time: new Date().toLocaleTimeString('he-IL'),
          count: data.totalItems || CATALOG_PRODUCTS.length,
          status: 'synced',
        });
      }
    } catch (err) {
      console.warn('Sync notice:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredProducts = useMemo(() => {
    return CATALOG_PRODUCTS.filter((prod) => {
      const s = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        prod.name.toLowerCase().includes(s) ||
        prod.sku.includes(searchTerm) ||
        (prod.category && prod.category.toLowerCase().includes(s)) ||
        (prod.keywords && prod.keywords.toLowerCase().includes(s));

      const matchesCategory =
        selectedCategory === 'all' || prod.category === selectedCategory;

      const matchesWarehouse =
        selectedWarehouse === 'all' || (prod.warehouse && prod.warehouse.includes(selectedWarehouse));

      const matchesDriver =
        selectedDriverFilter === 'all' ||
        (prod.defaultDriver && prod.defaultDriver.includes(selectedDriverFilter));

      return matchesSearch && matchesCategory && matchesWarehouse && matchesDriver;
    });
  }, [searchTerm, selectedCategory, selectedWarehouse, selectedDriverFilter]);

  const sheetUrl = `https://docs.google.com/spreadsheets/d/${CONFIG.spreadsheetId}/edit#gid=0`;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20">
      {/* Header with Google Sheets Tab 1 Badge & Live Sync */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-white/[0.05] via-white/[0.02] to-white/[0.05] border border-white/[0.1] backdrop-blur-xl flex flex-wrap items-center justify-between gap-4 shadow-2xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              טאב 1: מילון_לוגיסטי (Google Sheets)
            </span>
            <span className="text-xs text-slate-400 font-mono">
              מזהה גליון: {CONFIG.spreadsheetId.substring(0, 15)}...
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <PackageSearch className="w-5 h-5 text-emerald-400" />
            <span>מילון לוגיסטי וקטלוג מק"טים רשמי (קומקס / סבן)</span>
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            שדות הטאב: <span className="font-mono text-cyan-300">מק"ט | שם_רשמי | קטגוריה | יחידה | מילות מפתח</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleSyncLiveDictionary}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/50 transition active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'מסנכרן כעת...' : 'סנכרון חי (/api/gas/dictionary)'}</span>
          </button>

          <a
            href={sheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 text-xs font-medium border border-white/10 transition"
          >
            <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
            <span>פתח גיליון חי</span>
          </a>
        </div>
      </div>

      {/* 10 Core Test Items Quick Bar */}
      <div className="p-4 rounded-2xl bg-gradient-to-b from-emerald-950/20 to-transparent border border-emerald-500/20 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
              10 פריטי ליבה אמיתיים לבדיקה ונרמול מהיר (Google Sheets Sync Core)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">10 / 10 פריטים מאומתים</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {CORE_LOGISTICS_ITEMS.map((item) => (
            <button
              key={item.sku}
              onClick={() => {
                setSearchTerm(item.name);
                setSandboxInput(`רוצה להזמין ${item.name} 10 ${item.unit}`);
                handleRunNlpTest(`רוצה להזמין ${item.name} 10 ${item.unit}`);
              }}
              className="text-right p-2 rounded-xl bg-black/40 hover:bg-emerald-950/40 border border-white/5 hover:border-emerald-500/30 transition group"
            >
              <div className="flex items-center justify-between gap-1 text-[10px] font-mono text-cyan-300 mb-0.5">
                <span>מק"ט: {item.sku}</span>
                <span className="text-emerald-400">{item.unit}</span>
              </div>
              <p className="text-xs font-bold text-slate-200 group-hover:text-emerald-300 truncate">
                {item.name}
              </p>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">
                {item.warehouse}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* NLP Sandbox Interface */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-[#09111c] to-[#060b12] border border-cyan-500/30 shadow-2xl space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>מעבדת NLP לבדיקת שפה חופשית וסנכרון גליון (NLP Sandbox)</span>
                <span className="text-[10px] font-mono bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/30">
                  /api/gas/dictionary/normalize
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                מזינים טקסט חופשי / הודעת וואטסאפ של קבלן ורואים את הפענוח המדויק למק"ט, יחידה, מחסן ושיוך נהג
              </p>
            </div>
          </div>
        </div>

        {/* Input & Run */}
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={sandboxInput}
            onChange={(e) => setSandboxInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRunNlpTest()}
            placeholder="הקלד כאן טקסט לבדיקה (למשל: תביא לי 20 שק מלט נשר, 3 בלות חול ים, ו-10 חבילות להבים)..."
            className="flex-1 px-4 py-2.5 bg-black/60 border border-white/15 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 transition"
          />
          <button
            onClick={() => handleRunNlpTest()}
            disabled={isNormalizing}
            className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-cyan-950/50 transition active:scale-95 flex items-center justify-center gap-1.5"
          >
            <Sparkles className={`w-4 h-4 ${isNormalizing ? 'animate-spin' : ''}`} />
            <span>{isNormalizing ? 'מפענח...' : 'בדוק פענוח NLP'}</span>
          </button>
        </div>

        {/* Sandbox Results Breakdown */}
        {sandboxResult && (
          <div className="p-3.5 rounded-xl bg-black/50 border border-cyan-500/20 space-y-3">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-slate-300 font-medium">
                אותרו <strong className="text-cyan-400">{sandboxResult.matchedCount || sandboxResult.normalizedItems?.length || 0}</strong> פריטים תואמים במילון:
              </span>
              <span className="font-mono text-[11px] text-emerald-300 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
                נהג מומלץ: {sandboxResult.recommendedDriver || 'חכמת (מנוף)'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {sandboxResult.normalizedItems?.map((item: any, idx: number) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.08] flex flex-col justify-between text-xs space-y-1"
                >
                  <div className="flex items-center justify-between gap-1 text-[10px] font-mono text-cyan-300">
                    <span>מק"ט: {item.sku}</span>
                    <span className="text-emerald-400 font-bold">{item.quantity || 1} {item.unit}</span>
                  </div>
                  <p className="font-bold text-slate-200 truncate">{item.officialName}</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-white/5">
                    <span>{item.warehouse || '🏭 4️⃣(החרש)'}</span>
                    <span>{item.defaultDriver || 'חכמת / עלי'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Search & Multi-Filters Bar */}
      <div className="p-4 rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.015] border border-white/[0.08] backdrop-blur-xl space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
          <input
            type="text"
            placeholder="חיפוש חופשי לפי שם מוצר, מק״ט (SKU), קטגוריה, או סלנג לנרמול AI (למשל: מלט, טיט, סומסום, גבס, 603, סיקה, בלה, ברזל)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10 pl-4 py-2 bg-black/60 border border-white/10 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Category filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition"
            >
              <option value="all" className="bg-[#0c1017]">📁 כל הקטגוריות ({categories.length})</option>
              {categories.map((cat) => (
                <option key={cat} value={cat} className="bg-[#0c1017]">{cat}</option>
              ))}
            </select>
          </div>

          {/* Warehouse filter */}
          <div>
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition"
            >
              <option value="all" className="bg-[#0c1017]">🏭 כל המחסנים</option>
              {warehouses.map((wh) => (
                <option key={wh} value={wh} className="bg-[#0c1017]">{wh}</option>
              ))}
            </select>
          </div>

          {/* Driver filter */}
          <div>
            <select
              value={selectedDriverFilter}
              onChange={(e) => setSelectedDriverFilter(e.target.value)}
              className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition"
            >
              <option value="all" className="bg-[#0c1017]">🚚 כל שיוכי הנהגים</option>
              <option value="חכמת" className="bg-[#0c1017]">חכמת (מנוף / שקים גדולים / בלות)</option>
              <option value="עלי" className="bg-[#0c1017]">עלי (פתוחה / משאית רגילה)</option>
              <option value="02" className="bg-[#0c1017]">משאית 02</option>
              <option value="09" className="bg-[#0c1017]">משאית 09</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredProducts.map((prod, pIdx) => (
          <div
            key={`${prod.sku}-${pIdx}`}
            className="p-4 rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.015] border border-white/[0.08] hover:border-emerald-500/40 transition flex flex-col justify-between gap-3 shadow-lg backdrop-blur-xl group"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="font-mono text-xs font-bold text-cyan-300 bg-black/60 px-2.5 py-0.5 rounded-lg border border-cyan-500/30 shadow-inner">
                  מק"ט: {prod.sku}
                </span>

                <span className="text-[11px] font-semibold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/25">
                  יחידה: {prod.unit}
                </span>
              </div>

              <h3 className="font-bold text-sm text-slate-100 group-hover:text-emerald-300 transition">
                {prod.name}
              </h3>

              {prod.category && (
                <div className="flex items-center gap-1 mt-1 text-[11px] text-slate-400">
                  <Layers className="w-3 h-3 text-cyan-400" />
                  <span>{prod.category}</span>
                </div>
              )}

              {prod.keywords && prod.keywords !== prod.name && (
                <p className="text-[11px] text-slate-400 mt-1.5 line-clamp-2 bg-black/30 p-1.5 rounded-lg border border-white/5 font-mono">
                  <span className="text-slate-500">סלנג/נרמול: </span>
                  {prod.keywords}
                </p>
              )}
            </div>

            <div className="pt-2.5 border-t border-white/[0.08] text-xs space-y-1.5">
              {/* Warehouse & Driver */}
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Building2 className="w-3 h-3 text-amber-400" />
                  מחסן מקור:
                </span>
                <span className="text-[11px] font-medium text-amber-300">{prod.warehouse || '🏭 4️⃣(החרש)'}</span>
              </div>

              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Truck className="w-3 h-3 text-cyan-400" />
                  שיוך רכב/נהג:
                </span>
                <span className="font-semibold text-slate-200 text-[11px]">{prod.defaultDriver || 'חכמת / עלי'}</span>
              </div>

              {prod.weightKg !== undefined && prod.weightKg > 0 && (
                <div className="flex items-center justify-between text-slate-300">
                  <span className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Scale className="w-3 h-3 text-slate-400" />
                    משקל ליחידה:
                  </span>
                  <span className="font-mono text-slate-300 font-bold">{prod.weightKg} ק"ג</span>
                </div>
              )}

              {prod.deposit && prod.deposit !== 'ללא' && (
                <div className="flex items-center justify-between text-slate-300 pt-1 border-t border-white/5">
                  <span className="text-[10px] text-slate-400">פקדון:</span>
                  <span className="text-[10px] text-emerald-400 font-medium">{prod.deposit}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
