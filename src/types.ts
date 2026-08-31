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
  // 1. מספר הזמנה
  orderNumber: string;
  // 2. שם לקוח
  customerName: string;
  // 3. מספר לקוח
  customerNumber?: string;
  customerPhone?: string;
  // 4. כתובת אתר / יעד
  destination: string;
  // 5. עיר
  city?: string;
  // 6. מחסן יציאה
  warehouse?: string; // (🏭 4️⃣(החרש) / 🏟️ 1️⃣(התלמיד))
  // 7. נהג משובץ
  driver: string;
  // 8. סוג משאית / מנוף
  truckType?: string; // משאית מנוף / משאית רגילה פתוחה / משאית סגורה
  craneRequired?: boolean;
  // 9. שעת אספקה
  deliveryTime: string; // HH:mm
  // 10. משקל כולל (טון)
  totalWeightTons?: number;
  totalWeightKg?: number;
  // 11. פירוט פריטים ומק"טים
  items: OrderProduct[];
  // 12. בלות פקדון
  depositBigBags?: number;
  // 13. משטחים פקדון
  depositPallets?: number;
  depositDetails?: string;
  // 14. סטטוס ביצוע
  status: OrderStatus;
  // 15. קישור Waze
  wazeUrl?: string;
  // 16. קובץ הזמנה (Drive)
  driveFileUrl?: string;
  deliveryNotePdf?: string;
  // 17. זמן עדכון אחרון
  updatedAt: string;
  createdAt: string;
  // 18. בדיקה
  verificationCheck?: string; // תקין לשיגור / נדרש תיאום מנוף / מאושר ע"י ורד / ממתין לחתימה

  // שדות עזר נוספים
  floor?: string;
  siteContact?: string;
  sitePhone?: string;
  notes?: string;
  customerSignature?: string;
  syncStatus?: boolean;
  source?: 'google_sheets' | 'app' | 'whatsapp_ai';
}

// 18-Column Google Sheets Tab 2 Row Representation
export interface GasTabOrderRow {
  'מספר הזמנה': string;
  'שם לקוח': string;
  'מספר לקוח': string;
  'כתובת אתר / יעד': string;
  'עיר': string;
  'מחסן יציאה': string;
  'נהג משובץ': string;
  'סוג משאית / מנוף': string;
  'שעת אספקה': string;
  'משקל כולל (טון)': string;
  'פירוט פריטים ומק"טים': string;
  'בלות פקדון': string;
  'משטחים פקדון': string;
  'סטטוס ביצוע': string;
  'קישור Waze': string;
  'קובץ הזמנה (Drive)': string;
  'זמן עדכון אחרון': string;
  'בדיקה': string;
}

export const GAS_TAB_COLUMNS = [
  'מספר הזמנה',
  'שם לקוח',
  'מספר לקוח',
  'כתובת אתר / יעד',
  'עיר',
  'מחסן יציאה',
  'נהג משובץ',
  'סוג משאית / מנוף',
  'שעת אספקה',
  'משקל כולל (טון)',
  'פירוט פריטים ומק"טים',
  'בלות פקדון',
  'משטחים פקדון',
  'סטטוס ביצוע',
  'קישור Waze',
  'קובץ הזמנה (Drive)',
  'זמן עדכון אחרון',
  'בדיקה',
] as const;

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
  'משאית 02',
  'משאית 09',
  'חכמת / עלי',
  'מוביל חיצוני',
  'ללא שיבוץ',
];

export interface DriverFleetProfile {
  id: string;
  driverName: string;
  vehicleType: string;
  licensePlate: string;
  craneSpec?: string;
  primaryMaterials: string[];
  primaryWarehouse: string;
  description: string;
  icon: string;
}

export const FLEET_PROFILES: DriverFleetProfile[] = [
  {
    id: 'hachmat',
    driverName: 'חכמת',
    vehicleType: 'משאית מרצדס מנוף',
    licensePlate: '615-41-002',
    craneSpec: 'זרוע מנוף 9 מטר / 15 מטר / 24 מטר',
    primaryMaterials: ['בלות חול', 'סומסום', 'טיט מוכן', 'שקי מלט', 'בלוקים', 'משטחים כבדים'],
    primaryWarehouse: '🏭 4️⃣(החרש)',
    description: 'מיועדת להובלות כבדות הדורשות פריקת מנוף לגובה/מרפסות/גגות מחסן 4 (החרש)',
    icon: '🏗️',
  },
  {
    id: 'ali',
    driverName: 'עלי',
    vehicleType: 'משאית רגילה / פתוחה',
    licensePlate: 'משאית עלי',
    craneSpec: 'ללא מנוף (משאית שטוחה/סגורה)',
    primaryMaterials: ['לוחות גבס (לבן/ירוק/כחול)', 'פרופילי מתכת (ניצבים/מסלולים)', 'צבעים', 'דבקים', 'ציוד קל'],
    primaryWarehouse: '🏟️ 1️⃣(התלמיד)',
    description: 'מיועדת להובלות ללא מנוף מחסן 1 (התלמיד) עבור מערכות גבס ומוצרים קלים',
    icon: '🚚',
  },
];
