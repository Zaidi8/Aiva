import {
  PageHeaderSkeleton,
  SkeletonStatsRow,
  SkeletonTable,
} from '@/components/ui/skeletons';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton withDescription={false} />
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <SkeletonStatsRow />
        <Skeleton className="h-12 w-full rounded-md" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonTable rows={5} />
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
