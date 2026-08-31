import { OrderProduct, CatalogProduct } from '../types';
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
    const matched = item.sku ? productMap.get(item.sku) : undefined;
    const qty = Number(item.quantity) || 1;

    // Weight calculation
    if (matched && matched.weightKg) {
      totalWeightKg += matched.weightKg * qty;
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

    // Crane requirement check
    const isHeavy =
      (matched && (matched.unit === 'בלה' || matched.unit === 'שק גד' || matched.name.includes('בלה') || (matched.weightKg && matched.weightKg > 100))) ||
      item.unit === 'בלה' ||
      item.unit === 'שק גד' ||
      item.name.includes('בלה') ||
      item.name.includes('בלוק');

    if (isHeavy) {
      hasCraneItem = true;
    }

    // Warehouse assignment
    const wh = matched?.warehouse || '';
    if (wh.includes('התלמיד') || item.name.includes('גבס') || item.name.includes('סופר 7') || item.name.includes('להב')) {
      warehouseVoteTalmid += qty;
    } else {
      warehouseVoteHarash += qty;
    }

    // Deposits tracking
    if (item.unit === 'בלה' || item.unit === 'שק גד' || item.name.includes('בלה')) {
      bigBagCount += qty;
    } else if (item.unit === 'שק' || item.name.includes('מלט') || item.name.includes('טיט') || item.name.includes('דבק')) {
      bagCount += qty;
    } else if (item.name.includes('בלוק')) {
      blockPalletCount += qty;
    }
  });

  if (bigBagCount > 0) {
    deposits.push(`${bigBagCount} שקי בלה (60002)`);
  }
  if (bagCount >= 30) {
    const pallets = Math.ceil(bagCount / 40);
    deposits.push(`${pallets} משטח סבן (40 שקים)`);
  } else if (bagCount >= 10) {
    deposits.push(`משטח סבן`);
  }
  if (blockPalletCount > 0) {
    deposits.push(`${blockPalletCount} משטחי בלוקים`);
  }

  const primaryWarehouse =
    warehouseVoteTalmid > warehouseVoteHarash ? '🏟️ 1️⃣(התלמיד)' : '🏭 4️⃣(החרש)';

  const depositDetails = deposits.length > 0 ? deposits.join(' + ') : 'ללא פקדון';

  return {
    totalWeightKg: Math.round(totalWeightKg),
    hasCraneItem,
    warehouse: primaryWarehouse,
    depositDetails,
  };
}

export function formatWeight(kg: number): string {
  if (kg >= 1000) {
    return `${(kg / 1000).toFixed(1)} טון (${kg.toLocaleString()} ק"ג)`;
  }
  return `${kg.toLocaleString()} ק"ג`;
}
