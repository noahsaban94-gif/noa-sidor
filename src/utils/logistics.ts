import { OrderProduct, CatalogProduct, OrderItem, GasTabOrderRow, STATUS_MAP } from '../types';
import { CATALOG_PRODUCTS } from '../data/catalog';

// Map of SKU to CatalogProduct for fast lookup
const productMap = new Map<string, CatalogProduct>();
CATALOG_PRODUCTS.forEach((p) => {
  if (p.sku) productMap.set(p.sku, p);
});

export function getProductBySku(sku?: string): CatalogProduct | undefined {
  if (!sku) return undefined;
  return productMap.get(sku);
}

// Extract city from destination text if not explicitly provided
export function extractCityFromDestination(destination: string, fallbackCity = 'מרכז'): string {
  if (!destination) return fallbackCity;
  const knownCities = [
    'הרצליה',
    'הוד השרון',
    'רעננה',
    'רמת השרון',
    'כפר סבא',
    'תל אביב',
    'פתח תקווה',
    'נתניה',
    'רמת גן',
    'גבעתיים',
    'חולון',
    'ראשון לציון',
    'בני ברק',
    'קיסריה',
    'אבן יהודה',
    'קדימה',
    'צורן',
    'תל מונד',
    'טירה',
    'טייבה',
  ];

  for (const city of knownCities) {
    if (destination.includes(city)) {
      return city;
    }
  }

  // fallback to first part before comma
  const parts = destination.split(/[,]/);
  if (parts.length > 0 && parts[0].trim().length > 1) {
    return parts[0].trim();
  }

  return fallbackCity;
}

export interface OrderMetricsResult {
  totalWeightKg: number;
  totalWeightTons: number;
  hasCraneItem: boolean;
  warehouse: string;
  recommendedDriver: string;
  recommendedTruckType: string;
  depositDetails: string;
  depositBigBags: number;
  depositPallets: number;
  depositSabanPallets: number;
  depositBlockPallets: number;
  isOverloaded: boolean;
  overloadAlert?: string;
  depositBreakdown: {
    bigBags60002: number;
    sabanPallets60060: number;
    blockPallets60006: number;
    isExempt: boolean;
  };
}

