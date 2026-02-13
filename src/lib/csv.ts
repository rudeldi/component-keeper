import { ElectronicComponent, ComponentCategory } from '@/types/component';
import { CATEGORIES } from '@/data/constants';

const CSV_HEADERS = [
  'name', 'category', 'type', 'value', 'package', 'quantity',
  'minQuantity', 'location', 'barcode', 'datasheetUrl', 'manufacturer', 'description',
] as const;

const HEADER_LABELS: Record<string, string> = {
  name: 'Bezeichnung', category: 'Kategorie', type: 'Typ', value: 'Wert',
  package: 'Bauform', quantity: 'Menge', minQuantity: 'Mindestmenge',
  location: 'Lagerort', barcode: 'Barcode', datasheetUrl: 'Datenblatt-URL',
  manufacturer: 'Hersteller', description: 'Beschreibung',
};

function escapeCsv(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

export function exportToCsv(components: ElectronicComponent[]): string {
  const header = CSV_HEADERS.map(h => escapeCsv(HEADER_LABELS[h])).join(',');
  const rows = components.map(c =>
    CSV_HEADERS.map(h => {
      const val = c[h as keyof ElectronicComponent];
      return escapeCsv(val != null ? String(val) : '');
    }).join(',')
  );
  return [header, ...rows].join('\n');
}

export function downloadCsv(components: ElectronicComponent[], filename = 'bauteile.csv') {
  const csv = exportToCsv(components);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  result.push(current.trim());
  return result;
}

const LABEL_TO_KEY: Record<string, string> = {};
Object.entries(HEADER_LABELS).forEach(([k, v]) => {
  LABEL_TO_KEY[v.toLowerCase()] = k;
});
// Also accept English keys directly
CSV_HEADERS.forEach(h => { LABEL_TO_KEY[h.toLowerCase()] = h; });

const VALID_CATEGORIES = new Set(CATEGORIES.map(c => c.id));
const CATEGORY_LABEL_TO_ID: Record<string, ComponentCategory> = {};
CATEGORIES.forEach(c => { CATEGORY_LABEL_TO_ID[c.label.toLowerCase()] = c.id; });

export interface CsvImportResult {
  components: Omit<ElectronicComponent, 'id' | 'createdAt' | 'updatedAt'>[];
  errors: string[];
}

export function parseCsvImport(text: string): CsvImportResult {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { components: [], errors: ['CSV enthält keine Daten.'] };

  const headerCells = parseCsvLine(lines[0]);
  const mapping = headerCells.map(h => LABEL_TO_KEY[h.toLowerCase()] || null);

  if (!mapping.includes('name')) {
    return { components: [], errors: ['Spalte "Bezeichnung" (name) nicht gefunden.'] };
  }

  const components: CsvImportResult['components'] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const row: Record<string, string> = {};
    mapping.forEach((key, idx) => {
      if (key && cells[idx]) row[key] = cells[idx];
    });

    if (!row.name) { errors.push(`Zeile ${i + 1}: Bezeichnung fehlt.`); continue; }

    let category: ComponentCategory = 'other';
    if (row.category) {
      const lower = row.category.toLowerCase();
      if (VALID_CATEGORIES.has(lower as ComponentCategory)) {
        category = lower as ComponentCategory;
      } else if (CATEGORY_LABEL_TO_ID[lower]) {
        category = CATEGORY_LABEL_TO_ID[lower];
      }
    }

    components.push({
      name: row.name,
      category,
      type: row.type || '',
      value: row.value || undefined,
      package: row.package || '',
      quantity: parseInt(row.quantity) || 0,
      minQuantity: row.minQuantity ? parseInt(row.minQuantity) : undefined,
      location: row.location || undefined,
      barcode: row.barcode || undefined,
      datasheetUrl: row.datasheetUrl || undefined,
      manufacturer: row.manufacturer || undefined,
      description: row.description || undefined,
    });
  }

  return { components, errors };
}
