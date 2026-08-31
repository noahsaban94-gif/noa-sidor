const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '../src/data/raw_logistics.csv');
const csvData = fs.readFileSync(csvPath, 'utf-8');

function parseCSV(csv) {
  const lines = csv.trim().split('\n');
  const itemsBySku = new Map();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // CSV row parser handling quotes
    const row = [];
    let inQuotes = false;
    let current = '';

    for (let charIdx = 0; charIdx < line.length; charIdx++) {
      const char = line[charIdx];
      if (char === '"' && line[charIdx + 1] === '"') {
        current += '"';
        charIdx++;
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        row.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    row.push(current);

    const sku = (row[0] || '').trim();
    const name = (row[1] || '').trim();
    const category = (row[2] || '').trim();
    const unit = (row[3] || '').trim();
    const keywords = (row[4] || '').trim();
    const deposit = (row[5] || '').trim();
    const weightKg = parseFloat(row[6]) || 0;
    const warehouse = (row[7] || '').trim();
    const defaultDriver = (row[8] || '').trim();

    if (sku && name) {
      if (itemsBySku.has(sku)) {
        // Merge keywords if duplicate SKU exists in source spreadsheet
        const existing = itemsBySku.get(sku);
        const existingKw = existing.keywords ? existing.keywords.split(',').map((k) => k.trim()) : [];
        const newKw = (keywords || name).split(',').map((k) => k.trim());
        const combined = Array.from(new Set([...existingKw, ...newKw, name])).filter(Boolean).join(', ');
        existing.keywords = combined;
        if (!existing.category && category) existing.category = category;
        if (!existing.weightKg && weightKg) existing.weightKg = weightKg;
        if (existing.deposit === 'ללא' && deposit && deposit !== 'ללא') existing.deposit = deposit;
      } else {
        itemsBySku.set(sku, {
          sku,
          name,
          category,
          unit,
          keywords: keywords || name,
          deposit: deposit || 'ללא',
          weightKg,
          warehouse: warehouse || '🏭 4️⃣(החרש)',
          defaultDriver: defaultDriver || 'חכמת / עלי',
        });
      }
    }
  }

  return Array.from(itemsBySku.values());
}

const items = parseCSV(csvData);
const targetPath = path.join(__dirname, '../src/data/logistics_items.json');
fs.writeFileSync(targetPath, JSON.stringify(items, null, 2), 'utf-8');
console.log(`Successfully saved ${items.length} unique items to ${targetPath}`);
