'use client'

import Link from 'next/link'
import { BookOpen, ArrowUpRight } from 'lucide-react'

interface CourseBadgeLinkProps {
  courseId: string
  courseTitle?: string | null
  courseAccessCode?: string | null
}

export function CourseBadgeLink({ courseId, courseTitle, courseAccessCode }: CourseBadgeLinkProps) {
  const displayCode = (courseAccessCode && courseAccessCode.trim()) ? courseAccessCode : courseId.slice(0, 8)

  return (
    <Link
      href={`/teacher/courses/${courseId}`}
      className="group inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-800 hover:bg-indigo-100 transition-colors flex-shrink-0"
      title={courseTitle ? `Course: ${courseTitle} (${displayCode})` : `Course (${displayCode})`}
    >
      <BookOpen className="h-3.5 w-3.5 text-indigo-700" />
      <span className="inline-flex items-center rounded-full border border-indigo-200 bg-white/70 px-2 py-0.5 font-mono text-[11px] text-indigo-800">
        {displayCode}
      </span>
      <ArrowUpRight className="h-3.5 w-3.5 text-indigo-500 opacity-70 group-hover:opacity-100" />
    </Link>
  )
}
