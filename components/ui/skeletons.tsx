// Aiva — reusable loading skeletons.
//
// These are layout-matched placeholders used by route-level loading.tsx files
// and <Suspense> fallbacks so the persistent shell (sidebar/topbar) paints
// instantly while page content streams in — with zero layout shift when the
// real data arrives. Dimensions mirror the corresponding real components
// (TopBar, StatsBar, the patient/doctor/appointment cards, etc.).

import { Skeleton } from './skeleton';
import { Card, CardContent } from './card';

// Mirrors TopBar's sticky header (px-6 py-4, h1 text-xl + optional subtitle,
// right-aligned action). Rendered by loading.tsx so there's no header jump when
// the real page (which renders its own TopBar) takes over.
export function PageHeaderSkeleton({
  withDescription = true,
  withAction = true,
}: {
  withDescription?: boolean;
  withAction?: boolean;
}) {
  return (
    <div className="sticky top-0 z-30 border-b border-border bg-card/80 px-6 py-4 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          {withDescription && <Skeleton className="h-4 w-72" />}
        </div>
        <div className="flex items-center gap-3">
          {withAction && <Skeleton className="h-10 w-40 rounded-md" />}
        </div>
      </div>
    </div>
  );
}

// A single stat tile (mirrors the new StatCard: label + value on the left,
// circular accent icon on the right).
export function SkeletonStat() {
  return (
    <Card className="gap-0 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-16" />
        </div>
        <Skeleton className="size-11 rounded-xl" />
      </div>
    </Card>
  );
}

export function SkeletonStatsRow({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStat key={i} />
      ))}
    </div>
  );
}

// A generic content card block (charts, panels, forms).
export function SkeletonCard({ lines = 4 }: { lines?: number }) {
  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <Skeleton className="h-5 w-40" />
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}

// Chart placeholder — a title + a tall block sized like a recharts container.
export function SkeletonChart({ height = 260 }: { height?: number }) {
  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="w-full rounded-md" style={{ height }} />
      </CardContent>
    </Card>
  );
}

// A person/record card row (mirrors patient/doctor/staff cards: avatar + two
// text lines + trailing actions).
export function SkeletonRecordCard() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-6">
          <Skeleton className="w-16 h-16 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-9 w-32 rounded-md" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRecordCard key={i} />
      ))}
    </div>
  );
}

// Compact list rows inside a bordered container (e.g. call list, transcript).
export function SkeletonTable({ rows = 6 }: { rows?: number }) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0 divide-y divide-gray-100">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-6 py-4">
            <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// Full-width search / filter bar placeholder.
export function SkeletonToolbar() {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <Skeleton className="h-12 flex-1 rounded-md" />
      <Skeleton className="h-12 w-48 rounded-md" />
    </div>
  );
}
