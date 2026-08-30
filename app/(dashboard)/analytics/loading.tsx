import {
  PageHeaderSkeleton,
  SkeletonStatsRow,
  SkeletonChart,
} from '@/components/ui/skeletons';

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton />
      <div className="mx-auto max-w-7xl space-y-8 p-8">
        <SkeletonStatsRow />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <SkeletonChart />
          <SkeletonChart />
        </div>
        <SkeletonChart height={300} />
      </div>
    </>
  );
}
