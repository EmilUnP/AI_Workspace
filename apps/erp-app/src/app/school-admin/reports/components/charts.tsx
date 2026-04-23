'use client'

// Bar Chart Component
export function BarChart({ 
  data, 
  labels, 
  colors, 
  maxValue 
}: { 
  data: number[]
  labels: string[]
  colors: string[]
  maxValue: number
}) {
  const maxBarHeight = 200
  
  return (
    <div className="flex items-end justify-between gap-2 h-[220px] px-2">
      {data.map((value, index) => {
        const height = maxValue > 0 ? (value / maxValue) * maxBarHeight : 0
        const percentage = maxValue > 0 ? Math.round((value / maxValue) * 100) : 0
        
        return (
          <div key={index} className="flex flex-col items-center flex-1 gap-2">
            <div className="relative w-full flex items-end justify-center" style={{ height: maxBarHeight }}>
              <div
                className="w-full rounded-t-lg transition-all hover:opacity-90 relative group"
                style={{ 
                  height: `${height}px`,
                  backgroundColor: colors[index],
                  minHeight: value > 0 ? '8px' : '0px'
                }}
              >
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                  {value}
                </div>
              </div>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium text-gray-700">{labels[index]}</p>
              <p className="text-xs text-gray-500">{percentage}%</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Donut Chart Component
export function DonutChart({ 
  data, 
  labels: _labels, 
  colors 
}: { 
  data: number[]
  labels: string[]
  colors: string[]
}) {
  const total = data.reduce((sum, val) => sum + val, 0)
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">No data available</p>
      </div>
    )
  }
  
  let currentAngle = -90
  const radius = 80
  const circumference = 2 * Math.PI * radius
  const centerX = 100
  const centerY = 100
  
  const segments = data.map((value, index) => {
    const percentage = (value / total) * 100
    const angle = (value / total) * 360
    const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`
    const strokeDashoffset = -((currentAngle + 90) / 360) * circumference
    
    const segment = {
      value,
      percentage,
      angle,
      strokeDasharray,
      strokeDashoffset,
      color: colors[index],
      startAngle: currentAngle,
    }
    
    currentAngle += angle
    return segment
  })
  
  return (
    <div className="flex items-center justify-center relative">
      <svg width="200" height="200" className="transform -rotate-90">
        {segments.map((segment, index) => (
          <circle
            key={index}
            cx={centerX}
            cy={centerY}
            r={radius}
            fill="none"
            stroke={segment.color}
            strokeWidth="30"
            strokeDasharray={segment.strokeDasharray}
            strokeDashoffset={segment.strokeDashoffset}
            strokeLinecap="round"
            className="transition-all hover:opacity-80"
          />
        ))}
      </svg>
      <div className="absolute text-center">
        <p className="text-2xl font-bold text-gray-900">{total}</p>
        <p className="text-xs text-gray-500">Total</p>
      </div>
    </div>
  )
}
