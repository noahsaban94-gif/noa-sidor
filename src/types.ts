export type OrderStatus =
  | 'pending' // בסידור עבודה (Pending)
  | 'loading' // בהטענה במחסן (Loading)
  | 'in_transit' // יצא לחלוקה / בדרך (In Progress)
  | 'delivered' // סופק (Delivered)
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
  orderNumber: string; // Order_ID (e.g. 6215184 or SN-4091)
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
  warehouse?: string; // מחסן מקור (🏭 4️⃣(החרש) / 🏟️ 1️⃣(התלמיד))
  totalWeightKg?: number;
  depositDetails?: string;
  deliveryNotePdf?: string; // תעודת משלוח PDF
  customerSignature?: string; // חתימת לקוח
  syncStatus?: boolean; // סנכרון תעודה
  createdAt: string;
  updatedAt: string;
  source?: 'google_sheets' | 'app' | 'whatsapp_ai';
}

export interface CatalogProduct {
  sku: string; // SKU
  name: string; // Official_Name
  category?: string; // Category (e.g. כלי עבודה, חומרי מליטה)
  unit: string; // Unit (יח', שק, בלה)
  keywords?: string; // Keywords for NLP matching
  deposit?: string;
  weightKg?: number;
  warehouse?: string; // מחסן מקור (למשל: 🏭 4️⃣(החרש), 🏟️ 1️⃣(התלמיד))
  defaultDriver?: string;
}

export interface DeliveryNoteItem {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  destination: string;
  driver: string;
  date: string;
  pdfUrl: string;
  customerSignature?: string;
  syncStatus: boolean;
  itemsCount: number;
  totalQuantity: number;
  signedAt?: string;
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
  normalizedItems?: OrderProduct[];
  rawText?: string;
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
