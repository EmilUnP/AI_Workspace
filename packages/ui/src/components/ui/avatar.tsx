'use client'

import * as React from 'react'
import { cn } from '../../lib/utils'
import { getInitials, stringToColor } from '@eduator/core/utils/client'

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null
  alt?: string
  name?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt, name, size = 'md', ...props }, ref) => {
    const [imageError, setImageError] = React.useState(false)

    const initials = name ? getInitials(name) : '?'
    const backgroundColor = name ? stringToColor(name) : '#6b7280'

    if (src && !imageError) {
      return (
        <div
          ref={ref}
          className={cn(
            'relative inline-flex shrink-0 overflow-hidden rounded-full',
            sizeClasses[size],
            className
          )}
          {...props}
        >
          <img
            src={src}
            alt={alt || name || 'Avatar'}
            className="h-full w-full object-cover"
            onError={() => setImageError(true)}
          />
        </div>
      )
    }

    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-full font-medium text-white',
          sizeClasses[size],
          className
        )}
        style={{ backgroundColor }}
        {...props}
      >
        {initials}
      </div>
    )
  }
)
Avatar.displayName = 'Avatar'

export { Avatar }
