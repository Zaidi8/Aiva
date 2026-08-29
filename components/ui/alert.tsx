import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground border-border [&>svg]:text-muted-foreground",
        brand:
          "border-primary/20 bg-primary-muted text-foreground [&>svg]:text-primary *:data-[slot=alert-description]:text-primary-muted-foreground",
        destructive:
          "border-destructive/25 bg-destructive-muted text-destructive-muted-foreground [&>svg]:text-destructive *:data-[slot=alert-description]:text-destructive-muted-foreground/90",
        success:
          "border-success/25 bg-success-muted text-success-muted-foreground [&>svg]:text-success *:data-[slot=alert-description]:text-success-muted-foreground/90",
        warning:
          "border-warning/25 bg-warning-muted text-warning-muted-foreground [&>svg]:text-warning *:data-[slot=alert-description]:text-warning-muted-foreground/90",
        info: "border-info/25 bg-info-muted text-info-muted-foreground [&>svg]:text-info *:data-[slot=alert-description]:text-info-muted-foreground/90",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight",
        className,
      )}
      {...props}
    />
  );
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed",
        className,
      )}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription };
