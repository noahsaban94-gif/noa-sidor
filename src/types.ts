export type OrderStatus =
  | 'pending' // בסידור עבודה
  | 'loading' // בהטענה
  | 'in_transit' // יצא לחלוקה
  | 'delivered' // סופק
  | 'issue' // בעיה / עיכוב
  | 'cancelled'; // בוטל

export interface OrderProduct {
  sku?: string;
  name: string;
  quantity: number;
  unit: string;
  notes?: string;
}

export interface OrderItem {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone?: string;
  destination: string;
  deliveryTime: string; // HH:mm
  driver: string; // "חכמת (מנוף)", "עלי", "חכמת / עלי", "משאית 09" etc.
  status: OrderStatus;
  items: OrderProduct[];
  notes?: string;
  craneRequired?: boolean;
  floor?: string;
  siteContact?: string;
  sitePhone?: string;
  createdAt: string;
  updatedAt: string;
  source?: 'google_sheets' | 'app' | 'whatsapp_ai';
}

export interface CatalogProduct {
  sku: string;
  name: string;
  unit: string;
  keywords?: string;
  deposit?: string;
  weightKg?: number;
  defaultDriver?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'noa' | 'system';
  text: string;
  timestamp: string;
  status?: 'sent' | 'delivered' | 'read';
  actionPrompt?: string;
  suggestedAction?: {
    type: 'send_webhook' | 'create_order' | 'update_time' | 'export_report';
    title: string;
    payload?: any;
  };
  orderData?: Partial<OrderItem>;
}

export interface LogisticsReport {
  id: string;
  type: 'morning' | 'daily_summary' | 'driver_schedule' | 'urgent';
  title: string;
  date: string;
  text: string;
  recipientPhone: string;
  sentAt?: string;
  status: 'draft' | 'sending' | 'sent' | 'failed';
  metrics: {
    total: number;
    pending: number;
    inTransit: number;
    delivered: number;
    delayed: number;
  };
}

export interface SystemConfig {
  spreadsheetId: string;
  veredPhone: string;
  makeWebhookUrl: string;
  joniWebhookUrl: string;
  noaAvatarUrl: string;
}

export const CONFIG: SystemConfig = {
  spreadsheetId: '1VA9J6n9IYcooO_s2xOpnkvyDQWWQD3pfhh0cnenCkoA',
  veredPhone: '+972508860896',
  makeWebhookUrl: 'https://hook.eu1.make.com/j1kfxfn5y4goe1lud3dk1phkw4bkjvyr',
  joniWebhookUrl: 'https://saban-ai-drive-default-rtdb.europe-west1.firebasedatabase.app//joni/send.json',
  noaAvatarUrl: 'https://i.ibb.co/W4v7BK1W/Gemini-Generated-Image-3.png',
};

export const STATUS_MAP: Record<OrderStatus, { label: string; color: string; bg: string; border: string; dot: string }> = {
  pending: {
    label: 'בסידור עבודה',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    dot: 'bg-amber-400',
  },
  loading: {
    label: 'בהטענה במחסן',
    color: 'text-sky-400',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/30',
    dot: 'bg-sky-400 animate-pulse',
  },
  in_transit: {
    label: 'יצא לחלוקה',
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/30',
    dot: 'bg-indigo-400 animate-ping',
  },
  delivered: {
    label: 'סופק בהצלחה',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    dot: 'bg-emerald-400',
  },
  issue: {
    label: 'עיכוב / בעיה',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    dot: 'bg-rose-400 animate-bounce',
  },
  cancelled: {
    label: 'בוטל',
    color: 'text-slate-400',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/30',
    dot: 'bg-slate-400',
  },
};

export const DRIVERS_LIST = [
  'חכמת (מנוף)',
  'עלי (משאית רגילה)',
  'חכמת / עלי',
  'משאית 02',
  'משאית 09',
  'מוביל חיצוני',
  'ללא שיבוץ',
];
