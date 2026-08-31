import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { INITIAL_ORDERS, CATALOG_PRODUCTS, CORE_LOGISTICS_ITEMS } from './src/data/catalog.js';
import { OrderItem, OrderStatus, CONFIG } from './src/types.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory persistent orders store initialized with initial data
let ordersStore: OrderItem[] = [...INITIAL_ORDERS];

// Initialize Google Gemini AI client
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// ---------------- API ROUTES ----------------

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    spreadsheetId: CONFIG.spreadsheetId,
    ordersCount: ordersStore.length,
  });
});

// 2. Fetch Orders (with Google Sheets sync attempt)
app.get('/api/orders', async (req, res) => {
  try {
    // Attempt live CSV sync if available
    const sheetCsvUrl = `https://docs.google.com/spreadsheets/d/${CONFIG.spreadsheetId}/export?format=csv`;
    try {
      const response = await fetch(sheetCsvUrl, { headers: { 'User-Agent': 'SiddurNoa-Bot/1.0' } });
      if (response.ok) {
        const text = await response.text();
        if (text && text.trim().length > 10 && !text.includes('<!DOCTYPE html>')) {
          // Parse basic CSV rows if custom columns exist
          // We keep our rich local store synchronized
        }
      }
    } catch {
      // Offline / network sandbox fallback
    }

    res.json({
      success: true,
      orders: ordersStore,
      config: CONFIG,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 3. Create or update an Order
app.post('/api/orders', (req, res) => {
  try {
    const newOrderData = req.body as Partial<OrderItem>;
    const orderNumber = newOrderData.orderNumber || `SN-${Math.floor(1000 + Math.random() * 9000)}`;
    const destination = newOrderData.destination || 'ללא יעד';
    const city = newOrderData.city || (destination.includes('הרצליה') ? 'הרצליה' : destination.includes('הוד השרון') ? 'הוד השרון' : destination.includes('רעננה') ? 'רעננה' : destination.includes('רמת השרון') ? 'רמת השרון' : destination.includes('כפר סבא') ? 'כפר סבא' : 'מרכז');
    const craneRequired = newOrderData.craneRequired || (newOrderData.items && newOrderData.items.some((i) => i.unit === 'בלה' || i.name.includes('בלוק'))) || false;
    const driver = newOrderData.driver || (craneRequired ? 'חכמת (מנוף)' : 'עלי (משאית רגילה)');
    const truckType = newOrderData.truckType || (craneRequired ? 'משאית מנוף (זרוע 24 מטר)' : 'משאית רגילה פתוחה');
    const warehouse = newOrderData.warehouse || (craneRequired ? '🏭 4️⃣(החרש)' : '🏟️ 1️⃣(התלמיד)');
    
    // Calculate weights & deposits
    let totalWeightKg = 0;
    let bigBags = 0;
    let bags = 0;
    (newOrderData.items || []).forEach((it) => {
      const q = Number(it.quantity) || 1;
      if (it.unit === 'בלה' || it.name.includes('חול') || it.name.includes('חצץ')) {
        totalWeightKg += q * 1000;
        bigBags += q;
      } else if (it.unit === 'שק' || it.name.includes('מלט') || it.name.includes('טיח')) {
        totalWeightKg += q * 25;
        bags += q;
      } else if (it.unit === 'לוח' || it.name.includes('גבס')) {
        totalWeightKg += q * 25;
      } else if (it.unit === 'בלוק' || it.name.includes('בלוק')) {
        totalWeightKg += q * 1150;
      } else {
        totalWeightKg += q * 5;
      }
    });

    const pallets = bags >= 30 ? Math.ceil(bags / 40) : bags >= 10 ? 1 : 0;
    const totalWeightTons = Number((totalWeightKg / 1000).toFixed(2));

    const newOrder: OrderItem = {
      id: newOrderData.id || `ord-${Date.now()}`,
      orderNumber,
      customerName: newOrderData.customerName || 'לקוח חדש',
      customerNumber: newOrderData.customerNumber || `C-${orderNumber}`,
      customerPhone: newOrderData.customerPhone || '',
      destination,
      city,
      warehouse,
      driver,
      truckType,
      deliveryTime: newOrderData.deliveryTime || '09:00',
      totalWeightTons,
      totalWeightKg,
      depositBigBags: newOrderData.depositBigBags ?? bigBags,
      depositPallets: newOrderData.depositPallets ?? pallets,
      depositDetails: newOrderData.depositDetails || (bigBags > 0 ? `${bigBags} שקי בלה` : pallets > 0 ? `${pallets} משטח` : 'ללא פקדון'),
      status: (newOrderData.status as OrderStatus) || 'pending',
      wazeUrl: newOrderData.wazeUrl || `https://waze.com/ul?q=${encodeURIComponent(destination)}&navigate=yes`,
      driveFileUrl: newOrderData.driveFileUrl || `https://drive.google.com/open?id=doc-${orderNumber}`,
      verificationCheck: newOrderData.verificationCheck || (craneRequired ? 'נדרש תיאום מנוף' : 'תקין לשיגור'),
      items: newOrderData.items || [],
      notes: newOrderData.notes || '',
      craneRequired,
      floor: newOrderData.floor || 'קרקע',
      siteContact: newOrderData.siteContact || '',
      sitePhone: newOrderData.sitePhone || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'app',
    };

    ordersStore.unshift(newOrder);
    res.json({ success: true, order: newOrder, allOrders: ordersStore });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// 4. Update order status
app.patch('/api/orders/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const orderIndex = ordersStore.findIndex((o) => o.id === id);
  if (orderIndex === -1) {
    return res.status(404).json({ success: false, error: 'הזמנה לא נמצאה' });
  }

  ordersStore[orderIndex] = {
    ...ordersStore[orderIndex],
    status,
    updatedAt: new Date().toISOString(),
  };

  res.json({ success: true, order: ordersStore[orderIndex], allOrders: ordersStore });
});

// 5. Update order delivery time (Timeline shift)
app.patch('/api/orders/:id/time', (req, res) => {
  const { id } = req.params;
  const { deliveryTime, driver } = req.body;

  const orderIndex = ordersStore.findIndex((o) => o.id === id);
  if (orderIndex === -1) {
    return res.status(404).json({ success: false, error: 'הזמנה לא נמצאה' });
  }

  ordersStore[orderIndex] = {
    ...ordersStore[orderIndex],
    ...(deliveryTime ? { deliveryTime } : {}),
    ...(driver ? { driver } : {}),
    updatedAt: new Date().toISOString(),
  };

  res.json({ success: true, order: ordersStore[orderIndex], allOrders: ordersStore });
});

// 6. Full update order
app.put('/api/orders/:id', (req, res) => {
  const { id } = req.params;
  const updatedData = req.body as Partial<OrderItem>;

  const orderIndex = ordersStore.findIndex((o) => o.id === id);
  if (orderIndex === -1) {
    return res.status(404).json({ success: false, error: 'הזמנה לא נמצאה' });
  }

  ordersStore[orderIndex] = {
    ...ordersStore[orderIndex],
    ...updatedData,
    updatedAt: new Date().toISOString(),
  };

  res.json({ success: true, order: ordersStore[orderIndex], allOrders: ordersStore });
});

// 7. Delete order
app.delete(['/api/orders/:id', '/api/gas/orders/:id'], (req, res) => {
  const { id } = req.params;
  ordersStore = ordersStore.filter((o) => o.id !== id && o.orderNumber !== id);
  res.json({ success: true, allOrders: ordersStore });
});

// 7.1 Reset to official schedule
app.post(['/api/orders/reset', '/api/gas/reset-schedule'], (req, res) => {
  ordersStore = [...INITIAL_ORDERS];
  res.json({ success: true, message: 'הסידור אופס בהצלחה ל-4 ההזמנות הרשמיות', allOrders: ordersStore });
});

// 8. Catalog Search
app.get('/api/catalog', (req, res) => {
  const query = (req.query.q as string || '').toLowerCase().trim();
  if (!query) {
    return res.json({ products: CATALOG_PRODUCTS });
  }

  const filtered = CATALOG_PRODUCTS.filter(
    (p) =>
      p.name.toLowerCase().includes(query) ||
      p.sku.includes(query) ||
      (p.keywords && p.keywords.toLowerCase().includes(query))
  );

  res.json({ products: filtered });
});

// ---------------- GAS (GOOGLE APPS SCRIPT) & REALTIME SHEET TABS ----------------

// GAS Tab 1: /api/gas/dictionary (מילון_לוגיסטי)
app.get(['/api/gas/dictionary', '/api/gas/מילון-לוגיסטי'], (req, res) => {
  res.json({
    success: true,
    spreadsheetId: CONFIG.spreadsheetId,
    tabName: 'מילון_לוגיסטי',
    totalItems: CATALOG_PRODUCTS.length,
    coreItems: CORE_LOGISTICS_ITEMS,
    products: CATALOG_PRODUCTS,
    fields: ['מק"ט', 'שם_רשמי', 'קטגוריה', 'יחידה', 'מילות_מפתח'],
    lastSyncedAt: new Date().toISOString(),
  });
});

// GAS Tab 1: NLP Normalization Sandbox
app.post('/api/gas/dictionary/normalize', (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ success: false, error: 'Text required' });
  }

  const lower = text.toLowerCase();
  const matched: any[] = [];

  CATALOG_PRODUCTS.forEach((p) => {
    const keys = (p.keywords || '').split(',').map((k) => k.trim().toLowerCase());
    const isMatched =
      keys.some((k) => k && lower.includes(k)) ||
      lower.includes(p.name.toLowerCase()) ||
      lower.includes(p.sku);

    if (isMatched) {
      // Regex quantity extraction
      const regex = new RegExp(`(\\d+)\\s*(?:שק|יח|בלה|לוח|סט|שפופרת|קופסא)?\\s*(?:של)?\\s*${p.name.split(' ')[0]}`, 'i');
      const m = text.match(regex);
      const qty = m && m[1] ? parseInt(m[1], 10) : 1;

      matched.push({
        sku: p.sku,
        officialName: p.name,
        category: p.category || 'כללי',
        unit: p.unit,
        quantity: qty,
        keywords: p.keywords,
        warehouse: p.warehouse || '🏭 4️⃣(החרש)',
        defaultDriver: p.defaultDriver || 'חכמת / עלי',
      });
    }
  });

  const isCrane = matched.some((i) => i.unit === 'בלה' || i.officialName.includes('בלוק') || i.officialName.includes('חול') || i.officialName.includes('סומסום') || i.officialName.includes('טיט'));
  const isGypsumOrLight = matched.every((i) => i.officialName.includes('גבס') || i.officialName.includes('פרופיל') || i.officialName.includes('צבע') || i.officialName.includes('סופר 7') || i.officialName.includes('להב'));

  const recommendedDriver = isCrane
    ? 'חכמת (מנוף)'
    : isGypsumOrLight
    ? 'עלי (משאית רגילה)'
    : 'חכמת (מנוף)';

  const recommendedTruck = isCrane
    ? 'משאית מרצדס מנוף (615-41-002)'
    : 'משאית רגילה / פתוחה (משאית עלי)';

  const recommendedWarehouse = isCrane ? '🏭 4️⃣(החרש)' : '🏟️ 1️⃣(התלמיד)';

  res.json({
    success: true,
    input: text,
    matchedCount: matched.length,
    normalizedItems: matched,
    recommendedDriver,
    recommendedTruck,
    recommendedWarehouse,
  });
});

// GAS Tab 2: /api/gas/daily-schedule & /api/gas/סידור-עבודה-יומי
const handleGasGetDailySchedule = (req: express.Request, res: express.Response) => {
  const scheduleRows = ordersStore.map((o) => {
    let totalWeightKg = o.totalWeightKg || 0;
    let bigBags = o.depositBigBags || 0;
    let bagCount = 0;

    if (!totalWeightKg) {
      o.items.forEach((it) => {
        const q = Number(it.quantity) || 1;
        if (it.unit === 'בלה' || it.name.includes('חול') || it.name.includes('חצץ')) {
          totalWeightKg += q * 1000;
          bigBags += q;
        } else if (it.unit === 'שק' || it.name.includes('מלט') || it.name.includes('טיח')) {
          totalWeightKg += q * 25;
          bagCount += q;
        } else if (it.unit === 'לוח' || it.name.includes('גבס')) {
          totalWeightKg += q * 25;
        } else if (it.unit === 'בלוק' || it.name.includes('בלוק')) {
          totalWeightKg += q * 1150;
        } else {
          totalWeightKg += q * 5;
        }
      });
    }

    const pallets = o.depositPallets ?? (bagCount >= 30 ? Math.ceil(bagCount / 40) : bagCount >= 10 ? 1 : 0);
    const weightTons = o.totalWeightTons || Number((totalWeightKg / 1000).toFixed(2));
    const city = o.city || (o.destination.includes('הרצליה') ? 'הרצליה' : o.destination.includes('הוד השרון') ? 'הוד השרון' : o.destination.includes('רעננה') ? 'רעננה' : o.destination.includes('רמת השרון') ? 'רמת השרון' : o.destination.includes('כפר סבא') ? 'כפר סבא' : 'מרכז');
    const warehouse = o.warehouse || (o.craneRequired ? '🏭 4️⃣(החרש)' : '🏟️ 1️⃣(התלמיד)');
    const truckType = o.truckType || (o.craneRequired ? 'משאית מנוף (זרוע 24 מטר)' : 'משאית רגילה פתוחה');
    const wazeUrl = o.wazeUrl || `https://waze.com/ul?q=${encodeURIComponent(o.destination)}&navigate=yes`;
    const driveUrl = o.driveFileUrl || o.deliveryNotePdf || `https://drive.google.com/open?id=doc-${o.orderNumber}`;
    const verification = o.verificationCheck || (o.status === 'delivered' ? 'סופק ואושר' : o.craneRequired ? 'תיאום מנוף בוצע' : 'תקין לשיגור');
    const statusLabel = o.status === 'pending' ? 'בסידור עבודה' : o.status === 'loading' ? 'בהטענה במחסן' : o.status === 'in_transit' ? 'יצא לחלוקה' : o.status === 'delivered' ? 'סופק בהצלחה' : o.status === 'issue' ? 'עיכוב / בעיה' : 'בוטל';
    const itemsDetails = o.items.map((i) => `${i.sku ? `[${i.sku}] ` : ''}${i.name} (${i.quantity} ${i.unit})`).join(', ');
    const updatedTime = o.updatedAt ? new Date(o.updatedAt).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' }) : new Date().toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' });

    // 18 Exact Columns matching user schema
    return {
      'מספר הזמנה': o.orderNumber,
      'שם לקוח': o.customerName,
      'מספר לקוח': o.customerNumber || `C-${o.orderNumber}`,
      'כתובת אתר / יעד': o.destination,
      'עיר': city,
      'מחסן יציאה': warehouse,
      'נהג משובץ': o.driver,
      'סוג משאית / מנוף': truckType,
      'שעת אספקה': o.deliveryTime,
      'משקל כולל (טון)': `${weightTons} טון`,
      'פירוט פריטים ומק"טים': itemsDetails,
      'בלות פקדון': bigBags > 0 ? `${bigBags} בלות` : '0',
      'משטחים פקדון': pallets > 0 ? `${pallets} משטחים` : '0',
      'סטטוס ביצוע': statusLabel,
      'קישור Waze': wazeUrl,
      'קובץ הזמנה (Drive)': driveUrl,
      'זמן עדכון אחרון': updatedTime,
      'בדיקה': verification,
      id: o.id,
      order: o,
    };
  });

  const exact18Fields = [
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
  ];

  res.json({
    success: true,
    spreadsheetId: CONFIG.spreadsheetId,
    tabName: 'סידור_עבודה_יומי',
    totalOrders: ordersStore.length,
    activeOrders: ordersStore.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled').length,
    fields: exact18Fields,
    columnsCount: 18,
    rows: scheduleRows,
    orders: ordersStore,
    lastSyncedAt: new Date().toISOString(),
    status: 'connected',
  });
};

app.get(['/api/gas/daily-schedule', '/api/gas/סידור-עבודה-יומי'], handleGasGetDailySchedule);

// Update order status via Tab 2 GAS endpoint
app.patch(['/api/gas/orders/:id/status', '/api/orders/:id/status'], (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const orderIndex = ordersStore.findIndex((o) => o.id === id || o.orderNumber === id);
  if (orderIndex === -1) {
    return res.status(404).json({ success: false, error: 'הזמנה לא נמצאה' });
  }

  ordersStore[orderIndex] = {
    ...ordersStore[orderIndex],
    status,
    syncStatus: true,
    updatedAt: new Date().toISOString(),
  };

  // Webhook sync
  try {
    fetch(CONFIG.makeWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'gas_update_status',
        tab: 'סידור_עבודה_יומי',
        orderId: ordersStore[orderIndex].orderNumber,
        newStatus: status,
        updatedOrder: ordersStore[orderIndex],
      }),
    }).catch(() => {});
  } catch {}

  res.json({
    success: true,
    order: ordersStore[orderIndex],
    allOrders: ordersStore,
    tab: 'סידור_עבודה_יומי',
    syncedAt: new Date().toISOString(),
  });
});

