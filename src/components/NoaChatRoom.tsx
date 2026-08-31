import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Phone,
  CheckCheck,
  Truck,
  Share2,
  ExternalLink,
  Bot,
  MapPin,
  CheckCircle2,
  Navigation,
  Building2,
  Scale,
  FolderOpen,
  Volume2,
  Edit3,
  RefreshCw,
  AlertTriangle,
  Clock,
  FileText,
  User,
  Search,
  ChevronDown
} from 'lucide-react';
import { ChatMessage, OrderItem, OrderStatus, CONFIG } from '../types';
import { calculateOrderMetrics, formatWeight } from '../utils/logistics';

interface NoaChatRoomProps {
  orders: OrderItem[];
  onSendToWebhook: (message: string, target?: 'make' | 'joni') => void;
  onAddNormalizedOrder?: (items: any[], rawText: string) => void;
  onOrderInjectedDirectly?: (order: OrderItem) => void;
}

export const NoaChatRoom: React.FC<NoaChatRoomProps> = ({
  orders,
  onSendToWebhook,
  onAddNormalizedOrder,
  onOrderInjectedDirectly,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'noa',
      text: 'שלום! אני נועה AI 🌹, הסדרנית ויד ימינו של ראמי ב"ח. סבן חומרי בניין בע"מ". אני מנהלת את הסידור 24/7, קולטת אימיילים ותעודות מקומקס וגליה, מנרמלת מק"טים לפי המילון הלוגיסטי ומבצעת שיבוץ אוטונומי לצי הרכבים!\n\n🚛 *צי הרכבים והנהגים הרשמי שלנו:*\n1. 🏗️ **חכמת — משאית מרצדס מנוף (רישוי: `615-41-002`)** | מחסן 4 (החרש) — בלות חול/סומסום/טיט, מלט ובלוקים לפריקה לגבהים.\n2. 🚚 **עלי — משאית רגילה (משאית עלי)** | מחסן 1 (התלמיד) — גבס, פרופילים, צבעים ודבקים לפריקה מהירה.\n\n🔍 שאלו אותי על כל לקוח (בזלת, שטיכמוס, ערוגת, שבתי גני, ערן אזולאי), כתובת או הדביקו רשימת חומרים לנרמול!',
      timestamp: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
      status: 'read',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInjecting, setIsInjecting] = useState<string | null>(null);
  const [injectedOrders, setInjectedOrders] = useState<{ [msgId: string]: OrderItem }>({});
  const [lastWebhookSent, setLastWebhookSent] = useState<string | null>(null);
  const [editingStatusOrderId, setEditingStatusOrderId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickPills = [
    '🔍 סטטוס בזלת מזר (שיבת ציון 12)',
    '⚠️ חריגת שבתי גני (חוסר 11 שקים)',
    '🛑 חסימת ערן אזולאי בתל אביב',
    '📋 סטטוס שטיכמוס (רעננה)',
    '🌿 ערוגת הבושם (רעננה)',
    '🏗️ לו״ז חכמת מנוף (615-41-002)',
    '🚚 לו״ז עלי (משאית רגילה)',
    '📦 נרמל: 3 בלות סומסום ו-25 שקי מלט',
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query }),
      });
      const data = await res.json();

      // Client-side fuzzy check on orders if backend didn't attach
      let clientMatched: OrderItem[] | undefined = data.matchedOrders;
      if (!clientMatched || clientMatched.length === 0) {
        const qLower = query.toLowerCase().replace(/[-\s]/g, '');
        const found = orders.filter((o) => {
          const name = o.customerName.toLowerCase().replace(/[-\s]/g, '');
          const dest = o.destination.toLowerCase().replace(/[-\s]/g, '');
          const cNum = (o.customerNumber || '').toLowerCase();
          const phone = (o.customerPhone || '').replace(/[-\s]/g, '');
          const oNum = o.orderNumber.toLowerCase();

          return (
            name.includes(qLower) ||
            qLower.includes(name.slice(0, 4)) ||
            dest.includes(qLower) ||
            oNum.includes(qLower) ||
            (phone && qLower.includes(phone)) ||
            (qLower.includes('בזלת') && name.includes('בזלת')) ||
            (qLower.includes('שטיכמוס') && name.includes('שטיכמוס')) ||
            (qLower.includes('ערוגת') && (name.includes('ערוגת') || dest.includes('ערוגת'))) ||
            (qLower.includes('שבתי') && name.includes('שבתי')) ||
            (qLower.includes('אזולאי') && name.includes('אזולאי')) ||
            (qLower.includes('שיבת ציון') && dest.includes('שיבת ציון'))
          );
        });
        if (found.length > 0) clientMatched = found;
      }

      const noaMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'noa',
        text: data.reply || 'קיבלתי את ההודעה.',
        timestamp: data.timestamp || new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
        status: 'read',
        normalizedItems: data.normalizedItems,
        matchedOrders: clientMatched,
        rawText: query,
      };

      setMessages((prev) => [...prev, noaMsg]);
    } catch (err) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now() + 1}`,
          sender: 'noa',
          text: 'סליחה, אירעה שגיאה בחיבור. אנא נסה שוב.',
          timestamp: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Direct 1-click injection to Tab 2 (סידור_עבודה_יומי)
  const handleDirectInject = async (msgId: string, items: any[], rawText: string) => {
    setIsInjecting(msgId);
    try {
      const dest = rawText.includes('רעננה')
        ? 'רעננה, אחוזה 140'
        : rawText.includes('הרצליה')
        ? 'הרצליה, שיבת ציון 12'
        : rawText.includes('הוד השרון')
        ? 'הוד השרון, שושנת הכרמל 12'
        : rawText.includes('תל אביב')
        ? 'תל אביב, דיזנגוף 210'
        : 'אתר בניה מרכז';

      const metrics = calculateOrderMetrics(
        items.map((i) => ({ sku: i.sku, name: i.name, quantity: i.quantity || 1, unit: i.unit || 'יח\'' }))
      );

      const driver = metrics.hasCraneItem ? 'חכמת (מנוף)' : 'עלי (משאית רגילה)';
      const truckType = metrics.hasCraneItem ? 'משאית מרצדס מנוף (615-41-002)' : 'משאית רגילה (משאית עלי)';

      const payload = {
        orderNumber: `SN-${Math.floor(1000 + Math.random() * 9000)}`,
        customerName: rawText.includes('יוסי')
          ? 'יוסי כהן'
          : rawText.includes('בזלת')
          ? 'בזלת מזר - הנדסה ובניה'
          : rawText.includes('שטיכמוס')
          ? 'שטיכמוס - עבודות גמר'
          : rawText.includes('ערוגת')
          ? 'ערוגת הבושם'
          : 'לקוח קומקס / נועה AI',
        destination: dest,
        deliveryTime: '11:30',
        driver,
        truckType,
        craneRequired: metrics.hasCraneItem,
        warehouse: metrics.warehouse,
        items: items.map((it) => ({
          sku: it.sku,
          name: it.name,
          quantity: it.quantity || 1,
          unit: it.unit || 'יח\'',
        })),
        notes: `שובץ אוטומטית ע"י נועה AI | פקדונות: ${metrics.depositDetails}`,
        status: 'pending',
      };

      const res = await fetch('/api/gas/insert-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success && data.order) {
        setInjectedOrders((prev) => ({ ...prev, [msgId]: data.order }));
        if (onOrderInjectedDirectly) {
          onOrderInjectedDirectly(data.order);
        }
      }
    } catch (err) {
      console.error('Injection error:', err);
    } finally {
      setIsInjecting(null);
    }
  };

  const handleSendToWhatsAppWebhook = (text: string, target: 'make' | 'joni' = 'make') => {
    onSendToWebhook(text, target);
    setLastWebhookSent(target);
    setTimeout(() => setLastWebhookSent(null), 3000);
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setEditingStatusOrderId(null);
        // Refresh by sending feedback in chat
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-status-${Date.now()}`,
            sender: 'noa',
            text: `✅ סטטוס ההזמנה עודכן בהצלחה ל: "${newStatus === 'delivered' ? 'סופק במלואו ✅' : newStatus === 'issue' ? 'נעצר לבקרה ⚠️' : 'בסידור עבודה ⏳'}" וסונכרן ל-Google Sheets ולקומקס!`,
            timestamp: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
            status: 'read',
          },
        ]);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const renderStatusBadge = (status: OrderStatus) => {
    if (status === 'delivered') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          סופק במלואו ✅
        </span>
      );
    }
    if (status === 'issue' || status === 'cancelled') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          נעצר לבקרה ⚠️
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
        <Clock className="w-3.5 h-3.5 text-amber-400" />
        בסידור עבודה ⏳
      </span>
    );
  };

  return (
    <div className="flex flex-col h-[750px] max-h-[82vh] bg-[#0c1017] rounded-3xl border border-white/[0.08] shadow-2xl overflow-hidden backdrop-blur-xl">
      {/* Header Bar */}
      <div className="p-3.5 sm:p-4 bg-gradient-to-r from-[#0d1424] via-[#09101d] to-[#070b14] border-b border-white/[0.08] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 p-0.5 shadow-lg shadow-emerald-950/60">
              <div className="w-full h-full bg-[#090d16] rounded-[14px] flex items-center justify-center">
                <Bot className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#090d16]" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                <span>נועה AI 🌹</span>
                <span className="text-[11px] font-normal text-slate-400">| סדרנית ויד ימינו של ראמי</span>
              </h2>
              <span className="text-[10px] bg-emerald-500/15 text-emerald-300 font-mono px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold">
                SabanOS 24/7 Autonomy
              </span>
            </div>
            <p className="text-xs text-emerald-400 font-medium flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>פענוח OCR מקומקס וגליה • שיבוץ חכמת (מנוף 615-41-002) ועלי</span>
            </p>
          </div>
        </div>

        {/* Header Quick Links */}
        <div className="flex items-center gap-2 text-slate-300">
          <a
            href={`https://api.whatsapp.com/send?phone=972508860896&text=${encodeURIComponent('היי ורד, הודעה מנועה AI - סידור ח. סבן')}`}
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-emerald-400 border border-white/10 transition"
            title="פתח צ'אט עם ורד"
          >
            <Phone className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Message Stream */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#06080e] relative"
        style={{
          backgroundImage: `radial-gradient(circle at 50% 30%, rgba(16, 185, 129, 0.03) 0%, transparent 70%)`,
        }}
      >
        <div className="text-center my-1">
          <span className="bg-white/[0.04] text-slate-400 text-[11px] font-medium px-3.5 py-1 rounded-full border border-white/[0.08] shadow-sm backdrop-blur-md">
            היום • 24/7 SabanOS Autonomous Dispatch & Recon
          </span>
        </div>

        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          const injectedOrder = injectedOrders[msg.id];
          const matchedOrders = msg.matchedOrders || [];

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-start' : 'items-end'} max-w-[95%] sm:max-w-[85%] ${
                isUser ? 'mr-auto' : 'ml-auto'
              }`}
            >
              <div
                className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xl relative whitespace-pre-wrap ${
                  isUser
                    ? 'bg-gradient-to-r from-emerald-700 to-teal-700 text-slate-100 rounded-tr-none border border-emerald-500/40'
                    : 'bg-[#0f1422] text-slate-100 rounded-tl-none border border-white/[0.1] backdrop-blur-xl'
                }`}
              >
                {!isUser && (
                  <div className="flex items-center justify-between text-[11px] text-emerald-400 font-bold mb-2 border-b border-white/[0.06] pb-1.5">
                    <span className="flex items-center gap-1.5">
                      <Bot className="w-3.5 h-3.5 text-emerald-400" />
                      <span>נועה AI 🌹</span>
                    </span>
                    <span className="text-[10px] text-cyan-400 font-mono">ח. סבן חומרי בניין בע"מ</span>
                  </div>
                )}

                {/* Primary Message Text */}
                <div className="text-slate-100 font-sans text-xs sm:text-sm leading-relaxed">{msg.text}</div>

                {/* 🔍 MATCHED ORDERS / CLIENT RECOGNITION CARDS */}
                {matchedOrders.length > 0 && (
                  <div className="mt-4 space-y-3">
                    <div className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                      <Search className="w-3.5 h-3.5 text-cyan-400" />
                      <span>נמצאו {matchedOrders.length} הזמנות מתאימות ללקוח:</span>
                    </div>

                    {matchedOrders.map((order) => {
                      const driveFolderLink = `https://drive.google.com/drive/search?q=${encodeURIComponent(order.customerName)}`;
                      const whatsappText = `🚚 *שיבוץ אספקה - ח. סבן*\nלקוח: *${order.customerName}*\nיעד: *${order.destination}*\nשעה: *${order.deliveryTime}*\nנהג: *${order.driver}*\nסוג: *${order.truckType}*\nמחסן: *${order.warehouse}*\nפריטים: ${order.items.map((i) => `${i.name} (${i.quantity} ${i.unit})`).join(', ')}\nפקדונות: ${order.depositDetails || 'ללא'}\n📍 ניווט Waze: https://waze.com/ul?q=${encodeURIComponent(order.destination)}&navigate=yes`;

                      return (
                        <div
                          key={order.id}
                          className="p-3.5 rounded-2xl bg-black/60 border border-emerald-500/30 text-xs space-y-3 shadow-lg"
                        >
                          {/* Order Header & Status Badge */}
                          <div className="flex items-start justify-between gap-2 flex-wrap border-b border-white/10 pb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-sm">{order.customerName}</span>
                                <span className="font-mono text-cyan-300 text-[11px] bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
                                  #{order.orderNumber}
                                </span>
                              </div>
                              <p className="text-slate-400 text-[11px] mt-0.5 flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-emerald-400" />
                                <span>{order.destination} ({order.city})</span>
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {renderStatusBadge(order.status)}
                            </div>
                          </div>

                          {/* Logistics Breakdown Table */}
                          <div className="rounded-xl overflow-hidden border border-white/10">
                            <table className="w-full text-right text-[11px]">
                              <thead className="bg-white/[0.05] text-slate-300 border-b border-white/10 font-bold">
                                <tr>
                                  <th className="p-2">מק"ט</th>
                                  <th className="p-2">פריט</th>
                                  <th className="p-2">כמות</th>
                                  <th className="p-2">משקל / פקדון</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5 bg-black/30">
                                {order.items.map((it, idx) => (
                                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white/[0.015]' : 'bg-transparent'}>
                                    <td className="p-2 font-mono text-cyan-300 font-bold">{it.sku}</td>
                                    <td className="p-2 text-slate-100 font-medium">{it.name}</td>
                                    <td className="p-2 font-bold text-emerald-400">{it.quantity} {it.unit}</td>
                                    <td className="p-2 text-slate-400">
                                      {it.unit === 'בלה' || it.name.includes('חול') ? 'שק 60002' : it.name.includes('מלט') ? 'משטח 60060' : '-'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* Fleet & Dispatch Meta Row */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                            <div>
                              <span className="text-slate-400 block text-[10px]">נהג משובץ</span>
                              <span className="font-bold text-slate-200 flex items-center gap-1">
                                <Truck className="w-3 h-3 text-cyan-400" />
                                {order.driver}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">סוג רכב</span>
                              <span className="font-medium text-slate-300 truncate block">{order.truckType}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">מחסן יציאה</span>
                              <span className="font-bold text-emerald-300">{order.warehouse}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">משקל כולל</span>
                              <span className="font-mono text-slate-200 font-bold">{order.totalWeightTons} טון</span>
                            </div>
                          </div>

                          {/* Exception or Notes Interception */}
                          {order.notes && (
                            <div className="p-2 rounded-xl bg-amber-950/20 border border-amber-500/30 text-[11px] text-amber-300 flex items-start gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                              <span>{order.notes}</span>
                            </div>
                          )}

                          {/* 💬 WHATSAPP DISPATCH PREVIEW BOX */}
                          <div className="p-2.5 rounded-xl bg-[#09101d] border border-emerald-500/20 space-y-1.5">
                            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                              <span className="flex items-center gap-1 text-emerald-400 font-bold">
                                <span>📲 תצוגה מקדימה לשיגור וואטסאפ:</span>
                              </span>
                              <span>נמען: {order.driver}</span>
                            </div>
                            <div className="p-2 rounded-lg bg-black/50 text-[11px] font-mono text-slate-300 leading-relaxed border border-white/5">
                              <p className="text-emerald-300 font-bold">🚚 הזמנה #{order.orderNumber} - {order.customerName}</p>
                              <p>📍 יעד: {order.destination}</p>
                              <p>🕒 אספקה: {order.deliveryTime} | 🏢 {order.warehouse}</p>
                              <p className="text-cyan-400">🔗 Waze: {order.wazeUrl}</p>
                            </div>
                          </div>

                          {/* 🚀 ACTIVE IN-CHAT ACTION BUTTONS */}
                          <div className="flex items-center gap-2 flex-wrap pt-1">
                            {/* Send WhatsApp */}
                            <a
                              href={`https://api.whatsapp.com/send?phone=972508860896&text=${encodeURIComponent(whatsappText)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold flex items-center gap-1.5 transition active:scale-95"
                            >
                              <Send className="w-3 h-3 text-emerald-400" />
                              <span>📲 שגר וואטסאפ לנהג</span>
                            </a>

                            {/* Audio Briefing */}
                            <button
                              onClick={() => handleSendToWhatsAppWebhook(`🔊 תדריך קולי אוטומטי להזמנה #${order.orderNumber} עבור ${order.driver}: ${order.items.map((i) => `${i.quantity} ${i.name}`).join(', ')} ביעד ${order.destination}`, 'make')}
                              className="px-3 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-[11px] font-bold flex items-center gap-1.5 transition active:scale-95"
                            >
                              <Volume2 className="w-3 h-3 text-cyan-400" />
                              <span>🔊 הפק תדריך קולי (Make/JONI)</span>
                            </button>

                            {/* Update Status Inline */}
                            <button
                              onClick={() => setEditingStatusOrderId(editingStatusOrderId === order.id ? null : order.id)}
                              className="px-3 py-1.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold flex items-center gap-1.5 transition active:scale-95"
                            >
                              <Edit3 className="w-3 h-3 text-amber-400" />
                              <span>📝 עדכן סטטוס אספקה</span>
                            </button>

                            {/* Drive Folder */}
                            <a
                              href={driveFolderLink}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-[11px] font-bold flex items-center gap-1.5 transition active:scale-95"
                            >
                              <FolderOpen className="w-3 h-3 text-indigo-400" />
                              <span>📁 תיקיית לקוח בדרייב</span>
                            </a>
                          </div>

                          {/* Inline Status Dropdown Editor */}
                          {editingStatusOrderId === order.id && (
                            <div className="p-2.5 rounded-xl bg-black/80 border border-amber-500/40 space-y-2 animate-in fade-in">
                              <p className="text-[11px] font-bold text-amber-300">בחר סטטוס חדש לסנכרון מיידי:</p>
                              <div className="flex items-center gap-2 flex-wrap">
                                <button
                                  onClick={() => handleUpdateOrderStatus(order.id, 'delivered')}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold hover:bg-emerald-600/50"
                                >
                                  ✅ סופק במלואו
                                </button>
                                <button
                                  onClick={() => handleUpdateOrderStatus(order.id, 'issue')}
                                  className="px-2.5 py-1 rounded-lg bg-rose-600/30 text-rose-300 border border-rose-500/40 text-[11px] font-bold hover:bg-rose-600/50"
                                >
                                  ⚠️ בעיה / חריגת שטח
                                </button>
                                <button
                                  onClick={() => handleUpdateOrderStatus(order.id, 'in_transit')}
                                  className="px-2.5 py-1 rounded-lg bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-[11px] font-bold hover:bg-indigo-600/50"
                                >
                                  🚚 בדרך ללקוח
                                </button>
                                <button
                                  onClick={() => handleUpdateOrderStatus(order.id, 'loading')}
                                  className="px-2.5 py-1 rounded-lg bg-sky-600/30 text-sky-300 border border-sky-500/40 text-[11px] font-bold hover:bg-sky-600/50"
                                >
                                  ⏳ בהטענה במחסן
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Normalized Items Card if present */}
                {msg.normalizedItems && msg.normalizedItems.length > 0 && (
                  <div className="mt-3 p-3.5 rounded-2xl bg-black/60 border border-emerald-500/40 text-xs space-y-3">
                    <div className="flex items-center justify-between text-emerald-400 font-bold border-b border-white/10 pb-1.5">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                        <span>נרמול מילון לוגיסטי ({msg.normalizedItems.length} פריטים שפוענחו מקומקס)</span>
                      </span>
                      <span className="text-[10px] text-cyan-300 font-mono">טאב 1 זוהה</span>
                    </div>

                    <div className="space-y-1.5">
                      {msg.normalizedItems.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-slate-200 text-[11px] bg-white/[0.03] p-2 rounded-xl border border-white/5">
                          <span className="font-mono text-cyan-300 font-bold">[{item.sku}] {item.name}</span>
                          <span className="font-bold text-emerald-300">{item.quantity} {item.unit}</span>
                        </div>
                      ))}
                    </div>

                    {/* Single-Click Instant Injection Button */}
                    {!injectedOrder ? (
                      <button
                        onClick={() => handleDirectInject(msg.id, msg.normalizedItems || [], msg.rawText || '')}
                        disabled={isInjecting === msg.id}
                        className="w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60 transition active:scale-95 disabled:opacity-50"
                      >
                        <Truck className="w-4 h-4" />
                        <span>
                          {isInjecting === msg.id
                            ? 'מזריק כעת לטאב 2 (סידור_עבודה_יומי)...'
                            : '⚡ אשר והזרק מיידית לסידור עבודה (טאב 2)'}
                        </span>
                      </button>
                    ) : (
                      <div className="mt-2 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/50 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>ההזמנה שובצה בהצלחה בסידור!</span>
                          </span>
                          <span className="font-mono text-cyan-300">#{injectedOrder.orderNumber}</span>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <a
                            href={`https://waze.com/ul?q=${encodeURIComponent(injectedOrder.destination)}&navigate=yes`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold flex items-center justify-center gap-1.5 transition"
                          >
                            <Navigation className="w-3.5 h-3.5 text-cyan-400" />
                            <span>נווט ב-Waze</span>
                          </a>

                          <button
                            onClick={() => handleSendToWhatsAppWebhook(`🚚 הזמנה #${injectedOrder.orderNumber} שובצה בהצלחה ל${injectedOrder.driver} ביעד ${injectedOrder.destination}`)}
                            className="flex-1 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold flex items-center justify-center gap-1.5 transition"
                          >
                            <Send className="w-3.5 h-3.5 text-emerald-400" />
                            <span>שדר לוורד</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Closing Signature for Noa Messages */}
                {!isUser && (
                  <div className="mt-3 pt-2 border-t border-slate-700/40 text-xs text-slate-400 flex items-center justify-between select-none">
                    <span>באהבה ובשירותיות, <strong>נועה ❤️ | סדרנית ויד ימינו של ראמי</strong></span>
                    <span className="text-[10px] text-cyan-400 font-mono">SabanOS 24/7 Autonomy</span>
                  </div>
                )}

                {/* Timestamp & Blue Ticks */}
                <div className="flex items-center justify-end gap-1 mt-1.5 text-[10px] text-slate-400 select-none">
                  <span>{msg.timestamp}</span>
                  {isUser && <CheckCheck className="w-3.5 h-3.5 text-sky-300" />}
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading Bubble */}
        {isLoading && (
          <div className="flex items-center gap-2 bg-[#0f1422] p-3.5 rounded-2xl rounded-tl-none border border-white/10 w-44 ml-auto shadow-md backdrop-blur-xl">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" />
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.2s]" />
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.4s]" />
            <span className="text-xs text-slate-300 mr-2 font-medium">נועה AI מנתחת...</span>
          </div>
        )}

        {/* Webhook Sent Toast */}
        {lastWebhookSent && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full bg-emerald-600 text-white font-bold text-xs shadow-2xl flex items-center gap-2 border border-emerald-400 backdrop-blur-md">
            <CheckCheck className="w-4 h-4" />
            <span>השדר יצא בהצלחה לווביהוק {lastWebhookSent.toUpperCase()}!</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Carousel Pills */}
      <div className="px-3 py-2 bg-[#090d16] border-t border-white/[0.08] flex items-center gap-2 overflow-x-auto no-scrollbar">
        {quickPills.map((pill, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(pill)}
            className="flex-shrink-0 text-xs px-3.5 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border border-white/10 transition active:scale-95 hover:border-emerald-500/40"
          >
            {pill}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 bg-[#0b0f19] border-t border-white/[0.08] flex items-center gap-2"
      >
        <input
          type="text"
          placeholder="שאלו את נועה (למשל: סטטוס בזלת מזר, חריגת שבתי גני, או הדביקו פריטים מקומקס)..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-black/50 border border-white/10 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none transition"
        />

        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white shadow-lg shadow-emerald-950/50 transition active:scale-95 flex items-center gap-1"
          title="שלח הודעה"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
