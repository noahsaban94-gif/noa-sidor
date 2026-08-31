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
  Bot
} from 'lucide-react';
import { ChatMessage, OrderItem, CONFIG } from '../types';

interface NoaChatRoomProps {
  orders: OrderItem[];
  onSendToWebhook: (message: string, target?: 'make' | 'joni') => void;
}

export const NoaChatRoom: React.FC<NoaChatRoomProps> = ({ orders, onSendToWebhook }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'noa',
      text: 'שלום! אני נועה, מנהלת הסידור והשילוח שלכם. 🚛✨\nאיך אפשר לעזור היום? אני יכולה לעדכן על מצב הנהגים (חכמת במנוף ועלי), להזיז שעות בסידור, או לייצר עבורך דוח בוקר וסיכום יומי לוורד ולצוות.',
      timestamp: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
      status: 'read',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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

  const handleSendToWhatsAppWebhook = async (text: string, target: 'make' | 'joni' = 'make') => {
    onSendToWebhook(text, target);
    setLastWebhookSent(text);
    setTimeout(() => setLastWebhookSent(null), 4000);
  };

  const quickPills = [
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
                JONI & Make Webhook
              </span>
            </div>
            <p className="text-xs text-emerald-400 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              מחוברת אונליין • מענה מבוסס AI
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
            היום • סידור עבודה חי
          </span>
        </div>

        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-start' : 'items-end'} max-w-[88%] sm:max-w-[78%] ${
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
          placeholder="הקלד הודעה לנועה AI (לדוגמה: מתי חכמת מגיע להרצליה?)..."
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
