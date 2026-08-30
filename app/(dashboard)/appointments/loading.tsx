import { PageHeaderSkeleton, SkeletonToolbar, SkeletonList } from '@/components/ui/skeletons';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton />
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        {/* Calendar + summary row */}
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Skeleton className="h-64 w-full rounded-lg" />
              <div className="space-y-3">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
              </div>
            </div>
          </CardContent>
        </Card>
        <SkeletonToolbar />
        <SkeletonList rows={4} />
      </div>
    </>
  );
}
