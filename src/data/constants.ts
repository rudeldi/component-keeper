import { CategoryInfo, ComponentCategory } from '@/types/component';

export const CATEGORIES: CategoryInfo[] = [
  { id: 'resistors', label: 'Widerstände', icon: 'Omega', color: 'hsl(175, 70%, 45%)' },
  { id: 'capacitors', label: 'Kondensatoren', icon: 'Battery', color: 'hsl(200, 70%, 55%)' },
  { id: 'inductors', label: 'Spulen', icon: 'Waypoints', color: 'hsl(280, 60%, 55%)' },
  { id: 'diodes', label: 'Dioden', icon: 'ArrowRight', color: 'hsl(40, 80%, 55%)' },
  { id: 'transistors', label: 'Transistoren', icon: 'GitBranch', color: 'hsl(150, 60%, 45%)' },
  { id: 'ics', label: 'ICs', icon: 'Cpu', color: 'hsl(340, 65%, 55%)' },
  { id: 'connectors', label: 'Steckverbinder', icon: 'Plug', color: 'hsl(25, 70%, 55%)' },
  { id: 'leds', label: 'LEDs', icon: 'Lightbulb', color: 'hsl(60, 80%, 55%)' },
  { id: 'crystals', label: 'Quarze', icon: 'Diamond', color: 'hsl(220, 60%, 60%)' },
  { id: 'fuses', label: 'Sicherungen', icon: 'Zap', color: 'hsl(0, 65%, 55%)' },
  { id: 'relays', label: 'Relais', icon: 'ToggleLeft', color: 'hsl(120, 50%, 45%)' },
  { id: 'other', label: 'Sonstige', icon: 'Package', color: 'hsl(220, 10%, 55%)' },
];

export const PACKAGES_SMD = [
  '0201', '0402', '0603', '0805', '1206', '1210', '1812', '2010', '2512',
  'SOT-23', 'SOT-223', 'SOT-89',
  'SOIC-8', 'SOIC-14', 'SOIC-16',
  'SOP-8', 'SSOP-16', 'SSOP-20', 'SSOP-28',
  'TSSOP-8', 'TSSOP-14', 'TSSOP-16', 'TSSOP-20',
  'QFP-32', 'QFP-44', 'QFP-48', 'QFP-64', 'QFP-100',
  'QFN-8', 'QFN-16', 'QFN-20', 'QFN-24', 'QFN-32', 'QFN-48',
  'BGA', 'WLCSP',
  'DO-214', 'SOD-123', 'SOD-323', 'SOD-523',
  'DPAK', 'D2PAK',
  'SC-70', 'SC-88',
];

export const PACKAGES_THT = [
  'DIP-8', 'DIP-14', 'DIP-16', 'DIP-20', 'DIP-28', 'DIP-40',
  'TO-92', 'TO-220', 'TO-247', 'TO-3',
  'DO-35', 'DO-41', 'DO-201',
  'Axial', 'Radial',
  'SIP',
];

export const ALL_PACKAGES = [...PACKAGES_SMD, ...PACKAGES_THT];

export const COMPONENT_TYPES: Record<ComponentCategory, string[]> = {
  resistors: ['Widerstand', 'Potentiometer', 'Trimmer', 'Thermistor (NTC)', 'Thermistor (PTC)', 'Varistor', 'Shunt', 'Netzwerk'],
  capacitors: ['Keramik (MLCC)', 'Elektrolyt', 'Tantal', 'Folie', 'Polymer'],
  inductors: ['Drossel', 'Ferritkern', 'Luftspule', 'SMD-Induktivität', 'Übertrager'],
  diodes: ['Gleichrichter', 'Schottky', 'Zener', 'TVS', 'Varicap', 'Brückengleichrichter'],
  transistors: ['N-MOSFET', 'P-MOSFET', 'NPN', 'PNP', 'IGBT', 'JFET'],
  ics: ['Mikrocontroller', 'Operationsverstärker', 'Spannungsregler', 'Treiber', 'ADC', 'DAC', 'Speicher', 'Logik-IC', 'Komparator', 'Timer', 'Schnittstellen-IC'],
  connectors: ['Pin Header', 'Buchsenleiste', 'USB', 'RJ45', 'JST', 'Molex', 'Schraubklemme', 'D-Sub', 'FPC/FFC'],
  leds: ['Standard LED', 'SMD LED', 'Power LED', 'RGB LED', 'IR LED', 'UV LED'],
  crystals: ['Quarz', 'Quarzoszillator', 'Keramikresonator', 'MEMS-Oszillator'],
  fuses: ['Schmelzsicherung', 'Rückstellbar (PTC)', 'SMD-Sicherung'],
  relays: ['Signalrelais', 'Leistungsrelais', 'Solid-State-Relais', 'Reed-Relais'],
  other: ['Kühlkörper', 'Jumper', 'Testpunkt', 'Abstandshalter', 'Sonstiges'],
};
