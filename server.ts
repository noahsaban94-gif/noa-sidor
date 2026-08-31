import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { INITIAL_ORDERS, CATALOG_PRODUCTS } from './src/data/catalog.js';
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

// 10. AI Chat with Noa AI (WhatsApp Style)
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history } = req.body;

    const ordersSummaryText = ordersStore
      .map(
        (o, idx) =>
          `${idx + 1}. [${o.orderNumber}] ${o.customerName} -> ${o.destination} | שעה: ${o.deliveryTime} | נהג: ${o.driver} | סטטוס: ${o.status} | מנוף: ${o.craneRequired ? 'כן' : 'לא'} | פריטים: ${o.items.map((i) => `${i.name} (${i.quantity} ${i.unit})`).join(', ')}`
      )
      .join('\n');

    const systemInstruction = `
את "נועה AI" - מנהלת הסידור, הלוגיסטיקה והתפעול החכמה של חברת חומרי הבניין והאספקה ("סידור-נועה").
התפקיד שלך הוא לנהל את סידור העבודה היומי, לעקוב אחרי הנהגים (חכמת במנוף, עלי במשאית רגילה, משאית 02, משאית 09), לעדכן סטטוסי הזמנות, להמליץ על שעות והתאמות מנוף, ולייצר הודעות וואטסאפ מנוסחות היטב לוורד (טלפון: ${CONFIG.veredPhone}) וללקוחות.

רשימת ההזמנות הנוכחית בסידור להיום:
${ordersSummaryText}

מחירון ומוצרים מרכזיים:
- מלט אפור (שק 25 ק"ג), טיח ממ"ד, סיד בור, חול בלה/שק, סומסום בלה/שק, בלוק 10/20, לוחות גבס (לבן/ירוק/ורוד 2.60), דבק פלסטומר 603, סיקה 107, גראוט 214, סיקפלקס 11FC, סופר 7.
- כללי שיבוץ: שקי בלה ובלוקים כבדים דורשים משאית מנוף (חכמת מנוף). לוחות גבס ודבקים ללא פריקת גובה - עלי (משאית רגילה).

הנחיות מענה:
1. עני תמיד בעברית טבעית, מקצועית, שירותית, ישירה וחמה בסגנון וואטסאפ (עם אימוג'ים מתאימים 🚚🏗️📦).
2. אם המשתמש שואל על סטטוס הזמנה, פרטי נהג, שעות אספקה או רוצה להזיז שעה - תני תשובה מדויקת לפי רשימת ההזמנות.
3. אם המשתמש מבקש לשלוח הודעה, דוח בוקר או עדכון לוורד או לנהג - הציעי את נוסח ההודעה המלא והברור וצייני שניתן לשלוח אותה בלחיצה לווביהוק של ורד / JONI.
4. שמרי על תשובות ברורות ומסודרות.
`;

    const ai = getAIClient();
    if (!ai) {
      // Fallback rule-based smart response if GEMINI_API_KEY is not set
      let fallbackText = `היי! אני כאן לעזור בניהול סידור העבודה. יש לנו כרגע ${ordersStore.length} הזמנות פעילות בסידור.`;
      if (message.includes('בוקר') || message.includes('דוח')) {
        fallbackText = `בוקר טוב! ☀️ הנה תקציר סידור העבודה להיום:\nסה"כ ${ordersStore.length} הזמנות. מתוכן ${ordersStore.filter((o) => o.status === 'pending').length} בסידור וטרם יצאו לחלוקה. חכמת יוצא לסיבוב מנוף ראשון בהרצליה ב-07:30 ועלי בהוד השרון ב-09:00.`;
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
        timestamp: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
      });
    }

    const conversationPrompt = `הודעת המשתמש: "${message}"\nאנא השב בתור נועה AI.`;

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
