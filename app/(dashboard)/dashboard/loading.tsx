import {
  PageHeaderSkeleton,
  SkeletonStatsRow,
} from '@/components/ui/skeletons';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton withDescription={false} />
      <div className="mx-auto max-w-7xl space-y-8 p-6">
        <SkeletonStatsRow />
        {/* AI status card */}
        <Skeleton className="h-40 w-full rounded-xl" />
        {/* Onboarding checklist / today's appointments */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-2 w-full rounded-full" />
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
