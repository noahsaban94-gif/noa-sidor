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

export function calculateOrderMetrics(items: OrderProduct[]) {
  let totalWeightKg = 0;
  let hasCraneItem = false;
  let warehouseVoteHarash = 0;
  let warehouseVoteTalmid = 0;
  const deposits: string[] = [];

  let bagCount = 0;
  let bigBagCount = 0;
  let blockPalletCount = 0;

  items.forEach((item) => {
    const matched拼 = item.sku ? productMap.get(item.sku) : undefined;
    const qty = Number(item.quantity) || 1;

    // Weight calculation
    if (matched拼 && matched拼.weightKg) {
      totalWeightKg += matched拼.weightKg * qty;
    } else {
      // Heuristic fallback weights
      const name = item.name.toLowerCase();
      if (name.includes('בלה') || item.unit.includes('בלה') || item.unit.includes('שק גד')) {
        totalWeightKg += 1200 * qty;
      } else if (name.includes('מלט') || name.includes('טיט') || name.includes('דבק') || item.unit === 'שק') {
        totalWeightKg += 25 * qty;
      } else if (name.includes('גבס') || item.unit === 'לוח') {
        totalWeightKg += 24 * qty;
      } else if (name.includes('בלוק')) {
        totalWeightKg += 1150 * qty;
      } else {
        totalWeightKg += 2 * qty;
      }
    }

    // Crane requirement check (Quarry materials, big bags, blocks, high weight items)
    const isHeavyQuarryOrCrane =
      (matched拼 && (matched拼.unit === 'בלה' || matched拼.unit === 'שק גד' || matched拼.name.includes('בלה') || (matched拼.weightKg && matched拼.weightKg > 100))) ||
      item.unit === 'בלה' ||
      item.unit === 'שק גד' ||
      item.name.includes('בלה') ||
      item.name.includes('חול') ||
      item.name.includes('סומסום') ||
      item.name.includes('טיט') ||
      item.name.includes('בלוק');

    if (isHeavyQuarryOrCrane) {
      hasCraneItem = true;
    }

    // Warehouse assignment
    // Harash (4) -> Heavy quarry materials, big bags, cement, blocks
    // Talmid (1) -> Gypsum boards (white/green/blue), metal profiles, paints, adhesives, light equipment
    const wh = matched拼?.warehouse || '';
    const name = item.name.toLowerCase();
    if (
      wh.includes('התלמיד') ||
      name.includes('גבס') ||
      name.includes('פרופיל') ||
      name.includes('ניצב') ||
      name.includes('מסלול') ||
      name.includes('צבע') ||
      name.includes('סופר 7') ||
      name.includes('שפכטל') ||
      name.includes('להב')
    ) {
      warehouseVoteTalmid += qty;
    } else {
      warehouseVoteHarash += qty;
    }

    // Deposits tracking
    if (item.unit === 'בלה' || item.unit === 'שק גד' || item.name.includes('בלה') || item.name.includes('חול') || item.name.includes('סומסום')) {
      bigBagCount += qty;
    } else if (item.unit === 'שק' || item.name.includes('מלט') || item.name.includes('טיט') || item.name.includes('דבק')) {
      bagCount += qty;
    } else if (item.name.includes('בלוק')) {
      blockPalletCount += qty;
    }
  });

  let palletsCount足 = 0;
  if (bagCount >= 30) {
    palletsCount足 += Math.ceil(bagCount / 40);
  } else if (bagCount >= 10) {
    palletsCount足 += 1;
  }
  palletsCount足 += blockPalletCount;

  if (bigBagCount > 0) {
    deposits.push(`${bigBagCount} שקי בלה (60002)`);
  }
  if (palletsCount足 > 0) {
    deposits.push(`${palletsCount足} משטחי פקדון (סבן/בלוקים)`);
  }

  // Automatic Smart Dispatch by Noa AI:
  // 1. Heavy items / quarry / crane required -> Hachmat (Mercedes Crane 615-41-002) & Warehouse 4 (Harash)
  // 2. Gypsum systems / metal profiles / light items -> Ali (Standard Flatbed Truck) & Warehouse 1 (Talmid)
  const isCraneDispatch = hasCraneItem || totalWeightKg >= 1500 || warehouseVoteHarash > warehouseVoteTalmid;
  const primaryWarehouse = isCraneDispatch ? '🏭 4️⃣(החרש)' : '🏟️ 1️⃣(התלמיד)';
  const recommendedDriver = isCraneDispatch ? 'חכמת (מנוף)' : 'עלי (משאית רגילה)';
  const recommendedTruckType剩 = isCraneDispatch
    ? 'משאית מרצדס מנוף (615-41-002)'
    : 'משאית רגילה פתוחה (משאית עלי)';

  const depositDetails = deposits.length > 0 ? deposits.join(' + ') : 'ללא פקדון';
  const totalWeightTons = Number((totalWeightKg / 1000).toFixed(2));

  return {
    totalWeightKg: Math.round(totalWeightKg),
    totalWeightTons,
    hasCraneItem: isCraneDispatch,
    warehouse: primaryWarehouse,
    recommendedDriver,
    recommendedTruckType: recommendedTruckType剩,
    depositDetails,
    depositBigBags: bigBagCount,
    depositPallets: palletsCount足,
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
