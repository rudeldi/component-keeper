import { ComponentCategory } from '@/types/component';
import { CATEGORIES } from '@/data/constants';
import {
  Cpu, Battery, Waypoints, ArrowRight, GitBranch, Plug,
  Lightbulb, Diamond, Zap, ToggleLeft, Package, CircuitBoard
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Omega: CircuitBoard,
  Battery,
  Waypoints,
  ArrowRight,
  GitBranch,
  Cpu,
  Plug,
  Lightbulb,
  Diamond,
  Zap,
  ToggleLeft,
  Package,
};

interface CategoryCardProps {
  categoryId: ComponentCategory;
  count: number;
  onClick: () => void;
  active?: boolean;
}

export function CategoryCard({ categoryId, count, onClick, active }: CategoryCardProps) {
  const category = CATEGORIES.find(c => c.id === categoryId);
  if (!category) return null;

  const Icon = iconMap[category.icon] || Package;

  return (
    <button
      onClick={onClick}
      className={`group relative flex flex-col items-center gap-1.5 sm:gap-3 rounded-lg border bg-card p-2.5 sm:p-5 transition-all hover:border-glow hover:glow-primary ${active ? 'border-primary/50 glow-primary' : 'border-border'}`}
    >
      <div
        className="flex h-8 w-8 sm:h-12 sm:w-12 items-center justify-center rounded-md bg-secondary"
        style={{ color: category.color }}
      >
        <Icon className="h-4 w-4 sm:h-6 sm:w-6" />
      </div>
      <div className="text-center">
        <p className="font-display text-[10px] sm:text-sm font-semibold text-card-foreground leading-tight">{category.label}</p>
        <p className="font-display text-lg sm:text-2xl font-bold text-primary">{count}</p>
      </div>
    </button>
  );
}
