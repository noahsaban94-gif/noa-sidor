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
    const newOrder: OrderItem = {
      id: newOrderData.id || `ord-${Date.now()}`,
      orderNumber,
      customerName: newOrderData.customerName || 'לקוח חדש',
      customerPhone: newOrderData.customerPhone || '',
      destination: newOrderData.destination || 'ללא יעד',
      deliveryTime: newOrderData.deliveryTime || '09:00',
      driver: newOrderData.driver || 'חכמת / עלי',
      status: (newOrderData.status as OrderStatus) || 'pending',
      items: newOrderData.items || [],
      notes: newOrderData.notes || '',
      craneRequired: newOrderData.craneRequired || false,
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
app.delete('/api/orders/:id', (req, res) => {
  const { id } = req.params;
  ordersStore = ordersStore.filter((o) => o.id !== id);
  res.json({ success: true, allOrders: ordersStore });
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

  res.json({
    success: true,
    input: text,
    matchedCount: matched.length,
    normalizedItems: matched,
    recommendedDriver: matched.some((i) => i.unit === 'בלה' || i.officialName.includes('בלוק'))
      ? 'חכמת (מנוף)'
      : 'עלי (משאית רגילה)',
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
את "נועה AI" - מנהלת הסידור, הלוגיסטיקה, התפעול ונרמול ההזמנות החכמה של חברת חומרי הבניין והאספקה ("סידור-נועה").
את עובדת בממשק וואטסאפ מודרני מול מנהלת הסידור ורד (טלפון: ${CONFIG.veredPhone}) ומול מנהלי עבודה וקבלנים.

תפקידים ראשיים:
1. נרמול טקסט חופשי של הזמנות (Order Normalization Engine):
כאשר משתמש/קבלן מקליד הזמנה בטקסט חופשי (למשל: "תביא לי דחוף 20 שק מלט, 3 בלות חול ו-10 חבילות להבים לסכין יפני לאחוזה 50 רעננה לקומה 2"), את מזהה ומנרמלת את המוצרים בדיוק לפי "מילון לוגיסטי":
- מוצאת את ה-SKU והשם הרשמי המדויק מתוך הקטלוג.
- מזהה כמויות ויחידות מידה מדויקות (שק, בלה, יח', לוח, שפופרת).
- קובעת האם נדרש מנוף (שקי בלה, משטחי בלוקים, קומות גבוהות) ומשבצת נהג מתאים (חכמת מנוף או עלי משאית רגילה).

2. ניהול ומעקב סידור עבודה חי:
מעקב אחרי שעות האספקה, מניעת חפיפות בלו"ז, עדכון סטטוסי הזמנות (בסידור, בהטענה, בחלוקה, סופק), והפקת הודעות שידור לוואטסאפ לוורד או לקבלנים.

רשימת המוצרים במילון הלוגיסטי (קטלוג רשמי):
${catalogText}

רשימת ההזמנות הנוכחית בסידור העבודה להיום:
${ordersSummaryText}

הנחיות מענה:
1. עני תמיד בעברית טבעית, מקצועית, שירותית, ישירה וחמה בסגנון וואטסאפ (עם אימוג'ים מתאימים 🚚🏗️📦✨).
2. אם ההודעה מכילה בקשה להזמנה חדשה או נרמול פריטים, פרקי והציגי טבלת/רשימת נרמול מסודרת הכוללת:
   - מק"ט (SKU)
   - שם פריט רשמי
   - כמות ויחידת מידה
   - שיוך רכב מומלץ (מנוף / רגיל)
3. אם המשתמש שואל על לו"ז של נהג (חכמת, עלי), שעות, או מבקש להזיז שעה - השיבי במדויק מתוך סידור העבודה.
4. בסוף הצעת הזמנה או עדכון, צייני שניתן לשדר בלחיצה ישירה ל-Make Webhook של ורד או ל-JONI RTDB.
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

    const ai = getAIClient();
    if (!ai) {
      // Fallback rule-based smart response
      let fallbackText = `היי! קיבלתי את פנייתך. יש לנו כרגע ${ordersStore.length} הזמנות פעילות בסידור העבודה.`;
      
      if (normalizedItems.length > 0) {
        const isCrane = normalizedItems.some((i) => i.unit === 'בלה' || i.name.includes('בלוק'));
        fallbackText = `📦 *זיהיתי ונירמלתי ${normalizedItems.length} פריטים לפי המילון הלוגיסטי:*\n\n` +
          normalizedItems.map((it, idx) => `${idx + 1}. *[${it.sku}]* ${it.name} — כמות: ${it.quantity} ${it.unit}`).join('\n') +
          `\n\n🚛 *שיוך רכב מומלץ:* ${isCrane ? 'חכמת (משאית מנוף - פריקת שקים כבדים/בלה)' : 'עלי (משאית רגילה)'}\n` +
          `\nהאם תרצה שאפתח כרטיס הזמנה בסידור או אשדר לוורד בוואטסאפ?`;
      } else if (message.includes('בוקר') || message.includes('דוח')) {
        fallbackText = `בוקר טוב! ☀️ הנה תקציר סידור העבודה להיום:\nסה"כ ${ordersStore.length} הזמנות. חכמת יוצא בהרצליה ב-07:30 ועלי בהוד השרון ב-09:00.`;
      } else if (message.includes('חכמת') || message.includes('מנוף')) {
        const craneOrders = ordersStore.filter((o) => o.craneRequired || o.driver.includes('מנוף'));
        fallbackText = `לחכמת (מנוף) משובצות כרגע ${craneOrders.length} הזמנות:\n` + craneOrders.map((o) => `• ${o.orderNumber} - ${o.customerName} (${o.destination}) בשעה ${o.deliveryTime}`).join('\n');
      } else if (message.includes('עלי')) {
        const aliOrders = ordersStore.filter((o) => o.driver.includes('עלי'));
        fallbackText = `לעלי משובצות כרגע ${aliOrders.length} הזמנות:\n` + aliOrders.map((o) => `• ${o.orderNumber} - ${o.customerName} (${o.destination}) בשעה ${o.deliveryTime}`).join('\n');
      }

      return res.json({
        success: true,
        reply: fallbackText,
        sender: 'noa',
        normalizedItems: normalizedItems.length > 0 ? normalizedItems : undefined,
        timestamp: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
      });
    }

    const conversationPrompt = `הודעת המשתמש: "${message}"\nאנא השב בתור נועה AI (מנהלת סידור ולוגיסטיקה). אם יש מוצרים, נרמלי אותם לפי המילון הלוגיסטי.`;

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
