import {
  PageHeaderSkeleton,
  SkeletonList,
} from '@/components/ui/skeletons';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton />
      <div className="mx-auto max-w-7xl space-y-8 p-8">
        <Skeleton className="h-12 w-full rounded-md" />
        <SkeletonList rows={4} />
      </div>
    </>
  );
}
