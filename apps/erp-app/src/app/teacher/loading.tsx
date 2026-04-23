export default function TeacherLoading() {
  return (
    <div className="flex-1 p-6 animate-pulse">
      <div className="h-8 w-48 bg-gray-200 rounded mb-6" />
      <div className="space-y-4">
        <div className="h-4 bg-gray-200 rounded w-full max-w-2xl" />
        <div className="h-4 bg-gray-200 rounded w-full max-w-xl" />
        <div className="h-4 bg-gray-200 rounded w-3/4 max-w-lg" />
        <div className="h-32 bg-gray-200 rounded w-full mt-6" />
        <div className="h-32 bg-gray-200 rounded w-full" />
      </div>
    </div>
  )
}
