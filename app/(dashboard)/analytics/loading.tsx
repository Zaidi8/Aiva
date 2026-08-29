import {
  PageHeaderSkeleton,
  SkeletonStatsRow,
  SkeletonChart,
} from '@/components/ui/skeletons';

export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <PageHeaderSkeleton />
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <SkeletonStatsRow />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <SkeletonChart />
          <SkeletonChart />
        </div>
        <SkeletonChart height={300} />
      </div>
    </div>
  );
}
