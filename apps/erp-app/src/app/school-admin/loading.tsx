export default function SchoolAdminLoading() {
  return (
    <div className="flex-1 p-6 animate-pulse">
      <div className="h-8 w-56 bg-gray-200 rounded mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-gray-200 rounded" />
        ))}
      </div>
      <div className="h-64 bg-gray-200 rounded w-full" />
    </div>
  )
}
