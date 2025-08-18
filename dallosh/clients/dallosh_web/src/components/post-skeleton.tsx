import { Skeleton } from "@/components/ui/skeleton";

export function PostSkeleton() {
  return (
    <div className="px-4 py-3 border-b border-gray-800">
      <div className="flex gap-3">
        {/* Avatar */}
        <Skeleton className="h-10 w-10 rounded-full" />
        
        <div className="flex-1 space-y-2">
          {/* Header */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12" />
          </div>
          
          {/* Content */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          
          {/* Actions */}
          <div className="flex items-center justify-between max-w-md pt-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function PostSkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="divide-y divide-gray-800">
      {Array.from({ length: count }).map((_, i) => (
        <PostSkeleton key={i} />
      ))}
    </div>
  );
}