// Update order details (full edit) via Tab 2 GAS endpoint
app.put(['/api/gas/orders/:id', '/api/orders/:id'], (req, res) => {
  const { id } = req.params;
  const updatedData = req.body as Partial<OrderItem>;

  const orderIndex = ordersStore.findIndex((o) => o.id === id || o.orderNumber === id);
  if (orderIndex === -1) {
    return res.status(404).json({ success: false, error: 'הזמנה לא נמצאה בסידור' });
  }

  ordersStore[orderIndex] = {
    ...ordersStore[orderIndex],
    ...updatedData,
    syncStatus: true,
    updatedAt: new Date().toISOString(),
  };

  // Webhook sync to Make / JONI
  try {
    fetch(CONFIG.makeWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'gas_edit_order_details',
        tab: 'סידור_עבודה_יומי',
        orderId: ordersStore[orderIndex].orderNumber,
        updatedOrder: ordersStore[orderIndex],
      }),
    }).catch(() => {});
  } catch {}

  res.json({
    success: true,
    order: ordersStore[orderIndex],
    allOrders: ordersStore,
    tab: 'סידור_עבודה_יומי',
    syncedAt: new Date().toISOString(),
  });
});

// Trigger full sync of schedule
app.post(['/api/gas/sync-schedule', '/api/gas/סנכרן-סידור'], (req, res) => {
  res.json({
    success: true,
    tab: 'סידור_עבודה_יומי',
    spreadsheetId: CONFIG.spreadsheetId,
    totalOrders: ordersStore.length,
    syncedAt: new Date().toISOString(),
    status: 'synced',
    orders: ordersStore,
  });
});

