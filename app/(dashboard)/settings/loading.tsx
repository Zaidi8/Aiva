import { PageHeaderSkeleton, SkeletonCard } from '@/components/ui/skeletons';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton withAction={false} />
      <div className="p-8 max-w-5xl mx-auto space-y-8">
        {/* Tabs bar */}
        <Skeleton className="h-10 w-full rounded-md" />
        <SkeletonCard lines={5} />
        <SkeletonCard lines={4} />
      </div>
    </>
  );
}
