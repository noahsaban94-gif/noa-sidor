import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Phone,
  Video,
  MoreVertical,
  CheckCheck,
  Paperclip,
  Smile,
  Mic,
  Truck,
  FileSpreadsheet,
  Share2,
  ExternalLink,
  Bot,
  MapPin,
  CheckCircle2,
  Navigation,
  Building2,
  Scale
} from 'lucide-react';
import { ChatMessage, OrderItem, CONFIG } from '../types';
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
      id: 'msg-1',
      sender: 'noa',
      text: 'שלום! אני נועה, מנהלת הסידור, השילוח ונרמול ההזמנות שלכם. 🚛✨\nאיך אפשר לעזור היום? אני יכולה לפענח הזמנות בטקסט חופשי לפי "מילון לוגיסטי" ולהזריק אותן מיידית לטאב 2 ב-Google Sheets, לעדכן לו״ז של חכמת ועלי, להפיק דוח בוקר וסיכום יומי לוורד.',
      timestamp: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
      status: 'read',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInjecting, setIsInjecting] = useState<string | null>(null);
  const [injectedOrders, setInjectedOrders] = useState<{ [msgId: string]: OrderItem }>({});
  const [lastWebhookSent, setLastWebhookSent] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

      const noaMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'noa',
        text: data.reply || 'קיבלתי את ההודעה.',
        timestamp: data.timestamp || new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
        status: 'read',
        normalizedItems: data.normalizedItems,
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

  // Direct 1-click injection to Tab 2 (סידור_עבודה_יומי) via /api/gas/insert-order
  const handleDirectInject = async (msgId: string, items: any[], rawText: string) => {
    setIsInjecting(msgId);
    try {
      // Determine destination & customer from text
      const dest = rawText.includes('רעננה')
        ? 'רעננה, אחוזה 140'
        : rawText.includes('הרצליה')
        ? 'הרצליה פיתוח, הנשיא 22'
        : rawText.includes('הוד השרון')
        ? 'הוד השרון, שושנת הכרמל 4'
        : rawText.includes('תל אביב')
        ? 'תל אביב, דיזנגוף 88'
        : 'אתר בניה - מרכז';

      const metrics = calculateOrderMetrics(
        items.map((i) => ({ sku: i.sku, name: i.name, quantity: i.quantity || 1, unit: i.unit || 'יח\'' }))
      );

      const driver = metrics.hasCraneItem ? 'חכמת (מנוף)' : 'עלי (משאית רגילה)';

      const payload = {
        orderNumber: `SN-${Math.floor(1000 + Math.random() * 9000)}`,
        customerName: rawText.includes('יוסי') ? 'יוסי כהן' : rawText.includes('אבי') ? 'אבי שיפוצים' : 'לקוח נועה AI',
        destination: dest,
        deliveryTime: '10:30',
        driver,
        craneRequired: metrics.hasCraneItem,
        warehouse: metrics.warehouse,
        items: items.map((it) => ({
          sku: it.sku,
          name: it.name,
          quantity: it.quantity || 1,
          unit: it.unit || 'יח\'',
        })),
        notes: `שובץ אוטומטית ע"י נועה AI מטקסט: "${rawText}" | פקדון: ${metrics.depositDetails}`,
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
      console.error('Direct injection error:', err);
    } finally {
      setIsInjecting(null);
    }
  };

  const handleSendToWhatsAppWebhook = async (text: string, target: 'make' | 'joni' = 'make') => {
    onSendToWebhook(text, target);
    setLastWebhookSent(text);
    setTimeout(() => setLastWebhookSent(null), 4000);
  };

  const quickPills = [
    '📦 תביא לי 20 מלט ו-3 בלות חול להרצליה',
    '🌅 הפק דוח בוקר לסידור העבודה',
    '🚛 מה הלו״ז של חכמת (מנוף)?',
    '📦 אילו הזמנות משובצות לעלי?',
    '⏳ בדוק הזמנות שטרם סופקו',
    '📱 נסח הודעת עדכון לוורד',
  ];

  return (
    <div className="h-[calc(100vh-140px)] min-h-[580px] max-w-5xl mx-auto flex flex-col rounded-3xl bg-[#06080e]/95 border border-white/[0.08] shadow-2xl backdrop-blur-2xl overflow-hidden">
      {/* Sophisticated Dark Chat Header */}
      <div className="bg-[#0b0f19] px-4 py-3.5 border-b border-white/[0.08] flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={CONFIG.noaAvatarUrl}
              alt="נועה AI"
              className="w-11 h-11 rounded-full object-cover border-2 border-emerald-500/80 shadow-md shadow-emerald-500/30"
            />
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#0b0f19]" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm text-slate-100">נועה AI - סידור ולוגיסטיקה</h2>
              <span className="text-[10px] bg-emerald-500/15 text-emerald-300 font-mono px-2 py-0.5 rounded-full border border-emerald-500/30">
                Google Sheets & Webhooks
              </span>
            </div>
            <p className="text-xs text-emerald-400 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              מחוברת אונליין • פענוח שפה חופשית והזרקה לטאב 2
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 text-slate-300">
          <a
            href={`https://api.whatsapp.com/send?phone=972508860896&text=${encodeURIComponent('היי ורד, הודעה מסידור-נועה')}`}
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-emerald-400 border border-white/10 transition"
            title="פתח צ'אט ישיר עם ורד בוואטסאפ"
          >
            <Phone className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Chat Wallpaper & Message Stream */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#05070c] relative"
        style={{
          backgroundImage: `radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.04) 0%, transparent 65%)`,
        }}
      >
        {/* Date Marker */}
        <div className="text-center my-2">
          <span className="bg-white/[0.04] text-slate-400 text-[11px] font-medium px-3 py-1 rounded-full border border-white/[0.08] shadow-sm backdrop-blur-md">
            היום • סידור עבודה חי בזמן אמת
          </span>
        </div>

        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          const injectedOrder = injectedOrders[msg.id];

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-start' : 'items-end'} max-w-[90%] sm:max-w-[80%] ${
                isUser ? 'mr-auto' : 'ml-auto'
              }`}
            >
              <div
                className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-lg relative whitespace-pre-wrap ${
                  isUser
                    ? 'bg-gradient-to-r from-emerald-700 to-teal-700 text-slate-100 rounded-tr-none border border-emerald-500/40'
                    : 'bg-white/[0.05] text-slate-100 rounded-tl-none border border-white/[0.1] backdrop-blur-xl'
                }`}
              >
                {!isUser && (
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-bold mb-1">
                    <Bot className="w-3.5 h-3.5" />
                    נועה AI
                  </div>
                )}

                <div className="text-slate-100">{msg.text}</div>

                {/* Normalized Items Card if present */}
                {msg.normalizedItems && msg.normalizedItems.length > 0 && (
                  <div className="mt-3 p-3 rounded-xl bg-black/50 border border-emerald-500/30 text-xs space-y-2.5">
                    <div className="flex items-center justify-between text-emerald-400 font-bold border-b border-white/10 pb-1.5">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>נרמול מילון לוגיסטי ({msg.normalizedItems.length} פריטים שפוענחו)</span>
                      </span>
                      <span className="text-[10px] text-cyan-300 font-mono">טאב 1 זוהה</span>
                    </div>

                    <div className="space-y-1.5">
                      {msg.normalizedItems.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-slate-200 text-[11px] bg-white/[0.02] p-1.5 rounded border border-white/5">
                          <span className="font-mono text-cyan-300">[{item.sku}] {item.name}</span>
                          <span className="font-bold text-emerald-300">{item.quantity} {item.unit}</span>
                        </div>
                      ))}
                    </div>

                    {/* Single-Click Instant Injection Button to Tab 2 */}
                    {!injectedOrder ? (
                      <button
                        onClick={() => handleDirectInject(msg.id, msg.normalizedItems || [], msg.rawText || '')}
                        disabled={isInjecting === msg.id}
                        className="w-full mt-2 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60 transition active:scale-95 disabled:opacity-50"
                      >
                        <Truck className="w-4 h-4" />
                        <span>
                          {isInjecting === msg.id
                            ? 'מזריק כעת לטאב 2 (סידור_עבודה_יומי)...'
                            : '⚡ אשר והזרק מיידית לסידור עבודה (טאב 2)'}
                        </span>
                      </button>
                    ) : (
                      <div className="mt-2 p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/50 space-y-2">
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

                {/* WhatsApp Timestamp and Blue Ticks */}
                <div className="flex items-center justify-end gap-1 mt-1.5 text-[10px] text-slate-400 select-none">
                  <span>{msg.timestamp}</span>
                  {isUser && <CheckCheck className="w-3.5 h-3.5 text-sky-300" />}
                </div>
              </div>

              {/* Action pill below Noa message (Direct send to Webhook) */}
              {!isUser && msg.text.length > 30 && (
                <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => handleSendToWhatsAppWebhook(msg.text, 'make')}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 transition active:scale-95"
                    title="שדר ישירות לוורד דרך Make Webhook"
                  >
                    <Send className="w-3 h-3 text-emerald-400" />
                    <span>שדר לוורד (Make Webhook)</span>
                  </button>

                  <button
                    onClick={() => handleSendToWhatsAppWebhook(msg.text, 'joni')}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5 transition active:scale-95"
                    title="שדר ל-JONI RTDB Webhook"
                  >
                    <Share2 className="w-3 h-3 text-cyan-400" />
                    <span>JONI RTDB</span>
                  </button>

                  <a
                    href={`https://api.whatsapp.com/send?phone=972508860896&text=${encodeURIComponent(msg.text)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/10 flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>פתח בוואטסאפ</span>
                  </a>
                </div>
              )}
            </div>
          );
        })}

        {/* Loading Bubble */}
        {isLoading && (
          <div className="flex items-center gap-2 bg-white/[0.05] p-3 rounded-2xl rounded-tl-none border border-white/10 w-36 ml-auto shadow-md backdrop-blur-xl">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" />
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.2s]" />
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.4s]" />
            <span className="text-xs text-slate-400 mr-2 font-medium">נועה מקלידה...</span>
          </div>
        )}

        {/* Success Webhook Notification Toast */}
        {lastWebhookSent && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full bg-emerald-600 text-white font-bold text-xs shadow-xl flex items-center gap-2 border border-emerald-400 backdrop-blur-md">
            <CheckCheck className="w-4 h-4" />
            <span>ההודעה שודרה בהצלחה לווביהוק הוואטסאפ!</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Pills Carousel */}
      <div className="px-3 py-2 bg-[#090d16] border-t border-white/[0.08] flex items-center gap-2 overflow-x-auto no-scrollbar">
        {quickPills.map((pill, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(pill)}
            className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border border-white/10 transition active:scale-95"
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
          placeholder="הקלד הודעה לנועה AI (לדוגמה: תביא 20 מלט ו-3 בלות חול להרצליה)..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-black/50 border border-white/10 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none transition"
        />

        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white shadow-lg shadow-emerald-950/50 transition active:scale-95"
          title="שלח הודעה"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
