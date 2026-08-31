import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Clock,
  MessageSquare,
  FileSpreadsheet,
  PackageSearch,
  Settings,
  Plus,
  RefreshCw,
  Sparkles,
  Truck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { OrderItem, OrderStatus, CONFIG } from './types';
import { INITIAL_ORDERS } from './data/catalog';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { OrdersDashboard } from './components/OrdersDashboard';
import { TimelineView } from './components/TimelineView';
import { NoaChatRoom } from './components/NoaChatRoom';
import { ReportsView } from './components/ReportsView';
import { CatalogView } from './components/CatalogView';
import { SettingsView } from './components/SettingsView';
import { OrderFormModal } from './components/OrderFormModal';
import { WhatsAppShareModal } from './components/WhatsAppShareModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('orders');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [orders, setOrders] = useState<OrderItem[]>(() => {
    const saved = localStorage.getItem('siddur_noa_orders');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_ORDERS;
      }
    }
    return INITIAL_ORDERS;
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<OrderItem | null>(null);
  const [shareOrder, setShareOrder] = useState<OrderItem | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sync with local storage
  useEffect(() => {
    localStorage.setItem('siddur_noa_orders', JSON.stringify(orders));
  }, [orders]);

  // Fetch live orders from server
  const fetchOrders = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        if (data.orders && Array.isArray(data.orders)) {
          setOrders(data.orders);
        }
      }
    } catch (err) {
      console.warn('Server fetch offline, using cached state:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Update order status
  const handleUpdateStatus = async (id: string, newStatus: OrderStatus) => {
    // Optimistic update
    setOrders((prev) =>
      prev.map((o) =>
        o.id === id ? { ...o, status: newStatus, updatedAt: new Date().toISOString() } : o
      )
    );

    try {
      await fetch(`/api/orders/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      showToast('סטטוס ההזמנה עודכן בהצלחה');
    } catch (err) {
      console.warn('Server update error:', err);
    }
  };

  // Update delivery time & driver (Timeline shift)
  const handleUpdateTime = async (id: string, newTime: string, driver?: string) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === id
          ? {
              ...o,
              deliveryTime: newTime,
              ...(driver ? { driver } : {}),
              updatedAt: new Date().toISOString(),
            }
          : o
      )
    );

    try {
      await fetch(`/api/orders/${id}/time`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliveryTime: newTime, driver }),
      });
      showToast(`שעת האספקה עודכנה ל-${newTime}`);
    } catch (err) {
      console.warn('Server update error:', err);
    }
  };

  // Create or Update Order
  const handleSaveOrder = async (orderData: Partial<OrderItem>) => {
    if (orderData.id) {
      // Update
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderData.id
            ? ({ ...o, ...orderData, updatedAt: new Date().toISOString() } as OrderItem)
            : o
        )
      );

      try {
        await fetch(`/api/orders/${orderData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData),
        });
        showToast('ההזמנה עודכנה בהצלחה');
      } catch (err) {
        console.warn('Server update error:', err);
      }
    } else {
      // Create new
      const newOrder: OrderItem = {
        id: `ord-${Date.now()}`,
        orderNumber: `SN-${Math.floor(1000 + Math.random() * 9000)}`,
        customerName: orderData.customerName || 'לקוח חדש',
        customerPhone: orderData.customerPhone || '',
        destination: orderData.destination || 'ללא יעד',
        deliveryTime: orderData.deliveryTime || '09:00',
        driver: orderData.driver || 'חכמת / עלי',
        status: orderData.status || 'pending',
        items: orderData.items || [],
        notes: orderData.notes || '',
        craneRequired: orderData.craneRequired || false,
        floor: orderData.floor || '',
        siteContact: orderData.siteContact || '',
        sitePhone: orderData.sitePhone || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: 'app',
      };

      setOrders((prev) => [newOrder, ...prev]);

      try {
        await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newOrder),
        });
        showToast('כרטיס הזמנה נוסף לסידור');
      } catch (err) {
        console.warn('Server save error:', err);
      }
    }
    setEditingOrder(null);
  };

  // Delete Order
  const handleDeleteOrder = async (id: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== id));
    try {
      await fetch(`/api/orders/${id}`, { method: 'DELETE' });
      showToast('ההזמנה נמחקה מהסידור');
    } catch (err) {
      console.warn('Server delete error:', err);
    }
  };

  // Send WhatsApp Webhook helper
  const handleSendWebhook = async (payload: {
    message: string;
    target: 'make' | 'joni';
    orderId?: string;
    reportType?: string;
  }) => {
    try {
      const res = await fetch('/api/webhook/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          phone: CONFIG.veredPhone,
        }),
      });
      const data = await res.json();
      showToast(
        `ההודעה שודרה בהצלחה ל-${payload.target === 'make' ? 'Make.com' : 'JONI'}!`
      );
      return data;
    } catch (err) {
      showToast('שגיאה בשידור לווביהוק', 'error');
      throw err;
    }
  };

  const pendingCount = orders.filter((o) => o.status === 'pending').length;

  return (
    <div className="min-h-screen bg-[#05070c] text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        onRefresh={fetchOrders}
        isRefreshing={isRefreshing}
        ordersCount={orders.length}
        onOpenNewOrder={() => {
          setEditingOrder(null);
          setIsOrderModalOpen(true);
        }}
      />

      {/* Main Layout (Desktop Sidebar + Content Area) */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
          pendingCount={pendingCount}
        />

        {/* Content Container (Padded according to sidebar state) */}
        <main
          className={`flex-1 transition-all duration-300 p-4 sm:p-6 min-h-[calc(100vh-65px)] ${
            sidebarOpen ? 'lg:mr-72' : 'lg:mr-20'
          }`}
        >
          {activeTab === 'orders' && (
            <OrdersDashboard
              orders={orders}
              onUpdateStatus={handleUpdateStatus}
              onUpdateTime={handleUpdateTime}
              onOpenNewOrder={() => {
                setEditingOrder(null);
                setIsOrderModalOpen(true);
              }}
              onEditOrder={(ord) => {
                setEditingOrder(ord);
                setIsOrderModalOpen(true);
              }}
              onDeleteOrder={handleDeleteOrder}
              onSendWhatsApp={(ord) => setShareOrder(ord)}
              onOpenReports={() => setActiveTab('reports')}
              onOpenChat={() => setActiveTab('chat')}
            />
          )}

          {activeTab === 'timeline' && (
            <TimelineView
              orders={orders}
              onUpdateTime={handleUpdateTime}
              onUpdateStatus={handleUpdateStatus}
              onEditOrder={(ord) => {
                setEditingOrder(ord);
                setIsOrderModalOpen(true);
              }}
              onSendWhatsApp={(ord) => setShareOrder(ord)}
              onOpenNewOrder={() => {
                setEditingOrder(null);
                setIsOrderModalOpen(true);
              }}
            />
          )}

          {activeTab === 'chat' && (
            <NoaChatRoom
              orders={orders}
              onSendToWebhook={(msg, target) =>
                handleSendWebhook({ message: msg, target: target || 'make' })
              }
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView orders={orders} onSendWebhook={handleSendWebhook} />
          )}

          {activeTab === 'catalog' && <CatalogView />}

          {activeTab === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#080c14]/90 border-t border-white/10 backdrop-blur-2xl px-2 py-1.5 flex items-center justify-around lg:hidden">
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-xl text-[10px] font-medium transition ${
            activeTab === 'orders' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>הזמנות</span>
        </button>

        <button
          onClick={() => setActiveTab('timeline')}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-xl text-[10px] font-medium transition ${
            activeTab === 'timeline' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-5 h-5" />
          <span>ציר שעות</span>
        </button>

        {/* Center Chat floating button */}
        <button
          onClick={() => setActiveTab('chat')}
          className="relative -top-3 flex flex-col items-center justify-center w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-950/80 border-2 border-[#080c14] active:scale-90 transition glow-emerald"
        >
          <Sparkles className="w-5 h-5" />
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-xl text-[10px] font-medium transition ${
            activeTab === 'reports' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileSpreadsheet className="w-5 h-5" />
          <span>דוחות</span>
        </button>

        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-xl text-[10px] font-medium transition ${
            activeTab === 'catalog' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <PackageSearch className="w-5 h-5" />
          <span>קטלוג</span>
        </button>
      </div>

      {/* Order Create / Edit Modal */}
      <OrderFormModal
        isOpen={isOrderModalOpen}
        onClose={() => {
          setIsOrderModalOpen(false);
          setEditingOrder(null);
        }}
        onSave={handleSaveOrder}
        editingOrder={editingOrder}
      />

      {/* WhatsApp Share / Webhook Modal */}
      <WhatsAppShareModal
        isOpen={!!shareOrder}
        order={shareOrder}
        onClose={() => setShareOrder(null)}
        onSendWebhook={handleSendWebhook}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2 border backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-[#091511]/90 border-emerald-500/60 text-emerald-200 shadow-emerald-950/50'
              : 'bg-[#1a080c]/90 border-rose-500/60 text-rose-200 shadow-rose-950/50'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}
    </div>
  );
}
