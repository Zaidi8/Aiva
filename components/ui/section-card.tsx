import * as React from "react";

import { Card } from "./card";
import { cn } from "./utils";

interface SectionCardProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Right-aligned header action (button, menu, filter). */
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Overrides padding/classes on the content region. */
  contentClassName?: string;
  /** Remove the default content padding (e.g. when embedding a table). */
  noPadding?: boolean;
}

function SectionCard({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
  noPadding,
}: SectionCardProps) {
  const hasHeader = title || description || action;

  return (
    <Card className={cn("gap-0 overflow-hidden", className)}>
      {hasHeader && (
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div className="min-w-0 space-y-1">
            {title && (
              <h3 className="text-base font-semibold leading-none tracking-tight">
                {title}
              </h3>
            )}
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={cn(!noPadding && "px-6 py-5", contentClassName)}>
        {children}
      </div>
    </Card>
  );
}

export { SectionCard };
