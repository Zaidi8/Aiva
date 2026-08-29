import * as React from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { Card } from "./card";
import { cn } from "./utils";

const accentMap = {
  primary: "bg-primary-muted text-primary",
  teal: "bg-brand-teal-muted text-brand-teal-muted-foreground",
  success: "bg-success-muted text-success-muted-foreground",
  warning: "bg-warning-muted text-warning-muted-foreground",
  info: "bg-info-muted text-info-muted-foreground",
  destructive: "bg-destructive-muted text-destructive-muted-foreground",
} as const;

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  /** Trend chip. `direction` picks the arrow + color; up=positive by default. */
  trend?: {
    value: string;
    direction: "up" | "down" | "neutral";
  };
  /** Muted text shown after the trend, e.g. "vs last week". */
  hint?: string;
  accent?: keyof typeof accentMap;
  className?: string;
}

function StatCard({
  label,
  value,
  icon,
  trend,
  hint,
  accent = "primary",
  className,
}: StatCardProps) {
  const TrendIcon =
    trend?.direction === "up"
      ? ArrowUpRight
      : trend?.direction === "down"
        ? ArrowDownRight
        : Minus;

  const trendColor =
    trend?.direction === "up"
      ? "text-success-muted-foreground"
      : trend?.direction === "down"
        ? "text-destructive-muted-foreground"
        : "text-muted-foreground";

  return (
    <Card className={cn("gap-0 p-6", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1.5">
          <p className="truncate text-sm font-medium text-muted-foreground">
            {label}
          </p>
          <div className="text-2xl font-semibold tracking-tight text-foreground">
            {value}
          </div>
        </div>
        {icon && (
          <div
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-xl [&_svg]:size-5",
              accentMap[accent],
            )}
          >
            {icon}
          </div>
        )}
      </div>
      {(trend || hint) && (
        <div className="mt-4 flex items-center gap-1.5 text-sm">
          {trend && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-medium",
                trendColor,
              )}
            >
              <TrendIcon className="size-4" />
              {trend.value}
            </span>
          )}
          {hint && <span className="text-muted-foreground">{hint}</span>}
        </div>
      )}
    </Card>
  );
}

export { StatCard };
