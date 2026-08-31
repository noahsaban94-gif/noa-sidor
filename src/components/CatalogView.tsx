import React, { useState, useMemo } from 'react';
import { Search, PackageSearch, Truck, Scale, Shield, Plus, Check } from 'lucide-react';
import { CATALOG_PRODUCTS } from '../data/catalog';
import { CatalogProduct } from '../types';

interface CatalogViewProps {
  onSelectProductForOrder?: (product: CatalogProduct) => void;
}

export const CatalogView: React.FC<CatalogViewProps> = ({ onSelectProductForOrder }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDriverFilter, setSelectedDriverFilter] = useState('all');

  const filteredProducts = useMemo(() => {
    return CATALOG_PRODUCTS.filter((prod) => {
      const matchesSearch =
        !searchTerm ||
        prod.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prod.sku.includes(searchTerm) ||
        (prod.keywords && prod.keywords.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesDriver =
        selectedDriverFilter === 'all' ||
        (prod.defaultDriver && prod.defaultDriver.includes(selectedDriverFilter));

      return matchesSearch && matchesDriver;
    });
  }, [searchTerm, selectedDriverFilter]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20">
      {/* Header */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-white/[0.04] via-white/[0.02] to-white/[0.04] border border-white/[0.08] backdrop-blur-xl flex flex-wrap items-center justify-between gap-3 shadow-xl">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <PackageSearch className="w-5 h-5 text-emerald-400" />
            <span>קטלוג חומרי בניין ומק"טים (סידור-נועה)</span>
          </h2>
          <p className="text-xs text-slate-400">
            מאגר מוצרים רשמי, מילות מפתח, יחידות מידה, משקלים ושיוך נהג ברירת מחדל
          </p>
        </div>

        <span className="text-xs px-3 py-1.5 rounded-xl bg-black/50 text-cyan-300 font-mono border border-white/10">
          {filteredProducts.length} מוצרים בקטלוג
        </span>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-4 rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.015] border border-white/[0.08] backdrop-blur-xl grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
          <input
            type="text"
            placeholder="חיפוש לפי שם מוצר, מק״ט (SKU), או מילת סלנג (לדוגמה: מלט, טיט, סומסום, גבס, 603, סיקה)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10 pl-4 py-2 bg-black/60 border border-white/10 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition"
          />
        </div>

        <div>
          <select
            value={selectedDriverFilter}
            onChange={(e) => setSelectedDriverFilter(e.target.value)}
            className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition"
          >
            <option value="all" className="bg-[#0c1017]">🚚 כל שיוכי הנהגים</option>
            <option value="חכמת" className="bg-[#0c1017]">חכמת (מנוף / שקים גדולים)</option>
            <option value="עלי" className="bg-[#0c1017]">עלי (הובלה רגילה / משטח)</option>
            <option value="02" className="bg-[#0c1017]">משאית 02 (ברזל)</option>
            <option value="09" className="bg-[#0c1017]">משאית 09</option>
          </select>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredProducts.map((prod) => (
          <div
            key={prod.sku}
            className="p-4 rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.015] border border-white/[0.08] hover:border-white/[0.18] transition flex flex-col justify-between gap-3 shadow-lg backdrop-blur-xl"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="font-mono text-xs font-bold text-cyan-300 bg-black/60 px-2 py-0.5 rounded border border-cyan-500/30">
                  מק"ט: {prod.sku}
                </span>

                <span className="text-[11px] text-slate-300 bg-white/[0.06] px-2 py-0.5 rounded border border-white/10">
                  יחידה: {prod.unit}
                </span>
              </div>

              <h3 className="font-bold text-sm text-slate-100">{prod.name}</h3>

              {prod.keywords && (
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                  <span className="text-slate-500">מילות מפתח: </span>
                  {prod.keywords}
                </p>
              )}
            </div>

            <div className="pt-2 border-t border-white/[0.08] text-xs space-y-1.5">
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Truck className="w-3 h-3 text-cyan-400" />
                  שיוך ברירת מחדל:
                </span>
                <span className="font-semibold text-slate-200">{prod.defaultDriver || 'לפי צורך'}</span>
              </div>

              {prod.weightKg !== undefined && prod.weightKg > 0 && (
                <div className="flex items-center justify-between text-slate-300">
                  <span className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Scale className="w-3 h-3 text-amber-400" />
                    משקל ליחידה:
                  </span>
                  <span className="font-mono text-amber-300">{prod.weightKg} ק"ג</span>
                </div>
              )}

              {prod.deposit && prod.deposit !== 'ללא' && (
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-[11px] text-slate-400">סיווג פקדון:</span>
                  <span className="text-[11px] text-emerald-400 font-medium">{prod.deposit}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
