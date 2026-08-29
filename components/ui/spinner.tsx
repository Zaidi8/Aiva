import * as React from "react";
import { Loader2 } from "lucide-react";

import { cn } from "./utils";

const sizeMap = {
  sm: "size-4",
  default: "size-5",
  lg: "size-6",
  xl: "size-8",
} as const;

interface SpinnerProps extends React.ComponentProps<"div"> {
  size?: keyof typeof sizeMap;
  label?: string;
}

function Spinner({ size = "default", label, className, ...props }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-2 text-muted-foreground",
        className,
      )}
      {...props}
    >
      <Loader2 className={cn("animate-spin text-primary", sizeMap[size])} />
      {label ? (
        <span className="text-sm">{label}</span>
      ) : (
        <span className="sr-only">Loading</span>
      )}
    </div>
  );
}

export { Spinner };
