export interface ElectronicComponent {
  id: string;
  name: string;
  category: ComponentCategory;
  type: string;
  value?: string;
  package: string;
  quantity: number;
  minQuantity?: number;
  location?: string;
  barcode?: string;
  datasheetUrl?: string;
  purchaseUrl?: string;
  manufacturer?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export type ComponentCategory =
  | 'resistors'
  | 'capacitors'
  | 'inductors'
  | 'diodes'
  | 'transistors'
  | 'ics'
  | 'connectors'
  | 'leds'
  | 'crystals'
  | 'fuses'
  | 'relays'
  | 'other';

export interface CategoryInfo {
  id: ComponentCategory;
  label: string;
  icon: string;
  color: string;
}
