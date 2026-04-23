import Link from 'next/link'
import {
  ArrowUpRight,
  Calendar,
  FileText,
  FolderOpen,
  GraduationCap,
  MessageSquare,
  Sparkles,
} from 'lucide-react'
import type { ComponentType } from 'react'

import { cn } from '../../../lib/utils'

export type TeachingStudioAccentColor = 'blue' | 'violet'

export interface TeachingStudioTranslations {
  title: string
  subtitle: string
  aiPoweredWorkflow: string
  step1Title: string
  step1Desc: string
  step2Title: string
  step2Desc: string
  step3Title: string
  step3Desc: string
  createManageContent: string
  createManageContentDesc: string
  recommendedStartingPoint: string
  openWorkspace: string
  connectedNote: string
  tileDocuments: string
  tileDocumentsDesc: string
  tileDocumentsBadge: string
  tileExams: string
  tileExamsDesc: string
  tileExamsBadge: string
  tileLessons: string
  tileLessonsDesc: string
  tileLessonsBadge: string
  tileCourses: string
  tileCoursesDesc: string
  tileCoursesBadge: string
  tileAiTutor: string
  tileAiTutorDesc: string
  tileAiTutorBadge: string
}

const DEFAULT_TRANSLATIONS: TeachingStudioTranslations = {
  title: 'Teaching Studio',
  subtitle: 'Your content command center: build a knowledge base, generate lessons and assessments, then deliver and track learning across your classes.',
  aiPoweredWorkflow: 'AI-powered content workflow',
  step1Title: '1. Upload & organize',
  step1Desc: 'Add PDFs, slides, notes, and resources.',
  step2Title: '2. Generate materials',
  step2Desc: 'Create lessons and exams from your knowledge base.',
  step3Title: '3. Deliver & track',
  step3Desc: 'Assign to classes and manage on your calendar.',
  createManageContent: 'Create & manage content',
  createManageContentDesc: 'Everything you need to build your curriculum and assessments.',
  recommendedStartingPoint: 'Recommended starting point: Documents',
  openWorkspace: 'Open workspace',
  connectedNote: 'Connected to your classes & calendar',
  tileDocuments: 'Documents',
  tileDocumentsDesc: 'Store PDFs, slides, and reference materials that power your lessons, exams, and AI generation.',
  tileDocumentsBadge: 'Knowledge base',
  tileExams: 'Exams & Quizzes',
  tileExamsDesc: 'Design and generate assessments from your documents with smart question generation and translations.',
  tileExamsBadge: 'Assessment',
  tileLessons: 'Lessons',
  tileLessonsDesc: 'Turn ideas and documents into structured lessons, ready to assign to classes or schedule on the calendar.',
  tileLessonsBadge: 'Learning flow',
  tileCourses: 'Courses',
  tileCoursesDesc: 'Bundle lessons, documents, and exams into complete courses that you can run with your classes.',
  tileCoursesBadge: 'Curriculum',
  tileAiTutor: 'AI Tutor & Chat',
  tileAiTutorDesc: 'Use AI to generate questions, summarize materials, and co-create learning content from your resources.',
  tileAiTutorBadge: 'AI co-pilot',
}

export type TeachingStudioHubProps = {
  accentColor?: TeachingStudioAccentColor
  title?: string
  subtitle?: string
  translations?: Partial<TeachingStudioTranslations>
}

type AccentTheme = {
  badge: string
  ctaText: string
  focusRing: string
  heroGlow: string
  heroRing: string
  mutedPill: string
  stepIcon: string
}

const ACCENTS: Record<TeachingStudioAccentColor, AccentTheme> = {
  blue: {
    badge: 'bg-blue-50 text-blue-700 border-blue-100',
    ctaText: 'text-blue-600',
    focusRing: 'focus-visible:ring-blue-500',
    heroGlow: 'from-blue-50 via-white to-white',
    heroRing: 'ring-blue-100',
    mutedPill: 'bg-blue-50 text-blue-700 border-blue-100',
    stepIcon: 'bg-blue-100 text-blue-700',
  },
  violet: {
    badge: 'bg-violet-50 text-violet-700 border-violet-100',
    ctaText: 'text-violet-600',
    focusRing: 'focus-visible:ring-violet-500',
    heroGlow: 'from-violet-50 via-white to-white',
    heroRing: 'ring-violet-100',
    mutedPill: 'bg-violet-50 text-violet-700 border-violet-100',
    stepIcon: 'bg-violet-100 text-violet-700',
  },
}

type StudioTile = {
  title: string
  description: string
  href: string
  icon: ComponentType<{ className?: string }>
  accent: string
  badge: string
}

