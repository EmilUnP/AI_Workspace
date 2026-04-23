'use client'

// Bar Chart Component
// valueLabel: 'value' = show raw number under each bar; 'percentage' = show % of max (relative to highest bar)
// valueSuffix only appears in tooltip when valueLabel === 'value'; omit valueSuffix to show number only under bar (avoids "tokentokens" overlap)
export function BarChart({
  data,
  labels,
  colors,
  maxValue,
  height = 200,
  valueLabel = 'percentage',
  valueSuffix = '',
  className = '',
}: {
  data: number[]
  labels: string[]
  colors: string[]
  maxValue: number
  height?: number
  valueLabel?: 'value' | 'percentage'
  valueSuffix?: string
  className?: string
}) {
  const barAreaHeight = Math.max(height - 20, 120)
  const labelHeight = 52

  return (
    <div
      className={`flex items-end justify-between gap-1 sm:gap-2 px-1 sm:px-2 min-h-0 overflow-visible ${className}`}
      style={{ height: barAreaHeight + labelHeight, minHeight: barAreaHeight + labelHeight }}
    >
      {data.map((value, index) => {
        const barHeight = maxValue > 0 ? (value / maxValue) * (barAreaHeight - 8) : 0
        const percentage = maxValue > 0 ? Math.round((value / maxValue) * 100) : 0
        const displayLabel =
          valueLabel === 'value'
            ? value.toLocaleString()
            : `${percentage}%`
        const tooltipText =
          valueLabel === 'value' && valueSuffix
            ? `${value.toLocaleString()} ${valueSuffix}`
            : value.toLocaleString()

        return (
          <div key={index} className="flex flex-col items-center flex-1 gap-1 min-w-0 min-h-[52px]">
            <div
              className="relative w-full flex items-end justify-center flex-shrink-0"
              style={{ height: barAreaHeight - 8 }}
            >
              <div
                className="w-full max-w-[28px] sm:max-w-[36px] lg:max-w-[48px] mx-auto rounded-t-md transition-all hover:opacity-90 relative group"
                style={{
                  height: `${barHeight}px`,
                  backgroundColor: colors[index],
                  minHeight: value > 0 ? 4 : 0,
                }}
              >
                <div className="absolute -top-9 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10 pointer-events-none">
                  {tooltipText}
                </div>
              </div>
            </div>
            <div className="text-center flex-shrink-0 w-full flex flex-col justify-end gap-0.5">
              <p className="text-[11px] sm:text-xs font-medium text-gray-700 leading-tight break-words overflow-visible" title={labels[index]}>
                {labels[index]}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 tabular-nums">{displayLabel}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Line Chart Component
export function LineChart({
  data,
  labels,
  colors = ['#3B82F6'],
  height = 200
}: {
  data: number[]
  labels: string[]
  colors?: string[]
  height?: number
}) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-gray-400" style={{ height }}>
        No trend data yet
      </div>
    )
  }

  const maxValue = Math.max(...data, 1)
  const viewBoxWidth = 100
  const viewBoxHeight = 60
  const paddingX = 4
  const paddingY = 4
  const chartWidth = viewBoxWidth - paddingX * 2
  const chartHeight = viewBoxHeight - paddingY * 2
  const pointRadius = 0.9
  const labelStep = labels.length > 8 ? Math.ceil(labels.length / 8) : 1

  const points = data.map((value, index) => {
    const x = paddingX + (index / (data.length - 1 || 1)) * chartWidth
    const y = paddingY + chartHeight - (value / maxValue) * chartHeight
    return { x, y, value, label: labels[index] }
  })

  const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaPathData = `${pathData} L ${paddingX + chartWidth} ${paddingY + chartHeight} L ${paddingX} ${paddingY + chartHeight} Z`
  const gradientId = `line-gradient-${colors[0].replace('#', '')}`
  const areaGradientId = `line-area-gradient-${colors[0].replace('#', '')}`

  return (
    <div className="w-full rounded-lg bg-gradient-to-b from-white to-gray-50/40 p-2" style={{ height }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`} preserveAspectRatio="none" className="overflow-visible">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors[0]} stopOpacity="0.9" />
            <stop offset="100%" stopColor={colors[0]} stopOpacity="0.75" />
          </linearGradient>
          <linearGradient id={areaGradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors[0]} stopOpacity="0.22" />
            <stop offset="100%" stopColor={colors[0]} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = paddingY + ratio * chartHeight
          return (
            <line
              key={ratio}
              x1={paddingX}
              y1={y}
              x2={paddingX + chartWidth}
              y2={y}
              stroke="#E2E8F0"
              strokeWidth={1}
              strokeDasharray="3 4"
            />
          )
        })}

        {/* Area fill under line */}
        <path d={areaPathData} fill={`url(#${areaGradientId})`} stroke="none" />

        {/* Line path */}
        <path
          d={pathData}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={0.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Points */}
        {points.map((point, index) => (
          <g key={index}>
            <circle
              cx={point.x}
              cy={point.y}
              r={pointRadius}
              fill="#ffffff"
              stroke={colors[0]}
              strokeWidth={0.45}
              className="hover:r-6 transition-all cursor-pointer"
            />
            <title>{`${point.label}: ${point.value}`}</title>
          </g>
        ))}
      </svg>

      {/* Labels */}
      <div className="flex justify-between mt-2 px-2">
        {labels.map((label, index) => (
          <span key={index} className="text-xs text-gray-500/90">
            {index % labelStep === 0 || index === labels.length - 1 ? label : ''}
          </span>
        ))}
      </div>
    </div>
  )
}

// Horizontal Bar Chart – good for category breakdowns (each value visible)
export function HorizontalBarChart({
  data,
  labels,
  colors,
  maxValue: maxValueProp,
  height,
  valueSuffix = '',
  showPercentage = true,
  totalLabel = 'Total',
}: {
  data: number[]
  labels: string[]
  colors: string[]
  maxValue?: number
  height?: number
  valueSuffix?: string
  showPercentage?: boolean
  totalLabel?: string
}) {
  const total = data.reduce((sum, val) => sum + val, 0)
  const maxValue = maxValueProp ?? Math.max(...data, 1)
  const rowHeight = 36
  const chartHeight = height ?? Math.max(data.length * rowHeight, 120)

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
        No data available
      </div>
    )
  }

  return (
    <div className="w-full" style={{ minHeight: chartHeight }}>
      <div className="space-y-3">
        {data.map((value, index) => {
          const barWidthPct = maxValue > 0 ? (value / maxValue) * 100 : 0
          const percentage = total > 0 ? (value / total) * 100 : 0
          return (
            <div
              key={index}
              className="flex items-center gap-3 group"
              style={{ minHeight: rowHeight }}
            >
              <div className="flex-shrink-0 w-[140px] sm:w-[160px] text-left">
                <span
                  className="text-sm font-medium text-gray-700 truncate block"
                  title={labels[index]}
                >
                  {labels[index]}
                </span>
              </div>
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <div className="flex-1 h-6 bg-gray-100 rounded-md overflow-hidden">
                  <div
                    className="h-full rounded-md transition-all duration-300 ease-out min-w-[4px]"
                    style={{
                      width: `${Math.max(barWidthPct, value > 0 ? 2 : 0)}%`,
                      backgroundColor: colors[index % colors.length],
                    }}
                    title={`${labels[index]}: ${value.toLocaleString()}${valueSuffix ? ` ${valueSuffix}` : ''} (${percentage.toFixed(1)}%)`}
                  />
                </div>
                <div className="flex-shrink-0 flex items-baseline gap-1.5 w-20 sm:w-24 justify-end">
                  <span className="text-sm font-semibold tabular-nums text-gray-900">
                    {value.toLocaleString()}
                    {valueSuffix ? ` ${valueSuffix}` : ''}
                  </span>
                  {showPercentage && (
                    <span className="text-xs text-gray-500 tabular-nums">
                      ({percentage.toFixed(0)}%)
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
        <span className="text-sm font-medium text-gray-500">{totalLabel}</span>
        <span className="text-sm font-bold tabular-nums text-gray-900">
          {total.toLocaleString()}
          {valueSuffix ? ` ${valueSuffix}` : ''}
        </span>
      </div>
    </div>
  )
}

// Donut Chart Component
export function DonutChart({ 
  data, 
  labels, 
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
      label: labels[index],
    }
    
    currentAngle += angle
    return segment
  })
  
  return (
    <div className="flex flex-col items-center">
      <div className="relative flex items-center justify-center">
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
              className="transition-all hover:opacity-80 cursor-pointer"
            >
              <title>{`${segment.label}: ${segment.value} (${segment.percentage.toFixed(1)}%)`}</title>
            </circle>
          ))}
        </svg>
        <div className="absolute text-center">
          <p className="text-2xl font-bold text-gray-900">{total}</p>
          <p className="text-xs text-gray-500">Total</p>
        </div>
      </div>
      
      {/* Legend - Moved to bottom */}
      <div className="mt-6 w-full">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {segments.map((segment, index) => (
            <div key={index} className="flex items-center gap-2 justify-center sm:justify-start">
              <div 
                className="h-3 w-3 rounded-full flex-shrink-0" 
                style={{ backgroundColor: segment.color }}
              />
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-1">
                <span className="text-xs font-medium text-gray-700">{segment.label}:</span>
                <span className="text-xs font-semibold text-gray-900">{segment.value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Progress Ring Component
export function ProgressRing({
  value,
  max,
  size = 120,
  strokeWidth = 12,
  color = '#3B82F6'
}: {
  value: number
  max: number
  size?: number
  strokeWidth?: number
  color?: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const progress = Math.min(value / max, 1)
  const offset = circumference - progress * circumference

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-300"
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-2xl font-bold text-gray-900">{Math.round(progress * 100)}%</p>
        <p className="text-xs text-gray-500">{value}/{max}</p>
      </div>
    </div>
  )
}