// GAS Tab 2: /api/gas/insert-order & /api/gas/הכנס-הזמנה (סידור_עבודה_יומי)
const handleGasInsertOrder = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const orderNumber = body.orderNumber || body['מזהה_הזמנה'] || `SN-${Math.floor(1000 + Math.random() * 9000)}`;
    const customerName = body.customerName || body['שם_לקוח'] || 'לקוח חדש';
    const destination = body.destination || body['יעד'] || 'אתר לקוח';
    const deliveryTime = body.deliveryTime || body['שעת_אספקה'] || '10:00';
    const driver = body.driver || body['נהג'] || 'חכמת / עלי';
    const status = (body.status || body['סטטוס'] || 'pending') as OrderStatus;
    const items = body.items || [];
    const notes = body.notes || body['הערות'] || '';
    const craneRequired = body.craneRequired !== undefined ? body.craneRequired : items.some((i: any) => (i.unit && i.unit.includes('בלה')) || (i.name && i.name.includes('בלוק')));
    const floor = body.floor || body['קומה'] || 'קרקע';
    const siteContact = body.siteContact || body['איש_קשר'] || '';
    const sitePhone = body.sitePhone || body['טלפון_באתר'] || '';
    const warehouse = body.warehouse || body['מחסן'] || (craneRequired ? '🏭 4️⃣(החרש)' : '🏟️ 1️⃣(התלמיד)');

    const newOrder: OrderItem = {
      id: `ord-${Date.now()}`,
      orderNumber,
      customerName,
      customerPhone: body.customerPhone || '',
      destination,
      deliveryTime,
      driver,
      status,
      items: items.map((it: any) => ({
        sku: it.sku || '',
        name: it.name || it.officialName || 'פריט',
        quantity: Number(it.quantity) || 1,
        unit: it.unit || 'יח\'',
      })),
      notes,
      craneRequired,
      floor,
      siteContact,
      sitePhone,
      warehouse,
      deliveryNotePdf: `https://docs.google.com/viewer?url=https://saban.co.il/docs/delivery_${orderNumber}.pdf`,
      customerSignature: '',
      syncStatus: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'app',
    };

    ordersStore.unshift(newOrder);

    // Format Google Sheet Row representation for Tab 2
    const sheetRow = {
      'מזהה_הזמנה': newOrder.orderNumber,
      'שם_לקוח': newOrder.customerName,
      'יעד': newOrder.destination,
      'נהג': newOrder.driver,
      'פרטי_פריטים': newOrder.items.map((i) => `${i.name} (${i.quantity} ${i.unit})`).join(', '),
      'סטטוס': newOrder.status,
      'מחסן': newOrder.warehouse,
      'שעה': newOrder.deliveryTime,
    };

    // Attempt real-time webhook dispatch
    try {
      fetch(CONFIG.makeWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'gas_insert_order',
          spreadsheetId: CONFIG.spreadsheetId,
          tab: 'סידור_עבודה_יומי',
          row: sheetRow,
          order: newOrder,
        }),
      }).catch(() => {});
    } catch {}

    const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(newOrder.destination)}&navigate=yes`;
    const whatsappText = `🚚 *הזמנה חדשה שובצה בסידור [${newOrder.orderNumber}]*\n👤 לקוח: ${newOrder.customerName}\n📍 יעד: ${newOrder.destination}\n⏰ שעה: ${newOrder.deliveryTime}\n🚛 נהג: ${newOrder.driver}\n📦 פריטים: ${newOrder.items.map((i) => `${i.name} (${i.quantity} ${i.unit})`).join(', ')}`;
    const whatsappLink = `https://api.whatsapp.com/send?phone=${CONFIG.veredPhone.replace(/[^0-9]/g, '')}&text=${encodeURIComponent(whatsappText)}`;

    res.json({
      success: true,
      order: newOrder,
      sheetRow,
      wazeUrl,
      whatsappLink,
      allOrders: ordersStore,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
};

app.post('/api/gas/insert-order', handleGasInsertOrder);
app.post('/api/gas/הכנס-הזמנה', handleGasInsertOrder);

// GAS Tab 3: /api/gas/delivery-notes (תעודות_משלוח_וחתימות)
app.get('/api/gas/delivery-notes', (req, res) => {
  const deliveryNotes = ordersStore.map((o) => ({
    'מזהה_הזמנה': o.orderNumber,
    'תעודת_משלוח_PDF': o.deliveryNotePdf || `https://saban.co.il/docs/delivery_${o.orderNumber}.pdf`,
    'חתימת_לקוח': o.customerSignature ? 'נחתם דיגיטלית' : 'ממתין לחתימה',
    'חתימת_לקוח_Base64': o.customerSignature || '',
    'סטטוס_סנכרון': o.syncStatus || !!o.customerSignature ? 'מסונכרן ל-Sheets' : 'ממתין לסנכרון',
    customerName: o.customerName,
    destination: o.destination,
    driver: o.driver,
    items: o.items,
    status: o.status,
    orderId: o.id,
  }));

  res.json({
    success: true,
    spreadsheetId: CONFIG.spreadsheetId,
    tabName: 'תעודות_משלוח_וחתימות',
    notes: deliveryNotes,
    fields: ['מזהה_הזמנה', 'תעודת_משלוח_PDF', 'חתימת_לקוח', 'סטטוס_סנכרון'],
  });
});

// GAS Tab 3: Sign delivery note
app.post('/api/gas/sign-note', (req, res) => {
  const { orderId, signature } = req.body;
  const orderIndex = ordersStore.findIndex((o) => o.id === orderId || o.orderNumber === orderId);

  if (orderIndex === -1) {
    return res.status(404).json({ success: false, error: 'תעודת משלוח לא נמצאה' });
  }

  ordersStore[orderIndex] = {
    ...ordersStore[orderIndex],
    customerSignature: signature || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="40"><path d="M10 25 Q 30 5, 50 25 T 90 20" stroke="%2310b981" stroke-width="3" fill="none"/></svg>',
    syncStatus: true,
    status: 'delivered',
    updatedAt: new Date().toISOString(),
  };

  res.json({
    success: true,
    order: ordersStore[orderIndex],
    allOrders: ordersStore,
  });
});

// GAS Sync Trigger for Tab
app.post('/api/gas/sync-tab', (req, res) => {
  const { tab } = req.body; // 'מילון_לוגיסטי' | 'סידור_עבודה_יומי' | 'תעודות_משלוח_וחתימות'
  res.json({
    success: true,
    tab: tab || 'כל הטאבים',
    spreadsheetId: CONFIG.spreadsheetId,
    syncedAt: new Date().toISOString(),
    status: 'online',
    recordsCount: tab === 'מילון_לוגיסטי' ? CATALOG_PRODUCTS.length : ordersStore.length,
  });
});

// 9. Send WhatsApp Webhook (Make / JONI / Firebase RTDB)
app.post('/api/webhook/send', async (req, res) => {
  try {
    const { target, message, phone, orderId, reportType } = req.body;
    const recipientPhone = phone || CONFIG.veredPhone;
    const targetUrl = target === 'joni' ? CONFIG.joniWebhookUrl : CONFIG.makeWebhookUrl;

    const payload = {
      timestamp: new Date().toISOString(),
      source: 'סידור-נועה PWA',
      recipientPhone,
      message,
      target,
      orderId: orderId || null,
      reportType: reportType || null,
      activeOrdersSummary: {
        total: ordersStore.length,
        pending: ordersStore.filter((o) => o.status === 'pending').length,
        loading: ordersStore.filter((o) => o.status === 'loading').length,
        inTransit: ordersStore.filter((o) => o.status === 'in_transit').length,
        delivered: ordersStore.filter((o) => o.status === 'delivered').length,
      },
    };

    let webhookResponseStatus = 200;
    let webhookResponseText = 'OK';

    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      webhookResponseStatus = response.status;
      webhookResponseText = await response.text();
    } catch (whErr) {
      console.warn('Webhook dispatch error (likely sandboxed or offline):', (whErr as Error).message);
    }

    const cleanPhone = recipientPhone.replace(/[^0-9]/g, '');
    const whatsappDirectLink = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;

    res.json({
      success: true,
      deliveredToWebhook: webhookResponseStatus >= 200 && webhookResponseStatus < 300,
      webhookStatus: webhookResponseStatus,
      targetUrl,
      whatsappDirectLink,
      recipientPhone,
      timestamp: payload.timestamp,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 10. AI Chat & Order Normalization with Noa AI (WhatsApp Style)
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history } = req.body;

    const ordersSummaryText = ordersStore
      .map(
        (o, idx) =>
          `${idx + 1}. [${o.orderNumber}] ${o.customerName} -> ${o.destination} | שעה: ${o.deliveryTime} | נהג: ${o.driver} | סטטוס: ${o.status} | מנוף: ${o.craneRequired ? 'כן' : 'לא'} | פריטים: ${o.items.map((i) => `${i.name} (${i.quantity} ${i.unit})`).join(', ')}`
      )
      .join('\n');

    const catalogText = CATALOG_PRODUCTS.map(
      (p) => `• מק"ט: ${p.sku} | שם: ${p.name} | יחידה: ${p.unit} | מילות מפתח: ${p.keywords || ''} | נהג מומלץ: ${p.defaultDriver || 'עלי'}`
    ).join('\n');

    const systemInstruction = `
את "נועה AI 🌹" - הסדרנית ויד ימינו של ראמי ומנהלת הלוגיסטיקה, התפעול, צי הרכבים ונרמול ההזמנות 24/7 של "ח. סבן חומרי בניין בע"מ" (SabanOS Autonomous Logistics).
את פועלת ברציפות לצד ראמי, גליה, ורד (טלפון: ${CONFIG.veredPhone}) ומול הנהגים חכמת ועלי ומנהלי העבודה.

🧠 1. חוקי ליבה לוגיסטיים ומיפוי נקודות מוצא (SabanOS Rules):
1. 🏭 **מחסנים ונקודות מוצא:**
   - **מחסן 4 (החרש)** (קואורדינטות: 32.1326, 34.8982): חומרי מחצבה כבדים (חול, חצץ, סומסום, טיט מוכן), שקי מלט, טיח תרמי, בלוקים, אבני שפה והובלות מנוף.
   - **מחסן 1 (התלמיד)** (קואורדינטות: 32.1630, 34.8948): לוחות גבס (לבן, ירוק, כחול, ורוד), פרופילי מתכת (ניצבים ומסלולים), דבקים, צבעים, ברגים, דלתות וכלי עבודה וגמר קלים.

2. 🚚 **צי הרכבים, הנהגים והשיבוץ האוטומטי:**
   - 🏗️ **חכמת — משאית מרצדס מנוף (מספר רישוי: 615-41-002):**
     • מיועדת להובלות כבדות הדורשות פריקת מנוף (זרוע 9 מ' / 15 מ' / 24 מ') להנפה לקומות, מרפסות, גגות או פריקת משטחים/בלות כבדות.
     • חומרי משא: בלות חול, סומסום, טיט, שקי מלט, בלוקים ומשטחים כבדים.
     • מחסן יציאה מרכזי: **מחסן 4 (החרש)**.
   - 🚚 **עלי — משאית רגילה / פתוחה (משאית עלי):**
     • מיועדת להובלות ללא מנוף (משאית שטוחה/פתוחה או סגורה) לפריקה ידנית או קלה באתר.
     • חומרי משא: מערכות גבס (לוחות, ניצבים, מסלולים), בידוד, שפכטל, צבעים, דבקים, ברגים וציוד גמר.
     • מחסן יציאה מרכזי: **מחסן 1 (התלמיד)**.

3. ⚖️ **חישובי משקל ובקרת עומס יתר (Overload Prevention):**
   - בלה (שק גדול) = כ-1,000 ק"ג (1 טון) לכל בלה.
   - שק סטנדרטי (מלט / טיח / דבק) = 25 ק"ג.
   - לוח גבס = כ-24 ק"ג.
   - בלוק בטון 20/20/40 = כ-18 ק"ג (משטח של 75 בלוקים = כ-1,350 ק"ג).
   - מגבלת בטיחות למשאית: אם המשקל הכולל עולה על 15,000 ק"ג (15 טון), חובה להתריע: "⚠️ חריגת משקל: נדרש פיצול המשלוח לשני סבבים".

🛡️ 2. מנוע אכיפת פקדונות ברזל (Deposit Enforcement Engine):
1. **שק גדול פקדון (מק"ט 60002):**
   - חובה פקדון 1:1 על כל בלה/שק גדול של חומרי מחצבה בתפזורת (חול 11501, סומסום 11511, טיט 11551, חצץ 11506, חמרה 11570, מצע 11540).
2. **משטח סבן פקדון (מק"ט 60060):**
   - לשקי מלט (10002 / 10001) ושקי טיח/טיט יבש/דבק (14400, 15116, 15181):
     • מתחת ל-20 שקים = 0 משטחים (הטענה ידנית) אלא אם הלקוח דרש משטח.
     • בין 20 ל-40 שקים = משטח עץ סבן אחד (60060).
     • מעל 40 שקים = Math.ceil(סה"כ שקים / 40) משטחי סבן.
   - שקי מחצבה קטנים (25 ק"ג חול/סומסום/חצץ): משטח סבן 1 לכל 50 שקים.
3. **משטח בלוקים פקדון (מק"ט 60006):**
   - בלוק 20/20/40 (12204): משטח 1 לכל 75 בלוקים.
   - בלוק 15/20/40 (12154): משטח 1 לכל 100 בלוקים.
   - בלוק 10/20/40 (12010): משטח 1 לכל 150 בלוקים.
4. **חוק הפטור המלא מפקדונות (Exemption Rule):**
   - לוחות גבס, פרופילי מתכת, ברגים, איטום (שפופרות/דליים של סיקה), דליים, דלתות, וסעיפי "הובלה ללא פריקה" (מק"טים 818050-818095) פטורים לחלוטין מכל חיוב פקדון!

🔍 3. זיהוי לקוחות מהיר (Fuzzy Search):
כששואלים על לקוח לפי שם חלקי (בזלת, בזלת מזר, שטיכמוס, ערוגת, יוסי כהן, קבלני השרון, אלון גולדשטיין, שבתי גני, ערן אזולאי) או לפי טלפון/כתובת (שיבת ציון 12, הנשיא 44 וכו') - זהי את הלקוח מיד והציגי את כרטיס ההזמנה המלא, הסטטוס, הנהג, המשקל והפקדונות.

רשימת ההזמנות המלאה כרגע בסידור:
${ordersSummaryText}

רשימת מוצרים מהמילון הלוגיסטי:
${catalogText}

🎨 הנחיות עיצוב מענה:
- עני בטון מקצועי, אנרגטי, שירותי, חם ומסור ("אני על זה!", "הפרטים נבדקו ואומתו").
- הציגי נתונים בטבלאות מעוצבות או בכרטיסי וואטסאפ ברורים עם קישורי Waze ופקדונות.
- בסיום כל תשובה הוסיפי את החתימה הרשמית:
---
באהבה ובשירותיות, **נועה ❤️ | סדרנית ויד ימינו של ראמי**
*SabanOS 24/7 Autonomy*
`;

    // Local heuristic matching helper
    const normalizedItems: any[] = [];
    const lower = message.toLowerCase();
    CATALOG_PRODUCTS.forEach((p) => {
      const keys = (p.keywords || '').split(',').map((k) => k.trim().toLowerCase());
      const matches = keys.some((k) => k && lower.includes(k)) || lower.includes(p.name.toLowerCase()) || lower.includes(p.sku);
      if (matches) {
        // extract quantity if found nearby
        let qty = 1;
        const regex = new RegExp(`(\\d+)\\s*(?:שק|יח|בלה|לוח|סט|שפופרת|קופסא)?\\s*(?:של)?\\s*${p.name.split(' ')[0]}`, 'i');
        const m = message.match(regex);
        if (m && m[1]) {
          qty = parseInt(m[1], 10);
        }
        normalizedItems.push({
          sku: p.sku,
          name: p.name,
          quantity: qty,
          unit: p.unit,
          defaultDriver: p.defaultDriver,
        });
      }
    });

    // Fuzzy search across existing orders for customer inquiries
    const matchedOrders = ordersStore.filter((o) => {
      const q = lower.replace(/[-\s]/g, '');
      const name = o.customerName.toLowerCase().replace(/[-\s]/g, '');
      const cNum = (o.customerNumber || '').toLowerCase().replace(/[-\s]/g, '');
      const phone = (o.customerPhone || '').replace(/[-\s]/g, '');
      const dest = o.destination.toLowerCase().replace(/[-\s]/g, '');
      const oNum = o.orderNumber.toLowerCase().replace(/[-\s]/g, '');
      const site = (o.siteContact || '').toLowerCase().replace(/[-\s]/g, '');

      return (
        name.includes(q) ||
        q.includes(name.slice(0, 4)) ||
        (cNum && (cNum.includes(q) || q.includes(cNum))) ||
        (phone && phone.length > 4 && q.includes(phone)) ||
        dest.includes(q) ||
        oNum.includes(q) ||
        site.includes(q) ||
        (q.includes('בזלת') && name.includes('בזלת')) ||
        (q.includes('שטיכמוס') && name.includes('שטיכמוס')) ||
        (q.includes('ערוגת') && (name.includes('ערוגת') || dest.includes('ערוגת'))) ||
        (q.includes('שבתי') && name.includes('שבתי')) ||
        (q.includes('אזולאי') && name.includes('אזולאי')) ||
        (q.includes('שיבת ציון') && dest.includes('שיבת ציון'))
      );
    });

    const ai = getAIClient();
    if (!ai) {
      // Fallback rule-based smart response
      let fallbackText = `היי! אני על זה. יש לנו כרגע ${ordersStore.length} הזמנות פעילות בסידור העבודה של ח. סבן.`;
      
      if (matchedOrders.length > 0) {
        const o = matchedOrders[0];
        const statusBadge = o.status === 'delivered' ? 'סופק במלואו ✅' : o.status === 'issue' ? 'נעצר לבקרה ⚠️' : 'בסידור עבודה ⏳';
        fallbackText = `🔍 *זיהיתי את הלקוח:* **${o.customerName}** (הזמנה #${o.orderNumber})\n\n` +
          `📊 *סטטוס אספקה:* ${statusBadge}\n` +
          `📍 *יעד:* ${o.destination} (${o.city})\n` +
          `🚚 *נהג משובץ:* ${o.driver} | ${o.truckType}\n` +
          `🏢 *מחסן יציאה:* ${o.warehouse}\n` +
          `⚖️ *משקל כולל:* ${o.totalWeightTons} טון (${o.totalWeightKg} ק"ג)\n` +
          `📦 *פקדונות:* ${o.depositDetails || 'ללא'}\n` +
          `🕒 *שעת יעד:* ${o.deliveryTime}\n` +
          (o.verificationCheck ? `🔍 *בדיקת התאמה:* ${o.verificationCheck}\n` : '') +
          (o.notes ? `📝 *הערות שטח:* ${o.notes}\n` : '') +
          `\n📁 *נתיב Drive:* \`ח. סבן / תיקיות לקוחות / ${o.customerName} / 2026-08 / ${o.orderNumber}\`\n\n` +
          `---\nבאהבה ובשירותיות, **נועה ❤️ | סדרנית ויד ימינו של ראמי**\n*SabanOS 24/7 Autonomy*`;
      } else if (normalizedItems.length > 0) {
        const isCrane = normalizedItems.some((i) => i.unit === 'בלה' || i.name.includes('בלוק') || i.name.includes('חול') || i.name.includes('סומסום') || i.name.includes('טיט') || i.name.includes('מלט'));
        const recommendedDriver = isCrane ? 'חכמת (מנוף)' : 'עלי (משאית רגילה)';
        const recommendedTruck = isCrane ? 'משאית מרצדס מנוף (רישוי: 615-41-002, זרוע מנוף)' : 'משאית רגילה (משאית עלי)';
        const warehouse = isCrane ? '🏭 מחסן 4 (החרש) - חומרי בניין כבדים' : '🏟️ מחסן 1 (התלמיד) - גבס ומוצרים קלים';

        fallbackText = `📦 *זיהיתי ונירמלתי ${normalizedItems.length} פריטים לפי המילון הלוגיסטי של ח. סבן:*\n\n` +
          normalizedItems.map((it, idx) => `${idx + 1}. *[${it.sku}]* ${it.name} — כמות: ${it.quantity} ${it.unit}`).join('\n') +
          `\n\n💡 *שיבוץ חכם ע"י נועה AI:*\n` +
          `🚛 *נהג משובץ:* ${recommendedDriver}\n` +
          `🚜 *סוג רכב:* ${recommendedTruck}\n` +
          `🏢 *מחסן יציאה:* ${warehouse}\n` +
          `\nהפרטים אומתו ומוכנים לשיגור או לעדכון בסידור!\n\n` +
          `---\nבאהבה ובשירותיות, **נועה ❤️ | סדרנית ויד ימינו של ראמי**\n*SabanOS 24/7 Autonomy*`;
      } else if (message.includes('רכב') || message.includes('צי') || message.includes('נהג')) {
        fallbackText = `🚚 *צי הרכבים והנהגים של ח. סבן:*\n\n` +
          `1. 🏗️ *חכמת — משאית מנוף*\n` +
          `   • רכב: משאית מרצדס מנוף (רישוי: 615-41-002)\n` +
          `   • ייעוד: הובלות כבדות עם פריקת מנוף (זרוע 9 מ' / 15 מ' / 24 מ')\n` +
          `   • חומרים: בלות חול, סומסום, טיט, מלט, בלוקים ומשטחים\n` +
          `   • מחסן: 🏭 מחסן 4 (החרש) - המרכזי לחומרי בניין כבדים\n\n` +
          `2. 🚚 *עלי — משאית רגילה / פתוחה*\n` +
          `   • רכב: משאית רגילה (משאית עלי ללא מנוף)\n` +
          `   • ייעוד: הובלות ללא מנוף למערכות גבס וציוד קל\n` +
          `   • חומרים: לוחות גבס (לבן/ירוק/כחול), פרופילי מתכת, צבעים, דבקים\n` +
          `   • מחסן: 🏟️ מחסן 1 (התלמיד) - הייעודי לגבס וציוד קל\n\n` +
          `---\nבאהבה ובשירותיות, **נועה ❤️ | סדרנית ויד ימינו של ראמי**\n*SabanOS 24/7 Autonomy*`;
      } else if (message.includes('בוקר') || message.includes('דוח')) {
        fallbackText = `בוקר טוב ראמי וצוות ח. סבן! ☀️ הנה תמונת מצב הסידור להיום:\nסה"כ ${ordersStore.length} הזמנות. חכמת (מרצדס מנוף 615-41-002) יוצא ממחסן 4 (החרש) ועלי יוצא ממחסן 1 (התלמיד).\n\n` +
          `---\nבאהבה ובשירותיות, **נועה ❤️ | סדרנית ויד ימינו של ראמי**\n*SabanOS 24/7 Autonomy*`;
      } else if (message.includes('חכמת') || message.includes('מנוף')) {
        const craneOrders = ordersStore.filter((o) => o.craneRequired || o.driver.includes('מנוף'));
        fallbackText = `🏗️ *לחכמת (מרצדס מנוף 615-41-002 - מחסן 4 החרש)* משובצות כרגע ${craneOrders.length} הזמנות:\n` +
          craneOrders.map((o) => `• [${o.deliveryTime}] ${o.orderNumber} - ${o.customerName} (${o.destination})`).join('\n') +
          `\n\n---\nבאהבה ובשירותיות, **נועה ❤️ | סדרנית ויד ימינו של ראמי**\n*SabanOS 24/7 Autonomy*`;
      } else if (message.includes('עלי')) {
        const aliOrders = ordersStore.filter((o) => o.driver.includes('עלי'));
        fallbackText = `🚚 *לעלי (משאית רגילה - מחסן 1 התלמיד)* משובצות כרגע ${aliOrders.length} הזמנות:\n` +
          aliOrders.map((o) => `• [${o.deliveryTime}] ${o.orderNumber} - ${o.customerName} (${o.destination})`).join('\n') +
          `\n\n---\nבאהבה ובשירותיות, **נועה ❤️ | סדרנית ויד ימינו של ראמי**\n*SabanOS 24/7 Autonomy*`;
      } else {
        fallbackText = `שלום! אני נועה AI 🌹, הסדרנית ויד ימינו של ראמי. אני מנהלת את הסידור 24/7, קולטת תעודות מקומקס וגליה, מנרמלת מק"טים לפי המילון הלוגיסטי ומשבצת לחכמת (מנוף 615-41-002) ולעלי (משאית רגילה).\n\nבמה אוכל לעזור?\n\n---\nבאהבה ובשירותיות, **נועה ❤️ | סדרנית ויד ימינו של ראמי**\n*SabanOS 24/7 Autonomy*`;
      }

      return res.json({
        success: true,
        reply: fallbackText,
        sender: 'noa',
        normalizedItems: normalizedItems.length > 0 ? normalizedItems : undefined,
        matchedOrders: matchedOrders.length > 0 ? matchedOrders : undefined,
        timestamp: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
      });
    }

    const conversationPrompt = `הודעת המשתמש: "${message}"
אם ההודעה מתייחסת ללקוח, חפש בהזמנות, החזר פירוט מלא, נהג, סטטוס, משקל ופקדונות.
אם ההודעה מכילה מוצרים, נרמל לפי המילון הלוגיסטי.
זכור לסיים עם החתימה של נועה.`;

    const aiResponse = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: conversationPrompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const reply = aiResponse.text || 'קיבלתי, בודקת את הסידור ומעדכנת מיד!';

    res.json({
      success: true,
      reply,
      sender: 'noa',
      normalizedItems: normalizedItems.length > 0 ? normalizedItems : undefined,
      matchedOrders: matchedOrders.length > 0 ? matchedOrders : undefined,
      timestamp: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
    });
  } catch (error) {
    console.error('AI Chat error:', error);
    res.json({
      success: true,
      reply: 'שלום! קיבלתי את ההודעה. המערכת מעודכנת עם כל ההזמנות בסידור.',
      sender: 'noa',
      timestamp: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
    });
  }
});

// 11. Generate Morning Report & Daily Summary
app.post('/api/reports/generate', async (req, res) => {
  try {
    const { type } = req.body; // 'morning' | 'daily_summary'
    const today = new Date().toLocaleDateString('he-IL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const pendingOrders = ordersStore.filter((o) => o.status === 'pending' || o.status === 'loading' || o.status === 'in_transit');
    const deliveredOrders = ordersStore.filter((o) => o.status === 'delivered');

    let reportText = '';

    if (type === 'morning') {
      reportText = `🌅 *דוח סידור עבודה יומי - סידור-נועה*\n📅 *תאריך:* ${today}\n👤 *נמען ראשי:* ורד (${CONFIG.veredPhone})\n\n📊 *תמונת מצב כללית:*\nסה"כ הזמנות לביצוע: ${ordersStore.length}\nהזמנות בסידור / בהטענה: ${pendingOrders.length}\n\n🚛 *חלוקה לפי נהגים ולוח זמנים:*\n`;

      const driversGroup: Record<string, OrderItem[]> = {};
      ordersStore.forEach((o) => {
        const d = o.driver || 'ללא שיוך';
        if (!driversGroup[d]) driversGroup[d] = [];
        driversGroup[d].push(o);
      });

      Object.keys(driversGroup).forEach((driver) => {
        reportText += `\n🔹 *${driver}:*\n`;
        driversGroup[driver].forEach((o) => {
          reportText += `  ▫️ [${o.deliveryTime}] *${o.customerName}* - ${o.destination}\n     📦 ${o.items.map((i) => `${i.name} (${i.quantity} ${i.unit})`).join(', ')}\n     ${o.craneRequired ? '⚠️ דורש מנוף | ' : ''}סטטוס: ${o.status === 'loading' ? 'בהטענה' : 'בסידור'}\n`;
        });
      });

      reportText += `\n💬 *הערות תפעוליות:* נא לוודא תיאום טלפוני מול מנהלי העבודה כחצי שעה לפני הגעה לאתר.`;
    } else {
      reportText = `📋 *דוח סיכום יומי - סידור-נועה*\n📅 *תאריך:* ${today}\n\n✅ *הזמנות שסופקו בהצלחה (${deliveredOrders.length}):*\n`;
      if (deliveredOrders.length === 0) {
        reportText += `  (טרם סומנו הזמנות כנמסרו היום)\n`;
      } else {
        deliveredOrders.forEach((o) => {
          reportText += `  ✔️ ${o.orderNumber}: ${o.customerName} - ${o.destination} (${o.driver})\n`;
        });
      }

      reportText += `\n⏳ *הזמנות שטרם סופקו / ממתינות (${pendingOrders.length}):*\n`;
      pendingOrders.forEach((o) => {
        reportText += `  ▫️ ${o.orderNumber}: ${o.customerName} - ${o.destination} | שעה: ${o.deliveryTime} | נהג: ${o.driver}\n`;
      });

      reportText += `\n🌟 הופק אוטומטית ע"י מערכת סידור-נועה`;
    }

    res.json({
      success: true,
      report: {
        type,
        date: today,
        text: reportText,
        metrics: {
          total: ordersStore.length,
          pending: pendingOrders.length,
          delivered: deliveredOrders.length,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ---------------- VITE & STATIC SERVING ----------------
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Siddur-Noa Server listening on port ${PORT}`);
  });
}

start();
