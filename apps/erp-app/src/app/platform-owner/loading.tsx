export default function PlatformOwnerLoading() {
  return (
    <div className="flex-1 p-6 animate-pulse">
      <div className="h-8 w-48 bg-gray-200 rounded mb-6" />
      <div className="space-y-4">
        <div className="h-4 bg-gray-200 rounded w-full max-w-2xl" />
        <div className="h-4 bg-gray-200 rounded w-full max-w-xl" />
        <div className="h-48 bg-gray-200 rounded w-full mt-6" />
      </div>
    </div>
  )
}
