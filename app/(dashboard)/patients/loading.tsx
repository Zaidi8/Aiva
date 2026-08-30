import {
  PageHeaderSkeleton,
  SkeletonToolbar,
  SkeletonStatsRow,
  SkeletonList,
} from '@/components/ui/skeletons';

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton />
      <div className="mx-auto max-w-7xl space-y-8 p-8">
        <SkeletonToolbar />
        <SkeletonStatsRow />
        <SkeletonList rows={5} />
      </div>
    </>
  );
}
