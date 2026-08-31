import React from 'react';
import {
  LayoutDashboard,
  Clock,
  MessageSquare,
  FileSpreadsheet,
  PackageSearch,
  Settings,
  PhoneCall,
  ExternalLink,
  ChevronLeft,
  X,
  Truck,
  Sparkles,
  Sheet
} from 'lucide-react';
import { CONFIG } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  pendingCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpen,
  setIsOpen,
  pendingCount,
}) => {
  const menuItems = [
    {
      id: 'orders',
      label: 'דשבורד הזמנות חי',
      icon: LayoutDashboard,
      badge: pendingCount > 0 ? `${pendingCount}` : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    },
    {
      id: 'timeline',
      label: 'ציר שעות וחלוקה',
      icon: Clock,
    },
    {
      id: 'chat',
      label: 'צ\'אט נועה AI (וואטסאפ)',
      icon: MessageSquare,
      highlight: true,
    },
    {
      id: 'reports',
      label: 'דוחות בוקר וסיכום',
      icon: FileSpreadsheet,
    },
    {
      id: 'catalog',
      label: 'קטלוג חומרים (מק"טים)',
      icon: PackageSearch,
    },
    {
      id: 'settings',
      label: 'חיבורים והגדרות Webhook',
      icon: Settings,
    },
  ];

  const handleSelectTab = (id: string) => {
    setActiveTab(id);
    if (window.innerWidth < 1024) {
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 right-0 h-full z-50 w-72 bg-[#06080e]/95 border-l border-white/[0.08] flex flex-col justify-between transition-transform duration-300 ease-in-out backdrop-blur-2xl ${
          isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        } ${!isOpen ? 'lg:w-20' : 'lg:w-72'}`}
      >
        {/* Header */}
        <div>
          <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
            <div className={`flex items-center gap-3 overflow-hidden ${!isOpen ? 'lg:justify-center' : ''}`}>
              <div className="relative flex-shrink-0">
                <img
                  src={CONFIG.noaAvatarUrl}
                  alt="נועה"
                  className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500/90 shadow-md shadow-emerald-500/20"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#06080e]" />
              </div>

              {(isOpen || window.innerWidth < 1024) && (
                <div className="min-w-0">
                  <h2 className="font-bold text-sm text-slate-100 truncate">נועה - סידור עבודה</h2>
                  <p className="text-xs text-emerald-400 font-medium truncate">מחוברת אונליין</p>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  id={`nav-item-${item.id}`}
                  onClick={() => handleSelectTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 relative ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 shadow-sm shadow-emerald-950/40'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                  } ${!isOpen ? 'lg:justify-center lg:px-2' : ''}`}
                  title={item.label}
                >
                  <Icon
                    className={`w-5 h-5 flex-shrink-0 ${
                      isActive ? 'text-emerald-400' : item.highlight ? 'text-emerald-400 animate-pulse' : 'text-slate-400'
                    }`}
                  />

                  {(isOpen || window.innerWidth < 1024) && (
                    <span className="truncate flex-1 text-right">{item.label}</span>
                  )}

                  {(isOpen || window.innerWidth < 1024) && item.badge && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-bold border ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  )}

                  {(isOpen || window.innerWidth < 1024) && item.highlight && !isActive && (
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer with Quick Info & Actions */}
        {(isOpen || window.innerWidth < 1024) ? (
          <div className="p-4 border-t border-white/[0.08] space-y-3 bg-black/20">
            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.08] text-xs text-slate-300 space-y-1.5">
              <div className="flex items-center justify-between text-slate-400">
                <span>ורד (ניהול סידור):</span>
                <a
                  href={`https://api.whatsapp.com/send?phone=972508860896&text=${encodeURIComponent('היי ורד, פותחת עדכון מסידור-נועה')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 hover:underline flex items-center gap-1 font-mono font-bold"
                >
                  <PhoneCall className="w-3 h-3" />
                  050-886-0896
                </a>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>גליון Google Sheets:</span>
                <a
                  href={`https://docs.google.com/spreadsheets/d/${CONFIG.spreadsheetId}/edit`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-400 hover:underline flex items-center gap-1 font-mono"
                >
                  <ExternalLink className="w-3 h-3" />
                  פתח גליון
                </a>
              </div>
            </div>

            <div className="text-center">
              <p className="text-[11px] text-slate-500">סידור-נועה PWA &copy; 2026</p>
            </div>
          </div>
        ) : (
          <div className="p-3 border-t border-white/[0.08] flex justify-center">
            <a
              href={`https://docs.google.com/spreadsheets/d/${CONFIG.spreadsheetId}/edit`}
              target="_blank"
              rel="noreferrer"
              className="p-2 text-slate-400 hover:text-cyan-400 rounded-lg hover:bg-white/10 transition"
              title="פתח Google Sheets"
            >
              <Sheet className="w-5 h-5" />
            </a>
          </div>
        )}
      </aside>
    </>
  );
};