export function calculateOrderMetrics(items: OrderProduct[]): OrderMetricsResult {
  let totalWeightKg = 0;
  let hasCraneItem = false;
  let warehouseVoteHarash = 0;
  let warehouseVoteTalmid = 0;

  // Deposit counters according to SabanOS iron rules
  let bigBagCount60002 = 0;
  let cementAndMortarBags = 0;
  let smallQuarryBags = 0;
  let blockPalletCount60006 = 0;
  let hasDepositExemptDeliveryCode = false;

  items.forEach((item) => {
    const matched = item.sku ? productMap.get(item.sku) : undefined;
    const qty = Number(item.quantity) || 1;
    const sku = item.sku || '';
    const name = item.name.toLowerCase();
    const unit = (item.unit || '').toLowerCase();

    // Check delivery codes exempt from deposits (818050 - 818095)
    if (sku.startsWith('8180') || name.includes('הובלה ללא פריקה') || name.includes('דמי הובלה')) {
      hasDepositExemptDeliveryCode = true;
    }

    // --- 1. WEIGHT CALCULATION ---
    if (matched && matched.weightKg) {
      totalWeightKg += matched.weightKg * qty;
    } else {
      // Heuristic weight defaults
      if (name.includes('בלה') || unit.includes('בלה') || unit.includes('שק גד')) {
        totalWeightKg += 1000 * qty; // 1,000 kg (1 ton) per Big Bag
      } else if (name.includes('מלט') || name.includes('טיט') || name.includes('דבק') || name.includes('טיח') || unit === 'שק') {
        totalWeightKg += 25 * qty; // 25 kg standard bag
      } else if (name.includes('גבס') || unit === 'לוח') {
        totalWeightKg += 24 * qty;
      } else if (name.includes('בלוק 20')) {
        totalWeightKg += 18 * qty;
      } else if (name.includes('בלוק 15')) {
        totalWeightKg += 14 * qty;
      } else if (name.includes('בלוק 10')) {
        totalWeightKg += 10 * qty;
      } else if (name.includes('בלוק')) {
        totalWeightKg += 16 * qty;
      } else {
        totalWeightKg += 2 * qty;
      }
    }

    // --- 2. CRANE / HEAVY FREIGHT DETECTION ---
    const isBigBagOrQuarry =
      sku === '11501' || // חול מחצבה שק גדול
      sku === '11511' || // סומסום שק גדול
      sku === '11551' || // טיט מוכן שק גדול
      sku === '11506' || // חצץ שק גדול
      sku === '11570' || // חמרה שק גדול
      sku === '11540' || // מצע שק גדול
      unit === 'בלה' ||
      unit === 'שק גד' ||
      name.includes('בלה') ||
      name.includes('שק גדול') ||
      name.includes('חול') ||
      name.includes('סומסום') ||
      name.includes('טיט') ||
      name.includes('חצץ') ||
      name.includes('בלוק') ||
      name.includes('מנוף') ||
      name.includes('הנפה');

    if (isBigBagOrQuarry || (matched && matched.weightKg && matched.weightKg >= 100)) {
      hasCraneItem = true;
    }

    // --- 3. ORIGIN WAREHOUSE ASSIGNMENT ---
    // Warehouse 4 (החרש): Aggregates, cement, thermal plaster, blocks, curbs, crane freight
    // Warehouse 1 (התלמיד): Gypsum boards, metal profiles, paints, adhesives, screws, doors, finishing tools
    const wh = matched?.warehouse || '';
    const isLightOrGypsum =
      wh.includes('התלמיד') ||
      sku.startsWith('20') || // Gypsum
      sku.startsWith('21') || // Metal studs / tracks
      sku.startsWith('30') || // Paints / sealants
      name.includes('גבס') ||
      name.includes('פרופיל') ||
      name.includes('ניצב') ||
      name.includes('מסלול') ||
      name.includes('צבע') ||
      name.includes('סופר 7') ||
      name.includes('שפכטל') ||
      name.includes('סיליקון') ||
      name.includes('סרט שריון') ||
      name.includes('בורג') ||
      name.includes('ברגי') ||
      name.includes('דיבל') ||
      name.includes('דלת') ||
      name.includes('ידית');

    if (isLightOrGypsum && !isBigBagOrQuarry) {
      warehouseVoteTalmid += qty;
    } else {
      warehouseVoteHarash += qty;
    }

    // --- 4. DEPOSIT ENFORCEMENT ENGINE ---
    // A. Big Bags Deposit (60002): Mandatory 1:1 on bulk big-bags
    if (
      sku === '11501' ||
      sku === '11511' ||
      sku === '11551' ||
      sku === '11506' ||
      sku === '11570' ||
      sku === '11540' ||
      sku === '60002' ||
      unit === 'בלה' ||
      unit === 'שק גד' ||
      name.includes('בלה') ||
      name.includes('שק גדול')
    ) {
      bigBagCount60002 += qty;
    }

    // B. Cement & Dry Mortar bags for Saban Wooden Pallet (60060)
    else if (
      sku === '10002' || // מלט אפור 25 ק"ג נשר
      sku === '10001' || // מלט לבן 25 ק"ג
      sku === '14400' || // טיח תרמי 25 ק"ג
      sku === '15116' || // טיט יבש 25 ק"ג
      sku === '15181' || // דבק קרמיקה 25 ק"ג
      name.includes('מלט') ||
      name.includes('טיח') ||
      name.includes('דבק קרמיקה') ||
      name.includes('רובה')
    ) {
      cementAndMortarBags += qty;
    }

    // C. Small Quarry Bags (25 kg sand/gravel): 1 pallet per 50 bags
    else if (
      sku === '11001' || // חול ים 25 ק"ג
      sku === '11011' || // סומסום 25 ק"ג
      sku === '11006' || // חצץ 25 ק"ג
      (unit === 'שק' && (name.includes('חול') || name.includes('סומסום') || name.includes('חצץ')))
    ) {
      smallQuarryBags += qty;
    }

    // D. Block Pallet Deposit (60006):
    else if (sku === '12204' || name.includes('בלוק 20')) {
      blockPalletCount60006 += Math.ceil(qty / 75);
    } else if (sku === '12154' || name.includes('בלוק 15')) {
      blockPalletCount60006 += Math.ceil(qty / 100);
    } else if (sku === '12010' || name.includes('בלוק 10')) {
      blockPalletCount60006 += Math.ceil(qty / 150);
    } else if (name.includes('בלוק')) {
      blockPalletCount60006 += Math.ceil(qty / 80);
    }
  });

  // Calculate Saban Pallets (60060)
  let sabanPallets60060 = 0;
  if (cementAndMortarBags >= 20 && cementAndMortarBags <= 40) {
    sabanPallets60060 += 1;
  } else if (cementAndMortarBags > 40) {
    sabanPallets60060 += Math.ceil(cementAndMortarBags / 40);
  }

  if (smallQuarryBags > 0) {
    sabanPallets60060 += Math.ceil(smallQuarryBags / 50);
  }

  // Check Exemption Rule
  const isAllExempt =
    hasDepositExemptDeliveryCode ||
    (bigBagCount60002 === 0 && sabanPallets60060 === 0 && blockPalletCount60006 === 0);

  const finalBigBags = isAllExempt && hasDepositExemptDeliveryCode ? 0 : bigBagCount60002;
  const finalSabanPallets = isAllExempt && hasDepositExemptDeliveryCode ? 0 : sabanPallets60060;
  const finalBlockPallets = isAllExempt && hasDepositExemptDeliveryCode ? 0 : blockPalletCount60006;
  const totalPallets = finalSabanPallets + finalBlockPallets;

  // Build deposit text
  const depositParts: string[] = [];
  if (finalBigBags > 0) {
    depositParts.push(`${finalBigBags} שק בלה (מק"ט 60002)`);
  }
  if (finalSabanPallets > 0) {
    depositParts.push(`${finalSabanPallets} משטח עץ סבן (מק"ט 60060)`);
  }
  if (finalBlockPallets > 0) {
    depositParts.push(`${finalBlockPallets} משטח בלוקים (מק"ט 60006)`);
  }

  const depositDetails = depositParts.length > 0 ? depositParts.join(' + ') : 'ללא פקדון (פטור)';

  // --- 5. SMART DISPATCH MAPPING ---
  const isCraneDispatch = hasCraneItem || totalWeightKg >= 1500 || warehouseVoteHarash > warehouseVoteTalmid;
  const primaryWarehouse = isCraneDispatch ? '🏭 4️⃣(החרש)' : '🏟️ 1️⃣(התלמיד)';
  const recommendedDriver = isCraneDispatch ? 'חכמת (מנוף)' : 'עלי (משאית רגילה)';
  const recommendedTruckType = isCraneDispatch
    ? 'משאית מרצדס מנוף (615-41-002)'
    : 'משאית רגילה / פתוחה (משאית עלי)';

  // --- 6. WEIGHT & OVERLOAD COMPLIANCE ---
  const totalWeightTons = Number((totalWeightKg / 1000).toFixed(2));
  const isOverloaded = totalWeightKg > 15000;
  const overloadAlert = isOverloaded
    ? '⚠️ חריגת משקל: נדרש פיצול המשלוח לשני סבבים'
    : undefined;

  return {
    totalWeightKg: Math.round(totalWeightKg),
    totalWeightTons,
    hasCraneItem: isCraneDispatch,
    warehouse: primaryWarehouse,
    recommendedDriver,
    recommendedTruckType,
    depositDetails,
    depositBigBags: finalBigBags,
    depositPallets: totalPallets,
    depositSabanPallets: finalSabanPallets,
    depositBlockPallets: finalBlockPallets,
    isOverloaded,
    overloadAlert,
    depositBreakdown: {
      bigBags60002: finalBigBags,
      sabanPallets60060: finalSabanPallets,
      blockPallets60006: finalBlockPallets,
      isExempt: isAllExempt,
    },
  };
}


