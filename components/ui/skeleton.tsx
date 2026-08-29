import { cn } from "./utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "relative isolate overflow-hidden rounded-md bg-slate-100",
        "before:absolute before:inset-0 before:content-[''] before:-translate-x-full",
        "before:animate-shimmer before:bg-gradient-to-r before:from-transparent before:via-white/70 before:to-transparent",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
