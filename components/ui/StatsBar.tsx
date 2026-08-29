import { LucideIcon } from 'lucide-react';

interface Stat {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  change?: string;
}

interface StatsBarProps {
  stats: Stat[];
}

export function StatsBar({ stats }: StatsBarProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="grid grid-cols-1 divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="mb-2 text-sm text-muted-foreground">{stat.label}</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-semibold tabular-nums text-foreground">
                      {stat.value}
                    </p>
                    {stat.change && (
                      <span className="text-sm font-medium text-success">
                        {stat.change}
                      </span>
                    )}
                  </div>
                </div>
                <div
                  className="flex size-12 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${stat.color}15` }}
                >
                  <Icon className="size-6" style={{ color: stat.color }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