export function formatWeight(kg: number): string {
  if (kg >= 1000) {
    return `${(kg / 1000).toFixed(2)} טון (${kg.toLocaleString()} ק"ג)`;
  }
  return `${kg.toLocaleString()} ק"ג`;
}

// Convert an OrderItem into the exact 18-column Google Sheet row
export function formatOrderToGasTabRow(order: OrderItem): GasTabOrderRow {
  const metrics = calculateOrderMetrics(order.items || []);
  const weightKg = order.totalWeightKg || metrics.totalWeightKg;
  const weightTons = order.totalWeightTons || Number((weightKg / 1000).toFixed(2));
  const city = order.city || extractCityFromDestination(order.destination);
  const warehouse = order.warehouse || metrics.warehouse;
  const bigBags = order.depositBigBags ?? metrics.depositBigBags;
  const pallets = order.depositPallets ?? metrics.depositPallets;
  const truckType = order.truckType || (order.craneRequired || metrics.hasCraneItem ? 'משאית מרצדס מנוף (615-41-002)' : 'משאית רגילה / פתוחה');
  const wazeLink = order.wazeUrl || `https://waze.com/ul?q=${encodeURIComponent(order.destination)}&navigate=yes`;
  const driveFile = order.driveFileUrl || order.deliveryNotePdf || `https://drive.google.com/open?id=doc-${order.orderNumber}`;
  const verification = order.verificationCheck || (order.status === 'delivered' ? 'סופק ואושר' : order.craneRequired ? 'תיאום מנוף בוצע' : 'תקין לשיגור');
  const statusLabel = STATUS_MAP[order.status]?.label || order.status;

  const itemsString = (order.items || [])
    .map((i) => `${i.sku ? `[${i.sku}] ` : ''}${i.name} (${i.quantity} ${i.unit})`)
    .join(', ');

  const formattedDate = order.updatedAt
    ? new Date(order.updatedAt).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })
    : new Date().toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' });

  return {
    'מספר הזמנה': order.orderNumber,
    'שם לקוח': order.customerName,
    'מספר לקוח': order.customerNumber || (order.customerPhone ? order.customerPhone : `C-${order.orderNumber}`),
    'כתובת אתר / יעד': order.destination,
    'עיר': city,
    'מחסן יציאה': warehouse,
    'נהג משובץ': order.driver,
    'סוג משאית / מנוף': truckType,
    'שעת אספקה': order.deliveryTime,
    'משקל כולל (טון)': `${weightTons} טון`,
    'פירוט פריטים ומק"טים': itemsString,
    'בלות פקדון': bigBags > 0 ? `${bigBags} בלות` : '0',
    'משטחים פקדון': pallets > 0 ? `${pallets} משטחים` : '0',
    'סטטוס ביצוע': statusLabel,
    'קישור Waze': wazeLink,
    'קובץ הזמנה (Drive)': driveFile,
    'זמן עדכון אחרון': formattedDate,
    'בדיקה': verification,
  };
}
