'use client'

import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Volume2, VolumeX } from 'lucide-react'

export interface AudioPlayerProps {
  audioUrl: string
  title?: string
  /** When true, the player sticks to the top of the scroll area while scrolling. */
  sticky?: boolean
}

export function AudioPlayer({ audioUrl, sticky }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isReady, setIsReady] = useState(false)

  // Single source of truth: when audioUrl changes, set src and load
  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    el.src = audioUrl
    el.load()
    setCurrentTime(0)
    setDuration(0)
    setIsReady(false)
    setIsPlaying(false)
  }, [audioUrl])

  // Attach listeners once (ref is stable)
  useEffect(() => {
    const el = audioRef.current
    if (!el) return

    const onLoadedMetadata = () => {
      setDuration(el.duration)
      setIsReady(true)
    }
    const onTimeUpdate = () => setCurrentTime(el.currentTime)
    const onEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }

    el.addEventListener('loadedmetadata', onLoadedMetadata)
    el.addEventListener('timeupdate', onTimeUpdate)
    el.addEventListener('ended', onEnded)
    return () => {
      el.removeEventListener('loadedmetadata', onLoadedMetadata)
      el.removeEventListener('timeupdate', onTimeUpdate)
      el.removeEventListener('ended', onEnded)
    }
  }, [])

  const togglePlay = () => {
    const el = audioRef.current
    if (!el) return
    if (isPlaying) {
      el.pause()
      setIsPlaying(false)
    } else {
      el.play().catch(() => setIsPlaying(false))
      setIsPlaying(true)
    }
  }

  const toggleMute = () => {
    const el = audioRef.current
    if (!el) return
    el.muted = !isMuted
    setIsMuted(!isMuted)
  }

  const onSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = audioRef.current
    if (!el || !Number.isFinite(duration) || duration <= 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    el.currentTime = Math.max(0, Math.min(1, pct)) * duration
    setCurrentTime(el.currentTime)
  }

  const format = (t: number) => {
    if (!Number.isFinite(t)) return '0:00'
    const m = Math.floor(t / 60)
    const s = Math.floor(t % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const bar = (
    <div className="flex items-center gap-3 w-full min-w-0 rounded-xl bg-gradient-to-r from-slate-50 to-slate-50/80 px-4 py-2.5 shadow-sm ring-1 ring-slate-200/60">
      <audio ref={audioRef} preload="metadata" />
      <button
        type="button"
        onClick={togglePlay}
        disabled={!isReady}
        className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-sm"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0 flex items-center gap-3">
        <span className="text-xs text-slate-500 tabular-nums shrink-0 w-9 text-left">
          {format(currentTime)}
        </span>
        <div
          role="progressbar"
          aria-valuenow={Math.round(currentTime)}
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          className="flex-1 h-1.5 rounded-full bg-slate-200/80 cursor-pointer overflow-hidden"
          onClick={onSeek}
        >
          <div
            className="h-full rounded-full bg-blue-500 transition-[width] duration-150"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs text-slate-500 tabular-nums shrink-0 w-9 text-right">
          {format(duration)}
        </span>
      </div>
      <button
        type="button"
        onClick={toggleMute}
        className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
        aria-label={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      </button>
    </div>
  )

  if (sticky) {
    return (
      <div className="sticky top-0 z-20 py-2.5 -mx-4 px-4 sm:-mx-6 sm:px-6 bg-white/90 backdrop-blur-md border-b border-slate-200/80 mb-3 shadow-sm">
        <div className="max-w-2xl mx-auto">{bar}</div>
      </div>
    )
  }

  return bar
}
