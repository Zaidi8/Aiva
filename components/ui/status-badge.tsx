import * as React from "react";
import type { VariantProps } from "class-variance-authority";

import { Badge, badgeVariants } from "./badge";
import { cn } from "./utils";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

/*
 * Maps domain status strings (AppointmentStatus, CallOutcome, CallSentiment,
 * NotificationStatus, plus common synonyms) to a soft badge variant. Keyed by
 * lowercased status so callers can pass values straight from the API.
 */
const STATUS_MAP: Record<string, { variant: BadgeVariant; label?: string }> = {
  // Appointments
  confirmed: { variant: "success" },
  pending: { variant: "warning" },
  completed: { variant: "info" },
  cancelled: { variant: "destructive-soft" },
  canceled: { variant: "destructive-soft" },
  scheduled: { variant: "brand" },
  // Call outcomes
  assisted: { variant: "info" },
  transferred: { variant: "warning" },
  failed: { variant: "destructive-soft" },
  // Sentiment
  positive: { variant: "success" },
  neutral: { variant: "secondary" },
  negative: { variant: "destructive-soft" },
  // Notifications
  sent: { variant: "success" },
  // Generic lifecycle
  active: { variant: "success" },
  inactive: { variant: "secondary" },
  missed: { variant: "destructive-soft" },
  "no-show": { variant: "destructive-soft", label: "No-show" },
  no_show: { variant: "destructive-soft", label: "No-show" },
  "in-progress": { variant: "brand", label: "In progress" },
  in_progress: { variant: "brand", label: "In progress" },
};

function titleCase(value: string) {
  return value
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

interface StatusBadgeProps
  extends Omit<React.ComponentProps<typeof Badge>, "variant" | "children"> {
  status: string;
  showDot?: boolean;
}

function StatusBadge({
  status,
  showDot = true,
  className,
  ...props
}: StatusBadgeProps) {
  const key = (status ?? "").toLowerCase().trim();
  const entry = STATUS_MAP[key] ?? { variant: "secondary" as BadgeVariant };
  const label = entry.label ?? titleCase(status ?? "");

  return (
    <Badge
      variant={entry.variant}
      className={cn("gap-1.5 rounded-full", className)}
      {...props}
    >
      {showDot && (
        <span
          className="size-1.5 rounded-full bg-current opacity-80"
          aria-hidden
        />
      )}
      {label}
    </Badge>
  );
}

export { StatusBadge };
