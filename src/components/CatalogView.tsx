import React, { useState, useMemo } from 'react';
import {
  Search,
  PackageSearch,
  Truck,
  Scale,
  Building2,
  Tag,
  ExternalLink,
  Layers,
  Filter
} from 'lucide-react';
import { CATALOG_PRODUCTS } from '../data/catalog';
import { CatalogProduct, CONFIG } from '../types';

interface CatalogViewProps {
  onSelectProductForOrder?: (product: CatalogProduct) => void;
}

export const CatalogView: React.FC<CatalogViewProps> = ({ onSelectProductForOrder }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedWarehouse, setSelectedWarehouse] = useState('all');
  const [selectedDriverFilter, setSelectedDriverFilter] = useState('all');

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
      {/* Header */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-white/[0.04] via-white/[0.02] to-white/[0.04] border border-white/[0.08] backdrop-blur-xl flex flex-wrap items-center justify-between gap-3 shadow-xl">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <PackageSearch className="w-5 h-5 text-emerald-400" />
            <span>מילון לוגיסטי וקטלוג מק"טים רשמי (קומקס / סבן)</span>
          </h2>
          <p className="text-xs text-slate-400">
            מסונכרן לטאב "מילון לוגיסטי" בגליון Google Sheets ({CONFIG.spreadsheetId})
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={sheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold border border-emerald-500/30 transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>פתח ב-Google Sheets</span>
          </a>

          <span className="text-xs px-3 py-1.5 rounded-xl bg-black/50 text-cyan-300 font-mono border border-cyan-500/30">
            {filteredProducts.length} מתוך {CATALOG_PRODUCTS.length} פריטים
          </span>
        </div>
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
