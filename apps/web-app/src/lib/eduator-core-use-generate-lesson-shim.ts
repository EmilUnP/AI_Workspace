type Step =
  | 'idle'
  | 'analyzing'
  | 'generating'
  | 'images'
  | 'saving'
  | 'audio'
  | 'complete'
  | 'error'

export function getStepProgress(step: Step, includeImages = true, includeAudio = true): number {
  const map: Record<Step, number> = {
    idle: 0,
    analyzing: 15,
    generating: includeImages ? 40 : includeAudio ? 55 : 70,
    images: includeAudio ? 65 : 85,
    saving: includeAudio ? 80 : 95,
    audio: 92,
    complete: 100,
    error: 100,
  }
  return map[step] ?? 0
}
