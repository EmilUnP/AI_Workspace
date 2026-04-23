'use client'

import { useState, useRef, useEffect } from 'react'
import { Bot, X, Send, Minimize2, Maximize2, Loader2, HelpCircle, Sparkles, CheckCircle2, AlertCircle, Database, Users, GraduationCap, FileText, BookOpen, Brain, Zap, Mic, Square } from 'lucide-react'
import { Button } from '../ui/button'
import { RichTextWithMath } from '../math/rich-text-with-math'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  error?: string
  sqlQuery?: string
  rawData?: unknown[] // Raw JSON data from database (for charts/tables)
  rowCount?: number // Number of rows returned
  toolCalls?: Array<{
    tool: string
    parameters: Record<string, unknown>
    result?: unknown
    error?: string
  }>
  progress?: {
    steps: Array<{
      tool: string
      description: string
      status: 'pending' | 'executing' | 'completed' | 'failed'
      error?: string
    }>
    currentStep?: number
    totalSteps: number
    inProgress: boolean
  }
}

interface AIAgentWidgetProps {
  processThinkMessage?: (message?: string, options?: {
    audio?: string | ArrayBuffer
    audioMimeType?: string
    audioLanguageCode?: string
    showSql?: boolean
    includeMetadata?: boolean
  }) => Promise<{
    text: string
    error?: string
    sqlQuery?: string
    rawData?: unknown[] // Raw JSON data from database
    rowCount?: number // Number of rows returned
    toolCalls?: Array<{
      tool: string
      parameters: Record<string, unknown>
      result?: unknown
      error?: string
    }>
    progress?: {
      steps: Array<{
        tool: string
        description: string
        status: 'pending' | 'executing' | 'completed' | 'failed'
        error?: string
      }>
      currentStep?: number
      totalSteps: number
      inProgress: boolean
    }
  }>
  processAgentMessage?: (message?: string, options?: {
    audio?: string | ArrayBuffer
    audioMimeType?: string
    audioLanguageCode?: string
    showSql?: boolean
    includeMetadata?: boolean
  }) => Promise<{
    text: string
    error?: string
    sqlQuery?: string
    rawData?: unknown[] // Raw JSON data from database
    rowCount?: number // Number of rows returned
    toolCalls?: Array<{
      tool: string
      parameters: Record<string, unknown>
      result?: unknown
      error?: string
    }>
    progress?: {
      steps: Array<{
        tool: string
        description: string
        status: 'pending' | 'executing' | 'completed' | 'failed'
        error?: string
      }>
      currentStep?: number
      totalSteps: number
      inProgress: boolean
    }
  }>
  // Legacy support - if processMessage is provided, it will be used for both modes
  processMessage?: (message?: string, options?: {
    audio?: string | ArrayBuffer
    audioMimeType?: string
    audioLanguageCode?: string
    showSql?: boolean
    includeMetadata?: boolean
  }) => Promise<{
    text: string
    error?: string
    sqlQuery?: string
    rawData?: unknown[] // Raw JSON data from database
    rowCount?: number // Number of rows returned
    toolCalls?: Array<{
      tool: string
      parameters: Record<string, unknown>
      result?: unknown
      error?: string
    }>
    progress?: {
      steps: Array<{
        tool: string
        description: string
        status: 'pending' | 'executing' | 'completed' | 'failed'
        error?: string
      }>
      currentStep?: number
      totalSteps: number
      inProgress: boolean
    }
  }>
  transcribeAudio?: (audio: string, options?: {
    audioMimeType?: string
    audioLanguageCode?: string
  }) => Promise<{ text: string; error?: string }>
  title?: string
  placeholder?: string
}

