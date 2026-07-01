import { PageHeaderSkeleton, SkeletonList } from '@/components/ui/skeletons';

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#F7F9FB]">
      <PageHeaderSkeleton />
      <div className="p-8 max-w-5xl mx-auto space-y-4">
        <SkeletonList rows={4} />
      </div>
    </div>
  );
}
