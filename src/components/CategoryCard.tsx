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
}

export function CategoryCard({ categoryId, count, onClick }: CategoryCardProps) {
  const category = CATEGORIES.find(c => c.id === categoryId);
  if (!category) return null;

  const Icon = iconMap[category.icon] || Package;

  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-5 transition-all hover:border-glow hover:glow-primary"
    >
      <div
        className="flex h-12 w-12 items-center justify-center rounded-md bg-secondary"
        style={{ color: category.color }}
      >
        <Icon className="h-6 w-6" />
      </div>
      <div className="text-center">
        <p className="font-display text-sm font-semibold text-card-foreground">{category.label}</p>
        <p className="mt-1 font-display text-2xl font-bold text-primary">{count}</p>
      </div>
    </button>
  );
}
