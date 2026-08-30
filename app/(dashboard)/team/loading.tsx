import { PageHeaderSkeleton, SkeletonList } from '@/components/ui/skeletons';

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton />
      <div className="mx-auto max-w-5xl space-y-4 p-8">
        <SkeletonList rows={4} />
      </div>
    </>
  );
}
