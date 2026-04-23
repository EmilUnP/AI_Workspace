'use client'

import { useState, useMemo } from 'react'
import { 
  FileText, 
  GraduationCap, 
  Clock,
  Sparkles,
  Search,
  X,
  GripVertical,
  ChevronDown,
} from 'lucide-react'

export interface DraftMaterial {
  id: string
  type: 'exam' | 'lesson'
  title: string
  description?: string | null
  topic?: string | null
  duration_minutes?: number | null
  is_published: boolean
  created_at: string
  questions?: any[]
}

export interface DraftsSidebarLabels {
  materialsLibrary: string
  itemsTotal: string
  target: string
  all: string
  searchMaterials: string
  noMaterialsFound: string
  tryDifferentSearch: string
  createExamsOrLessons: string
  showingXOfY: string
  dragToCalendar: string
  loadMore: string
  remaining: string
  dragHint: string
  live: string
  unused: string
}

const DEFAULT_DRAFTS_LABELS: DraftsSidebarLabels = {
  materialsLibrary: 'Materials Library',
  itemsTotal: 'items total',
  target: 'Target:',
  all: 'All',
  searchMaterials: 'Search materials...',
  noMaterialsFound: 'No materials found',
  tryDifferentSearch: 'Try a different search term',
  createExamsOrLessons: 'Create exams or lessons to see them here',
  showingXOfY: 'Showing {showing} of {total}',
  dragToCalendar: 'Drag to calendar',
  loadMore: 'Load more',
  remaining: 'remaining',
  dragHint: 'Drag any item to a calendar slot to schedule',
  live: '✓ Live',
  unused: '○ Unused',
}

export interface DraftsSidebarProps {
  drafts: DraftMaterial[]
  onDragStart?: (material: DraftMaterial) => void
  onDragEnd?: () => void
  onClose?: () => void
  isOpen?: boolean
  selectedClassId?: string
  selectedClassName?: string
  labels?: Partial<DraftsSidebarLabels>
}

const ITEMS_PER_PAGE = 15

