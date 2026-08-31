import React from 'react';
import { Truck, Menu, Sparkles, RefreshCw, Send, Sheet, ShieldCheck, Download } from 'lucide-react';
import { CONFIG } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  ordersCount: number;
  onOpenNewOrder: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  sidebarOpen,
  setSidebarOpen,
  onRefresh,
  isRefreshing,
  ordersCount,
  onOpenNewOrder,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full bg-[#07090e]/85 backdrop-blur-xl border-b border-white/[0.08] px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Left: Hamburger & Brand */}
        <div className="flex items-center gap-3">
          <button
            id="btn-toggle-sidebar"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border border-white/10 transition active:scale-95"
            title="פתח/סגור תפריט"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab('orders')}>
            <div className="relative">
              <img
                src={CONFIG.noaAvatarUrl}
                alt="נועה AI"
                className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500/80 shadow-md shadow-emerald-500/30"
              />
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#07090e] animate-pulse" />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                  סידור-נועה
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  AI Live
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium hidden sm:block">
                מערכת סידור עבודה, שילוח וסנכרון Sheets
              </p>
            </div>
          </div>
        </div>

        {/* Center: Live Sync Tag */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-md text-xs text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-slate-400">גליון מחובר:</span>
          <span className="font-mono text-emerald-400 font-medium">1VA9J...nCkoA</span>
          <span className="text-slate-600">|</span>
          <span className="text-amber-400 font-semibold">{ordersCount} הזמנות להיום</span>
        </div>

        {/* Right: Quick actions */}
        <div className="flex items-center gap-2">
          <button
            id="btn-refresh-orders"
            onClick={onRefresh}
            disabled={isRefreshing}
            className={`p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/10 transition active:scale-95 ${
              isRefreshing ? 'animate-spin text-emerald-400' : ''
            }`}
            title="רענן הזמנות מול השרת"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            id="btn-quick-chat-noa"
            onClick={() => setActiveTab('chat')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition active:scale-95"
          >
            <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="hidden sm:inline">צ'אט נועה AI</span>
          </button>

          <button
            id="btn-new-order-navbar"
            onClick={onOpenNewOrder}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/50 transition active:scale-95"
          >
            <span>+</span>
            <span>הזמנה חדשה</span>
          </button>
        </div>
      </div>
    </header>
  );
};
