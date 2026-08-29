import {
  PageHeaderSkeleton,
  SkeletonToolbar,
  SkeletonStatsRow,
  SkeletonList,
} from '@/components/ui/skeletons';

export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <PageHeaderSkeleton />
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <SkeletonToolbar />
        <SkeletonStatsRow />
        <SkeletonList rows={5} />
      </div>
    </div>
  );
}