export function DraftsSidebar({ 
  drafts, 
  onDragStart,
  onDragEnd,
  onClose,
  isOpen = true,
  selectedClassId,
  selectedClassName,
  labels: labelsProp
}: DraftsSidebarProps) {
  const L = { ...DEFAULT_DRAFTS_LABELS, ...labelsProp }
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'exam' | 'lesson'>('all')
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE)

  const filteredDrafts = useMemo(() => {
    return drafts.filter(draft => {
      const matchesSearch = draft.title.toLowerCase().includes(search.toLowerCase()) ||
        draft.description?.toLowerCase().includes(search.toLowerCase()) ||
        draft.topic?.toLowerCase().includes(search.toLowerCase())
      const matchesType = filterType === 'all' || draft.type === filterType
      return matchesSearch && matchesType
    })
  }, [drafts, search, filterType])

  const visibleDrafts = useMemo(() => {
    return filteredDrafts.slice(0, visibleCount)
  }, [filteredDrafts, visibleCount])

  const hasMore = visibleCount < filteredDrafts.length

  const loadMore = () => {
    setVisibleCount(prev => Math.min(prev + ITEMS_PER_PAGE, filteredDrafts.length))
  }

  // Reset visible count when filters change
  const handleFilterChange = (type: 'all' | 'exam' | 'lesson') => {
    setFilterType(type)
    setVisibleCount(ITEMS_PER_PAGE)
  }

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setVisibleCount(ITEMS_PER_PAGE)
  }

  const handleDragStart = (e: React.DragEvent, material: DraftMaterial) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: material.type,
      id: material.id,
      title: material.title
    }))
    e.dataTransfer.effectAllowed = 'move'
    
    // Add visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5'
    }
    
    onDragStart?.(material)
  }

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1'
    }
    onDragEnd?.()
  }

  if (!isOpen) return null

  // Render a single draft item
  const renderDraftItem = (draft: DraftMaterial) => (
    <div
      key={draft.id}
      draggable
      onDragStart={(e) => handleDragStart(e, draft)}
      onDragEnd={handleDragEnd}
      className="group relative cursor-move rounded-xl border border-gray-200 bg-white p-3 shadow-sm hover:shadow-md transition-all hover:border-indigo-300 hover:scale-[1.02]"
    >
      {/* Drag Handle */}
      <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="h-4 w-4 text-gray-400" />
      </div>

      <div className="flex items-start gap-3 pl-5">
        {/* Icon */}
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 ${
          draft.type === 'exam'
            ? 'bg-violet-100 text-violet-600'
            : 'bg-emerald-100 text-emerald-600'
        }`}>
          {draft.type === 'exam' ? (
            <FileText className="h-4 w-4" />
          ) : (
            <GraduationCap className="h-4 w-4" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-gray-900 truncate mb-0.5" title={draft.title}>
            {draft.title}
          </p>
          
          <div className="flex items-center gap-1.5 flex-wrap">
            {draft.type === 'exam' && draft.questions && (
              <span className="text-xs text-gray-500">
                {draft.questions.length}Q
              </span>
            )}
            
            {draft.duration_minutes && (
              <span className="flex items-center gap-0.5 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                {draft.duration_minutes}m
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="h-full w-72 lg:w-80 border-r border-gray-200 bg-white flex flex-col shadow-lg">
      {/* Header */}
      <div className="p-3 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-sm">{L.materialsLibrary}</h2>
              <p className="text-xs text-gray-500">{drafts.length} {L.itemsTotal}</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-gray-200 transition-colors lg:hidden"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          )}
        </div>
        
        {/* Class Filter Badge */}
        {selectedClassId && selectedClassName && (
          <div className="mb-2 px-2 py-1.5 rounded-lg bg-indigo-100/80 border border-indigo-200">
            <p className="text-xs font-medium text-indigo-900">
              📌 {L.target} {selectedClassName}
            </p>
          </div>
        )}
        
        {/* Type Filter - Compact Pills */}
        <div className="flex gap-1.5 mb-2">
          <button
            onClick={() => handleFilterChange('all')}
            className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-lg transition-all ${
              filterType === 'all' 
                ? 'bg-gray-900 text-white shadow-sm' 
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {L.all} <span className="opacity-70">({drafts.length})</span>
          </button>
          <button
            onClick={() => handleFilterChange('exam')}
            className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-lg transition-all ${
              filterType === 'exam' 
                ? 'bg-violet-600 text-white shadow-sm' 
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <FileText className="inline h-3 w-3 mr-0.5" />
            <span className="opacity-70">({drafts.filter(d => d.type === 'exam').length})</span>
          </button>
          <button
            onClick={() => handleFilterChange('lesson')}
            className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-lg transition-all ${
              filterType === 'lesson' 
                ? 'bg-emerald-600 text-white shadow-sm' 
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <GraduationCap className="inline h-3 w-3 mr-0.5" />
            <span className="opacity-70">({drafts.filter(d => d.type === 'lesson').length})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            placeholder={L.searchMaterials}
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 transition-all"
          />
          {search && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-gray-100"
            >
              <X className="h-3.5 w-3.5 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Drafts List */}
      <div className="flex-1 overflow-y-auto">
        {filteredDrafts.length === 0 ? (
          <div className="p-6 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <Sparkles className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">{L.noMaterialsFound}</h3>
            <p className="text-xs text-gray-500">
              {search ? L.tryDifferentSearch : L.createExamsOrLessons}
            </p>
          </div>
        ) : (
          <div className="p-2">
            {/* Results info */}
            <div className="flex items-center justify-between px-1 mb-2">
              <p className="text-xs text-gray-500">
                {L.showingXOfY.replace('{showing}', String(Math.min(visibleCount, filteredDrafts.length))).replace('{total}', String(filteredDrafts.length))}
              </p>
              <p className="text-xs text-gray-400">
                ↕ {L.dragToCalendar}
              </p>
            </div>

            {/* Draft Items */}
            <div className="space-y-2">
              {visibleDrafts.map(renderDraftItem)}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <button
                onClick={loadMore}
                className="w-full mt-3 px-4 py-2.5 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <ChevronDown className="h-4 w-4" />
                {L.loadMore} ({filteredDrafts.length - visibleCount} {L.remaining})
              </button>
            )}

            {/* Bottom padding for scroll */}
            <div className="h-4" />
          </div>
        )}
      </div>

      {/* Footer with drag hint */}
      <div className="p-2 border-t border-gray-100 bg-gray-50">
        <p className="text-xs text-center text-gray-500">
          💡 {L.dragHint}
        </p>
      </div>
    </div>
  )
}
