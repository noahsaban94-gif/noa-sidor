import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Package, Search, Truck, AlertTriangle, Clock, MapPin, User, Sparkles } from 'lucide-react';
import { OrderItem, OrderProduct, OrderStatus, DRIVERS_LIST } from '../types';
import { CATALOG_PRODUCTS } from '../data/catalog';
import { calculateOrderMetrics } from '../utils/logistics';

interface OrderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (orderData: Partial<OrderItem>) => void;
  editingOrder?: OrderItem | null;
}

export const OrderFormModal: React.FC<OrderFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingOrder,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerNumber, setCustomerNumber] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [destination, setDestination] = useState('');
  const [city, setCity] = useState('');
  const [warehouse, setWarehouse] = useState('🏭 4️⃣(החרש)');
  const [deliveryTime, setDeliveryTime] = useState('08:00');
  const [driver, setDriver] = useState('חכמת (מנוף)');
  const [truckType, setTruckType] = useState('משאית מנוף (זרוע 24 מטר)');
  const [status, setStatus] = useState<OrderStatus>('pending');
  const [craneRequired, setCraneRequired] = useState(false);
  const [depositBigBags, setDepositBigBags] = useState<number>(0);
  const [depositPallets, setDepositPallets] = useState<number>(0);
  const [wazeUrl, setWazeUrl] = useState('');
  const [driveFileUrl, setDriveFileUrl] = useState('');
  const [verificationCheck, setVerificationCheck] = useState('תקין לשיגור');
  const [floor, setFloor] = useState('');
  const [siteContact, setSiteContact] = useState('');
  const [sitePhone, setSitePhone] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<OrderProduct[]>([
    { name: 'מלט אפור', quantity: 10, unit: 'שק', sku: '10002' },
  ]);

  // Catalog item quick search
  const [catalogSearch, setCatalogSearch] = useState('');
  const [showCatalogDropdown, setShowCatalogDropdown] = useState<number | null>(null);

  useEffect(() => {
    if (editingOrder) {
      setCustomerName(editingOrder.customerName || '');
      setCustomerNumber(editingOrder.customerNumber || `C-${editingOrder.orderNumber}`);
      setCustomerPhone(editingOrder.customerPhone || '');
      setDestination(editingOrder.destination || '');
      setCity(editingOrder.city || '');
      setWarehouse(editingOrder.warehouse || '🏭 4️⃣(החרש)');
      setDeliveryTime(editingOrder.deliveryTime || '08:00');
      setDriver(editingOrder.driver || 'חכמת (מנוף)');
      setTruckType(editingOrder.truckType || (editingOrder.craneRequired ? 'משאית מנוף (זרוע 24 מטר)' : 'משאית רגילה פתוחה'));
      setStatus(editingOrder.status || 'pending');
      setCraneRequired(editingOrder.craneRequired || false);
      setDepositBigBags(editingOrder.depositBigBags || 0);
      setDepositPallets(editingOrder.depositPallets || 0);
      setWazeUrl(editingOrder.wazeUrl || '');
      setDriveFileUrl(editingOrder.driveFileUrl || editingOrder.deliveryNotePdf || '');
      setVerificationCheck(editingOrder.verificationCheck || 'תקין לשיגור');
      setFloor(editingOrder.floor || '');
      setSiteContact(editingOrder.siteContact || '');
      setSitePhone(editingOrder.sitePhone || '');
      setNotes(editingOrder.notes || '');
      setItems(editingOrder.items && editingOrder.items.length > 0 ? [...editingOrder.items] : [{ name: '', quantity: 1, unit: 'יח\'' }]);
    } else {
      setCustomerName('');
      setCustomerNumber('');
      setCustomerPhone('');
      setDestination('');
      setCity('');
      setWarehouse('🏭 4️⃣(החרש)');
      setDeliveryTime('08:00');
      setDriver('חכמת (מנוף)');
      setTruckType('משאית מנוף (זרוע 24 מטר)');
      setStatus('pending');
      setCraneRequired(false);
      setDepositBigBags(0);
      setDepositPallets(0);
      setWazeUrl('');
      setDriveFileUrl('');
      setVerificationCheck('תקין לשיגור');
      setFloor('');
      setSiteContact('');
      setSitePhone('');
      setNotes('');
      setItems([{ name: 'מלט אפור', quantity: 10, unit: 'שק', sku: '10002' }]);
    }
  }, [editingOrder, isOpen]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems([...items, { name: '', quantity: 1, unit: 'שק' }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof OrderProduct, val: any) => {
    const next = [...items];
    next[index] = { ...next[index], [field]: val };
    setItems(next);
  };

  const applySmartDispatch = (currentItems = items) => {
    const metrics = calculateOrderMetrics(currentItems);
    setDriver(metrics.recommendedDriver);
    setTruckType(metrics.recommendedTruckType);
    setWarehouse(metrics.warehouse);
    setCraneRequired(metrics.hasCraneItem || !!floor);
    if (metrics.depositBigBags > 0) setDepositBigBags(metrics.depositBigBags);
    if (metrics.depositPallets > 0) setDepositPallets(metrics.depositPallets);
  };

  const handleSelectCatalogItem = (index: number, catalogItem: typeof CATALOG_PRODUCTS[0]) => {
    const next = [...items];
    next[index] = {
      sku: catalogItem.sku,
      name: catalogItem.name,
      unit: catalogItem.unit || 'יח\'',
      quantity: next[index].quantity || 1,
    };
    setItems(next);
    setShowCatalogDropdown(null);
    applySmartDispatch(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !destination) {
      alert('נא למלא שם לקוח ויעד אספקה');
      return;
    }

    onSave({
      ...(editingOrder ? { id: editingOrder.id, orderNumber: editingOrder.orderNumber } : {}),
      customerName,
      customerNumber: customerNumber || `C-${Math.floor(10000 + Math.random() * 90000)}`,
      customerPhone,
      destination,
      city: city || (destination.includes('הרצליה') ? 'הרצליה' : destination.includes('הוד השרון') ? 'הוד השרון' : destination.includes('רעננה') ? 'רעננה' : destination.includes('רמת השרון') ? 'רמת השרון' : destination.includes('כפר סבא') ? 'כפר סבא' : 'מרכז'),
      warehouse,
      deliveryTime,
      driver,
      truckType,
      status,
      craneRequired,
      depositBigBags: Number(depositBigBags) || 0,
      depositPallets: Number(depositPallets) || 0,
      wazeUrl: wazeUrl || `https://waze.com/ul?q=${encodeURIComponent(destination)}&navigate=yes`,
      driveFileUrl: driveFileUrl || `https://drive.google.com/open?id=doc-${editingOrder?.orderNumber || 'new'}`,
      verificationCheck,
      floor,
      siteContact,
      sitePhone,
      notes,
      items: items.filter((i) => i.name.trim().length > 0),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#080b14]/95 border border-white/[0.12] rounded-3xl shadow-2xl p-6 my-8 max-h-[90vh] overflow-y-auto backdrop-blur-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div>
            <h2 className="text-lg font-bold text-white">
              {editingOrder ? `עריכת הזמנה ${editingOrder.orderNumber}` : 'כרטיס הזמנה חדש לסידור'}
            </h2>
            <p className="text-xs text-slate-400">
              פרטי הלקוח, היעד, שעת האספקה ושיבוץ נהג
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] border border-transparent hover:border-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-4 text-xs">
          {/* Customer & Customer Number & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">שם לקוח / קבלן *</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  required
                  placeholder="לדוגמה: יוסי כהן בניה ושיפוצים"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full pr-9 pl-3 py-2 bg-black/60 border border-white/10 rounded-xl text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">מספר לקוח (ח"פ / קוד)</label>
              <input
                type="text"
                placeholder="לדוגמה: C-10492"
                value={customerNumber}
                onChange={(e) => setCustomerNumber(e.target.value)}
                className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none font-mono transition"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">טלפון לקוח</label>
              <input
                type="tel"
                placeholder="לדוגמה: 052-1234567"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none font-mono transition"
              />
            </div>
          </div>

          {/* Destination, City, Floor */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">יעד / כתובת אתר *</label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-rose-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  required
                  placeholder="רחוב הנשיא 44"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full pr-9 pl-3 py-2 bg-black/60 border border-white/10 rounded-xl text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">עיר (טאב 2)</label>
              <input
                type="text"
                placeholder="לדוגמה: הרצליה, הוד השרון, רעננה"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">קומה / מיקום פריקה</label>
              <input
                type="text"
                placeholder="לדוגמה: קומה 2 / מרפסת"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none transition"
              />
            </div>
          </div>

          {/* Warehouse, Truck Type, Delivery Time, Driver */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">מחסן יציאה</label>
              <select
                value={warehouse}
                onChange={(e) => setWarehouse(e.target.value)}
                className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-slate-100 focus:border-emerald-500 focus:outline-none transition"
              >
                <option value="🏭 4️⃣(החרש)" className="bg-[#0c1017]">🏭 4️⃣(החרש) - חומרי מליטה ובלות</option>
                <option value="🏟️ 1️⃣(התלמיד)" className="bg-[#0c1017]">🏟️ 1️⃣(התלמיד) - גבס ואיטום</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">נהג משובץ *</label>
              <select
                value={driver}
                onChange={(e) => setDriver(e.target.value)}
                className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-slate-100 focus:border-emerald-500 focus:outline-none transition"
              >
                {DRIVERS_LIST.map((drv) => (
                  <option key={drv} value={drv} className="bg-[#0c1017]">
                    {drv}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">סוג משאית / מנוף</label>
              <input
                type="text"
                value={truckType}
                onChange={(e) => setTruckType(e.target.value)}
                placeholder="משאית מנוף 24מ' / רגילה"
                className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-slate-100 focus:border-emerald-500 focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">שעת אספקה *</label>
              <div className="relative">
                <Clock className="w-4 h-4 text-amber-400 absolute right-3 top-2.5" />
                <input
                  type="time"
                  required
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  className="w-full pr-9 pl-3 py-2 bg-black/60 border border-white/10 rounded-xl text-amber-300 font-mono font-bold focus:border-emerald-500 focus:outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* Deposits, Verification Check, Status */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-black/40 p-3 rounded-2xl border border-white/[0.06]">
            <div>
              <label className="block text-slate-300 font-medium mb-1">בלות פקדון (כמות)</label>
              <input
                type="number"
                min="0"
                value={depositBigBags}
                onChange={(e) => setDepositBigBags(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-black/60 border border-white/10 rounded-xl text-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">משטחים פקדון</label>
              <input
                type="number"
                min="0"
                value={depositPallets}
                onChange={(e) => setDepositPallets(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-black/60 border border-white/10 rounded-xl text-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">עמודת בדיקה</label>
              <input
                type="text"
                value={verificationCheck}
                onChange={(e) => setVerificationCheck(e.target.value)}
                placeholder="תקין לשיגור / מאושר"
                className="w-full px-3 py-1.5 bg-black/60 border border-white/10 rounded-xl text-slate-100"
              />
            </div>
            <div className="flex items-center pt-4">
              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-black/60 border border-white/10 w-full hover:border-amber-500/50 transition">
                <input
                  type="checkbox"
                  checked={craneRequired}
                  onChange={(e) => {
                    setCraneRequired(e.target.checked);
                    if (e.target.checked) {
                      setDriver('חכמת (מנוף)');
                      setTruckType('משאית מנוף (זרוע 24 מטר)');
                      setWarehouse('🏭 4️⃣(החרש)');
                    }
                  }}
                  className="w-4 h-4 text-emerald-500 rounded focus:ring-0 bg-slate-900 border-slate-700"
                />
                <span className="font-bold text-amber-300 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  דורש מנוף
                </span>
              </label>
            </div>
          </div>

          {/* Site Contact & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">איש קשר באתר</label>
              <input
                type="text"
                placeholder="שם מנהל עבודה / מפקח"
                value={siteContact}
                onChange={(e) => setSiteContact(e.target.value)}
                className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none transition"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">טלפון איש קשר באתר</label>
              <input
                type="tel"
                placeholder="054-XXXXXXX"
                value={sitePhone}
                onChange={(e) => setSitePhone(e.target.value)}
                className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none font-mono transition"
              />
            </div>
          </div>

          {/* Items List (with Catalog Search Autocomplete) */}
          <div className="space-y-2 pt-2 border-t border-white/[0.08]">
            <div className="flex items-center justify-between">
              <label className="text-slate-200 font-bold flex items-center gap-1.5">
                <Package className="w-4 h-4 text-emerald-400" />
                פריטים וחומרי בניין להזמנה
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => applySmartDispatch()}
                  className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-lg text-[11px] font-bold flex items-center gap-1 transition"
                  title="בצע שיבוץ רכב, נהג, מחסן ופקדונות לפי כללי ח. סבן"
                >
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>שיבוץ חכם נועה AI</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="px-2.5 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-lg text-[11px] font-bold flex items-center gap-1 transition"
                >
                  <Plus className="w-3 h-3" />
                  <span>הוסף שורת פריט</span>
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {items.map((item, idx) => (
                <div key={idx} className="relative flex items-center gap-2 bg-black/40 p-2 rounded-xl border border-white/[0.08]">
                  {/* Name with search dropdown */}
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="שם פריט (הקלד מלט, חול, גבס, 603, סיקה...)"
                      value={item.name}
                      onChange={(e) => {
                        handleItemChange(idx, 'name', e.target.value);
                        setShowCatalogDropdown(idx);
                      }}
                      onFocus={() => setShowCatalogDropdown(idx)}
                      className="w-full px-2.5 py-1.5 bg-black/60 border border-white/10 rounded-lg text-slate-100 focus:border-emerald-500 focus:outline-none"
                    />

                    {/* Catalog Autocomplete */}
                    {showCatalogDropdown === idx && item.name.length > 0 && (
                      <div className="absolute right-0 top-10 z-30 w-72 max-h-48 overflow-y-auto bg-[#0c1017] border border-white/10 rounded-xl shadow-2xl p-1 space-y-0.5 backdrop-blur-xl">
                        {CATALOG_PRODUCTS.filter(
                          (p) =>
                            p.name.toLowerCase().includes(item.name.toLowerCase()) ||
                            p.sku.includes(item.name) ||
                            (p.keywords && p.keywords.toLowerCase().includes(item.name.toLowerCase()))
                        )
                          .slice(0, 8)
                          .map((catItem, catIdx) => (
                            <button
                              key={`${catItem.sku}-${catIdx}`}
                              type="button"
                              onClick={() => handleSelectCatalogItem(idx, catItem)}
                              className="w-full text-right p-2 rounded-lg hover:bg-white/[0.06] text-[11px] flex items-center justify-between text-slate-200"
                            >
                              <span className="font-bold truncate">{catItem.name}</span>
                              <span className="font-mono text-cyan-400">{catItem.sku}</span>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Quantity */}
                  <div className="w-20">
                    <input
                      type="number"
                      min="1"
                      placeholder="כמות"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                      className="w-full px-2 py-1.5 bg-black/60 border border-white/10 rounded-lg text-slate-100 text-center font-mono font-bold"
                    />
                  </div>

                  {/* Unit */}
                  <div className="w-20">
                    <input
                      type="text"
                      placeholder="יח'/שק/בלה"
                      value={item.unit}
                      onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                      className="w-full px-2 py-1.5 bg-black/60 border border-white/10 rounded-lg text-slate-100 text-center"
                    />
                  </div>

                  {/* Remove Item */}
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 transition"
                    title="מחק שורה"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">הערות לוגיסטיות ודגשי פריקה</label>
            <textarea
              rows={2}
              placeholder="לדוגמה: רחוב צר, לתאם חצי שעה לפני, כניסה לחניון עד 2.40 מטר"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 bg-black/60 border border-white/10 rounded-xl text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none transition"
            />
          </div>

          {/* Footer Submit */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 font-semibold border border-white/10 transition"
            >
              ביטול
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-lg shadow-emerald-950/50 transition active:scale-95"
            >
              {editingOrder ? 'עדכן כרטיס הזמנה' : 'שמור והוסף לסידור'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