function TileCard({ tile, theme, openWorkspaceLabel, connectedNoteLabel }: { tile: StudioTile; theme: AccentTheme; openWorkspaceLabel: string; connectedNoteLabel: string }) {
  const Icon = tile.icon

  return (
    <Link
      href={tile.href}
      className={cn(
        'group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        theme.focusRing
      )}
    >
      <div
        className={cn(
          'absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r opacity-80 transition-opacity group-hover:opacity-100',
          tile.accent
        )}
      />

      <div className="flex items-start gap-3">
        <div
          className={cn(
            'mt-1 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br',
            tile.accent
          )}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900">{tile.title}</h3>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-600">
              {tile.badge}
            </span>
          </div>
          <p className="text-xs leading-relaxed text-gray-600">{tile.description}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs">
        <span
          className={cn(
            'inline-flex items-center gap-1 font-medium transition-all group-hover:gap-1.5',
            theme.ctaText
          )}
        >
          {openWorkspaceLabel}
          <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
        <span className="text-[11px] text-gray-500">{connectedNoteLabel}</span>
      </div>
    </Link>
  )
}

export function TeachingStudioHub({ accentColor = 'violet', title, subtitle, translations: translationsProp }: TeachingStudioHubProps) {
  const theme = ACCENTS[accentColor]
  const t = { ...DEFAULT_TRANSLATIONS, ...translationsProp }

  const studioTiles: StudioTile[] = [
    {
      title: t.tileDocuments,
      description: t.tileDocumentsDesc,
      href: '/teacher/documents',
      icon: FolderOpen,
      accent: 'from-sky-500/80 to-blue-600',
      badge: t.tileDocumentsBadge,
    },
    {
      title: t.tileExams,
      description: t.tileExamsDesc,
      href: '/teacher/exams',
      icon: FileText,
      accent: 'from-amber-500/80 to-orange-600',
      badge: t.tileExamsBadge,
    },
    {
      title: t.tileLessons,
      description: t.tileLessonsDesc,
      href: '/teacher/lessons',
      icon: GraduationCap,
      accent: 'from-emerald-500/80 to-teal-600',
      badge: t.tileLessonsBadge,
    },
    {
      title: t.tileCourses,
      description: t.tileCoursesDesc,
      href: '/teacher/courses',
      icon: Sparkles,
      accent: 'from-fuchsia-500/80 to-violet-600',
      badge: t.tileCoursesBadge,
    },
    {
      title: t.tileAiTutor,
      description: t.tileAiTutorDesc,
      href: '/teacher/chat',
      icon: MessageSquare,
      accent: 'from-indigo-500/80 to-purple-600',
      badge: t.tileAiTutorBadge,
    },
  ]

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10">
      <section
        className={cn(
          'relative overflow-hidden rounded-3xl border border-gray-100 bg-gradient-to-b p-6 shadow-sm sm:p-8',
          theme.heroGlow
        )}
      >
        <div className={cn('absolute -right-24 -top-24 h-72 w-72 rounded-full blur-3xl', theme.heroRing)} />
        <header className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">{title ?? t.title}</h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-600">
              {subtitle ?? t.subtitle}
            </p>
          </div>
          <div
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium',
              theme.mutedPill
            )}
          >
            <Sparkles className="h-4 w-4" />
            {t.aiPoweredWorkflow}
          </div>
        </header>

        <div className="relative mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-100 bg-white/80 p-4 backdrop-blur">
            <div className="flex items-center gap-3">
              <div className={cn('inline-flex h-9 w-9 items-center justify-center rounded-xl', theme.stepIcon)}>
                <FolderOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-900">{t.step1Title}</p>
                <p className="text-xs text-gray-600">{t.step1Desc}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white/80 p-4 backdrop-blur">
            <div className="flex items-center gap-3">
              <div className={cn('inline-flex h-9 w-9 items-center justify-center rounded-xl', theme.stepIcon)}>
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-900">{t.step2Title}</p>
                <p className="text-xs text-gray-600">{t.step2Desc}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white/80 p-4 backdrop-blur">
            <div className="flex items-center gap-3">
              <div className={cn('inline-flex h-9 w-9 items-center justify-center rounded-xl', theme.stepIcon)}>
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-900">{t.step3Title}</p>
                <p className="text-xs text-gray-600">{t.step3Desc}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">{t.createManageContent}</h2>
            <p className="text-xs text-gray-600">{t.createManageContentDesc}</p>
          </div>
          <span className={cn('text-xs font-medium', theme.badge, 'rounded-full border px-3 py-1 w-fit')}>
            {t.recommendedStartingPoint}
          </span>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {studioTiles.map((tile) => (
            <TileCard key={tile.href} tile={tile} theme={theme} openWorkspaceLabel={t.openWorkspace} connectedNoteLabel={t.connectedNote} />
          ))}
        </div>
      </section>
    </div>
  )
}