// Example questions for Think Mode (queries and data analysis)
const THINK_MODE_QUESTIONS = [
  {
    category: 'Users & Profiles',
    icon: Users,
    questions: [
      'How many teachers are there?',
      'Show all students',
      'Count users in Test organization',
      'Show users with no organization',
      'List all active teachers',
      'Show student enrollment statistics',
    ],
  },
  {
    category: 'Classes',
    icon: GraduationCap,
    questions: [
      'Show all classes',
      'Show classes in Test organization',
      'Who is in class Math 101?',
      'Show class info for Math 101',
      'How many students are in each class?',
      'List classes with no students',
    ],
  },
  {
    category: 'Exams',
    icon: FileText,
    questions: [
      'Show all exams',
      'Show exams created by teacher John Doe',
      'How many exams in Test organization?',
      'Show exams for class Math 101',
      'What are the most recent exams?',
      'Show exam statistics by subject',
    ],
  },
  {
    category: 'Lessons',
    icon: BookOpen,
    questions: [
      'Show all lessons',
      'Show lessons created by teacher John Doe',
      'How many lessons in Test organization?',
      'Show lessons for class Math 101',
      'What are the most popular lesson topics?',
      'Show lessons created this month',
    ],
  },
  {
    category: 'Analytics',
    icon: Database,
    questions: [
      'Show organization statistics',
      'What is the total number of users?',
      'Show activity summary',
      'Compare data across organizations',
    ],
  },
]

// Example questions for Agent Mode (actions and creation)
const AGENT_MODE_QUESTIONS = [
  {
    category: 'Create Organizations',
    icon: GraduationCap,
    questions: [
      'Create organization named Demo School',
      'Create organization named Test Academy with demo users',
      'Create a new organization called Learning Center',
      'Create organization with name Tech Institute and premium plan',
    ],
  },
  {
    category: 'Create Users',
    icon: Users,
    questions: [
      'Create a new teacher named John Doe',
      'Create a new student named Jane Smith',
      'Create a teacher with email teacher@example.com',
      'Create a student and enroll them in Math 101',
    ],
  },
  {
    category: 'Create Classes',
    icon: GraduationCap,
    questions: [
      'Create a new class called Math 101',
      'Create class Algebra for grade 9',
      'Create a class named Science Lab',
      'Create class English Literature for teacher John Doe',
    ],
  },
  {
    category: 'General Actions',
    icon: Zap,
    questions: [
      'Create organization named Demo with demo users',
      'Create a new teacher and assign them to a class',
      'Create multiple demo students',
      'Set up a complete class with teacher and students',
    ],
  },
]

type AgentMode = 'think' | 'agent'

