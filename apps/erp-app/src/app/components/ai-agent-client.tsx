'use client'

import dynamic from 'next/dynamic'
import { processAgentMessage, processThinkMessage, transcribeAudioOnly } from '../api/agent/actions'

const AIAgentWidget = dynamic(
  () => import('@eduator/ui').then((m) => m.AIAgentWidget),
  { ssr: false, loading: () => <div className="animate-pulse rounded-lg bg-gray-200 h-64 w-full max-w-md" /> }
)

export function AIAgentClient() {
  return (
    <AIAgentWidget
      processThinkMessage={processThinkMessage}
      processAgentMessage={processAgentMessage}
      transcribeAudio={async (audio: string, options?: { audioMimeType?: string; audioLanguageCode?: string }) => {
        return await transcribeAudioOnly(audio, options)
      }}
      title="AI Assistant"
      placeholder="Ask a question or request an action..."
    />
  )
}
