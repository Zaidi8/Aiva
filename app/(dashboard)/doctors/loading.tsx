import {
  PageHeaderSkeleton,
  SkeletonList,
} from '@/components/ui/skeletons';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <PageHeaderSkeleton />
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <Skeleton className="h-12 w-full rounded-md" />
        <SkeletonList rows={4} />
      </div>
    </div>
  );
}