export function AIAgentWidget({
  processThinkMessage,
  processAgentMessage,
  processMessage, // Legacy support
  transcribeAudio,
  title = 'AI Assistant',
}: AIAgentWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showQAModal, setShowQAModal] = useState(false)
  const [mode, setMode] = useState<AgentMode>('think')
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen, isMinimized])

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus()
    }
  }, [isOpen, isMinimized])

  // Helper to detect multi-step actions and build placeholder progress
  const detectMultiStepAction = (message: string): {
    steps: Array<{
      tool: string
      description: string
      status: 'pending' | 'executing' | 'completed' | 'failed'
    }>
    currentStep?: number
    totalSteps: number
    inProgress: boolean
  } | null => {
    if (mode !== 'agent') return null
    
    const steps: Array<{
      tool: string
      description: string
      status: 'pending' | 'executing' | 'completed' | 'failed'
    }> = []
    
    // Detect create organization
    if (/create.*(organization|org)/i.test(message)) {
      steps.push({
        tool: 'create_organization',
        description: 'Create organization',
        status: 'pending',
      })
    }
    
    // Detect create user/admin/teacher/student
    if (/create.*(user|admin|teacher|student)|assign.*(user|admin)/i.test(message)) {
      // Only add if not already added as part of organization
      if (!steps.some(s => s.tool === 'create_user')) {
        steps.push({
          tool: 'create_user',
          description: 'Create user',
          status: 'pending',
        })
      }
    }
    
    // Detect create class
    if (/create.*class/i.test(message)) {
      steps.push({
        tool: 'create_class',
        description: 'Create class',
        status: 'pending',
      })
    }
    
    // Only return progress if we detected multiple steps or a clear multi-step pattern
    if (steps.length > 1 || /and|also|then|assign/i.test(message)) {
      return {
        steps: steps.length > 0 ? steps : [
          { tool: 'processing', description: 'Processing request...', status: 'executing' as const }
        ],
        currentStep: 0,
        totalSteps: steps.length || 1,
        inProgress: true,
      }
    }
    
    return null
  }

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input.trim()
    if (!textToSend || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setShowQAModal(false) // Close QA modal when sending

    // Detect and show placeholder progress immediately for multi-step actions
    const placeholderProgress = detectMultiStepAction(textToSend)
    let placeholderMessageId: string | null = null
    
    if (placeholderProgress && placeholderProgress.steps.length > 0) {
      placeholderMessageId = `placeholder-${Date.now()}`
      const placeholderMessage: Message = {
        id: placeholderMessageId,
        role: 'assistant',
         content: '', // Empty content - progress card will show instead
        timestamp: new Date(),
        progress: {
          ...placeholderProgress,
          steps: placeholderProgress.steps.map((step: { tool: string; description: string; status: 'pending' | 'executing' | 'completed' | 'failed' }, index: number) => ({
            ...step,
            status: (index === 0 ? 'executing' : 'pending') as 'pending' | 'executing' | 'completed' | 'failed',
          })),
        },
      }
      setMessages((prev) => [...prev, placeholderMessage])
    }

    try {
      // Select the appropriate handler based on mode
      const handler = mode === 'think' 
        ? (processThinkMessage || processMessage) // Use think handler or fallback to legacy
        : (processAgentMessage || processMessage) // Use agent handler or fallback to legacy
      
      if (!handler) {
        throw new Error(`No handler available for ${mode} mode`)
      }

      const response = await handler(textToSend)
      
      // Remove placeholder message if it exists
      if (placeholderMessageId) {
        setMessages((prev) => prev.filter(msg => msg.id !== placeholderMessageId))
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.text,
        timestamp: new Date(),
        error: response.error,
        sqlQuery: response.sqlQuery,
        rawData: response.rawData,
        rowCount: response.rowCount,
        toolCalls: response.toolCalls,
        progress: response.progress,
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      // Remove placeholder message if it exists
      if (placeholderMessageId) {
        setMessages((prev) => prev.filter(msg => msg.id !== placeholderMessageId))
      }
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      }

      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  // Convert Blob to base64 string
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          // Remove data URL prefix if present
          const base64 = reader.result.split(',')[1] || reader.result
          resolve(base64)
        } else {
          reject(new Error('Failed to convert blob to base64'))
        }
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  // Start audio recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      })

      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop())
        
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
          
          // Transcribe audio and put text in input field (don't send yet)
          if (transcribeAudio) {
            setIsTranscribing(true)
            try {
              const audioBase64 = await blobToBase64(audioBlob)
              const result = await transcribeAudio(audioBase64, {
                audioMimeType: audioBlob.type || 'audio/webm',
                audioLanguageCode: undefined, // Auto-detect
              })
              
              if (result.text) {
                setInput(result.text)
                // Focus input so user can edit
                setTimeout(() => {
                  inputRef.current?.focus()
                  // Move cursor to end
                  inputRef.current?.setSelectionRange(result.text.length, result.text.length)
                }, 100)
              } else if (result.error) {
                setInput('')
                alert(`Transcription failed: ${result.error}`)
              } else {
                setInput('')
                alert('No text was transcribed. Please try speaking more clearly.')
              }
            } catch (error) {
              console.error('Transcription error:', error)
              setInput('')
              alert('Failed to transcribe audio. Please try again or type your message.')
            } finally {
              setIsTranscribing(false)
            }
          } else {
            // Fallback: if no transcribeAudio function, just send the audio directly
            const audioBase64 = await blobToBase64(audioBlob)
            const userMessage: Message = {
              id: Date.now().toString(),
              role: 'user',
              content: '[Audio message]',
              timestamp: new Date(),
            }
            setMessages((prev) => [...prev, userMessage])
            setIsLoading(true)
            try {
              // Select the appropriate handler based on mode
              const handler = mode === 'think' 
                ? (processThinkMessage || processMessage)
                : (processAgentMessage || processMessage)
              
              if (!handler) {
                throw new Error(`No handler available for ${mode} mode`)
              }

              const response = await handler(undefined, {
                audio: audioBase64,
                audioMimeType: audioBlob.type || 'audio/webm',
                audioLanguageCode: undefined,
              })
              const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response.text,
                timestamp: new Date(),
                error: response.error,
                sqlQuery: response.sqlQuery,
                rawData: response.rawData,
                rowCount: response.rowCount,
                toolCalls: response.toolCalls,
                progress: response.progress,
              }
              setMessages((prev) => [...prev, assistantMessage])
            } catch (error) {
              const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again.',
                timestamp: new Date(),
                error: error instanceof Error ? error.message : 'Unknown error',
              }
              setMessages((prev) => [...prev, errorMessage])
            } finally {
              setIsLoading(false)
            }
          }
        }
        
        audioChunksRef.current = []
        setRecordingTime(0)
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      setIsRecording(true)

      // Start timer
      setRecordingTime(0)
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } catch (error) {
      console.error('Error starting recording:', error)
      alert('Failed to access microphone. Please check your permissions.')
    }
  }

  // Stop audio recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
        recordingTimerRef.current = null
      }
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop()
      }
    }
  }, [isRecording])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const clearMessages = () => {
    setMessages([])
  }

  // Helpers for GFM table parsing (same logic as lesson-content for consistent display)
  const parseTableRow = (line: string): string[] => {
    const cells = line.split('|').map((c) => c.trim())
    const start = cells[0] === '' ? 1 : 0
    const end = cells[cells.length - 1] === '' ? cells.length - 1 : cells.length
    return cells.slice(start, end)
  }
  const isTableRow = (trimmed: string): boolean =>
    trimmed.length > 2 && trimmed.startsWith('|') && trimmed.includes('|', 1)
  const isTableSeparator = (cells: string[]): boolean =>
    cells.length > 0 && cells.every((c) => /^[\s\-:]+$/.test(c))

  // Format markdown-like content for better display
  const formatContent = (content: string) => {
    const lines = content.split('\n')
    const elements: React.ReactElement[] = []
    const listItems: string[] = []
    let currentParagraph: string[] = []
    let inList = false

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`ul-${elements.length}`} className="mb-2 ml-4 list-disc space-y-1 text-gray-700">
            {listItems.map((item, idx) => {
              const processedItem = item.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
              return (
                <li key={idx}>
                  <RichTextWithMath content={processedItem} asHtml />
                </li>
              )
            })}
          </ul>
        )
        listItems.length = 0
      }
    }

    for (let index = 0; index < lines.length; index++) {
      const line = lines[index]
      const trimmed = line.trim()

      // Headers
      if (trimmed.startsWith('## ')) {
        flushList()
        if (currentParagraph.length > 0) {
          elements.push(
            <p key={`p-${index}`} className="mb-2 text-gray-700">
              <RichTextWithMath content={currentParagraph.join(' ')} asHtml={false} />
            </p>
          )
          currentParagraph = []
        }
        elements.push(
          <h3 key={`h3-${index}`} className="mb-2 mt-4 text-lg font-semibold text-gray-900">
            <RichTextWithMath content={trimmed.substring(3)} asHtml={false} />
          </h3>
        )
        inList = false
        continue
      }

      if (trimmed.startsWith('### ')) {
        flushList()
        if (currentParagraph.length > 0) {
          elements.push(
            <p key={`p-${index}`} className="mb-2 text-gray-700">
              <RichTextWithMath content={currentParagraph.join(' ')} asHtml={false} />
            </p>
          )
          currentParagraph = []
        }
        elements.push(
          <h4 key={`h4-${index}`} className="mb-2 mt-3 text-base font-semibold text-gray-800">
            <RichTextWithMath content={trimmed.substring(4)} asHtml={false} />
          </h4>
        )
        inList = false
        continue
      }

      // Bold text (standalone)
      if (trimmed.startsWith('**') && trimmed.endsWith('**') && trimmed.length > 4) {
        flushList()
        if (currentParagraph.length > 0) {
          elements.push(
            <p key={`p-${index}`} className="mb-2 text-gray-700">
              <RichTextWithMath content={currentParagraph.join(' ')} asHtml={false} />
            </p>
          )
          currentParagraph = []
        }
        const text = trimmed.slice(2, -2)
        elements.push(
          <p key={`bold-${index}`} className="mb-2 font-semibold text-gray-900">
            <RichTextWithMath content={text} asHtml={false} />
          </p>
        )
        inList = false
        continue
      }

      // List items
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        if (currentParagraph.length > 0) {
          flushList()
          elements.push(
            <p key={`p-${index}`} className="mb-2 text-gray-700">
              <RichTextWithMath content={currentParagraph.join(' ')} asHtml={false} />
            </p>
          )
          currentParagraph = []
        }
        listItems.push(trimmed.substring(2))
        inList = true
        continue
      }

      // GFM-style table: consecutive lines like | a | b |
      if (isTableRow(trimmed)) {
        flushList()
        if (currentParagraph.length > 0) {
          elements.push(
            <p key={`p-${index}`} className="mb-2 text-gray-700">
              <RichTextWithMath content={currentParagraph.join(' ')} asHtml={false} />
            </p>
          )
          currentParagraph = []
        }
        const tableRows: string[][] = []
        let j = index
        while (j < lines.length && isTableRow(lines[j].trim())) {
          tableRows.push(parseTableRow(lines[j].trim()))
          j++
        }
        const numCols = Math.max(...tableRows.map((r) => r.length), 1)
        const pad = (cells: string[]) => {
          const out = [...cells]
          while (out.length < numCols) out.push('')
          return out
        }
        const headerCells = pad(tableRows[0] ?? [])
        const secondRow = tableRows[1]
        const isSep = secondRow && isTableSeparator(secondRow)
        const bodyRows = isSep ? tableRows.slice(2) : tableRows.slice(1)
        elements.push(
          <div key={`table-${index}`} className="my-3 overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full min-w-[280px] border-collapse text-left text-sm">
              <thead>
                <tr className="bg-gray-100">
                  {headerCells.map((cell, cidx) => (
                    <th key={cidx} className="border border-gray-200 px-3 py-2 font-semibold text-gray-800">
                      <RichTextWithMath content={cell.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')} asHtml />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bodyRows.map((row, ridx) => (
                  <tr key={ridx} className="hover:bg-gray-50">
                    {pad(row).map((cell, cidx) => (
                      <td key={cidx} className="border border-gray-200 px-3 py-2 text-gray-700">
                        <RichTextWithMath content={cell.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')} asHtml />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
        index = j - 1
        inList = false
        continue
      }

      // Regular paragraph
      if (trimmed.length > 0) {
        if (inList) {
          flushList()
          inList = false
        }
        currentParagraph.push(trimmed)
      } else {
        if (inList) {
          flushList()
          inList = false
        }
        if (currentParagraph.length > 0) {
          elements.push(
            <p key={`p-${index}`} className="mb-2 text-gray-700">
              <RichTextWithMath content={currentParagraph.join(' ')} asHtml={false} />
            </p>
          )
          currentParagraph = []
        }
      }
    }

    // Flush remaining
    flushList()
    if (currentParagraph.length > 0) {
      elements.push(
        <p key="p-final" className="mb-2 text-gray-700">
          <RichTextWithMath content={currentParagraph.join(' ')} asHtml={false} />
        </p>
      )
    }

    return elements.length > 0 ? <div>{elements}</div> : <p className="text-gray-700"><RichTextWithMath content={content} asHtml={false} /></p>
  }

  // Render data table if rawData is available
  const renderDataTable = (data: unknown[]) => {
    if (!data || data.length === 0) return null

    const firstRow = data[0] as Record<string, unknown>
    const columns = Object.keys(firstRow)

    return (
      <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gradient-to-r from-blue-50 to-blue-100">
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-4 py-3 text-left font-semibold text-gray-700 capitalize"
                >
                  {col.replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.slice(0, 20).map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                {columns.map((col) => (
                  <td key={col} className="px-4 py-2 text-gray-600">
                    {String((row as Record<string, unknown>)[col] || '-')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {data.length > 20 && (
          <div className="bg-gray-50 px-4 py-2 text-xs text-gray-500">
            Showing 20 of {data.length} rows
          </div>
        )}
      </div>
    )
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg transition-all hover:scale-110 hover:shadow-xl"
        aria-label="Open AI Assistant"
      >
        <Bot className="h-6 w-6" />
      </button>
    )
  }

  return (
    <>
      <div
        className={`fixed bottom-6 right-6 z-50 flex flex-col rounded-lg border border-gray-200 bg-white shadow-2xl transition-all ${
          isMinimized
            ? 'h-auto min-h-[60px] w-80'
            : 'h-[650px] w-[520px]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 text-white">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Bot className="h-5 w-5 flex-shrink-0" />
            <h3 className="font-semibold truncate">{title}</h3>
            {isMinimized && messages.length > 0 && (
              <span className="ml-2 text-xs text-white/70 flex-shrink-0">
                {messages.length} {messages.length === 1 ? 'message' : 'messages'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!isMinimized && (
              <>
                {/* Mode Switcher - Only show when not minimized */}
                <div className="flex items-center gap-1 rounded-lg bg-white/20 p-1">
                  <button
                    onClick={() => setMode('think')}
                    className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-all ${
                      mode === 'think'
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                    title="Think Mode - Answer questions and provide information"
                  >
                    <Brain className="h-3.5 w-3.5" />
                    Think
                  </button>
                  <button
                    onClick={() => setMode('agent')}
                    className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-all ${
                      mode === 'agent'
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                    title="Agent Mode - Perform actions and create entities"
                  >
                    <Zap className="h-3.5 w-3.5" />
                    Agent
                  </button>
                </div>
                <button
                  onClick={() => setShowQAModal(true)}
                  className="rounded p-1.5 text-white/90 transition-colors hover:bg-white/20"
                  aria-label="Show example questions"
                  title="Example Questions"
                >
                  <HelpCircle className="h-4 w-4" />
                </button>
                {messages.length > 0 && (
                  <button
                    onClick={clearMessages}
                    className="rounded p-1 text-white/80 transition-colors hover:bg-white/20"
                    aria-label="Clear messages"
                    title="Clear conversation"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </>
            )}
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="rounded p-2 text-white/90 transition-colors hover:bg-white/20 hover:text-white"
              aria-label={isMinimized ? 'Maximize' : 'Minimize'}
              title={isMinimized ? 'Maximize' : 'Minimize'}
            >
              {isMinimized ? (
                <Maximize2 className="h-5 w-5" />
              ) : (
                <Minimize2 className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded p-1 text-white/80 transition-colors hover:bg-white/20"
              aria-label="Close"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Messages */}
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center text-gray-500">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-blue-100 to-blue-200">
                    {mode === 'think' ? (
                      <Brain className="h-8 w-8 text-blue-600" />
                    ) : (
                      <Zap className="h-8 w-8 text-blue-600" />
                    )}
                  </div>
                  <p className="mb-2 text-lg font-semibold text-gray-700">
                    Hello! I'm your AI Assistant
                  </p>
                  {mode === 'think' ? (
                    <>
                      <p className="mb-4 text-sm text-gray-600">
                        <strong>Think Mode:</strong> I can answer questions and provide insights about your data.
                      </p>
                      <ul className="mb-4 space-y-2 text-left text-sm text-gray-600">
                        <li className="flex items-center gap-2">
                          <Database className="h-4 w-4 text-blue-600" />
                          Query data and get insights
                        </li>
                        <li className="flex items-center gap-2">
                          <GraduationCap className="h-4 w-4 text-blue-600" />
                          Answer questions about your organization
                        </li>
                        <li className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          Analyze classes, exams, and lessons
                        </li>
                      </ul>
                    </>
                  ) : (
                    <>
                      <p className="mb-4 text-sm text-gray-600">
                        <strong>Agent Mode:</strong> I can perform actions and create entities for you.
                      </p>
                      <ul className="mb-4 space-y-2 text-left text-sm text-gray-600">
                        <li className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-blue-600" />
                          Create users, classes, and students
                        </li>
                        <li className="flex items-center gap-2">
                          <GraduationCap className="h-4 w-4 text-blue-600" />
                          Create organizations (Platform Owner)
                        </li>
                        <li className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          Perform administrative tasks
                        </li>
                        <li className="flex items-center gap-2">
                          <Database className="h-4 w-4 text-blue-600" />
                          Query data and get insights
                        </li>
                      </ul>
                    </>
                  )}
                  <Button
                    onClick={() => setShowQAModal(true)}
                    variant="outline"
                    size="sm"
                    className="mt-2"
                  >
                    <HelpCircle className="mr-2 h-4 w-4" />
                    See Example Questions
                  </Button>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg px-4 py-3 shadow-sm ${
                        message.role === 'user'
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                          : message.error
                            ? 'bg-red-50 border border-red-200 text-red-900'
                            : 'bg-gradient-to-br from-gray-50 to-white border border-gray-200 text-gray-900'
                      }`}
                    >
                      {message.role === 'user' ? (
                        <div className="text-sm">
                          <RichTextWithMath content={message.content} asHtml={false} className="whitespace-pre-wrap block" as="div" />
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* Error state */}
                          {message.error ? (
                            <div className="flex items-start gap-2">
                              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="font-medium text-red-800">Error</p>
                                <p className="text-sm text-red-700">{message.content}</p>
                              </div>
                            </div>
                          ) : (
                            <>
                              {/* Progress/Todo List for multi-step operations */}
                              {message.progress && message.progress.steps.length > 0 && (
                                <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
                                  <div className="mb-3 flex items-center justify-between">
                                    <h4 className="text-sm font-semibold text-blue-900">Operation Progress</h4>
                                    <span className="text-xs text-blue-700">
                                      {message.progress.steps.filter(s => s.status === 'completed').length} / {message.progress.totalSteps}
                                    </span>
                                  </div>
                                  <div className="space-y-2">
                                    {message.progress.steps.map((step, index) => {
                                      const isCurrent = message.progress?.currentStep === index
                                      const isCompleted = step.status === 'completed'
                                      const isFailed = step.status === 'failed'
                                      const isExecuting = step.status === 'executing'

                                      return (
                                        <div
                                          key={step.tool}
                                          className={`flex items-start gap-3 rounded-md p-2.5 transition-colors ${
                                            isExecuting
                                              ? 'bg-blue-100 border border-blue-300'
                                              : isCompleted
                                                ? 'bg-green-50 border border-green-200'
                                                : isFailed
                                                  ? 'bg-red-50 border border-red-200'
                                                  : 'bg-white border border-gray-200'
                                          }`}
                                        >
                                          <div className="flex-shrink-0 mt-0.5">
                                            {isExecuting ? (
                                              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                                            ) : isCompleted ? (
                                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                                            ) : isFailed ? (
                                              <AlertCircle className="h-4 w-4 text-red-600" />
                                            ) : (
                                              <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                                            )}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                              <span
                                                className={`text-sm font-medium ${
                                                  isExecuting
                                                    ? 'text-blue-900'
                                                    : isCompleted
                                                      ? 'text-green-900'
                                                      : isFailed
                                                        ? 'text-red-900'
                                                        : 'text-gray-600'
                                                }`}
                                              >
                                                {step.description}
                                              </span>
                                              {isCurrent && (
                                                <span className="text-xs text-blue-600 font-medium">(Current)</span>
                                              )}
                                            </div>
                                            {isFailed && step.error && (
                                              <p className="mt-1 text-xs text-red-700">{step.error}</p>
                                            )}
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Main content - hide if we only have progress and no real content yet */}
                              {message.content && message.content.trim() && !(message.progress && message.progress.inProgress && message.content === 'Starting operation...') && (
                                <div className="prose prose-sm max-w-none">
                                  {formatContent(message.content)}
                                </div>
                              )}

                              {/* Success indicator for data queries */}
                              {message.rowCount !== undefined && message.rowCount > 0 && (
                                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-md px-3 py-2 border border-green-200">
                                  <CheckCircle2 className="h-4 w-4" />
                                  <span className="font-medium">
                                    Found {message.rowCount} {message.rowCount === 1 ? 'result' : 'results'}
                                  </span>
                                </div>
                              )}

                              {/* Data table */}
                              {message.rawData && message.rawData.length > 0 && renderDataTable(message.rawData)}

                              {/* SQL Query (collapsible) */}
                              {message.sqlQuery && (
                                <details className="mt-2 rounded-lg bg-gray-100 border border-gray-200 p-3 text-xs">
                                  <summary className="cursor-pointer font-semibold text-gray-700 hover:text-gray-800 flex items-center gap-2">
                                    <Database className="h-3.5 w-3.5" />
                                    SQL Query
                                  </summary>
                                  <pre className="mt-2 overflow-x-auto rounded bg-white p-2 text-xs text-gray-600 border border-gray-200">
                                    {message.sqlQuery}
                                  </pre>
                                </details>
                              )}

                              {/* Tool Calls (collapsible) */}
                              {message.toolCalls && message.toolCalls.length > 0 && (
                                <details className="mt-2 rounded-lg bg-purple-50 border border-purple-200 p-3 text-xs">
                                  <summary className="cursor-pointer font-semibold text-purple-700 hover:text-purple-800 flex items-center gap-2">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    Tools Used ({message.toolCalls.length})
                                  </summary>
                                  <div className="mt-2 space-y-2">
                                    {message.toolCalls.map((tool, idx) => (
                                      <div key={idx} className="rounded bg-white p-2 border border-purple-100">
                                        <p className="font-medium text-purple-800">{tool.tool}</p>
                                        {tool.error && (
                                          <p className="mt-1 text-red-600 text-xs">{tool.error}</p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </details>
                              )}
                            </>
                          )}
                        </div>
                      )}
                      <p className={`mt-2 text-xs ${
                        message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
              {/* Loading indicator - hide if we have a progress message showing */}
              {isLoading && !messages.some(msg => msg.progress && msg.progress.inProgress) && (
                <div className="flex justify-start">
                  <div className="rounded-lg bg-gray-100 border border-gray-200 px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                      <span className="text-sm text-gray-600">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-gray-200 bg-gray-50 p-4">
              <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  mode === 'think'
                    ? 'Ask a question about your data...'
                    : 'Ask a question or request an action (e.g., "Create organization named Demo")...'
                }
                rows={2}
                className="flex-1 resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                disabled={isLoading || isRecording}
              />
                {/* Microphone Button */}
                <Button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isLoading || isTranscribing}
                  variant={isRecording ? "destructive" : "outline"}
                  className={isRecording ? "bg-red-600 hover:bg-red-700 text-white border-red-600" : "border-gray-300 hover:bg-gray-100"}
                  size="sm"
                  title={isRecording ? "Stop recording" : "Start voice input"}
                >
                  {isRecording ? (
                    <Square className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isLoading || isTranscribing || isRecording}
                  className="bg-blue-600 hover:bg-blue-700 shadow-sm"
                  size="sm"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {isRecording && (
                <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
                  <div className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
                  <span>Recording... {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}</span>
                </div>
              )}
              {isTranscribing && (
                <div className="mt-2 flex items-center gap-2 text-sm text-blue-600">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Transcribing audio...</span>
                </div>
              )}
              {!isRecording && !isTranscribing && (
                <p className="mt-2 text-xs text-gray-500">
                  Press Enter to send, Shift+Enter for new line, or use the microphone for voice input
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* QA Modal */}
      <Dialog open={showQAModal} onOpenChange={setShowQAModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              {mode === 'think' ? (
                <Brain className="h-5 w-5 text-blue-600" />
              ) : (
                <Zap className="h-5 w-5 text-blue-600" />
              )}
              Example Questions - {mode === 'think' ? 'Think Mode' : 'Agent Mode'}
            </DialogTitle>
            <DialogDescription>
              {mode === 'think' ? (
                'Click on any question below to query your data and get insights'
              ) : (
                'Click on any action below to create entities and perform tasks'
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-6">
            {(mode === 'think' ? THINK_MODE_QUESTIONS : AGENT_MODE_QUESTIONS).map((category, idx) => {
              const Icon = category.icon
              return (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <Icon className="h-4 w-4 text-blue-600" />
                    {category.category}
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {category.questions.map((question, qIdx) => (
                      <button
                        key={qIdx}
                        onClick={() => {
                          handleSend(question)
                        }}
                        className="text-left rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 hover:shadow-sm"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
